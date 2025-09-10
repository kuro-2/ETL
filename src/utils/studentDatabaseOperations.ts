import { supabase } from '../lib/supabase';
import { ProcessedStudentData } from './studentCsvProcessor';

/**
 * Database operations for student records
 */

export interface StudentUpsertResult {
  success: boolean;
  operation: 'insert' | 'update' | 'skip';
  studentId?: string;
  error?: string;
  warnings?: string[];
}

export interface BulkUpsertResult {
  totalProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    data?: ProcessedStudentData;
  }>;
  warnings: Array<{
    row: number;
    warning: string;
    data?: ProcessedStudentData;
  }>;
}

/**
 * Check if student exists by school_student_id
 */
export async function checkStudentExists(schoolStudentId: string): Promise<{
  exists: boolean;
  studentId?: string;
  currentData?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, school_student_id, first_name, last_name, updated_at, special_needs')
      .eq('school_student_id', schoolStudentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { exists: false };
      }
      throw error;
    }

    return {
      exists: true,
      studentId: data.student_id,
      currentData: data
    };
  } catch (error) {
    throw new Error(`Failed to check student existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Insert new student record
 */
export async function insertStudent(studentData: ProcessedStudentData): Promise<StudentUpsertResult> {
  try {
    // Validate required fields
    if (!studentData.school_student_id || !studentData.first_name || !studentData.last_name) {
      return {
        success: false,
        operation: 'skip',
        error: 'Missing required fields: school_student_id, first_name, or last_name'
      };
    }

    // Generate UUID for student_id
    const studentId = crypto.randomUUID();
    
    // Prepare insert data
    const insertData = {
      student_id: studentId,
      school_student_id: studentData.school_student_id,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      dob: studentData.dob || null,
      grade_level: studentData.grade_level || null,
      enrollment_date: studentData.enrollment_date || null,
      graduation_year: studentData.graduation_year || null,
      emergency_contact_name: studentData.emergency_contact_name || null,
      emergency_contact_phone: studentData.emergency_contact_phone || null,
      emergency_contact_relationship: studentData.emergency_contact_relationship || null,
      current_gpa: studentData.current_gpa || null,
      academic_status: studentData.academic_status || 'active',
      special_needs: studentData.special_needs || {},
      school_id: studentData.school_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('students')
      .insert(insertData)
      .select('student_id')
      .single();

    if (error) {
      return {
        success: false,
        operation: 'insert',
        error: `Insert failed: ${error.message}`
      };
    }

    return {
      success: true,
      operation: 'insert',
      studentId: data.student_id
    };
  } catch (error) {
    return {
      success: false,
      operation: 'insert',
      error: error instanceof Error ? error.message : 'Unknown error during insert'
    };
  }
}

/**
 * Update existing student record
 */
export async function updateStudent(
  studentId: string,
  newData: ProcessedStudentData,
  existingData: any,
  options: {
    allowPartialUpdates?: boolean;
    mergeSpecialNeeds?: boolean;
  } = {}
): Promise<StudentUpsertResult> {
  const { allowPartialUpdates = true, mergeSpecialNeeds = true } = options;
  const warnings: string[] = [];

  try {
    // Prepare update data
    const updateData: Partial<ProcessedStudentData> & { updated_at: string } = {
      updated_at: new Date().toISOString()
    };

    let hasChanges = false;

    // Compare and update each field
    const fieldsToCheck = [
      'first_name', 'last_name', 'dob', 'grade_level', 'enrollment_date',
      'graduation_year', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relationship', 'current_gpa', 'academic_status'
    ];

    fieldsToCheck.forEach(field => {
      const newValue = (newData as any)[field];
      const existingValue = existingData[field];

      if (newValue !== null && newValue !== undefined && newValue !== '') {
        if (newValue !== existingValue) {
          (updateData as any)[field] = newValue;
          hasChanges = true;
        }
      } else if (!allowPartialUpdates && existingValue !== null) {
        // Only set to null if not allowing partial updates and there was a previous value
        (updateData as any)[field] = null;
        hasChanges = true;
        warnings.push(`Field ${field} was cleared (set to null)`);
      }
    });

    // Handle special_needs separately
    if (newData.special_needs && Object.keys(newData.special_needs).length > 0) {
      if (mergeSpecialNeeds) {
        // Merge with existing special_needs
        const existingSpecialNeeds = existingData.special_needs || {};
        const mergedSpecialNeeds = { ...existingSpecialNeeds, ...newData.special_needs };
        
        // Check if special_needs actually changed
        if (JSON.stringify(mergedSpecialNeeds) !== JSON.stringify(existingSpecialNeeds)) {
          updateData.special_needs = mergedSpecialNeeds;
          hasChanges = true;
        }
      } else {
        // Replace special_needs entirely
        if (JSON.stringify(newData.special_needs) !== JSON.stringify(existingData.special_needs)) {
          updateData.special_needs = newData.special_needs;
          hasChanges = true;
        }
      }
    }

    // Handle school_id update
    if (newData.school_id && newData.school_id !== existingData.school_id) {
      updateData.school_id = newData.school_id;
      hasChanges = true;
    }

    if (!hasChanges) {
      return {
        success: true,
        operation: 'skip',
        studentId,
        warnings: ['No changes detected, record was not updated']
      };
    }

    // Perform update
    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('student_id', studentId);

    if (error) {
      return {
        success: false,
        operation: 'update',
        error: `Update failed: ${error.message}`
      };
    }

    return {
      success: true,
      operation: 'update',
      studentId,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return {
      success: false,
      operation: 'update',
      error: error instanceof Error ? error.message : 'Unknown error during update'
    };
  }
}

/**
 * Upsert student record (insert or update)
 */
export async function upsertStudent(
  studentData: ProcessedStudentData,
  options: {
    allowPartialUpdates?: boolean;
    mergeSpecialNeeds?: boolean;
  } = {}
): Promise<StudentUpsertResult> {
  try {
    // Check if student exists
    const existenceCheck = await checkStudentExists(studentData.school_student_id);
    
    if (existenceCheck.exists && existenceCheck.studentId) {
      // Update existing student
      return await updateStudent(
        existenceCheck.studentId,
        studentData,
        existenceCheck.currentData,
        options
      );
    } else {
      // Insert new student
      return await insertStudent(studentData);
    }
  } catch (error) {
    return {
      success: false,
      operation: 'skip',
      error: error instanceof Error ? error.message : 'Unknown error during upsert'
    };
  }
}

/**
 * Bulk upsert student records with transaction support
 */
export async function bulkUpsertStudents(
  studentsData: ProcessedStudentData[],
  options: {
    batchSize?: number;
    allowPartialUpdates?: boolean;
    mergeSpecialNeeds?: boolean;
    continueOnError?: boolean;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<BulkUpsertResult> {
  const {
    batchSize = 25,
    allowPartialUpdates = true,
    mergeSpecialNeeds = true,
    continueOnError = true,
    onProgress
  } = options;

  const result: BulkUpsertResult = {
    totalProcessed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: []
  };

  // Process in batches to avoid overwhelming the database
  const batches = [];
  for (let i = 0; i < studentsData.length; i += batchSize) {
    batches.push(studentsData.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      // Process each student in the batch
      for (let studentIndex = 0; studentIndex < batch.length; studentIndex++) {
        const studentData = batch[studentIndex];
        const globalRowIndex = batchIndex * batchSize + studentIndex + 1;

        try {
          const upsertResult = await upsertStudent(studentData, {
            allowPartialUpdates,
            mergeSpecialNeeds
          });

          if (upsertResult.success) {
            switch (upsertResult.operation) {
              case 'insert':
                result.inserted++;
                break;
              case 'update':
                result.updated++;
                break;
              case 'skip':
                result.skipped++;
                break;
            }

            if (upsertResult.warnings) {
              result.warnings.push({
                row: globalRowIndex,
                warning: upsertResult.warnings.join('; '),
                data: studentData
              });
            }
          } else {
            result.errors.push({
              row: globalRowIndex,
              error: upsertResult.error || 'Unknown error',
              data: studentData
            });

            if (!continueOnError) {
              throw new Error(`Processing stopped at row ${globalRowIndex}: ${upsertResult.error}`);
            }
          }

          result.totalProcessed++;

          // Report progress
          if (onProgress) {
            onProgress(result.totalProcessed, studentsData.length);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            row: globalRowIndex,
            error: errorMessage,
            data: studentData
          });

          if (!continueOnError) {
            throw error;
          }
        }
      }

      // Small delay between batches to prevent overwhelming the database
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      if (!continueOnError) {
        throw error;
      }
    }
  }

  return result;
}

/**
 * Get student statistics for a school
 */
export async function getStudentStatistics(schoolId?: string): Promise<{
  totalStudents: number;
  byGrade: Record<string, number>;
  byStatus: Record<string, number>;
  recentEnrollments: number;
}> {
  try {
    let query = supabase.from('students').select('grade_level, academic_status, enrollment_date');
    
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const stats = {
      totalStudents: data?.length || 0,
      byGrade: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recentEnrollments: 0
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    data?.forEach(student => {
      // Count by grade
      const grade = student.grade_level?.toString() || 'Unknown';
      stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;

      // Count by status
      const status = student.academic_status || 'Unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count recent enrollments
      if (student.enrollment_date) {
        const enrollmentDate = new Date(student.enrollment_date);
        if (enrollmentDate >= thirtyDaysAgo) {
          stats.recentEnrollments++;
        }
      }
    });

    return stats;
  } catch (error) {
    throw new Error(`Failed to get student statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find potential duplicate students
 */
export async function findPotentialDuplicates(
  firstName: string,
  lastName: string,
  dob?: string,
  schoolId?: string
): Promise<Array<{
  student_id: string;
  school_student_id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  match_reason: string;
}>> {
  try {
    let query = supabase
      .from('students')
      .select('student_id, school_student_id, first_name, last_name, dob');

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const duplicates: Array<{
      student_id: string;
      school_student_id: string;
      first_name: string;
      last_name: string;
      dob?: string;
      match_reason: string;
    }> = [];

    data?.forEach(student => {
      const reasons: string[] = [];

      // Exact name match
      if (student.first_name.toLowerCase() === firstName.toLowerCase() &&
          student.last_name.toLowerCase() === lastName.toLowerCase()) {
        reasons.push('Exact name match');
      }

      // DOB match
      if (dob && student.dob && student.dob === dob) {
        reasons.push('Date of birth match');
      }

      // Similar name match (fuzzy)
      const firstNameSimilar = this.calculateSimilarity(student.first_name, firstName) > 0.8;
      const lastNameSimilar = this.calculateSimilarity(student.last_name, lastName) > 0.8;
      
      if (firstNameSimilar && lastNameSimilar) {
        reasons.push('Similar name match');
      }

      if (reasons.length > 0) {
        duplicates.push({
          ...student,
          match_reason: reasons.join(', ')
        });
      }
    });

    return duplicates;
  } catch (error) {
    throw new Error(`Failed to find duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate string similarity (simple implementation)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Archive student record (soft delete)
 */
export async function archiveStudent(studentId: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const archiveData = {
      academic_status: 'archived',
      updated_at: new Date().toISOString(),
      special_needs: {
        archived_at: new Date().toISOString(),
        archive_reason: reason || 'Manual archive'
      }
    };

    const { error } = await supabase
      .from('students')
      .update(archiveData)
      .eq('student_id', studentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during archive'
    };
  }
}

/**
 * Restore archived student record
 */
export async function restoreStudent(studentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get current special_needs to remove archive information
    const { data: currentData, error: fetchError } = await supabase
      .from('students')
      .select('special_needs')
      .eq('student_id', studentId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const specialNeeds = { ...currentData.special_needs };
    delete specialNeeds.archived_at;
    delete specialNeeds.archive_reason;

    const restoreData = {
      academic_status: 'active',
      updated_at: new Date().toISOString(),
      special_needs: specialNeeds
    };

    const { error } = await supabase
      .from('students')
      .update(restoreData)
      .eq('student_id', studentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during restore'
    };
  }
}