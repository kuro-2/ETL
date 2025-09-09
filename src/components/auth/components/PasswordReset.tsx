import React from 'react';
import { Mail, Key, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AuthContextProps } from '../types';

interface PasswordResetProps extends AuthContextProps {}

export function PasswordReset({ isLoading, setIsLoading, setStatus }: PasswordResetProps) {
  const [resetEmail, setResetEmail] = React.useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setStatus({
        type: 'success',
        message: `Password reset email sent to ${resetEmail}`
      });
      setResetEmail('');
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error.message || 'Failed to send password reset email'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Password Reset</h3>
      </div>
      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="reset-email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="user@example.com"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !resetEmail}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>
    </div>
  );
}