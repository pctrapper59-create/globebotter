/**
 * PurchasedBotRoute — wraps bot tool pages.
 * 1. Requires authentication (redirects to /login if not logged in)
 * 2. Requires the user to have purchased or subscribed to the bot
 *    (redirects to the marketplace listing if not)
 *
 * Usage:
 *   export default function MyBot() {
 *     return (
 *       <PurchasedBotRoute botSlug="ai-lead-generator">
 *         <BotContent />
 *       </PurchasedBotRoute>
 *     );
 *   }
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, authHeaders } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PurchasedBotRoute({ botSlug, children }) {
  const router  = useRouter();
  const [status, setStatus] = useState('checking'); // 'checking' | 'granted' | 'denied'

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    fetch(`${API}/api/payments/has-access/${botSlug}`, {
      headers: authHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.hasAccess) {
          setStatus('granted');
        } else {
          setStatus('denied');
          router.replace(`/marketplace/${botSlug}`);
        }
      })
      .catch(() => {
        // On network error, fail open so legitimate users aren't locked out
        setStatus('granted');
      });
  }, [botSlug, router]);

  if (status !== 'granted') return null;
  return children;
}
