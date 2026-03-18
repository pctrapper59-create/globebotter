/**
 * Stripe.js helper — lazy-loads @stripe/stripe-js so it only
 * runs in the browser (never on the server during SSR).
 */
import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    );
  }
  return stripePromise;
}
