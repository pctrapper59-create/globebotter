/**
 * Marketplace page — publicly accessible.
 * Fetches bots from the API client-side, supports category filtering,
 * full-text search (debounced), and client-side sorting.
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import BotCard from '../components/BotCard';
import CategoryFilter from '../components/CategoryFilter';
import styles from '../styles/marketplace.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function sortBots(bots, sortBy) {
  const copy = [...bots];
  if (sortBy === 'price_asc')  return copy.sort((a, b) => a.price - b.price);
  if (sortBy === 'price_desc') return copy.sort((a, b) => b.price - a.price);
  // 'newest' — keep server order (created_at DESC)
  return copy;
}

export default function Marketplace() {
  const router = useRouter();
  const [bots, setBots]         = useState([]);
  const [category, setCategory] = useState('');
  const [search, setSearch]     = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy]     = useState('newest');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const debounceTimer           = useRef(null);

  // Debounce search input — 300 ms
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [search]);

  // Fetch whenever category or debounced search changes
  useEffect(() => {
    const fetchBots = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (category)       params.set('category', category);
        if (debouncedSearch) params.set('search', debouncedSearch);
        const query = params.toString();
        const url = `${API}/api/bots${query ? `?${query}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load bots');
        const data = await res.json();
        setBots(data.bots);
      } catch {
        setError('Could not load bots. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBots();
  }, [category, debouncedSearch]);

  const handleSelectBot = (bot) => {
    router.push(`/marketplace/${bot.id}`);
  };

  const displayedBots = sortBots(bots, sortBy);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Buy, Sell, and Deploy <span className={styles.heroAccent}>AI Bots</span>
        </h1>
        <p className={styles.heroSub}>That Work For You 24/7</p>
      </header>

      {/* Search + Sort toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>&#128269;</span>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search bots&hellip;"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className={styles.clearBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filter */}
      <CategoryFilter selected={category} onChange={setCategory} />

      {/* Grid */}
      <main className={styles.grid}>
        {loading && (
          <p className={styles.stateMsg}>Loading bots&hellip;</p>
        )}

        {!loading && error && (
          <p className={styles.errorMsg}>{error}</p>
        )}

        {!loading && !error && displayedBots.length === 0 && (
          <p className={styles.stateMsg}>No bots found. Try a different search or category.</p>
        )}

        {!loading && !error && displayedBots.map((bot) => (
          <BotCard key={bot.id} bot={bot} onSelect={handleSelectBot} />
        ))}
      </main>
    </div>
  );
}
