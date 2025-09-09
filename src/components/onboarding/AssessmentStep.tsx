import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BarChart3, Plus, Trash2, Calendar, Users, AlertCircle, FileSpreadsheet, Eye, Upload } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFormCache } from '../../hooks/useFormCache';
import { assessmentProcessor } from '../../utils/assessmentProcessor';
import { AssessmentSource, ValidationResult, NJSLAAssessmentResult, StudentInfo } from '../../types/assessment';
import DataMappingConfig from './DataMappingConfig';

interface Student {
  student_id: string;
  school_student_id?: string;
  first_name: string;
  last_name: string;
  grade_level: string;
}

interface AssessmentRecord {
  assessment_id: string;
  student_id: string;
  assessment_type: string;
  subject: string;
  grade_level: string;
  school_year?: string;
  test_date: Date;
  raw_score?: number;
  scale_score: number;
  performance_level_text: string;
  min_possible_score: string;
  max_possible_score: string;
  student_growth_percentile?: number;
  subscores?: any;
  unprocessed_data?: any;
}

interface AssessmentStepProps {
  data: AssessmentRecord[];
  students: Student[];
  onUpdate: (data: AssessmentRecord[]) => void;
  schoolId?: string;
}

interface AssessmentFormData {
  student_id: string;
  assessment_type: string;
  subject: string;
  grade_level: string;
  school_year?: string;
  test_date: string;
  raw_score?: number;
  scale_score: number;
  performance_level_text: string;
  min_possible_score: string;
  max_possible_score: string;
  student_growth_percentile?: number;
}

const ASSESSMENT_TYPES = [
  'NJSLA_ELA',
  'NJSLA_MATH',
  'NJSLA_SCIENCE',
  'LINKIT_NJSLS_ELA',
  'LINKIT_NJSLS_MATH',
  'START_STRONG_ELA',
  'START_STRONG_MATH',
  'Custom'
];

const SUBJECTS = ['ELA', 'Mathematics', 'Science'];

const PERFORMANCE_LEVELS = [
  'Exceeding',
  'Meeting',
  'Approaching',
  'Partially Meeting',
  'Below Expectations',
  'Strong Support May Be Needed',
  'Some Support May Be Needed',
  'Less Support May Be Needed'
];

const CURRENT_YEAR = new Date().getFullYear();
const SCHOOL_YEARS = [
  `${CURRENT_YEAR-1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
  `${CURRENT_YEAR+1}-${CURRENT_YEAR+2}`
];

export default function AssessmentStep({ data, students, onUpdate, schoolId }: AssessmentStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDataMapping, setShowDataMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [detectedSource, setDetectedSource] = useState<AssessmentSource>('generic');
  const [suggestedMappings, setSuggestedMappings] = useState<any[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [processedResults, setProcessedResults] = useState<{
    students: StudentInfo[];
    assessments: NJSLAAssessmentResult[];
    summary: any;
  } | null>(null);

  const { data: cachedData, setData: setCachedData } = useFormCache('assessments', data);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AssessmentFormData>({
    defaultValues: {
      test_date: new Date().toISOString().split('T')[0],
      school_year: `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
      scale_score: 0,
      min_possible_score: '650',
      max_possible_score: '850'
    }
  });

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setError(null);
      setShowDataMapping(false);

      // Parse the file
      const { headers, data: parsedData } = await assessmentProcessor.parseCSV(file);
      setCsvHeaders(headers);
      setCsvData(parsedData);

      // Detect assessment source
      const source = assessmentProcessor.detectAssessmentSource(headers);
      setDetectedSource(source);

      // Generate suggested mappings
      const mappings = assessmentProcessor.generateSuggestedMappings(headers, source);
      setSuggestedMappings(mappings);

      // Validate the data
      const validationResult = assessmentProcessor.validateAssessmentData(parsedData, source);
      setValidation(validationResult);

      setShowDataMapping(true);
    } catch (err: any) {
      setError(`Failed to process file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  

  const handleDataMappingProceed = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Process the CSV data with the configured mappings
      const processedData = await assessmentProcessor.processAssessmentData(csvData, detectedSource);
      
      // Transform to our assessment record format
      const newAssessments: AssessmentRecord[] = processedData.assessments.map(assessment => {
        // Find the student by matching school_student_id or student_id
        const student = students.find(s => 
          s.student_id === assessment.studentId || 
          s.school_student_id === assessment.studentId
        );

        if (!student) {
          throw new Error(`Student not found for ID: ${assessment.studentId}`);
        }

        return {
          assessment_id: '', // Will be set by backend
          student_id: student.student_id,
          assessment_type: assessment.assessmentType,
          subject: assessment.subject,
          grade_level: assessment.gradeLevel,
          school_year: assessment.schoolYear,
          test_date: assessment.testDate,
          raw_score: assessment.rawScore,
          scale_score: assessment.scaleScore,
          performance_level_text: assessment.performanceLevelText,
          min_possible_score: assessment.minPossibleScore,
          max_possible_score: assessment.maxPossibleScore,
          student_growth_percentile: assessment.studentGrowthPercentile,
          subscores: assessment.subscores,
          unprocessed_data: assessment.unprocessedData
        };
      });

      const updatedData = [...cachedData, ...newAssessments];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setProcessedResults(processedData);
      setShowDataMapping(false);
      setError(null);
    } catch (err: any) {
      setError(`Failed to process assessments: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (formData: AssessmentFormData) => {
    // Find student
    const student = students.find(s => s.student_id === formData.student_id);
    if (!student) {
      setError('Student not found');
      return;
    }

    // Check for duplicate assessment (same student, type, and date)
    if (cachedData.some(assessment => 
      assessment.student_id === formData.student_id && 
      assessment.assessment_type === formData.assessment_type &&
      assessment.test_date.toDateString() === new Date(formData.test_date).toDateString()
    )) {
      setError('An assessment record for this student, type, and date already exists');
      return;
    }

    // Validate score ranges
    if (formData.scale_score < 0) {
      setError('Scale score cannot be negative');
      return;
    }

    const newAssessment: AssessmentRecord = {
      assessment_id: '', // Will be set by backend
      student_id: formData.student_id,
      assessment_type: formData.assessment_type,
      subject: formData.subject,
      grade_level: formData.grade_level,
      school_year: formData.school_year,
      test_date: new Date(formData.test_date),
      raw_score: formData.raw_score,
      scale_score: formData.scale_score,
      performance_level_text: formData.performance_level_text,
      min_possible_score: formData.min_possible_score,
      max_possible_score: formData.max_possible_score,
      student_growth_percentile: formData.student_growth_percentile,
      subscores: {},
      unprocessed_data: {}
    };

    const updatedData = [...cachedData, newAssessment];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset({
      test_date: new Date().toISOString().split('T')[0],
      school_year: formData.school_year,
      scale_score: 0,
      min_possible_score: '650',
      max_possible_score: '850'
    });
    setError(null);
  };

  const removeAssessment = (index: number) => {
    const newAssessments = [...cachedData];
    newAssessments.splice(index, 1);
    onUpdate(newAssessments);
    setCachedData(newAssessments);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

  const getStudentSchoolId = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student?.school_student_id || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Assessment Records</h2>
      </div>

      {/* Field Requirements Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Field Requirements</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Required Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Student ID</li>
              <li>• Assessment Type</li>
              <li>• Subject</li>
              <li>• Grade Level</li>
              <li>• Test Date</li>
              <li>• Scale Score</li>
              <li>• Performance Level</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• School Year</li>
              <li>• Raw Score</li>
              <li>• Student Growth Percentile</li>
              <li>• Min/Max Possible Scores</li>
              <li>• Subscores (JSON)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Assessment Import */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-medium text-gray-900">Advanced Assessment Import</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload LinkIt, NJSLA, or other assessment files. The system will automatically detect the format and guide you through data mapping.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload Assessment File
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    CSV, Excel files supported (LinkIt, NJSLA, Genesis formats)
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    disabled={isProcessing}
                  />
                  <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                    {isProcessing ? 'Processing...' : 'Choose File'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Mapping Configuration */}
      {showDataMapping && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <DataMappingConfig
            csvHeaders={csvHeaders}
            detectedSource={detectedSource}
            suggestedMappings={suggestedMappings}
            onMappingChange={setSuggestedMappings}
            onPreview={() => {
              // Preview functionality
              console.log('Preview data mapping');
            }}
            onProceed={handleDataMappingProceed}
            validation={validation || undefined}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Processing Results */}
      {processedResults && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-900">Processing Results</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{processedResults.summary.totalStudents}</div>
              <div className="text-sm text-blue-600">Students Processed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{processedResults.summary.totalAssessments}</div>
              <div className="text-sm text-green-600">Assessments Added</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{processedResults.summary.averageScaleScore}</div>
              <div className="text-sm text-purple-600">Average Scale Score</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(processedResults.summary.subjectBreakdown).length}
              </div>
              <div className="text-sm text-orange-600">Subjects Found</div>
            </div>
          </div>

          {/* Performance Level Distribution */}
          {Object.keys(processedResults.summary.performanceLevelDistribution).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Level Distribution</h4>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(processedResults.summary.performanceLevelDistribution).map(([level, count]) => (
                  <div key={level} className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-600">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      

      {/* List of added assessments */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Assessment Records</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((assessment, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {getStudentName(assessment.student_id)} ({getStudentSchoolId(assessment.student_id)})
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          {assessment.assessment_type}
                        </div>
                        <div>
                          {assessment.subject} - Grade {assessment.grade_level}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(assessment.test_date).toLocaleDateString()}
                        </div>
                        <div>
                          Score: {assessment.scale_score}
                        </div>
                        <div>
                          Level: {assessment.performance_level_text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAssessment(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new assessment form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Individual Assessment Record</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student *
                </label>
                <select
                  {...register('student_id', { required: 'Student is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.student_id && "border-red-300"
                  )}
                >
                  <option value="">Select student...</option>
                  {students.map(student => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.first_name} {student.last_name} ({student.school_student_id || 'No ID'})
                    </option>
                  ))}
                </select>
                {errors.student_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.student_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assessment Type *
                </label>
                <select
                  {...register('assessment_type', { required: 'Assessment type is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.assessment_type && "border-red-300"
                  )}
                >
                  <option value="">Select type...</option>
                  {ASSESSMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.assessment_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.assessment_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subject *
                </label>
                <select
                  {...register('subject', { required: 'Subject is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.subject && "border-red-300"
                  )}
                >
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Grade Level *
                </label>
                <input
                  type="text"
                  {...register('grade_level', { required: 'Grade level is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.grade_level && "border-red-300"
                  )}
                  placeholder="e.g., 3, 4, 5"
                />
                {errors.grade_level && (
                  <p className="mt-1 text-sm text-red-600">{errors.grade_level.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Test Date *
                </label>
                <input
                  type="date"
                  {...register('test_date', { required: 'Test date is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.test_date && "border-red-300"
                  )}
                />
                {errors.test_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.test_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  School Year
                </label>
                <select
                  {...register('school_year')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {SCHOOL_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Score Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Score Information</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scale Score *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('scale_score', { 
                    required: 'Scale score is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.scale_score && "border-red-300"
                  )}
                />
                {errors.scale_score && (
                  <p className="mt-1 text-sm text-red-600">{errors.scale_score.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Raw Score
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('raw_score', {
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Min Possible Score
                </label>
                <input
                  type="text"
                  {...register('min_possible_score')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Possible Score
                </label>
                <input
                  type="text"
                  {...register('max_possible_score')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Performance Level *
                </label>
                <select
                  {...register('performance_level_text', { required: 'Performance level is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.performance_level_text && "border-red-300"
                  )}
                >
                  <option value="">Select level...</option>
                  {PERFORMANCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {errors.performance_level_text && (
                  <p className="mt-1 text-sm text-red-600">{errors.performance_level_text.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Student Growth Percentile
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  {...register('student_growth_percentile', {
                    min: { value: 1, message: 'Must be between 1 and 99' },
                    max: { value: 99, message: 'Must be between 1 and 99' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}