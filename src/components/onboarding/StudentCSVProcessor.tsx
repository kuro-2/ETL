import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Settings, Download, Eye } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { StudentCSVProcessor, ColumnMapping, ProcessingResult, CSVStudentRow } from '../../utils/studentCsvProcessor';
import { cn } from '../../lib/utils';

interface StudentCSVProcessorProps {
  onProcessingComplete: (result: ProcessingResult) => void;
  schoolId?: string;
  className?: string;
}

interface ProcessingState {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
}

export default function StudentCSVProcessorComponent({ 
  onProcessingComplete, 
  schoolId,
  className 
}: StudentCSVProcessorProps) {
  const [csvData, setCsvData] = useState<CSVStudentRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showMappingConfig, setShowMappingConfig] = useState(false);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentStep: '',
    progress: 0
  });
  const [validationResult, setValidationResult] = useState<{
    errors: any[];
    warnings: any[];
  } | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const processor = React.useMemo(() => {
    return new StudentCSVProcessor(undefined, schoolId);
  }, [schoolId]);

  /**
   * Handle file upload and parsing
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingState({
      isProcessing: true,
      currentStep: 'Parsing file...',
      progress: 10
    });

    try {
      let parsedData: CSVStudentRow[] = [];
      let headers: string[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const parseResult = await new Promise<{ data: CSVStudentRow[]; headers: string[] }>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
                return;
              }
              
              const data = results.data as CSVStudentRow[];
              const headers = Object.keys(data[0] || {});
              resolve({ data, headers });
            },
            error: (error) => {
              reject(new Error(`CSV parsing failed: ${error.message}`));
            }
          });
        });

        parsedData = parseResult.data;
        headers = parseResult.headers;
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        parsedData = XLSX.utils.sheet_to_json(worksheet) as CSVStudentRow[];
        headers = Object.keys(parsedData[0] || {});
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
      }

      if (parsedData.length === 0) {
        throw new Error('No data found in the uploaded file.');
      }

      setProcessingState({
        isProcessing: true,
        currentStep: 'Detecting column mappings...',
        progress: 30
      });

      // Auto-detect column mappings
      const detectedMappings = processor.detectColumnMappings(headers);
      
      setCsvData(parsedData);
      setCsvHeaders(headers);
      setColumnMappings(detectedMappings);
      setShowMappingConfig(true);

      setProcessingState({
        isProcessing: false,
        currentStep: 'Ready for mapping configuration',
        progress: 100
      });

    } catch (error) {
      setProcessingState({
        isProcessing: false,
        currentStep: 'Error',
        progress: 0
      });
      
      console.error('File processing error:', error);
      alert(error instanceof Error ? error.message : 'Failed to process file');
    }
  }, [processor]);

  /**
   * Validate current mappings and data
   */
  const handleValidateData = useCallback(() => {
    if (csvData.length === 0 || columnMappings.length === 0) return;

    setProcessingState({
      isProcessing: true,
      currentStep: 'Validating data...',
      progress: 50
    });

    try {
      const validation = processor.validateCSVData(csvData, columnMappings);
      setValidationResult(validation);
      setShowPreview(true);
    } catch (error) {
      console.error('Validation error:', error);
      alert(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setProcessingState({
        isProcessing: false,
        currentStep: 'Validation complete',
        progress: 100
      });
    }
  }, [csvData, columnMappings, processor]);

  /**
   * Process the CSV data
   */
  const handleProcessData = useCallback(async () => {
    if (csvData.length === 0 || columnMappings.length === 0) return;

    setProcessingState({
      isProcessing: true,
      currentStep: 'Processing student records...',
      progress: 0
    });

    try {
      const result = await processor.processCSVData(csvData, columnMappings, {
        skipInvalidRows: true,
        allowPartialUpdates: true,
        batchSize: 25
      });

      setProcessingResult(result);
      onProcessingComplete(result);

      setProcessingState({
        isProcessing: false,
        currentStep: 'Processing complete',
        progress: 100
      });

    } catch (error) {
      setProcessingState({
        isProcessing: false,
        currentStep: 'Processing failed',
        progress: 0
      });
      
      console.error('Processing error:', error);
      alert(error instanceof Error ? error.message : 'Processing failed');
    }
  }, [csvData, columnMappings, processor, onProcessingComplete]);

  /**
   * Update column mapping
   */
  const handleMappingChange = useCallback((index: number, updates: Partial<ColumnMapping>) => {
    setColumnMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, ...updates } : mapping
    ));
  }, []);

  /**
   * Download processing report
   */
  const handleDownloadReport = useCallback(() => {
    if (!processingResult) return;

    const report = processor.generateReport(processingResult);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_processing_report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [processingResult, processor]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* File Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-medium text-gray-900">Student Data Import</h3>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV or Excel file containing student data. The system will automatically detect 
            and map columns to the appropriate database fields.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload Student Data File
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    CSV or Excel files supported
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={processingState.isProcessing}
                  />
                  <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                    {processingState.isProcessing ? processingState.currentStep : 'Choose File'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {processingState.isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{processingState.currentStep}</span>
                <span className="text-gray-600">{processingState.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Mapping Configuration */}
      {showMappingConfig && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-medium text-gray-900">Column Mapping Configuration</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleValidateData}
                disabled={processingState.isProcessing}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Preview & Validate
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Review and adjust how CSV columns map to database fields. Required fields are marked with *.
            </p>

            <div className="grid gap-4">
              {columnMappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-4 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CSV Column
                    </label>
                    <select
                      value={mapping.csvColumn}
                      onChange={(e) => handleMappingChange(index, { csvColumn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select column...</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Database Field {mapping.required && <span className="text-red-500">*</span>}
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

                  <div className="flex items-center gap-2">
                    {mapping.required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                    {mapping.defaultValue !== undefined && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default: {String(mapping.defaultValue)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Preview and Validation */}
      {showPreview && validationResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">Data Preview & Validation</h3>
          </div>

          {/* Validation Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
              <div className="text-sm text-blue-600">Total Rows</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{validationResult.errors.length}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{validationResult.warnings.length}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
          </div>

          {/* Validation Messages */}
          {validationResult.errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <h4 className="font-medium text-red-800">Validation Errors</h4>
              </div>
              <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                {validationResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index}>
                    Row {error.row}: {error.message}
                  </div>
                ))}
                {validationResult.errors.length > 10 && (
                  <div className="text-red-600 font-medium">
                    ... and {validationResult.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <h4 className="font-medium text-yellow-800">Warnings</h4>
              </div>
              <div className="space-y-1 text-sm text-yellow-700 max-h-32 overflow-y-auto">
                {validationResult.warnings.slice(0, 5).map((warning, index) => (
                  <div key={index}>
                    Row {warning.row}: {warning.message}
                  </div>
                ))}
                {validationResult.warnings.length > 5 && (
                  <div className="text-yellow-600 font-medium">
                    ... and {validationResult.warnings.length - 5} more warnings
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Data Preview (First 5 rows)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columnMappings
                      .filter(m => m.csvColumn)
                      .map((mapping, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {mapping.dbColumn}
                          {mapping.required && <span className="text-red-500 ml-1">*</span>}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {csvData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {columnMappings
                        .filter(m => m.csvColumn)
                        .map((mapping, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {row[mapping.csvColumn!] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Process Button */}
          <div className="flex justify-end">
            <button
              onClick={handleProcessData}
              disabled={processingState.isProcessing || validationResult.errors.length > 0}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                validationResult.errors.length === 0
                  ? "text-white bg-green-600 hover:bg-green-700"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              Process {csvData.length} Students
            </button>
          </div>
        </div>
      )}

      {/* Processing Results */}
      {processingResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">Processing Results</h3>
            </div>
            <button
              onClick={handleDownloadReport}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{processingResult.processed}</div>
              <div className="text-sm text-blue-600">Processed</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{processingResult.inserted}</div>
              <div className="text-sm text-green-600">Inserted</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{processingResult.updated}</div>
              <div className="text-sm text-purple-600">Updated</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{processingResult.skipped}</div>
              <div className="text-sm text-yellow-600">Skipped</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{processingResult.errors.length}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {/* Unmatched Columns */}
          {processingResult.unmatchedColumns.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">
                Unmatched Columns (stored in special_needs)
              </h4>
              <div className="flex flex-wrap gap-2">
                {processingResult.unmatchedColumns.map((column, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {column}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error Details */}
          {processingResult.errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Processing Errors</h4>
              <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                {processingResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index}>
                    Row {error.row}: {error.message}
                    {error.field && <span className="text-red-600"> (Field: {error.field})</span>}
                  </div>
                ))}
                {processingResult.errors.length > 10 && (
                  <div className="text-red-600 font-medium">
                    ... and {processingResult.errors.length - 10} more errors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {processingResult.success && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-800">
                  Processing completed successfully!
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {processingResult.inserted} students inserted, {processingResult.updated} students updated.
                {processingResult.skipped > 0 && ` ${processingResult.skipped} rows skipped due to errors.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}