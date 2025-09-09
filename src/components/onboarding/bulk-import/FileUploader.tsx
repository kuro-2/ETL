import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface FileUploaderProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => void;
  description: string;
  multiple?: boolean;
}

export default function FileUploader({ onFileUpload, description, multiple = false }: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFileUpload(e);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileUpload(event);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-medium text-gray-900">Bulk Import</h3>
        </div>
      </div>

      <p className="text-sm text-gray-500">{description}</p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md",
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-500",
          "transition-colors duration-200"
        )}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
              <span>{multiple ? 'Upload files' : 'Upload a file'}</span>
              <input
                type="file"
                className="sr-only"
                accept=".csv,.xlsx,.xls"
                multiple={multiple}
                onChange={handleFileChange}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">CSV or Excel files only</p>
        </div>
      </div>
    </div>
  );
}