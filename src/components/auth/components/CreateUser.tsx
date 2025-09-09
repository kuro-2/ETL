import React from 'react';
import { Mail, Lock, User, UserPlus, RefreshCw } from 'lucide-react';
import { supabaseAdmin } from '../../../lib/supabase';
import { CreateUserForm, AuthContextProps } from '../types';
import { ROLES } from '../constants';

interface CreateUserProps extends AuthContextProps {}

export function CreateUser({ isLoading, setIsLoading, setStatus }: CreateUserProps) {
  const [createUserForm, setCreateUserForm] = React.useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: '',
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createUserForm.password !== createUserForm.confirmPassword) {
      setStatus({
        type: 'error',
        message: 'Passwords do not match'
      });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      // Create auth user with admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: createUserForm.email,
        password: createUserForm.password,
        email_confirm: true,
        user_metadata: {
          first_name: createUserForm.firstName,
          last_name: createUserForm.lastName,
          role: createUserForm.role
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }

      // Insert into users table
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: createUserForm.email,
          first_name: createUserForm.firstName,
          last_name: createUserForm.lastName,
          user_type: createUserForm.role.toLowerCase().replace(' ', '_')
        });

      if (userError) throw userError;

      // Insert into role-specific table based on role
      const role = createUserForm.role;
      if (role === 'Student') {
        const { error: studentError } = await supabaseAdmin
          .from('students')
          .insert({
            student_id: authData.user.id,
            first_name: createUserForm.firstName,
            last_name: createUserForm.lastName,
            grade_level: 'Ungraded' // Default grade level
          });
        if (studentError) throw studentError;
      } else if (role === 'Teacher') {
        const { error: teacherError } = await supabaseAdmin
          .from('teachers')
          .insert({
            teacher_id: authData.user.id,
            first_name: createUserForm.firstName,
            last_name: createUserForm.lastName
          });
        if (teacherError) throw teacherError;
      } else if (role === 'School Admin') {
        const { error: adminError } = await supabaseAdmin
          .from('admin_users')
          .insert({
            admin_user_id: authData.user.id,
            first_name: createUserForm.firstName,
            last_name: createUserForm.lastName,
            email: createUserForm.email,
            admin_user_type: 'school_admin'
          });
        if (adminError) throw adminError;
      } else if (role === 'District Admin') {
        const { error: adminError } = await supabaseAdmin
          .from('admin_users')
          .insert({
            admin_user_id: authData.user.id,
            first_name: createUserForm.firstName,
            last_name: createUserForm.lastName,
            email: createUserForm.email,
            admin_user_type: 'district_admin'
          });
        if (adminError) throw adminError;
      }

      // Create file content
      const fileContent = `Email: ${createUserForm.email}
First Name: ${createUserForm.firstName}
Last Name: ${createUserForm.lastName}
Password: ${createUserForm.password}`;

      // Create file download
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user_credentials_${createUserForm.email}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: `User created successfully: ${createUserForm.email}`
      });
      
      setCreateUserForm({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        role: '',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to create user'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Create User</h3>
      </div>
      <form onSubmit={handleCreateUser} className="space-y-4">
        <div>
          <label htmlFor="create-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="create-email"
              value={createUserForm.email}
              onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="user@example.com"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="first-name"
              value={createUserForm.firstName}
              onChange={(e) => setCreateUserForm(prev => ({ ...prev, firstName: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="John"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="last-name"
              value={createUserForm.lastName}
              onChange={(e) => setCreateUserForm(prev => ({ ...prev, lastName: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Doe"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            value={createUserForm.role}
            onChange={(e) => setCreateUserForm(prev => ({ ...prev, role: e.target.value }))}
            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          >
            <option value="">Select a role...</option>
            {ROLES.map(role => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="create-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="create-password"
              value={createUserForm.password}
              onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="confirm-password"
              value={createUserForm.confirmPassword}
              onChange={(e) => setCreateUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !createUserForm.email || !createUserForm.password || !createUserForm.confirmPassword || !createUserForm.role}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            'Create User'
          )}
        </button>
      </form>
    </div>
  );
}