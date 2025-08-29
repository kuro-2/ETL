import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, Trash2, Mail, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
import { useFormCache } from '../../hooks/useFormCache';

interface SchoolAdmin {
  admin_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_id: string;
  admin_user_type: 'school_admin';
}

interface AdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface AdminsStepProps {
  data: SchoolAdmin[];
  onUpdate: (data: SchoolAdmin[]) => void;
}

export default function AdminsStep({ data, onUpdate }: AdminsStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('admins', data);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AdminFormData>();

  const handleBulkImport = (importedData: any[]) => {
    try {
      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      const invalidEmails = importedData.filter(row => !emailRegex.test(row.email));
      if (invalidEmails.length > 0) {
        setError(`Invalid email format found in rows: ${invalidEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Check for duplicate emails
      const existingEmails = new Set(cachedData.map(admin => admin.email));
      const duplicateEmails = importedData.filter(row => existingEmails.has(row.email));
      if (duplicateEmails.length > 0) {
        setError(`Duplicate emails found: ${duplicateEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Transform imported data to match SchoolAdmin interface
      const newAdmins: SchoolAdmin[] = importedData.map(row => ({
        admin_user_id: '', // Will be set by backend
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        phone: row.phone,
        school_id: '', // Will be set by backend
        admin_user_type: 'school_admin'
      }));

      const updatedData = [...cachedData, ...newAdmins];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
    } catch (err: any) {
      setError(`Failed to import administrators: ${err.message}`);
    }
  };

  const onSubmit = (formData: AdminFormData) => {
    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    // Check for duplicate email
    if (cachedData.some(admin => admin.email === formData.email)) {
      setError('An admin with this email already exists');
      return;
    }

    const newAdmin: SchoolAdmin = {
      admin_user_id: '', // Will be set by backend
      ...formData,
      school_id: '', // Will be set by backend
      admin_user_type: 'school_admin'
    };

    const updatedData = [...cachedData, newAdmin];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset();
    setError(null);
  };

  const removeAdmin = (email: string) => {
    const updatedData = cachedData.filter(admin => admin.email !== email);
    onUpdate(updatedData);
    setCachedData(updatedData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">School Administrators</h2>
      </div>

      {/* Field Requirements Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Field Requirements</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Required Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• First Name</li>
              <li>• Last Name</li>
              <li>• Email</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Phone Number</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['first_name', 'last_name', 'email']}
          template={{
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890'
          }}
          description="Upload a CSV or Excel file containing administrator information. Required fields are marked with an asterisk (*). Email addresses must be unique."
        />
      </div>

      {/* List of added admins */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Administrators</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((admin, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {admin.first_name} {admin.last_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {admin.email}
                        </div>
                        {admin.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {admin.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAdmin(admin.email)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new admin form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Administrator</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                {...register('first_name', { required: 'First name is required' })}
                className={cn(
                  "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                  errors.first_name && "border-red-300"
                )}
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                {...register('last_name', { required: 'Last name is required' })}
                className={cn(
                  "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                  errors.last_name && "border-red-300"
                )}
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={cn(
                  "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                  errors.email && "border-red-300"
                )}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Administrator
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}