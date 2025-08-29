import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChevronRight, ChevronLeft, School, Building2, Users, GraduationCap, BookOpen, DoorOpen } from 'lucide-react';
import { Calendar, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import Select from 'react-select';
import DistrictStep from '../components/onboarding/DistrictStep';
import SchoolStep from '../components/onboarding/SchoolStep';
import AdminsStep from '../components/onboarding/AdminsStep';
import TeachersStep from '../components/onboarding/TeachersStep';
import StudentsStep from '../components/onboarding/StudentsStep';
import ClassroomsStep from '../components/onboarding/ClassroomsStep';
import EnrollmentStep from '../components/onboarding/EnrollmentStep';
import AttendanceStep from '../components/onboarding/AttendanceStep';
import IndividualizedNeedsStep from '../components/onboarding/IndividualizedNeedsStep';
import ReviewStep from '../components/onboarding/ReviewStep';

type OnboardingStep = 
  | 'district'
  | 'school'
  | 'admins'
  | 'teachers'
  | 'students'
  | 'classrooms'
  | 'enrollment'
  | 'attendance'
  | 'individualized_needs'
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
  { id: 'individualized_needs', title: 'Individual Needs', icon: Heart },
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
  individualizedNeeds: []   // ← keep only one copy, add comma
});

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm();

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleNext = () => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep.id);
    }
  };

  const handleBack = () => {
    const prevStep = steps[currentStepIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep.id);
    }
  };

  const handleFinalSubmit = async () => {
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

        if (districtError) throw districtError;
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

      if (schoolError) throw schoolError;
      const schoolId = schoolData.school_id;

      // Create admins
      for (const admin of onboardingData.admins) {
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert({
            ...admin,
            school_id: schoolId
          });
        if (adminError) throw adminError;
      }

      // Create teachers
      for (const teacher of onboardingData.teachers) {
        const { error: teacherError } = await supabase
          .from('teachers')
          .insert(teacher);
        if (teacherError) throw teacherError;
      }

      // Create students
      for (const student of onboardingData.students) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            ...student,
            school_id: schoolId
          });
        if (studentError) throw studentError;
      }

      // Create classrooms
      for (const classroom of onboardingData.classrooms) {
        const { error: classroomError } = await supabase
          .from('classrooms')
          .insert({
            ...classroom,
            school_id: schoolId
          });
        if (classroomError) throw classroomError;
      }

      // Create enrollments
      for (const enrollment of onboardingData.enrollments) {
        const { error: enrollmentError } = await supabase
          .from('classroom_enrollments')
          .insert(enrollment);
        if (enrollmentError) throw enrollmentError;
      }

      // Create attendance records
      for (const attendanceRecord of onboardingData.attendanceRecords) {
        const { error: attendanceError } = await supabase
          .from('attendance_records')
          .insert(attendanceRecord);
        if (attendanceError) throw attendanceError;
      }

      // Create individualized needs
      for (const need of onboardingData.individualizedNeeds) {
        const { error: needError } = await supabase
          .from('individualized_needs')
          .insert(need);
        if (needError) throw needError;
      }

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
        individualizedNeeds: []
      });
      setCurrentStep('district');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
        return <StudentsStep data={onboardingData.students} onUpdate={(data) => setOnboardingData(prev => ({ ...prev, students: data }))} />;
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
      case 'individualized_needs':
        return <IndividualizedNeedsStep 
          data={onboardingData.individualizedNeeds} 
          students={onboardingData.students} 
          onUpdate={(data) => setOnboardingData(prev => ({ ...prev, individualizedNeeds: data }))}
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
