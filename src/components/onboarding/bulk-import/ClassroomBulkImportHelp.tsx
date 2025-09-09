import React from 'react';
import { Info } from 'lucide-react';

export default function ClassroomBulkImportHelp() {
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-1 bg-blue-100 rounded-full">
          <Info className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-blue-800 mb-2">Bulk Import Instructions</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              You can import multiple classrooms at once using a CSV or Excel file. The file should contain the following columns:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>classroom_name</strong> (required): The name of the classroom</li>
              <li><strong>school_year</strong> (required): The school year in various formats:
                <ul className="list-disc pl-5 mt-1">
                  <li>YYYY-YYYY (e.g., 2024-2025)</li>
                  <li>YYYY-YY (e.g., 2024-25)</li>
                  <li>YYYY (e.g., 2024, will be converted to 2024-2025)</li>
                </ul>
              </li>
              <li><strong>grade</strong> (optional): The grade level for the classroom</li>
              <li><strong>classroom_teacher_id</strong> (optional): The UUID of the assigned teacher</li>
            </ul>
            <p className="mt-2">
              <strong>Important:</strong> For teacher assignments, you must use the teacher_id values from the Teachers step. These are UUIDs that will be assigned when teachers are created.
            </p>
            <p>
              If you're importing classrooms before completing the Teachers step, leave the classroom_teacher_id column empty, and you can assign teachers later.
            </p>
            <p>
              The school_id will be automatically set from the current school being onboarded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}