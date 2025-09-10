/**
 * Student data validation utilities
 */

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  message: string;
  validator?: (value: unknown) => boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

// Validation rules for student data
export const STUDENT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'school_student_id',
    type: 'required',
    message: 'School Student ID is required'
  },
  {
    field: 'first_name',
    type: 'required',
    message: 'First name is required'
  },
  {
    field: 'last_name',
    type: 'required',
    message: 'Last name is required'
  },
  {
    field: 'first_name',
    type: 'format',
    message: 'First name must be at least 1 character',
    validator: (value) => typeof value === 'string' && value.trim().length >= 1
  },
  {
    field: 'last_name',
    type: 'format',
    message: 'Last name must be at least 1 character',
    validator: (value) => typeof value === 'string' && value.trim().length >= 1
  },
  {
    field: 'grade_level',
    type: 'range',
    message: 'Grade level must be between -1 and 13',
    min: -1, // Pre-K
    max: 13  // Post-graduate
  },
  {
    field: 'current_gpa',
    type: 'range',
    message: 'GPA must be between 0.00 and 4.00',
    min: 0.00,
    max: 4.00
  },
  {
    field: 'graduation_year',
    type: 'range',
    message: 'Graduation year must be between 1900 and 2100',
    min: 1900,
    max: 2100
  },
  {
    field: 'dob',
    type: 'custom',
    message: 'Date of birth must be a valid date and not in the future',
    validator: (value) => {
      if (!value) return true; // Optional field
      const date = new Date(String(value));
      return !isNaN(date.getTime()) && date <= new Date();
    }
  },
  {
    field: 'enrollment_date',
    type: 'custom',
    message: 'Enrollment date must be a valid date',
    validator: (value) => {
      if (!value) return true; // Optional field
      const date = new Date(String(value));
      return !isNaN(date.getTime());
    }
  },
  {
    field: 'emergency_contact_phone',
    type: 'format',
    message: 'Phone number format is invalid',
    pattern: /^[\+]?[1-9][\d]{0,15}$/ // Basic international phone format
  },
  {
    field: 'academic_status',
    type: 'custom',
    message: 'Academic status must be one of: active, inactive, graduated, transferred, withdrawn',
    validator: (value) => {
      if (!value) return true; // Optional field, will use default
      const validStatuses = ['active', 'inactive', 'graduated', 'transferred', 'withdrawn'];
      return validStatuses.includes(String(value).toLowerCase());
    }
  }
];

export class StudentDataValidator {
  private rules: ValidationRule[];

  constructor(customRules?: ValidationRule[]) {
    this.rules = customRules || STUDENT_VALIDATION_RULES;
  }

  /**
   * Validate a single student record
   */
  public validateStudent(studentData: Record<string, unknown>): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: unknown }> = [];
    const warnings: Array<{ field: string; message: string; value?: unknown }> = [];

    this.rules.forEach(rule => {
      const value = studentData[rule.field];
      const isValid = this.validateField(value, rule);

      if (!isValid) {
        if (rule.type === 'required' && (value === null || value === undefined || value === '')) {
          errors.push({
            field: rule.field,
            message: rule.message,
            value
          });
        } else if (value !== null && value !== undefined && value !== '') {
          // Only validate format/range if value is present
          errors.push({
            field: rule.field,
            message: rule.message,
            value
          });
        }
      }
    });

    // Additional business logic validations
    this.validateBusinessRules(studentData, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple student records
   */
  public validateStudents(studentsData: Record<string, unknown>[]): {
    overallValid: boolean;
    results: Array<ValidationResult & { rowIndex: number }>;
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      totalErrors: number;
      totalWarnings: number;
    };
  } {
    const results = studentsData.map((studentData, index) => ({
      ...this.validateStudent(studentData),
      rowIndex: index + 1
    }));

    const validRows = results.filter(r => r.isValid).length;
    const invalidRows = results.filter(r => !r.isValid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
      overallValid: invalidRows === 0,
      results,
      summary: {
        totalRows: studentsData.length,
        validRows,
        invalidRows,
        totalErrors,
        totalWarnings
      }
    };
  }

  /**
   * Validate a single field against a rule
   */
  private validateField(value: unknown, rule: ValidationRule): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      
      case 'format':
        if (value === null || value === undefined || value === '') return true;
        if (rule.pattern) {
          return rule.pattern.test(String(value));
        }
        if (rule.validator) {
          return rule.validator(value);
        }
        return true;
      
      case 'range':
        if (value === null || value === undefined || value === '') return true;
        const numValue = Number(value);
        if (isNaN(numValue)) return false;
        if (rule.min !== undefined && numValue < rule.min) return false;
        if (rule.max !== undefined && numValue > rule.max) return false;
        return true;
      
      case 'custom':
        if (rule.validator) {
          return rule.validator(value);
        }
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    studentData: Record<string, unknown>,
    errors: Array<{ field: string; message: string; value?: unknown }>,
    warnings: Array<{ field: string; message: string; value?: unknown }>
  ): void {
    // Check if graduation year is consistent with grade level
    const gradeLevel = studentData.grade_level as number;
    const graduationYear = studentData.graduation_year as number;
    const currentYear = new Date().getFullYear();

    if (gradeLevel && graduationYear) {
      const expectedGraduationYear = currentYear + (12 - gradeLevel);
      const yearDifference = Math.abs(graduationYear - expectedGraduationYear);
      
      if (yearDifference > 2) {
        warnings.push({
          field: 'graduation_year',
          message: `Graduation year ${graduationYear} seems inconsistent with grade level ${gradeLevel}`,
          value: graduationYear
        });
      }
    }

    // Check if enrollment date is reasonable
    const enrollmentDate = studentData.enrollment_date;
    if (enrollmentDate) {
      const enrollDate = new Date(String(enrollmentDate));
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (enrollDate < oneYearAgo || enrollDate > oneYearFromNow) {
        warnings.push({
          field: 'enrollment_date',
          message: 'Enrollment date is more than a year in the past or future',
          value: enrollmentDate
        });
      }
    }

    // Check if DOB is reasonable for grade level
    const dob = studentData.dob;
    if (dob && gradeLevel !== null && gradeLevel !== undefined) {
      const birthDate = new Date(String(dob));
      const age = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      // Typical age ranges for grades
      const expectedAge = gradeLevel <= 0 ? 5 : gradeLevel + 5; // Kindergarten = age 5, 1st grade = age 6, etc.
      const ageDifference = Math.abs(age - expectedAge);
      
      if (ageDifference > 3) {
        warnings.push({
          field: 'dob',
          message: `Age (${Math.round(age)}) seems inconsistent with grade level ${gradeLevel}`,
          value: dob
        });
      }
    }

    // Validate emergency contact information consistency
    const contactName = studentData.emergency_contact_name;
    const contactPhone = studentData.emergency_contact_phone;
    const contactRelationship = studentData.emergency_contact_relationship;

    if ((contactName || contactPhone || contactRelationship) && 
        !(contactName && (contactPhone || contactRelationship))) {
      warnings.push({
        field: 'emergency_contact_name',
        message: 'Incomplete emergency contact information',
        value: contactName
      });
    }
  }

  /**
   * Add custom validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule
   */
  public removeRule(field: string, type: string): void {
    this.rules = this.rules.filter(rule => !(rule.field === field && rule.type === type));
  }

  /**
   * Get all validation rules
   */
  public getRules(): ValidationRule[] {
    return [...this.rules];
  }
}

// Export default validator instance
export const studentValidator = new StudentDataValidator();

// Utility functions
export const validateStudentData = (studentData: Record<string, unknown>) => {
  return studentValidator.validateStudent(studentData);
};

export const validateMultipleStudents = (studentsData: Record<string, unknown>[]) => {
  return studentValidator.validateStudents(studentsData);
};