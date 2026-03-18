/**
 * Register page — collects name, email, password.
 * On success: stores JWT and redirects to /dashboard.
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { setToken } from '../lib/auth';
import styles from '../styles/auth.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setToken(data.token);
      router.push('/dashboard');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Join GlobeBotter</h1>
        <p className={styles.subtitle}>Start buying and selling AI bots today</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Full name
            <input
              className={styles.input}
              name="name"
              type="text"
              placeholder="Alice Smith"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              name="email"
              type="email"
              placeholder="alice@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              name="password"
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
