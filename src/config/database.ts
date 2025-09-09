import { supabase } from '../lib/supabase';

export class DatabaseService {
  /**
   * Store raw assessment data
   */
  async storeRawAssessment(rawRecord: any): Promise<any> {
    const { data, error } = await supabase
      .from('assessment_raw_uploads')
      .insert(rawRecord)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Store processed assessment data
   */
  async storeProcessedAssessments(assessmentRecords: any[]): Promise<any> {
    const { data, error } = await supabase
      .from('assessment_external_processed')
      .insert(assessmentRecords)
      .select('id');

    if (error) throw error;
    return data;
  }

  /**
   * Look up student by school_student_id
   */
  async lookupStudentBySchoolId(schoolStudentId: string): Promise<any> {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, first_name, last_name, grade_level')
      .eq('school_student_id', schoolStudentId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Bulk lookup students by school_student_ids
   */
  async bulkLookupStudents(schoolStudentIds: string[]): Promise<any[]> {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, school_student_id, first_name, last_name, grade_level')
      .in('school_student_id', schoolStudentIds);

    if (error) throw error;
    return data || [];
  }
}

export const databaseService = new DatabaseService();