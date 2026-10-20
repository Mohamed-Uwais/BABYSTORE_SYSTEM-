import axios from 'axios';
import { protectCheckout, deduplicateReads } from './requestSafety';

const client = axios.create({ baseURL: '/api', timeout: 30000 });
client.interceptors.request.use(config => {
  const token = localStorage.getItem('LITTORA_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(response => response, error => {
  // Login failures belong to the login form. Session expiration is handled without
  // reloading the page. Temporary service failures never expire the session.
  if (error.response?.status === 401 && error.config?.url !== '/auth/login' && error.config?.headers?.Authorization === `Bearer ${localStorage.getItem('LITTORA_token')}`) {
    localStorage.removeItem('LITTORA_token');
    window.dispatchEvent(new Event('littora:session-expired'));
  }
  return Promise.reject(error);
});
protectCheckout(client, '/orders/checkout');
deduplicateReads(client, () => localStorage.getItem('LITTORA_token'));
export default client;
