/**
 * BotCard — displays a single bot in the marketplace grid.
 * Props: bot { id, name, description, price, category }
 *        onSelect — called when the card is clicked
 */
import styles from '../styles/marketplace.module.css';

const CATEGORY_LABELS = {
  trading:      'Trading',
  marketing:    'Marketing',
  social_media: 'Social Media',
  custom:       'Custom',
};

const CATEGORY_COLORS = {
  trading:      '#f4c542',
  marketing:    '#42a5f5',
  social_media: '#ab47bc',
  custom:       '#00c896',
};

export default function BotCard({ bot, onSelect }) {
  const { name, description, price, category } = bot;
  const label = CATEGORY_LABELS[category] ?? category;
  const color = CATEGORY_COLORS[category] ?? '#888';

  return (
    <div className={styles.card} onClick={() => onSelect?.(bot)}>
      <div className={styles.cardHeader}>
        <span className={styles.badge} style={{ backgroundColor: color + '22', color }}>
          {label}
        </span>
      </div>

      <h3 className={styles.botName}>{name}</h3>
      <p className={styles.botDescription}>{description}</p>

      <div className={styles.cardFooter}>
        <span className={styles.price}>${Number(price).toFixed(2)}<span className={styles.pricePer}>/mo</span></span>
        <button className={styles.deployBtn} onClick={(e) => { e.stopPropagation(); onSelect?.(bot); }}>
          Get Bot
        </button>
      </div>
    </div>
  );
}
