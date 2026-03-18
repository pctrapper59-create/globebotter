# GlobeBotter — Deployment Guide

## Stack
| Layer    | Service           |
|----------|-------------------|
| Frontend | Vercel            |
| Backend  | Railway or Render |
| Database | Supabase (PostgreSQL) |

---

## Step 1 — Database (Supabase)

1. Go to https://supabase.com → **New project**
2. Choose a region, set a strong DB password
3. Once created: **Project Settings → Database → Connection string**
   Copy the **URI** (starts with `postgresql://postgres:...`)
4. Run the schema:
   ```bash
   psql "YOUR_SUPABASE_CONNECTION_STRING" -f database/schema.sql
   ```
   Or paste the contents of `database/schema.sql` into the Supabase **SQL Editor**.

5. Save your connection string — you'll need it as `DATABASE_URL`.

---

## Step 2 — Backend (Railway)

1. Go to https://railway.app → **New Project → Deploy from GitHub repo**
2. Select your repo, set the **root directory** to `server`
3. Add these environment variables in Railway dashboard:

   | Variable               | Value                          |
   |------------------------|--------------------------------|
   | `DATABASE_URL`         | Your Supabase connection string |
   | `JWT_SECRET`           | A long random string (32+ chars)|
   | `STRIPE_SECRET_KEY`    | `sk_live_...` from Stripe       |
   | `STRIPE_WEBHOOK_SECRET`| From Stripe webhook dashboard   |
   | `CLIENT_URL`           | Your Vercel frontend URL        |
   | `PORT`                 | `5000`                          |

4. Railway auto-detects Node.js and runs `npm start`.
   Your API will be live at: `https://your-app.up.railway.app`

### Stripe Webhook (Railway)
In Stripe dashboard → **Webhooks → Add endpoint**:
- URL: `https://your-api.up.railway.app/api/payments/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

---

## Step 3 — Frontend (Vercel)

1. Go to https://vercel.com → **New Project → Import Git Repository**
2. Set **Root Directory** to `client`
3. Framework preset: **Next.js** (auto-detected)
4. Add these environment variables:

   | Variable                 | Value                              |
   |--------------------------|------------------------------------|
   | `NEXT_PUBLIC_API_URL`    | Your Railway backend URL           |

5. Click **Deploy** — Vercel handles the rest.

---

## Step 4 — Logo

Save your logo image to:
```
client/public/images/logo.png
```
The Navbar already references this path via `next/image`.

---

## Step 5 — Verify

| Check | URL |
|-------|-----|
| API health | `https://your-api.up.railway.app/api/health` |
| Frontend   | `https://your-app.vercel.app` |
| Register   | `https://your-app.vercel.app/register` |
| Marketplace| `https://your-app.vercel.app/marketplace` |

---

## Alternative: Render (instead of Railway)

1. Go to https://render.com → **New Web Service**
2. Connect your GitHub repo, root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add the same environment variables as above.

---

## Local Development

```bash
# 1. Set up environment
cp .env .env.local   # fill in your keys

# 2. Install all dependencies
cd server && npm install
cd ../client && npm install

# 3. Start both servers
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev

# 4. Run backend tests
cd server && npm test
```
