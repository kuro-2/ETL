// Assessment Types and Interfaces

export type AssessmentSource = 'linkit' | 'genesis' | 'njsla_direct' | 'generic';

export type NJSLASubject = 'ELA' | 'Mathematics' | 'Science';

export interface NJSLAPerformanceLevel {
  level: number;
  minScore: number;
  maxScore: number;
  description: string;
}

export interface NJSLAScoreRange {
  minScore: number;
  maxScore: number;
  performanceLevels: NJSLAPerformanceLevel[];
}

export interface NJSLAGradeConfig {
  [grade: string]: {
    [subject in NJSLASubject]?: NJSLAScoreRange;
  };
}

export interface StudentInfo {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  race?: string;
  gender?: string;
  age?: string;
  zipCode?: string;
  homeLanguage?: string;
  ethnicity?: string;
  nativeCountry?: string;
  timeInDistrict?: string;
  timeInSchool?: string;
  schoolStudentId?: string;
  studentLookupStatus?: string;
}

export interface NJSLAAssessmentResult {
  studentId: string;
  assessmentId: string;
  assessmentType: string;
  subject: NJSLASubject;
  gradeLevel: string;
  schoolYear?: string;
  testDate: Date;
  rawScore?: number;
  scaleScore: number;
  performanceLevelText: string;
  minPossibleScore: string;
  maxPossibleScore: string;
  studentGrowthPercentile?: number;
  subscores?: any;
  unprocessedData?: any;
  completedAt: Date;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  transformer?: (value: any) => any;
  validator?: (value: any) => boolean;
  defaultValue?: any;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    studentsFound: number;
    assessmentsFound: number;
    subjectsFound: string[];
    gradesFound: string[];
  };
}

export interface ProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  message: string;
}

export interface GenericAssessmentData {
  studentId: string;
  studentName: string;
  assessmentName: string;
  assessmentDate: string;
  questionId: string;
  studentAnswer: string;
  correctAnswer: string;
  pointsEarned: number;
  maxPoints: number;
  subject: string;
  grade: string;
  scaleScore: number;
  performanceLevelText: string;
  testDate: string;
  gradeLevel: string;
  assessmentType: string;
}