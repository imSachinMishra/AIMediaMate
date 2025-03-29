import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

// Single request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ensure API prefix
  if (!config.url?.startsWith('/api/')) {
    config.url = `/api${config.url}`;
  }
  
  console.log('Request:', {
    method: config.method,
    url: config.url,
    hasData: !!config.data
  });
  
  return config;
});

// Single response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('application/json')) {
      console.warn(`Non-JSON response received: ${contentType}`);
    }

    if (response.config.url?.includes('/auth/login')) {
      const token = response.data?.token || response.data?.accessToken;
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('isAuthenticated', 'true');
      }
    }
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAuthenticated');
    }
    return Promise.reject(error);
  }
);

export type ApiError = {
  message: string;
  status: number;
};

export default apiClient;
