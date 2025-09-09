import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Filter, Table } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ColumnMapping } from '../BulkImport';

interface DataPreviewProps {
  data: any[];
  columnMappings: ColumnMapping[];
  requiredFields: string[];
  rowValidations: {
    rowIndex: number;
    errors: Array<{
      type: string;
      field?: string;
      message: string;
    }>;
    excluded: boolean;
  }[];
  excludeAllInvalid: boolean;
  onToggleExcludeAll: () => void;
  onToggleRowExclusion: (rowIndex: number) => void;
  onImport: () => void;
}

export default function DataPreview({
  data,
  columnMappings,
  requiredFields,
  rowValidations,
  excludeAllInvalid,
  onToggleExcludeAll,
  onToggleRowExclusion,
  onImport
}: DataPreviewProps) {
  // Calculate valid rows count
  const validRowsCount = rowValidations.filter(r => 
    !(r.excluded || (excludeAllInvalid && r.errors.length > 0))
  ).length;
  
  const invalidRowsCount = rowValidations.filter(r => r.errors.length > 0).length;
  const excludedRowsCount = rowValidations.filter(r => 
    r.excluded || (excludeAllInvalid && r.errors.length > 0)
  ).length;

  // State to track if we've shown the preview
  const [showFullPreview, setShowFullPreview] = useState(false);
  
  // Number of rows to show in preview
  const previewRowCount = showFullPreview ? data.length : Math.min(5, data.length);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Table className="h-5 w-5 text-indigo-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900">Data Preview</h4>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {data.length} total rows
            </span>
            {invalidRowsCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {invalidRowsCount} invalid
              </span>
            )}
            {excludedRowsCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {excludedRowsCount} excluded
              </span>
            )}
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludeAllInvalid}
              onChange={onToggleExcludeAll}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">Ignore All Invalid Rows</span>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sticky left-0 bg-gray-50 z-10">
                Status
              </th>
              {columnMappings
                .filter(m => m.matched)
                .map((mapping, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {mapping.dbColumn}
                    {requiredFields.includes(mapping.dbColumn) && ' *'}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.slice(0, previewRowCount).map((row, rowIndex) => {
              const validation = rowValidations[rowIndex];
              const hasErrors = validation?.errors.length > 0;
              const isExcluded = validation?.excluded || (excludeAllInvalid && hasErrors);

              return (
                <tr 
                  key={rowIndex}
                  className={cn(
                    isExcluded && "opacity-50 bg-gray-50",
                    hasErrors && !isExcluded && "bg-red-50/30"
                  )}
                >
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                    <button
                      onClick={() => onToggleRowExclusion(rowIndex)}
                      disabled={excludeAllInvalid && hasErrors}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                        isExcluded
                          ? "bg-gray-100 text-gray-500"
                          : hasErrors
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200",
                        excludeAllInvalid && hasErrors && "cursor-not-allowed opacity-75"
                      )}
                    >
                      {isExcluded ? (
                        <>
                          <Filter className="h-4 w-4" />
                          Excluded
                        </>
                      ) : hasErrors ? (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          {validation.errors.length} {validation.errors.length === 1 ? 'Error' : 'Errors'}
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Valid
                        </>
                      )}
                    </button>
                  </td>
                  {columnMappings
                    .filter(m => m.matched)
                    .map((mapping, colIndex) => {
                      const hasFieldError = validation?.errors.some(e => e.field === mapping.dbColumn);
                      return (
                        <td
                          key={colIndex}
                          className={cn(
                            "px-6 py-4 whitespace-nowrap text-sm",
                            hasFieldError
                              ? "text-red-600 font-medium"
                              : "text-gray-500"
                          )}
                        >
                          {row[mapping.csvColumn] || '-'}
                        </td>
                      );
                    })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length > 5 && !showFullPreview && (
        <div className="text-center">
          <button
            onClick={() => setShowFullPreview(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Show all {data.length} rows
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {excludedRowsCount > 0 ? (
            <span>{excludedRowsCount} rows will be excluded</span>
          ) : (
            <span>All rows will be imported</span>
          )}
        </div>
        <button
          onClick={onImport}
          disabled={validRowsCount === 0}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md",
            "flex items-center gap-2",
            validRowsCount > 0
              ? "text-white bg-indigo-600 hover:bg-indigo-700"
              : "text-gray-400 bg-gray-100 cursor-not-allowed"
          )}
        >
          Import {validRowsCount} {validRowsCount === 1 ? 'Row' : 'Rows'}
        </button>
      </div>
    </div>
  );
}