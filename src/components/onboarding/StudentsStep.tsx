import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, Trash2, Mail, Phone, GraduationCap, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
import { useFormCache } from '../../hooks/useFormCache';

interface Student {
  student_id: string;
  school_student_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: 'student';
  dob?: string;
  enrollment_date?: string;
  graduation_year?: number;
  current_gpa?: number;
  academic_status?: string;
  grade_level: string;
  gender?: string;
  ethnicity?: string;
  state_id?: string;
  guardian1_name?: string;
  guardian1_email?: string;
  guardian1_relationship?: string;
  guardian2_name?: string;
  guardian2_email?: string;
  guardian2_relationship?: string;
}

interface StudentsStepProps {
  data: Student[];
  onUpdate: (data: Student[]) => void;
}

interface StudentFormData {
  school_student_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  dob?: string;
  enrollment_date?: string;
  graduation_year?: number;
  current_gpa?: number;
  academic_status?: string;
  grade_level: string;
  gender?: string;
  ethnicity?: string;
  state_id?: string;
  guardian1_name?: string;
  guardian1_email?: string;
  guardian1_relationship?: string;
  guardian2_name?: string;
  guardian2_email?: string;
  guardian2_relationship?: string;
}

const GRADE_LEVELS = [
  'PK3', 'PK4', 'PK5', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  'PostGraduate', 'Ungraded', 'Other'
];

const ACADEMIC_STATUSES = ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'];

export default function StudentsStep({ data, onUpdate }: StudentsStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [showGuardian2, setShowGuardian2] = useState(false);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('students', data);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<StudentFormData>({
    defaultValues: {
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_status: 'active',
      grade_level: 'Ungraded'
    }
  });

  const handleBulkImport = (importedData: any[]) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const invalidEmails = importedData.filter(row => !emailRegex.test(row.email));
      if (invalidEmails.length > 0) {
        setError(`Invalid email format found in rows: ${invalidEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Check for duplicate emails
      const existingEmails = new Set(cachedData.map(student => student.email));
      const duplicateEmails = importedData.filter(row => existingEmails.has(row.email));
      if (duplicateEmails.length > 0) {
        setError(`Duplicate emails found: ${duplicateEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Transform imported data to match Student interface
      const newStudents: Student[] = importedData.map(row => ({
        student_id: '', // Will be set by backend
        school_student_id: row.school_student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        user_type: 'student',
        dob: row.dob,
        enrollment_date: row.enrollment_date,
        graduation_year: row.graduation_year,
        current_gpa: row.current_gpa,
        academic_status: row.academic_status || 'active',
        grade_level: row.grade_level || 'Ungraded',
        gender: row.gender,
        ethnicity: row.ethnicity,
        state_id: row.state_id,
        guardian1_name: row.guardian1_name,
        guardian1_email: row.guardian1_email,
        guardian1_relationship: row.guardian1_relationship,
        guardian2_name: row.guardian2_name,
        guardian2_email: row.guardian2_email,
        guardian2_relationship: row.guardian2_relationship
      }));

      const updatedData = [...cachedData, ...newStudents];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
    } catch (err: any) {
      setError(`Failed to import students: ${err.message}`);
    }
  };

  const onSubmit = (formData: StudentFormData) => {
    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }

    // Check for duplicate email
    if (cachedData.some(student => student.email === formData.email)) {
      setError('A student with this email already exists');
      return;
    }

    // Check for duplicate school student ID if provided
    if (formData.school_student_id && 
        cachedData.some(student => student.school_student_id === formData.school_student_id)) {
      setError('A student with this school ID already exists');
      return;
    }

    // Validate guardian email format if provided
    if (formData.guardian1_email && !emailRegex.test(formData.guardian1_email)) {
      setError('Invalid guardian 1 email format');
      return;
    }
    if (formData.guardian2_email && !emailRegex.test(formData.guardian2_email)) {
      setError('Invalid guardian 2 email format');
      return;
    }

    const newStudent: Student = {
      student_id: '', // Will be set by backend
      ...formData,
      user_type: 'student'
    };

    const updatedData = [...cachedData, newStudent];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset({
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_status: 'active',
      grade_level: 'Ungraded'
    });
    setError(null);
    setShowGuardian2(false);
  };

  const removeStudent = (index: number) => {
    const newStudents = [...cachedData];
    newStudents.splice(index, 1);
    onUpdate(newStudents);
    setCachedData(newStudents);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
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
              <li>• Grade Level</li>
              <li>• Academic Status</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• School Student ID</li>
              <li>• State ID</li>
              <li>• Date of Birth</li>
              <li>• Gender</li>
              <li>• Ethnicity</li>
              <li>• Guardian Information</li>
              <li>• Current GPA</li>
              <li>• Graduation Year</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['first_name', 'last_name', 'email', 'grade_level']}
          template={{
            school_student_id: 'S123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            grade_level: '9',
            academic_status: 'active',
            dob: '2010-01-01',
            gender: 'male',
            ethnicity: 'Not specified',
            state_id: 'ST123',
            guardian1_name: 'Jane Doe',
            guardian1_email: 'jane.doe@example.com',
            guardian1_relationship: 'Mother'
          }}
          description="Upload a CSV or Excel file containing student information. Required fields are marked with an asterisk (*). Email and School Student ID must be unique if provided."
        />
      </div>

      {/* List of added students */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Students</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((student, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.first_name} {student.last_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {student.email}
                        </div>
                        {student.school_student_id && (
                          <div className="flex items-center gap-1">
                            <UserPlus className="h-4 w-4" />
                            ID: {student.school_student_id}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          Grade: {student.grade_level}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStudent(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new student form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Student</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  School Student ID
                </label>
                <input
                  type="text"
                  {...register('school_student_id')}
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

            <div className="grid grid-cols-3 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Academic Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grade Level *
                </label>
                <select
                  {...register('grade_level', { required: 'Grade level is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.grade_level && "border-red-300"
                  )}
                >
                  {GRADE_LEVELS.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
                {errors.grade_level && (
                  <p className="mt-1 text-sm text-red-600">{errors.grade_level.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Academic Status
                </label>
                <select
                  {...register('academic_status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {ACADEMIC_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current GPA
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  {...register('current_gpa', {
                    min: { value: 0, message: 'GPA must be at least 0' },
                    max: { value: 4, message: 'GPA cannot exceed 4' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Enrollment Date
                </label>
                <input
                  type="date"
                  {...register('enrollment_date')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Graduation Year
                </label>
                <input
                  type="number"
                  {...register('graduation_year', {
                    min: { value: 2000, message: 'Invalid graduation year' },
                    max: { value: 2100, message: 'Invalid graduation year' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State ID
                </label>
                <input
                  type="text"
                  {...register('state_id')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Guardian 1 Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Primary Guardian Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Guardian Name
                </label>
                <input
                  type="text"
                  {...register('guardian1_name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Guardian Email
                </label>
                <input
                  type="email"
                  {...register('guardian1_email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <input
                  type="text"
                  {...register('guardian1_relationship')}
                  placeholder="e.g., Mother, Father"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Guardian 2 Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Secondary Guardian Information</h4>
              <button
                type="button"
                onClick={() => setShowGuardian2(!showGuardian2)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showGuardian2 ? 'Hide' : 'Add Secondary Guardian'}
              </button>
            </div>

            {showGuardian2 && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    {...register('guardian2_name')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    {...register('guardian2_email')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Relationship
                  </label>
                  <input
                    type="text"
                    {...register('guardian2_relationship')}
                    placeholder="e.g., Mother, Father"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}
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
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}