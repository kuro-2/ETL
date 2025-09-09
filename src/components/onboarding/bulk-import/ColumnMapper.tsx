import React, { useState } from 'react';
import { Plus, ChevronDown, Edit2, Save, X, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ColumnMapping } from '../../../types/common';
import { COLUMN_DESCRIPTIONS } from './constants';

interface ColumnMapperProps {
  columnMappings: ColumnMapping[];
  csvColumns: string[];
  availableColumns: string[];
  requiredFields: string[];
  onAddMapping: () => void;
  onEditMapping: (index: number) => void;
  onSaveMapping: (index: number, csvColumn: string, dbColumn: string) => void;
  onDeleteMapping: (index: number) => void;
  onShowPreview: () => void;
}

export default function ColumnMapper({
  columnMappings,
  csvColumns,
  availableColumns,
  requiredFields,
  onAddMapping,
  onEditMapping,
  onSaveMapping,
  onDeleteMapping,
  onShowPreview
}: ColumnMapperProps) {
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [editCsvColumn, setEditCsvColumn] = useState('');
  const [editDbColumn, setEditDbColumn] = useState('');
  const [showRequiredMappings, setShowRequiredMappings] = useState(true);

  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  // Only show required mappings - no optional sections
  const requiredMappings = columnMappings.filter(mapping => 
    requiredFields.includes(mapping.dbColumn)
  );

  // Only use required columns
  const requiredColumns = availableColumns.filter(col => requiredFields.includes(col));

  const handleEditMapping = (index: number) => {
    setEditingMapping(index);
    setEditCsvColumn(columnMappings[index].csvColumn);
    setEditDbColumn(columnMappings[index].dbColumn);
    onEditMapping(index);
  };

  const handleAddMapping = () => {
    // Add through the parent handler which will append to columnMappings
    // The parent will determine the appropriate default column based on unmapped required fields
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

  const renderRequiredFieldsSection = () => {
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <h5 className="text-sm font-semibold text-gray-900">
              Required Database Fields
              <span className="ml-2 text-xs text-gray-500">
                ({requiredMappings.length})
              </span>
            </h5>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddMapping}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-700 rounded-md hover:bg-indigo-50"
            >
              <Plus className="h-3 w-3" />
              Add Required Field
            </button>
            <button
              onClick={() => setShowRequiredMappings(!showRequiredMappings)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                showRequiredMappings && "transform rotate-180"
              )} />
            </button>
          </div>
        </div>

        {showRequiredMappings && (
          <div className="space-y-2">
            {requiredMappings.length === 0 ? (
              <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-md">
                No required database fields mapped yet. Please map your CSV columns to required database fields to proceed.
              </div>
            ) : (
              requiredMappings.map((mapping) => {
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
                            {requiredColumns.map(col => (
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
            Map any columns from your file to the required database fields below. You can use optional CSV columns to fill required database fields.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Map any CSV column to required database fields</span>
        </div>
      </div>

      {/* Required Fields Section */}
      {renderRequiredFieldsSection()}

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