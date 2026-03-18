/**
 * Buyer dashboard — purchased bots, subscriptions, and live deployments.
 * Users can deploy or stop bots from here.
 * Polls every 2.5s while any deployment is in 'deploying' state.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ProtectedRoute from '../components/ProtectedRoute';
import { authHeaders } from '../lib/auth';
import styles from '../styles/dashboard.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLOR = {
  active:    'var(--green)',
  deploying: 'var(--blue)',
  stopped:   'var(--muted)',
  error:     '#ff6b6b',
};

function DeploymentRow({ dep, onStop, onRun }) {
  return (
    <div className={styles.depRow}>
      <div className={styles.depInfo}>
        <span className={styles.depName}>{dep.bot_name}</span>
        <span className={styles.depCat}>{dep.category}</span>
      </div>
      <div className={styles.depMeta}>
        <span className={styles.depDate}>
          Deployed {new Date(dep.deployed_at).toLocaleDateString()}
        </span>
        <span className={styles.dot} style={{ background: STATUS_COLOR[dep.status] }} />
        <span style={{ color: STATUS_COLOR[dep.status], fontWeight: 700, fontSize: '0.85rem' }}>
          {dep.status}
        </span>
      </div>
      {dep.status === 'active' && (
        <div className={styles.depActions}>
          <button className={styles.btnRun} onClick={() => onRun(dep.id)}>▶ Run</button>
          <button className={styles.btnStop} onClick={() => onStop(dep.id)}>Stop</button>
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const [purchases,      setPurchases]      = useState([]);
  const [subscriptions,  setSubscriptions]  = useState([]);
  const [deployments,    setDeployments]    = useState([]);
  const [deploying,      setDeploying]      = useState(null);
  const [tab,            setTab]            = useState('bots');

  const justBought = router.query.success === '1';

  const fetchAll = useCallback(async () => {
    const [paymentsRes, deploymentsRes] = await Promise.all([
      fetch(`${API}/api/payments/my`,  { headers: authHeaders() }),
      fetch(`${API}/api/deployments`,  { headers: authHeaders() }),
    ]);
    const [pd, dd] = await Promise.all([paymentsRes.json(), deploymentsRes.json()]);
    setPurchases(pd.purchases ?? []);
    setSubscriptions(pd.subscriptions ?? []);
    setDeployments(dd.deployments ?? []);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-poll while bots are spinning up
  useEffect(() => {
    if (!deployments.some((d) => d.status === 'deploying')) return;
    const t = setInterval(fetchAll, 2500);
    return () => clearInterval(t);
  }, [deployments, fetchAll]);

  const handleDeploy = async (bot_id) => {
    setDeploying(bot_id);
    try {
      const res = await fetch(`${API}/api/deployments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ bot_id }),
      });
      if (res.ok) { await fetchAll(); setTab('deployments'); }
    } finally {
      setDeploying(null);
    }
  };

  const handleRun = (dep_id) => {
    router.push(`/run/${dep_id}`);
  };

  const handleStop = async (dep_id) => {
    await fetch(`${API}/api/deployments/${dep_id}/stop`, {
      method: 'PATCH', headers: authHeaders(),
    });
    fetchAll();
  };

  const activeDeployIds = new Set(
    deployments.filter((d) => d.status === 'active').map((d) => d.bot_id)
  );
  const activeCount = deployments.filter((d) => d.status === 'active').length;

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>My Dashboard</h1>

        {justBought && (
          <div className={styles.successBanner}>
            🎉 Purchase successful! Your bot is ready to deploy below.
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {[
            { id: 'bots',         label: 'My Bots' },
            { id: 'subscriptions',label: 'Subscriptions' },
            { id: 'deployments',  label: 'Deployments', count: activeCount },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
              {count > 0 && <span className={styles.badge}>{count}</span>}
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

                    {activeDeployIds.has(p.bot_id)
                      ? <p className={styles.activeTag}>● Active</p>
                      : <button
                          className={styles.btnDeploy}
                          disabled={deploying === p.bot_id}
                          onClick={() => handleDeploy(p.bot_id)}
                        >
                          {deploying === p.bot_id ? 'Deploying…' : '▶ Deploy Bot'}
                        </button>
                    }
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

        {/* ── Deployments ── */}
        {tab === 'deployments' && (
          deployments.length === 0
            ? <p className={styles.empty}>No deployments yet. Deploy a bot from the Bots tab.</p>
            : <div className={styles.depList}>
                {deployments.map((d) => (
                  <DeploymentRow key={d.id} dep={d} onStop={handleStop} onRun={handleRun} />
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
