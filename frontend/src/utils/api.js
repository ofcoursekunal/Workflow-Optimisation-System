import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

// Auto-attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('shopfloor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor for session handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || (error.response?.status === 404 && error.config.url.includes('/auth/me'))) {
      localStorage.removeItem('shopfloor_token');
      localStorage.removeItem('shopfloor_user');
      // We don't want to force refresh here as it might loop, 
      // but clearing storage ensures the next reload is clean.
    }
    return Promise.reject(error);
  }
);

export default api;
