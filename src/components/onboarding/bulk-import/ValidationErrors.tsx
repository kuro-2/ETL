import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

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

interface ValidationErrorsProps {
  errors: ValidationError[];
  errorSections: ErrorSection[];
  onClearErrors: () => void;
  onToggleSection: (index: number) => void;
}

export default function ValidationErrors({
  errors,
  errorSections,
  onClearErrors,
  onToggleSection
}: ValidationErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-4 bg-red-50 p-4 rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h4 className="font-medium text-red-800">
            Found {errors.length} validation {errors.length === 1 ? 'error' : 'errors'}
          </h4>
        </div>
        <button
          onClick={onClearErrors}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Clear All
        </button>
      </div>
      
      {errorSections.map((section, index) => (
        <div key={section.type} className="border-t border-red-200 pt-4 first:border-t-0 first:pt-0">
          <button
            onClick={() => onToggleSection(index)}
            className="flex items-center justify-between w-full text-left"
          >
            <h5 className="text-sm font-medium text-red-800">
              {section.title} ({section.errors.length})
            </h5>
            <ChevronDown className={cn(
              "h-5 w-5 text-red-500 transition-transform",
              section.isOpen && "transform rotate-180"
            )} />
          </button>
          
          {section.isOpen && (
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {section.errors.map((error, errorIndex) => (
                <li key={errorIndex} className="text-sm text-red-700">
                  {error.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}