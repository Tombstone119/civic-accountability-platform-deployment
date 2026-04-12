import apiClient from './api';
import type { ApiResponse, PaginatedResponse, PublicRecord, PublicComment, SpendingSummary } from '../types';

interface PublicRecordListParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
}

export const publicService = {
  listRecords: (params?: PublicRecordListParams) =>
    apiClient.get<PaginatedResponse<PublicRecord>>('/public/records', { params }).then(r => r.data),

  getRecord: (id: string) =>
    apiClient.get<ApiResponse<PublicRecord>>(`/public/records/${id}`).then(r => r.data),

  getComments: (recordId: string) =>
    apiClient.get<ApiResponse<PublicComment[]>>(`/public/records/${recordId}/comments`).then(r => r.data),

  addComment: (recordId: string, data: Partial<PublicComment>) =>
    apiClient.post<ApiResponse<PublicComment>>(`/public/records/${recordId}/comments`, data).then(r => r.data),

  moderateComment: (commentId: string, status: 'approved' | 'rejected') =>
    apiClient.put<ApiResponse<PublicComment>>(`/public/comments/${commentId}`, { status }).then(r => r.data),

  listComments: (params?: { page?: number; limit?: number; status?: string; isFlagged?: boolean }) =>
    apiClient.get<PaginatedResponse<PublicComment>>('/public/comments', { params }).then(r => r.data),

  getSpendingSummaries: () =>
    apiClient.get<{ success: boolean; data: SpendingSummary[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>('/spending').then(r => r.data),

  refreshSpending: (fiscalYear?: number) =>
    apiClient.post<ApiResponse<unknown>>('/spending/refresh-summary', { fiscalYear: fiscalYear ?? new Date().getFullYear() }).then(r => r.data),

  getOverview: () =>
    apiClient.get<ApiResponse<{
      stats: { totalRecords: number; totalValue: number; departmentCount: number; auditCount: number };
      departments: Array<{ _id: string; name: string; code: string; budget: number; fiscalYear: number; description?: string }>;
      spendingSummaries: SpendingSummary[];
      recentAudits: Array<{ _id: string; auditNumber: string; title: string; status: string; riskRating: string; auditType: string; startDate: string; complianceOutcome: string }>;
      auditBreakdown: { byRisk: Record<string, number>; byStatus: Record<string, number> };
    }>>('/public/overview').then(r => r.data),

  getCurrencies: () =>
    apiClient.get<ApiResponse<Record<string, string>>>('/public/currencies').then(r => r.data),

  convertCurrency: (recordId: string, to: string, from?: string) =>
    apiClient.get<ApiResponse<{ amount: number; rate: number; from: string; to: string; rateDate: string }>>(
      `/public/records/${recordId}/convert`, { params: { to, from } }
    ).then(r => r.data),
};
