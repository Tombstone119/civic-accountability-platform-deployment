import apiClient from './api';
import type { ApiResponse, PaginatedResponse, User } from '../types';

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export const userService = {
  list: (params?: UserListParams) =>
    apiClient.get<PaginatedResponse<User>>('/users', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/users/${id}`).then(r => r.data),

  create: (data: Partial<User> & { password: string }) =>
    apiClient.post<ApiResponse<User>>('/users', data).then(r => r.data),

  update: (id: string, data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>(`/users/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/users/${id}`).then(r => r.data),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<ApiResponse<User>>('/auth/profile', data).then(r => r.data),
};
