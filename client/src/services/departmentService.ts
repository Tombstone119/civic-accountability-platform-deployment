import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Department } from '../types';

interface DepartmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  fiscalYear?: number;
}

export const departmentService = {
  list: (params?: DepartmentListParams) =>
    apiClient.get<PaginatedResponse<Department>>('/departments', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Department>>(`/departments/${id}`).then(r => r.data),

  create: (data: Partial<Department>) =>
    apiClient.post<ApiResponse<Department>>('/departments', data).then(r => r.data),

  update: (id: string, data: Partial<Department>) =>
    apiClient.put<ApiResponse<Department>>(`/departments/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/departments/${id}`).then(r => r.data),
};
