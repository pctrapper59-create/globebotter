/**
 * Bot detail page — shows full bot info and triggers Stripe Checkout.
 * Supports one-time purchase and monthly subscription.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { authHeaders, isAuthenticated } from '../../lib/auth';
import styles from '../../styles/botDetail.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const CATEGORY_LABELS = {
  trading:      'Trading',
  marketing:    'Marketing',
  social_media: 'Social Media',
  custom:       'Custom',
};

const CATEGORY_FEATURES = {
  trading:      ['Real-time market signals', 'Automated alerts', 'Portfolio tracking'],
  marketing:    ['Lead generation', 'Campaign automation', 'Analytics dashboard'],
  social_media: ['Post scheduling', 'Multi-platform support', 'Engagement tracking'],
  custom:       ['Fully configurable', 'API integrations', 'Priority support'],
};

export default function BotDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [bot, setBot]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API}/api/bots/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => { setBot(d.bot); setLoading(false); })
      .catch(() => { setError('Failed to load bot.'); setLoading(false); });
  }, [id]);

  const handleBuy = async (mode) => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    setBuying(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/payments/checkout`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ bot_id: id, mode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Checkout failed'); return; }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.center}>
          <div className={styles.spinner} aria-label="Loading" />
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.center}>
          <div className={styles.notFound}>
            <span className={styles.notFoundEmoji}>&#128125;</span>
            <p>Bot not found.</p>
            <button className={styles.backLink} onClick={() => router.push('/marketplace')}>
              &larr; Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const features = CATEGORY_FEATURES[bot.category] ?? ['Advanced automation', 'Easy setup', 'Dedicated support'];
  const pricingModel = bot.pricing_model || 'both';
  const showOnce = pricingModel === 'once' || pricingModel === 'both';
  const showSub  = pricingModel === 'subscription' || pricingModel === 'both';

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Back navigation */}
        <button className={styles.backLink} onClick={() => router.back()}>
          &larr; Back to Marketplace
        </button>

        {/* Bot header */}
        <div className={styles.header}>
          <span className={styles.botEmoji}>&#129302;</span>
          <div>
            <span className={styles.category}>{CATEGORY_LABELS[bot.category] ?? bot.category}</span>
            <h1 className={styles.name}>{bot.name}</h1>
          </div>
        </div>

        <p className={styles.description}>{bot.description}</p>

        {/* Feature highlights */}
        <div className={styles.features}>
          <h2 className={styles.featuresTitle}>What&rsquo;s included</h2>
          <ul className={styles.featureList}>
            {features.map((f) => (
              <li key={f} className={styles.featureItem}>
                <span className={styles.featureCheck}>&#10003;</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Purchase options — rendered based on pricing_model */}
        <div className={styles.options}>
          {showOnce && (
            <div className={`${styles.optionCard} ${!showSub ? styles.optionCardSolo : ''}`}>
              {!showSub && <div className={styles.popularBadge}>Best Value</div>}
              <p className={styles.optionLabel}>One-Time Purchase</p>
              <p className={styles.optionPrice}>${Number(bot.price).toFixed(2)}</p>
              <p className={styles.optionNote}>Lifetime access &middot; no recurring charge</p>
              <button
                className={styles.btnBuy}
                disabled={buying}
                onClick={() => handleBuy('payment')}
              >
                {buying ? 'Redirecting\u2026' : `Buy Now — $${Number(bot.price).toFixed(2)} (one-time)`}
              </button>
            </div>
          )}

          {showSub && (
            <div className={`${styles.optionCard} ${styles.optionCardSub} ${!showOnce ? styles.optionCardSolo : ''}`}>
              {showOnce && <div className={styles.popularBadge}>Most Popular</div>}
              {!showOnce && <div className={styles.popularBadge}>Monthly Access</div>}
              <p className={styles.optionLabel}>Monthly Subscription</p>
              <p className={styles.optionPrice}>
                ${Number(bot.price).toFixed(2)}<span className={styles.mo}>/mo</span>
              </p>
              <p className={styles.optionNote}>Cancel anytime &middot; always up-to-date</p>
              <button
                className={styles.btnSub}
                disabled={buying}
                onClick={() => handleBuy('subscription')}
              >
                {buying ? 'Redirecting\u2026' : `Subscribe — $${Number(bot.price).toFixed(2)}/month`}
              </button>
            </div>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </div>
  );
}
