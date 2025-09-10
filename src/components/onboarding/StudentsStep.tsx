import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Plus, Trash2, Mail, GraduationCap, UserPlus, Heart, AlertCircle, BookOpen, CheckCircle, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import StudentCSVProcessor from './StudentCSVProcessor';
import { ProcessingResult } from '../../utils/studentCsvProcessor';
import { useFormCache } from '../../hooks/useFormCache';
import { supabase } from '../../lib/supabase';
import { nanoid } from 'nanoid';

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
  schoolId?: string;
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

// CSV column mapping for the provided file format
const CSV_COLUMN_MAPPING = {
  'Student ID': 'school_student_id',
  'Last Name': 'last_name',
  'First Name': 'first_name',
  'Student Email': 'email',
  'Grade': 'grade_level',
  'Address 1': 'street_address',
  'City': 'city',
  'State': 'state',
  'Zip': 'zip',
  'Gender': 'gender',
  'Enrollment': 'academic_status',
  'Guardian 1 Email Address': 'guardian1_email',
  'Guardian 2 Email Address': 'guardian2_email'
};

// Grade level mapping for CSV values
const GRADE_MAPPING = {
  'KF': 'KG',  // Kindergarten Full-day
  '01': '1',
  '02': '2',
  '03': '3',
  '04': '4',
  '05': '5',
  '06': '6',
  '07': '7',
  '08': '8',
  '09': '9',
  '10': '10',
  '11': '11',
  '12': '12',
  '3F': '3',   // 3rd grade full-day
  '4F': '4'    // 4th grade full-day
};

export default function CombinedStudentsStep({ 
  studentData, 
  needsData, 
  onStudentsUpdate, 
  onNeedsUpdate,
  schoolId 
}: CombinedStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuardian2, setShowGuardian2] = useState(false);
  const [showIndividualizedNeeds, setShowIndividualizedNeeds] = useState(false);
  const [showAdvancedImport, setShowAdvancedImport] = useState(false);

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

  const transformCSVData = (csvRow: Record<string, unknown>) => {
    // Map CSV columns to database fields
    const mappedData: Record<string, unknown> = {};
    
    Object.entries(CSV_COLUMN_MAPPING).forEach(([csvColumn, dbField]) => {
      const value = csvRow[csvColumn];
      if (value !== undefined && value !== null && value !== '') {
        mappedData[dbField] = value;
      }
    });

    // Transform grade level
    if (mappedData.grade_level) {
      const csvGrade = String(mappedData.grade_level).trim();
      mappedData.grade_level = GRADE_MAPPING[csvGrade] || csvGrade;
    }

    // Transform gender
    if (mappedData.gender) {
      const gender = String(mappedData.gender).toUpperCase();
      mappedData.gender = gender === 'M' ? 'male' : gender === 'F' ? 'female' : mappedData.gender;
    }

    // Transform academic status
    if (mappedData.academic_status) {
      const status = String(mappedData.academic_status).toLowerCase();
      mappedData.academic_status = status === 'active' ? 'active' : 'inactive';
    }

    // Set default enrollment date if not provided
    if (!mappedData.enrollment_date) {
      mappedData.enrollment_date = new Date().toISOString().split('T')[0];
    }

    return mappedData;
  };

  const createUserRecord = async (studentData: Record<string, unknown>) => {
    const userRecord = {
      email: studentData.email as string,
      first_name: studentData.first_name as string,
      last_name: studentData.last_name as string,
      phone: studentData.phone as string || null,
      street_address: studentData.street_address as string || null,
      city: studentData.city as string || null,
      state: studentData.state as string || null,
      zip: studentData.zip as string || null,
      country: 'USA',
      user_type: 'student' as const
    };

    const { data, error } = await supabase
      .from('users')
      .insert(userRecord)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create user record: ${error.message}`);
    }

    return data.id;
  };

  const createStudentRecord = async (userId: string, studentData: Record<string, unknown>) => {
    const studentRecord = {
      student_id: userId,
      school_student_id: studentData.school_student_id as string || null,
      first_name: studentData.first_name as string,
      last_name: studentData.last_name as string,
      dob: studentData.dob as string || null,
      enrollment_date: studentData.enrollment_date as string || null,
      graduation_year: studentData.graduation_year as number || null,
      current_gpa: studentData.current_gpa as number || null,
      academic_status: studentData.academic_status as string || 'active',
      grade_level: studentData.grade_level as string,
      gender: studentData.gender as string || null,
      ethnicity: studentData.ethnicity as string || null,
      state_id: studentData.state_id as string || null,
      school_id: schoolId || null,
      guardian1_name: studentData.guardian1_name as string || null,
      guardian1_email: studentData.guardian1_email as string || null,
      guardian1_relationship: studentData.guardian1_relationship as string || null,
      guardian2_name: studentData.guardian2_name as string || null,
      guardian2_email: studentData.guardian2_email as string || null,
      guardian2_relationship: studentData.guardian2_relationship as string || null,
      special_needs: studentData.special_needs || {},
      created_by: (await supabase.auth.getUser()).data.user?.id || null
    };

    const { error } = await supabase
      .from('students')
      .insert(studentRecord);

    if (error) {
      throw new Error(`Failed to create student record: ${error.message}`);
    }

    return userId;
  };

  const createIndividualizedNeed = async (studentId: string, needData: {
    type: string;
    details: Record<string, unknown>;
  }) => {
    const needRecord = {
      student_id: studentId,
      type: needData.type,
      details: needData.details
    };

    const { error } = await supabase
      .from('individualized_needs')
      .insert(needRecord);

    if (error) {
      throw new Error(`Failed to create individualized need: ${error.message}`);
    }
  };

  const handleAdvancedProcessingComplete = (result: ProcessingResult) => {
    try {
      if (result.success) {
        // The processing was handled by the StudentCSVProcessor
        // We just need to refresh our local state or show success message
        setError(null);
        setShowAdvancedImport(false);
        
        // Optionally refresh the student list from the database
        // This would require implementing a refresh function
      } else {
        setError(`Processing completed with errors: ${result.errors.length} errors occurred`);
      }
    } catch (err: any) {
      setError(`Failed to process CSV: ${err.message}`);
    }
  };

  const handleBulkImport = (importedData: any[]) => {
    try {
      // This is the legacy bulk import handler for the simple BulkImport component
      // We'll keep it for backward compatibility but encourage using the advanced processor
      setError(null);
    } catch (err: any) {
      setError(`Failed to import students: ${err.message}`);
    }
  };

  const handleBulkImport = async (importedData: Record<string, unknown>[]) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < importedData.length; i++) {
        const row = importedData[i];
        
        try {
          // Transform CSV data to match database schema
          const transformedData = transformCSVData(row);

          // Validate required fields
          if (!transformedData.first_name || !transformedData.last_name || !transformedData.email || !transformedData.grade_level) {
            throw new Error(`Missing required fields in row ${i + 1}`);
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(transformedData.email))) {
            throw new Error(`Invalid email format in row ${i + 1}: ${transformedData.email}`);
          }

          // Check for duplicate email in database
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', transformedData.email)
            .single();

          if (existingUser) {
            throw new Error(`User with email ${transformedData.email} already exists`);
          }

          // Check for duplicate school_student_id if provided
          if (transformedData.school_student_id) {
            const { data: existingStudent } = await supabase
              .from('students')
              .select('student_id')
              .eq('school_student_id', transformedData.school_student_id)
              .single();

            if (existingStudent) {
              throw new Error(`Student with ID ${transformedData.school_student_id} already exists`);
            }
          }

          // Create user record first
          const userId = await createUserRecord(transformedData);

          // Create student record
          await createStudentRecord(userId, transformedData);

          // Create individualized needs if applicable
          if (transformedData.has_iep) {
            await createIndividualizedNeed(userId, {
              type: 'Special Education',
              details: {
                status: transformedData.spec_ed_status || 'Active',
                spec_ed_status: transformedData.spec_ed_status,
                spec_ed: transformedData.spec_ed,
                home_language: transformedData.home_language,
                has_active_iep: transformedData.has_active_iep,
                ell_active: transformedData.ell_active,
                additional_notes: transformedData.individualized_notes
              }
            });
          }

          if (transformedData.is_economically_disadvantaged) {
            await createIndividualizedNeed(userId, {
              type: 'Economically Disadvantaged',
              details: {
                status: 'Active',
                additional_notes: transformedData.individualized_notes
              }
            });
          }

          results.successful++;

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push(`Row ${i + 1}: ${errorMessage}`);
          results.failed++;
        }
      }

      // Update local state with successful imports
      if (results.successful > 0) {
        // Refresh data from database to get the latest records
        await refreshStudentData();
        
        setSuccess(`Successfully imported ${results.successful} students. ${results.failed > 0 ? `${results.failed} failed.` : ''}`);
      }

      if (results.failed > 0) {
        setError(`${results.failed} records failed to import:\n${results.errors.slice(0, 5).join('\n')}${results.errors.length > 5 ? '\n...and more' : ''}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Bulk import failed: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const refreshStudentData = async () => {
    try {
      // Fetch students from database
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          users!inner(email, phone, street_address, city, state, zip)
        `)
        .eq('school_id', schoolId);

      if (studentsError) throw studentsError;

      // Fetch individualized needs
      const { data: needs, error: needsError } = await supabase
        .from('individualized_needs')
        .select('*')
        .in('student_id', students?.map(s => s.student_id) || []);

      if (needsError) throw needsError;

      // Transform database records to component format
      const transformedStudents: Student[] = (students || []).map(student => ({
        student_id: student.student_id,
        school_student_id: student.school_student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.users.email,
        user_type: 'student' as const,
        dob: student.dob,
        enrollment_date: student.enrollment_date,
        graduation_year: student.graduation_year,
        current_gpa: student.current_gpa,
        academic_status: student.academic_status,
        grade_level: student.grade_level,
        gender: student.gender,
        ethnicity: student.ethnicity,
        state_id: student.state_id,
        street_address: student.users.street_address,
        city: student.users.city,
        state: student.users.state,
        zip: student.users.zip,
        phone: student.users.phone,
        guardian1_name: student.guardian1_name,
        guardian1_email: student.guardian1_email,
        guardian1_relationship: student.guardian1_relationship,
        guardian2_name: student.guardian2_name,
        guardian2_email: student.guardian2_email,
        guardian2_relationship: student.guardian2_relationship,
        has_iep: (needs || []).some(n => n.student_id === student.student_id && n.type === 'Special Education'),
        is_economically_disadvantaged: (needs || []).some(n => n.student_id === student.student_id && n.type === 'Economically Disadvantaged'),
        individualized_notes: student.special_needs?.notes
      }));

      const transformedNeeds: IndividualizedNeed[] = (needs || []).map(need => ({
        need_id: need.need_id,
        student_id: need.student_id,
        type: need.type,
        details: need.details
      }));

      onStudentsUpdate(transformedStudents);
      onNeedsUpdate(transformedNeeds);
      setCachedStudentData(transformedStudents);
      setCachedNeedsData(transformedNeeds);

    } catch (err) {
      console.error('Failed to refresh student data:', err);
    }
  };

  const onSubmit = async (formData: StudentFormData) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Invalid email format');
      }

      // Check for duplicate email in database
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // Check for duplicate school student ID if provided
      if (formData.school_student_id) {
        const { data: existingStudent } = await supabase
          .from('students')
          .select('student_id')
          .eq('school_student_id', formData.school_student_id)
          .single();

        if (existingStudent) {
          throw new Error('A student with this school ID already exists');
        }
      }

      // Validate guardian email formats if provided
      if (formData.guardian1_email && !emailRegex.test(formData.guardian1_email)) {
        throw new Error('Invalid guardian 1 email format');
      }
      if (formData.guardian2_email && !emailRegex.test(formData.guardian2_email)) {
        throw new Error('Invalid guardian 2 email format');
      }

      // Create user record
      const userId = await createUserRecord(formData);

      // Create student record
      await createStudentRecord(userId, formData);

      // Create individualized needs if applicable
      if (formData.has_iep) {
        await createIndividualizedNeed(userId, {
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
        });
      }

      if (formData.is_economically_disadvantaged) {
        await createIndividualizedNeed(userId, {
          type: 'Economically Disadvantaged',
          details: {
            status: 'Active',
            additional_notes: formData.individualized_notes
          }
        });
      }

      // Refresh data from database
      await refreshStudentData();
      
      reset({
        enrollment_date: new Date().toISOString().split('T')[0],
        academic_status: 'active',
        grade_level: 'Ungraded',
        home_language: 'English'
      });
      
      setSuccess('Student created successfully');
      setShowGuardian2(false);
      setShowIndividualizedNeeds(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeStudent = async (index: number) => {
    const studentToRemove = cachedStudentData[index];
    
    try {
      // Delete from database
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('student_id', studentToRemove.student_id);

      if (studentError) throw studentError;

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', studentToRemove.student_id);

      if (userError) throw userError;

      // Update local state
      const newStudents = [...cachedStudentData];
      newStudents.splice(index, 1);
      
      const newNeeds = cachedNeedsData.filter(need => need.student_id !== studentToRemove.student_id);
      
      onStudentsUpdate(newStudents);
      onNeedsUpdate(newNeeds);
      setCachedStudentData(newStudents);
      setCachedNeedsData(newNeeds);

      setSuccess('Student removed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove student';
      setError(errorMessage);
    }
  };

  // Load existing data on component mount
  React.useEffect(() => {
    if (schoolId) {
      refreshStudentData();
    }
  }, [schoolId]);

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
              This step allows you to add students and their individualized needs. Data will be saved directly to Supabase.
              The system will automatically create user accounts and student records based on your CSV file.
            </p>
          </div>
        </div>
      </div>

      {/* CSV Format Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">CSV Format Requirements</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Required CSV Columns
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Student ID</strong> - School student identifier</li>
              <li>• <strong>Last Name</strong> - Student's last name</li>
              <li>• <strong>First Name</strong> - Student's first name</li>
              <li>• <strong>Student Email</strong> - Student's email address</li>
              <li>• <strong>Grade</strong> - Grade level (KF=KG, 01=1, etc.)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional CSV Columns
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>Address 1</strong> - Street address</li>
              <li>• <strong>City</strong> - City</li>
              <li>• <strong>State</strong> - State</li>
              <li>• <strong>Zip</strong> - ZIP code</li>
              <li>• <strong>Gender</strong> - M/F</li>
              <li>• <strong>Enrollment</strong> - ACTIVE/INACTIVE</li>
              <li>• <strong>Guardian 1 Email Address</strong> - Primary guardian email</li>
              <li>• <strong>Guardian 2 Email Address</strong> - Secondary guardian email</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Student Data Import</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose your import method based on your data complexity and requirements.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Advanced CSV Processor */}
            <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-5 w-5 text-indigo-600" />
                <h4 className="font-medium text-indigo-900">Advanced CSV Processor</h4>
                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Recommended</span>
              </div>
              <p className="text-sm text-indigo-700 mb-3">
                Intelligent column mapping, data validation, and upsert operations with detailed reporting.
              </p>
              <ul className="text-xs text-indigo-600 space-y-1 mb-4">
                <li>• Auto-detects column mappings</li>
                <li>• Validates data integrity</li>
                <li>• Handles updates and inserts</li>
                <li>• Stores unmapped data in special_needs</li>
                <li>• Detailed processing reports</li>
              </ul>
              <button
                onClick={() => setShowAdvancedImport(!showAdvancedImport)}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {showAdvancedImport ? 'Hide' : 'Use'} Advanced Processor
              </button>
            </div>

            {/* Simple Bulk Import */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Simple Bulk Import</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Basic CSV import with predefined column mappings. Best for simple, well-formatted data.
              </p>
              <ul className="text-xs text-gray-500 space-y-1 mb-4">
                <li>• Fixed column mappings</li>
                <li>• Basic validation</li>
                <li>• Insert-only operations</li>
                <li>• Simple error reporting</li>
              </ul>
              <button
                onClick={() => setShowAdvancedImport(false)}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced CSV Processor */}
      {showAdvancedImport && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <StudentCSVProcessor
            onProcessingComplete={handleAdvancedProcessingComplete}
            schoolId={undefined} // Will be set during final submission
          />
        </div>
      )}

      {/* Legacy Bulk Import (Hidden for now) */}
      <div className="hidden">
        {/* Keep the original BulkImport component for reference */}
      </div>

      {/* List of students from database */}
      {cachedStudentData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Students in Database ({cachedStudentData.length})</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedStudentData.map((student, index) => (
              <div key={student.student_id} className="p-4 flex items-center justify-between">
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
                        {(student.has_iep || student.is_economically_disadvantaged) && (
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-indigo-500" />
                            Needs: {student.has_iep && 'IEP'} {student.has_iep && student.is_economically_disadvantaged && '+ '} 
                            {student.is_economically_disadvantaged && 'Economically Disadvantaged'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeStudent(index)}
                  disabled={isProcessing}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 disabled:opacity-50"
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
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Individual Student</h3>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}