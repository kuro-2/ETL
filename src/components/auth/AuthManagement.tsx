import React, { useState } from 'react';
import { CreateUser } from './components/CreateUser';
import { BulkUserCreation } from './components/BulkUserCreation';
import { PasswordReset } from './components/PasswordReset';
import { StatusMessage } from './components/StatusMessage';
import { UserPlus, Users, Key, ChevronDown } from 'lucide-react';
import type { StatusMessage as StatusMessageType } from './types';

function AuthManagement() {
  const [status, setStatus] = useState<StatusMessageType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authContext = {
    isLoading,
    setIsLoading,
    status,
    setStatus
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">User Management</h2>

      <div className="space-y-4">
        {/* Create User */}
        <details className="group bg-white rounded-lg shadow-sm" open>
          <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Create Single User</h3>
            <ChevronDown className="h-5 w-5 text-gray-500 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6">
            <CreateUser {...authContext} />
          </div>
        </details>

        {/* Bulk Create Users */}
        <details className="group bg-white rounded-lg shadow-sm">
          <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Bulk Create Users</h3>
            <ChevronDown className="h-5 w-5 text-gray-500 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6">
            <BulkUserCreation {...authContext} />
          </div>
        </details>

        {/* Password Reset */}
        <details className="group bg-white rounded-lg shadow-sm">
          <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none">
            <Key className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Password Reset</h3>
            <ChevronDown className="h-5 w-5 text-gray-500 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-6 pb-6">
            <PasswordReset {...authContext} />
          </div>
        </details>

        {/* Status Messages */}
        {status && (
          <div className="mt-6">
            <StatusMessage status={status} />
          </div>
        )}
      </div>
    </div>
  );
}

export { AuthManagement };