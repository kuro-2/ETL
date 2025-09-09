import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BookOpen, Plus, Trash2, Users, GraduationCap } from 'lucide-react';
import Select from 'react-select';
import { cn } from '../../lib/utils';
import { useFormCache } from '../../hooks/useFormCache';
import BulkImport from './BulkImport';
import ClassroomBulkImportHelp from './bulk-import/ClassroomBulkImportHelp';

interface Teacher {
  teacher_id: string;
  first_name: string;
  last_name: string;
}

interface Classroom {
  classroom_id: string;
  classroom_name: string;
  classroom_teacher_id?: string;
  school_id: string;
  school_year: string;
  grade?: string;
}

interface ClassroomsStepProps {
  data: Classroom[];
  teachers: Teacher[];
  onUpdate: (data: Classroom[]) => void;
  schoolId?: string; // Add schoolId prop
}

interface ClassroomFormData {
  classroom_name: string;
  classroom_teacher_id?: string;
  grade?: string;
  school_year: string;
}

const GRADE_LEVELS = [
  'PK3', 'PK4', 'PK5', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  'PostGraduate', 'Ungraded', 'Other'
];

const CURRENT_YEAR = new Date().getFullYear();
const SCHOOL_YEARS = [
  `${CURRENT_YEAR-1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
  `${CURRENT_YEAR+1}-${CURRENT_YEAR+2}`
];

export default function ClassroomsStep({ data, teachers, onUpdate, schoolId }: ClassroomsStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('classrooms', data);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ClassroomFormData>({
    defaultValues: {
      school_year: `${CURRENT_YEAR}-${CURRENT_YEAR+1}`
    }
  });

  const handleBulkImport = (importedData: any[]) => {
    try {
      // Validate classroom names
      const invalidNames = importedData.filter(row => !row.classroom_name || row.classroom_name.trim() === '');
      if (invalidNames.length > 0) {
        setError(`Missing classroom names in ${invalidNames.length} rows`);
        return;
      }

      // Format school years to ensure YYYY-YYYY format
      const formattedData = importedData.map(row => {
        let formattedRow = { ...row };
        
        // Handle school year formatting
        if (row.school_year) {
          // Try to parse different school year formats
          const schoolYear = row.school_year.toString().trim();
          
          // Check if it's already in YYYY-YYYY format
          if (/^\d{4}-\d{4}$/.test(schoolYear)) {
            formattedRow.school_year = schoolYear;
          } 
          // Check if it's in YYYY-YY format (e.g., 2024-25)
          else if (/^\d{4}-\d{2}$/.test(schoolYear)) {
            const startYear = parseInt(schoolYear.substring(0, 4));
            const endYearShort = schoolYear.substring(5, 7);
            const endYear = parseInt(`20${endYearShort}`);
            formattedRow.school_year = `${startYear}-${endYear}`;
          }
          // Check if it's just a single year (e.g., 2024)
          else if (/^\d{4}$/.test(schoolYear)) {
            const year = parseInt(schoolYear);
            formattedRow.school_year = `${year}-${year+1}`;
          }
          // Default to current school year if format can't be determined
          else {
            formattedRow.school_year = `${CURRENT_YEAR}-${CURRENT_YEAR+1}`;
          }
        } else {
          // Default school year if not provided
          formattedRow.school_year = `${CURRENT_YEAR}-${CURRENT_YEAR+1}`;
        }
        
        return formattedRow;
      });

      // Validate teacher IDs if provided
      const teacherIds = teachers.map(t => t.teacher_id);
      const invalidTeachers = formattedData.filter(row => 
        row.classroom_teacher_id && !teacherIds.includes(row.classroom_teacher_id)
      );
      if (invalidTeachers.length > 0) {
        setError(`Invalid teacher IDs found in ${invalidTeachers.length} rows. Make sure to use teacher_id values from the Teachers step.`);
        return;
      }

      // Transform imported data to match Classroom interface
      const newClassrooms: Classroom[] = formattedData.map(row => ({
        classroom_id: '', // Will be set by backend
        classroom_name: row.classroom_name,
        classroom_teacher_id: row.classroom_teacher_id || undefined,
        school_id: schoolId || row.school_id || '', // Use the schoolId from props or from the imported data
        school_year: row.school_year,
        grade: row.grade
      }));

      // Check for duplicate classroom names in the same school year
      const duplicates = newClassrooms.filter(newClass => 
        cachedData.some(existingClass => 
          existingClass.classroom_name === newClass.classroom_name && 
          existingClass.school_year === newClass.school_year
        )
      );

      if (duplicates.length > 0) {
        setError(`Duplicate classroom names found for the same school year: ${duplicates.map(d => d.classroom_name).join(', ')}`);
        return;
      }

      const updatedData = [...cachedData, ...newClassrooms];
      onUpdate(updatedData);
      setCachedData(updatedData);
      setError(null);
    } catch (err: any) {
      setError(`Failed to import classrooms: ${err.message}`);
    }
  };

  const onSubmit = (formData: ClassroomFormData) => {
    // Check for duplicate classroom name in the same school year
    if (cachedData.some(classroom => 
      classroom.classroom_name === formData.classroom_name && 
      classroom.school_year === formData.school_year
    )) {
      setError('A classroom with this name already exists for the selected school year');
      return;
    }

    const newClassroom: Classroom = {
      classroom_id: '', // Will be set by backend
      school_id: schoolId || '', // Use the schoolId from props
      ...formData
    };

    const updatedData = [...cachedData, newClassroom];
    onUpdate(updatedData);
    setCachedData(updatedData);
    reset({
      school_year: formData.school_year // Preserve the school year selection
    });
    setError(null);
  };

  const removeClassroom = (index: number) => {
    const newClassrooms = [...cachedData];
    newClassrooms.splice(index, 1);
    onUpdate(newClassrooms);
    setCachedData(newClassrooms);
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return 'Unassigned';
    const teacher = teachers.find(t => t.teacher_id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <BookOpen className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Classrooms</h2>
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
              <li>• Classroom Name</li>
              <li>• School Year</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              Optional Fields
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Grade Level</li>
              <li>• Assigned Teacher</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['classroom_name', 'school_year']}
          template={{
            classroom_name: 'Room 101',
            classroom_teacher_id: teachers[0]?.teacher_id || '',
            school_year: `${CURRENT_YEAR}-${CURRENT_YEAR+1}`,
            grade: '9',
            school_id: schoolId || ''
          }}
          description="Upload a CSV or Excel file containing classroom information. Required fields are marked with an asterisk (*). Classroom names must be unique within a school year."
        />
        <div className="mt-4">
          <ClassroomBulkImportHelp />
        </div>
      </div>

      {/* List of added classrooms */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Added Classrooms</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((classroom, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {classroom.classroom_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          Teacher: {getTeacherName(classroom.classroom_teacher_id)}
                        </div>
                        {classroom.grade && (
                          <div>Grade: {classroom.grade}</div>
                        )}
                        <div>Year: {classroom.school_year}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeClassroom(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new classroom form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Classroom</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Classroom Name *
              </label>
              <input
                type="text"
                {...register('classroom_name', { required: 'Classroom name is required' })}
                placeholder="e.g., Room 101, 6th Grade A"
                className={cn(
                  "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                  errors.classroom_name && "border-red-300"
                )}
              />
              {errors.classroom_name && (
                <p className="mt-1 text-sm text-red-600">{errors.classroom_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Grade Level
              </label>
              <select
                {...register('grade')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select grade...</option>
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assigned Teacher
              </label>
              <Select
                isClearable
                options={teachers.map(teacher => ({
                  value: teacher.teacher_id,
                  label: `${teacher.first_name} ${teacher.last_name}`
                }))}
                onChange={(selected) => {
                  setValue('classroom_teacher_id', selected?.value);
                }}
                className="mt-1"
                classNamePrefix="select"
                placeholder="Select teacher..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                School Year *
              </label>
              <select
                {...register('school_year', { required: 'School year is required' })}
                className={cn(
                  "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm",
                  errors.school_year && "border-red-300"
                )}
              >
                {SCHOOL_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.school_year && (
                <p className="mt-1 text-sm text-red-600">{errors.school_year.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}