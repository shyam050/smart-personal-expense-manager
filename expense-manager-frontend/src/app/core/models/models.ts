export interface User {
  userId: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME';

export interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

export interface CategoryRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: number;
  title: string;
  description?: string;
  amount: number;
  type: TransactionType;
  transactionDate: string;
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt: string;
}

export interface TransactionRequest {
  title: string;
  description?: string;
  amount: number;
  type: TransactionType;
  transactionDate: string;
  categoryId?: number;
}

export interface PagedResponse<T> {
  transactions: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MonthlyData {
  year: number;
  month: number;
  monthLabel: string;
  income: number;
  expense: number;
}

export interface CategoryData {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface Dashboard {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  monthlyTrend: MonthlyData[];
  categoryBreakdown: CategoryData[];
}
