/**
 * Navbar — logo + nav links + CTA buttons.
 * Uses the real logo image when available at /images/logo.png,
 * falls back to styled text if the file is missing.
 */
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/navbar.module.css';

function Logo() {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <span className={styles.logoText}>
        <span className={styles.logoBlue}>globe</span>
        <span className={styles.logoGreen}>botter</span>
        <span className={styles.logoDot}>.com</span>
      </span>
    );
  }

  return (
    <Image
      src="/images/logo.png"
      alt="GlobeBotter"
      width={160}
      height={44}
      priority
      unoptimized
      onError={() => setImgFailed(true)}
      style={{ objectFit: 'contain' }}
    />
  );
}

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        <Link href="/" className={styles.logo}>
          <Logo />
        </Link>

        <div className={styles.links}>
          <Link href="/marketplace" className={styles.link}>Marketplace</Link>
          <Link href="/seller"      className={styles.link}>Sell Bots</Link>
          <Link href="/dashboard"   className={styles.link}>Dashboard</Link>
        </div>

        <div className={styles.actions}>
          <Link href="/login"    className={styles.btnGhost}>Log in</Link>
          <Link href="/register" className={styles.btnPrimary}>Get Started</Link>
        </div>

      </div>
    </nav>
  );
}
