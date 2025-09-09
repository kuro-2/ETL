import React, { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ChevronRight, ChevronLeft, School, Building2, Users, GraduationCap, BookOpen, DoorOpen } from 'lucide-react';
import { Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import DistrictStep from '../components/onboarding/DistrictStep';
import SchoolStep from '../components/onboarding/SchoolStep';
import AdminsStep from '../components/onboarding/AdminsStep';
import TeachersStep from '../components/onboarding/TeachersStep';
import StudentsStep from '../components/onboarding/StudentsStep';
import ClassroomsStep from '../components/onboarding/ClassroomsStep';
import EnrollmentStep from '../components/onboarding/EnrollmentStep';
import AttendanceStep from '../components/onboarding/AttendanceStep';
import AssessmentStep from '../components/onboarding/AssessmentStep';
import ReviewStep from '../components/onboarding/ReviewStep';

// Interface for student records to properly type the createRecords function
interface StudentRecord {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  [key: string]: unknown;
}

// Helper function for creating records in batches
const createRecords = async <T,>(tableName: string, records: T[], transformFn?: (record: T) => T) => {
  if (records.length === 0) return;
  
  // Special handling for students - create both users and students
  if (tableName === 'students') {
    const transformedRecords = transformFn ? records.map(transformFn) : records;
    
    for (const studentRecord of transformedRecords) {
      const typedRecord = studentRecord as StudentRecord;
      
      // First create user record
      const userRecord = {
        email: typedRecord.email,
        first_name: typedRecord.first_name,
        last_name: typedRecord.last_name,
        phone: typedRecord.phone,
        street_address: typedRecord.street_address,
        city: typedRecord.city,
        state: typedRecord.state,
        zip: typedRecord.zip,
        country: 'USA',
        user_type: 'student'
      };
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert(userRecord)
        .select('id')
        .single();
      
      if (userError) {
        throw new Error(`Failed to create user for student ${typedRecord.email}: ${userError.message}`);
      }
      
      // Then create student record with the user ID
      const studentRecordWithUserId = {
        ...studentRecord,
        student_id: userData.id
      };
      
      const { error: studentError } = await supabase
        .from('students')
        .insert(studentRecordWithUserId);
      
      if (studentError) {
        throw new Error(`Failed to create student record for ${typedRecord.email}: ${studentError.message}`);
      }
    }
    return;
  }
  
  // Regular handling for other tables
  const transformedRecords = transformFn ? records.map(transformFn) : records;
  const { error } = await supabase.from(tableName).insert(transformedRecords);
  
  if (error) {
    throw new Error(`Failed to create ${tableName}: ${error.message}`);
  }
};

type OnboardingStep = 
  | 'district'
  | 'school'
  | 'admins'
  | 'teachers'
  | 'students'
  | 'classrooms'
  | 'enrollment'
  | 'attendance'
  | 'assessments'
  | 'review';

interface District {
  district_id: string;
  district_name: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface School {
  school_id: string;
  name: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  district_id: string;
  low_grade?: string;
  high_grade?: string;
  principal_name?: string;
  principal_email?: string;
  state_id?: string;
  nces_id?: string;
  mdr_number?: string;
  email?: string;
  phone?: string;
}

interface SchoolAdmin {
  admin_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  school_id: string;
  admin_user_type: 'school_admin';
}

interface Teacher {
  teacher_id: string;
  school_teacher_id?: string;
  first_name: string;
  last_name: string;
  dob?: string;
  qualification1?: string;
  qualification2?: string;
  qualification3?: string;
  certification1?: string;
  certification2?: string;
  certification3?: string;
}

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

interface Classroom {
  classroom_id: string;
  classroom_name: string;
  classroom_teacher_id?: string;
  school_id: string;
  school_year: string;
  grade?: string;
}

interface ClassroomEnrollment {
  classroom_id: string;
  student_id: string;
  enrollment_date?: string;
  is_active?: boolean;
  teacher_id?: string;
}

interface AttendanceRecord {
  student_id: string;
  school_id: string;
  record_date: string;
  total_days_present: number;
  total_days_possible: number;
  fy_absences_total: number;
  fy_absences_excused: number;
  fy_absences_unexcused: number;
  fy_tardies_total: number;
  attendance_year?: string;
  extra_data?: {
    daily_attendance_rate?: number;
    mp1_attendance_rate?: number;
    mp2_attendance_rate?: number;
    mp3_attendance_rate?: number;
    mp4_attendance_rate?: number;
  };
}

interface AssessmentRecord {
  assessment_id: string;
  student_id: string;
  assessment_type: string;
  subject: string;
  grade_level: string;
  school_year?: string;
  test_date: Date;
  raw_score?: number;
  scale_score: number;
  performance_level_text: string;
  min_possible_score: string;
  max_possible_score: string;
  student_growth_percentile?: number;
  subscores?: Record<string, unknown>;
  unprocessed_data?: Record<string, unknown>;
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

interface OnboardingData {
  district: District;
  school: School;
  admins: SchoolAdmin[];
  teachers: Teacher[];
  students: Student[];
  classrooms: Classroom[];
  enrollments: ClassroomEnrollment[];
  attendanceRecords: AttendanceRecord[];
  assessmentRecords: AssessmentRecord[];
  individualizedNeeds: IndividualizedNeed[];
}

const steps: { id: OnboardingStep; title: string; icon: React.FC }[] = [
  { id: 'district', title: 'District', icon: Building2 },
  { id: 'school', title: 'School', icon: School },
  { id: 'admins', title: 'School Admins', icon: Users },
  { id: 'teachers', title: 'Teachers', icon: GraduationCap },
  { id: 'students', title: 'Students', icon: Users },
  { id: 'classrooms', title: 'Classrooms', icon: BookOpen },
  { id: 'enrollment', title: 'Enrollment', icon: DoorOpen },
  { id: 'attendance', title: 'Attendance', icon: Calendar },
  { id: 'assessments', title: 'Assessments', icon: BarChart3 },
  { id: 'review', title: 'Review', icon: ChevronRight }
];

export default function SchoolOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('district');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
  district: {} as District,
  school: {} as School,
  admins: [],
  teachers: [],
  students: [],
  classrooms: [],
  enrollments: [],
  attendanceRecords: [],
  assessmentRecords: [],
  individualizedNeeds: []   // ← keep only one copy, add comma
});

  const { reset } = useForm();

  const currentStepIndex = useMemo(() => 
    steps.findIndex(step => step.id === currentStep),
    [currentStep]
  );

  const handleNext = useCallback(() => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  }, [currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.id);
    }
  }, [currentStepIndex]);

  const handleFinalSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create district if new
      let districtId = onboardingData.district.district_id;
      if (!districtId) {
        const { data: districtData, error: districtError } = await supabase
          .from('districts')
          .insert(onboardingData.district)
          .select('district_id')
          .single();

        if (districtError) {
          throw new Error(`Failed to create district: ${districtError.message}`);
        }
        districtId = districtData.district_id;
      }

      // Create school
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert({
          ...onboardingData.school,
          district_id: districtId
        })
        .select('school_id')
        .single();

      if (schoolError) {
        throw new Error(`Failed to create school: ${schoolError.message}`);
      }
      const schoolId = schoolData.school_id;

      // Create all records
      await createRecords('admin_users', onboardingData.admins, (admin: SchoolAdmin) => ({ ...admin, school_id: schoolId }));
      await createRecords('teachers', onboardingData.teachers);
      
      // For students, create both users and students records in the proper order
      // Note: The database should handle the relationship via triggers
      await createRecords('students', onboardingData.students, (student: Student) => ({ ...student, school_id: schoolId }));
      
      await createRecords('classrooms', onboardingData.classrooms, (classroom: Classroom) => ({ ...classroom, school_id: schoolId }));
      await createRecords('classroom_enrollments', onboardingData.enrollments);
      await createRecords('attendance_records', onboardingData.attendanceRecords);
      await createRecords('assessment_external_processed', onboardingData.assessmentRecords);
      await createRecords('individualized_needs', onboardingData.individualizedNeeds);

      // Success! Reset form and show success message
      reset();
      setOnboardingData({
        district: {} as District,
        school: {} as School,
        admins: [],
        teachers: [],
        students: [],
        classrooms: [],
        enrollments: [],
        attendanceRecords: [],
        assessmentRecords: [],
        individualizedNeeds: []
      });
      setCurrentStep('district');

    } catch (error) {
      console.error('Onboarding submission error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred during onboarding');
    } finally {
      setIsLoading(false);
    }
  }, [onboardingData, reset]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'district':
        return <DistrictStep data={onboardingData.district} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, district: data }))} />;
      case 'school':
        return <SchoolStep data={onboardingData.school} districtId={onboardingData.district.district_id} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, school: data }))} />;
      case 'admins':
        return <AdminsStep data={onboardingData.admins} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, admins: data }))} />;
      case 'teachers':
        return <TeachersStep data={onboardingData.teachers} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, teachers: data }))} />;
      case 'students':
        return <StudentsStep 
          studentData={onboardingData.students} 
          needsData={onboardingData.individualizedNeeds}
          onStudentsUpdate={(data: Student[]) => setOnboardingData(prev => ({ ...prev, students: data }))}
          onNeedsUpdate={(data: IndividualizedNeed[]) => setOnboardingData(prev => ({ ...prev, individualizedNeeds: data }))}
        />;
      case 'classrooms':
        return <ClassroomsStep 
          data={onboardingData.classrooms} 
          teachers={onboardingData.teachers} 
          onUpdate={(data) => setOnboardingData(prev => ({ ...prev, classrooms: data }))}
          schoolId={onboardingData.school.school_id} // Pass the school_id
        />;
      case 'enrollment':
        return <EnrollmentStep data={onboardingData.enrollments} classrooms={onboardingData.classrooms} students={onboardingData.students} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, enrollments: data }))} />;
      case 'attendance':
        return <AttendanceStep 
          data={onboardingData.attendanceRecords} 
          students={onboardingData.students} 
          onUpdate={(data) => setOnboardingData(prev => ({ ...prev, attendanceRecords: data }))}
          schoolId={onboardingData.school.school_id}
        />;
      case 'assessments':
        return <AssessmentStep 
          data={onboardingData.assessmentRecords} 
          students={onboardingData.students} 
          onUpdate={(data) => setOnboardingData(prev => ({ ...prev, assessmentRecords: data }))}
          schoolId={onboardingData.school.school_id}
        />;

      case 'review':
        return <ReviewStep data={onboardingData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, index) => (
                <li key={step.id} className={cn(
                  "relative",
                  index !== steps.length - 1 ? "pr-8 sm:pr-20" : "",
                  "flex items-center"
                )}>
                  <div className="flex items-center">
                    <div className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full",
                      currentStepIndex === index
                        ? "bg-indigo-600 text-white"
                        : currentStepIndex > index
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}>
                      <step.icon className="h-5 w-5" />
                      {currentStepIndex > index && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white" />
                      )}
                    </div>
                    {index !== steps.length - 1 && (
                      <div className={cn(
                        "absolute top-4 w-full h-0.5",
                        currentStepIndex > index ? "bg-indigo-600" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                  <span className="absolute top-10 text-xs font-medium text-gray-500">
                    {step.title}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md",
              currentStepIndex === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
            )}
          >
            <ChevronLeft className="h-5 w-5 inline-block mr-1" />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
            >
              {isLoading ? 'Submitting...' : 'Complete Setup'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next
              <ChevronRight className="h-5 w-5 inline-block ml-1" />
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
