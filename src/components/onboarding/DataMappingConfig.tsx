import React, { useState, useEffect } from 'react';
import { 
  FieldMapping, 
  AssessmentSource, 
  ValidationResult,
  GenericAssessmentData,
  StudentInfo 
} from '../types/assessment';

interface DataMappingConfigProps {
  csvHeaders: string[];
  detectedSource: AssessmentSource;
  suggestedMappings: FieldMapping[];
  onMappingChange: (mappings: FieldMapping[]) => void;
  onPreview: () => void;
  onProceed: () => void;
  validation?: ValidationResult;
  isProcessing?: boolean;
}

const DataMappingConfig: React.FC<DataMappingConfigProps> = ({
  csvHeaders,
  detectedSource,
  suggestedMappings,
  onMappingChange,
  onPreview,
  onProceed,
  validation,
  isProcessing = false
}) => {
  const [currentMappings, setCurrentMappings] = useState<FieldMapping[]>(suggestedMappings);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setCurrentMappings(suggestedMappings);
  }, [suggestedMappings]);

  const handleMappingUpdate = (index: number, updates: Partial<FieldMapping>) => {
    const updatedMappings = [...currentMappings];
    updatedMappings[index] = { ...updatedMappings[index], ...updates };
    setCurrentMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  const addCustomMapping = () => {
    const newMapping: FieldMapping = {
      sourceField: '',
      targetField: 'student_id',
      required: false,
      transformer: undefined,
      validator: undefined,
      defaultValue: undefined,
      description: 'Custom field mapping'
    };
    const updatedMappings = [...currentMappings, newMapping];
    setCurrentMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  const removeMapping = (index: number) => {
    const updatedMappings = currentMappings.filter((_, i) => i !== index);
    setCurrentMappings(updatedMappings);
    onMappingChange(updatedMappings);
  };

  const getSourceBadgeColor = (source: AssessmentSource): string => {
    switch (source) {
      case 'linkit':
        return 'bg-blue-100 text-blue-800';
      case 'genesis':
        return 'bg-green-100 text-green-800';
      case 'njsla_direct':
        return 'bg-purple-100 text-purple-800';
      case 'generic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTargetFieldOptions = (): Array<{ value: string; label: string; category: string }> => {
    return [
      // Student Info Fields (for lookup/reference)
      { value: 'student_id', label: 'Student ID (Student)', category: 'Student' },
      { value: 'student_name', label: 'Student Name (Student)', category: 'Student' },
      { value: 'grade_level', label: 'Grade (Student)', category: 'Student' },
      
      // Assessment Fields - Database Table Fields
      { value: 'assessment_type', label: 'Assessment Type', category: 'Assessment' },
      { value: 'subject', label: 'Subject', category: 'Assessment' },
      { value: 'school_year', label: 'School Year', category: 'Assessment' },
      { value: 'test_date', label: 'Test Date', category: 'Assessment' },
      
      // Score Fields - Database Table Fields
      { value: 'raw_score', label: 'Raw Score', category: 'NJSLA' },
      { value: 'scale_score', label: 'Scale Score', category: 'NJSLA' },
      { value: 'performance_level_text', label: 'Performance Level (Text)', category: 'NJSLA' },
      { value: 'min_possible_score', label: 'Min Possible Score', category: 'NJSLA' },
      { value: 'max_possible_score', label: 'Max Possible Score', category: 'NJSLA' },
      { value: 'student_growth_percentile', label: 'Student Growth Percentile', category: 'NJSLA' },
      
      // Additional Fields - Database Table Fields
      { value: 'subscores', label: 'Subscores (JSON)', category: 'Assessment' },
      { value: 'unprocessed_data', label: 'Unprocessed Data (JSON)', category: 'Assessment' },
    ];
  };

  const targetFieldOptions = getTargetFieldOptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Data Mapping Configuration
          </h2>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSourceBadgeColor(detectedSource)}`}>
            {detectedSource === 'linkit' ? 'LinkIt Assessment' : 
             detectedSource === 'genesis' ? 'Genesis SIS' :
             detectedSource === 'njsla_direct' ? 'NJSLA Direct' :
             'Generic Format'}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">
          Configure how CSV columns map to assessment data fields. Required fields are marked with *.
        </p>

        {/* CSV Headers Preview */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Detected CSV Headers ({csvHeaders.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {csvHeaders.slice(0, 10).map((header, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border"
              >
                {header}
              </span>
            ))}
            {csvHeaders.length > 10 && (
              <span className="text-xs text-gray-500">
                +{csvHeaders.length - 10} more...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={`p-4 rounded-md ${validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${validation.isValid ? 'text-green-400' : 'text-red-400'}`}>
              {validation.isValid ? '✅' : '❌'}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                {validation.isValid ? 'Validation Passed' : 'Validation Issues Found'}
              </h3>
              {validation.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="font-medium">Warnings:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Field Mappings */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Field Mappings
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
            <button
              onClick={addCustomMapping}
              className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Mapping
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {currentMappings.map((mapping, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md">
              {/* Source Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Field {mapping.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping.sourceField}
                  onChange={(e) => handleMappingUpdate(index, { sourceField: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select CSV Column</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Field
                </label>
                <select
                  value={mapping.targetField}
                  onChange={(e) => handleMappingUpdate(index, { targetField: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {targetFieldOptions.map((option, optIndex) => (
                    <option key={optIndex} value={option.value}>
                      {option.label} ({option.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required
                </label>
                <input
                  type="checkbox"
                  checked={mapping.required}
                  onChange={(e) => handleMappingUpdate(index, { required: e.target.checked })}
                  className="mt-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {/* Actions */}
              <div className="flex items-end">
                <button
                  onClick={() => removeMapping(index)}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-500"
                >
                  Remove
                </button>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="md:col-span-4 mt-4 p-4 bg-white rounded-md border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Advanced Options</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Value
                      </label>
                      <input
                        type="text"
                        value={mapping.defaultValue || ''}
                        onChange={(e) => handleMappingUpdate(index, { defaultValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter default value"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={mapping.description || ''}
                        onChange={(e) => handleMappingUpdate(index, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Field description"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onPreview}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Preview Data
        </button>
        
        <button
          onClick={onProceed}
          disabled={!validation?.isValid || isProcessing}
          className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            validation?.isValid && !isProcessing
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? 'Processing...' : 'Process Data'}
        </button>
      </div>
    </div>
  );
};

export default DataMappingConfig; 