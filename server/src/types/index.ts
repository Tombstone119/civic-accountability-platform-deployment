// Type definitions for the server application
import { UserRole } from '../utils/enums';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  title: string;
  description: string;
  vendor: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  category: string;
  status: 'active' | 'completed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface SpendingRecord {
  id: string;
  department: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  fiscalYear: number;
  createdAt: Date;
}

export interface SpendingSummary {
  totalAmount: number;
  totalRecords: number;
  byDepartment: Record<string, number>;
  byCategory: Record<string, number>;
  fiscalYear?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
