import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, Edit2, Save, X, RefreshCw, CheckCircle, AlertCircle, Copy, Table } from 'lucide-react';
import Papa from 'papaparse';
import { supabaseAdmin } from '../../../lib/supabase';
import { findBestColumnMatches } from '../utils/columnMatcher';
import { generateSecurePassword } from '../utils/passwordGenerator';
import { BulkCreateResult, CsvData, ColumnMapping, AuthContextProps } from '../types';
import { ROLES, USER_FIELDS, STUDENT_FIELDS, TEACHER_FIELDS } from '../constants';

interface BulkUserCreationProps extends AuthContextProps {}

// Email validation regex
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function BulkUserCreation({ isLoading, setIsLoading, setStatus }: BulkUserCreationProps) {
  const [csvData, setCsvData] = useState<CsvData[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [editingMapping, setEditingMapping] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkCreateResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [defaultRole, setDefaultRole] = useState('');

  const getFieldsForRole = (role: string) => {
    switch (role.toLowerCase()) {
      case 'student':
        return STUDENT_FIELDS;
      case 'teacher':
        return TEACHER_FIELDS;
      default:
        return USER_FIELDS;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(null);
    setBulkResults([]);
    setShowColumnMapping(false);
    setShowPreview(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const csvColumns = Object.keys(results.data[0]);
        const fields = defaultRole ? getFieldsForRole(defaultRole) : USER_FIELDS;
        const expectedColumns = fields.map(field => field.name);
        
        const mappings = findBestColumnMatches(csvColumns, expectedColumns);
        setColumnMappings(mappings);
        setCsvData(results.data as CsvData[]);
        setShowColumnMapping(true);
      },
      error: (error) => {
        setStatus({
          type: 'error',
          message: `Error parsing CSV: ${error.message}`
        });
      }
    });
  };

  const handleEditMapping = (index: number) => {
    setEditingMapping(index);
    setEditValue(columnMappings[index].dbColumn);
  };

  const handleSaveMapping = (index: number) => {
    const fields = defaultRole ? getFieldsForRole(defaultRole) : [...USER_FIELDS, ...STUDENT_FIELDS, ...TEACHER_FIELDS];
    const validColumns = fields.map(field => field.name);
    
    if (!validColumns.includes(editValue)) {
      setStatus({
        type: 'error',
        message: 'Invalid column mapping'
      });
      return;
    }

    setColumnMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, dbColumn: editValue } : mapping
    ));
    setEditingMapping(null);
    setEditValue('');
  };

  const handleDeleteMapping = (index: number) => {
    setColumnMappings(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopyPassword = async (password: string, index: number) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleShowPreview = () => {
    const fields = defaultRole ? getFieldsForRole(defaultRole) : USER_FIELDS;
    const requiredFields = fields.filter(f => f.required).map(f => f.name);
    
    const missingFields = requiredFields.filter(field => 
      !columnMappings.some(m => m.dbColumn === field)
    );

    if (missingFields.length > 0) {
      setStatus({
        type: 'error',
        message: `Required fields must be mapped: ${missingFields.join(', ')}`
      });
      return;
    }

    setShowPreview(true);
  };

  const validateEmail = (email: string | null | undefined): string | null => {
    if (!email || email.trim() === '') return null;
    return EMAIL_REGEX.test(email) ? email : null;
  };

  const downloadCredentialsCSV = (results: BulkCreateResult[]) => {
    // Create CSV content
    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Password', 'Status'],
      ...results.map(result => [
        result.email,
        previewData.find(row => row.email === result.email)?.first_name || '',
        previewData.find(row => row.email === result.email)?.last_name || '',
        result.password || '(User already exists)',
        result.success ? 'Success' : `Failed: ${result.error}`
      ])
    ].map(row => row.join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkCreate = async () => {
    if (!csvData.length || !columnMappings.length) return;

    setIsLoading(true);
    setStatus(null);
    setBulkResults([]);
    setShowPreview(false);

    const creationResults: BulkCreateResult[] = [];

    for (const row of csvData) {
      try {
        // Initialize user data with mapped fields
        const userData: Record<string, any> = {
          role: defaultRole
        };

        // Map all available fields
        columnMappings.forEach(mapping => {
          userData[mapping.dbColumn] = row[mapping.csvColumn];
        });

        // Validate required fields
        const fields = defaultRole ? getFieldsForRole(defaultRole) : USER_FIELDS;
        const missingRequired = fields
          .filter(f => f.required)
          .filter(f => !userData[f.name]);

        if (missingRequired.length > 0) {
          creationResults.push({
            email: userData.email || 'Invalid Email',
            success: false,
            error: `Missing required fields: ${missingRequired.map(f => f.name).join(', ')}`
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .limit(1);

        if (existingUser?.length) {
          creationResults.push({
            email: userData.email,
            success: true,
            userId: existingUser[0].id,
            password: '(User already exists)',
            isExisting: true
          });
          continue;
        }

        // Create auth user
        const password = generateSecurePassword();
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: userData.role || defaultRole,
            first_name: userData.first_name,
            last_name: userData.last_name
          }
        });

        if (authError) throw authError;

        // Insert into users table
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user?.id,
            email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            street_address: userData.street_address,
            city: userData.city,
            state: userData.state,
            zip: userData.zip,
            country: userData.country,
            user_type: (userData.role || defaultRole).toLowerCase()
          });

        if (userError) throw userError;

        // Insert into role-specific table
        const role = userData.role || defaultRole;
        if (role === 'Student') {
          // Validate guardian emails before insertion
          const guardian1Email = validateEmail(userData.guardian1_email);
          const guardian2Email = validateEmail(userData.guardian2_email);

          if (userData.guardian1_email && !guardian1Email) {
            throw new Error(`Invalid guardian1 email format: ${userData.guardian1_email}`);
          }

          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
              student_id: authData.user?.id,
              school_student_id: userData.school_student_id,
              state_id: userData.state_id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              dob: userData.dob,
              gender: userData.gender,
              ethnicity: userData.ethnicity,
              grade_level: userData.grade_level,
              graduation_year: userData.graduation_year,
              enrollment_date: userData.enrollment_date,
              guardian1_name: userData.guardian1_name,
              guardian1_email: guardian1Email,
              guardian1_relationship: userData.guardian1_relationship,
              guardian2_name: userData.guardian2_name,
              guardian2_email: guardian2Email,
              guardian2_relationship: userData.guardian2_relationship,
              current_gpa: userData.current_gpa,
              academic_status: userData.academic_status,
              school_id: userData.school_id
            });
          if (studentError) throw studentError;
        } else if (role === 'Teacher') {
          const { error: teacherError } = await supabaseAdmin
            .from('teachers')
            .insert({
              teacher_id: authData.user?.id,
              school_teacher_id: userData.school_teacher_id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              dob: userData.dob,
              qualification1: userData.qualification1,
              qualification2: userData.qualification2,
              qualification3: userData.qualification3,
              certification1: userData.certification1,
              certification2: userData.certification2,
              certification3: userData.certification3,
              misc: userData.misc
            });
          if (teacherError) throw teacherError;
        }

        creationResults.push({
          email: userData.email,
          success: true,
          userId: authData.user?.id,
          password: password
        });
      } catch (error: any) {
        if (error.message?.includes('User already registered')) {
          const email = row[columnMappings.find(m => m.dbColumn === 'email')?.csvColumn || ''];
          creationResults.push({
            email: email,
            success: true,
            password: '(User already exists)',
            isExisting: true
          });
        } else {
          creationResults.push({
            email: row[columnMappings.find(m => m.dbColumn === 'email')?.csvColumn || ''] || 'Unknown',
            success: false,
            error: error.message
          });
        }
      }
    }

    setBulkResults(creationResults);
    
    const successful = creationResults.filter(r => r.success).length;
    const failed = creationResults.filter(r => !r.success).length;
    const existing = creationResults.filter(r => r.isExisting).length;
    
    setStatus({
      type: successful > 0 ? 'success' : 'error',
      message: `Bulk creation completed: ${successful - existing} users created, ${existing} already existed, ${failed} failed`,
      details: failed > 0 ? creationResults
        .filter(r => !r.success)
        .map(r => `${r.email}: ${r.error}`) : undefined
    });

    // Download credentials CSV
    downloadCredentialsCSV(creationResults);

    setIsLoading(false);
    setShowColumnMapping(false);
  };

  // Transform CSV data for preview
  const previewData = React.useMemo(() => {
    if (!csvData.length || !columnMappings.length) return [];
    return csvData.slice(0, 5).map(row => {
      const mappedRow: { [key: string]: string } = {};
      columnMappings.forEach(mapping => {
        mappedRow[mapping.dbColumn] = row[mapping.csvColumn] || '';
      });
      if (!mappedRow['role'] && defaultRole) {
        mappedRow['role'] = defaultRole;
      }
      return mappedRow;
    });
  }, [csvData, columnMappings, defaultRole]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">Bulk Create Users</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">CSV Format</h4>
          <p className="text-sm text-gray-600 mb-2">Available fields:</p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {defaultRole ? 
              getFieldsForRole(defaultRole).map(field => (
                <li key={field.name} className={field.required ? 'font-medium' : ''}>
                  {field.name} {field.required && '(required)'}
                </li>
              )) :
              [...USER_FIELDS, ...STUDENT_FIELDS, ...TEACHER_FIELDS]
                .filter((field, index, self) => 
                  index === self.findIndex(f => f.name === field.name)
                )
                .map(field => (
                  <li key={field.name} className={field.required ? 'font-medium' : ''}>
                    {field.name} {field.required && '(required)'}
                  </li>
                ))
            }
          </ul>
        </div>

        {/* Default Role Selection */}
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Role
          </label>
          <select
            value={defaultRole}
            onChange={(e) => setDefaultRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a default role...</option>
            {ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <span>Upload CSV file</span>
                <input
                  type="file"
                  className="sr-only"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">CSV files only</p>
          </div>
        </div>
      </div>

      {/* Column Mapping */}
      {showColumnMapping && (
        <div className="mt-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Column Mapping
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  Please verify the column mappings below. Required fields are marked with an asterisk (*).
                </p>
              </div>
              <div className="mt-5 space-y-4">
                {columnMappings.map((mapping, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">{mapping.csvColumn}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      {editingMapping === index ? (
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1"
                        >
                          {(defaultRole ? getFieldsForRole(defaultRole) : [...USER_FIELDS, ...STUDENT_FIELDS, ...TEACHER_FIELDS])
                            .filter((field, index, self) => 
                              index === self.findIndex(f => f.name === field.name)
                            )
                            .map(field => (
                              <option key={field.name} value={field.name}>
                                {field.name} {field.required && '*'}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {mapping.dbColumn}
                          {(defaultRole ? 
                            getFieldsForRole(defaultRole) : 
                            [...USER_FIELDS, ...STUDENT_FIELDS, ...TEACHER_FIELDS]
                          ).find(f => f.name === mapping.dbColumn)?.required && ' *'}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        ({Math.round(mapping.similarity * 100)}% match)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingMapping === index ? (
                        <>
                          <button
                            onClick={() => handleSaveMapping(index)}
                            className="p-1 text-green-600 hover:text-green-800"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingMapping(null)}
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
                            onClick={() => handleDeleteMapping(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex gap-4">
                  <button
                    onClick={handleShowPreview}
                    disabled={isLoading || columnMappings.length === 0}
                    className="flex-1 flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Table className="h-4 w-4" />
                    Preview Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Preview */}
      {showPreview && (
        <div className="mt-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Data Preview
                </h3>
                <span className="text-sm text-gray-500">
                  {previewData.length} rows shown
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columnMappings.map((mapping, index) => (
                        <th
                          key={index}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {mapping.dbColumn}
                          {(defaultRole ? 
                            getFieldsForRole(defaultRole) : 
                            [...USER_FIELDS, ...STUDENT_FIELDS, ...TEACHER_FIELDS]
                          ).find(f => f.name === mapping.dbColumn)?.required && ' *'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {columnMappings.map((mapping, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {row[mapping.dbColumn] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <button
                  onClick={handleBulkCreate}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Confirm and Create Users
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Creation Results */}
      {bulkResults.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Creation Results</h3>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {bulkResults.map((result, index) => (
                <li key={index} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{result.email}</p>
                        {result.success ? (
                          result.isExisting ? (
                            <p className="text-sm text-gray-500">User already exists</p>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-500">Password: {result.password}</p>
                              <button
                                onClick={() => result.password && handleCopyPassword(result.password, index)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              {copiedIndex === index && (
                                <span className="text-xs text-green-600">Copied!</span>
                              )}
                            </div>
                          )
                        ) : (
                          <p className="text-sm text-red-500">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}