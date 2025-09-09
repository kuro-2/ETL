import React from 'react';
import { AuthProvider } from './lib/AuthContext';
import { useAuth } from './lib/AuthContext';
import Sidebar from './components/Sidebar';
import { Login } from './components/auth/Login';
import SchoolOnboarding from './pages/SchoolOnboarding';
import { AuthManagement } from './components/auth/AuthManagement';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { session, user, loading } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('onboarding');
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [checkingRole, setCheckingRole] = React.useState(true);

  React.useEffect(() => {
    async function checkSuperAdmin() {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('super_admins')
          .select('super_admin_id')
          .eq('super_admin_id', user.id)
          .single();

        if (error) throw error;
        setIsSuperAdmin(!!data);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }

    checkSuperAdmin();
  }, [user]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 text-center mb-6">
            This application is only accessible to administrators with super_admin privileges.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto p-8">
        {currentPage === 'onboarding' && <SchoolOnboarding />}
        {currentPage === 'auth' && <AuthManagement />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // In production, send to error reporting service
        console.error('Application error:', error, errorInfo);
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;