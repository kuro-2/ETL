import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { ApiResponse } from '../types/common';

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface User extends Omit<SupabaseUser, 'user_metadata'> {
  user_metadata: UserMetadata;
}

interface AuthError {
  message: string;
  status?: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<ApiResponse<User>>;
  logout: () => Promise<ApiResponse<void>>;
  clearError: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  
  clearError: () => set({ error: null }),
  
  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const authError: AuthError = {
          message: error.message,
          status: error.status
        };
        set({ error: authError, loading: false });
        return { success: false, error: error.message };
      }
      
      const user = data.user as User;
      set({ user, loading: false });
      return { success: true, data: user };
    } catch (error) {
      const authError: AuthError = {
        message: error instanceof Error ? error.message : 'Failed to login'
      };
      set({ error: authError, loading: false });
      return { success: false, error: authError.message };
    }
  },
  
  logout: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        const authError: AuthError = {
          message: error.message
        };
        set({ error: authError, loading: false });
        return { success: false, error: error.message };
      }
      
      set({ user: null, loading: false });
      return { success: true };
    } catch (error) {
      const authError: AuthError = {
        message: error instanceof Error ? error.message : 'Failed to logout'
      };
      set({ error: authError, loading: false });
      return { success: false, error: authError.message };
    }
  }
}));

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({ 
    user: session?.user as User | null,
    loading: false 
  });
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ 
    user: session?.user as User | null,
    loading: false,
    error: null // Clear any existing errors on auth state change
  });
});

export default useAuthStore;