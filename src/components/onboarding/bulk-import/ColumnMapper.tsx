import React, { useState } from 'react';
import { Plus, ChevronDown, Edit2, Save, X, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ColumnMapping } from '../BulkImport';
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
  const [showMappings, setShowMappings] = useState(true);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const handleEditMapping = (index: number) => {
    setEditingMapping(index);
    setEditCsvColumn(columnMappings[index].csvColumn);
    setEditDbColumn(columnMappings[index].dbColumn);
    onEditMapping(index);
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

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">Column Mappings</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddMapping}
            className="flex items-center gap-1 px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700 rounded-md hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            Add Mapping
          </button>
          <button
            onClick={() => setShowMappings(!showMappings)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              showMappings && "transform rotate-180"
            )} />
          </button>
        </div>
      </div>

      {showMappings && (
        <div className="space-y-2">
          {columnMappings.map((mapping, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between p-2 rounded-md",
                mapping.matched ? "bg-green-50" : "bg-yellow-50"
              )}
            >
              <div className="flex items-center gap-2">
                {editingMapping === index ? (
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
                      {availableColumns.map(col => (
                        <option key={col} value={col}>
                          {col} {requiredFields.includes(col) && '*'}
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
                          "text-sm",
                          mapping.matched ? "text-green-700" : "text-yellow-700"
                        )}
                        onMouseEnter={() => setHoveredColumn(mapping.dbColumn)}
                        onMouseLeave={() => setHoveredColumn(null)}
                      >
                        {mapping.dbColumn}
                        {requiredFields.includes(mapping.dbColumn) && ' *'}
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
                {requiredFields.includes(mapping.dbColumn) && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    Required
                  </span>
                )}
                {mapping.manual && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Manual
                  </span>
                )}
                {editingMapping === index ? (
                  <>
                    <button
                      onClick={() => handleSaveMapping(index)}
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
                      onClick={() => handleEditMapping(index)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMapping(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
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