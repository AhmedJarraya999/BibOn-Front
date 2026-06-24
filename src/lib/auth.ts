export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function saveSession(accessToken: string, refreshToken: string, user: AuthUser) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  // Write cookies so middleware can read them (no httpOnly — client-side set)
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `access_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `user_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; }
  catch { return null; }
}

export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'user_role=; path=/; max-age=0';
  window.location.href = '/login';
}
