import React, { useState } from 'react';
import { Plus, ChevronDown, Edit2, Save, X, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ColumnMapping } from '../../types/common';
import { COLUMN_DESCRIPTIONS } from './bulk-import/constants';

interface AttendanceColumnMapperProps {
  columnMappings: ColumnMapping[];
  csvColumns: string[];
  availableColumns: string[];
  requiredFields: string[];
  onAddMapping: () => void;
  onEditMapping: (index: number) => void;
  onSaveMapping: (index: number, csvColumn: string, dbColumn: string) => void;
  onDeleteMapping: (index: number) => void;
  onShowPreview: () => void;
  onExcludeOptionalColumns?: (excludedColumns: string[]) => void;
}

export default function AttendanceColumnMapper({
  columnMappings,
  csvColumns,
  availableColumns,
  requiredFields,
  onAddMapping,
  onEditMapping,
  onSaveMapping,
  onDeleteMapping,
  onShowPreview,
  onExcludeOptionalColumns
}: AttendanceColumnMapperProps) {
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [editCsvColumn, setEditCsvColumn] = useState('');
  const [editDbColumn, setEditDbColumn] = useState('');
  const [showRequiredMappings, setShowRequiredMappings] = useState(true);
  const [showOptionalMappings, setShowOptionalMappings] = useState(true);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [excludedOptionalColumns, setExcludedOptionalColumns] = useState<Set<string>>(new Set());

  // Notify parent component when excluded columns change
  React.useEffect(() => {
    if (onExcludeOptionalColumns) {
      onExcludeOptionalColumns(Array.from(excludedOptionalColumns));
    }
  }, [excludedOptionalColumns, onExcludeOptionalColumns]);

  // Split mappings into required and optional
  const requiredMappings = columnMappings.filter(mapping => 
    requiredFields.includes(mapping.dbColumn)
  );
  const optionalMappings = columnMappings.filter(mapping => 
    !requiredFields.includes(mapping.dbColumn)
  );

  // Split available columns into required and optional
  const requiredColumns = availableColumns.filter(col => requiredFields.includes(col));
  const optionalColumns = availableColumns.filter(col => !requiredFields.includes(col));

  const handleEditMapping = (index: number) => {
    setEditingMapping(index);
    setEditCsvColumn(columnMappings[index].csvColumn);
    setEditDbColumn(columnMappings[index].dbColumn);
    onEditMapping(index);
  };

  const handleAddRequiredMapping = () => {
    // Add through the parent handler which will append to columnMappings
    // The parent will determine the appropriate default column based on unmapped required fields
    onAddMapping();
  };

  const handleAddOptionalMapping = () => {
    // Add through the parent handler which will append to columnMappings
    // The parent will determine the appropriate default column
    onAddMapping();
  };

  const handleSaveMapping = (index: number) => {
    if (!availableColumns.includes(editDbColumn)) {
      return;
    }
    onSaveMapping(index, editCsvColumn, editDbColumn);
    setEditingMapping(null);
    setEditCsvColumn('');
    setEditDbColumn('');
  };

  const renderMappingSection = (mappings: ColumnMapping[], sectionType: 'required' | 'optional') => {
    const availableColumnsForSection = sectionType === 'required' ? requiredColumns : optionalColumns;
    const isExpanded = sectionType === 'required' ? showRequiredMappings : showOptionalMappings;
    const setExpanded = sectionType === 'required' ? setShowRequiredMappings : setShowOptionalMappings;
    const addHandler = sectionType === 'required' ? handleAddRequiredMapping : handleAddOptionalMapping;
    
    // For optional fields, we want to show CSV columns that map to extra_data
    const optionalCsvColumns = sectionType === 'optional' 
      ? csvColumns.filter(csvCol => {
          // Find columns that are not already mapped to required fields
          const isUsedInRequired = columnMappings.some(mapping => 
            mapping.csvColumn === csvCol && requiredFields.includes(mapping.dbColumn)
          );
          // Also exclude attendance_year since it's a regular optional field, not extra_data
          const isAttendanceYear = columnMappings.some(mapping =>
            mapping.csvColumn === csvCol && mapping.dbColumn === 'Attendance Year'
          );
          return !isUsedInRequired && !isAttendanceYear;
        })
      : [];
    
    const handleDeleteOptionalColumn = (csvColumn: string) => {
      setExcludedOptionalColumns(prev => new Set([...prev, csvColumn]));
    };
    
    const handleRestoreOptionalColumn = (csvColumn: string) => {
      setExcludedOptionalColumns(prev => {
        const newSet = new Set(prev);
        newSet.delete(csvColumn);
        return newSet;
      });
    };
    
    // Filter out excluded columns
    const visibleOptionalColumns = sectionType === 'optional' 
      ? optionalCsvColumns.filter(col => !excludedOptionalColumns.has(col))
      : [];
    
    const excludedColumns = sectionType === 'optional'
      ? Array.from(excludedOptionalColumns).filter(col => optionalCsvColumns.includes(col))
      : [];
    
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              sectionType === 'required' ? "bg-red-500" : "bg-gray-400"
            )} />
            <h5 className="text-sm font-semibold text-gray-900">
              {sectionType === 'required' ? 'Required Fields' : 'Optional Fields → extra_data'}
              <span className="ml-2 text-xs text-gray-500">
                ({sectionType === 'optional' ? visibleOptionalColumns.length : mappings.length})
              </span>
              {sectionType === 'optional' && excludedColumns.length > 0 && (
                <span className="ml-2 text-xs text-red-500">
                  ({excludedColumns.length} excluded)
                </span>
              )}
            </h5>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addHandler}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-700 rounded-md hover:bg-indigo-50"
              disabled={sectionType === 'optional'}
            >
              <Plus className="h-3 w-3" />
              Add {sectionType === 'required' ? 'Required' : 'Optional'}
            </button>
            <button
              onClick={() => setExpanded(!isExpanded)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "transform rotate-180"
              )} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-2">
            {sectionType === 'optional' ? (
              // Special handling for optional fields - show all unused CSV columns mapping to extra_data
              <>
                {visibleOptionalColumns.length === 0 && excludedColumns.length === 0 ? (
                  <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
                    All CSV columns are already mapped to required fields or no additional columns available.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-blue-600 font-medium mb-2">
                      📋 The following columns will be stored as JSON data in the extra_data field:
                    </div>
                    
                    {/* Active optional columns */}
                    {visibleOptionalColumns.map((csvColumn) => (
                      <div
                        key={csvColumn}
                        className="flex items-center justify-between p-3 rounded-md border bg-blue-50 border-blue-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {csvColumn}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-sm font-medium text-blue-700">
                            extra_data
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            JSON Storage
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteOptionalColumn(csvColumn)}
                            className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
                            title="Exclude this column from import"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Excluded columns section */}
                    {excludedColumns.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="text-xs text-red-600 font-medium mb-2">
                          🚫 Excluded columns (will not be imported):
                        </div>
                        {excludedColumns.map((csvColumn) => (
                          <div
                            key={csvColumn}
                            className="flex items-center justify-between p-3 rounded-md border bg-red-50 border-red-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500 line-through">
                                {csvColumn}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-sm font-medium text-red-500">
                                excluded
                              </span>
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Not Imported
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRestoreOptionalColumn(csvColumn)}
                                className="p-1 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100"
                                title="Restore this column for import"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-xs text-blue-700">
                        💡 <strong>Control Your Data:</strong> Use the ✖ button to exclude columns you don't need. 
                        Excluded columns will not be imported. You can restore them using the + button.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Regular handling for required fields
              mappings.length === 0 ? (
                <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
                  No required fields mapped yet. Please map required fields to proceed.
                </div>
              ) : (
                mappings.map((mapping) => {
                  // Find the actual index in the full columnMappings array
                  const actualIndex = columnMappings.findIndex(m => 
                    m.csvColumn === mapping.csvColumn && m.dbColumn === mapping.dbColumn
                  );
                  
                  return (
                    <div
                      key={actualIndex}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md border",
                        mapping.matched ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {editingMapping === actualIndex ? (
                          <>
                            <select
                              value={editCsvColumn}
                              onChange={(e) => setEditCsvColumn(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {csvColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                            <span className="text-gray-400">→</span>
                            <select
                              value={editDbColumn}
                              onChange={(e) => setEditDbColumn(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {availableColumnsForSection.map(col => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-700">
                              {mapping.csvColumn}
                            </span>
                            <span className="text-gray-400">→</span>
                            <div className="relative">
                              <span 
                                className={cn(
                                  "text-sm font-medium",
                                  mapping.matched ? "text-green-700" : "text-yellow-700"
                                )}
                                onMouseEnter={() => setHoveredColumn(mapping.dbColumn)}
                                onMouseLeave={() => setHoveredColumn(null)}
                              >
                                {mapping.dbColumn}
                              </span>
                              {hoveredColumn === mapping.dbColumn && COLUMN_DESCRIPTIONS[mapping.dbColumn as keyof typeof COLUMN_DESCRIPTIONS] && (
                                <div className="absolute z-10 left-0 mt-1 w-64 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                                  {COLUMN_DESCRIPTIONS[mapping.dbColumn as keyof typeof COLUMN_DESCRIPTIONS]}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              ({Math.round(mapping.similarity * 100)}% match)
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                          Required
                        </span>
                        {mapping.manual && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Manual
                          </span>
                        )}
                        {editingMapping === actualIndex ? (
                          <>
                            <button
                              onClick={() => handleSaveMapping(actualIndex)}
                              className="p-1 text-green-600 hover:text-green-800"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMapping(null);
                                setEditCsvColumn('');
                                setEditDbColumn('');
                              }}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditMapping(actualIndex)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteMapping(actualIndex)}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-gray-900">Column Data Mapping</h4>
          <p className="text-sm text-gray-600 mt-1">
            Map your file columns to the required and optional database fields below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Red dots = Required, Gray dots = Optional</span>
        </div>
      </div>

      {/* Required Fields Section */}
      {renderMappingSection(requiredMappings, 'required')}
      
      {/* Optional Fields Section */}
      {renderMappingSection(optionalMappings, 'optional')}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onShowPreview}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Preview Data
        </button>
      </div>
    </div>
  );
}