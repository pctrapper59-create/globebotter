/**
 * Seller dashboard — upload bots, set price, view sales & stats.
 * Protected: redirects to /login if unauthenticated.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ProtectedRoute from '../components/ProtectedRoute';
import { authHeaders } from '../lib/auth';
import styles from '../styles/seller.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const CATEGORIES = ['trading', 'marketing', 'social_media', 'custom'];
const CATEGORY_LABELS = { trading: 'Trading', marketing: 'Marketing', social_media: 'Social Media', custom: 'Custom' };

// ── Upload bot form ──────────────────────────────────────────────────────────
function UploadForm({ onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'trading' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/seller/bots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...form, price: parseFloat(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Upload failed'); return; }
      setSuccess(`"${data.bot.name}" listed successfully!`);
      setForm({ name: '', description: '', price: '', category: 'trading' });
      onSuccess?.();
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>List a New Bot</h2>

      <label className={styles.label}>
        Bot name
        <input className={styles.input} name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Crypto Signal Bot" />
      </label>

      <label className={styles.label}>
        Description
        <textarea className={styles.textarea} name="description" value={form.description} onChange={handleChange} required rows={3} placeholder="What does this bot do?" />
      </label>

      <div className={styles.row}>
        <label className={styles.label} style={{ flex: 1 }}>
          Price (USD/mo)
          <input className={styles.input} name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required placeholder="29.99" />
        </label>

        <label className={styles.label} style={{ flex: 1 }}>
          Category
          <select className={styles.select} name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
      </div>

      {error   && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <button className={styles.btnPrimary} type="submit" disabled={loading}>
        {loading ? 'Listing…' : '+ List Bot'}
      </button>
    </form>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue} style={{ color: accent }}>{value}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
function SellerContent() {
  const [bots,  setBots]  = useState([]);
  const [sales, setSales] = useState({ purchases: [], subscriptions: [] });
  const [stats, setStats] = useState(null);
  const [tab,   setTab]   = useState('bots'); // 'bots' | 'sales'

  const fetchAll = async () => {
    const [botsRes, salesRes, statsRes] = await Promise.all([
      fetch(`${API}/api/seller/bots`,  { headers: authHeaders() }),
      fetch(`${API}/api/seller/sales`, { headers: authHeaders() }),
      fetch(`${API}/api/seller/stats`, { headers: authHeaders() }),
    ]);
    const [botsData, salesData, statsData] = await Promise.all([
      botsRes.json(), salesRes.json(), statsRes.json(),
    ]);
    setBots(botsData.bots ?? []);
    setSales(salesData);
    setStats(statsData.stats);
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Seller Dashboard</h1>

        {/* Stats row */}
        {stats && (
          <div className={styles.statsRow}>
            <StatCard label="Total Revenue"       value={`$${Number(stats.total_revenue).toFixed(2)}`} accent="var(--green)" />
            <StatCard label="Total Sales"         value={stats.total_sales}           accent="var(--blue)" />
            <StatCard label="Active Subscribers"  value={stats.active_subscriptions}  accent="#ab47bc" />
            <StatCard label="Listed Bots"         value={bots.length}                 accent="var(--muted)" />
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'bots'  ? styles.tabActive : ''}`} onClick={() => setTab('bots')}>My Bots</button>
          <button className={`${styles.tab} ${tab === 'sales' ? styles.tabActive : ''}`} onClick={() => setTab('sales')}>Sales</button>
          <button className={`${styles.tab} ${tab === 'upload'? styles.tabActive : ''}`} onClick={() => setTab('upload')}>+ Upload</button>
        </div>

        {/* My bots */}
        {tab === 'bots' && (
          <div className={styles.tableWrap}>
            {bots.length === 0
              ? <p className={styles.empty}>No bots listed yet. Upload your first bot!</p>
              : (
                <table className={styles.table}>
                  <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Status</th></tr></thead>
                  <tbody>
                    {bots.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td><span className={styles.badge}>{CATEGORY_LABELS[b.category] ?? b.category}</span></td>
                        <td>${Number(b.price).toFixed(2)}</td>
                        <td><span className={`${styles.status} ${b.status === 'active' ? styles.statusActive : styles.statusInactive}`}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* Sales */}
        {tab === 'sales' && (
          <div className={styles.tableWrap}>
            <h3 className={styles.subTitle}>One-Time Purchases</h3>
            {sales.purchases.length === 0
              ? <p className={styles.empty}>No purchases yet.</p>
              : (
                <table className={styles.table}>
                  <thead><tr><th>Bot</th><th>Buyer</th><th>Amount</th><th>Date</th></tr></thead>
                  <tbody>
                    {sales.purchases.map((p) => (
                      <tr key={p.id}>
                        <td>{p.bot_name}</td>
                        <td>{p.buyer_name}</td>
                        <td className={styles.green}>${Number(p.amount_paid).toFixed(2)}</td>
                        <td>{new Date(p.purchased_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }

            <h3 className={styles.subTitle} style={{ marginTop: '2rem' }}>Subscriptions</h3>
            {sales.subscriptions.length === 0
              ? <p className={styles.empty}>No subscriptions yet.</p>
              : (
                <table className={styles.table}>
                  <thead><tr><th>Bot</th><th>Buyer</th><th>Status</th><th>Renews</th></tr></thead>
                  <tbody>
                    {sales.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.bot_name}</td>
                        <td>{s.buyer_name}</td>
                        <td><span className={`${styles.status} ${s.status === 'active' ? styles.statusActive : styles.statusInactive}`}>{s.status}</span></td>
                        <td>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )}

        {/* Upload form */}
        {tab === 'upload' && <UploadForm onSuccess={() => { fetchAll(); setTab('bots'); }} />}
      </main>
    </div>
  );
}

export default function SellerDashboard() {
  return <ProtectedRoute><SellerContent /></ProtectedRoute>;
}
