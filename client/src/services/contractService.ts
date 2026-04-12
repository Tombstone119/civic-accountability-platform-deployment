import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Contract, ContractItem } from '../types';

interface ContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  vendor?: string;
  procurementMethod?: string;
}

export const contractService = {
  list: (params?: ContractListParams) =>
    apiClient.get<PaginatedResponse<Contract>>('/contracts', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`).then(r => r.data),

  create: (data: Partial<Contract>) =>
    apiClient.post<ApiResponse<Contract>>('/contracts', data).then(r => r.data),

  update: (id: string, data: Partial<Contract>) =>
    apiClient.put<ApiResponse<Contract>>(`/contracts/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/contracts/${id}`).then(r => r.data),

  getItems: (id: string) =>
    apiClient.get<ApiResponse<ContractItem[]>>(`/contracts/${id}/items`).then(r => r.data),

  addItem: (id: string, data: Partial<ContractItem>) =>
    apiClient.post<ApiResponse<ContractItem>>(`/contracts/${id}/items`, data).then(r => r.data),
};
