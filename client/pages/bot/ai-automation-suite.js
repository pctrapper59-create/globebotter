/**
 * AI Automation Suite Bot
 * 7 AI tools to automate business growth.
 * Purchase-gated — requires active purchase or subscription.
 */
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import PurchasedBotRoute from '../../components/PurchasedBotRoute';
import { authHeaders } from '../../lib/auth';
import styles from '../../styles/automationSuite.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const PROVIDER_LABELS = { openai: 'OpenAI', anthropic: 'Anthropic', template: 'Template' };

const TOOLS = [
  { id: 'leads',    label: '🎯 Lead Finder',          endpoint: '/api/leads/search' },
  { id: 'outreach', label: '✉️ Outreach Messages',     endpoint: '/api/outreach/generate' },
  { id: 'followup',  label: '🔄 Follow-Up Sequence',   endpoint: '/api/automation/followup-sequence' },
  { id: 'email',     label: '📧 Email Drip Sequence',   endpoint: '/api/automation/email-sequence' },
  { id: 'social',    label: '📱 Social Media Pack',     endpoint: '/api/automation/social-posts' },
  { id: 'proposal',  label: '📋 Proposal Generator',    endpoint: '/api/automation/proposal' },
  { id: 'calendar',  label: '📅 Content Calendar',      endpoint: '/api/automation/content-calendar' },
  { id: 'bio',       label: '✍️ Business Bio',           endpoint: '/api/automation/bio' },
  { id: 'faq',       label: '❓ FAQ Generator',          endpoint: '/api/automation/faq' },
];

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
function AutomationSuiteContent() {
  const [activeTool,       setActiveTool]       = useState(TOOLS[0]);
  const [loading,          setLoading]          = useState(false);
  const [result,           setResult]           = useState(null);
  const [provider,         setProvider]         = useState('');
  const [error,            setError]            = useState('');

  // Inputs
  const [businessName,     setBusinessName]     = useState('');
  const [businessType,     setBusinessType]     = useState('');
  const [offer,            setOffer]            = useState('');
  const [senderName,       setSenderName]       = useState('');
  const [previousMessage,  setPreviousMessage]  = useState('');
  const [tone,             setTone]             = useState('');
  const [price,            setPrice]            = useState('');
  const [location,         setLocation]         = useState('');
  const [platforms,        setPlatforms]        = useState('');

  // Lead Finder inputs
  const [leadBusinessType, setLeadBusinessType] = useState('');
  const [leadLocation,     setLeadLocation]     = useState('');
  const [leadOffer,        setLeadOffer]         = useState('');
  const [leadLimit,        setLeadLimit]         = useState(10);

  const switchTool = (tool) => {
    setActiveTool(tool);
    setResult(null);
    setError('');
  };

  const generate = async () => {
    // Different validation per tool
    if (activeTool.id === 'leads') {
      if (!leadBusinessType.trim() || !leadLocation.trim()) {
        setError('Business type and location are required.'); return;
      }
    } else {
      if (!businessName.trim() || !businessType.trim()) {
        setError('Business name and type are required.');
        return;
      }
      if (activeTool.id === 'proposal' && !offer.trim()) {
        setError('Please describe what you\'re offering.');
        return;
      }
    }
    setLoading(true); setError(''); setResult(null);
    try {
      let body;
      if (activeTool.id === 'leads') {
        body = { businessType: leadBusinessType, location: leadLocation, offer: leadOffer, limit: leadLimit };
      } else if (activeTool.id === 'outreach') {
        body = { businessName, businessType, offer, senderName };
      } else {
        body = { businessName, businessType, offer, senderName, previousMessage, tone, price, location, platforms };
      }
      const res = await fetch(`${API}${activeTool.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Generation failed'); return; }
      setResult(data);
      setProvider(data.provider || '');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const toolId = activeTool.id;
  const showSenderName = ['followup', 'email', 'proposal'].includes(toolId);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>🤖 AI Automation Suite</h1>
          <p className={styles.subtitle}>
            9 AI tools to automate your business growth
          </p>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`${styles.tab} ${activeTool.id === tool.id ? styles.tabActive : ''}`}
              onClick={() => switchTool(tool)}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {/* Input form */}
        <div className={styles.card}>

          {activeTool.id === 'leads' ? (
            <>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>Business Type *</label>
                  <input className={styles.input} placeholder="e.g. plumbing company" value={leadBusinessType} onChange={e => setLeadBusinessType(e.target.value)} />
                </div>
                <div>
                  <label className={styles.label}>Location *</label>
                  <input className={styles.input} placeholder="e.g. Austin, TX" value={leadLocation} onChange={e => setLeadLocation(e.target.value)} />
                </div>
              </div>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.label}>What you&rsquo;re offering</label>
                  <input className={styles.input} placeholder="e.g. AI marketing tools" value={leadOffer} onChange={e => setLeadOffer(e.target.value)} />
                </div>
                <div>
                  <label className={styles.label}>Number of leads (max 20)</label>
                  <input className={styles.input} type="number" min="1" max="20" value={leadLimit} onChange={e => setLeadLimit(Number(e.target.value))} />
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Always required: Business Name + Business Type */}
          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Business Name *</label>
              <input
                className={styles.input}
                placeholder="e.g. Mike's Plumbing"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label className={styles.label}>Business Type *</label>
              <input
                className={styles.input}
                placeholder="e.g. plumbing company"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
            </div>
          </div>

          {/* followup: previous message */}
          {toolId === 'followup' && (
            <div className={styles.formFull}>
              <label className={styles.label}>Previous message sent (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Paste the message you already sent..."
                value={previousMessage}
                onChange={(e) => setPreviousMessage(e.target.value)}
              />
            </div>
          )}

          {/* email, proposal, faq: offer */}
          {['email', 'proposal', 'faq'].includes(toolId) && (
            <div className={styles.formFull}>
              <label className={styles.label}>What you&rsquo;re offering {toolId === 'proposal' ? '*' : ''}</label>
              <input
                className={styles.input}
                placeholder="e.g. AI marketing automation"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              />
            </div>
          )}

          {/* social: tone */}
          {toolId === 'social' && (
            <div className={styles.formFull}>
              <label className={styles.label}>Tone</label>
              <input
                className={styles.input}
                placeholder="professional, funny, inspiring"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>
          )}

          {/* proposal: price */}
          {toolId === 'proposal' && (
            <div className={styles.formFull}>
              <label className={styles.label}>Your asking price</label>
              <input
                className={styles.input}
                placeholder="e.g. $2,500/month"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}

          {/* bio: location + offer */}
          {toolId === 'bio' && (
            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Location (optional)</label>
                <input
                  className={styles.input}
                  placeholder="e.g. Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.label}>What you offer</label>
                <input
                  className={styles.input}
                  placeholder="e.g. web design & SEO"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* calendar: platforms */}
          {toolId === 'calendar' && (
            <div className={styles.formFull}>
              <label className={styles.label}>Platforms</label>
              <input
                className={styles.input}
                placeholder="Instagram, LinkedIn, Twitter"
                value={platforms}
                onChange={(e) => setPlatforms(e.target.value)}
              />
            </div>
          )}

          {/* Sender name (for relevant tools) */}
          {showSenderName && (
            <div className={styles.formFull}>
              <label className={styles.label}>Your name (optional)</label>
              <input
                className={styles.input}
                placeholder="e.g. Alex Johnson"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />
            </div>
          )}
            </>
          )}

          <button
            className={styles.generateBtn}
            onClick={generate}
            disabled={loading}
          >
            {loading ? 'Generating…' : `⚡ Generate ${activeTool.label.replace(/^.{2}\s/, '')}`}
          </button>

          {loading && (
            <>
              <div className={styles.loadingBar}>
                <div className={styles.loadingFill} />
              </div>
              <p className={styles.loadingText}>Writing with AI…</p>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Results — leads */}
        {activeTool.id === 'leads' && result?.leads && (
          <>
            <div className={styles.results}>
              {result.leads.map((lead, i) => (
                <div key={i} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <span className={styles.resultLabel} style={{color:'#38bdf8'}}>🏢 {lead.name}</span>
                    <CopyButton text={lead.message || ''} />
                  </div>
                  <div className={styles.resultBody}>
                    {lead.address && <div style={{color:'#64748b',fontSize:'0.8rem',marginBottom:'0.35rem'}}>📍 {lead.address}</div>}
                    {lead.phone && <div style={{color:'#64748b',fontSize:'0.8rem',marginBottom:'0.35rem'}}>📞 {lead.phone}</div>}
                    {lead.website && <div style={{color:'#64748b',fontSize:'0.8rem',marginBottom:'0.75rem'}}>🌐 {lead.website}</div>}
                    {lead.message && <div style={{whiteSpace:'pre-wrap'}}>{lead.message}</div>}
                  </div>
                </div>
              ))}
              {result.total && <p style={{color:'#64748b',fontSize:'0.85rem',textAlign:'center'}}>Showing {result.leads.length} of {result.total} results</p>}
            </div>
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

        {/* Results — outreach */}
        {activeTool.id === 'outreach' && result?.messages && (
          <>
            <div className={styles.results}>
              {[
                { key: 'coldEmail', label: '📧 Cold Email', color: '#a78bfa' },
                { key: 'dm',        label: '💬 Instagram / DM', color: '#38bdf8' },
                { key: 'followUp',  label: '🔄 Follow-Up', color: '#34d399' },
              ].map(({ key, label, color }) => (
                <div key={key} className={styles.resultCard}>
                  <div className={styles.resultHeader}>
                    <span className={styles.resultLabel} style={{color}}>{label}</span>
                    <CopyButton text={result.messages[key] || ''} />
                  </div>
                  <div className={styles.resultBody}>{result.messages[key]}</div>
                </div>
              ))}
            </div>
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

        {/* Results — existing 7 tools */}
        {result && activeTool.id !== 'leads' && activeTool.id !== 'outreach' && (
          <>
            <div className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <span className={styles.resultLabel}>{activeTool.label}</span>
              </div>
              <div className={styles.resultBody}>

                {/* followup: 3 messages */}
                {toolId === 'followup' && result.sequence && (
                  <>
                    {result.sequence.msg1 && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Follow-Up #1</div>
                        <div className={styles.outputText}>{result.sequence.msg1}</div>
                      </div>
                    )}
                    {result.sequence.msg2 && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Follow-Up #2</div>
                        <div className={styles.outputText}>{result.sequence.msg2}</div>
                      </div>
                    )}
                    {result.sequence.msg3 && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Follow-Up #3</div>
                        <div className={styles.outputText}>{result.sequence.msg3}</div>
                      </div>
                    )}
                  </>
                )}

                {/* email: 5 email items */}
                {toolId === 'email' && result.sequence && (
                  [1, 2, 3, 4, 5].map((n) => {
                    const email = result.sequence[`email${n}`];
                    if (!email) return null;
                    return (
                      <div key={n} className={styles.emailItem}>
                        <div className={styles.emailSubject}>Email {n}: {email.subject}</div>
                        <div className={styles.emailBody}>{email.body}</div>
                      </div>
                    );
                  })
                )}

                {/* social: 3 platform sections */}
                {toolId === 'social' && result.posts && (
                  <>
                    {result.posts.instagram && (
                      <div className={styles.socialSection}>
                        <div className={styles.socialPlatformLabel}>Instagram</div>
                        <div className={styles.socialPosts}>
                          {result.posts.instagram.map((post, i) => (
                            <div key={i} className={styles.socialPost}>
                              <span>{post}</span>
                              <CopyButton text={post} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.posts.linkedin && (
                      <div className={styles.socialSection}>
                        <div className={styles.socialPlatformLabel}>LinkedIn</div>
                        <div className={styles.socialPosts}>
                          {result.posts.linkedin.map((post, i) => (
                            <div key={i} className={styles.socialPost}>
                              <span>{post}</span>
                              <CopyButton text={post} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.posts.twitter && (
                      <div className={styles.socialSection}>
                        <div className={styles.socialPlatformLabel}>Twitter / X</div>
                        <div className={styles.socialPosts}>
                          {result.posts.twitter.map((post, i) => (
                            <div key={i} className={styles.socialPost}>
                              <span>{post}</span>
                              <CopyButton text={post} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* proposal: single large output */}
                {toolId === 'proposal' && result.proposal && (
                  <div className={styles.outputSection}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                      <CopyButton text={result.proposal} />
                    </div>
                    <div className={styles.outputText}>{result.proposal}</div>
                  </div>
                )}

                {/* calendar: 30-day grid */}
                {toolId === 'calendar' && Array.isArray(result.calendar) && (
                  <div className={styles.calendarGrid}>
                    {result.calendar.map((day, i) => (
                      <div key={i} className={styles.calendarDay}>
                        <div className={styles.calDay}>Day {day.day || i + 1}</div>
                        {day.platform && <div className={styles.calPlatform}>{day.platform}</div>}
                        {day.type && <div className={styles.calType}>{day.type}</div>}
                        {day.topic && <div className={styles.calTopic}>{day.topic}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* bio: short, medium, long */}
                {toolId === 'bio' && result.bios && (
                  <>
                    {result.bios.short && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Short Bio</div>
                        <div className={styles.outputText}>{result.bios.short}</div>
                      </div>
                    )}
                    {result.bios.medium && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Medium Bio</div>
                        <div className={styles.outputText}>{result.bios.medium}</div>
                      </div>
                    )}
                    {result.bios.long && (
                      <div className={styles.outputSection}>
                        <div className={styles.outputLabel}>Long Bio</div>
                        <div className={styles.outputText}>{result.bios.long}</div>
                      </div>
                    )}
                  </>
                )}

                {/* faq: 10 Q&A items */}
                {toolId === 'faq' && Array.isArray(result.faq) && (
                  <div className={styles.faqList}>
                    {result.faq.map((item, i) => (
                      <div key={i} className={styles.faqItem}>
                        <div className={styles.faqQ}>{item.q}</div>
                        <div className={styles.faqA}>{item.a}</div>
                      </div>
                    ))}
                  </div>
                )}

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
        {!result && !loading && (
          <div className={styles.howItWorks}>
            <p className={styles.howTitle}>How it works</p>
            <div className={styles.howSteps}>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>🎯</span>
                <p className={styles.howStepTitle}>Pick a tool</p>
                <p className={styles.howStepDesc}>Choose from 9 automation tools above</p>
              </div>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>🤖</span>
                <p className={styles.howStepTitle}>AI generates</p>
                <p className={styles.howStepDesc}>Claude/GPT crafts tailored content instantly</p>
              </div>
              <div className={styles.howStep}>
                <span className={styles.howIcon}>📋</span>
                <p className={styles.howStepTitle}>Copy & use</p>
                <p className={styles.howStepDesc}>One click to copy, ready for your business</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function AIAutomationSuitePage() {
  return (
    <PurchasedBotRoute botSlug="ai-automation-suite">
      <AutomationSuiteContent />
    </PurchasedBotRoute>
  );
}
