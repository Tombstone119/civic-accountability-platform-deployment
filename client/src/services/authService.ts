import apiClient from './api';
import { User, ApiResponse } from '../types/index';

export const authService = {
  // Login user
  login: async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/login',
      { email, password }
    );
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  // Register new user
  register: async (name: string, email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>(
      '/auth/register',
      { name, email, password }
    );
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response.data;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('token');
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  },
};
