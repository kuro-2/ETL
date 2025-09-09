import React, { memo, useMemo } from 'react';
import { 
  Users, 
  LogOut,
  School,
  Database
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar = memo(({ currentPage, onPageChange }: SidebarProps) => {
  const { user } = useAuth();
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
  
  // Check if user has super_admin role
  // const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  
  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => [
    { id: 'onboarding', icon: School, label: 'School Onboarding' },
    { id: 'auth', icon: Users, label: 'User Management' }
  ], []);

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-8">
        <Database className="h-8 w-8 text-indigo-600" />
        <h1 className="text-xl font-bold text-gray-900">School Setup</h1>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors",
                  currentPage === item.id ? "bg-indigo-50 text-indigo-700" : ""
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5",
                  currentPage === item.id ? "text-indigo-600" : ""
                )} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Sign Out Button at the bottom */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;