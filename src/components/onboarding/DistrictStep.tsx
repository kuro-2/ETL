import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { Building2, Plus, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useFormCache } from '../../hooks/useFormCache';

interface District {
  district_id: string;
  district_name: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface DistrictStepProps {
  data: District;
  onUpdate: (data: District) => void;
}

export default function DistrictStep({ data, onUpdate }: DistrictStepProps) {
  const [existingDistricts, setExistingDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Use form cache
  const { data: cachedData, setData: setCachedData } = useFormCache('district', data);

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue } = useForm<District>({
    defaultValues: cachedData
  });

  useEffect(() => {
    fetchDistricts();
  }, []);

  // Set form values when cached data changes
  useEffect(() => {
    if (cachedData) {
      Object.entries(cachedData).forEach(([key, value]) => {
        setValue(key as keyof District, value);
      });
      setIsCreatingNew(!cachedData.district_id);
    }
  }, [cachedData, setValue]);

  const fetchDistricts = async () => {
    try {
      const { data: districts, error } = await supabase
        .from('districts')
        .select('*')
        .order('district_name');

      if (error) throw error;
      setExistingDistricts(districts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistrictSelect = (selected: { value: string; label: string } | null) => {
    if (!selected) return;
    
    const district = existingDistricts.find(d => d.district_id === selected.value);
    if (district) {
      onUpdate(district);
      setCachedData(district);
      setIsCreatingNew(false);
      
      // Update form values
      Object.entries(district).forEach(([key, value]) => {
        setValue(key as keyof District, value);
      });
    }
  };

  const onSubmit = async (formData: District) => {
    try {
      setError(null);
      setIsSaving(true);

      const updatedData = {
        ...formData,
        country: formData.country || 'USA' // Default country
      };

      onUpdate(updatedData);
      setCachedData(updatedData);

      setSaveMessage({
        type: 'success',
        text: 'District information saved successfully'
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);

    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: `Failed to save district: ${err.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

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
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">District Selection</h2>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                "text-white bg-green-600 hover:bg-green-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors duration-200"
              )}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save District'}
            </button>
          )}
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
      </div>

      {saveMessage && (
        <div className={cn(
          "p-4 rounded-md",
          saveMessage.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        )}>
          {saveMessage.text}
        </div>
      )}

      {!isCreatingNew ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Select District
          </label>
          <Select
            className="basic-single"
            classNamePrefix="select"
            isSearchable
            name="district"
            options={existingDistricts.map(district => ({
              value: district.district_id,
              label: district.district_name
            }))}
            onChange={handleDistrictSelect}
            placeholder="Search for a district..."
            value={cachedData.district_id ? {
              value: cachedData.district_id,
              label: cachedData.district_name
            } : null}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              District Name *
            </label>
            <input
              type="text"
              {...register('district_name', { required: 'District name is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.district_name && (
              <p className="mt-1 text-sm text-red-600">{errors.district_name.message}</p>
            )}
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

          {error && (
            <div className="p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save District'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}