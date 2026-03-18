/**
 * Login page — email + password.
 * On success: stores JWT and redirects to /dashboard.
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { setToken } from '../lib/auth';
import styles from '../styles/auth.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
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
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Log in to your GlobeBotter account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
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
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.link}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
