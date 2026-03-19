/**
 * AI Outreach Message Bot
 * Generates 3 personalized outreach messages: cold email, DM, follow-up.
 * Purchase-gated — requires active purchase or subscription.
 */
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import PurchasedBotRoute from '../../components/PurchasedBotRoute';
import { authHeaders } from '../../lib/auth';
import styles from '../../styles/outreachBot.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const PROVIDER_LABELS = { openai: 'OpenAI', anthropic: 'Anthropic', template: 'Template' };

/* ── Copy button with ✓ feedback ── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
      onClick={copy}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

/* ── Main bot content ── */
function OutreachBotContent() {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [offer,        setOffer]        = useState('');
  const [senderName,   setSenderName]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [messages,     setMessages]     = useState(null);
  const [provider,     setProvider]     = useState('');
  const [error,        setError]        = useState('');

  const generate = async () => {
    if (!businessName.trim() || !businessType.trim()) {
      setError('Business name and business type are required.');
      return;
    }
    setLoading(true);
    setError('');
    setMessages(null);

    try {
      const res = await fetch(`${API}/api/outreach/generate`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ businessName, businessType, offer, senderName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Generation failed'); return; }
      setMessages(data.messages);
      setProvider(data.provider || '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) generate(); };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>✉️ AI Outreach Bot</h1>
          <p className={styles.subtitle}>
            Generate a cold email, DM, and follow-up — personalized and ready to send.
          </p>
        </div>

        {/* Input form */}
        <div className={styles.card}>
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Business Name *</label>
              <input
                className={styles.input}
                placeholder="e.g. Mike's Plumbing"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
            <div>
              <label className={styles.label}>Business Type *</label>
              <input
                className={styles.input}
                placeholder="e.g. plumbing company"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>What you&rsquo;re offering</label>
              <input
                className={styles.input}
                placeholder="e.g. AI marketing automation"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
            <div>
              <label className={styles.label}>Your name (optional)</label>
              <input
                className={styles.input}
                placeholder="e.g. Alex Johnson"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
          </div>

          <button
            className={styles.generateBtn}
            onClick={generate}
            disabled={loading}
          >
            {loading ? 'Generating messages…' : '⚡ Generate Outreach Messages'}
          </button>

          {loading && (
            <>
              <div className={styles.loadingBar}>
                <div className={styles.loadingFill} />
              </div>
              <p className={styles.loadingText}>Writing personalized messages with AI…</p>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Results */}
        {messages && (
          <>
            <div className={styles.results}>

              {/* Cold Email */}
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <span className={`${styles.resultLabel} ${styles.labelEmail}`}>
                    📧 Cold Email
                  </span>
                  <CopyButton text={messages.coldEmail} />
                </div>
                <div className={styles.resultBody}>{messages.coldEmail}</div>
              </div>

              {/* DM */}
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <span className={`${styles.resultLabel} ${styles.labelDm}`}>
                    💬 Instagram / DM
                  </span>
                  <CopyButton text={messages.dm} />
                </div>
                <div className={styles.resultBody}>{messages.dm}</div>
              </div>

              {/* Follow-up */}
              <div className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <span className={`${styles.resultLabel} ${styles.labelFollowup}`}>
                    🔄 Follow-Up Message
                  </span>
                  <CopyButton text={messages.followUp} />
                </div>
                <div className={styles.resultBody}>{messages.followUp}</div>
              </div>

            </div>

            {/* Provider + regen */}
            <div className={styles.regenRow}>
              {provider && (
                <span className={styles.providerBadge}>
                  Powered by {PROVIDER_LABELS[provider] || provider}
                </span>
              )}
              <button className={styles.regenBtn} onClick={generate} disabled={loading}>
                ↻ Regenerate
              </button>
            </div>
          </>
        )}

        {/* How it works — shown before first generation */}
        {!messages && !loading && (
          <div className={styles.howItWorks}>
            <p className={styles.howTitle}>How it works</p>
            <div className={styles.howSteps}>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>🎯</span>
                <p className={styles.howStepTitle}>Enter target</p>
                <p className={styles.howStepDesc}>Type the business name and what they do</p>
              </div>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>🤖</span>
                <p className={styles.howStepTitle}>AI writes</p>
                <p className={styles.howStepDesc}>Claude/GPT crafts 3 personalized messages</p>
              </div>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>📋</span>
                <p className={styles.howStepTitle}>Copy & send</p>
                <p className={styles.howStepDesc}>One click to copy, ready to send instantly</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function AIOutreachBotPage() {
  return (
    <PurchasedBotRoute botSlug="ai-outreach-bot">
      <OutreachBotContent />
    </PurchasedBotRoute>
  );
}
