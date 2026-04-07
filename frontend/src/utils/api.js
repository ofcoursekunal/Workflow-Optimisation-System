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

export default api;
