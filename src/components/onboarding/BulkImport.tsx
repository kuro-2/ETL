import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { findBestColumnMatches } from '../../utils/columnMatcher';
import FileUploader from './bulk-import/FileUploader';
import ColumnMapper from './bulk-import/ColumnMapper';
import DataPreview from './bulk-import/DataPreview';
import ValidationErrors from './bulk-import/ValidationErrors';
import { AVAILABLE_COLUMNS, COLUMN_TYPES } from './bulk-import/constants';

interface BulkImportProps {
  onImport: (data: any[]) => void;
  requiredFields: string[];
  template: Record<string, string>;
  description: string;
}

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  similarity: number;
  matched: boolean;
  manual: boolean;
}

interface ValidationError {
  type: 'required' | 'format' | 'mapping';
  field?: string;
  row?: number;
  message: string;
  value?: string;
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

export default function BulkImport({ onImport, requiredFields, template, description }: BulkImportProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [errorSections, setErrorSections] = useState<ErrorSection[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showMappings, setShowMappings] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [rowValidations, setRowValidations] = useState<RowValidation[]>([]);
  const [excludeAllInvalid, setExcludeAllInvalid] = useState(false);
  const [originalRowValidations, setOriginalRowValidations] = useState<RowValidation[]>([]);

  const getCurrentStep = () => {
    if (template.hasOwnProperty('guardian1_name')) return 'students';
    if (template.hasOwnProperty('qualification1')) return 'teachers';
    if (template.hasOwnProperty('admin_user_type')) return 'admins';
    if (template.hasOwnProperty('classroom_name')) return 'classrooms';
    return 'students';
  };

  const currentStep = getCurrentStep();
  const availableColumns = AVAILABLE_COLUMNS[currentStep as keyof typeof AVAILABLE_COLUMNS] || [];

  const validateData = (data: any[]): [ValidationError[], RowValidation[]] => {
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
          if (!emailRegex.test(value)) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value,
              message: `Invalid email format in row ${index + 1}: "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }

        if (field.includes('date') && value) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value,
              message: `Invalid date format in row ${index + 1} for "${field}". Expected YYYY-MM-DD, got "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }

        // Validate numeric fields
        const columnType = COLUMN_TYPES[field as keyof typeof COLUMN_TYPES];
        if ((columnType === 'numeric' || columnType === 'integer') && value) {
          if (isNaN(Number(value))) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value,
              message: `Invalid number format in row ${index + 1} for "${field}": "${value}"`
            };
            errors.push(error);
            rowErrors.push(error);
          }
        }

        // Validate UUID fields
        if (columnType === 'uuid' && value) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            const error = {
              type: 'format' as const,
              field,
              row: index + 1,
              value,
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
          
          const columns = Object.keys(results.data[0]);
          setCsvColumns(columns);
          const mappings = findBestColumnMatches(columns, availableColumns);
          setColumnMappings(mappings);
          setCsvData(results.data);
          
          const [validationErrors, rowValidations] = validateData(results.data);
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            const newErrors = [{ type: 'format' as const, message: 'Excel file is empty' }];
            setErrors(newErrors);
            updateErrorSections(newErrors);
            return;
          }

          const columns = Object.keys(jsonData[0]);
          setCsvColumns(columns);
          const mappings = findBestColumnMatches(columns, availableColumns);
          setColumnMappings(mappings);
          setCsvData(jsonData);
          
          const [validationErrors, rowValidations] = validateData(jsonData);
          setErrors(validationErrors);
          setRowValidations(rowValidations);
          setOriginalRowValidations([...rowValidations]);
          updateErrorSections(validationErrors);
          
          setShowMappings(true);
        } catch (error: any) {
          const newErrors = [{
            type: 'format' as const,
            message: `Error parsing Excel file: ${error.message}`
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
    const newMapping: ColumnMapping = {
      csvColumn: csvColumns[0] || '',
      dbColumn: availableColumns[0] || '',
      similarity: 1,
      matched: true,
      manual: true
    };
    setColumnMappings([...columnMappings, newMapping]);
  };

  const handleEditMapping = (index: number) => {
    // This is handled in the ColumnMapper component
  };

  const handleSaveMapping = (index: number, csvColumn: string, dbColumn: string) => {
    if (!availableColumns.includes(dbColumn)) {
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

  const handleImport = () => {
    // Filter out excluded rows and transform data
    const transformedData = csvData
      .filter((_, index) => {
        const rowValidation = rowValidations[index];
        // Skip if manually excluded or if excludeAllInvalid is true and row has errors
        return !(rowValidation?.excluded || (excludeAllInvalid && rowValidation?.errors.length > 0));
      })
      .map(row => {
        const newRow: Record<string, any> = {};
        columnMappings.forEach(mapping => {
          if (mapping.matched) {
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
        <ColumnMapper
          columnMappings={columnMappings}
          csvColumns={csvColumns}
          availableColumns={availableColumns}
          requiredFields={requiredFields}
          onAddMapping={handleAddMapping}
          onEditMapping={handleEditMapping}
          onSaveMapping={handleSaveMapping}
          onDeleteMapping={handleDeleteMapping}
          onShowPreview={handleShowPreview}
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