/**
 * GlobeBotter homepage.
 * Features the 3 flagship products with their real product images.
 */
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import styles from '../styles/home.module.css';

// ─── Featured products ────────────────────────────────────────────────────────

const FEATURED_BOTS = [
  {
    id: 'ai-automation-suite',
    name: 'AI Automation Suite',
    slug: 'ai_automation_suite',
    image: '/images/ai-automation-suite.png',
    tag: 'Full Suite',
    tagColor: '#4a9eff',
    accent: '#4a9eff',
    bullets: ['Automate Your Workflow', 'Save Hours of Work', 'Grow Your Business'],
    featured: false,
  },
  {
    id: 'ai-lead-generator',
    name: 'AI Lead Generator Bot',
    slug: 'ai_lead',
    image: '/images/ai-lead-generator.png',
    tag: 'Generate Leads',
    tagColor: '#00c896',
    accent: '#00c896',
    bullets: ['Find Local Businesses', 'Extract Contacts', 'Export to CSV'],
    featured: true,
  },
  {
    id: 'ai-outreach-bot',
    name: 'AI Outreach Message Bot',
    slug: 'ai_outreach',
    image: '/images/ai-outreach-bot.png',
    tag: 'Cold Outreach',
    tagColor: '#ab47bc',
    accent: '#ab47bc',
    bullets: ['Personalized Cold Emails', 'AI Written Outreach', 'Get More Clients'],
    featured: false,
  },
];

const CATEGORIES = [
  { icon: '📈', label: 'Trading Bots',      href: '/marketplace?category=trading' },
  { icon: '🏠', label: 'Marketing Bots',    href: '/marketplace?category=marketing' },
  { icon: '🎯', label: 'Social Media Bots', href: '/marketplace?category=social_media' },
  { icon: '⚙️', label: 'Custom Bots',       href: '/marketplace?category=custom' },
];

// ─── Bot image with fallback ──────────────────────────────────────────────────

function BotImage({ src, alt, accent }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={styles.botImgFallback} style={{ borderColor: accent + '44' }}>
        <span style={{ fontSize: '3.5rem' }}>🤖</span>
      </div>
    );
  }
  return (
    <div className={styles.botImgWrap}>
      <Image
        src={src}
        alt={alt}
        fill
        style={{ objectFit: 'cover', borderRadius: '10px' }}
        onError={() => setFailed(true)}
        unoptimized
      />
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

// ─── SVG Robot ────────────────────────────────────────────────────────────────
function RobotSVG({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="60" y1="18" x2="60" y2="4"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="60" cy="3" r="3.5" fill="currentColor"/>
      {/* Head */}
      <rect x="28" y="18" width="64" height="48" rx="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      {/* Eyes */}
      <rect x="38" y="31" width="16" height="10" rx="3" fill="currentColor"/>
      <rect x="66" y="31" width="16" height="10" rx="3" fill="currentColor"/>
      {/* Mouth */}
      <rect x="44" y="50" width="32" height="5" rx="2.5" fill="currentColor" fillOpacity="0.6"/>
      {/* Neck */}
      <rect x="52" y="66" width="16" height="10" rx="3" fill="currentColor" fillOpacity="0.4"/>
      {/* Body */}
      <rect x="16" y="76" width="88" height="80" rx="12" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      {/* Chest screen */}
      <rect x="32" y="88" width="56" height="36" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      <line x1="32" y1="100" x2="88" y2="100" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
      <line x1="32" y1="112" x2="88" y2="112" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3"/>
      {/* Belly buttons */}
      <circle cx="46" cy="138" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="60" cy="138" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="74" cy="138" r="5" stroke="currentColor" strokeWidth="1.5"/>
      {/* Left arm */}
      <rect x="-2" y="82" width="16" height="52" rx="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <circle cx="6" cy="146" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      {/* Right arm */}
      <rect x="106" y="82" width="16" height="52" rx="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <circle cx="114" cy="146" r="7" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1"/>
      {/* Left leg */}
      <rect x="24" y="156" width="28" height="48" rx="8" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <rect x="20" y="196" width="36" height="12" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
      {/* Right leg */}
      <rect x="68" y="156" width="28" height="48" rx="8" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06"/>
      <rect x="64" y="196" width="36" height="12" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08"/>
    </svg>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background layers */}
      <div className={styles.hexGrid} />
      <div className={styles.scanLine} />
      <div className={styles.beamLeft} />
      <div className={styles.beamRight} />
      <div className={styles.glowCenter} />

      {/* Circuit node decorations */}
      <div className={styles.nodeTopLeft} />
      <div className={styles.nodeTopRight} />
      <div className={styles.nodeBotLeft} />
      <div className={styles.nodeBotRight} />

      {/* SVG Robots */}
      <RobotSVG className={`${styles.robot} ${styles.robotLeft}`} />
      <RobotSVG className={`${styles.robot} ${styles.robotRight}`} />

      {/* Content */}
      <div className={styles.heroContent}>
        <div className={styles.heroBadge}>⚡ AI-Powered Automation</div>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroWhite}>Buy, Sell, and</span>
          <br />
          <span className={styles.heroGreen}>Deploy AI Bots</span>
        </h1>
        <p className={styles.heroSub}>
          That <span className={styles.heroCyan}>Work For You</span> 24/7
        </p>
        <div className={styles.heroBtns}>
          <Link href="/marketplace" className={styles.btnBlue}>Explore Bots</Link>
          <Link href="/register"    className={styles.btnGreen}>Start Selling</Link>
        </div>
        <div className={styles.featureHighlights}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>⚡</span>
            <span className={styles.featureTitle}>Instant Results</span>
            <span className={styles.featureDesc}>AI-generated in seconds, ready to copy &amp; send</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>💰</span>
            <span className={styles.featureTitle}>Lifetime Pricing</span>
            <span className={styles.featureDesc}>Pay once, use forever. No hidden subscriptions.</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🎯</span>
            <span className={styles.featureTitle}>Built for Outreach</span>
            <span className={styles.featureDesc}>Cold email, DM, lead gen — everything you need to grow</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedBots() {
  return (
    <section className={styles.featured}>
      <h2 className={styles.sectionTitle}>Our AI Automation Products</h2>

      <div className={styles.featuredGrid}>
        {FEATURED_BOTS.map((bot) => (
          <Link
            key={bot.id}
            href={`/marketplace/${bot.id}`}
            className={`${styles.featuredCard} ${bot.featured ? styles.featuredCardHighlight : ''}`}
            style={{ '--accent': bot.accent }}
          >
            {/* Product image */}
            <BotImage src={bot.image} alt={bot.name} accent={bot.accent} />

            {/* Name + tag */}
            <div className={styles.cardBody}>
              <p className={styles.featuredName}>{bot.name}</p>
              <span className={styles.featuredTag} style={{ color: bot.tagColor }}>
                ● {bot.tag}
              </span>

              {/* Feature bullets */}
              <ul className={styles.bulletList}>
                {bot.bullets.map((b) => (
                  <li key={b} className={styles.bulletItem}>
                    <span className={styles.bulletCheck} style={{ color: bot.accent }}>✔</span>
                    {b}
                  </li>
                ))}
              </ul>

              <span className={styles.viewBtn} style={{ background: bot.accent }}>
                View Bot →
              </span>
            </div>
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
        <p className={styles.ctaSub}>Join GlobeBotter &amp; Start Selling Your Bots Today!</p>
        <Link href="/register" className={styles.ctaBtn}>Get Started</Link>
      </div>
      <div className={styles.ctaRobot}>🤖</div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
