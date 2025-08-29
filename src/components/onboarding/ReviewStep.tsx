import React, { useEffect } from 'react';
import { CheckCircle, School, Building2, Users, GraduationCap, BookOpen, DoorOpen } from 'lucide-react';
import { Calendar, Heart } from 'lucide-react';
import { clearAllFormCaches } from '../../hooks/useFormCache';

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

interface ReviewStepProps {
  data: OnboardingData;
}

export default function ReviewStep({ data }: ReviewStepProps) {
  useEffect(() => {
    return () => {
      clearAllFormCaches();
    };
  }, []);

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Unassigned';
    const teacher = data.teachers.find(t => t.teacher_id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher';
  };

  const getStudentName = (studentId: string) => {
    const student = data.students.find(s => s.student_id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

  const getClassroomName = (classroomId: string) => {
    const classroom = data.classrooms.find(c => c.classroom_id === classroomId);
    return classroom ? `${classroom.classroom_name} (${classroom.school_year})` : 'Unknown Classroom';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Review Information</h2>
      </div>

      {/* District Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">District Information</h3>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.district.district_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {[
                data.district.street_address,
                data.district.city,
                data.district.state,
                data.district.zip,
                data.district.country
              ].filter(Boolean).join(', ')}
            </dd>
          </div>
        </dl>
      </div>

      {/* School Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <School className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">School Information</h3>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{data.school.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {[
                data.school.street_address,
                data.school.city,
                data.school.state,
                data.school.zip,
                data.school.country
              ].filter(Boolean).join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Grade Range</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {data.school.low_grade && data.school.high_grade
                ? `${data.school.low_grade} - ${data.school.high_grade}`
                : 'Not specified'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Principal</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {data.school.principal_name || 'Not specified'}
              {data.school.principal_email && ` (${data.school.principal_email})`}
            </dd>
          </div>
        </dl>
      </div>

      {/* Administrators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">School Administrators ({data.admins.length})</h3>
        </div>
        <div className="space-y-4">
          {data.admins.map((admin, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {admin.first_name} {admin.last_name}
                </p>
                <p className="text-sm text-gray-500">{admin.email}</p>
              </div>
              {admin.phone && (
                <p className="text-sm text-gray-500">{admin.phone}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Teachers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Teachers ({data.teachers.length})</h3>
        </div>
        <div className="space-y-4">
          {data.teachers.map((teacher, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {teacher.first_name} {teacher.last_name}
                </p>
                {teacher.school_teacher_id && (
                  <p className="text-sm text-gray-500">ID: {teacher.school_teacher_id}</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {[teacher.qualification1, teacher.certification1]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Students */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Students ({data.students.length})</h3>
        </div>
        <div className="space-y-4">
          {data.students.map((student, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  Grade: {student.grade_level}
                  {student.school_student_id && ` • ID: ${student.school_student_id}`}
                </p>
              </div>
              {student.guardian1_name && (
                <p className="text-sm text-gray-500">
                  Guardian: {student.guardian1_name}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Classrooms */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Classrooms ({data.classrooms.length})</h3>
        </div>
        <div className="space-y-4">
          {data.classrooms.map((classroom, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {classroom.classroom_name}
                </p>
                <p className="text-sm text-gray-500">
                  {classroom.grade && `Grade: ${classroom.grade} • `}
                  Year: {classroom.school_year}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Teacher: {getTeacherName(classroom.classroom_teacher_id)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Enrollments */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <DoorOpen className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Enrollments ({data.enrollments.length})</h3>
        </div>
        <div className="space-y-4">
          {data.enrollments.map((enrollment, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getStudentName(enrollment.student_id)}
                </p>
                <p className="text-sm text-gray-500">
                  {getClassroomName(enrollment.classroom_id)}
                </p>
              </div>
              {enrollment.enrollment_date && (
                <p className="text-sm text-gray-500">
                  Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Attendance Records ({data.attendanceRecords.length})</h3>
        </div>
        <div className="space-y-4">
          {data.attendanceRecords.map((record, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getStudentName(record.student_id)}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(record.record_date).toLocaleDateString()} • 
                  Present: {record.total_days_present}/{record.total_days_possible} • 
                  Absences: {record.fy_absences_total} • 
                  Tardies: {record.fy_tardies_total}
                </p>
              </div>
              {record.attendance_year && (
                <p className="text-sm text-gray-500">
                  {record.attendance_year}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Individualized Needs */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Individualized Needs ({data.individualizedNeeds.length})</h3>
        </div>
        <div className="space-y-4">
          {data.individualizedNeeds.map((need, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getStudentName(need.student_id)}
                </p>
                <p className="text-sm text-gray-500">
                  Type: {need.type}
                  {need.details.spec_ed_status && ` • Spec Ed: ${need.details.spec_ed_status}`}
                  {need.details.home_language && need.details.home_language !== 'English' && ` • Language: ${need.details.home_language}`}
                  {need.details.has_active_iep && ' • Active IEP'}
                  {need.details.ell_active && ' • ELL Active'}
                </p>
              </div>
              {need.details.status && (
                <p className="text-sm text-gray-500">
                  Status: {need.details.status}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}