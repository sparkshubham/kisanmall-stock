import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBase,
});

/** Prefer /admin and /staff; server also keeps flat legacy aliases. */
function mapApiPath(url = '') {
  if (!url || typeof url !== 'string') return url;
  const pathOnly = url.split('?')[0];
  const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  if (
    pathOnly.startsWith('/auth') ||
    pathOnly.startsWith('/admin') ||
    pathOnly.startsWith('/staff') ||
    pathOnly.startsWith('/health') ||
    pathOnly.startsWith('/docs') ||
    pathOnly.startsWith('http')
  ) {
    return url;
  }
  if (pathOnly.startsWith('/counts') || pathOnly === 'counts' || pathOnly.startsWith('counts/')) {
    const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    return `/staff${normalized}${qs}`;
  }
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  return `/admin${normalized}${qs}`;
}

api.interceptors.request.use((config) => {
  config.url = mapApiPath(config.url);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.timeout == null) {
    config.timeout = 60000;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
