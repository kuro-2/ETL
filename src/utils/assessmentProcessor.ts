import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  AssessmentSource,
  FieldMapping,
  ValidationResult,
  ProcessingState,
  NJSLAAssessmentResult,
  StudentInfo,
  GenericAssessmentData
} from '../types/assessment';
import { linkItProcessor, LinkItProcessedData } from './linkItProcessor';
import { njslaScoringEngine } from './njslaScoring';
import { databaseService } from '../config/database';

export class AssessmentProcessor {

  /**
   * Parse CSV or Excel file (.csv, .xlsx, .xls) and return headers/data
   */
  async parseCSV(file: File): Promise<{ headers: string[]; data: any[] }> {
    // Detect file extension
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    if (isExcel) {
      // Parse Excel file using xlsx
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target!.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            if (!jsonData || jsonData.length === 0) {
              reject(new Error('Excel file is empty or could not be parsed'));
              return;
            }
            // Extract headers from first row
            const headers = Object.keys(jsonData[0] as object);
            resolve({ headers, data: jsonData });
          } catch (err) {
            reject(new Error('Failed to parse Excel file: ' + (err instanceof Error ? err.message : String(err))));
          }
        };
        reader.onerror = (err) => {
          reject(new Error('Failed to read Excel file: ' + (err instanceof Error ? err.message : String(err))));
        };
        reader.readAsArrayBuffer(file);
      });
    }
    return new Promise((resolve, reject) => {
      // Parse without header mode to examine the raw structure
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        complete: (rawResults) => {
          if (rawResults.errors.length > 0) {
            console.warn('CSV parsing warnings:', rawResults.errors);
          }
          
          if (!rawResults.data || rawResults.data.length === 0) {
            reject(new Error('CSV file is empty or could not be parsed'));
            return;
          }

          // Check if this is a LinkIt CSV format
          const isLinkItFormat = this.detectLinkItFormat(rawResults.data as string[][]);
          
          if (isLinkItFormat) {
            try {
              const parsed = this.parseLinkItCSV(rawResults.data as string[][]);
              resolve(parsed);
              return;
            } catch (error) {
              console.error('LinkIt parsing failed, falling back to standard parsing:', error);
              // Fall through to standard parsing
            }
          }
          
          // Standard CSV parsing logic
          const firstRow = rawResults.data[0] as string[];
          const potentialHeaders = firstRow.map((h, index) => {
            const cleaned = (h || '').toString().trim();
            return cleaned || `Column_${index + 1}`;
          });
          
          // Check if first row looks like headers (contains text, not just numbers)
          const looksLikeHeaders = potentialHeaders.some(h => 
            isNaN(Number(h)) && h.length > 0 && h !== `Column_${potentialHeaders.indexOf(h) + 1}`
          );
          
          let headers: string[];
          let dataRows: string[][];
          
          if (looksLikeHeaders) {
            headers = potentialHeaders;
            dataRows = rawResults.data.slice(1) as string[][];
          } else {
            headers = firstRow.map((_, index) => `Column_${index + 1}`);
            dataRows = rawResults.data as string[][];
          }
          
          // Convert to object format
          const data = dataRows.map((row, rowIndex) => {
            const obj: any = {};
            headers.forEach((header, colIndex) => {
              obj[header] = row[colIndex] || '';
            });
            return obj;
          }).filter(row => {
            // Filter out completely empty rows
            return Object.values(row).some(val => val && val.toString().trim() !== '');
          });
          
          // Validate that we have meaningful data
          if (headers.length === 0) {
            reject(new Error('No columns detected in CSV file'));
            return;
          }
          
          if (data.length === 0) {
            reject(new Error('No data rows found in CSV file'));
            return;
          }
          
          resolve({ headers, data });
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Detect assessment source from CSV headers
   */
  detectAssessmentSource(headers: string[]): AssessmentSource {
    console.log('🔍 Assessment source detection - Input headers:', headers);
    console.log('🔍 Assessment source detection - Header count:', headers.length);
    
    const headerString = headers.join(' ').toLowerCase();
    console.log('🔍 Assessment source detection - Combined header string:', headerString);
    
    // Enhanced LinkIt detection patterns
    // Check for explicit LinkIt branding (handles "LinkIt!" with exclamation)
    if (headerString.includes('linkit') || headerString.includes('powered by linkit')) {
      console.log('✅ LinkIt detected via explicit branding');
      return 'linkit';
    }

    // Check for LinkIt-specific patterns
    if (headerString.includes('student') && 
        headerString.includes('id') && 
        headerString.includes('grade') &&
        (headerString.includes('njsla') || headerString.includes('njsls') || headerString.includes('ela') || headerString.includes('math'))) {
      console.log('✅ LinkIt detected via demographic + assessment pattern');
      return 'linkit';
    }

    // Check for specific LinkIt format indicators
    if (headerString.includes('selected tests') ||
        headerString.includes('result date') ||
        headerString.includes('scale score') ||
        headerString.includes('performance level') ||
        headerString.includes('percent') ||
        headerString.includes('form b') ||
        headerString.includes('form a') ||
        headerString.includes('start strong') ||
        headerString.includes('startstrong') ||
        (headerString.includes('literature') && headerString.includes('informational') && headerString.includes('percent'))) {
      // Additional check to ensure it's actually LinkIt format
      const hasBasicDemographics = headerString.includes('student') && 
                                  headerString.includes('id') && 
                                  headerString.includes('grade');
      if (hasBasicDemographics) {
        console.log('✅ LinkIt detected via format indicators + demographics');
        return 'linkit';
      }
    }

    // Check for LinkIt standards patterns (L.RF.4.4, RI.AA.4.7, etc.)
    const hasLinkItStandards = headers.some(h => 
      /[A-Z]\.[A-Z]{2}\.\d/.test(h) || // Pattern like L.RF.4.4
      h.includes('DOK') || // Depth of Knowledge
      (h.includes('Literary Text') && h.includes('%')) ||
      (h.includes('Informational Text') && h.includes('%'))
    );
    
    console.log('🔍 LinkIt standards check:', {
      hasLinkItStandards,
      standardsFound: headers.filter(h => 
        /[A-Z]\.[A-Z]{2}\.\d/.test(h) || 
        h.includes('DOK') || 
        (h.includes('Literary Text') && h.includes('%')) ||
        (h.includes('Informational Text') && h.includes('%'))
      )
    });
    
    if (hasLinkItStandards) {
      const hasBasicDemographics = headerString.includes('student') && 
                                  headerString.includes('id') && 
                                  headerString.includes('grade');
      if (hasBasicDemographics) {
        console.log('✅ LinkIt detected via standards + demographics');
        return 'linkit';
      }
    }

    // Check for Genesis patterns
    if (headerString.includes('genesis') || headerString.includes('sis')) {
      console.log('✅ Genesis detected');
      return 'genesis';
    }

    // Check for direct NJSLA patterns
    if (headerString.includes('njsla') && headerString.includes('scale')) {
      console.log('✅ NJSLA Direct detected');
      return 'njsla_direct';
    }

    // Default to generic
    console.log('❌ No specific format detected, defaulting to generic');
    return 'generic';
  }

  /**
   * Validate assessment data based on source
   */
  validateAssessmentData(data: any[], source: AssessmentSource): ValidationResult {
    switch (source) {
      case 'linkit':
        return linkItProcessor.validateLinkItStructure(Object.keys(data[0] || {}));
      case 'genesis':
        return this.validateGenesisData(data);
      case 'njsla_direct':
        return this.validateNJSLADirectData(data);
      default:
        return this.validateGenericData(data);
    }
  }

  /**
   * Generate suggested field mappings based on source
   */
  generateSuggestedMappings(headers: string[], source: AssessmentSource): FieldMapping[] {
    switch (source) {
      case 'linkit':
        return this.generateLinkItMappings(headers);
      case 'genesis':
        return this.generateGenesisMappings(headers);
      case 'njsla_direct':
        return this.generateNJSLADirectMappings(headers);
      default:
        return this.generateGenericMappings(headers);
    }
  }

  /**
   * Transform data to generic format
   */
  transformToGeneric(data: any[], source: AssessmentSource): GenericAssessmentData[] {
    switch (source) {
      case 'linkit':
        // LinkIt data is handled specially due to its complex structure
        return this.transformLinkItToGeneric(data);
      case 'genesis':
        return this.transformGenesisToGeneric(data);
      case 'njsla_direct':
        return this.transformNJSLADirectToGeneric(data);
      default:
        return this.transformGenericData(data);
    }
  }

  /**
   * Process assessment data based on source
   */
  async processAssessmentData(csvData: any[], source: AssessmentSource): Promise<{
    students: StudentInfo[];
    assessments: NJSLAAssessmentResult[];
    validation: ValidationResult;
    summary: any;
  }> {
    switch (source) {
      case 'linkit':
        return await this.processLinkItData(csvData, source);
      case 'genesis':
        return await this.processGenesisData(csvData);
      case 'njsla_direct':
        return await this.processNJSLADirectData(csvData);
      default:
        return await this.processGenericData(csvData);
    }
  }

  /**
   * Store raw assessment data in database
   */
  async storeRawAssessmentData(data: {
    source: AssessmentSource;
    filename: string;
    originalFilename: string;
    fileSize: number;
    rawData: any[];
    metadata: any;
  }): Promise<any> {
    const rawRecord = {
      source: data.source,
      filename: data.filename,
      original_filename: data.originalFilename,
      file_size: data.fileSize,
      raw_data: data.rawData,
      file_metadata: data.metadata,
      upload_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    return await databaseService.storeRawAssessment(rawRecord);
  }

  /**
   * Store processed assessment data in database
   */
  async storeProcessedAssessmentData(rawRecordId: string, processedData: {
    students: StudentInfo[];
    assessments: NJSLAAssessmentResult[];
  }): Promise<any> {
    // Note: Students already exist in the database, so we don't need to store them
    // The App.tsx will handle looking up student UUIDs and storing assessments
    
    // Store processed assessments directly - map to database table fields
    const assessmentRecords = processedData.assessments.map(assessment => ({
      raw_record_id: rawRecordId,
      student_id: assessment.studentId, // This should be the UUID from student lookup
      assessment_type: assessment.assessmentType,
      subject: assessment.subject,
      grade_level: assessment.gradeLevel,
      test_date: assessment.testDate,
      raw_score: assessment.rawScore,
      scale_score: assessment.scaleScore,
      performance_level_text: assessment.performanceLevelText,
      min_possible_score: assessment.minPossibleScore,
      max_possible_score: assessment.maxPossibleScore,
      student_growth_percentile: assessment.studentGrowthPercentile,
      subscores: assessment.subscores,
      created_at: new Date(),
      updated_at: new Date()
    }));

    return await databaseService.storeProcessedAssessments(assessmentRecords);
  }

  // Private methods for specific source processing

  /**
   * Process LinkIt data
   */
  private async processLinkItData(csvData: any[], source: AssessmentSource): Promise<LinkItProcessedData> {
    return linkItProcessor.processLinkItData(csvData, source);
  }

  /**
   * Process Genesis data
   */
  private async processGenesisData(csvData: any[]): Promise<any> {
    // TODO: Implement Genesis-specific processing
    throw new Error('Genesis processing not yet implemented');
  }

  /**
   * Process NJSLA Direct data
   */
  private async processNJSLADirectData(csvData: any[]): Promise<any> {
    // TODO: Implement NJSLA Direct processing
    throw new Error('NJSLA Direct processing not yet implemented');
  }

  /**
   * Process Generic data
   */
  private async processGenericData(csvData: any[]): Promise<any> {
    // TODO: Implement generic processing
    throw new Error('Generic processing not yet implemented');
  }

  /**
   * Transform LinkIt data to generic format
   */
  private transformLinkItToGeneric(data: any[]): GenericAssessmentData[] {
    const genericData: GenericAssessmentData[] = [];

    data.forEach((row, index) => {
      // Extract student info - use resolved UUID if available, numbering starts from 1
      const studentId = row['_student_uuid'] || row['ID'] || `student_${index + 1}`;
      const originalStudentId = row['_school_student_id'] || row['ID'] || '';
      const studentName = row['Student'] || '';
      const grade = row['Grade'] || '';

      // Find assessment columns in this row
      const assessmentColumns = Object.keys(row).filter(key => {
        const lowerKey = key.toLowerCase();
        return (lowerKey.includes('njsla') || lowerKey.includes('assessment')) && 
               !lowerKey.includes(' - '); // Base assessment name, not sub-attribute
      });

      // If no assessment columns found, create a generic entry
      if (assessmentColumns.length === 0) {
        genericData.push({
          studentId,
          studentName,
          assessmentName: 'NJSLA Assessment',
          assessmentDate: new Date().toISOString(),
          questionId: 'overall',
          studentAnswer: '',
          correctAnswer: '',
          pointsEarned: 0,
          maxPoints: 0,
          subject: 'ELA',
          grade,
          scaleScore: 0,
          performanceLevelText: '',
          testDate: new Date().toISOString(),
          gradeLevel: grade,
          assessmentType: 'NJSLA_ELA'
        });
        return;
      }

      // Process each assessment for this student
      assessmentColumns.forEach(assessmentCol => {
        // Extract assessment details
        const assessmentName = assessmentCol;
        const subject = assessmentCol.toLowerCase().includes('ela') ? 'ELA' : 
                       assessmentCol.toLowerCase().includes('math') ? 'Mathematics' : 'ELA';
        
        // Extract assessment data using combined headers
        const resultDate = row[`${assessmentCol} - Result Date`] || '';
        const level = row[`${assessmentCol} - Level`] || '';
        const scaleScore = parseInt(row[`${assessmentCol} - Scaled`] || '0');
        const performanceLevelText = level || '';

        // Create generic assessment data entry
        const genericEntry: GenericAssessmentData = {
          studentId, // Use resolved UUID
          studentName,
          assessmentName,
          assessmentDate: resultDate || new Date().toISOString(),
          questionId: 'overall_score',
          studentAnswer: level || '',
          correctAnswer: '',
          pointsEarned: scaleScore || 0,
          maxPoints: 850, // NJSLA typical max score
          subject,
          grade,
          scaleScore,
          performanceLevelText,
          testDate: resultDate || new Date().toISOString(),
          gradeLevel: grade,
          assessmentType: subject === 'ELA' ? 'NJSLA_ELA' : 'NJSLA_MATH'
        };

        genericData.push(genericEntry);

        // Add subscore entries if they exist
        const subscoreFields = [
          'Reading - Literary Text',
          'Reading - Informational Text', 
          'Reading - Vocabulary',
          'Writing - Expression',
          'Writing - Conventions'
        ];

        subscoreFields.forEach(subscoreField => {
          const subscoreLevel = row[`${assessmentCol} - ${subscoreField} (Level)`];
          const subscoreScaled = row[`${assessmentCol} - ${subscoreField} (Scaled)`];
          
          if (subscoreLevel || subscoreScaled) {
            const subscoreEntry: GenericAssessmentData = {
              studentId, // Use resolved UUID
              studentName,
              assessmentName: `${assessmentName} - ${subscoreField}`,
              assessmentDate: resultDate || new Date().toISOString(),
              questionId: subscoreField.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
              studentAnswer: subscoreLevel || '',
              correctAnswer: '',
              pointsEarned: parseInt(subscoreScaled || '0'),
              maxPoints: 100, // Typical subscore max
              subject,
              grade,
              scaleScore: parseInt(subscoreScaled || '0'),
              performanceLevelText: subscoreLevel || '',
              testDate: resultDate || new Date().toISOString(),
              gradeLevel: grade,
              assessmentType: subject === 'ELA' ? 'NJSLA_ELA' : 'NJSLA_MATH'
            };

            genericData.push(subscoreEntry);
          }
        });
      });
    });

    return genericData;
  }

  /**
   * Generate LinkIt field mappings
   */
  private generateLinkItMappings(headers: string[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];

    // LinkIt CSV structure - map to actual database table fields (assessment_external_processed)
    
    // Student demographic mappings - these are used for student lookup, not direct storage
    const demographicMappings = [
      { sourceField: 'Student', targetField: 'student_name', required: true },
      { sourceField: 'ID', targetField: 'student_id', required: true },
      { sourceField: 'Grade', targetField: 'grade_level', required: true },
    ];

    // Assessment result mappings - these map to the actual database table columns
    const assessmentMappings = [
      { sourceField: 'Result Date', targetField: 'test_date', required: false },
      { sourceField: 'Level', targetField: 'performance_level_text', required: false },
      { sourceField: 'Scaled', targetField: 'scale_score', required: false },
      { sourceField: 'Raw Score', targetField: 'raw_score', required: false },
    ];

    // Check demographic fields
    demographicMappings.forEach(mapping => {
      if (headers.includes(mapping.sourceField)) {
        mappings.push({
          ...mapping,
          description: `Maps ${mapping.sourceField} to ${mapping.targetField}`
        });
      }
    });

    // Check for assessment fields (they might have prefixes)
    assessmentMappings.forEach(mapping => {
      // Look for exact match first
      if (headers.includes(mapping.sourceField)) {
        mappings.push({
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          required: mapping.required,
          description: `Maps ${mapping.sourceField} to ${mapping.targetField}`
        });
      } else {
        // Look for fields that end with the mapping source field (combined headers)
        const matchingHeaders = headers.filter(h => h.endsWith(` - ${mapping.sourceField}`));
        matchingHeaders.forEach(header => {
          mappings.push({
            sourceField: header,
            targetField: mapping.targetField,
            required: mapping.required,
            description: `Maps ${header} to ${mapping.targetField}`
          });
        });
      }
    });

    // Add school year mapping - extract from assessment column headers
    const assessmentColumns = headers.filter(h => {
      const lowerHeader = h.toLowerCase();
      return (lowerHeader.includes('njsla') || lowerHeader.includes('assessment')) && 
             !lowerHeader.includes(' - '); // Base assessment name, not sub-attribute
    });

    assessmentColumns.forEach(assessmentCol => {
      // Extract school year from column name (e.g., "2022-23 Gr 3 ELA NJSLA")
      const schoolYearMatch = assessmentCol.match(/(\d{4}-\d{2})/);
      if (schoolYearMatch) {
        mappings.push({
          sourceField: assessmentCol,
          targetField: 'school_year',
          required: false,
          defaultValue: schoolYearMatch[1],
          description: `Extracts school year ${schoolYearMatch[1]} from ${assessmentCol}`
        });
      }
    });

    // Add assessment type mapping based on detected assessment columns
    assessmentColumns.forEach(assessmentCol => {
      // Enhanced assessment type detection
      const lowerCol = assessmentCol.toLowerCase();
      let assessmentType = 'NJSLA_ELA'; // Default
      
      if (lowerCol.includes('start strong')) {
        // Start Strong assessments
        if (lowerCol.includes('ela') || lowerCol.includes('english')) {
          assessmentType = 'START_STRONG_ELA';
        } else if (lowerCol.includes('math')) {
          assessmentType = 'START_STRONG_MATH';
        } else if (lowerCol.includes('science')) {
          assessmentType = 'START_STRONG_SCIENCE';
        }
      } else if (lowerCol.includes('njsls')) {
        // LinkIt NJSLS assessments
        if (lowerCol.includes('form b')) {
          if (lowerCol.includes('ela') || lowerCol.includes('english')) {
            assessmentType = 'LINKIT_NJSLS_ELA';
          } else if (lowerCol.includes('math')) {
            assessmentType = 'LINKIT_NJSLS_MATH';
          } else if (lowerCol.includes('science')) {
            assessmentType = 'LINKIT_NJSLS_SCIENCE';
          }
        } else if (lowerCol.includes('form a')) {
          if (lowerCol.includes('ela') || lowerCol.includes('english')) {
            assessmentType = 'LINKIT_NJSLS_ELA';
          } else if (lowerCol.includes('math')) {
            assessmentType = 'LINKIT_NJSLS_MATH';
          } else if (lowerCol.includes('science')) {
            assessmentType = 'LINKIT_NJSLS_SCIENCE';
          }
        } else {
          // Generic NJSLS (default to Form A)
          if (lowerCol.includes('ela') || lowerCol.includes('english')) {
            assessmentType = 'LINKIT_NJSLS_ELA';
          } else if (lowerCol.includes('math')) {
            assessmentType = 'LINKIT_NJSLS_MATH';
          } else if (lowerCol.includes('science')) {
            assessmentType = 'LINKIT_NJSLS_SCIENCE';
          }
        }
      } else if (lowerCol.includes('njsla')) {
        // Traditional NJSLA assessments
        if (lowerCol.includes('ela') || lowerCol.includes('english')) {
          assessmentType = 'NJSLA_ELA';
        } else if (lowerCol.includes('math')) {
          assessmentType = 'NJSLA_MATH';
        } else if (lowerCol.includes('science')) {
          assessmentType = 'NJSLA_SCIENCE';
        }
      } else {
        // Fallback based on subject only
        if (lowerCol.includes('ela') || lowerCol.includes('english')) {
          assessmentType = 'NJSLA_ELA';
        } else if (lowerCol.includes('math')) {
          assessmentType = 'NJSLA_MATH';
        } else if (lowerCol.includes('science')) {
          assessmentType = 'NJSLA_SCIENCE';
        }
      }
      
      mappings.push({
        sourceField: assessmentCol,
        targetField: 'assessment_type',
        required: false,
        defaultValue: assessmentType,
        description: `Maps ${assessmentCol} to assessment type ${assessmentType}`
      });
    });

    // Add subject mapping
    if (headers.some(h => h.toLowerCase().includes('ela'))) {
      mappings.push({
        sourceField: 'ELA_DETECTED',
        targetField: 'subject',
        required: false,
        defaultValue: 'ELA',
        description: 'Detected ELA subject from headers'
      });
    }

    if (headers.some(h => h.toLowerCase().includes('math'))) {
      mappings.push({
        sourceField: 'MATH_DETECTED',
        targetField: 'subject',
        required: false,
        defaultValue: 'Mathematics',
        description: 'Detected Math subject from headers'
      });
    }

    // Add additional database fields that might be mapped
    const additionalMappings = [
      { sourceField: 'Performance Level', targetField: 'performance_level', required: false },
      { sourceField: 'Min Score', targetField: 'min_possible_score', required: false },
      { sourceField: 'Max Score', targetField: 'max_possible_score', required: false },
      { sourceField: 'Growth Percentile', targetField: 'student_growth_percentile', required: false },
    ];

    additionalMappings.forEach(mapping => {
      if (headers.includes(mapping.sourceField)) {
        mappings.push({
          ...mapping,
          description: `Maps ${mapping.sourceField} to ${mapping.targetField}`
        });
      }
    });

    // Add subscores mapping - this will be populated automatically during processing
    mappings.push({
      sourceField: 'AUTO_GENERATED_SUBSCORES',
      targetField: 'subscores',
      required: false,
      defaultValue: '{}',
      description: 'Automatically generated comprehensive subscores JSON'
    });

    // Add unprocessed data mapping - this will be populated automatically during processing
    mappings.push({
      sourceField: 'AUTO_GENERATED_UNPROCESSED_DATA',
      targetField: 'unprocessed_data',
      required: false,
      defaultValue: '{}',
      description: 'Automatically generated complete raw data JSON for the student'
    });

    return mappings;
  }

  /**
   * Generate Genesis field mappings
   */
  private generateGenesisMappings(headers: string[]): FieldMapping[] {
    // TODO: Implement Genesis-specific mappings
    return [];
  }

  /**
   * Generate NJSLA Direct field mappings
   */
  private generateNJSLADirectMappings(headers: string[]): FieldMapping[] {
    // TODO: Implement NJSLA Direct mappings
    return [];
  }

  /**
   * Generate generic field mappings
   */
  private generateGenericMappings(headers: string[]): FieldMapping[] {
    // TODO: Implement generic mappings
    return [];
  }

  /**
   * Validate Genesis data
   */
  private validateGenesisData(data: any[]): ValidationResult {
    // TODO: Implement Genesis validation
    return {
      isValid: false,
      errors: ['Genesis validation not yet implemented'],
      warnings: [],
      summary: {
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: data.length,
        studentsFound: 0,
        assessmentsFound: 0,
        subjectsFound: [],
        gradesFound: []
      }
    };
  }

  /**
   * Validate NJSLA Direct data
   */
  private validateNJSLADirectData(data: any[]): ValidationResult {
    // TODO: Implement NJSLA Direct validation
    return {
      isValid: false,
      errors: ['NJSLA Direct validation not yet implemented'],
      warnings: [],
      summary: {
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: data.length,
        studentsFound: 0,
        assessmentsFound: 0,
        subjectsFound: [],
        gradesFound: []
      }
    };
  }

  /**
   * Validate generic data
   */
  private validateGenericData(data: any[]): ValidationResult {
    // TODO: Implement generic validation
    return {
      isValid: false,
      errors: ['Generic validation not yet implemented'],
      warnings: [],
      summary: {
        totalRecords: data.length,
        validRecords: 0,
        invalidRecords: data.length,
        studentsFound: 0,
        assessmentsFound: 0,
        subjectsFound: [],
        gradesFound: []
      }
    };
  }

  /**
   * Transform Genesis data to generic format
   */
  private transformGenesisToGeneric(data: any[]): GenericAssessmentData[] {
    // TODO: Implement Genesis transformation
    return [];
  }

  /**
   * Transform NJSLA Direct data to generic format
   */
  private transformNJSLADirectToGeneric(data: any[]): GenericAssessmentData[] {
    // TODO: Implement NJSLA Direct transformation
    return [];
  }

  /**
   * Transform generic data
   */
  private transformGenericData(data: any[]): GenericAssessmentData[] {
    // TODO: Implement generic transformation
    return [];
  }

  /**
   * Detect if this is a LinkIt CSV format
   */
  private detectLinkItFormat(rawData: string[][]): boolean {
    if (rawData.length < 5) return false;
    
    console.log('🔍 LinkIt format detection - Raw data sample:', rawData.slice(0, 6).map(row => row.slice(0, 5)));
    
    // Check for LinkIt-specific patterns in the first few rows
    const firstFewRows = rawData.slice(0, 5).map(row => row.join(' ').toLowerCase());
    
    // Look for "powered by linkit" or similar patterns
    const hasLinkItSignature = firstFewRows.some(row => 
      row.includes('powered by linkit') || 
      row.includes('linkit') ||
      row.includes('selected tests')
    );
    
    console.log('🔍 LinkIt signature check:', {
      hasLinkItSignature,
      firstFewRows: firstFewRows.map(row => row.substring(0, 100) + '...')
    });
    
    // Enhanced student headers detection - check multiple potential header rows
    let hasStudentHeaders = false;
    let studentHeaderRowIndex = -1;
    
    // Check rows 4, 5, and 6 for student headers (LinkIt format can vary)
    for (let i = 3; i <= 5 && i < rawData.length; i++) {
      const potentialHeaderRow = rawData[i] || [];
      const headerRowText = potentialHeaderRow.join(' ').toLowerCase();
      
      // Check for student header indicators
      const hasStudent = headerRowText.includes('student');
      const hasId = headerRowText.includes('id') || headerRowText.includes('student id');
      const hasGrade = headerRowText.includes('grade');
      
      console.log(`🔍 Checking row ${i} for student headers:`, {
        hasStudent,
        hasId,
        hasGrade,
        sampleCells: potentialHeaderRow.slice(0, 5)
      });
      
      if (hasStudent && hasId && hasGrade) {
        hasStudentHeaders = true;
        studentHeaderRowIndex = i;
        console.log(`✅ Found student headers in row ${i}`);
        break;
      }
    }
    
    console.log('🔍 Student headers check:', {
      hasStudentHeaders,
      studentHeaderRowIndex,
      potentialHeaderRow: hasStudentHeaders ? rawData[studentHeaderRowIndex].slice(0, 5) : []
    });
    
    // Additional check for new LinkIt NJSLS format
    // Look for assessment columns with year patterns (2024-25, 2022-23, etc.)
    const hasYearPattern = firstFewRows.some(row => 
      /\d{4}-\d{2}/.test(row) // Pattern like "2024-25" or "2022-23"
    );
    
    // Look for ELA/Math assessment indicators
    const hasAssessmentIndicators = firstFewRows.some(row => 
      row.includes('ela') || row.includes('math') || row.includes('njsla') || row.includes('njsls')
    );
    
    // Look for Start Strong specific indicators
    const hasStartStrongIndicators = firstFewRows.some(row => 
      row.includes('start strong') || 
      row.includes('startstrong') ||
      (row.includes('literature') && row.includes('informational') && row.includes('percent'))
    );
    
    console.log('🔍 Additional format checks:', {
      hasYearPattern,
      hasAssessmentIndicators,
      hasStartStrongIndicators
    });
    
    // Return true if we have either traditional LinkIt format OR new format indicators OR Start Strong indicators
    const isLinkItFormat = (hasLinkItSignature && hasStudentHeaders) || 
                          (hasYearPattern && hasAssessmentIndicators && hasStudentHeaders) ||
                          (hasStartStrongIndicators && hasStudentHeaders);
    
    console.log('🔍 Final LinkIt format detection result:', isLinkItFormat);
    
    return isLinkItFormat;
  }

  /**
   * Parse LinkIt-specific CSV format
   */
  private parseLinkItCSV(rawData: string[][]): { headers: string[]; data: any[] } {
    if (rawData.length < 6) {
      throw new Error('LinkIt CSV format requires at least 6 rows');
    }

    // Extract metadata from first few rows
    const metadata: any = {};
    for (let i = 0; i < 4; i++) {
      const row = rawData[i];
      if (row.length >= 2) {
        const key = row[0]?.trim();
        const value = row[1]?.trim();
        if (key && value) {
          metadata[key] = value;
        }
      }
    }

    // Dynamically find the student headers row
    let mainHeaderRowIndex = 4; // Default to row 5 (index 4)
    let subHeaderRowIndex = 5;  // Default to row 6 (index 5)
    
    // Find the row with student headers
    for (let i = 3; i <= 5 && i < rawData.length; i++) {
      const potentialHeaderRow = rawData[i] || [];
      const headerRowText = potentialHeaderRow.join(' ').toLowerCase();
      
      if (headerRowText.includes('student') && 
          headerRowText.includes('id') && 
          headerRowText.includes('grade')) {
        mainHeaderRowIndex = i;
        subHeaderRowIndex = i + 1;
        console.log(`🔍 Found student headers in row ${i}, sub-headers in row ${i + 1}`);
        break;
      }
    }

    // Row with main headers (Student, ID, Grade, etc.)
    const mainHeaders = rawData[mainHeaderRowIndex].map(h => (h || '').toString().trim()).filter(h => h);
    
    // Row with sub-headers for assessment columns (Result Date, Level, Percent, etc.)
    const subHeaders = rawData[subHeaderRowIndex] ? rawData[subHeaderRowIndex].map(h => (h || '').toString().trim()) : [];

    console.log('🔍 LinkIt CSV parsing - Header rows:', {
      mainHeaderRowIndex,
      subHeaderRowIndex,
      mainHeaders: mainHeaders.slice(0, 10),
      subHeaders: subHeaders.slice(0, 10)
    });

    // Combine headers intelligently
    const combinedHeaders: string[] = [];
    let assessmentColumnStart = -1;
    
    // Find where assessment columns start (usually after basic demographic info)
    for (let i = 0; i < mainHeaders.length; i++) {
      const header = mainHeaders[i];
      if (header.toLowerCase().includes('njsla') || 
          header.toLowerCase().includes('assessment') ||
          header.toLowerCase().includes('njsls') ||
          /\d{4}-\d{2}/.test(header)) { // Year pattern like "2022-23"
        assessmentColumnStart = i;
        break;
      }
    }

    // Process headers
    for (let i = 0; i < mainHeaders.length; i++) {
      const mainHeader = mainHeaders[i];
      const subHeader = subHeaders[i] || '';
      
      if (i < assessmentColumnStart || assessmentColumnStart === -1) {
        // Demographic columns - use main header
        combinedHeaders.push(mainHeader);
      } else {
        // Assessment columns - combine main and sub headers
        if (subHeader && subHeader !== mainHeader) {
          combinedHeaders.push(`${mainHeader} - ${subHeader}`);
        } else {
          combinedHeaders.push(mainHeader);
        }
      }
    }

    // Process data rows (starting from the row after sub-headers)
    const dataRows = rawData.slice(subHeaderRowIndex + 1);
    const data = dataRows.map((row, rowIndex) => {
      const obj: any = {};
      combinedHeaders.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || '';
      });
      
      // Add metadata to each row
      obj._metadata = metadata;
      
      return obj;
    }).filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(val => 
        val && val.toString().trim() !== '' && val !== row._metadata
      );
    });

    console.log('LinkIt CSV parsed:', {
      metadata,
      headerCount: combinedHeaders.length,
      dataRowCount: data.length,
      sampleHeaders: combinedHeaders.slice(0, 10),
      assessmentColumnStart
    });

    return { headers: combinedHeaders, data };
  }

  /**
   * Map performance level text to number
   */
  private mapPerformanceLevelToNumber(levelText: string): number {
    if (!levelText) return 0;
    
    const level = levelText.toLowerCase();
    if (level.includes('exceeding')) return 5;
    if (level.includes('meeting')) return 4;
    if (level.includes('approaching')) return 3;
    if (level.includes('partially')) return 2;
    if (level.includes('below')) return 1;
    
    return 0;
  }
}

// Export singleton instance
export const assessmentProcessor = new AssessmentProcessor(); 