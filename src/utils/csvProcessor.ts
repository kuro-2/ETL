// CSV Processing utilities for student data

export interface CSVStudentData {
  'Student ID': string;
  'Last Name': string;
  'First Name': string;
  'Student Email': string;
  'Grade': string;
  'Address 1'?: string;
  'City'?: string;
  'State'?: string;
  'Zip'?: string;
  'Gender'?: string;
  'Enrollment'?: string;
  'Guardian 1 Email Address'?: string;
  'Guardian 2 Email Address'?: string;
}

export interface ProcessedStudentData {
  // User table fields
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  user_type: 'student';
  
  // Student table fields
  school_student_id?: string;
  dob?: string;
  enrollment_date?: string;
  graduation_year?: number;
  current_gpa?: number;
  academic_status: string;
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
  special_needs?: Record<string, unknown>;
}

// Grade level mapping for CSV values
const GRADE_MAPPING: Record<string, string> = {
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

export function processCSVStudentData(csvData: CSVStudentData[]): ProcessedStudentData[] {
  return csvData.map(row => {
    // Transform grade level
    const csvGrade = row.Grade?.trim() || '';
    const gradeLevel = GRADE_MAPPING[csvGrade] || csvGrade;

    // Transform gender
    const gender = row.Gender?.toUpperCase();
    const transformedGender = gender === 'M' ? 'male' : gender === 'F' ? 'female' : undefined;

    // Transform academic status
    const enrollment = row.Enrollment?.toLowerCase();
    const academicStatus = enrollment === 'active' ? 'active' : 'inactive';

    // Validate required fields
    if (!row['First Name'] || !row['Last Name'] || !row['Student Email'] || !gradeLevel) {
      throw new Error(`Missing required fields for student: ${row['First Name']} ${row['Last Name']}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row['Student Email'])) {
      throw new Error(`Invalid email format: ${row['Student Email']}`);
    }

    // Validate guardian emails if provided
    if (row['Guardian 1 Email Address'] && !emailRegex.test(row['Guardian 1 Email Address'])) {
      throw new Error(`Invalid guardian 1 email format: ${row['Guardian 1 Email Address']}`);
    }
    if (row['Guardian 2 Email Address'] && !emailRegex.test(row['Guardian 2 Email Address'])) {
      throw new Error(`Invalid guardian 2 email format: ${row['Guardian 2 Email Address']}`);
    }

    return {
      // User table fields
      email: row['Student Email'],
      first_name: row['First Name'],
      last_name: row['Last Name'],
      street_address: row['Address 1'] || undefined,
      city: row.City || undefined,
      state: row.State || undefined,
      zip: row.Zip || undefined,
      country: 'USA',
      user_type: 'student' as const,
      
      // Student table fields
      school_student_id: row['Student ID'] || undefined,
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_status: academicStatus,
      grade_level: gradeLevel,
      gender: transformedGender,
      guardian1_email: row['Guardian 1 Email Address'] || undefined,
      guardian2_email: row['Guardian 2 Email Address'] || undefined,
      special_needs: {}
    };
  });
}

export function validateStudentData(data: ProcessedStudentData[]): {
  valid: ProcessedStudentData[];
  invalid: Array<{ data: ProcessedStudentData; errors: string[] }>;
} {
  const valid: ProcessedStudentData[] = [];
  const invalid: Array<{ data: ProcessedStudentData; errors: string[] }> = [];

  data.forEach(student => {
    const errors: string[] = [];

    // Validate required fields
    if (!student.first_name?.trim()) errors.push('First name is required');
    if (!student.last_name?.trim()) errors.push('Last name is required');
    if (!student.email?.trim()) errors.push('Email is required');
    if (!student.grade_level?.trim()) errors.push('Grade level is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (student.email && !emailRegex.test(student.email)) {
      errors.push('Invalid email format');
    }

    // Validate guardian emails
    if (student.guardian1_email && !emailRegex.test(student.guardian1_email)) {
      errors.push('Invalid guardian 1 email format');
    }
    if (student.guardian2_email && !emailRegex.test(student.guardian2_email)) {
      errors.push('Invalid guardian 2 email format');
    }

    // Validate grade level
    const validGrades = [
      'PK3', 'PK4', 'PK5', 'KG',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
      'PostGraduate', 'Ungraded', 'Other'
    ];
    if (student.grade_level && !validGrades.includes(student.grade_level)) {
      errors.push(`Invalid grade level: ${student.grade_level}`);
    }

    // Validate GPA if provided
    if (student.current_gpa !== undefined && (student.current_gpa < 0 || student.current_gpa > 4)) {
      errors.push('GPA must be between 0 and 4');
    }

    if (errors.length === 0) {
      valid.push(student);
    } else {
      invalid.push({ data: student, errors });
    }
  });

  return { valid, invalid };
}