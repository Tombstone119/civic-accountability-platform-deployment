import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Vendor, VendorDocument } from '../types';

interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isBlacklisted?: boolean;
}

export const vendorService = {
  list: (params?: VendorListParams) =>
    apiClient.get<PaginatedResponse<Vendor>>('/vendors', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<Vendor>>(`/vendors/${id}`).then(r => r.data),

  create: (data: Partial<Vendor>) =>
    apiClient.post<ApiResponse<Vendor>>('/vendors', data).then(r => r.data),

  update: (id: string, data: Partial<Vendor>) =>
    apiClient.put<ApiResponse<Vendor>>(`/vendors/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/vendors/${id}`).then(r => r.data),

  removeFromBlacklist: (id: string) =>
    apiClient.delete<ApiResponse<Vendor>>(`/vendors/${id}/blacklist`).then(r => r.data),

  blacklistVendor: (id: string, reason: string) =>
    apiClient.post<ApiResponse<Vendor>>(`/vendors/${id}/blacklist`, { reason }).then(r => r.data),

  getDocuments: (id: string) =>
    apiClient.get<ApiResponse<VendorDocument[]>>(`/vendors/${id}/documents`).then(r => r.data),

  uploadDocument: (vendorId: string, formData: FormData, onUploadProgress?: (pct: number) => void) =>
    apiClient.post<ApiResponse<VendorDocument>>(
      `/vendors/${vendorId}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onUploadProgress
          ? (e) => { if (e.total) onUploadProgress(Math.round((e.loaded * 100) / e.total)); }
          : undefined,
      }
    ).then(r => r.data),

  viewDocumentFile: async (vendorId: string, docId: string): Promise<string> => {
    const response = await apiClient.get(
      `/vendors/${vendorId}/documents/${docId}/file`,
      { responseType: 'blob' }
    );
    return window.URL.createObjectURL(response.data);
  },

  updateDocument: (vendorId: string, docId: string, data: Record<string, unknown>) =>
    apiClient.put<ApiResponse<VendorDocument>>(
      `/vendors/${vendorId}/documents/${docId}`,
      data
    ).then(r => r.data),

  deleteDocument: (vendorId: string, docId: string) =>
    apiClient.delete<ApiResponse<void>>(
      `/vendors/${vendorId}/documents/${docId}`
    ).then(r => r.data),
};
