import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Audit, AuditFinding } from '../types';

interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  auditType?: string;
  riskRating?: string;
}

export const auditService = {
  list: (params?: AuditListParams) =>
    apiClient.get<PaginatedResponse<Audit>>('/audits', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Audit>>(`/audits/${id}`).then(r => r.data),

  create: (data: Partial<Audit>) =>
    apiClient.post<ApiResponse<Audit>>('/audits', data).then(r => r.data),

  update: (id: string, data: Partial<Audit>) =>
    apiClient.put<ApiResponse<Audit>>(`/audits/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/audits/${id}`).then(r => r.data),

  getFindings: (id: string) =>
    apiClient.get<ApiResponse<AuditFinding[]>>(`/audits/${id}/findings`).then(r => r.data),

  addFinding: (id: string, data: Partial<AuditFinding>) =>
    apiClient.post<ApiResponse<AuditFinding>>(`/audits/${id}/findings`, data).then(r => r.data),

  updateFinding: (auditId: string, findingId: string, data: Partial<AuditFinding>) =>
    apiClient.put<ApiResponse<AuditFinding>>(`/audits/${auditId}/findings/${findingId}`, data).then(r => r.data),

  deleteFinding: (auditId: string, findingId: string) =>
    apiClient.delete<ApiResponse<null>>(`/audits/${auditId}/findings/${findingId}`).then(r => r.data),
};
