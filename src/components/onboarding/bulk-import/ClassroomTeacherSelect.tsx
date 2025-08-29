import React from 'react';
import Select from 'react-select';

interface Teacher {
  teacher_id: string;
  first_name: string;
  last_name: string;
}

interface ClassroomTeacherSelectProps {
  teachers: Teacher[];
  value?: string;
  onChange: (value: string | undefined) => void;
  className?: string;
}

export default function ClassroomTeacherSelect({
  teachers,
  value,
  onChange,
  className
}: ClassroomTeacherSelectProps) {
  const options = teachers.map(teacher => ({
    value: teacher.teacher_id,
    label: `${teacher.first_name} ${teacher.last_name}`
  }));

  const selectedOption = options.find(option => option.value === value);

  return (
    <Select
      isClearable
      options={options}
      value={selectedOption}
      onChange={(selected) => onChange(selected?.value)}
      className={className}
      classNamePrefix="select"
      placeholder="Select teacher..."
    />
  );
}