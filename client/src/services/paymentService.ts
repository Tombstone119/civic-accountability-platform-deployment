import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Payment } from '../types';

interface PaymentListParams {
  page?: number;
  limit?: number;
  contract?: string;
  status?: string;
  paymentType?: string;
}

export const paymentService = {
  list: (params?: PaymentListParams) =>
    apiClient.get<PaginatedResponse<Payment>>('/payments', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Payment>>(`/payments/${id}`).then(r => r.data),

  create: (data: Partial<Payment>) =>
    apiClient.post<ApiResponse<Payment>>('/payments', data).then(r => r.data),

  update: (id: string, data: Partial<Payment>) =>
    apiClient.put<ApiResponse<Payment>>(`/payments/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/payments/${id}`).then(r => r.data),
};
