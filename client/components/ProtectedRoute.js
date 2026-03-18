/**
 * ProtectedRoute — wraps pages that require authentication.
 * Redirects to /login if no token is found in localStorage.
 * Renders nothing while checking to avoid a flash of protected content.
 *
 * Usage:
 *   export default function Dashboard() {
 *     return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
 *   }
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated } from '../lib/auth';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setVerified(true);
    }
  }, [router]);

  if (!verified) return null;
  return children;
}
