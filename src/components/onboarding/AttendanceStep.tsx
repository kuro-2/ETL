import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import AttendanceBulkImport from './AttendanceBulkImport';
import { useFormCache } from '../../hooks/useFormCache';

interface Student {
  student_id: string;
  school_student_id?: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  student_id: string;
  school_id: string;
  record_date: string;
  total_days_present: number;
  total_days_possible: number;
  fy_absences_total: number;
  fy_absences_excused: number;
  fy_absences_unexcused: number;
  fy_tardies_total: number;
  attendance_year?: string;
  extra_data?: Record<string, unknown>;
}


interface AttendanceFormData {
  school_student_id: string;
  record_date: string;
  total_days_present: number;
  total_days_possible: number;
  fy_absences_total: number;
  fy_absences_excused: number;
  fy_absences_unexcused: number;
  fy_tardies_total: number;
  attendance_year?: string;
  daily_attendance_rate?: number;
  mp1_attendance_rate?: number;
  mp2_attendance_rate?: number;
  mp3_attendance_rate?: number;
  mp4_attendance_rate?: number;
}

interface AttendanceStepProps {
  data: AttendanceRecord[];
  students: Student[];
  onUpdate: (data: AttendanceRecord[]) => void;
  schoolId?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const SCHOOL_YEARS = [
  `${CURRENT_YEAR-1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
  `${CURRENT_YEAR+1}-${CURRENT_YEAR+2}`
];

export default function AttendanceStep({ data, students, onUpdate, schoolId }: AttendanceStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('attendance', data);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AttendanceFormData>({
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0],
      attendance_year: `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
      total_days_present: 0,
      total_days_possible: 0,
      fy_absences_total: 0,
      fy_absences_excused: 0,
      fy_absences_unexcused: 0,
      fy_tardies_total: 0
    }
  });

  const handleBulkImport = (importedData: Record<string, unknown>[]) => {
    try {
      // Show debug info about detected columns
      if (importedData.length > 0) {
        const detectedColumns = Object.keys(importedData[0]);
        setDebugInfo(`Detected ${detectedColumns.length} columns: ${detectedColumns.join(', ')}`);
      }

      // Enhanced column mapping function to handle various column name formats
      const mapColumn = (row: Record<string, unknown>, possibleKeys: string[]): unknown => {
        for (const key of possibleKeys) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
          }
          // Try case-insensitive and trimmed matching
          const foundKey = Object.keys(row).find(k => 
            k.toLowerCase().trim() === key.toLowerCase().trim()
          );
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
            return row[foundKey];
          }
        }
        return undefined;
      };

      // Transform imported data to match database schema
      const transformedData = importedData.map(row => {
        return {
          // Required database fields
          school_student_id: mapColumn(row, ['Student', 'ID', 'Student ID', 'StudentID', 'State ID']),
          record_date: mapColumn(row, ['Result Date', 'Date', 'Export Date', 'Record Date']),
          total_days_present: mapColumn(row, ['Total Days Present', 'Days Present', 'Present Days']),
          total_days_possible: mapColumn(row, ['Total Days Possible', 'Days Possible', 'Possible Days']),
          fy_absences_total: mapColumn(row, ['FY Absences (Total Days)', 'Total Absences', 'Absences Total']),
          fy_absences_excused: mapColumn(row, ['FY Absences (Excused Days)', 'Excused Absences', 'Excused']),
          fy_absences_unexcused: mapColumn(row, ['FY Absences (Unexcused Days)', 'Unexcused Absences', 'Unexcused']),
          fy_tardies_total: mapColumn(row, ['FY Tardies (Total Days)', 'Total Tardies', 'Tardies']),
          
          // Optional database fields
          attendance_year: mapColumn(row, ['Attendance Year', 'School Year', 'Academic Year']),
          
          // All other fields will be stored in extra_data automatically
          ...row // Include all original columns for extra_data processing
        };
      });

      // Validate required fields
      const invalidRecords = transformedData.filter(row => 
        !row.school_student_id || 
        !row.record_date || 
        row.total_days_present === undefined || 
        row.total_days_possible === undefined ||
        row.fy_absences_total === undefined ||
        row.fy_absences_excused === undefined ||
        row.fy_absences_unexcused === undefined ||
        row.fy_tardies_total === undefined
      );

      if (invalidRecords.length > 0) {
        setError(`Missing required fields in ${invalidRecords.length} rows. Make sure your file contains: Student ID, Result Date, Total Days Present, Total Days Possible, FY Absences (Total Days), FY Absences (Excused Days), FY Absences (Unexcused Days), FY Tardies (Total Days)`);
        return;
      }

      // Validate student IDs exist
      const studentIds = new Set(students.map(s => s.school_student_id).filter(Boolean));
      const invalidStudents = transformedData.filter(row => 
        !studentIds.has(row.school_student_id as string)
      );

      if (invalidStudents.length > 0) {
        setError(`Invalid student IDs found: ${invalidStudents.map(r => r.school_student_id).join(', ')}. Make sure students are imported first.`);
        return;
      }

      // Validate numeric fields
      const numericFields = [
        'total_days_present', 'total_days_possible', 'fy_absences_total',
        'fy_absences_excused', 'fy_absences_unexcused', 'fy_tardies_total'
      ];

      const invalidNumeric = transformedData.filter(row => 
        numericFields.some(field => 
          row[field as keyof typeof row] !== undefined && 
          (isNaN(Number(row[field as keyof typeof row])) || Number(row[field as keyof typeof row]) < 0)
        )
      );

      if (invalidNumeric.length > 0) {
        setError(`Invalid numeric values found in ${invalidNumeric.length} rows`);
        return;
      }

      // Transform to AttendanceRecord format matching database schema
      const newAttendanceRecords: AttendanceRecord[] = transformedData.map(row => {
        // Find student by school_student_id
        const student = students.find(s => s.school_student_id === row.school_student_id);
        
        // Collect all extra data for extra_data JSONB field
        // All non-required columns (except attendance_year) go into extra_data
        const extraData: Record<string, unknown> = {};
        
        // Define which fields are required or standard optional fields
        const requiredFieldKeys = [
          'school_student_id', 'record_date', 'total_days_present', 'total_days_possible',
          'fy_absences_total', 'fy_absences_excused', 'fy_absences_unexcused', 'fy_tardies_total'
        ];
        const standardOptionalKeys = ['attendance_year'];
        
        // Add all other fields to extra_data, excluding any explicitly excluded columns
        Object.keys(row).forEach(key => {
          const transformedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!requiredFieldKeys.includes(transformedKey) && !standardOptionalKeys.includes(transformedKey)) {
            const value = (row as Record<string, unknown>)[key];
            if (value !== undefined && value !== null && value !== '') {
              // Store the original column name as the key with the value
              extraData[key] = value;
            }
          }
        });

        // Format the date properly
        let recordDate = row.record_date as string;
        if (recordDate) {
          // Handle Excel serial date numbers (like 45462)
          const numericDate = Number(recordDate);
          if (!isNaN(numericDate) && numericDate > 25000 && numericDate < 100000) {
            // Convert Excel serial date to JavaScript date
            // Excel dates start from 1900-01-01, but JavaScript dates start from 1970-01-01
            // Excel serial day 1 = 1900-01-01, but there's a leap year bug for 1900
            const excelEpoch = new Date(1900, 0, 1);
            const jsDate = new Date(excelEpoch.getTime() + (numericDate - 1) * 24 * 60 * 60 * 1000);
            recordDate = jsDate.toISOString().split('T')[0];
          } else if (recordDate.includes(',')) {
            // Handle dates like "Jun 19, 2024" - convert to YYYY-MM-DD format
            const date = new Date(recordDate);
            if (!isNaN(date.getTime())) {
              recordDate = date.toISOString().split('T')[0];
            }
          }
        }

        return {
          student_id: student!.student_id,
          school_id: schoolId || '',
          record_date: recordDate,
          total_days_present: Number(row.total_days_present),
          total_days_possible: Number(row.total_days_possible),
          fy_absences_total: Number(row.fy_absences_total),
          fy_absences_excused: Number(row.fy_absences_excused),
          fy_absences_unexcused: Number(row.fy_absences_unexcused),
          fy_tardies_total: Number(row.fy_tardies_total),
          attendance_year: (row.attendance_year as string) || `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
          extra_data: Object.keys(extraData).length > 0 ? extraData : undefined
        };
      });

      // Check for duplicate records (same student and date)
      const duplicates = newAttendanceRecords.filter(newRecord => 
        cachedData.some(existing => 
          existing.student_id === newRecord.student_id && 
          existing.record_date === newRecord.record_date
        )
      );

      if (duplicates.length > 0) {
        setError(`Duplicate attendance records found for ${duplicates.length} student-date combinations`);
        return;
      }

      const updatedData = [...cachedData, ...newAttendanceRecords];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
      setDebugInfo(`✅ Successfully imported ${newAttendanceRecords.length} attendance records!`);
      
      // Clear debug info after 5 seconds
      setTimeout(() => setDebugInfo(null), 5000);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      console.error('Import error:', error);
      setError(error.message || 'Failed to import attendance records');
      setDebugInfo(null);
    }
  };

  const onSubmit = (formData: AttendanceFormData) => {
    // Find student by school_student_id
    const student = students.find(s => s.school_student_id === formData.school_student_id);
    if (!student) {
      setError('Student not found with the provided School Student ID');
      return;
    }

    // Check for duplicate record (same student and date)
    if (cachedData.some(record => 
      record.student_id === student.student_id && 
      record.record_date === formData.record_date
    )) {
      setError('An attendance record for this student and date already exists');
      return;
    }

    // Validate numeric values
    const numericFields = [
      'total_days_present', 'total_days_possible', 'fy_absences_total',
      'fy_absences_excused', 'fy_absences_unexcused', 'fy_tardies_total'
    ];

    for (const field of numericFields) {
      const value = formData[field as keyof AttendanceFormData] as number;
      if (value < 0) {
        setError(`${field.replace(/_/g, ' ')} cannot be negative`);
        return;
      }
    }

    // Validate attendance rates if provided
    const rateFields = [
      'daily_attendance_rate', 'mp1_attendance_rate', 'mp2_attendance_rate',
      'mp3_attendance_rate', 'mp4_attendance_rate'
    ];

    for (const field of rateFields) {
      const value = formData[field as keyof AttendanceFormData] as number;
      if (value !== undefined && (value < 0 || value > 100)) {
        setError(`${field.replace(/_/g, ' ')} must be between 0 and 100`);
        return;
      }
    }

    const extraData: Record<string, unknown> = {};
    if (formData.daily_attendance_rate !== undefined) extraData.daily_attendance_rate = formData.daily_attendance_rate;
    if (formData.mp1_attendance_rate !== undefined) extraData.mp1_attendance_rate = formData.mp1_attendance_rate;
    if (formData.mp2_attendance_rate !== undefined) extraData.mp2_attendance_rate = formData.mp2_attendance_rate;
    if (formData.mp3_attendance_rate !== undefined) extraData.mp3_attendance_rate = formData.mp3_attendance_rate;
    if (formData.mp4_attendance_rate !== undefined) extraData.mp4_attendance_rate = formData.mp4_attendance_rate;

    const newAttendanceRecord: AttendanceRecord = {
      student_id: student.student_id,
      school_id: schoolId || '',
      record_date: formData.record_date,
      total_days_present: formData.total_days_present,
      total_days_possible: formData.total_days_possible,
      fy_absences_total: formData.fy_absences_total,
      fy_absences_excused: formData.fy_absences_excused,
      fy_absences_unexcused: formData.fy_absences_unexcused,
      fy_tardies_total: formData.fy_tardies_total,
      attendance_year: formData.attendance_year,
      extra_data: Object.keys(extraData).length > 0 ? extraData : undefined
    };

    const updatedData = [...cachedData, newAttendanceRecord];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset({
      record_date: new Date().toISOString().split('T')[0],
      attendance_year: formData.attendance_year,
      total_days_present: 0,
      total_days_possible: 0,
      fy_absences_total: 0,
      fy_absences_excused: 0,
      fy_absences_unexcused: 0,
      fy_tardies_total: 0
    });
    setError(null);
  };

  const removeAttendanceRecord = (index: number) => {
    const newRecords = [...cachedData];
    newRecords.splice(index, 1);
    onUpdate(newRecords);
    setCachedData(newRecords);
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
          <Calendar className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
      </div>

      {/* Field Requirements Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Field Requirements & Column Name Variations</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Required Fields (Multiple column name variations supported)
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>Student ID:</strong> 'Student', 'ID', 'Student ID', 'StudentID', 'State ID'</li>
              <li>• <strong>Record Date:</strong> 'Result Date', 'Date', 'Export Date', 'Record Date'</li>
              <li>• <strong>Days Present:</strong> 'Total Days Present', 'Days Present', 'Present Days'</li>
              <li>• <strong>Days Possible:</strong> 'Total Days Possible', 'Days Possible', 'Possible Days'</li>
              <li>• <strong>Total Absences:</strong> 'FY Absences (Total Days)', 'Total Absences'</li>
              <li>• <strong>Excused Absences:</strong> 'FY Absences (Excused Days)', 'Excused Absences'</li>
              <li>• <strong>Unexcused Absences:</strong> 'FY Absences (Unexcused Days)', 'Unexcused Absences'</li>
              <li>• <strong>Total Tardies:</strong> 'FY Tardies (Total Days)', 'Total Tardies', 'Tardies'</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields - All Map to extra_data
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-2">
                  🔄 <strong>Unified Mapping:</strong> All optional columns automatically map to the extra_data field
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• <strong>Example:</strong> "Daily Attendance Rate" → extra_data</p>
                  <p>• <strong>Example:</strong> "Level" → extra_data</p>
                  <p>• <strong>Example:</strong> "MP1 (Total Days Present)" → extra_data</p>
                  <p>• <strong>Example:</strong> "Grade" → extra_data</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700">Supported Optional Data:</p>
                <div className="text-xs text-gray-600 space-y-1 mt-1">
                  <p>• Attendance rates (Daily, MP1-MP4)</p>
                  <p>• Marking period details (Days, Absences, Tardies)</p>
                  <p>• Student demographics (Grade, Race, Gender, etc.)</p>
                  <p>• School/District time data</p>
                  <p>• Custom scores and virtual days</p>
                  <p>• Any other additional columns in your file</p>
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
              <p className="text-xs text-green-700">
                ✨ <strong>Smart Control:</strong> The system automatically stores ALL additional columns 
                as JSON data in the extra_data field. Use the ⊗ button next to each optional field 
                to exclude columns you don't need. Excluded columns won't be imported and can be 
                restored using the + button if needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bulk Import Attendance Records</h3>
          <p className="text-sm text-gray-600">
            Upload your attendance file and map columns to required and optional fields. 
            The system will automatically separate required fields from optional ones for easier mapping.
          </p>
        </div>
        <AttendanceBulkImport
          onImport={handleBulkImport}
          requiredFields={[
            'Student ID', 'Record Date', 'Total Days Present', 
            'Total Days Possible', 'FY Absences (Total Days)', 'FY Absences (Excused Days)',
            'FY Absences (Unexcused Days)', 'FY Tardies (Total Days)'
          ]}
          template={{
            'Student': 'S123',
            'Result Date': '2024-12-31',
            'Total Days Present': '180',
            'Total Days Possible': '185',
            'FY Absences (Total Days)': '5',
            'FY Absences (Excused Days)': '3',
            'FY Absences (Unexcused Days)': '2',
            'FY Tardies (Total Days)': '8',
            'Daily Attendance Rate': '97.3',
            'MP1 (Daily Attendance Rate)': '95.0',
            'MP2 (Daily Attendance Rate)': '98.5',
            'MP3 (Daily Attendance Rate)': '96.8',
            'MP4 (Daily Attendance Rate)': '99.2',
            'Grade': '3',
            'Gender': 'F',
            'Race': 'Hispanic',
            'Home Language': 'Spanish',
            'MP1 (Total Days Present)': '45',
            'MP1 Absences (Total Days)': '2',
            'Current School': 'Elementary School A'
          }}
          description="Upload a CSV or Excel file containing attendance records. After uploading, you'll see two sections: one for mapping required fields (highlighted in red) and another showing optional fields that automatically map to extra_data (highlighted in gray). All optional fields are stored as JSON in the database's extra_data column, preserving every piece of information from your file."
        />
      </div>

      {/* Debug Info - Show detected columns */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">🔍 Column Detection</h4>
          <p className="text-sm text-blue-700">{debugInfo}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Import Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* List of added attendance records */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Attendance Records</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((record, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {getStudentName(record.student_id)} ({getStudentSchoolId(record.student_id)})
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(record.record_date).toLocaleDateString()}
                        </div>
                        <div>
                          Present: {record.total_days_present}/{record.total_days_possible}
                        </div>
                        <div>
                          Absences: {record.fy_absences_total}
                        </div>
                        <div>
                          Tardies: {record.fy_tardies_total}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttendanceRecord(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new attendance record form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Attendance Record</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Basic Information</h4>
            <div className="grid grid-cols-3 gap-4">
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
                  Record Date *
                </label>
                <input
                  type="date"
                  {...register('record_date', { required: 'Record date is required' })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.record_date && "border-red-300"
                  )}
                />
                {errors.record_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.record_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Attendance Year
                </label>
                <select
                  {...register('attendance_year')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {SCHOOL_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Attendance Data */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Attendance Data</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Days Present *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('total_days_present', { 
                    required: 'Total days present is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.total_days_present && "border-red-300"
                  )}
                />
                {errors.total_days_present && (
                  <p className="mt-1 text-sm text-red-600">{errors.total_days_present.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Days Possible *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('total_days_possible', { 
                    required: 'Total days possible is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.total_days_possible && "border-red-300"
                  )}
                />
                {errors.total_days_possible && (
                  <p className="mt-1 text-sm text-red-600">{errors.total_days_possible.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  FY Absences Total *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('fy_absences_total', { 
                    required: 'FY absences total is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.fy_absences_total && "border-red-300"
                  )}
                />
                {errors.fy_absences_total && (
                  <p className="mt-1 text-sm text-red-600">{errors.fy_absences_total.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  FY Tardies Total *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('fy_tardies_total', { 
                    required: 'FY tardies total is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.fy_tardies_total && "border-red-300"
                  )}
                />
                {errors.fy_tardies_total && (
                  <p className="mt-1 text-sm text-red-600">{errors.fy_tardies_total.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  FY Absences Excused *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('fy_absences_excused', { 
                    required: 'FY absences excused is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.fy_absences_excused && "border-red-300"
                  )}
                />
                {errors.fy_absences_excused && (
                  <p className="mt-1 text-sm text-red-600">{errors.fy_absences_excused.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  FY Absences Unexcused *
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('fy_absences_unexcused', { 
                    required: 'FY absences unexcused is required',
                    min: { value: 0, message: 'Cannot be negative' }
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                    errors.fy_absences_unexcused && "border-red-300"
                  )}
                />
                {errors.fy_absences_unexcused && (
                  <p className="mt-1 text-sm text-red-600">{errors.fy_absences_unexcused.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Attendance Rates */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Attendance Rates (Optional)</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Daily Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('daily_attendance_rate', {
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MP1 Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('mp1_attendance_rate', {
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MP2 Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('mp2_attendance_rate', {
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MP3 Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('mp3_attendance_rate', {
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MP4 Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('mp4_attendance_rate', {
                    min: { value: 0, message: 'Must be between 0 and 100' },
                    max: { value: 100, message: 'Must be between 0 and 100' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attendance Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}