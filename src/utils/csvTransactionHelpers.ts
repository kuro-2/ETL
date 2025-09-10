import { supabase } from '../lib/supabase';

/**
 * Transaction helper functions for CSV processing
 */

export interface TransactionContext {
  id: string;
  startTime: Date;
}

/**
 * Begin a new transaction
 */
export async function beginTransaction(): Promise<TransactionContext> {
  const transactionId = crypto.randomUUID();
  const startTime = new Date();
  
  // Note: Supabase handles transactions automatically for single operations
  // For batch operations, we'll use a different approach
  
  return {
    id: transactionId,
    startTime
  };
}

/**
 * Commit transaction (placeholder for future implementation)
 */
export async function commitTransaction(context: TransactionContext): Promise<void> {
  // Supabase auto-commits single operations
  // For complex transactions, we would implement custom logic here
  console.log(`Transaction ${context.id} committed after ${Date.now() - context.startTime.getTime()}ms`);
}

/**
 * Rollback transaction (placeholder for future implementation)
 */
export async function rollbackTransaction(context: TransactionContext): Promise<void> {
  // Supabase auto-rollbacks on errors
  // For complex transactions, we would implement custom logic here
  console.log(`Transaction ${context.id} rolled back after ${Date.now() - context.startTime.getTime()}ms`);
}

/**
 * Execute multiple operations in a batch with error handling
 */
export async function executeBatch<T>(
  operations: Array<() => Promise<T>>,
  options: {
    continueOnError?: boolean;
    maxConcurrency?: number;
  } = {}
): Promise<{
  results: Array<{ success: boolean; data?: T; error?: string }>;
  totalSuccess: number;
  totalErrors: number;
}> {
  const { continueOnError = true, maxConcurrency = 5 } = options;
  const results: Array<{ success: boolean; data?: T; error?: string }> = [];
  
  // Process operations in chunks to avoid overwhelming the database
  const chunks = [];
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    chunks.push(operations.slice(i, i + maxConcurrency));
  }

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (operation, index) => {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (!continueOnError) {
          throw error;
        }
        return { success: false, error: errorMessage };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  const totalSuccess = results.filter(r => r.success).length;
  const totalErrors = results.filter(r => !r.success).length;

  return {
    results,
    totalSuccess,
    totalErrors
  };
}

/**
 * Check if a student exists by school_student_id
 */
export async function checkStudentExists(schoolStudentId: string): Promise<{
  exists: boolean;
  studentId?: string;
  data?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, school_student_id, first_name, last_name, updated_at')
      .eq('school_student_id', schoolStudentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return { exists: false };
      }
      throw error;
    }

    return {
      exists: true,
      studentId: data.student_id,
      data
    };
  } catch (error) {
    throw new Error(`Failed to check student existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Bulk check if multiple students exist
 */
export async function bulkCheckStudentsExist(schoolStudentIds: string[]): Promise<Map<string, {
  exists: boolean;
  studentId?: string;
  data?: any;
}>> {
  const resultMap = new Map<string, { exists: boolean; studentId?: string; data?: any }>();

  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, school_student_id, first_name, last_name, updated_at')
      .in('school_student_id', schoolStudentIds);

    if (error) {
      throw error;
    }

    // Initialize all as not existing
    schoolStudentIds.forEach(id => {
      resultMap.set(id, { exists: false });
    });

    // Update with existing students
    data?.forEach(student => {
      resultMap.set(student.school_student_id, {
        exists: true,
        studentId: student.student_id,
        data: student
      });
    });

    return resultMap;
  } catch (error) {
    throw new Error(`Failed to bulk check students: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Log processing activity for audit trail
 */
export async function logProcessingActivity(activity: {
  operation: 'insert' | 'update' | 'skip' | 'error';
  studentId?: string;
  schoolStudentId?: string;
  details: Record<string, unknown>;
  timestamp?: Date;
}): Promise<void> {
  const logEntry = {
    ...activity,
    timestamp: activity.timestamp || new Date(),
    session_id: crypto.randomUUID()
  };

  // In a production system, you would store this in an audit log table
  console.log('CSV Processing Activity:', logEntry);
}