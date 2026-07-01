import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refresh_token: refreshToken },
          );
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          const maxAge = 60 * 60 * 24 * 30;
          document.cookie = `access_token=${data.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          document.cookie = 'access_token=; path=/; max-age=0';
          document.cookie = 'user_role=; path=/; max-age=0';
          const pub = ['/', '/login', '/register'];
          const onPublic = pub.some((p) => p === '/' ? window.location.pathname === '/' : window.location.pathname.startsWith(p));
          if (!onPublic) window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
