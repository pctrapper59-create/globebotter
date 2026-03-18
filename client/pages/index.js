/**
 * GlobeBotter homepage.
 * Sections: Hero → Featured Bots → Category Nav → CTA Strip
 * Matches the globebotter.com design mockup.
 */
import Link from 'next/link';
import Navbar from '../components/Navbar';
import styles from '../styles/home.module.css';

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURED_BOTS = [
  {
    id: 'crypto-signal-bot',
    icon: '₿',
    iconBg: '#f4c542',
    name: 'Crypto Signal Bot',
    tag: 'Profit Alerts',
    tagColor: '#f4c542',
    description: 'Real-time crypto signals with profit alerts and auto-trading triggers.',
  },
  {
    id: 'local-lead-finder',
    icon: '📍',
    iconBg: '#00c896',
    name: 'Local Lead Finder',
    tag: 'Generate Leads',
    tagColor: '#00c896',
    description: 'Scrapes and qualifies local business leads automatically, 24/7.',
    featured: true,
  },
  {
    id: 'auto-social-poster',
    icon: '📅',
    iconBg: '#e05252',
    name: 'Auto Social Poster',
    tag: 'Schedule Posts',
    tagColor: '#ab47bc',
    description: 'Auto-schedules and posts content across all your social platforms.',
  },
];

const CATEGORIES = [
  { icon: '📈', label: 'Trading Bots',      href: '/marketplace?category=trading' },
  { icon: '🏠', label: 'Marketing Bots',    href: '/marketplace?category=marketing' },
  { icon: '🎯', label: 'Social Media Bots', href: '/marketplace?category=social_media' },
  { icon: '⚙️', label: 'Custom Bots',       href: '/marketplace?category=custom' },
];

// ─── Sections ────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className={styles.hero}>
      {/* Ambient glow orbs */}
      <div className={styles.orbBlue} />
      <div className={styles.orbGreen} />

      {/* Grid overlay */}
      <div className={styles.grid} />

      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroWhite}>Buy, Sell,</span>{' '}
          <span className={styles.heroWhite}>and</span>{' '}
          <span className={styles.heroGreen}>Deploy AI Bots</span>
        </h1>
        <p className={styles.heroSub}>
          That <span className={styles.heroGreen}>Work For You</span> 24/7
        </p>

        <div className={styles.heroBtns}>
          <Link href="/marketplace" className={styles.btnBlue}>Explore Bots</Link>
          <Link href="/register"    className={styles.btnGreen}>Start Selling</Link>
        </div>
      </div>

      {/* Decorative robot silhouettes */}
      <div className={styles.robotLeft}>🤖</div>
      <div className={styles.robotRight}>🤖</div>
    </section>
  );
}

function FeaturedBots() {
  return (
    <section className={styles.featured}>
      <h2 className={styles.sectionTitle}>Featured Bots</h2>

      <div className={styles.featuredGrid}>
        {FEATURED_BOTS.map((bot) => (
          <Link
            key={bot.id}
            href={`/marketplace/${bot.id}`}
            className={`${styles.featuredCard} ${bot.featured ? styles.featuredCardHighlight : ''}`}
          >
            <div className={styles.featuredTop}>
              {/* Icon badge */}
              <span
                className={styles.botIcon}
                style={{ background: bot.iconBg + '22', color: bot.iconBg }}
              >
                {bot.icon}
              </span>
              <span className={styles.featuredName}>{bot.name}</span>
            </div>

            {/* Robot emoji stand-in for bot image */}
            <div className={styles.botImageArea}>
              <span className={styles.botEmoji}>🤖</span>
            </div>

            <span
              className={styles.featuredTag}
              style={{ color: bot.tagColor }}
            >
              {bot.tag}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoryNav() {
  return (
    <nav className={styles.catNav}>
      {CATEGORIES.map(({ icon, label, href }) => (
        <Link key={label} href={href} className={styles.catItem}>
          <span className={styles.catIcon}>{icon}</span>
          <span className={styles.catLabel}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function CTAStrip() {
  return (
    <section className={styles.cta}>
      <div className={styles.ctaLeft}>
        <p className={styles.ctaTitle}>
          <em>Earn Money</em> with <strong>Automation</strong>
        </p>
      </div>
      <div className={styles.ctaRight}>
        <p className={styles.ctaSub}>
          Join Globebotter &amp; Start Selling Your Bots Today!
        </p>
        <Link href="/register" className={styles.ctaBtn}>Get Started</Link>
      </div>
      <div className={styles.ctaRobot}>🤖</div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className={styles.page}>
      <Navbar />
      <Hero />
      <FeaturedBots />
      <CategoryNav />
      <CTAStrip />
    </div>
  );
}
