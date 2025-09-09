// Common types used across the application

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  isDirty: boolean;
  isValid: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastFetch?: Date;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface FileUploadResult {
  success: boolean;
  fileName?: string;
  data?: unknown[];
  errors?: string[];
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  similarity: number;
  matched: boolean;
  manual: boolean;
}

export interface BulkOperationResult<T = unknown> {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    data?: T;
  }>;
}