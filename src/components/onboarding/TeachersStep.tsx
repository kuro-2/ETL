import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { GraduationCap, Plus, Trash2, Mail, Phone, Award, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
import { useFormCache } from '../../hooks/useFormCache';

interface Teacher {
  teacher_id: string;
  school_teacher_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'teacher';
  dob?: string;
  qualification1?: string;
  qualification2?: string;
  qualification3?: string;
  certification1?: string;
  certification2?: string;
  certification3?: string;
}

interface TeacherFormData {
  school_teacher_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  dob?: string;
  qualification1?: string;
  qualification2?: string;
  qualification3?: string;
  certification1?: string;
  certification2?: string;
  certification3?: string;
}

interface TeachersStepProps {
  data: Teacher[];
  onUpdate: (data: Teacher[]) => void;
}

export default function TeachersStep({ data, onUpdate }: TeachersStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('teachers', data);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TeacherFormData>();

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
      const existingEmails = new Set(cachedData.map(t => t.email));
      const duplicateEmails = importedData.filter(row => existingEmails.has(row.email));
      if (duplicateEmails.length > 0) {
        setError(`Duplicate emails found: ${duplicateEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Transform imported data to match Teacher interface
      const newTeachers: Teacher[] = importedData.map(row => ({
        teacher_id: '', // Will be set by backend
        school_teacher_id: row.school_teacher_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        user_type: 'teacher',
        dob: row.dob,
        qualification1: row.qualification1,
        qualification2: row.qualification2,
        qualification3: row.qualification3,
        certification1: row.certification1,
        certification2: row.certification2,
        certification3: row.certification3
      }));

      // Check for duplicate school IDs if provided
      const existingIds = new Set(cachedData.map(t => t.school_teacher_id).filter(Boolean));
      const duplicates = newTeachers.filter(t => t.school_teacher_id && existingIds.has(t.school_teacher_id));
      if (duplicates.length > 0) {
        setError(`Duplicate school teacher IDs found: ${duplicates.map(t => t.school_teacher_id).join(', ')}`);
        return;
      }

      const updatedData = [...cachedData, ...newTeachers];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
    } catch (err: any) {
      setError(`Failed to import teachers: ${err.message}`);
    }
  };

  const onSubmit = (formData: TeacherFormData) => {
    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    // Check for duplicate email
    if (cachedData.some(teacher => teacher.email === formData.email)) {
      setError('A teacher with this email already exists');
      return;
    }

    // Check for duplicate school teacher ID if provided
    if (formData.school_teacher_id && 
        cachedData.some(teacher => teacher.school_teacher_id === formData.school_teacher_id)) {
      setError('A teacher with this school ID already exists');
      return;
    }

    const newTeacher: Teacher = {
      teacher_id: '', // Will be set by backend
      ...formData,
      user_type: 'teacher'
    };

    const updatedData = [...cachedData, newTeacher];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset();
    setError(null);
  };

  const removeTeacher = (index: number) => {
    const newTeachers = [...cachedData];
    newTeachers.splice(index, 1);
    onUpdate(newTeachers);
    setCachedData(newTeachers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
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
              <li>• School Teacher ID</li>
              <li>• Date of Birth</li>
              <li>• Qualifications (up to 3)</li>
              <li>• Certifications (up to 3)</li>
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
            school_teacher_id: 'T123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            dob: '1980-01-01',
            qualification1: 'B.Ed',
            qualification2: 'M.Ed',
            qualification3: 'Ph.D',
            certification1: 'Teaching License',
            certification2: 'Special Education',
            certification3: 'ESL'
          }}
          description="Upload a CSV or Excel file containing teacher information. Required fields are marked with an asterisk (*). Email and School Teacher ID must be unique if provided."
        />
      </div>

      {/* List of added teachers */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Teachers</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((teacher, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {teacher.email}
                        </div>
                        {teacher.school_teacher_id && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            ID: {teacher.school_teacher_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeTeacher(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new teacher form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Teacher</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                School Teacher ID
              </label>
              <input
                type="text"
                {...register('school_teacher_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

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
              Date of Birth
            </label>
            <input
              type="date"
              {...register('dob')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Qualifications</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Qualification 1
                </label>
                <input
                  type="text"
                  {...register('qualification1')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., B.Ed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Qualification 2
                </label>
                <input
                  type="text"
                  {...register('qualification2')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., M.Ed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Qualification 3
                </label>
                <input
                  type="text"
                  {...register('qualification3')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Ph.D"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Certifications</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Certification 1
                </label>
                <input
                  type="text"
                  {...register('certification1')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Teaching License"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Certification 2
                </label>
                <input
                  type="text"
                  {...register('certification2')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Special Education"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Certification 3
                </label>
                <input
                  type="text"
                  {...register('certification3')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., ESL"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Teacher
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}