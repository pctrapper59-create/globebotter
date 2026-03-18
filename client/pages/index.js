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

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.orbBlue} />
      <div className={styles.orbGreen} />
      <div className={styles.grid} />

      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroWhite}>Buy, Sell, and</span>{' '}
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

      <div className={styles.robotLeft}>🤖</div>
      <div className={styles.robotRight}>🤖</div>
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
