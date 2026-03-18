/**
 * CategoryFilter — horizontal pill tabs for filtering bots by category.
 * Props: selected (string), onChange (fn)
 */
import styles from '../styles/marketplace.module.css';

const CATEGORIES = [
  { value: '',            label: 'All Bots' },
  { value: 'trading',     label: 'Trading' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'social_media',label: 'Social Media' },
  { value: 'custom',      label: 'Custom' },
];

export default function CategoryFilter({ selected, onChange }) {
  return (
    <div className={styles.filterBar}>
      {CATEGORIES.map(({ value, label }) => (
        <button
          key={value}
          className={`${styles.filterPill} ${selected === value ? styles.filterPillActive : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
