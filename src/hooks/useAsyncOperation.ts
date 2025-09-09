import { useState, useCallback } from 'react';
import type { LoadingState, ApiResponse } from '../types/common';

interface UseAsyncOperationOptions {
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

interface AsyncOperationState extends LoadingState {
  retryCount: number;
  canRetry: boolean;
}

export function useAsyncOperation<T = unknown>(
  operation: () => Promise<ApiResponse<T>>,
  options: UseAsyncOperationOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    canRetry: true,
    lastFetch: undefined
  });

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result = await operation();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
          retryCount: 0,
          lastFetch: new Date()
        }));
        
        if (onSuccess && result.data) {
          onSuccess(result.data);
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Operation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        canRetry: prev.retryCount < maxRetries
      }));
      
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    }
  }, [operation, maxRetries, onSuccess, onError]);

  const retry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      return;
    }

    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));

    // Add delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (state.retryCount + 1)));
    }

    return execute();
  }, [execute, maxRetries, retryDelay, state.retryCount]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      canRetry: true,
      lastFetch: undefined
    });
  }, []);

  return {
    ...state,
    execute,
    retry,
    reset
  };
}

// Hook for simple async operations without complex retry logic
export function useSimpleAsync<T = unknown>() {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null
  });

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState({ isLoading: true, error: null });
    
    try {
      const result = await asyncFn();
      setState({ isLoading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ isLoading: false, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}