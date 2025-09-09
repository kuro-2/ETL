import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, Trash2, Mail, GraduationCap, UserPlus, Heart, AlertCircle, BookOpen } from 'lucide-react';
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
  // Address fields for users table
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  // Guardian information
  guardian1_name?: string;
  guardian1_email?: string;
  guardian1_relationship?: string;
  guardian2_name?: string;
  guardian2_email?: string;
  guardian2_relationship?: string;
  // Individualized needs fields
  has_iep?: boolean;
  is_economically_disadvantaged?: boolean;
  individualized_notes?: string;
}

interface IndividualizedNeed {
  need_id: string;
  student_id: string;
  type: string;
  details: {
    status?: string;
    spec_ed_status?: string;
    spec_ed?: string;
    home_language?: string;
    has_active_iep?: boolean;
    ell_active?: boolean;
    additional_notes?: string;
  };
}

interface CombinedStepProps {
  studentData: Student[];
  needsData: IndividualizedNeed[];
  onStudentsUpdate: (data: Student[]) => void;
  onNeedsUpdate: (data: IndividualizedNeed[]) => void;
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
  // Address fields
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  // Guardian information
  guardian1_name?: string;
  guardian1_email?: string;
  guardian1_relationship?: string;
  guardian2_name?: string;
  guardian2_email?: string;
  guardian2_relationship?: string;
  // Individualized needs fields
  has_iep?: boolean;
  is_economically_disadvantaged?: boolean;
  individualized_notes?: string;
  // For individualized needs form
  spec_ed_status?: string;
  spec_ed?: string;
  home_language?: string;
  has_active_iep?: boolean;
  ell_active?: boolean;
}

const GRADE_LEVELS = [
  'PK3', 'PK4', 'PK5', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  'PostGraduate', 'Ungraded', 'Other'
];

const ACADEMIC_STATUSES = ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'];
const SPEC_ED_STATUSES = ['Active', 'Inactive', 'Pending Evaluation', 'Exited', 'Not Applicable'];
const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 
  'Arabic', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Vietnamese', 'Tagalog', 'Hindi', 'Other'
];

export default function CombinedStudentsStep({ studentData, needsData, onStudentsUpdate, onNeedsUpdate }: CombinedStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [showGuardian2, setShowGuardian2] = useState(false);
  const [showIndividualizedNeeds, setShowIndividualizedNeeds] = useState(false);

  // Use form cache for both students and needs
  const { data: cachedStudentData, setData: setCachedStudentData } = useFormCache('students', studentData);
  const { data: cachedNeedsData, setData: setCachedNeedsData } = useFormCache('individualized_needs', needsData);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<StudentFormData>({
    defaultValues: {
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_status: 'active',
      grade_level: 'Ungraded',
      home_language: 'English'
    }
  });

  const handleBulkImport = (importedData: Record<string, unknown>[]) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const invalidEmails = importedData.filter(row => !emailRegex.test(String(row.email || '')));
      if (invalidEmails.length > 0) {
        setError(`Invalid email format found in rows: ${invalidEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Check for duplicate emails
      const existingEmails = new Set(cachedStudentData.map(student => student.email));
      const duplicateEmails = importedData.filter(row => existingEmails.has(String(row.email || '')));
      if (duplicateEmails.length > 0) {
        setError(`Duplicate emails found: ${duplicateEmails.map(row => row.email).join(', ')}`);
        return;
      }

      // Transform imported data
      const newStudents: Student[] = [];
      const newNeeds: IndividualizedNeed[] = [];

      importedData.forEach(row => {
        // Create student
        const student: Student = {
          student_id: '', // Will be set by backend
          school_student_id: row.school_student_id as string,
          first_name: String(row.first_name),
          last_name: String(row.last_name),
          email: String(row.email),
          user_type: 'student',
          dob: row.dob as string,
          enrollment_date: row.enrollment_date as string,
          graduation_year: row.graduation_year as number,
          current_gpa: row.current_gpa as number,
          academic_status: (row.academic_status as string) || 'active',
          grade_level: (row.grade_level as string) || (row.grade as string) || 'Ungraded',
          gender: row.gender as string,
          ethnicity: row.ethnicity as string,
          state_id: row.state_id as string,
          // Address fields for users table
          street_address: row.street_address as string,
          city: row.city as string,
          state: row.state as string,
          zip: row.zip as string,
          phone: row.phone as string,
          // Guardian information
          guardian1_name: row.guardian1_name as string,
          guardian1_email: row.guardian1_email as string,
          guardian1_relationship: row.guardian1_relationship as string,
          guardian2_name: row.guardian2_name as string,
          guardian2_email: row.guardian2_email as string,
          guardian2_relationship: row.guardian2_relationship as string,
          has_iep: row.has_iep === true || row.iep === 'Y' || row.iep === 'Yes',
          is_economically_disadvantaged: row.is_economically_disadvantaged === true || row.economically_disadvantaged === 'Y' || row.economically_disadvantaged === 'Yes',
          individualized_notes: row.individualized_notes as string
        };

        newStudents.push(student);

        // Create individualized needs if applicable
        if (row.has_iep || row.iep === 'Y' || row.iep === 'Yes') {
          const iepNeed: IndividualizedNeed = {
            need_id: '',
            student_id: '', // Will be linked after student creation
            type: 'Special Education',
            details: {
              status: 'Active',
              spec_ed_status: row.spec_ed_status as string,
              spec_ed: row.spec_ed as string,
              has_active_iep: true,
              additional_notes: row.individualized_notes as string
            }
          };
          newNeeds.push(iepNeed);
        }

        if (row.is_economically_disadvantaged || row.economically_disadvantaged === 'Y' || row.economically_disadvantaged === 'Yes') {
          const economicNeed: IndividualizedNeed = {
            need_id: '',
            student_id: '', // Will be linked after student creation
            type: 'Economically Disadvantaged',
            details: {
              status: 'Active',
              additional_notes: row.individualized_notes as string
            }
          };
          newNeeds.push(economicNeed);
        }
      });

      const updatedStudentData = [...cachedStudentData, ...newStudents];
      const updatedNeedsData = [...cachedNeedsData, ...newNeeds];
      
      onStudentsUpdate(updatedStudentData);
      onNeedsUpdate(updatedNeedsData);
      setCachedStudentData(updatedStudentData);
      setCachedNeedsData(updatedNeedsData);
      setError(null);
    } catch (err: unknown) {
      setError(`Failed to import data: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    if (cachedStudentData.some(student => student.email === formData.email)) {
      setError('A student with this email already exists');
      return;
    }

    // Check for duplicate school student ID if provided
    if (formData.school_student_id && 
        cachedStudentData.some(student => student.school_student_id === formData.school_student_id)) {
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

    // Create student
    const newStudent: Student = {
      student_id: '', // Will be set by backend
      school_student_id: formData.school_student_id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      user_type: 'student',
      dob: formData.dob,
      enrollment_date: formData.enrollment_date,
      graduation_year: formData.graduation_year,
      current_gpa: formData.current_gpa,
      academic_status: formData.academic_status,
      grade_level: formData.grade_level,
      gender: formData.gender,
      ethnicity: formData.ethnicity,
      state_id: formData.state_id,
      // Address fields
      street_address: formData.street_address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      phone: formData.phone,
      // Guardian information
      guardian1_name: formData.guardian1_name,
      guardian1_email: formData.guardian1_email,
      guardian1_relationship: formData.guardian1_relationship,
      guardian2_name: formData.guardian2_name,
      guardian2_email: formData.guardian2_email,
      guardian2_relationship: formData.guardian2_relationship,
      has_iep: formData.has_iep,
      is_economically_disadvantaged: formData.is_economically_disadvantaged,
      individualized_notes: formData.individualized_notes
    };

    // Create individualized needs if applicable
    const newNeeds: IndividualizedNeed[] = [];
    
    if (formData.has_iep) {
      const iepNeed: IndividualizedNeed = {
        need_id: '', // Will be set by backend
        student_id: '', // Will be linked after student creation
        type: 'Special Education',
        details: {
          status: formData.spec_ed_status,
          spec_ed_status: formData.spec_ed_status,
          spec_ed: formData.spec_ed,
          home_language: formData.home_language,
          has_active_iep: formData.has_active_iep,
          ell_active: formData.ell_active,
          additional_notes: formData.individualized_notes
        }
      };
      newNeeds.push(iepNeed);
    }

    if (formData.is_economically_disadvantaged) {
      const economicNeed: IndividualizedNeed = {
        need_id: '', // Will be set by backend
        student_id: '', // Will be linked after student creation
        type: 'Economically Disadvantaged',
        details: {
          status: 'Active',
          additional_notes: formData.individualized_notes
        }
      };
      newNeeds.push(economicNeed);
    }

    const updatedStudentData = [...cachedStudentData, newStudent];
    const updatedNeedsData = [...cachedNeedsData, ...newNeeds];
    
    onStudentsUpdate(updatedStudentData);
    onNeedsUpdate(updatedNeedsData);
    setCachedStudentData(updatedStudentData);
    setCachedNeedsData(updatedNeedsData);
    
    reset({
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_status: 'active',
      grade_level: 'Ungraded',
      home_language: 'English'
    });
    
    setError(null);
    setShowGuardian2(false);
    setShowIndividualizedNeeds(false);
  };

  const removeStudent = (index: number) => {
    const studentToRemove = cachedStudentData[index];
    const newStudents = [...cachedStudentData];
    newStudents.splice(index, 1);
    
    // Also remove any individualized needs for this student
    const newNeeds = cachedNeedsData.filter(need => {
      const student = cachedStudentData.find(s => s.student_id === need.student_id);
      return student !== studentToRemove;
    });
    
    onStudentsUpdate(newStudents);
    onNeedsUpdate(newNeeds);
    setCachedStudentData(newStudents);
    setCachedNeedsData(newNeeds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Students with Individualized Needs</h2>
      </div>

      {/* Step Overview */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">Step Overview</h3>
            <p className="text-sm text-blue-700">
              This combined step allows you to add students and their individualized needs in one form.
              The system will automatically create appropriate records for students with IEP or Economically Disadvantaged status.
            </p>
          </div>
        </div>
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
              <li>• IEP Status</li>
              <li>• Economically Disadvantaged Status</li>
              <li>• Individualized Needs Details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['first_name', 'last_name', 'email', 'grade_level']}
          multiple={true}
          template={{
            school_student_id: 'S123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            grade_level: 'KG',
            academic_status: 'active',
            dob: '2010-01-01',
            gender: 'M',
            ethnicity: 'Not specified',
            state_id: 'ST123',
            street_address: '123 Main St',
            city: 'Anytown',
            state: 'NJ',
            zip: '07005',
            phone: '555-123-4567',
            guardian1_name: 'Jane Doe',
            guardian1_email: 'jane.doe@example.com',
            guardian1_relationship: 'Mother',
            guardian2_name: 'John Doe Sr',
            guardian2_email: 'john.sr@example.com',
            guardian2_relationship: 'Father',
            has_iep: 'No',
            is_economically_disadvantaged: 'No',
            spec_ed_status: 'Active',
            spec_ed: 'Learning Disability',
            home_language: 'English',
            has_active_iep: 'false',
            ell_active: 'false',
            individualized_notes: 'Student requires extended time for assessments'
          }}
          description="Upload a CSV or Excel file containing student information and individualized needs. Required fields are marked with an asterisk (*). Email and School Student ID must be unique if provided."
        />
      </div>

      {/* List of added students with their needs */}
      {cachedStudentData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Students with Individualized Needs</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedStudentData.map((student, index) => (
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
                        {student.has_iep || student.is_economically_disadvantaged ? (
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-indigo-500" />
                            Needs: {student.has_iep && 'IEP'} {student.has_iep && student.is_economically_disadvantaged && '+ '} 
                            {student.is_economically_disadvantaged && 'Economically Disadvantaged'}
                          </div>
                        ) : null}
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

      {/* Add new student form with individualized needs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Student with Individualized Needs</h3>
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

          {/* Address Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Address Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Street Address
                </label>
                <input
                  type="text"
                  {...register('street_address')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  {...register('city')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  {...register('state')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  type="text"
                  {...register('zip')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  {...register('phone')}
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

          {/* Individualized Needs Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Individualized Needs</h4>
              <button
                type="button"
                onClick={() => setShowIndividualizedNeeds(!showIndividualizedNeeds)}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {showIndividualizedNeeds ? 'Hide' : 'Add Individualized Needs'}
              </button>
            </div>

            {showIndividualizedNeeds && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('has_iep')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Has IEP or Special Education Needs
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('is_economically_disadvantaged')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Economically Disadvantaged
                    </label>
                  </div>
                </div>

                {watch('has_iep') && (
                  <div className="bg-blue-50 p-4 rounded-md space-y-4">
                    <h5 className="text-sm font-medium text-blue-800">Special Education Details</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Special Education Status
                        </label>
                        <select
                          {...register('spec_ed_status')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select status...</option>
                          {SPEC_ED_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Special Education Details
                        </label>
                        <input
                          type="text"
                          {...register('spec_ed')}
                          placeholder="e.g., Learning Disability, Autism, etc."
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Home Language
                        </label>
                        <select
                          {...register('home_language')}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          {LANGUAGES.map(language => (
                            <option key={language} value={language}>{language}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          {...register('has_active_iep')}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-700">
                          Has Active IEP
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('ell_active')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        English Language Learner (ELL) Active
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    {...register('individualized_notes')}
                    rows={3}
                    placeholder="Any additional notes about the student's individualized needs..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Student with Needs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}