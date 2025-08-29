import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Heart, Plus, Trash2, Users, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
import { useFormCache } from '../../hooks/useFormCache';

interface Student {
  student_id: string;
  school_student_id?: string;
  first_name: string;
  last_name: string;
}

interface IndividualizedNeed {
  need_id: string;
  student_id: string;
  type: string;
  details: {
    status?: string;
    spec_ed_status?: string;
    spec_ed?: string;
    home_language?: string;
    has_active_iep?: boolean;
    ell_active?: boolean;
    additional_notes?: string;
  };
}

interface IndividualizedNeedsFormData {
  school_student_id: string;
  type: string;
  status?: string;
  spec_ed_status?: string;
  spec_ed?: string;
  home_language?: string;
  has_active_iep?: boolean;
  ell_active?: boolean;
  additional_notes?: string;
}

interface IndividualizedNeedsStepProps {
  data: IndividualizedNeed[];
  students: Student[];
  onUpdate: (data: IndividualizedNeed[]) => void;
}

const NEED_TYPES = [
  'Special Education',
  'English Language Learning',
  'Academic Support',
  'Behavioral Support',
  'Medical Accommodation',
  'Other'
];

const SPEC_ED_STATUSES = [
  'Active',
  'Inactive',
  'Pending Evaluation',
  'Exited',
  'Not Applicable'
];

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Arabic',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Vietnamese',
  'Tagalog',
  'Hindi',
  'Other'
];

export default function IndividualizedNeedsStep({ data, students, onUpdate }: IndividualizedNeedsStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('individualized_needs', data);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<IndividualizedNeedsFormData>({
    defaultValues: {
      type: 'Special Education',
      has_active_iep: false,
      ell_active: false,
      home_language: 'English'
    }
  });

  const handleBulkImport = (importedData: any[]) => {
    try {
      const processed: IndividualizedNeed[] = [];
      const processingErrors: string[] = [];

      importedData.forEach((row, idx) => {
        // Find student by school_student_id
        const student = students.find(s => 
          s.school_student_id === String(row.school_student_id || row.student_id || row.ID || '').trim()
        );

        if (!student) {
          processingErrors.push(`Row ${idx + 1}: Student not found with ID ${row.school_student_id || row.student_id || row.ID}`);
          return;
        }

        // Determine need type based on data
        let needType = 'Academic Support'; // Default
        
        if (row['Spec Ed Status'] || row['Spec Ed'] || row['Has Active IEP Or Related Services']) {
          needType = 'Special Education';
        } else if (row['Ell Active'] || (row['Home Language'] && row['Home Language'] !== 'English')) {
          needType = 'English Language Learning';
        }

        // Parse boolean values
        const parseBoolean = (value: any): boolean => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'active';
          }
          return false;
        };

        // Build details object
        const details: IndividualizedNeed['details'] = {
          status: row.status || 'Active',
          spec_ed_status: row['Spec Ed Status'] || row.spec_ed_status,
          spec_ed: row['Spec Ed'] || row.spec_ed,
          home_language: row['Home Language'] || row.home_language || 'English',
          has_active_iep: parseBoolean(row['Has Active IEP Or Related Services'] || row.has_active_iep),
          ell_active: parseBoolean(row['Ell Active'] || row.ell_active),
          additional_notes: row.additional_notes || row.notes
        };

        // Remove undefined values
        Object.keys(details).forEach(key => {
          if (details[key as keyof typeof details] === undefined) {
            delete details[key as keyof typeof details];
          }
        });

        const need: IndividualizedNeed = {
          need_id: '', // Will be set by backend
          student_id: student.student_id,
          type: needType,
          details
        };

        processed.push(need);
      });

      if (processingErrors.length > 0) {
        setError(processingErrors.slice(0, 5).join('\n') + 
          (processingErrors.length > 5 ? `\n... and ${processingErrors.length - 5} more errors` : ''));
        return;
      }

      const updatedData = [...cachedData, ...processed];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
    } catch (err: any) {
      setError(`Failed to import individualized needs: ${err.message}`);
    }
  };

  const onSubmit = (formData: IndividualizedNeedsFormData) => {
    // Find student by school_student_id
    const student = students.find(s => s.school_student_id === formData.school_student_id);
    if (!student) {
      setError('Student not found with the provided School Student ID');
      return;
    }

    // Check for duplicate record (same student and type)
    if (cachedData.some(need => 
      need.student_id === student.student_id && 
      need.type === formData.type
    )) {
      setError('An individualized need record of this type already exists for this student');
      return;
    }

    // Build details object
    const details: IndividualizedNeed['details'] = {
      status: formData.status,
      spec_ed_status: formData.spec_ed_status,
      spec_ed: formData.spec_ed,
      home_language: formData.home_language,
      has_active_iep: formData.has_active_iep,
      ell_active: formData.ell_active,
      additional_notes: formData.additional_notes
    };

    // Remove undefined values
    Object.keys(details).forEach(key => {
      if (details[key as keyof typeof details] === undefined || details[key as keyof typeof details] === '') {
        delete details[key as keyof typeof details];
      }
    });

    const newNeed: IndividualizedNeed = {
      need_id: '', // Will be set by backend
      student_id: student.student_id,
      type: formData.type,
      details
    };

    const updatedData = [...cachedData, newNeed];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset({
      type: 'Special Education',
      has_active_iep: false,
      ell_active: false,
      home_language: 'English'
    });
    setError(null);
  };

  const removeNeed = (index: number) => {
    const newNeeds = [...cachedData];
    newNeeds.splice(index, 1);
    onUpdate(newNeeds);
    setCachedData(newNeeds);
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

  const getStudentSchoolId = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId);
    return student?.school_student_id || 'N/A';
  };

  const formatDetailsForDisplay = (details: IndividualizedNeed['details']) => {
    const items = [];
    
    if (details.spec_ed_status) items.push(`Spec Ed: ${details.spec_ed_status}`);
    if (details.home_language && details.home_language !== 'English') items.push(`Language: ${details.home_language}`);
    if (details.has_active_iep) items.push('Active IEP');
    if (details.ell_active) items.push('ELL Active');
    if (details.status) items.push(`Status: ${details.status}`);
    
    return items.length > 0 ? items.join(' • ') : 'No specific details';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Heart className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Individualized Student Needs</h2>
      </div>

      {/* Step Overview */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">Step Overview</h3>
            <p className="text-sm text-blue-700">
              This step processes individualized student needs data including special education status, 
              English language learning requirements, IEP information, and home language details. 
              The system automatically categorizes needs and stores structured data for compliance 
              and educational planning purposes.
            </p>
          </div>
        </div>
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
              <li>• School Student ID (to link to existing student)</li>
              <li>• Need Type</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Status</li>
              <li>• Special Education Status</li>
              <li>• Special Education Details</li>
              <li>• Home Language</li>
              <li>• Has Active IEP</li>
              <li>• ELL Active Status</li>
              <li>• Additional Notes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Processing Logic Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Data Processing Logic</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div>
            <strong>Type Determination:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>If Spec Ed Status, Spec Ed, or Has Active IEP data exists → "Special Education"</li>
              <li>If ELL Active is true or Home Language is not English → "English Language Learning"</li>
              <li>Otherwise → "Academic Support" (default)</li>
            </ul>
          </div>
          <div>
            <strong>Data Validation:</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Student ID must match existing student from Students step</li>
              <li>Boolean fields are parsed from various formats (true/false, yes/no, 1/0, active/inactive)</li>
              <li>Home Language defaults to "English" if not specified</li>
              <li>Status defaults to "Active" if not specified</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['school_student_id', 'type']}
          template={{
            school_student_id: 'S123',
            status: 'Active',
            'Spec Ed Status': 'Active',
            'Spec Ed': 'Learning Disability',
            'Home Language': 'Spanish',
            'Has Active IEP Or Related Services': 'true',
            'Ell Active': 'false',
            additional_notes: 'Student requires extended time for assessments'
          }}
          description="Upload a CSV or Excel file containing individualized student needs data. The system will automatically determine need types based on the data provided. Student ID must match existing students from the Students step."
        />
      </div>

      {/* List of added needs */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Individualized Needs</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((need, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {getStudentName(need.student_id)} ({getStudentSchoolId(need.student_id)})
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          Type: {need.type}
                        </div>
                        <div>
                          {formatDetailsForDisplay(need.details)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeNeed(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new individualized need form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Individualized Need</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  School Student ID *
                </label>
                <select
                  {...register('school_student_id', { required: 'School Student ID is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.school_student_id && "border-red-300"
                  )}
                >
                  <option value="">Select student...</option>
                  {students
                    .filter(s => s.school_student_id)
                    .map(student => (
                      <option key={student.student_id} value={student.school_student_id}>
                        {student.school_student_id} - {student.first_name} {student.last_name}
                      </option>
                    ))}
                </select>
                {errors.school_student_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.school_student_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Need Type *
                </label>
                <select
                  {...register('type', { required: 'Need type is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.type && "border-red-300"
                  )}
                >
                  {NEED_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select status...</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Home Language
                </label>
                <select
                  {...register('home_language')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {LANGUAGES.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Special Education Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Special Education Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Special Education Status
                </label>
                <select
                  {...register('spec_ed_status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select status...</option>
                  {SPEC_ED_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Special Education Details
                </label>
                <input
                  type="text"
                  {...register('spec_ed')}
                  placeholder="e.g., Learning Disability, Autism, etc."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('has_active_iep')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Has Active IEP or Related Services
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register('ell_active')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  English Language Learner (ELL) Active
                </label>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                {...register('additional_notes')}
                rows={3}
                placeholder="Any additional notes about the student's individualized needs..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
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
              Add Individualized Need
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}