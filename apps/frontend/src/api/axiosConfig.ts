import axios from 'axios';

import { sessionService } from '../services/sessionService';

// Create axios instance
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enable sending cookies with requests
});

// Add request interceptor to automatically include authentication headers
apiClient.interceptors.request.use(
  async (config) => {
    // Try to get token and user from localStorage (from HybridAuthContext)
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // Add Authorization header if token exists
    if (storedToken && storedToken !== 'mock.jwt.token') {
      config.headers['Authorization'] = `Bearer ${storedToken}`;
    }

    // Add user ID and email headers for mock mode or as fallback
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.id) {
          config.headers['x-user-id'] = user.id;
        }
        if (user.email) {
          config.headers['x-user-email'] = user.email;
        }
      } catch (error) {
        console.warn('Failed to parse stored user:', error);
      }
    }

    return config;
  },
  (_error) => {
    return Promise.reject(_error);
  }
);

export function setupAuthErrorInterceptor(
  onAuthError: (_error: string, _status?: number) => void
) {
  const interceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message || error.response.statusText;

        if (status === 403) {
          const errorMsg = message || 'Access denied: user account is inactive';
          onAuthError(errorMsg, status);
          error.message = errorMsg;
        } else if (status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Only try refreshing if we are in an authenticated context
            // and have a refresh token
            const hasRefreshToken =
              localStorage.getItem('refreshToken') ||
              sessionStorage.getItem('refreshToken');

            if (hasRefreshToken) {
              const success = await sessionService.refreshToken();
              if (success) {
                const storedToken = localStorage.getItem('token');
                if (storedToken && storedToken !== 'mock.jwt.token') {
                  originalRequest.headers['Authorization'] =
                    `Bearer ${storedToken}`;
                }
                return apiClient(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error(
              'Auto-refresh failed during interceptor:',
              refreshError
            );
          }

          const errorMsg =
            message || 'Unauthorized: user not found or authentication failed';
          onAuthError(errorMsg, status);
          error.message = errorMsg;
        } else if (status === 401) {
          // If we already tried retrying or failed refreshing, notify
          const errorMsg =
            message || 'Unauthorized: session expired or authentication failed';
          onAuthError(errorMsg, status);
          error.message = errorMsg;
        } else {
          error.message = message || `Request failed with status ${status}`;
        }
      } else if (error.request) {
        error.message = 'No response from server';
      } else {
        error.message = error.message || 'An error occurred';
      }

      return Promise.reject(error);
    }
  );

  return () => {
    apiClient.interceptors.response.eject(interceptorId);
  };
}

export default apiClient;
