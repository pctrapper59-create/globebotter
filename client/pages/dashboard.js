/**
 * Buyer dashboard — purchased bots and subscriptions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ProtectedRoute from '../components/ProtectedRoute';
import { authHeaders } from '../lib/auth';
import styles from '../styles/dashboard.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function DashboardContent() {
  const router = useRouter();
  const [purchases,      setPurchases]      = useState([]);
  const [subscriptions,  setSubscriptions]  = useState([]);
  const [tab,            setTab]            = useState('bots');

  const justBought = router.query.success === '1';

  const fetchAll = useCallback(async () => {
    const paymentsRes = await fetch(`${API}/api/payments/my`, { headers: authHeaders() });
    const pd = await paymentsRes.json();
    setPurchases(pd.purchases ?? []);
    setSubscriptions(pd.subscriptions ?? []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>My Dashboard</h1>

        {justBought && (
          <div className={styles.successBanner}>
            🎉 Purchase successful! Your bot is ready to use.
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {[
            { id: 'bots',          label: 'My Bots' },
            { id: 'subscriptions', label: 'Subscriptions' },
          ].map(({ id, label }) => (
            <button
              key={id}
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── My Bots ── */}
        {tab === 'bots' && (
          purchases.length === 0
            ? <p className={styles.empty}>No bots purchased yet. <a href="/marketplace" className={styles.link}>Explore the marketplace →</a></p>
            : <div className={styles.grid}>
                {purchases.map((p) => (
                  <div key={p.id} className={styles.botCard}>
                    <div className={styles.botCardTop}>
                      <span className={styles.botEmoji}>🤖</span>
                      <div>
                        <p className={styles.botName}>{p.bot_name}</p>
                        <span className={styles.catBadge}>{p.category}</span>
                      </div>
                    </div>
                    <p className={styles.botMeta}>Purchased {new Date(p.purchased_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
        )}

        {/* ── Subscriptions ── */}
        {tab === 'subscriptions' && (
          subscriptions.length === 0
            ? <p className={styles.empty}>No active subscriptions.</p>
            : <div className={styles.grid}>
                {subscriptions.map((s) => (
                  <div key={s.id} className={styles.botCard}>
                    <div className={styles.botCardTop}>
                      <span className={styles.botEmoji}>🤖</span>
                      <div>
                        <p className={styles.botName}>{s.bot_name}</p>
                        <span className={styles.catBadge}>{s.category}</span>
                      </div>
                    </div>
                    <p className={styles.botMeta}>
                      Renews {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                    </p>
                    <span className={`${styles.statusTag} ${s.status === 'active' ? styles.statusActive : styles.statusInactive}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}
