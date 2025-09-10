import { supabase } from '../lib/supabase';

// Types for CSV processing
export interface CSVStudentRow {
  [key: string]: string | number | null;
}

export interface ProcessedStudentData {
  student_id?: string;
  school_student_id: string;
  first_name: string;
  last_name: string;
  dob?: string | null;
  grade_level?: number | null;
  enrollment_date?: string | null;
  graduation_year?: number | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  current_gpa?: number | null;
  academic_status?: string | null;
  special_needs?: Record<string, unknown>;
  school_id?: string;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  unmatchedColumns: string[];
}

export interface ProcessingError {
  row: number;
  field?: string;
  message: string;
  data?: CSVStudentRow;
}

export interface ProcessingWarning {
  row: number;
  field?: string;
  message: string;
  data?: CSVStudentRow;
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  required: boolean;
  dataType: 'text' | 'integer' | 'numeric' | 'date' | 'jsonb';
  defaultValue?: unknown;
}

// Default column mappings based on common CSV formats
export const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  { csvColumn: 'Student ID', dbColumn: 'school_student_id', required: true, dataType: 'text' },
  { csvColumn: 'First Name', dbColumn: 'first_name', required: true, dataType: 'text' },
  { csvColumn: 'Last Name', dbColumn: 'last_name', required: true, dataType: 'text' },
  { csvColumn: 'dob', dbColumn: 'dob', required: false, dataType: 'date' },
  { csvColumn: 'Grade', dbColumn: 'grade_level', required: false, dataType: 'integer' },
  { csvColumn: 'enrollment date', dbColumn: 'enrollment_date', required: false, dataType: 'date' },
  { csvColumn: 'graduation year', dbColumn: 'graduation_year', required: false, dataType: 'integer' },
  { csvColumn: 'contact', dbColumn: 'emergency_contact_name', required: false, dataType: 'text' },
  { csvColumn: 'phone', dbColumn: 'emergency_contact_phone', required: false, dataType: 'text' },
  { csvColumn: 'guardian', dbColumn: 'emergency_contact_relationship', required: false, dataType: 'text' },
  { csvColumn: 'gpa', dbColumn: 'current_gpa', required: false, dataType: 'numeric' },
  { csvColumn: 'academic_status', dbColumn: 'academic_status', required: false, dataType: 'text', defaultValue: 'active' }
];

export class StudentCSVProcessor {
  private columnMappings: ColumnMapping[];
  private schoolId?: string;

  constructor(columnMappings?: ColumnMapping[], schoolId?: string) {
    this.columnMappings = columnMappings || DEFAULT_COLUMN_MAPPINGS;
    this.schoolId = schoolId;
  }

  /**
   * Auto-detect column mappings from CSV headers
   */
  public detectColumnMappings(csvHeaders: string[]): ColumnMapping[] {
    const detectedMappings: ColumnMapping[] = [];
    const unmatchedHeaders: string[] = [];

    // Normalize headers for better matching
    const normalizeHeader = (header: string): string => {
      return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    };

    // Create a map of normalized default mappings
    const defaultMappingMap = new Map<string, ColumnMapping>();
    DEFAULT_COLUMN_MAPPINGS.forEach(mapping => {
      defaultMappingMap.set(normalizeHeader(mapping.csvColumn), mapping);
    });

    // Try to match each CSV header
    csvHeaders.forEach(header => {
      const normalizedHeader = normalizeHeader(header);
      const mapping = defaultMappingMap.get(normalizedHeader);
      
      if (mapping) {
        detectedMappings.push({
          ...mapping,
          csvColumn: header // Use original header case
        });
      } else {
        unmatchedHeaders.push(header);
      }
    });

    // Add any required mappings that weren't found
    DEFAULT_COLUMN_MAPPINGS.forEach(defaultMapping => {
      if (defaultMapping.required && !detectedMappings.some(m => m.dbColumn === defaultMapping.dbColumn)) {
        detectedMappings.push({
          ...defaultMapping,
          csvColumn: '' // Will need manual mapping
        });
      }
    });

    return detectedMappings;
  }

  /**
   * Validate CSV data against column mappings
   */
  public validateCSVData(csvData: CSVStudentRow[], columnMappings: ColumnMapping[]): {
    errors: ProcessingError[];
    warnings: ProcessingWarning[];
  } {
    const errors: ProcessingError[] = [];
    const warnings: ProcessingWarning[] = [];

    csvData.forEach((row, index) => {
      const rowNumber = index + 1;

      // Check required fields
      columnMappings.forEach(mapping => {
        if (mapping.required && mapping.csvColumn) {
          const value = row[mapping.csvColumn];
          
          if (value === null || value === undefined || value === '') {
            if (mapping.defaultValue !== undefined) {
              warnings.push({
                row: rowNumber,
                field: mapping.dbColumn,
                message: `Missing value for ${mapping.dbColumn}, will use default: ${mapping.defaultValue}`,
                data: row
              });
            } else {
              errors.push({
                row: rowNumber,
                field: mapping.dbColumn,
                message: `Missing required field: ${mapping.dbColumn}`,
                data: row
              });
            }
          }
        }
      });

      // Validate data types
      columnMappings.forEach(mapping => {
        if (mapping.csvColumn && row[mapping.csvColumn] !== null && row[mapping.csvColumn] !== undefined && row[mapping.csvColumn] !== '') {
          const value = row[mapping.csvColumn];
          const isValid = this.validateDataType(value, mapping.dataType);
          
          if (!isValid) {
            errors.push({
              row: rowNumber,
              field: mapping.dbColumn,
              message: `Invalid ${mapping.dataType} value for ${mapping.dbColumn}: ${value}`,
              data: row
            });
          }
        }
      });

      // Check for duplicate school_student_id within the CSV
      const schoolStudentId = this.getValueFromRow(row, 'school_student_id', columnMappings);
      if (schoolStudentId) {
        const duplicateRows = csvData.filter((otherRow, otherIndex) => 
          otherIndex !== index && 
          this.getValueFromRow(otherRow, 'school_student_id', columnMappings) === schoolStudentId
        );
        
        if (duplicateRows.length > 0) {
          errors.push({
            row: rowNumber,
            field: 'school_student_id',
            message: `Duplicate school_student_id found: ${schoolStudentId}`,
            data: row
          });
        }
      }
    });

    return { errors, warnings };
  }

  /**
   * Process CSV data and perform upsert operations
   */
  public async processCSVData(
    csvData: CSVStudentRow[], 
    columnMappings: ColumnMapping[],
    options: {
      skipInvalidRows?: boolean;
      allowPartialUpdates?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<ProcessingResult> {
    const { skipInvalidRows = true, allowPartialUpdates = true, batchSize = 50 } = options;
    
    const result: ProcessingResult = {
      success: false,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      unmatchedColumns: []
    };

    // Validate data first
    const validation = this.validateCSVData(csvData, columnMappings);
    result.errors = validation.errors;
    result.warnings = validation.warnings;

    // Find unmatched columns
    const mappedColumns = new Set(columnMappings.map(m => m.csvColumn).filter(Boolean));
    const csvHeaders = csvData.length > 0 ? Object.keys(csvData[0]) : [];
    result.unmatchedColumns = csvHeaders.filter(header => !mappedColumns.has(header));

    // Process data in batches
    const batches = this.createBatches(csvData, batchSize);
    
    for (const batch of batches) {
      try {
        const batchResult = await this.processBatch(batch, columnMappings, {
          skipInvalidRows,
          allowPartialUpdates,
          startRowNumber: result.processed + 1
        });

        result.processed += batchResult.processed;
        result.inserted += batchResult.inserted;
        result.updated += batchResult.updated;
        result.skipped += batchResult.skipped;
        result.errors.push(...batchResult.errors);
        result.warnings.push(...batchResult.warnings);
      } catch (error) {
        result.errors.push({
          row: result.processed + 1,
          message: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        break;
      }
    }

    result.success = result.errors.length === 0 || (skipInvalidRows && result.processed > 0);
    return result;
  }

  /**
   * Process a batch of CSV rows
   */
  private async processBatch(
    batch: CSVStudentRow[],
    columnMappings: ColumnMapping[],
    options: {
      skipInvalidRows: boolean;
      allowPartialUpdates: boolean;
      startRowNumber: number;
    }
  ): Promise<Omit<ProcessingResult, 'unmatchedColumns' | 'success'>> {
    const result = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [] as ProcessingError[],
      warnings: [] as ProcessingWarning[]
    };

    // Start transaction
    const { data: transaction, error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) {
      throw new Error(`Failed to start transaction: ${transactionError.message}`);
    }

    try {
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNumber = options.startRowNumber + i;

        try {
          const processedData = this.transformRowToStudentData(row, columnMappings);
          
          // Validate required fields
          if (!processedData.school_student_id || !processedData.first_name || !processedData.last_name) {
            if (options.skipInvalidRows) {
              result.skipped++;
              result.warnings.push({
                row: rowNumber,
                message: 'Skipped row due to missing required fields',
                data: row
              });
              continue;
            } else {
              throw new Error('Missing required fields: school_student_id, first_name, or last_name');
            }
          }

          // Check if student exists
          const { data: existingStudent, error: lookupError } = await supabase
            .from('students')
            .select('student_id, school_student_id, updated_at')
            .eq('school_student_id', processedData.school_student_id)
            .single();

          if (lookupError && lookupError.code !== 'PGRST116') {
            throw new Error(`Database lookup failed: ${lookupError.message}`);
          }

          if (existingStudent) {
            // Update existing student
            const updateResult = await this.updateExistingStudent(
              existingStudent.student_id,
              processedData,
              options.allowPartialUpdates
            );
            
            if (updateResult.success) {
              result.updated++;
              if (updateResult.warnings) {
                result.warnings.push(...updateResult.warnings.map(w => ({ ...w, row: rowNumber })));
              }
            } else {
              throw new Error(updateResult.error || 'Update failed');
            }
          } else {
            // Insert new student
            const insertResult = await this.insertNewStudent(processedData);
            
            if (insertResult.success) {
              result.inserted++;
              if (insertResult.warnings) {
                result.warnings.push(...insertResult.warnings.map(w => ({ ...w, row: rowNumber })));
              }
            } else {
              throw new Error(insertResult.error || 'Insert failed');
            }
          }

          result.processed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (options.skipInvalidRows) {
            result.skipped++;
            result.errors.push({
              row: rowNumber,
              message: errorMessage,
              data: row
            });
          } else {
            throw error;
          }
        }
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        throw new Error(`Failed to commit transaction: ${commitError.message}`);
      }

    } catch (error) {
      // Rollback transaction
      await supabase.rpc('rollback_transaction');
      throw error;
    }

    return result;
  }

  /**
   * Transform CSV row to student data structure
   */
  private transformRowToStudentData(row: CSVStudentRow, columnMappings: ColumnMapping[]): ProcessedStudentData {
    const studentData: ProcessedStudentData = {
      school_student_id: '',
      first_name: '',
      last_name: '',
      special_needs: {}
    };

    const mappedColumns = new Set<string>();

    // Process mapped columns
    columnMappings.forEach(mapping => {
      if (mapping.csvColumn && row.hasOwnProperty(mapping.csvColumn)) {
        const rawValue = row[mapping.csvColumn];
        const transformedValue = this.transformValue(rawValue, mapping.dataType, mapping.defaultValue);
        
        (studentData as any)[mapping.dbColumn] = transformedValue;
        mappedColumns.add(mapping.csvColumn);
      } else if (mapping.required && mapping.defaultValue !== undefined) {
        (studentData as any)[mapping.dbColumn] = mapping.defaultValue;
      }
    });

    // Add unmapped columns to special_needs
    Object.keys(row).forEach(csvColumn => {
      if (!mappedColumns.has(csvColumn) && row[csvColumn] !== null && row[csvColumn] !== undefined && row[csvColumn] !== '') {
        if (!studentData.special_needs) {
          studentData.special_needs = {};
        }
        studentData.special_needs[csvColumn] = row[csvColumn];
      }
    });

    // Set school_id if provided
    if (this.schoolId) {
      studentData.school_id = this.schoolId;
    }

    return studentData;
  }

  /**
   * Transform value based on data type
   */
  private transformValue(value: unknown, dataType: string, defaultValue?: unknown): unknown {
    if (value === null || value === undefined || value === '') {
      return defaultValue !== undefined ? defaultValue : null;
    }

    switch (dataType) {
      case 'text':
        return String(value).trim();
      
      case 'integer':
        const intValue = parseInt(String(value));
        return isNaN(intValue) ? null : intValue;
      
      case 'numeric':
        const numValue = parseFloat(String(value));
        return isNaN(numValue) ? null : numValue;
      
      case 'date':
        const dateValue = new Date(String(value));
        return isNaN(dateValue.getTime()) ? null : dateValue.toISOString().split('T')[0];
      
      case 'jsonb':
        if (typeof value === 'object') {
          return value;
        }
        try {
          return JSON.parse(String(value));
        } catch {
          return String(value);
        }
      
      default:
        return value;
    }
  }

  /**
   * Validate data type
   */
  private validateDataType(value: unknown, dataType: string): boolean {
    if (value === null || value === undefined || value === '') {
      return true; // Null values are always valid
    }

    switch (dataType) {
      case 'text':
        return typeof value === 'string' || typeof value === 'number';
      
      case 'integer':
        const intValue = parseInt(String(value));
        return !isNaN(intValue) && Number.isInteger(intValue);
      
      case 'numeric':
        const numValue = parseFloat(String(value));
        return !isNaN(numValue);
      
      case 'date':
        const dateValue = new Date(String(value));
        return !isNaN(dateValue.getTime());
      
      case 'jsonb':
        if (typeof value === 'object') return true;
        try {
          JSON.parse(String(value));
          return true;
        } catch {
          return false;
        }
      
      default:
        return true;
    }
  }

  /**
   * Get value from row using column mappings
   */
  private getValueFromRow(row: CSVStudentRow, dbColumn: string, columnMappings: ColumnMapping[]): unknown {
    const mapping = columnMappings.find(m => m.dbColumn === dbColumn);
    if (!mapping || !mapping.csvColumn) return null;
    
    return row[mapping.csvColumn];
  }

  /**
   * Insert new student record
   */
  private async insertNewStudent(studentData: ProcessedStudentData): Promise<{
    success: boolean;
    error?: string;
    warnings?: ProcessingWarning[];
  }> {
    const warnings: ProcessingWarning[] = [];

    try {
      // Generate UUID for student_id
      const studentId = crypto.randomUUID();
      
      const insertData = {
        ...studentData,
        student_id: studentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(insertData).forEach(key => {
        if (insertData[key as keyof typeof insertData] === undefined) {
          delete insertData[key as keyof typeof insertData];
        }
      });

      const { error } = await supabase
        .from('students')
        .insert(insertData);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during insert' 
      };
    }
  }

  /**
   * Update existing student record
   */
  private async updateExistingStudent(
    studentId: string,
    newData: ProcessedStudentData,
    allowPartialUpdates: boolean
  ): Promise<{
    success: boolean;
    error?: string;
    warnings?: ProcessingWarning[];
  }> {
    const warnings: ProcessingWarning[] = [];

    try {
      // Get existing student data
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (fetchError) {
        return { success: false, error: `Failed to fetch existing student: ${fetchError.message}` };
      }

      // Prepare update data
      const updateData: Partial<ProcessedStudentData> = {
        updated_at: new Date().toISOString()
      };

      // Compare and update fields
      Object.keys(newData).forEach(key => {
        if (key === 'student_id' || key === 'created_at') return;
        
        const newValue = (newData as any)[key];
        const existingValue = existingStudent[key];

        if (key === 'special_needs') {
          // Merge special_needs JSON data
          const existingSpecialNeeds = existingValue || {};
          const newSpecialNeeds = newValue || {};
          updateData.special_needs = { ...existingSpecialNeeds, ...newSpecialNeeds };
        } else if (newValue !== null && newValue !== undefined && newValue !== '') {
          // Only update if new value is not empty
          if (newValue !== existingValue) {
            (updateData as any)[key] = newValue;
          }
        } else if (!allowPartialUpdates) {
          // If not allowing partial updates, set to null
          (updateData as any)[key] = null;
        }
      });

      // Check if any updates are needed
      const hasUpdates = Object.keys(updateData).length > 1; // More than just updated_at
      
      if (!hasUpdates) {
        warnings.push({
          row: 0,
          message: 'No changes detected, skipping update'
        });
        return { success: true, warnings };
      }

      // Perform update
      const { error: updateError } = await supabase
        .from('students')
        .update(updateData)
        .eq('student_id', studentId);

      if (updateError) {
        return { success: false, error: `Update failed: ${updateError.message}` };
      }

      return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during update' 
      };
    }
  }

  /**
   * Create batches from CSV data
   */
  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Set school ID for all operations
   */
  public setSchoolId(schoolId: string): void {
    this.schoolId = schoolId;
  }

  /**
   * Update column mappings
   */
  public setColumnMappings(mappings: ColumnMapping[]): void {
    this.columnMappings = mappings;
  }

  /**
   * Get current column mappings
   */
  public getColumnMappings(): ColumnMapping[] {
    return [...this.columnMappings];
  }

  /**
   * Generate processing report
   */
  public generateReport(result: ProcessingResult): string {
    const lines: string[] = [];
    
    lines.push('=== Student CSV Processing Report ===');
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('Summary:');
    lines.push(`  Total Processed: ${result.processed}`);
    lines.push(`  Inserted: ${result.inserted}`);
    lines.push(`  Updated: ${result.updated}`);
    lines.push(`  Skipped: ${result.skipped}`);
    lines.push(`  Errors: ${result.errors.length}`);
    lines.push(`  Warnings: ${result.warnings.length}`);
    lines.push('');

    if (result.unmatchedColumns.length > 0) {
      lines.push('Unmatched Columns (stored in special_needs):');
      result.unmatchedColumns.forEach(column => {
        lines.push(`  - ${column}`);
      });
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('Errors:');
      result.errors.forEach(error => {
        lines.push(`  Row ${error.row}: ${error.message}`);
        if (error.field) {
          lines.push(`    Field: ${error.field}`);
        }
      });
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      result.warnings.forEach(warning => {
        lines.push(`  Row ${warning.row}: ${warning.message}`);
        if (warning.field) {
          lines.push(`    Field: ${warning.field}`);
        }
      });
      lines.push('');
    }

    lines.push(`Processing ${result.success ? 'completed successfully' : 'completed with errors'}.`);
    
    return lines.join('\n');
  }
}

// Export utility functions
export const createStudentProcessor = (schoolId?: string) => {
  return new StudentCSVProcessor(undefined, schoolId);
};

export const validateStudentCSV = (csvData: CSVStudentRow[], columnMappings?: ColumnMapping[]) => {
  const processor = new StudentCSVProcessor(columnMappings);
  return processor.validateCSVData(csvData, processor.getColumnMappings());
};