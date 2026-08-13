import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 second timeout
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('LITTORA_token');
  if (!token) {
    console.warn('[API] No authentication token found in localStorage');
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, {
    hasAuth: !!token,
    payload: config.data ? Object.keys(config.data) : 'none'
  });
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[API] ${error.response.status} Error:`, {
        url: error.config.url,
        status: error.response.status,
        message: error.response.data?.message || 'Unknown error',
        data: error.response.data
      });
      
      // Handle 401 - redirect to login
      if (error.response.status === 401) {
        localStorage.removeItem('LITTORA_token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      console.error('[API] No response received:', {
        url: error.config?.url,
        message: 'Failed to connect to backend - ensure server is running on http://localhost:5001'
      });
    } else {
      console.error('[API] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default client;
