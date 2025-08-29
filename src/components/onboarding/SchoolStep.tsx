import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { School, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useFormCache } from '../../hooks/useFormCache';

interface School {
  school_id: string;
  name: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  district_id: string;
  low_grade?: string;
  high_grade?: string;
  principal_name?: string;
  principal_email?: string;
  state_id?: string;
  nces_id?: string;
  mdr_number?: string;
  email?: string;
  phone?: string;
}

interface SchoolStepProps {
  data: School;
  districtId: string;
  onUpdate: (data: School) => void;
}

const GRADE_LEVELS = [
  'PK3', 'PK4', 'PK5', 'KG',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  'PostGraduate', 'Ungraded', 'Other'
];

export default function SchoolStep({ data, districtId, onUpdate }: SchoolStepProps) {
  const [existingSchools, setExistingSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('school', data);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<School>({
    defaultValues: cachedData
  });

  useEffect(() => {
    if (districtId) {
      fetchSchools();
    }
  }, [districtId]);

  // Set form values when cached data changes
  useEffect(() => {
    if (cachedData) {
      Object.entries(cachedData).forEach(([key, value]) => {
        setValue(key as keyof School, value);
      });
      setIsCreatingNew(!cachedData.school_id);
    }
  }, [cachedData, setValue]);

  const fetchSchools = async () => {
    try {
      const { data: schools, error } = await supabase
        .from('schools')
        .select('*')
        .eq('district_id', districtId)
        .order('name');

      if (error) throw error;
      setExistingSchools(schools || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchoolSelect = (selected: { value: string; label: string } | null) => {
    if (!selected) return;
    
    const school = existingSchools.find(s => s.school_id === selected.value);
    if (school) {
      onUpdate(school);
      setCachedData(school);
      setIsCreatingNew(false);
      
      // Update form values
      Object.entries(school).forEach(([key, value]) => {
        setValue(key as keyof School, value);
      });
    }
  };

  const onSubmit = (formData: School) => {
    const updatedData = {
      ...formData,
      district_id: districtId,
      country: formData.country || 'USA' // Default country
    };
    onUpdate(updatedData);
    setCachedData(updatedData);
  };

  if (!districtId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select or create a district first</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <School className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">School Information</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsCreatingNew(!isCreatingNew)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
            isCreatingNew
              ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
              : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
          )}
        >
          <Plus className="h-4 w-4" />
          {isCreatingNew ? 'Select Existing' : 'Create New'}
        </button>
      </div>

      {!isCreatingNew ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Select School
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            isSearchable
            name="school"
            options={existingSchools.map(school => ({
              value: school.school_id,
              label: school.name
            }))}
            onChange={handleSchoolSelect}
            placeholder="Search for a school..."
            value={cachedData.school_id ? {
              value: cachedData.school_id,
              label: cachedData.name
            } : null}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              School Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'School name is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Low Grade
              </label>
              <select
                {...register('low_grade')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select grade...</option>
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                High Grade
              </label>
              <select
                {...register('high_grade')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select grade...</option>
                {GRADE_LEVELS.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Street Address
            </label>
            <input
              type="text"
              {...register('street_address')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                {...register('city')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                {...register('state')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                type="text"
                {...register('zip')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                {...register('country')}
                defaultValue="USA"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Principal Name
              </label>
              <input
                type="text"
                {...register('principal_name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Principal Email
              </label>
              <input
                type="email"
                {...register('principal_email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                School Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                School Phone
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                State ID
              </label>
              <input
                type="text"
                {...register('state_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                NCES ID
              </label>
              <input
                type="text"
                {...register('nces_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                MDR Number
              </label>
              <input
                type="text"
                {...register('mdr_number')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
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
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save School
            </button>
          </div>
        </form>
      )}
    </div>
  );
}