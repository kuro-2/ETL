import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { StatusMessage as StatusMessageType } from '../types';

interface StatusMessageProps {
  status: StatusMessageType;
}

export function StatusMessage({ status }: StatusMessageProps) {
  return (
    <div className={`mt-6 p-4 rounded-md ${
      status.type === 'success' ? 'bg-green-50' : 'bg-red-50'
    }`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {status.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
        </div>
        <div className="ml-3">
          <p className={`text-sm ${
            status.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {status.message}
          </p>
          {status.details && status.details.length > 0 && (
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
              {status.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}