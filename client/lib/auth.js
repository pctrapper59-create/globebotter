/**
 * Auth helpers — token storage and request headers.
 * Guards against SSR (typeof window check).
 */

const TOKEN_KEY = 'gb_token';

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

export const isAuthenticated = () => !!getToken();

export const logout = (router) => {
  removeToken();
  router.push('/login');
};

/** Returns headers with Authorization for authenticated API calls. */
export const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});
