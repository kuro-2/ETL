import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { findBestColumnMatches } from '../../utils/columnMatcher';
import FileUploader from './bulk-import/FileUploader';
import ColumnMapper from './bulk-import/ColumnMapper';
import DataPreview from './bulk-import/DataPreview';
import ValidationErrors from './bulk-import/ValidationErrors';
import { AVAILABLE_COLUMNS, COLUMN_TYPES } from './bulk-import/constants';
import type { ColumnMapping } from '../../types/common';

interface ValidationError {
  type: 'mapping' | 'required' | 'format';
  message: string;
  field?: string;
  row?: number;
  value?: string;
}

interface BulkImportProps {
  onImport: (data: Record<string, unknown>[]) => void;
  requiredFields: string[];
  template: Record<string, string>;
  description: string;
  multiple?: boolean;
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

export default function BulkImport({ onImport, requiredFields, template, description, multiple = false }: BulkImportProps) {
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


  // Detect the data type based on columns found in the file
  const detectDataType = (columns: string[]): string => {
    const attendanceKeywords = [
      'attendance', 'absent', 'present', 'tardies', 'result date', 
      'total days', 'fy absences', 'daily attendance rate'
    ];
    const studentKeywords = ['guardian', 'parent', 'enrollment', 'grade', 'student'];
    const teacherKeywords = ['qualification', 'certification', 'teacher'];
    const classroomKeywords = ['classroom', 'class'];
    
    const lowerColumns = columns.map(col => col.toLowerCase());
    
    // Check for attendance data indicators
    const attendanceScore = attendanceKeywords.reduce((score, keyword) => {
      return score + lowerColumns.filter(col => col.includes(keyword)).length;
    }, 0);
    
    const studentScore = studentKeywords.reduce((score, keyword) => {
      return score + lowerColumns.filter(col => col.includes(keyword)).length;
    }, 0);
    
    const teacherScore = teacherKeywords.reduce((score, keyword) => {
      return score + lowerColumns.filter(col => col.includes(keyword)).length;
    }, 0);
    
    const classroomScore = classroomKeywords.reduce((score, keyword) => {
      return score + lowerColumns.filter(col => col.includes(keyword)).length;
    }, 0);
    
    // Return the type with the highest score
    if (attendanceScore > 2) return 'attendance';
    if (teacherScore > studentScore && teacherScore > 0) return 'teachers';
    if (classroomScore > studentScore && classroomScore > 0) return 'classrooms';
    return 'students';
  };

  // Get available columns based on data type
  const getAvailableColumnsForType = (dataType: string): string[] => {
    return AVAILABLE_COLUMNS[dataType as keyof typeof AVAILABLE_COLUMNS] || [];
  };

  const getCurrentStep = () => {
    // Check for attendance template fields
    if ('Total Days Present' in template || 'FY Absences (Total Days)' in template || 'Daily Attendance Rate' in template) {
      return 'attendance';
    }
    if ('guardian1_name' in template) return 'students';
    if ('qualification1' in template) return 'teachers';
    if ('admin_user_type' in template) return 'admins';
    if ('classroom_name' in template) return 'classrooms';
    return 'students';
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
    let files: FileList | null = null;
    
    if ('dataTransfer' in event) {
      // It's a drag event
      files = event.dataTransfer.files;
    } else if (event.target.files) {
      // It's a file input event
      files = event.target.files;
    }
    
    if (!files || files.length === 0) return;

    setErrors([]);
    setErrorSections([]);
    setShowMappings(false);
    setShowPreview(false);
    setExcludeAllInvalid(false);

    // Process all files
    const processFiles = async () => {
      let allData: Record<string, unknown>[] = [];
      let allColumns: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileData = await processFile(file);
        if (fileData) {
          allData = [...allData, ...fileData.data];
          if (fileData.columns.length > allColumns.length) {
            allColumns = fileData.columns;
          }
        }
      }

      if (allData.length === 0) {
        const newErrors = [{ type: 'format' as const, message: 'No valid data found in uploaded files' }];
        setErrors(newErrors);
        updateErrorSections(newErrors);
        return;
      }

      setCsvColumns(allColumns);
      
      // Detect the actual data type from columns
      const detectedType = detectDataType(allColumns);
      const availableColumnsForType = getAvailableColumnsForType(detectedType);
      
      // For all steps except attendance, allow mapping any CSV column to required database fields
      const requiredColumnsOnly = availableColumnsForType.filter(col => requiredFields.includes(col));
      
      const mappings = findBestColumnMatches(allColumns, requiredColumnsOnly);
      setColumnMappings(mappings.map(m => ({...m, matched: m.matched ?? false, manual: m.manual ?? false})));
      setCsvData(allData);
      
      const [validationErrors, rowValidations] = validateData(allData);
      setErrors(validationErrors);
      setRowValidations(rowValidations);
      setOriginalRowValidations([...rowValidations]);
      updateErrorSections(validationErrors);
      
      setShowMappings(true);
    };

    processFiles().catch(error => {
      const newErrors = [{
        type: 'format' as const,
        message: `Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`
      }];
      setErrors(newErrors);
      updateErrorSections(newErrors);
    });
  };

  const processFile = (file: File): Promise<{data: Record<string, unknown>[], columns: string[]} | null> => {
    return new Promise((resolve, reject) => {

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            resolve(null);
            return;
          }
          
          const columns = Object.keys(results.data[0] as Record<string, unknown>);
          resolve({
            data: results.data as Record<string, unknown>[],
            columns
          });
        },
        error: (error) => {
          reject(new Error(`Error parsing CSV ${file.name}: ${error.message}`));
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
              resolve(null);
              return;
            }
            
            columns = Object.keys(jsonData[0] as Record<string, unknown>);
          }
          
          if (jsonData.length === 0) {
            resolve(null);
            return;
          }

          resolve({
            data: jsonData,
            columns
          });
        } catch (error: unknown) {
          reject(new Error(`Error parsing Excel file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => {
        reject(new Error(`Error reading file ${file.name}`));
      };
      reader.readAsBinaryString(file);
    } else {
      reject(new Error(`Invalid file type for ${file.name}. Please upload a CSV or Excel file.`));
    }
    });
  };

  const handleAddMapping = () => {
    const currentDataType = getCurrentStep();
    
    // Find first unmapped required field, otherwise use first available required column
    const availableColumnsForType = getAvailableColumnsForType(currentDataType);
    const requiredColumnsOnly = availableColumnsForType.filter(col => requiredFields.includes(col));
    
    const unmappedRequired = requiredFields.find(field => 
      !columnMappings.some(m => m.dbColumn === field && m.matched)
    );
    
    const defaultDbColumn = unmappedRequired || requiredColumnsOnly[0] || '';
    
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
    const currentDataType = getCurrentStep();
    const availableColumnsForType = getAvailableColumnsForType(currentDataType);
    
    // Allow mapping to any required field (since we only show required fields in dropdown)
    const requiredColumnsOnly = availableColumnsForType.filter(col => requiredFields.includes(col));
    
    if (!requiredColumnsOnly.includes(dbColumn)) {
      setErrors([{
        type: 'mapping',
        message: 'Invalid column mapping - only required fields are allowed'
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



  const handleImport = () => {
    // Filter out excluded rows and transform data - only process required field mappings
    const transformedData = csvData
      .filter((_, index) => {
        const rowValidation = rowValidations[index];
        // Skip if manually excluded or if excludeAllInvalid is true and row has errors
        return !(rowValidation?.excluded || (excludeAllInvalid && rowValidation?.errors.length > 0));
      })
      .map(row => {
        const newRow: Record<string, unknown> = {};
        // Only process mappings for required fields
        columnMappings.forEach(mapping => {
          if (mapping.matched && requiredFields.includes(mapping.dbColumn)) {
            newRow[mapping.dbColumn] = row[mapping.csvColumn];
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
        multiple={multiple}
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

      {showMappings && columnMappings.length > 0 && (() => {
        const currentDataType = getCurrentStep();
        const availableColumnsForType = getAvailableColumnsForType(currentDataType);
        // Only show required fields as available mapping targets
        const requiredColumnsOnly = availableColumnsForType.filter(col => requiredFields.includes(col));
        
        return (
          <ColumnMapper
            columnMappings={columnMappings}
            csvColumns={csvColumns}
            availableColumns={requiredColumnsOnly}
            requiredFields={requiredFields}
            onAddMapping={handleAddMapping}
            onEditMapping={handleEditMapping}
            onSaveMapping={handleSaveMapping}
            onDeleteMapping={handleDeleteMapping}
            onShowPreview={handleShowPreview}
          />
        );
      })()}

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