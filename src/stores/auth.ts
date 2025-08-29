import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  
  login: async (email, password) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ 
        user: data.user as User,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to login',
        loading: false 
      });
    }
  },
  
  logout: async () => {
    try {
      set({ loading: true });
      await supabase.auth.signOut();
      set({ user: null, loading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to logout',
        loading: false 
      });
    }
  }
}));

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({ 
    user: session?.user as User || null,
    loading: false 
  });
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ 
    user: session?.user as User || null,
    loading: false 
  });
});

export default useAuthStore;