export const TOKEN_KEY = 'bioactiva_token';
export const USER_EMAIL_KEY = 'bioactiva_user_email';
export const USER_NAME_KEY = 'bioactiva_user_name';

/** Retrieve JWT from localStorage */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Alias used by axios interceptor */
export const getAuthToken = getToken;

/** Store JWT and user info in localStorage */
export function setToken(token: string, email: string, name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_EMAIL_KEY, email);
  localStorage.setItem(USER_NAME_KEY, name);
}

/** Remove token and user info */
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

/** Alias used by axios interceptor */
export const logout = clearToken;

/** Get stored email */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_EMAIL_KEY);
}

/** Get stored name */
export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_NAME_KEY);
}
