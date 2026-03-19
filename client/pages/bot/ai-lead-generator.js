/**
 * AI Lead Generator Bot
 * Protected page — search local businesses, get AI-written outreach messages, export CSV.
 */
import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import ProtectedRoute from '../../components/ProtectedRoute';
import { authHeaders } from '../../lib/auth';
import styles from '../../styles/leadBot.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/* ─── Loading steps animation ─── */
const STEPS = [
  '🔍 Searching local businesses…',
  '📋 Gathering contact info…',
  '🤖 Writing personalized messages…',
  '✨ Almost done…',
];

/* ─── CSV export ─── */
function exportCSV(leads, businessType, location) {
  const headers = ['Business Name', 'Website', 'Phone', 'Address', 'AI Outreach Message'];
  const rows = leads.map((l) => [
    `"${(l.name    || '').replace(/"/g, '""')}"`,
    `"${(l.website || '').replace(/"/g, '""')}"`,
    `"${(l.phone   || '').replace(/"/g, '""')}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `"${(l.message || '').replace(/"/g, '""')}"`,
  ]);

  const csv     = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `leads-${businessType}-${location}-${Date.now()}.csv`.replace(/\s+/g, '-');
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Copy to clipboard helper ─── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button className={styles.copyBtn} onClick={copy} title="Copy message">
      {copied ? '✓' : '⧉'}
    </button>
  );
}

/* ─── Single lead row ─── */
function LeadRow({ lead, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <tr className={styles.tr}>
      <td className={styles.td}>
        <span className={styles.leadNum}>{index + 1}</span>
        <span className={styles.leadName}>{lead.name}</span>
      </td>
      <td className={styles.td}>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
            {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : <span className={styles.na}>—</span>}
      </td>
      <td className={styles.td}>
        {lead.phone ? (
          <a href={`tel:${lead.phone}`} className={styles.phone}>{lead.phone}</a>
        ) : <span className={styles.na}>—</span>}
      </td>
      <td className={`${styles.td} ${styles.msgCell}`}>
        <div className={`${styles.msgText} ${expanded ? styles.msgExpanded : ''}`}>
          {lead.message}
        </div>
        <div className={styles.msgActions}>
          <button className={styles.expandBtn} onClick={() => setExpanded(!expanded)}>
            {expanded ? '▲ Less' : '▼ More'}
          </button>
          <CopyButton text={lead.message} />
        </div>
      </td>
    </tr>
  );
}

/* ─── Main bot content ─── */
function LeadBotContent() {
  const router = useRouter();

  const [businessType, setBusinessType] = useState('');
  const [location,     setLocation]     = useState('');
  const [offer,        setOffer]        = useState('');
  const [limit,        setLimit]        = useState(10);

  const [loading,   setLoading]   = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [leads,     setLeads]     = useState([]);
  const [error,     setError]     = useState('');
  const [searched,  setSearched]  = useState(false);

  const stepTimer    = useRef(null);
  const resultsRef   = useRef(null);

  /* Cycle loading step text */
  const startSteps = () => {
    setStepIndex(0);
    stepTimer.current = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 2000);
  };
  const stopSteps = () => {
    clearInterval(stepTimer.current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessType.trim() || !location.trim()) return;

    setLoading(true);
    setError('');
    setLeads([]);
    setSearched(false);
    startSteps();

    try {
      const res = await fetch(`${API}/api/leads/search`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ businessType, location, offer, limit }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setLeads(data.leads || []);
      setSearched(true);

      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      stopSteps();
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </button>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>🤖</span>
            <div>
              <h1 className={styles.title}>AI Lead Generator Bot</h1>
              <p className={styles.subtitle}>Find local businesses &amp; send personalized outreach — automatically</p>
            </div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>✓ Real Business Data</span>
            <span className={styles.badge}>✓ AI-Written Messages</span>
            <span className={styles.badge}>✓ CSV Export</span>
          </div>
        </div>

        {/* ── Input Card ── */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🔎 Search Leads</h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Business Type *</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. plumbers, dentists, restaurants…"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Location *</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Las Vegas, New York, Miami…"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Your Service / Offer</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. web design, SEO, social media ads…"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Number of Leads</label>
                <select
                  className={styles.input}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={loading}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n} leads</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className={styles.generateBtn}
              type="submit"
              disabled={loading || !businessType.trim() || !location.trim()}
            >
              {loading ? (
                <><span className={styles.spinner} /> Searching…</>
              ) : (
                '⚡ Generate Leads'
              )}
            </button>
          </form>
        </div>

        {/* ── Loading State ── */}
        {loading && (
          <div className={styles.loadingCard}>
            <div className={styles.loadingIcon}>🔄</div>
            <p className={styles.loadingStep}>{STEPS[stepIndex]}</p>
            <div className={styles.loadingBar}>
              <div className={styles.loadingBarFill} />
            </div>
            <p className={styles.loadingHint}>This usually takes 15–30 seconds</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className={styles.errorCard}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Results ── */}
        {!loading && searched && (
          <div ref={resultsRef} className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <div>
                <h2 className={styles.resultsTitle}>
                  {leads.length > 0
                    ? `🎯 Found ${leads.length} leads in ${location}`
                    : `😕 No leads found for "${businessType}" in "${location}"`}
                </h2>
                {leads.length > 0 && (
                  <p className={styles.resultsSub}>
                    {leads.filter((l) => l.website).length} with websites ·{' '}
                    {leads.filter((l) => l.phone).length} with phone numbers
                  </p>
                )}
              </div>
              {leads.length > 0 && (
                <button
                  className={styles.csvBtn}
                  onClick={() => exportCSV(leads, businessType, location)}
                >
                  ⬇ Download CSV
                </button>
              )}
            </div>

            {leads.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Business</th>
                      <th className={styles.th}>Website</th>
                      <th className={styles.th}>Phone</th>
                      <th className={styles.th}>AI Message ✨</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, i) => (
                      <LeadRow key={i} lead={lead} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {leads.length > 0 && (
              <div className={styles.exportBar}>
                <p className={styles.exportHint}>
                  💡 Copy individual messages with the ⧉ button, or download all leads as CSV
                </p>
                <button
                  className={styles.csvBtn}
                  onClick={() => exportCSV(leads, businessType, location)}
                >
                  ⬇ Download CSV ({leads.length} leads)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── How It Works (shown before first search) ── */}
        {!searched && !loading && (
          <div className={styles.howItWorks}>
            <h3 className={styles.howTitle}>How it works</h3>
            <div className={styles.steps}>
              {[
                { icon: '1️⃣', title: 'Enter a business type', desc: 'Plumbers, dentists, gyms, restaurants — any local niche.' },
                { icon: '2️⃣', title: 'Set your location', desc: 'Any city, town, or area in the world.' },
                { icon: '3️⃣', title: 'Add your offer', desc: 'Tell the AI what service you\'re selling so messages are personalised.' },
                { icon: '4️⃣', title: 'Get leads + messages', desc: 'Real business data + AI-crafted outreach, ready to copy or download.' },
              ].map((s) => (
                <div key={s.title} className={styles.step}>
                  <span className={styles.stepIcon}>{s.icon}</span>
                  <div>
                    <p className={styles.stepTitle}>{s.title}</p>
                    <p className={styles.stepDesc}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function AILeadGeneratorPage() {
  return (
    <ProtectedRoute>
      <LeadBotContent />
    </ProtectedRoute>
  );
}
