export const ROLES = ['Student', 'Teacher', 'School Admin', 'District Admin', 'Parent'];
export const REQUIRED_FIELDS = ['email', 'role'];

export const USER_FIELDS = [
  { name: 'email', required: true },
  { name: 'first_name', required: true },
  { name: 'last_name', required: true },
  { name: 'phone', required: false },
  { name: 'street_address', required: false },
  { name: 'city', required: false },
  { name: 'state', required: false },
  { name: 'zip', required: false },
  { name: 'country', required: false }
];

export const STUDENT_FIELDS = [
  ...USER_FIELDS,
  { name: 'school_student_id', required: false },
  { name: 'state_id', required: false },
  { name: 'dob', required: false },
  { name: 'gender', required: false },
  { name: 'ethnicity', required: false },
  { name: 'grade_level', required: true },
  { name: 'graduation_year', required: false },
  { name: 'enrollment_date', required: false },
  { name: 'guardian1_name', required: false },
  { name: 'guardian1_email', required: false },
  { name: 'guardian1_relationship', required: false },
  { name: 'guardian2_name', required: false },
  { name: 'guardian2_email', required: false },
  { name: 'guardian2_relationship', required: false },
  { name: 'current_gpa', required: false },
  { name: 'academic_status', required: false },
  { name: 'school_id', required: false }
];

export const TEACHER_FIELDS = [
  ...USER_FIELDS,
  { name: 'school_teacher_id', required: false },
  { name: 'dob', required: false },
  { name: 'qualification1', required: false },
  { name: 'qualification2', required: false },
  { name: 'qualification3', required: false },
  { name: 'certification1', required: false },
  { name: 'certification2', required: false },
  { name: 'certification3', required: false },
  { name: 'misc', required: false }
];

export const DEFAULT_PASSWORD = 'Welcome123!';