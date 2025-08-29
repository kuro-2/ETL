import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Plus, Trash2, Users, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
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
  extra_data?: {
    daily_attendance_rate?: number;
    mp1_attendance_rate?: number;
    mp2_attendance_rate?: number;
    mp3_attendance_rate?: number;
    mp4_attendance_rate?: number;
  };
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
  const { data: cachedData, setData: setCachedData } = useFormCache('attendance', data);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<AttendanceFormData>({
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

  const handleBulkImport = (raw: any[]) => {
    try {
      console.log('Raw data received:', raw);
      
      // Check if this is a LinkIt! attendance report format
      const isLinkItFormat = detectLinkItFormat(raw);
      console.log('Is LinkIt format:', isLinkItFormat);

      if (isLinkItFormat) {
        processLinkItFormat(raw);
      } else {
        processStandardFormat(raw);
      }
    } catch (e: any) {
      console.error('Import error:', e);
      setError(`Import failed: ${e.message}`);
    }
  };

  const detectLinkItFormat = (raw: any[]): boolean => {
    // Check for LinkIt format indicators
    if (!raw || raw.length < 8) return false;

    // Look for "Export Date" in first row
    const hasExportDate = raw[0] && 
      Array.isArray(raw[0]) && 
      raw[0].some((cell: any) => 
        cell && String(cell).toLowerCase().includes('export date')
      );

    // Look for header row with "#" symbol (typically around row 7-8)
    const hasHeaderRow = raw.some((row, index) => 
      index >= 6 && index <= 10 && 
      Array.isArray(row) && 
      row[0] === "#"
    );

    // Look for "District" in early rows
    const hasDistrictInfo = raw.slice(0, 5).some(row => 
      Array.isArray(row) && 
      row.some((cell: any) => 
        cell && String(cell).toLowerCase().includes('district')
      )
    );

    console.log('LinkIt detection:', { hasExportDate, hasHeaderRow, hasDistrictInfo });
    
    return hasExportDate || hasHeaderRow || hasDistrictInfo;
  };

  const processLinkItFormat = (raw: any[]) => {
    console.log('Processing LinkIt format');
    
    // Find the header row (look for row starting with "#")
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(15, raw.length); i++) {
      if (raw[i] && Array.isArray(raw[i]) && raw[i][0] === "#") {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in LinkIt format file. Looking for row starting with "#"');
    }

    console.log('Found header row at index:', headerRowIndex);
    const headers = raw[headerRowIndex];
    console.log('Headers:', headers);

    // Extract attendance year from early rows (typically row 1, column B)
    let attendanceYearFromFile = watch('attendance_year');
    for (let i = 0; i < Math.min(5, raw.length); i++) {
      if (raw[i] && Array.isArray(raw[i]) && raw[i][1]) {
        const yearCell = String(raw[i][1]);
        const yearMatch = yearCell.match(/(\d{4}-\d{2,4})/);
        if (yearMatch) {
          attendanceYearFromFile = yearMatch[1];
          console.log('Found attendance year:', attendanceYearFromFile);
          break;
        }
      }
    }

    // Create column mapping based on known LinkIt structure
    const columnMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      if (header) {
        const headerStr = String(header).toLowerCase().trim();
        columnMap[headerStr] = index;
      }
    });

    console.log('Column map:', columnMap);

    // Helper function to find column index by various names
    const findColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = columnMap[name.toLowerCase()];
        if (index !== undefined) {
          return index;
        }
      }
      return -1;
    };

    // Map required columns with multiple possible names
    const studentIdIndex = findColumnIndex(['id', 'student id', 'studentid', 'student']);
    const resultDateIndex = findColumnIndex(['result date', 'date', 'record date']);
    const totalDaysPresentIndex = findColumnIndex(['total days present', 'days present', 'present']);
    const totalDaysPossibleIndex = findColumnIndex(['total days possible', 'days possible', 'possible']);
    const fyAbsencesTotalIndex = findColumnIndex(['fy absences (total days)', 'total absences', 'absences total']);
    const fyAbsencesExcusedIndex = findColumnIndex(['fy absences (excused days)', 'excused absences', 'excused']);
    const fyAbsencesUnexcusedIndex = findColumnIndex(['fy absences (unexcused days)', 'unexcused absences', 'unexcused']);
    const fyTardiesTotalIndex = findColumnIndex(['fy tardies (total days)', 'total tardies', 'tardies']);

    // Optional columns
    const dailyAttendanceRateIndex = findColumnIndex(['daily attendance rate', 'daily rate']);
    const mp1AttendanceRateIndex = findColumnIndex(['mp1 (daily attendance rate)', 'mp1 attendance rate', 'mp1 rate']);
    const mp2AttendanceRateIndex = findColumnIndex(['mp2 (daily attendance rate)', 'mp2 attendance rate', 'mp2 rate']);
    const mp3AttendanceRateIndex = findColumnIndex(['mp3 (daily attendance rate)', 'mp3 attendance rate', 'mp3 rate']);
    const mp4AttendanceRateIndex = findColumnIndex(['mp4 (daily attendance rate)', 'mp4 attendance rate', 'mp4 rate']);

    console.log('Column indices:', {
      studentIdIndex,
      resultDateIndex,
      totalDaysPresentIndex,
      totalDaysPossibleIndex,
      fyAbsencesTotalIndex,
      fyAbsencesExcusedIndex,
      fyAbsencesUnexcusedIndex,
      fyTardiesTotalIndex
    });

    // Validate that we found all required columns
    const missingColumns = [];
    if (studentIdIndex === -1) missingColumns.push('Student ID');
    if (resultDateIndex === -1) missingColumns.push('Result Date');
    if (totalDaysPresentIndex === -1) missingColumns.push('Total Days Present');
    if (totalDaysPossibleIndex === -1) missingColumns.push('Total Days Possible');
    if (fyAbsencesTotalIndex === -1) missingColumns.push('FY Absences Total');
    if (fyAbsencesExcusedIndex === -1) missingColumns.push('FY Absences Excused');
    if (fyAbsencesUnexcusedIndex === -1) missingColumns.push('FY Absences Unexcused');
    if (fyTardiesTotalIndex === -1) missingColumns.push('FY Tardies Total');

    if (missingColumns.length > 0) {
      throw new Error(`Could not find required columns: ${missingColumns.join(', ')}. Available columns: ${headers.join(', ')}`);
    }

    const processed: AttendanceRecord[] = [];
    const importErrors: string[] = [];

    // Process each data row (starting after the header)
    for (let i = headerRowIndex + 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || !Array.isArray(row) || !row[0]) continue;

      // Get student ID
      const studentIdValue = row[studentIdIndex];
      if (!studentIdValue) {
        importErrors.push(`Row ${i + 1}: Missing student ID`);
        continue;
      }

      // Find student by school_student_id
      const student = students.find(s => 
        s.school_student_id === String(studentIdValue).trim()
      );
      
      if (!student) {
        importErrors.push(`Row ${i + 1}: Student with ID ${studentIdValue} not found in students list`);
        continue;
      }

      // Get required values
      const resultDate = row[resultDateIndex];
      const totalDaysPresent = row[totalDaysPresentIndex];
      const totalDaysPossible = row[totalDaysPossibleIndex];
      const fyAbsencesTotal = row[fyAbsencesTotalIndex];
      const fyAbsencesExcused = row[fyAbsencesExcusedIndex];
      const fyAbsencesUnexcused = row[fyAbsencesUnexcusedIndex];
      const fyTardiesTotal = row[fyTardiesTotalIndex];

      // Validate required fields
      if (!resultDate || totalDaysPresent === null || totalDaysPresent === undefined ||
          totalDaysPossible === null || totalDaysPossible === undefined ||
          fyAbsencesTotal === null || fyAbsencesTotal === undefined ||
          fyAbsencesExcused === null || fyAbsencesExcused === undefined ||
          fyAbsencesUnexcused === null || fyAbsencesUnexcused === undefined ||
          fyTardiesTotal === null || fyTardiesTotal === undefined) {
        importErrors.push(`Row ${i + 1}: Missing required attendance data`);
        continue;
      }

      // Get optional values
      const dailyAttendanceRate = dailyAttendanceRateIndex !== -1 ? row[dailyAttendanceRateIndex] : null;
      const mp1AttendanceRate = mp1AttendanceRateIndex !== -1 ? row[mp1AttendanceRateIndex] : null;
      const mp2AttendanceRate = mp2AttendanceRateIndex !== -1 ? row[mp2AttendanceRateIndex] : null;
      const mp3AttendanceRate = mp3AttendanceRateIndex !== -1 ? row[mp3AttendanceRateIndex] : null;
      const mp4AttendanceRate = mp4AttendanceRateIndex !== -1 ? row[mp4AttendanceRateIndex] : null;

      // Prepare extra data
      const extraData: any = {};
      if (dailyAttendanceRate !== null && dailyAttendanceRate !== undefined && !isNaN(Number(dailyAttendanceRate))) {
        extraData.daily_attendance_rate = Number(dailyAttendanceRate);
      }
      if (mp1AttendanceRate !== null && mp1AttendanceRate !== undefined && !isNaN(Number(mp1AttendanceRate))) {
        extraData.mp1_attendance_rate = Number(mp1AttendanceRate);
      }
      if (mp2AttendanceRate !== null && mp2AttendanceRate !== undefined && !isNaN(Number(mp2AttendanceRate))) {
        extraData.mp2_attendance_rate = Number(mp2AttendanceRate);
      }
      if (mp3AttendanceRate !== null && mp3AttendanceRate !== undefined && !isNaN(Number(mp3AttendanceRate))) {
        extraData.mp3_attendance_rate = Number(mp3AttendanceRate);
      }
      if (mp4AttendanceRate !== null && mp4AttendanceRate !== undefined && !isNaN(Number(mp4AttendanceRate))) {
        extraData.mp4_attendance_rate = Number(mp4AttendanceRate);
      }

      // Parse date
      let recordDate;
      try {
        const dateObj = new Date(resultDate);
        if (!isNaN(dateObj.getTime())) {
          recordDate = dateObj.toISOString().split('T')[0];
        } else {
          const dateParts = String(resultDate).split(/[\/\-]/);
          if (dateParts.length === 3) {
            if (dateParts[0].length === 4) {
              recordDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            } else {
              recordDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            }
          } else {
            throw new Error('Invalid date format');
          }
        }
      } catch (e) {
        importErrors.push(`Row ${i + 1}: Invalid date format ${resultDate}`);
        continue;
      }

      // Create attendance record
      processed.push({
        student_id: student.student_id,
        school_id: schoolId || '',
        record_date: recordDate,
        total_days_present: Number(totalDaysPresent),
        total_days_possible: Number(totalDaysPossible),
        fy_absences_total: Number(fyAbsencesTotal),
        fy_absences_excused: Number(fyAbsencesExcused),
        fy_absences_unexcused: Number(fyAbsencesUnexcused),
        fy_tardies_total: Number(fyTardiesTotal),
        attendance_year: attendanceYearFromFile,
        extra_data: Object.keys(extraData).length > 0 ? extraData : undefined
      });
    }

    if (importErrors.length > 0) {
      setError(importErrors.slice(0, 10).join('\n'));
      return;
    }

    const updated = [...cachedData, ...processed];
    onUpdate(updated);
    setCachedData(updated);
    setError(null);
  };

  const processStandardFormat = (raw: any[]) => {
    console.log('Processing standard format');
    
    // For standard CSV format, assume first row is headers
    if (!raw || raw.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = raw[0];
    if (!Array.isArray(headers)) {
      throw new Error('Invalid file format: headers not found');
    }

    console.log('Standard format headers:', headers);

    // Create column mapping
    const columnMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      if (header) {
        const headerStr = String(header).toLowerCase().trim();
        columnMap[headerStr] = index;
      }
    });

    // Helper function to find column index
    const findColumnIndex = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = columnMap[name.toLowerCase()];
        if (index !== undefined) {
          return index;
        }
      }
      return -1;
    };

    // Map columns
    const studentIdIndex = findColumnIndex(['school_student_id', 'student_id', 'id', 'student id', 'studentid']);
    const resultDateIndex = findColumnIndex(['record_date', 'result_date', 'date', 'result date']);
    const totalDaysPresentIndex = findColumnIndex(['total_days_present', 'days_present', 'total days present', 'days present']);
    const totalDaysPossibleIndex = findColumnIndex(['total_days_possible', 'days_possible', 'total days possible', 'days possible']);
    const fyAbsencesTotalIndex = findColumnIndex(['fy_absences_total', 'absences_total', 'total_absences', 'fy absences total', 'total absences']);
    const fyAbsencesExcusedIndex = findColumnIndex(['fy_absences_excused', 'absences_excused', 'excused_absences', 'fy absences excused', 'excused absences']);
    const fyAbsencesUnexcusedIndex = findColumnIndex(['fy_absences_unexcused', 'absences_unexcused', 'unexcused_absences', 'fy absences unexcused', 'unexcused absences']);
    const fyTardiesTotalIndex = findColumnIndex(['fy_tardies_total', 'tardies_total', 'total_tardies', 'fy tardies total', 'total tardies', 'tardies']);

    // Validate required columns
    const missingColumns = [];
    if (studentIdIndex === -1) missingColumns.push('Student ID');
    if (resultDateIndex === -1) missingColumns.push('Record Date');
    if (totalDaysPresentIndex === -1) missingColumns.push('Total Days Present');
    if (totalDaysPossibleIndex === -1) missingColumns.push('Total Days Possible');
    if (fyAbsencesTotalIndex === -1) missingColumns.push('FY Absences Total');
    if (fyAbsencesExcusedIndex === -1) missingColumns.push('FY Absences Excused');
    if (fyAbsencesUnexcusedIndex === -1) missingColumns.push('FY Absences Unexcused');
    if (fyTardiesTotalIndex === -1) missingColumns.push('FY Tardies Total');

    if (missingColumns.length > 0) {
      throw new Error(`Could not find required columns: ${missingColumns.join(', ')}. Available columns: ${headers.join(', ')}`);
    }

    const processed: AttendanceRecord[] = [];
    const importErrors: string[] = [];

    // Process data rows (starting from row 1)
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      if (!row || !Array.isArray(row)) continue;

      const studentIdValue = row[studentIdIndex];
      if (!studentIdValue) {
        importErrors.push(`Row ${i + 1}: Missing student ID`);
        continue;
      }

      // Find student
      const student = students.find(s => 
        s.school_student_id === String(studentIdValue).trim()
      );
      
      if (!student) {
        importErrors.push(`Row ${i + 1}: Student with ID ${studentIdValue} not found`);
        continue;
      }

      // Get values
      const resultDate = row[resultDateIndex];
      const totalDaysPresent = row[totalDaysPresentIndex];
      const totalDaysPossible = row[totalDaysPossibleIndex];
      const fyAbsencesTotal = row[fyAbsencesTotalIndex];
      const fyAbsencesExcused = row[fyAbsencesExcusedIndex];
      const fyAbsencesUnexcused = row[fyAbsencesUnexcusedIndex];
      const fyTardiesTotal = row[fyTardiesTotalIndex];

      // Validate required fields
      if (!resultDate || totalDaysPresent === null || totalDaysPresent === undefined ||
          totalDaysPossible === null || totalDaysPossible === undefined ||
          fyAbsencesTotal === null || fyAbsencesTotal === undefined ||
          fyAbsencesExcused === null || fyAbsencesExcused === undefined ||
          fyAbsencesUnexcused === null || fyAbsencesUnexcused === undefined ||
          fyTardiesTotal === null || fyTardiesTotal === undefined) {
        importErrors.push(`Row ${i + 1}: Missing required attendance data`);
        continue;
      }

      // Parse date
      let recordDate;
      try {
        const dateObj = new Date(resultDate);
        if (!isNaN(dateObj.getTime())) {
          recordDate = dateObj.toISOString().split('T')[0];
        } else {
          const dateParts = String(resultDate).split(/[\/\-]/);
          if (dateParts.length === 3) {
            if (dateParts[0].length === 4) {
              recordDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            } else {
              recordDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            }
          } else {
            throw new Error('Invalid date format');
          }
        }
      } catch (e) {
        importErrors.push(`Row ${i + 1}: Invalid date format ${resultDate}`);
        continue;
      }

      // Create attendance record
      processed.push({
        student_id: student.student_id,
        school_id: schoolId || '',
        record_date: recordDate,
        total_days_present: Number(totalDaysPresent),
        total_days_possible: Number(totalDaysPossible),
        fy_absences_total: Number(fyAbsencesTotal),
        fy_absences_excused: Number(fyAbsencesExcused),
        fy_absences_unexcused: Number(fyAbsencesUnexcused),
        fy_tardies_total: Number(fyTardiesTotal),
        attendance_year: attendanceYearFromFile
      });
    }

    if (importErrors.length > 0) {
      setError(importErrors.slice(0, 10).join('\n'));
      return;
    }

    const updated = [...cachedData, ...processed];
    onUpdate(updated);
    setCachedData(updated);
    setError(null);
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

    const extraData: any = {};
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

      {/* LinkIt Format Info */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <AlertCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">LinkIt Format Support</h3>
            <p className="text-sm text-blue-700 mb-2">
              This step automatically detects and processes LinkIt attendance report files. The system will:
            </p>
            <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
              <li>Automatically find the header row (marked with "#")</li>
              <li>Extract attendance year from the file metadata</li>
              <li>Map columns based on LinkIt's standard column names</li>
              <li>Match students using their School Student ID</li>
              <li>Process all attendance data including marking period rates</li>
            </ul>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Important:</strong> Make sure students are added in the Students step first, as the system matches attendance records using School Student IDs.
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
              <li>• School Student ID (must match existing students)</li>
              <li>• Record Date</li>
              <li>• Total Days Present</li>
              <li>• Total Days Possible</li>
              <li>• FY Absences Total</li>
              <li>• FY Absences Excused</li>
              <li>• FY Absences Unexcused</li>
              <li>• FY Tardies Total</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Attendance Year</li>
              <li>• Daily Attendance Rate (%)</li>
              <li>• MP1 Attendance Rate (%)</li>
              <li>• MP2 Attendance Rate (%)</li>
              <li>• MP3 Attendance Rate (%)</li>
              <li>• MP4 Attendance Rate (%)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={[
            'school_student_id', 'record_date', 'total_days_present', 
            'total_days_possible', 'fy_absences_total', 'fy_absences_excused',
            'fy_absences_unexcused', 'fy_tardies_total'
          ]}
          template={{
            school_student_id: 'S123',
            record_date: '2024-12-31',
            total_days_present: 180,
            total_days_possible: 185,
            fy_absences_total: 5,
            fy_absences_excused: 3,
            fy_absences_unexcused: 2,
            fy_tardies_total: 8,
            attendance_year: '2024-2025',
            daily_attendance_rate: 97.3,
            mp1_attendance_rate: 95.0,
            mp2_attendance_rate: 98.5,
            mp3_attendance_rate: 96.8,
            mp4_attendance_rate: 99.2
          }}
          description="Upload a CSV or Excel file containing attendance records. The system automatically detects LinkIt format files and maps columns accordingly. For standard CSV files, ensure column names match the template. Student IDs must match existing students from the Students step."
        />
      </div>

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
              <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
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