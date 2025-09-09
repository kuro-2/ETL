import {
  NJSLAAssessmentResult,
  StudentInfo,
  ValidationResult
} from '../types/assessment';
import { njslaScoringEngine } from './njslaScoring';

export interface LinkItProcessedData {
  students: StudentInfo[];
  assessments: NJSLAAssessmentResult[];
  validation: ValidationResult;
  summary: {
    totalStudents: number;
    totalAssessments: number;
    averageScore: number;
    averageScaleScore: number;
    performanceLevelDistribution: Record<string, number>;
    subjectBreakdown: Record<string, any>;
    gradeBreakdown: Record<string, any>;
  };
}

export class LinkItProcessor {

  /**
   * Process LinkIt CSV data
   */
  processLinkItData(csvData: any[], source: string): LinkItProcessedData {
    console.log('🔍 Starting LinkIt data processing...');
    console.log('📊 Input data:', {
      totalRows: csvData.length,
      sampleRow: csvData[0] || 'No data',
      headers: csvData[0] ? Object.keys(csvData[0]) : []
    });
    
    const students: StudentInfo[] = [];
    const assessments: NJSLAAssessmentResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Detect assessment columns from headers
    const firstRow = csvData[0];
    if (!firstRow) {
      const error = 'No data rows found in CSV';
      console.error('❌ LinkIt processing error:', error);
      errors.push(error);
      return this.createEmptyResult(errors);
    }

    const assessmentColumns = this.detectAssessmentColumns(Object.keys(firstRow));
    console.log('🔍 Detected assessment columns:', assessmentColumns);

    if (assessmentColumns.length === 0) {
      const error = 'No assessment columns detected in CSV';
      console.error('❌ LinkIt processing error:', error);
      errors.push(error);
      return this.createEmptyResult(errors);
    }

    // Process each student row - numbering starts from 1
    console.log('🔄 Processing student rows...');
    csvData.forEach((row, index) => {
      try {
        const student = this.extractStudentInfo(row, index + 1); // Pass 1-based index
        students.push(student);
        console.log(`👤 Processed student ${index + 1}:`, {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          grade: student.grade,
          lookupStatus: student.studentLookupStatus
        });

        // Process each assessment for this student
        assessmentColumns.forEach(assessmentCol => {
          const assessment = this.processStudentAssessment(row, student, assessmentCol, source);
          if (assessment) {
            assessments.push(assessment);
            console.log(`📊 Processed assessment for student ${index + 1}:`, {
              subject: assessment.subject,
              scaleScore: assessment.scaleScore,
              performanceLevelText: assessment.performanceLevelText,
              //scoreType: assessment.scoreType
            });
          } else {
            console.warn(`⚠️ No assessment data processed for student ${index + 1}, column: ${assessmentCol}`);
          }
        });

      } catch (error) {
        const errorMsg = `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('❌ Student processing error:', errorMsg);
        errors.push(errorMsg);
      }
    });

    console.log('📊 Processing summary:', {
      totalRows: csvData.length,
      studentsProcessed: students.length,
      assessmentsProcessed: assessments.length,
      errorsCount: errors.length,
      warningsCount: warnings.length
    });

    // Calculate summary statistics
    const summary = this.calculateSummary(assessments);

    // Ensure counts match exactly - count only valid students
    const validStudents = students.filter(s => s.studentId && s.studentId.trim() !== '');
    const actualStudentCount = validStudents.length;

    console.log('📊 Final validation:', {
      totalStudents: students.length,
      validStudents: actualStudentCount,
      invalidStudents: students.length - actualStudentCount,
      totalAssessments: assessments.length
    });

    const validation: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecords: csvData.length,
        validRecords: actualStudentCount, // Use actual count of valid students
        invalidRecords: csvData.length - actualStudentCount,
        studentsFound: actualStudentCount, // Ensure this matches the actual count
        assessmentsFound: assessments.length,
        subjectsFound: Array.from(new Set(assessments.map(a => a.subject))),
        gradesFound: Array.from(new Set(assessments.map(a => a.gradeLevel)))
      }
    };

    const result = {
      students: validStudents, // Return only valid students
      assessments,
      validation,
      summary: {
        ...summary,
        totalStudents: actualStudentCount // Ensure summary matches actual count
      }
    };

    console.log('✅ LinkIt processing completed:', {
      isValid: validation.isValid,
      studentsReturned: result.students.length,
      assessmentsReturned: result.assessments.length,
      validationSummary: validation.summary
    });

    return result;
  }

  /**
   * Detect assessment columns from CSV headers
   */
  private detectAssessmentColumns(headers: string[]): string[] {
    const assessmentColumns: string[] = [];

    // Look for columns that contain assessment data
    // Based on the new combined header format: "2022-23 Gr 3 ELA NJSLA - Result Date", etc.
    headers.forEach(header => {
      if (this.isAssessmentColumn(header)) {
        // Extract the base assessment name (before the " - " separator)
        const baseAssessment = header.split(' - ')[0];
        if (baseAssessment && !assessmentColumns.includes(baseAssessment)) {
          assessmentColumns.push(baseAssessment);
        }
      }
    });

    return assessmentColumns;
  }

  /**
   * Check if a column header represents assessment data
   */
  private isAssessmentColumn(header: string): boolean {
    const lowerHeader = header.toLowerCase();

    // Check for NJSLA assessment patterns
    if (lowerHeader.includes('njsla') ||
        lowerHeader.includes('assessment') ||
        lowerHeader.includes('test')) {
      return true;
    }

    // Check for grade and subject patterns
    const hasGrade = /gr\s*\d+|grade\s*\d+/i.test(header);
    const hasSubject = /ela|math|science/i.test(header);

    // Check for assessment-specific sub-columns
    const hasAssessmentData = lowerHeader.includes('result date') ||
                             lowerHeader.includes('level') ||
                             lowerHeader.includes('scaled') ||
                             lowerHeader.includes('scale score');

    return (hasGrade && hasSubject) || hasAssessmentData;
  }

  /**
   * Extract student demographic information
   */
  private extractStudentInfo(row: any, studentNumber: number): StudentInfo {
    const fullName = row['Student'] || '';
    const [lastName, firstName] = fullName.split(', ');

    return {
      id: row['_student_uuid'] || row['ID'] || `student_${studentNumber}`, // Use 1-based numbering
      studentId: row['_student_uuid'] || row['ID'] || '', // Use resolved UUID if available
      firstName: firstName || '',
      lastName: lastName || '',
      grade: row['Grade'] || '',
      race: row['Race'] || '',
      gender: row['Gender'] || '',
      age: row['Age (Yrs)'] || '',
      zipCode: row['ZIP Code'] || '',
      homeLanguage: row['Home Language'] || '',
      ethnicity: row['Ethnicity'] || '',
      nativeCountry: row['Native Country'] || '',
      timeInDistrict: row['Time in District (Yrs)'] || '',
      timeInSchool: row['Time in School (Yrs)'] || '',
      // Store the original school_student_id for reference
      schoolStudentId: row['_school_student_id'] || row['ID'] || '',
      studentLookupStatus: row['_student_lookup_status'] || 'unknown'
    };
  }

  /**
   * Process assessment data for a single student
   */
  private processStudentAssessment(row: any, student: StudentInfo, assessmentColumnPrefix: string, source: string): NJSLAAssessmentResult | null {
    try {
      // Extract assessment details from column prefix using enhanced detection
      const assessmentInfo = njslaScoringEngine.detectAssessmentFromHeaders([assessmentColumnPrefix]);
      console.log('🔍 Assessment info detected:', assessmentInfo);

      if (!assessmentInfo.subject || !assessmentInfo.grade) {
        console.warn('⚠️ Could not detect assessment subject or grade from:', assessmentColumnPrefix);
        return null;
      }

      // Try to find assessment configuration
      let assessmentConfig = null;
      if (assessmentInfo.configKey) {
        assessmentConfig = njslaScoringEngine.getAssessmentConfig(assessmentInfo.configKey);
      }
      
      // If no config found, try to find by pattern
      if (!assessmentConfig) {
        assessmentConfig = njslaScoringEngine.findAssessmentConfig([assessmentColumnPrefix]);
      }

      console.log('🔍 Assessment config found:', assessmentConfig?.displayName || 'None');

      // Extract school year from assessment column prefix (e.g., "2022-23 Gr 3 ELA NJSLA")
      const schoolYearMatch = assessmentColumnPrefix.match(/(\d{4}-\d{2})/);
      const schoolYear = schoolYearMatch ? schoolYearMatch[1] : undefined;

      // Extract assessment data from row using the new combined header format
      const resultDate = row[`${assessmentColumnPrefix} - Result Date`] || row['Result Date'];
      // Accept both 'Level' and 'Average' as performance level
      const level = row[`${assessmentColumnPrefix} - Level`] || row[`${assessmentColumnPrefix} - Average`] || row['Level'] || row['Average'];
      
      // Handle different score formats based on assessment configuration
      let scaleScore = 0;
      let rawScore = undefined;
      let percentScore = undefined;
      let scoreType = 'scale_score';

      console.log(`🔍 Score extraction for: ${assessmentColumnPrefix}`);
      console.log(`   Assessment config scoring method: ${assessmentConfig?.scoringMethod || 'None'}`);
      console.log(`   Available columns:`, Object.keys(row).filter(key => key.includes(assessmentColumnPrefix)).slice(0, 5));

      if (assessmentConfig) {
        // Use configuration-based scoring
        switch (assessmentConfig.scoringMethod) {
          case 'percent_score':
            // For percent-based assessments (like Form B and Start Strong)
            const percentValue = row[`${assessmentColumnPrefix} - Percent`] || row['Percent'];
            if (percentValue) {
              percentScore = parseInt(percentValue) || 0;
              scaleScore = percentScore; // Store percent as scale score for compatibility
              scoreType = 'percent_score';
            } else {
              // For Start Strong assessments, use Raw score if no Percent column exists
              const rawValue = row[`${assessmentColumnPrefix} - Raw`] || row['Raw'];
              if (rawValue) {
                rawScore = parseInt(rawValue) || 0;
                scaleScore = rawScore; // Use raw score as scale score
                scoreType = 'percent_score'; // Set to percent_score to use text-based mapping
                console.log(`   Using raw score for Start Strong: ${rawScore}`);
              }
            }
            break;
          case 'scale_score':
            // For traditional NJSLA scale scores
            const scaledValue = row[`${assessmentColumnPrefix} - Scaled`] || row['Scaled'];
            if (scaledValue) {
              scaleScore = parseInt(scaledValue) || 0;
              scoreType = 'scale_score';
            }
            break;
          case 'mixed':
            // Try scale score first, then fall back to percent
            const scaledValueMixed = row[`${assessmentColumnPrefix} - Scaled`] || row['Scaled'];
            if (scaledValueMixed) {
              scaleScore = parseInt(scaledValueMixed) || 0;
              scoreType = 'scale_score';
            } else {
              const percentValueMixed = row[`${assessmentColumnPrefix} - Percent`] || row['Percent'];
              if (percentValueMixed) {
                percentScore = parseInt(percentValueMixed) || 0;
                scaleScore = percentScore;
                scoreType = 'percent_score';
              }
            }
            break;
        }
      } else {
        // Fallback to original logic
        const scaledValue = row[`${assessmentColumnPrefix} - Scaled`] || row['Scaled'];
        if (scaledValue) {
          scaleScore = parseInt(scaledValue) || 0;
        }
        const percentValue = row[`${assessmentColumnPrefix} - Percent`] || row['Percent'];
        if (percentValue) {
          percentScore = parseInt(percentValue) || undefined;
        }
        // For formats without scale scores, use percent or raw as primary score
        if (scaleScore === 0 && percentScore) {
          scaleScore = percentScore;
          scoreType = 'percent_score';
        } else if (scaleScore === 0 && rawScore) {
          scaleScore = rawScore;
          scoreType = 'raw_score';
        }
      }

      // Always extract rawScore if present, regardless of scoring method
      const rawValueFinal = row[`${assessmentColumnPrefix} - Raw`] || row['Raw'];
      if (rawValueFinal !== undefined && rawValueFinal !== null && rawValueFinal !== '') {
        rawScore = parseInt(rawValueFinal) || 0;
      }

      console.log(`   Final score values: scaleScore=${scaleScore}, rawScore=${rawScore}, percentScore=${percentScore}, scoreType=${scoreType}`);

      // Extract reading and writing scores (NJSLA format)
      const readingScore = parseInt(row[`${assessmentColumnPrefix} - Reading Scale Score (Scaled)`] || row['Reading Scale Score (Scaled)'] || '0');
      const writingScore = parseInt(row[`${assessmentColumnPrefix} - Writing Scale Score (Scaled)`] || row['Writing Scale Score (Scaled)'] || '0');

      // Calculate performance level using appropriate method
      let performanceLevelText = level || '';
      
      console.log(`🔍 Performance level calculation for: ${assessmentColumnPrefix}`);
      console.log(`   Level from CSV: "${level}"`);
      console.log(`   Score type: ${scoreType}`);
      console.log(`   Assessment config: ${assessmentConfig?.displayName || 'None'}`);
      console.log(`   Config key: ${assessmentInfo.configKey || 'None'}`);
      
      // Just use the level text from CSV, no mapping needed
      performanceLevelText = level || '';
      
      console.log(`   Using level text from CSV: "${performanceLevelText}"`);
      console.log(`   Performance level: ${performanceLevelText}`);

      // Get score range from configuration or fallback
      let minPossibleScore = '0';
      let maxPossibleScore = '0';

      // Enhanced logic to handle Form A/B detection
      const detectedFormat = this.detectAssessmentFormat(row, assessmentColumnPrefix);
      const isFormAOrB = detectedFormat === 'LinkIt_NJSLS_Form_A' || detectedFormat === 'LinkIt_NJSLS_Form_B';

      // Explicit min/max for new percent-based subjects
      const percentBasedSubjects = [
        'Spanish', 'Technology Education', 'Social Studies', 'Physical Education',
        'Music', 'Health', 'Art', 'Band', 'SEL', 'LA',
        'Replacement Mathematics', 'Replacement Language Arts'
      ];
      
      if (percentBasedSubjects.includes(assessmentInfo.subject)) {
        minPossibleScore = '0';
        maxPossibleScore = '100';
        console.log('   Percent-based subject detected - using 0/100 for score range');
      } else if (isFormAOrB) {
        // Form A/B assessments are percent-based (0-100)
        minPossibleScore = '0';
        maxPossibleScore = '100';
        console.log(`   ${detectedFormat} detected - using 0/100 for score range`);
      } else if (assessmentConfig?.format === 'Start_Strong') {
        minPossibleScore = 'Not scored with numerical values';
        maxPossibleScore = 'Not scored with numerical values';
        console.log('   Start Strong assessment detected - using descriptive text for score range');
      } else if (assessmentConfig) {
        minPossibleScore = assessmentConfig.scoreRange.minScore.toString();
        maxPossibleScore = assessmentConfig.scoreRange.maxScore.toString();
      } else {
        const scoreRange = njslaScoringEngine.getScoreRange(assessmentInfo.grade, assessmentInfo.subject);
        minPossibleScore = (scoreRange?.minScore || 0).toString();
        maxPossibleScore = (scoreRange?.maxScore || 0).toString();
      }

      // Extract comprehensive subscores with all related data
      const subscores = this.extractComprehensiveSubscores(row, assessmentColumnPrefix, assessmentInfo.subject);

      // Create unprocessed data object containing all raw data for this student
      const unprocessedData = {
        originalRow: { ...row }, // Complete original row data
        studentDemographics: {
          studentName: row['Student'],
          studentId: row['ID'],
          grade: row['Grade'],
          race: row['Race'],
          gender: row['Gender'],
          age: row['Age (Yrs)'],
          zipCode: row['ZIP Code'],
          homeLanguage: row['Home Language'],
          ethnicity: row['Ethnicity'],
          nativeCountry: row['Native Country'],
          timeInDistrict: row['Time in District (Yrs)'],
          timeInSchool: row['Time in School (Yrs)']
        },
        assessmentSpecificData: {
          assessmentColumn: assessmentColumnPrefix,
          resultDate: resultDate,
          level: level,
          scaleScore: scaleScore,
          rawScore: rawScore,
          percentScore: percentScore,
          readingScore: readingScore,
          writingScore: writingScore,
          scoreType: scoreType,
          assessmentConfig: assessmentConfig ? {
            displayName: assessmentConfig.displayName,
            format: assessmentConfig.format,
            scoringMethod: assessmentConfig.scoringMethod
          } : null
        },
        metadata: {
          processedAt: new Date().toISOString(),
          schoolYear: schoolYear,
          source: 'LinkIt',
          format: this.detectAssessmentFormat(row, assessmentColumnPrefix)
        }
      };

      // Use the resolved student UUID if available, otherwise fall back to original ID
      const studentIdForAssessment = row['_student_uuid'] || student.studentId;

      // --- Set a consistent, machine-friendly assessmentType ---
      let assessmentType: string = 'UNKNOWN';
      
      // Normalize subject name to uppercase with underscores
      const normalizeSubject = (subject: string): string => {
        return subject
          .replace(/ /g, '_')
          .replace(/\(.*?\)/g, '') // Remove anything in parentheses
          .replace(/[^A-Za-z0-9_]/g, '') // Remove non-alphanumeric/underscore
          .toUpperCase();
      };
      
      const subjectKey = assessmentInfo.subject ? normalizeSubject(assessmentInfo.subject) : 'UNKNOWN';
      
      // Determine the specific form/type
      if (source === 'linkit') {
        if (assessmentConfig?.format === 'NJSLS_Form_A') {
          assessmentType = `LINKIT_NJSLS_${subjectKey}_FORM_A`;
        } else if (assessmentConfig?.format === 'NJSLS_Form_B') {
          assessmentType = `LINKIT_NJSLS_${subjectKey}_FORM_B`;
        } else if (assessmentConfig?.format === 'Start_Strong') {
          assessmentType = `LINKIT_NJSLS_${subjectKey}_START_STRONG`;
        } else {
          assessmentType = `LINKIT_NJSLS_${subjectKey}`;
        }
      } else {
        if (assessmentConfig?.format === 'NJSLA') {
          assessmentType = `NJSLA_${subjectKey}`;
        } else if (assessmentInfo.assessmentType && assessmentInfo.assessmentType.startsWith('NJSLA_')) {
          assessmentType = assessmentInfo.assessmentType;
        } else if (assessmentInfo.assessmentType && assessmentInfo.assessmentType.startsWith('START_STRONG_')) {
          assessmentType = assessmentInfo.assessmentType;
        } else {
          assessmentType = `LINKIT_NJSLS_${subjectKey}`;
        }
      }

      const assessment: NJSLAAssessmentResult = {
        studentId: studentIdForAssessment, // Use resolved UUID
        assessmentId: `${assessmentInfo.assessmentType}_${assessmentInfo.grade}_${studentIdForAssessment}`,
        assessmentType: assessmentType as any, // Overwrite with new value
        subject: assessmentInfo.subject as any,
        gradeLevel: assessmentInfo.grade,
        schoolYear: schoolYear, // Add school year
        testDate: resultDate ? new Date(resultDate) : new Date(),
        rawScore: rawScore, // Now properly extracted
        scaleScore: scaleScore,
        performanceLevelText: performanceLevelText,
        minPossibleScore: minPossibleScore,
        maxPossibleScore: maxPossibleScore,
        studentGrowthPercentile: undefined, // LinkIt doesn't provide SGP
        subscores: subscores, // Enhanced comprehensive subscores
        unprocessedData: unprocessedData, // Complete raw data
        completedAt: new Date()
      };

      console.log('📊 Processed assessment:', {
        assessmentType: assessment.assessmentType,
        subject: assessment.subject,
        grade: assessment.gradeLevel,
        scaleScore: assessment.scaleScore,
        performanceLevelText: assessment.performanceLevelText,
        scoreType: scoreType,
        configUsed: assessmentConfig?.displayName || 'None'
      });

      return assessment;
    } catch (error) {
      console.error(`Error processing assessment for student ${student.studentId}:`, error);
      return null;
    }
  }

  /**
   * Extract comprehensive subscores with all related data
   */
  private extractComprehensiveSubscores(row: any, columnPrefix: string, subject: string): any {
    const subscores: any = {};

    if (subject === 'ELA') {
      // Reading and Writing totals (for NJSLA format)
      const readingScore = parseInt(row[`${columnPrefix} - Reading Scale Score (Scaled)`] || row['Reading Scale Score (Scaled)'] || '0');
      const writingScore = parseInt(row[`${columnPrefix} - Writing Scale Score (Scaled)`] || row['Writing Scale Score (Scaled)'] || '0');

      if (readingScore > 0) subscores.reading_total = readingScore;
      if (writingScore > 0) subscores.writing_total = writingScore;

      // Check for percentage-based format (LinkIt NJSLS Form B)
      const percentScore = parseInt(row[`${columnPrefix} - Percent`] || row['Percent'] || '0');
      const rawScore = parseInt(row[`${columnPrefix} - Raw`] || row['Raw'] || '0');
      
      if (percentScore > 0) subscores.percent_score = percentScore;
      if (rawScore > 0) subscores.raw_score = rawScore;

      // Extract detailed ELA subscores - handle both scaled and percentage formats
      const elaSubscoreFields = [
        'Reading - Literary Text',
        'Reading - Informational Text', 
        'Reading - Vocabulary',
        'Writing - Expression',
        'Writing - Conventions',
        // Additional fields for newer formats
        'Literary Text',
        'Informational Text',
        'Vocabulary'
      ];

      elaSubscoreFields.forEach(field => {
        const level = row[`${columnPrefix} - ${field} (Level)`] || row[`${field} (Level)`];
        const scaled = parseInt(row[`${columnPrefix} - ${field} (Scaled)`] || row[`${field} (Scaled)`] || '0');
        const percent = parseInt(row[`${columnPrefix} - ${field} (%)`] || row[`${field} (%)`] || '0');

        if (level || scaled > 0 || percent > 0) {
          const fieldKey = field.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          subscores[fieldKey] = {
            level: level || null,
            scaled_score: scaled > 0 ? scaled : null,
            percent_score: percent > 0 ? percent : null
          };
        }
      });

      // Extract Start Strong specific subscores (Literature/Informational with percent and raw)
      const startStrongFields = [
        'Literature',
        'Informational'
      ];

      startStrongFields.forEach(field => {
        const percent = parseInt(row[`${columnPrefix} - ${field} (Percent)`] || row[`${field} (Percent)`] || '0');
        const raw = parseInt(row[`${columnPrefix} - ${field} (Raw)`] || row[`${field} (Raw)`] || '0');

        if (percent > 0 || raw > 0) {
          const fieldKey = field.toLowerCase();
          subscores[fieldKey] = {
            percent_score: percent > 0 ? percent : null,
            raw_score: raw > 0 ? raw : null
          };
        }
      });

      // Extract LinkIt NJSLS specific subscores (L.RF, L.VI, RI.AA, RL.CI, etc.)
      const linkItFields = Object.keys(row).filter(key => 
        key.includes(columnPrefix) && 
        (key.includes('L.') || key.includes('RI.') || key.includes('RL.') || key.includes('DOK'))
      );

      linkItFields.forEach(field => {
        const value = row[field];
        if (value && value !== '' && value !== '0') {
          const fieldName = field.replace(`${columnPrefix} - `, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
          subscores[fieldName] = parseInt(value) || value;
        }
      });

    } else if (subject === 'Mathematics') {
      // Extract Math-specific subscores
      const mathSubscoreFields = [
        'Major Content',
        'Additional and Supporting Content',
        'Modeling and Application',
        'Expressing Mathematical Reasoning',
        // Number and Operations fields
        'Number and Operations in Base Ten',
        'Number and Operations-Fractions',
        'Operations and Algebraic Thinking'
      ];

      mathSubscoreFields.forEach(field => {
        const level = row[`${columnPrefix} - ${field} (Level)`] || row[`${field} (Level)`];
        const scaled = parseInt(row[`${columnPrefix} - ${field} (Scaled)`] || row[`${field} (Scaled)`] || '0');
        const percent = parseInt(row[`${columnPrefix} - ${field} (%)`] || row[`${field} (%)`] || '0');

        if (level || scaled > 0 || percent > 0) {
          const fieldKey = field.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          subscores[fieldKey] = {
            level: level || null,
            scaled_score: scaled > 0 ? scaled : null,
            percent_score: percent > 0 ? percent : null
          };
        }
      });

      // Extract detailed Math standards (4.NBT.A.2, 4.NF.B.3, etc.)
      const mathStandardFields = Object.keys(row).filter(key => 
        key.includes(columnPrefix) && 
        /\d\.[A-Z]{2,3}\.[A-Z]\.\d/.test(key) // Pattern like 4.NBT.A.2
      );

      mathStandardFields.forEach(field => {
        const value = row[field];
        if (value && value !== '' && value !== '0') {
          const fieldName = field.replace(`${columnPrefix} - `, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
          subscores[fieldName] = parseInt(value) || value;
        }
      });

      // Extract Math concept areas
      const mathConceptFields = [
        'Adding and Subtracting like Fractions and Mixed Numbers',
        'Adding and Subtracting Multi-Digit Numbers',
        'Comparing Decimals to Hundredths',
        'Comparing Unlike Fractions',
        'Composing Tenths and Hundredths',
        'Multiplying a Fraction by a Whole Number',
        'Reading and Writing Whole Numbers / Comparing',
        'Rounding Whole Numbers',
        'Solving Multi-Step Problems with Whole Numbers',
        'Use Strategies to Multiply Whole Numbers'
      ];

      mathConceptFields.forEach(field => {
        const percent = parseInt(row[`${columnPrefix} - ${field} (%)`] || row[`${field} (%)`] || '0');
        if (percent > 0) {
          const fieldKey = field.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
          subscores[fieldKey] = percent;
        }
      });

      // Extract DOK levels for Math
      const dokFields = ['DOK 1', 'DOK 2', 'DOK 3'];
      dokFields.forEach(field => {
        const percent = parseInt(row[`${columnPrefix} - ${field} (%)`] || row[`${field} (%)`] || '0');
        if (percent > 0) {
          const fieldKey = field.toLowerCase().replace(/\s+/g, '_');
          subscores[fieldKey] = percent;
        }
      });

      // Extract question types for Math
      const questionTypeFields = ['Drag and Drop', 'Inline Choice', 'Multiple Choice', 'Multi-Select', 'Text Entry'];
      questionTypeFields.forEach(field => {
        const percent = parseInt(row[`${columnPrefix} - ${field} (%)`] || row[`${field} (%)`] || '0');
        if (percent > 0) {
          const fieldKey = field.toLowerCase().replace(/\s+/g, '_');
          subscores[fieldKey] = percent;
        }
      });

      // Extract overall Math scores
      const percent = parseInt(row[`${columnPrefix} - Percent`] || row['Percent'] || '0');
      const raw = parseInt(row[`${columnPrefix} - Raw`] || row['Raw'] || '0');
      
      if (percent > 0) subscores.percent_score = percent;
      if (raw > 0) subscores.raw_score = raw;
    }

    // Add metadata about the subscores
    subscores._metadata = {
      subject: subject,
      columnPrefix: columnPrefix,
      extractedAt: new Date().toISOString(),
      format: this.detectAssessmentFormat(row, columnPrefix)
    };

    return subscores;
  }

  /**
   * Detect the specific assessment format based on available fields
   */
  private detectAssessmentFormat(row: any, columnPrefix: string): string {
    console.log(`🔍 Detecting format for column prefix: ${columnPrefix}`);
    
    // Get all column keys that contain this assessment prefix
    const assessmentColumns = Object.keys(row).filter(key => 
      key.includes(columnPrefix) && key !== columnPrefix
    );
    
    console.log(`   Assessment columns found:`, assessmentColumns.slice(0, 10));
    
    // Check for NJSLA format (has Reading/Writing Scale Scores)
    if (row[`${columnPrefix} - Reading Scale Score (Scaled)`] || 
        row['Reading Scale Score (Scaled)'] ||
        row[`${columnPrefix} - Writing Scale Score (Scaled)`] ||
        row['Writing Scale Score (Scaled)']) {
      console.log('   Format detected: NJSLA (has Reading/Writing Scale Scores)');
      return 'NJSLA';
    }
    
    // Check for Start Strong format (has Literature/Informational with Percent/Raw)
    if (row[`${columnPrefix} - Literature (Percent)`] || 
        row['Literature (Percent)'] ||
        row[`${columnPrefix} - Literature (Raw)`] ||
        row['Literature (Raw)'] ||
        row[`${columnPrefix} - Informational (Percent)`] ||
        row['Informational (Percent)'] ||
        row[`${columnPrefix} - Informational (Raw)`] ||
        row['Informational (Raw)']) {
      console.log('   Format detected: Start_Strong (has Literature/Informational with Percent/Raw)');
      return 'Start_Strong';
    }
    
    // Check for LinkIt NJSLS Form A (has detailed standards like L.RF.4.4, RI.AA.4.7)
    const hasDetailedStandards = assessmentColumns.some(key => 
      /[A-Z]\.[A-Z]{2}\.\d/.test(key) || // Pattern like L.RF.4.4, RI.AA.4.7
      /[A-Z]\.[A-Z]{2}\.[A-Z]\.\d/.test(key) // Pattern like L.RF.4.4.a
    );
    
    if (hasDetailedStandards) {
      console.log('   Format detected: LinkIt_NJSLS_Form_A (has detailed standards)');
      return 'LinkIt_NJSLS_Form_A';
    }
    
    // Check for LinkIt NJSLS Form B (has Percent/Raw scores and different structure)
    const hasPercentRaw = assessmentColumns.some(key => 
      key.includes('Percent') || key.includes('Raw')
    );
    
    const hasFormBIndicators = assessmentColumns.some(key => 
      key.includes('Form B') || 
      key.includes('NJSLS') ||
      (key.includes('Percent') && key.includes('Raw'))
    );
    
    if (hasPercentRaw && hasFormBIndicators) {
      console.log('   Format detected: LinkIt_NJSLS_Form_B (has Percent/Raw with Form B indicators)');
      return 'LinkIt_NJSLS_Form_B';
    }
    
    // Check for LinkIt NJSLS (generic - has basic assessment structure)
    const hasBasicAssessmentStructure = assessmentColumns.some(key => 
      key.includes('Result Date') || 
      key.includes('Level') || 
      key.includes('Average') ||
      key.includes('Percent') ||
      key.includes('Scaled')
    );
    
    if (hasBasicAssessmentStructure) {
      // Try to determine if it's a specific form based on columnPrefix
      const lowerPrefix = columnPrefix.toLowerCase();
      
      if (lowerPrefix.includes('form a') || lowerPrefix.includes('form_a')) {
        console.log('   Format detected: LinkIt_NJSLS_Form_A (based on column prefix)');
        return 'LinkIt_NJSLS_Form_A';
      } else if (lowerPrefix.includes('form b') || lowerPrefix.includes('form_b')) {
        console.log('   Format detected: LinkIt_NJSLS_Form_B (based on column prefix)');
        return 'LinkIt_NJSLS_Form_B';
      } else if (lowerPrefix.includes('start strong') || lowerPrefix.includes('startstrong')) {
        console.log('   Format detected: Start_Strong (based on column prefix)');
        return 'Start_Strong';
      } else if (lowerPrefix.includes('njsla')) {
        console.log('   Format detected: NJSLA (based on column prefix)');
        return 'NJSLA';
      } else {
        console.log('   Format detected: LinkIt_NJSLS (generic LinkIt structure)');
        return 'LinkIt_NJSLS';
      }
    }
    
    // Check for DOK levels (Depth of Knowledge) - common in LinkIt
    const hasDOK = assessmentColumns.some(key => 
      key.includes('DOK') || key.includes('Depth of Knowledge')
    );
    
    if (hasDOK) {
      console.log('   Format detected: LinkIt_NJSLS (has DOK levels)');
      return 'LinkIt_NJSLS';
    }
    
    // Check for question types (common in LinkIt)
    const hasQuestionTypes = assessmentColumns.some(key => 
      key.includes('Multiple Choice') || 
      key.includes('Drag and Drop') || 
      key.includes('Text Entry') ||
      key.includes('Multi-Select')
    );
    
    if (hasQuestionTypes) {
      console.log('   Format detected: LinkIt_NJSLS (has question types)');
      return 'LinkIt_NJSLS';
    }
    
    // If we have any assessment-related columns but can't determine specific format
    if (assessmentColumns.length > 0) {
      console.log('   Format detected: LinkIt_NJSLS (fallback - has assessment columns)');
      return 'LinkIt_NJSLS';
    }
    
    console.log('   Format detected: Generic (no specific format indicators found)');
    return 'Generic';
  }

  /**
   * Extract ELA subscores from LinkIt data
   */
  private extractELASubscores(row: any, columnPrefix: string): any { // Changed from NJSLAELASubscores to any
    const subscores: any = {}; // Changed from NJSLAELASubscores to any

    // Reading and Writing totals
    const readingScore = parseInt(row[`${columnPrefix} - Reading Scale Score (Scaled)`] || row['Reading Scale Score (Scaled)'] || '0');
    const writingScore = parseInt(row[`${columnPrefix} - Writing Scale Score (Scaled)`] || row['Writing Scale Score (Scaled)'] || '0');

    if (readingScore > 0) subscores.reading_total = readingScore;
    if (writingScore > 0) subscores.writing_total = writingScore;

    // Detailed subscores
    const literaryTextLevel = row[`${columnPrefix} - Reading - Literary Text (Level)`] || row['Reading - Literary Text (Level)'];
    const literaryTextScaled = parseInt(row[`${columnPrefix} - Reading - Literary Text (Scaled)`] || row['Reading - Literary Text (Scaled)'] || '0');

    if (literaryTextLevel && literaryTextScaled > 0) {
      subscores.literary_text = {
        level: literaryTextLevel,
        scaled_score: literaryTextScaled
      };
    }

    const infoTextLevel = row[`${columnPrefix} - Reading - Informational Text (Level)`] || row['Reading - Informational Text (Level)'];
    const infoTextScaled = parseInt(row[`${columnPrefix} - Reading - Informational Text (Scaled)`] || row['Reading - Informational Text (Scaled)'] || '0');

    if (infoTextLevel && infoTextScaled > 0) {
      subscores.informational_text = {
        level: infoTextLevel,
        scaled_score: infoTextScaled
      };
    }

    const vocabLevel = row[`${columnPrefix} - Reading - Vocabulary (Level)`] || row['Reading - Vocabulary (Level)'];
    const vocabScaled = parseInt(row[`${columnPrefix} - Reading - Vocabulary (Scaled)`] || row['Reading - Vocabulary (Scaled)'] || '0');

    if (vocabLevel && vocabScaled > 0) {
      subscores.vocabulary = {
        level: vocabLevel,
        scaled_score: vocabScaled
      };
    }

    const expressionLevel = row[`${columnPrefix} - Writing - Expression (Level)`] || row['Writing - Expression (Level)'];
    const expressionScaled = parseInt(row[`${columnPrefix} - Writing - Expression (Scaled)`] || row['Writing - Expression (Scaled)'] || '0');

    if (expressionLevel && expressionScaled > 0) {
      subscores.expression = {
        level: expressionLevel,
        scaled_score: expressionScaled
      };
    }

    const conventionsLevel = row[`${columnPrefix} - Writing - Conventions (Level)`] || row['Writing - Conventions (Level)'];
    const conventionsScaled = parseInt(row[`${columnPrefix} - Writing - Conventions (Scaled)`] || row['Writing - Conventions (Scaled)'] || '0');

    if (conventionsLevel && conventionsScaled > 0) {
      subscores.conventions = {
        level: conventionsLevel,
        scaled_score: conventionsScaled
      };
    }

    return subscores;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(assessments: NJSLAAssessmentResult[]): any {
    if (assessments.length === 0) {
      return {
        totalStudents: 0,
        totalAssessments: 0,
        averageScore: 0,
        averageScaleScore: 0,
        performanceLevelDistribution: {},
        subjectBreakdown: {},
        gradeBreakdown: {}
      };
    }

    const totalStudents = new Set(assessments.map(a => a.studentId)).size;
    const totalAssessments = assessments.length;
    const averageScaleScore = assessments.reduce((sum, a) => sum + a.scaleScore, 0) / assessments.length;

    // Performance level distribution
    const performanceLevelDistribution = njslaScoringEngine.getPerformanceLevelDistribution(
      assessments.map(a => ({
        scaleScore: a.scaleScore,
        grade: a.gradeLevel,
        subject: a.subject
      }))
    );

    // Subject breakdown
    const subjectBreakdown: Record<string, any> = {};
    const subjects = [...new Set(assessments.map(a => a.subject))];

    subjects.forEach(subject => {
      const subjectAssessments = assessments.filter(a => a.subject === subject);
      const subjectAverage = subjectAssessments.reduce((sum, a) => sum + a.scaleScore, 0) / subjectAssessments.length;

      subjectBreakdown[subject] = {
        totalStudents: new Set(subjectAssessments.map(a => a.studentId)).size,
        averageScore: Math.round(subjectAverage * 100) / 100,
        averageScaleScore: Math.round(subjectAverage * 100) / 100,
        performanceLevelDistribution: njslaScoringEngine.getPerformanceLevelDistribution(
          subjectAssessments.map(a => ({
            scaleScore: a.scaleScore,
            grade: a.gradeLevel,
            subject: a.subject
          }))
        )
      };
    });

    // Grade breakdown
    const gradeBreakdown: Record<string, any> = {};
    const grades = [...new Set(assessments.map(a => a.gradeLevel))];

    grades.forEach(grade => {
      const gradeAssessments = assessments.filter(a => a.gradeLevel === grade);
      const gradeAverage = gradeAssessments.reduce((sum, a) => sum + a.scaleScore, 0) / gradeAssessments.length;

      gradeBreakdown[grade] = {
        totalStudents: new Set(gradeAssessments.map(a => a.studentId)).size,
        averageScore: Math.round(gradeAverage * 100) / 100,
        averageScaleScore: Math.round(gradeAverage * 100) / 100,
        performanceLevelDistribution: njslaScoringEngine.getPerformanceLevelDistribution(
          gradeAssessments.map(a => ({
            scaleScore: a.scaleScore,
            grade: a.gradeLevel,
            subject: a.subject
          }))
        )
      };
    });

    return {
      totalStudents,
      totalAssessments,
      averageScore: Math.round(averageScaleScore * 100) / 100,
      averageScaleScore: Math.round(averageScaleScore * 100) / 100,
      performanceLevelDistribution,
      subjectBreakdown,
      gradeBreakdown
    };
  }

  /**
   * Create empty result for error cases
   */
  private createEmptyResult(errors: string[]): LinkItProcessedData {
    return {
      students: [],
      assessments: [],
      validation: {
        isValid: false,
        errors,
        warnings: [],
        summary: {
          totalRecords: 0,
          validRecords: 0,
          invalidRecords: 0,
          studentsFound: 0,
          assessmentsFound: 0,
          subjectsFound: [],
          gradesFound: []
        }
      },
      summary: {
        totalStudents: 0,
        totalAssessments: 0,
        averageScore: 0,
        averageScaleScore: 0,
        performanceLevelDistribution: {},
        subjectBreakdown: {},
        gradeBreakdown: {}
      }
    };
  }

  /**
   * Validate LinkIt CSV structure
   */
  validateLinkItStructure(headers: string[]): ValidationResult {
    console.log('🔍 Starting LinkIt validation for headers:', headers);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required demographic columns
    const requiredColumns = ['Student', 'ID', 'Grade'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      const error = `Missing required columns: ${missingColumns.join(', ')}`;
      console.error('❌ LinkIt validation error:', error);
      errors.push(error);
    } else {
      console.log('✅ All required demographic columns found:', requiredColumns);
    }

    // Check for assessment columns
    const assessmentColumns = this.detectAssessmentColumns(headers);
    console.log('🔍 Detected assessment columns:', assessmentColumns);
    
    if (assessmentColumns.length === 0) {
      const error = 'No assessment columns detected';
      console.error('❌ LinkIt validation error:', error);
      errors.push(error);
    } else {
      const warning = `Found ${assessmentColumns.length} assessment column(s): ${assessmentColumns.join(', ')}`;
      console.log('✅ Assessment columns detected:', warning);
      warnings.push(warning);
    }

    // Check for required assessment sub-columns - support both formats
    const traditionalSubColumns = ['Result Date', 'Level', 'Scaled'];
    const newFormatSubColumns = ['Result Date', 'Level', 'Percent', 'Raw', 'Average']; // Add 'Average'
    
    const foundTraditionalSubColumns = traditionalSubColumns.filter(subCol => 
      headers.some(h => h.includes(` - ${subCol}`))
    );
    
    const foundNewFormatSubColumns = newFormatSubColumns.filter(subCol => 
      headers.some(h => h.includes(` - ${subCol}`))
    );

    console.log('🔍 Looking for assessment sub-columns:', traditionalSubColumns);
    console.log('🔍 Found assessment sub-columns:', foundTraditionalSubColumns);
    console.log('🔍 Looking for new format sub-columns:', newFormatSubColumns);
    console.log('🔍 Found new format sub-columns:', foundNewFormatSubColumns);

    // Accept either traditional or new format (with Average)
    const hasTraditionalFormat = foundTraditionalSubColumns.length >= 2; // Need at least Result Date and Level/Scaled
    const hasNewFormat = foundNewFormatSubColumns.length >= 3; // Need at least Result Date, Level/Average, and Percent/Raw

    if (!hasTraditionalFormat && !hasNewFormat) {
      const error = 'No assessment result columns found (need either: Result Date, Level, Scaled OR Result Date, Level/Average, Percent, Raw)';
      console.error('❌ LinkIt validation error:', error);
      errors.push(error);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        studentsFound: 0,
        assessmentsFound: assessmentColumns.length,
        subjectsFound: [],
        gradesFound: []
      }
    };
  }
}

// Export singleton instance
export const linkItProcessor = new LinkItProcessor(); 