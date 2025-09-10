import React, { useState } from 'react';
import { Settings, Plus, Trash2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { ColumnMapping } from '../../utils/studentCsvProcessor';
import { cn } from '../../lib/utils';

interface StudentDataMappingConfigProps {
  csvHeaders: string[];
  columnMappings: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onValidate: () => void;
  className?: string;
}

export default function StudentDataMappingConfig({
  csvHeaders,
  columnMappings,
  onMappingChange,
  onValidate,
  className
}: StudentDataMappingConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleMappingUpdate = (index: number, updates: Partial<ColumnMapping>) => {
    const updatedMappings = [...columnMappings];
    updatedMappings[index] = { ...updatedMappings[index], ...updates };
    onMappingChange(updatedMappings);
  };

  const addCustomMapping = () => {
    const newMapping: ColumnMapping = {
      csvColumn: '',
      dbColumn: 'special_needs',
      required: false,
      dataType: 'jsonb'
    };
    onMappingChange([...columnMappings, newMapping]);
  };

  const removeMapping = (index: number) => {
    const updatedMappings = columnMappings.filter((_, i) => i !== index);
    onMappingChange(updatedMappings);
  };

  const resetToDefaults = () => {
    // Reset to auto-detected mappings
    const processor = new (require('../../utils/studentCsvProcessor').StudentCSVProcessor)();
    const defaultMappings = processor.detectColumnMappings(csvHeaders);
    onMappingChange(defaultMappings);
  };

  // Separate required and optional mappings
  const requiredMappings = columnMappings.filter(m => m.required);
  const optionalMappings = columnMappings.filter(m => !m.required);

  // Get unmapped CSV columns
  const mappedColumns = new Set(columnMappings.map(m => m.csvColumn).filter(Boolean));
  const unmappedColumns = csvHeaders.filter(header => !mappedColumns.has(header));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-medium text-gray-900">Column Mapping Configuration</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          <button
            onClick={resetToDefaults}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Mapping Instructions:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• Required fields must be mapped to proceed with processing</li>
              <li>• Optional fields can be left unmapped (will be set to null or default values)</li>
              <li>• Unmapped CSV columns will be stored in the special_needs JSON field</li>
              <li>• You can create custom mappings for additional fields</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Required Fields Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <h4 className="text-base font-medium text-gray-900">Required Fields</h4>
          <span className="text-sm text-gray-500">({requiredMappings.length} fields)</span>
        </div>

        <div className="space-y-4">
          {requiredMappings.map((mapping, index) => {
            const actualIndex = columnMappings.findIndex(m => m === mapping);
            return (
              <div key={actualIndex} className="grid grid-cols-5 gap-4 items-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSV Column *
                  </label>
                  <select
                    value={mapping.csvColumn}
                    onChange={(e) => handleMappingUpdate(actualIndex, { csvColumn: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500",
                      !mapping.csvColumn ? "border-red-300 bg-red-50" : "border-gray-300"
                    )}
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database Field
                  </label>
                  <input
                    type="text"
                    value={mapping.dbColumn}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Type
                  </label>
                  <input
                    type="text"
                    value={mapping.dataType}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </div>

                <div className="flex items-center justify-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Fields Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <h4 className="text-base font-medium text-gray-900">Optional Fields</h4>
            <span className="text-sm text-gray-500">({optionalMappings.length} fields)</span>
          </div>
          <button
            onClick={addCustomMapping}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 rounded-md hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            Add Custom Mapping
          </button>
        </div>

        <div className="space-y-4">
          {optionalMappings.map((mapping, index) => {
            const actualIndex = columnMappings.findIndex(m => m === mapping);
            return (
              <div key={actualIndex} className="grid grid-cols-6 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CSV Column
                  </label>
                  <select
                    value={mapping.csvColumn}
                    onChange={(e) => handleMappingUpdate(actualIndex, { csvColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select column...</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database Field
                  </label>
                  <input
                    type="text"
                    value={mapping.dbColumn}
                    onChange={(e) => handleMappingUpdate(actualIndex, { dbColumn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter field name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Type
                  </label>
                  <select
                    value={mapping.dataType}
                    onChange={(e) => handleMappingUpdate(actualIndex, { dataType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="text">Text</option>
                    <option value="integer">Integer</option>
                    <option value="numeric">Numeric</option>
                    <option value="date">Date</option>
                    <option value="jsonb">JSON</option>
                  </select>
                </div>

                {showAdvanced && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Value
                    </label>
                    <input
                      type="text"
                      value={mapping.defaultValue ? String(mapping.defaultValue) : ''}
                      onChange={(e) => handleMappingUpdate(actualIndex, { 
                        defaultValue: e.target.value || undefined 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Default value"
                    />
                  </div>
                )}

                <div className="flex items-center justify-center">
                  <button
                    onClick={() => removeMapping(actualIndex)}
                    className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmapped Columns */}
      {unmappedColumns.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h4 className="text-base font-medium text-gray-900">Unmapped Columns</h4>
            <span className="text-sm text-gray-500">({unmappedColumns.length} columns)</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              The following CSV columns are not mapped to database fields and will be stored in the special_needs JSON field:
            </p>
            <div className="flex flex-wrap gap-2">
              {unmappedColumns.map((column, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800"
                >
                  {column}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">Mapping Summary</h4>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {requiredMappings.filter(m => !m.csvColumn).length}
            </div>
            <div className="text-sm text-red-600">Unmapped Required</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {columnMappings.filter(m => m.csvColumn).length}
            </div>
            <div className="text-sm text-green-600">Mapped Fields</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {unmappedColumns.length}
            </div>
            <div className="text-sm text-yellow-600">Extra Columns</div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {requiredMappings.every(m => m.csvColumn) ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-800">
                  All required fields are mapped
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-800">
                  {requiredMappings.filter(m => !m.csvColumn).length} required fields need mapping
                </span>
              </>
            )}
          </div>

          <button
            onClick={onValidate}
            disabled={!requiredMappings.every(m => m.csvColumn)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
              requiredMappings.every(m => m.csvColumn)
                ? "text-white bg-indigo-600 hover:bg-indigo-700"
                : "text-gray-400 bg-gray-100 cursor-not-allowed"
            )}
          >
            <Eye className="h-4 w-4" />
            Validate & Preview
          </button>
        </div>
      </div>

      {/* Field Descriptions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-base font-medium text-gray-900 mb-4">Database Field Descriptions</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h5 className="font-medium text-gray-800">Required Fields:</h5>
            <ul className="space-y-1 text-gray-600">
              <li><strong>school_student_id:</strong> Unique student identifier within the school</li>
              <li><strong>first_name:</strong> Student's first name</li>
              <li><strong>last_name:</strong> Student's last name</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-medium text-gray-800">Optional Fields:</h5>
            <ul className="space-y-1 text-gray-600">
              <li><strong>dob:</strong> Date of birth (YYYY-MM-DD)</li>
              <li><strong>grade_level:</strong> Current grade level (-1 to 13)</li>
              <li><strong>enrollment_date:</strong> Date of enrollment</li>
              <li><strong>graduation_year:</strong> Expected graduation year</li>
              <li><strong>emergency_contact_*:</strong> Emergency contact information</li>
              <li><strong>current_gpa:</strong> Current GPA (0.00-4.00)</li>
              <li><strong>academic_status:</strong> Student status (active, inactive, etc.)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}