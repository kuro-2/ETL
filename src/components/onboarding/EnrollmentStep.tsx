// EnrollmentStep.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DoorOpen, Plus, Trash2, Users, BookOpen, AlertCircle } from 'lucide-react';
import Select from 'react-select';
import { cn } from '../../lib/utils';
import BulkImport from './BulkImport';
import { useFormCache } from '../../hooks/useFormCache';

/* --- types identical to AttendanceStep --- */
interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
}

interface Classroom {
  classroom_id: string;
  classroom_name: string;
  grade?: string;
  school_year: string;
}

interface ClassroomEnrollment {
  classroom_id: string;
  student_id: string;
  enrollment_date?: string;
  is_active?: boolean;
}

interface EnrollmentStepProps {
  data: ClassroomEnrollment[];
  classrooms: Classroom[];
  students: Student[];
  onUpdate: (data: ClassroomEnrollment[]) => void;
}

interface FormData {
  classroom_id: string;
  student_ids: string[];
  enrollment_date?: string;
}

export default function EnrollmentStep({ data, classrooms, students, onUpdate }: EnrollmentStepProps) {
  const [error, setError] = useState<string | null>(null);
  const { data: cachedData, setData: setCachedData } = useFormCache('enrollment', data);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: { enrollment_date: new Date().toISOString().split('T')[0] }
  });

  /* ---------- 1. Bulk-import ---------- */
  const handleBulkImport = (raw: any[]) => {
    try {
      const rows = raw.slice(5).filter(r => r && Object.values(r).some(v => v != null));
      const processed: ClassroomEnrollment[] = [];
      const errs: string[] = [];

      rows.forEach((row, idx) => {
        const val = (h: string) => {
          const k = Object.keys(row).find(k => k.trim().toLowerCase() === h.toLowerCase());
          return k ? row[k] : null;
        };

        const studentId = val('Student ID');
        const classroomId = val('Classroom ID');
        if (!studentId || !classroomId) {
          errs.push(`Row ${idx + 6}: missing Student ID or Classroom ID`);
          return;
        }

        const student = students.find(s => s.student_id === String(studentId).trim());
        const classroom = classrooms.find(c => c.classroom_id === String(classroomId).trim());
        if (!student || !classroom) {
          errs.push(`Row ${idx + 6}: unknown Student or Classroom ID`);
          return;
        }

        processed.push({
          classroom_id: classroom.classroom_id,
          student_id: student.student_id,
          enrollment_date: val('Enrollment Date') || new Date().toISOString().split('T')[0],
          is_active: val('Is Active')?.toString().toLowerCase() !== 'false'
        });
      });

      if (errs.length) {
        setError(errs.slice(0, 10).join('\n'));
        return;
      }

      // de-dupe
      const merged = [...cachedData];
      processed.forEach(p => {
        if (!merged.some(e => e.classroom_id === p.classroom_id && e.student_id === p.student_id))
          merged.push(p);
      });

      onUpdate(merged);
      setCachedData(merged);
      setError(null);
    } catch (e: any) {
      setError(`Import failed: ${e.message}`);
    }
  };

  /* ---------- 2. Single add ---------- */
  const onSubmit = (form: FormData) => {
    const newEnrollments: ClassroomEnrollment[] = form.student_ids.map(id => ({
      classroom_id: form.classroom_id,
      student_id: id,
      enrollment_date: form.enrollment_date,
      is_active: true
    }));

    const dupes = newEnrollments.filter(n =>
      cachedData.some(e => e.classroom_id === n.classroom_id && e.student_id === n.student_id)
    );
    if (dupes.length) {
      setError('Some students are already enrolled in this classroom');
      return;
    }

    const updated = [...cachedData, ...newEnrollments];
    onUpdate(updated);
    setCachedData(updated);
    reset({ enrollment_date: form.enrollment_date });
    setError(null);
  };

  const removeEnrollment = (index: number) => {
    const next = [...cachedData];
    next.splice(index, 1);
    onUpdate(next);
    setCachedData(next);
  };

  const getStudentName = (id: string) => students.find(s => s.student_id === id)?.first_name + ' ' + students.find(s => s.student_id === id)?.last_name ?? 'Unknown';
  const getClassroomName = (id: string) => classrooms.find(c => c.classroom_id === id)?.classroom_name ?? 'Unknown';

  const availableStudents = (classroomId: string) =>
    students.filter(s => !cachedData.some(e => e.classroom_id === classroomId && e.student_id === s.student_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg"><DoorOpen className="h-5 w-5 text-indigo-600" /></div>
        <h2 className="text-lg font-semibold text-gray-900">Student Enrollment</h2>
      </div>

      {/* Field Requirements */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Field Requirements</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full" /> Required
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Student ID</li>
              <li>• Classroom ID</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-300 rounded-full" /> Optional
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Enrollment Date</li>
              <li>• Is Active</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Import */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <BulkImport
          onImport={handleBulkImport}
          requiredFields={['student_id', 'classroom_id']}
          template={{
            student_id: 'S123',
            classroom_id: 'C456',
            enrollment_date: '2024-09-05',
            is_active: true
          }}
          description="Upload CSV or Excel with enrollment rows. Student & Classroom IDs must match existing records."
        />
      </div>

      {/* Existing enrollments */}
      {cachedData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Current Enrollments</h3>
          <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
            {cachedData.map((e, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{getStudentName(e.student_id)}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1"><BookOpen className="h-4 w-4" />{getClassroomName(e.classroom_id)}</p>
                </div>
                <button onClick={() => removeEnrollment(i)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="h-5 w-5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single add form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Enrollments</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Classroom *</label>
            <Select
              options={classrooms.map(c => ({ value: c.classroom_id, label: `${c.classroom_name} (${c.school_year})` }))}
              onChange={sel => {
                setValue('classroom_id', sel?.value || '');
                setValue('student_ids', []);
              }}
              className="mt-1"
              placeholder="Select classroom..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Students *</label>
            <Select
              isMulti
              options={availableStudents(watch('classroom_id')).map(s => ({ value: s.student_id, label: `${s.first_name} ${s.last_name} (${s.grade_level})` }))}
              onChange={sel => setValue('student_ids', sel.map(o => o.value))}
              className="mt-1"
              placeholder="Select students..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Enrollment Date</label>
            <input type="date" {...register('enrollment_date')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" />
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-md flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" /> Add Enrollments
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}