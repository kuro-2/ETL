import { User } from '@supabase/supabase-js';

export interface StatusMessage {
  type: 'success' | 'error';
  message: string;
  details?: string[];
}

export interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface BulkCreateResult {
  email: string;
  success: boolean;
  userId?: string;
  password?: string;
  error?: string;
}

export interface CsvData {
  [key: string]: string;
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  similarity: number;
}

export interface AuthContextProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  status: StatusMessage | null;
  setStatus: (status: StatusMessage | null) => void;
}