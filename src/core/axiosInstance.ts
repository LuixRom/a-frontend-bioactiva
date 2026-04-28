import axios from 'axios';
import { getToken, clearToken } from '@/src/core/auth';
import { redirect } from 'next/navigation';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

// Request interceptor to add Authorization header
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearToken();
      // Force redirect to login (client side)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      } else {
        redirect('/auth/login');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
