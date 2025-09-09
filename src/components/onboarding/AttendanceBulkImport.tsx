import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { findBestColumnMatches } from '../../utils/columnMatcher';
import FileUploader from './bulk-import/FileUploader';
import AttendanceColumnMapper from './AttendanceColumnMapper';
import DataPreview from './bulk-import/DataPreview';
import ValidationErrors from './bulk-import/ValidationErrors';
import { COLUMN_TYPES } from './bulk-import/constants';
import type { ColumnMapping } from '../../types/common';

interface ValidationError {
  type: 'mapping' | 'required' | 'format';
  message: string;
  field?: string;
  row?: number;
  value?: string;
}

interface AttendanceBulkImportProps {
  onImport: (data: Record<string, unknown>[]) => void;
  requiredFields: string[];
  template: Record<string, string>;
  description: string;
}

interface ErrorSection {
  type: string;
  title: string;
  errors: ValidationError[];
  isOpen: boolean;
}

interface RowValidation {
  rowIndex: number;
  errors: ValidationError[];
  excluded: boolean;
}

export default function AttendanceBulkImport({ onImport, requiredFields, template, description }: AttendanceBulkImportProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [errorSections, setErrorSections] = useState<ErrorSection[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showMappings, setShowMappings] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [rowValidations, setRowValidations] = useState<RowValidation[]>([]);
  const [excludeAllInvalid, setExcludeAllInvalid] = useState(false);
  const [originalRowValidations, setOriginalRowValidations] = useState<RowValidation[]>([]);
  const [excludedOptionalColumns, setExcludedOptionalColumns] = useState<string[]>([]);

  // Get available columns for attendance - focused on database schema only
  const getAvailableColumnsForAttendance = (): string[] => {
    return [
      // Required database fields
      'Student', 'ID', 'Student ID', 'StudentID', 'State ID',
      'Result Date', 'Date', 'Export Date', 'Record Date',
      'Total Days Present', 'Days Present', 'Present Days',
      'Total Days Possible', 'Days Possible', 'Possible Days',
      'FY Absences (Total Days)', 'Total Absences', 'Absences Total',
      'FY Absences (Excused Days)', 'Excused Absences', 'Excused',
      'FY Absences (Unexcused Days)', 'Unexcused Absences', 'Unexcused',
      'FY Tardies (Total Days)', 'Total Tardies', 'Tardies',
      
      // Optional database fields
      'Attendance Year', 'School Year', 'Academic Year',
      
      // Single mapping target for all optional fields
      'extra_data'
    ];
  };

  const validateData = (data: Record<string, unknown>[]): [ValidationError[], RowValidation[]] => {
    const errors: ValidationError[] = [];
    const rowValidations: RowValidation[] = [];

    data.forEach((row, index) => {
      const rowErrors: ValidationError[] = [];

      columnMappings.forEach(mapping => {
        if (!mapping.matched) return;

        const value = row[mapping.csvColumn];
        const field = mapping.dbColumn;

        if (requiredFields.includes(field) && (!value || value.toString().trim() === '')) {
          const error = {
            type: 'required' as const,
            field,
            row: index + 1,
            message: `Missing required value for "${field}" in row ${index + 1}`
          };
          errors.push(error);
          rowErrors.push(error);
        }

        if (field.toLowerCase().includes('email') && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value: String(value),
              message: `Invalid email format in row ${index + 1}: "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }

        if (field.includes('date') && value) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const stringValue = String(value);
          
          // Check if it's already in YYYY-MM-DD format
          if (dateRegex.test(stringValue)) {
            return; // Valid date format
          }
          
          // Check if it's an Excel serial date number
          const numValue = Number(stringValue);
          if (!isNaN(numValue) && numValue > 25000 && numValue < 100000) {
            // This looks like an Excel date serial number
            // Don't throw an error, let the AttendanceStep handle the conversion
            return;
          }
          
          // Try to parse as a regular date
          const parsedDate = new Date(stringValue);
          if (!isNaN(parsedDate.getTime())) {
            return; // Valid date that can be parsed
          }
          
          const error = {
            type: 'format' as const,
            field,
            row: index + 1,
            value: String(value),
            message: `Invalid date format in row ${index + 1} for "${field}". Expected YYYY-MM-DD, got "${value}"`
          };
          errors.push(error);
          rowErrors.push(error);
        }

        // Validate numeric fields
        const columnType = COLUMN_TYPES[field as keyof typeof COLUMN_TYPES];
        if ((columnType === 'numeric' || columnType === 'integer') && value) {
          if (isNaN(Number(value))) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value: String(value),
              message: `Invalid number format in row ${index + 1} for "${field}": "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }

        // Validate UUID fields
        if (columnType === 'uuid' && value) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(String(value))) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value: String(value),
              message: `Invalid UUID format in row ${index + 1} for "${field}": "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }
      });

      rowValidations.push({
        rowIndex: index,
        errors: rowErrors,
        excluded: false
      });
    });

    return [errors, rowValidations];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    
    if ('dataTransfer' in event) {
      // It's a drag event
      file = event.dataTransfer.files[0];
    } else if (event.target.files && event.target.files.length > 0) {
      // It's a file input event
      file = event.target.files[0];
    }
    
    if (!file) return;

    setErrors([]);
    setErrorSections([]);
    setShowMappings(false);
    setShowPreview(false);
    setExcludeAllInvalid(false);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            const newErrors = [{ type: 'format' as const, message: 'CSV file is empty' }];
            setErrors(newErrors);
            updateErrorSections(newErrors);
            return;
          }
          
          const columns = Object.keys(results.data[0] as Record<string, unknown>);
          setCsvColumns(columns);
          
          const availableColumnsForType = getAvailableColumnsForAttendance();
          
          const mappings = findBestColumnMatches(columns, availableColumnsForType);
          setColumnMappings(mappings.map(m => ({...m, matched: m.matched ?? false, manual: m.manual ?? false})));
          setCsvData(results.data as Record<string, unknown>[]);
          
          const [validationErrors, rowValidations] = validateData(results.data as Record<string, unknown>[]);
          setErrors(validationErrors);
          setRowValidations(rowValidations);
          setOriginalRowValidations([...rowValidations]);
          updateErrorSections(validationErrors);
          
          setShowMappings(true);
        },
        error: (error) => {
          const newErrors = [{
            type: 'format' as const,
            message: `Error parsing CSV: ${error.message}`
          }];
          setErrors(newErrors);
          updateErrorSections(newErrors);
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Handle special case for LinkIt attendance files
          // First try to get raw data as array
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let jsonData;
          let columns;
          
          // Check if this is a LinkIt attendance file (has "Result Date" in row 7)
          if (rawData.length > 6 && 
              Array.isArray(rawData[6]) && 
              (rawData[6] as unknown[]).some((cell: unknown) => String(cell).includes('Result Date'))) {
            
            // Extract headers from row 7 (index 6)
            const headers = rawData[6] as string[];
            
            // Get data starting from row 8 (index 7)
            const dataRows = rawData.slice(7) as unknown[][];
            
            // Convert to object format
            jsonData = dataRows.map(row => {
              const obj: Record<string, unknown> = {};
              headers.forEach((header, index) => {
                if (header && (row as unknown[])[index] !== undefined) {
                  obj[header] = (row as unknown[])[index];
                }
              });
              return obj;
            }).filter(row => Object.values(row).some(val => val != null && val !== ''));
            
            columns = headers.filter(Boolean);
            
          } else {
            // Standard Excel parsing
            jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
            
            if (jsonData.length === 0) {
              const newErrors = [{ type: 'format' as const, message: 'Excel file is empty' }];
              setErrors(newErrors);
              updateErrorSections(newErrors);
              return;
            }
            
            columns = Object.keys(jsonData[0] as Record<string, unknown>);
          }
          
          if (jsonData.length === 0) {
            const newErrors = [{ type: 'format' as const, message: 'No valid data found in Excel file' }];
            setErrors(newErrors);
            updateErrorSections(newErrors);
            return;
          }

          setCsvColumns(columns);
          
          const availableColumnsForType = getAvailableColumnsForAttendance();
          
          const mappings = findBestColumnMatches(columns, availableColumnsForType);
          setColumnMappings(mappings.map(m => ({...m, matched: m.matched ?? false, manual: m.manual ?? false})));
          setCsvData(jsonData);
          
          const [validationErrors, rowValidations] = validateData(jsonData);
          setErrors(validationErrors);
          setRowValidations(rowValidations);
          setOriginalRowValidations([...rowValidations]);
          updateErrorSections(validationErrors);
          
          setShowMappings(true);
        } catch (error: unknown) {
          const newErrors = [{
            type: 'format' as const,
            message: `Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
          }];
          setErrors(newErrors);
          updateErrorSections(newErrors);
        }
      };
      reader.onerror = () => {
        const newErrors = [{
          type: 'format' as const,
          message: 'Error reading file'
        }];
        setErrors(newErrors);
        updateErrorSections(newErrors);
      };
      reader.readAsBinaryString(file);
    } else {
      const newErrors = [{
        type: 'format' as const,
        message: 'Invalid file type. Please upload a CSV or Excel file.'
      }];
      setErrors(newErrors);
      updateErrorSections(newErrors);
    }
  };

  const handleAddMapping = () => {
    const availableColumnsForType = getAvailableColumnsForAttendance();
    
    // Find first unmapped required field, otherwise use first available column
    const unmappedRequired = requiredFields.find(field => 
      !columnMappings.some(m => m.dbColumn === field && m.matched)
    );
    
    const defaultDbColumn = unmappedRequired || availableColumnsForType[0] || '';
    
    const newMapping: ColumnMapping = {
      csvColumn: csvColumns[0] || '',
      dbColumn: defaultDbColumn,
      similarity: 1,
      matched: true,
      manual: true
    };
    setColumnMappings([...columnMappings, newMapping]);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditMapping = (_index: number) => {
    // This is handled in the ColumnMapper component
  };

  const handleSaveMapping = (index: number, csvColumn: string, dbColumn: string) => {
    const availableColumnsForType = getAvailableColumnsForAttendance();
    if (!availableColumnsForType.includes(dbColumn)) {
      setErrors([{
        type: 'mapping',
        message: 'Invalid column mapping'
      }]);
      return;
    }

    const updatedMappings = columnMappings.map((mapping, i) => 
      i === index ? {
        ...mapping,
        csvColumn,
        dbColumn,
        matched: true,
        manual: true,
        similarity: 1
      } : mapping
    );
    
    setColumnMappings(updatedMappings);
    
    // Re-validate data with new mappings
    const [validationErrors, newRowValidations] = validateData(csvData);
    setErrors(validationErrors);
    setRowValidations(newRowValidations);
    setOriginalRowValidations([...newRowValidations]);
    updateErrorSections(validationErrors);
  };

  const validateRequiredColumns = (mappings: ColumnMapping[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const missingRequired = requiredFields.filter(field => 
      !mappings.some(m => m.dbColumn === field && m.matched)
    );

    if (missingRequired.length > 0) {
      errors.push({
        type: 'mapping',
        message: `Missing required columns: ${missingRequired.join(', ')}`
      });
    }

    return errors;
  };

  const handleDeleteMapping = (index: number) => {
    setColumnMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleShowPreview = () => {
    const validationErrors = validateRequiredColumns(columnMappings);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      updateErrorSections(validationErrors);
      return;
    }
    setShowPreview(true);
  };

  const updateErrorSections = (errors: ValidationError[]) => {
    const sections: ErrorSection[] = [];
    const errorsByType = errors.reduce((acc, error) => {
      if (!acc[error.type]) {
        acc[error.type] = [];
      }
      acc[error.type].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    const typeOrder = ['mapping', 'required', 'format'];
    const typeTitles = {
      mapping: 'Column Mapping Errors',
      required: 'Required Field Errors',
      format: 'Format Validation Errors'
    };

    typeOrder.forEach(type => {
      if (errorsByType[type]?.length > 0) {
        sections.push({
          type,
          title: typeTitles[type as keyof typeof typeTitles],
          errors: errorsByType[type],
          isOpen: true
        });
      }
    });

    setErrorSections(sections);
  };

  const toggleErrorSection = (index: number) => {
    setErrorSections(prev => prev.map((section, i) => 
      i === index ? { ...section, isOpen: !section.isOpen } : section
    ));
  };

  const toggleRowExclusion = (rowIndex: number) => {
    setRowValidations(prev => prev.map(row => 
      row.rowIndex === rowIndex ? { ...row, excluded: !row.excluded } : row
    ));
  };

  const toggleExcludeAllInvalid = () => {
    const newValue = !excludeAllInvalid;
    setExcludeAllInvalid(newValue);
    
    if (newValue) {
      // Save current state before applying "exclude all invalid"
      setOriginalRowValidations([...rowValidations]);
      
      // Mark all invalid rows as excluded
      setRowValidations(prev => prev.map(row => ({
        ...row,
        excluded: row.errors.length > 0 ? true : row.excluded
      })));
    } else {
      // Restore original exclusion state
      setRowValidations(originalRowValidations);
    }
  };

  const handleExcludeOptionalColumns = (excludedColumns: string[]) => {
    setExcludedOptionalColumns(excludedColumns);
  };

  const handleImport = () => {
    // Filter out excluded rows and transform data
    const transformedData = csvData
      .filter((_, index) => {
        const rowValidation = rowValidations[index];
        // Skip if manually excluded or if excludeAllInvalid is true and row has errors
        return !(rowValidation?.excluded || (excludeAllInvalid && rowValidation?.errors.length > 0));
      })
      .map(row => {
        const newRow: Record<string, unknown> = {};
        columnMappings.forEach(mapping => {
          if (mapping.matched) {
            newRow[mapping.dbColumn] = row[mapping.csvColumn];
          }
        });
        
        // Add all non-excluded optional columns to the row for extra_data processing
        Object.keys(row).forEach(csvColumn => {
          if (!excludedOptionalColumns.includes(csvColumn)) {
            const isMappedToRequired = columnMappings.some(mapping => 
              mapping.csvColumn === csvColumn && mapping.matched
            );
            if (!isMappedToRequired) {
              newRow[csvColumn] = row[csvColumn];
            }
          }
        });
        
        return newRow;
      });

    onImport(transformedData);
  };

  return (
    <div className="space-y-4">
      <FileUploader 
        onFileUpload={handleFileUpload}
        description={description}
      />

      <ValidationErrors
        errors={errors}
        errorSections={errorSections}
        onClearErrors={() => {
          setErrors([]);
          setErrorSections([]);
        }}
        onToggleSection={toggleErrorSection}
      />

      {showMappings && columnMappings.length > 0 && (
        <AttendanceColumnMapper
          columnMappings={columnMappings}
          csvColumns={csvColumns}
          availableColumns={getAvailableColumnsForAttendance()}
          requiredFields={requiredFields}
          onAddMapping={handleAddMapping}
          onEditMapping={handleEditMapping}
          onSaveMapping={handleSaveMapping}
          onDeleteMapping={handleDeleteMapping}
          onShowPreview={handleShowPreview}
          onExcludeOptionalColumns={handleExcludeOptionalColumns}
        />
      )}

      {showPreview && (
        <DataPreview
          data={csvData}
          columnMappings={columnMappings}
          requiredFields={requiredFields}
          rowValidations={rowValidations}
          excludeAllInvalid={excludeAllInvalid}
          onToggleExcludeAll={toggleExcludeAllInvalid}
          onToggleRowExclusion={toggleRowExclusion}
          onImport={handleImport}
        />
      )}
    </div>
  );
}