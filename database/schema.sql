-- ============================================================
-- GlobeBotter — PostgreSQL schema
-- Run: psql -d globebotter -f database/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100)        NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255)        NOT NULL,       -- bcrypt hash
  role         VARCHAR(20)         NOT NULL DEFAULT 'buyer'
                 CHECK (role IN ('buyer', 'seller', 'admin')),
  stripe_customer_id VARCHAR(255),                -- set on first purchase
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ────────────────────────────────────────────────────────────
-- BOTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100)  NOT NULL,
  description  TEXT          NOT NULL,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category     VARCHAR(50)   NOT NULL
                 CHECK (category IN ('trading', 'marketing', 'social_media', 'custom')),
  creator_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- deployment / listing state
  status       VARCHAR(20)   NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive', 'draft')),

  -- Stripe product + price IDs (set when seller lists the bot)
  stripe_product_id       VARCHAR(255),
  stripe_price_id_once    VARCHAR(255),  -- one-time purchase
  stripe_price_id_monthly VARCHAR(255),  -- monthly subscription

  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bots_category   ON bots(category);
CREATE INDEX IF NOT EXISTS idx_bots_creator_id ON bots(creator_id);
CREATE INDEX IF NOT EXISTS idx_bots_status     ON bots(status);

-- ────────────────────────────────────────────────────────────
-- PURCHASES  (one-time)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID          NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  bot_id              UUID          NOT NULL REFERENCES bots(id)   ON DELETE CASCADE,
  amount_paid         NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(10)   NOT NULL DEFAULT 'usd',

  -- Stripe payment record
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_session_id        VARCHAR(255) UNIQUE,

  status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),

  purchased_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_bot_id  ON purchases(bot_id);

-- Prevent a user buying the same bot twice (one-time)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_user_bot
  ON purchases(user_id, bot_id)
  WHERE status = 'completed';

-- ────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS  (recurring)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_id                 UUID NOT NULL REFERENCES bots(id)  ON DELETE CASCADE,

  -- Stripe subscription record
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id        VARCHAR(255)        NOT NULL,

  status  VARCHAR(20) NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'trialing')),

  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,
  canceled_at          TIMESTAMP,

  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_bot_id  ON subscriptions(bot_id);
CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(status);

-- Prevent duplicate active subscriptions for same user+bot
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_user_bot_active
  ON subscriptions(user_id, bot_id)
  WHERE status IN ('active', 'trialing');

-- ────────────────────────────────────────────────────────────
-- BOT DEPLOYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bot_id      UUID NOT NULL REFERENCES bots(id)  ON DELETE CASCADE,

  status      VARCHAR(20) NOT NULL DEFAULT 'deploying'
                CHECK (status IN ('deploying', 'active', 'stopped', 'error')),

  deployed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  stopped_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_bot_id  ON deployments(bot_id);

-- ────────────────────────────────────────────────────────────
-- auto-update updated_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','bots','subscriptions']) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
       CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;
