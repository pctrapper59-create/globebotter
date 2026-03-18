/**
 * Bot run page — send prompts to an active deployment.
 * Route: /run/[id]  where [id] = deployment ID
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import ProtectedRoute from '../../components/ProtectedRoute';
import { authHeaders } from '../../lib/auth';
import styles from '../../styles/run.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function Message({ role, content }) {
  return (
    <div className={`${styles.msg} ${role === 'user' ? styles.msgUser : styles.msgBot}`}>
      <span className={styles.msgLabel}>{role === 'user' ? 'You' : '🤖 Bot'}</span>
      <p className={styles.msgContent}>{content}</p>
    </div>
  );
}

function RunContent() {
  const router = useRouter();
  const { id } = router.query;

  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt]     = useState('');
  const [running, setRunning]   = useState(false);
  const [error, setError]       = useState('');
  const [botName, setBotName]   = useState('Bot');
  const bottomRef               = useRef(null);

  // Fetch deployment info for the bot name
  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/deployments`, { headers: authHeaders() })
      .then((r) => r.json())
      .then(({ deployments }) => {
        const dep = (deployments ?? []).find((d) => String(d.id) === String(id));
        if (dep) setBotName(dep.bot_name ?? 'Bot');
      })
      .catch(() => {});
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRun = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || running) return;

    const userMsg = prompt.trim();
    setPrompt('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setRunning(true);

    try {
      const res = await fetch(`${API}/api/run/${id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ prompt: userMsg }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Bot returned an error.');
        return;
      }

      setMessages((prev) => [...prev, { role: 'bot', content: data.output }]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.header}>
          <button className={styles.back} onClick={() => router.push('/dashboard')}>
            &larr; Dashboard
          </button>
          <h1 className={styles.title}>
            <span className={styles.botEmoji}>🤖</span> {botName}
          </h1>
        </div>

        <div className={styles.chatBox}>
          {messages.length === 0 && (
            <p className={styles.placeholder}>Send a message to start the conversation.</p>
          )}
          {messages.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}
          {running && (
            <div className={`${styles.msg} ${styles.msgBot}`}>
              <span className={styles.msgLabel}>🤖 Bot</span>
              <p className={styles.msgContent}>
                <span className={styles.dots}><span /><span /><span /></span>
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <form className={styles.form} onSubmit={handleRun}>
          <textarea
            className={styles.input}
            rows={3}
            placeholder="Type your prompt…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun(e); }
            }}
            disabled={running}
          />
          <button className={styles.sendBtn} type="submit" disabled={running || !prompt.trim()}>
            {running ? 'Running…' : 'Send ↵'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function RunPage() {
  return <ProtectedRoute><RunContent /></ProtectedRoute>;
}
