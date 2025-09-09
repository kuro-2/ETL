import stringSimilarity from 'string-similarity';

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  similarity: number;
  matched?: boolean;
  manual?: boolean;
}

// Enhanced column aliases with LinkIt specific mappings and CSV field variations
const COLUMN_ALIASES: Record<string, string[]> = {
  'first_name': ['firstname', 'fname', 'first', 'givenname', 'given_name', 'first name'],
  'last_name': ['lastname', 'lname', 'last', 'surname', 'familyname', 'family_name', 'last name'],
  'email': ['emailaddress', 'mail', 'email_address', 'student_email', 'teacher_email', 'student email', 'studentemail'],
  'phone': ['phonenumber', 'telephone', 'contact', 'mobile', 'cell', 'phone_number'],
  'grade_level': ['grade', 'class', 'year', 'level', 'student_grade', 'current_grade'],
  'school_id': ['schoolid', 'school_number', 'schoolnumber', 'school_code', 'current school'],
  'school_student_id': ['studentid', 'learnerid', 'student_number', 'student_code', 'id', 'student id', 'student'],
  'teacher_id': ['teacherid', 'instructor_id', 'staff_id', 'teacher_code'],
  'dob': ['dateofbirth', 'birthdate', 'birth_date', 'date_of_birth'],
  'gender': ['sex', 'gender_identity'],
  'ethnicity': ['race', 'ethnic_group', 'ethnic_background', 'racial_group'],
  'street_address': ['address', 'address 1', 'address1', 'street_address', 'home_address', 'street'],
  'city': ['town', 'locality'],
  'zip': ['zipcode', 'postal_code', 'postcode'],
  'guardian1_name': ['parent1_name', 'primary_guardian', 'guardian_name', 'parent1', 'guardian1'],
  'guardian2_name': ['parent2_name', 'secondary_guardian', 'guardian2', 'parent2'],
  'guardian1_email': ['parent1_email', 'primary_guardian_email', 'guardian1email', 'parent1email', 'guardian 1 email address', 'guardian1 email address'],
  'guardian2_email': ['parent2_email', 'secondary_guardian_email', 'guardian2email', 'parent2email', 'guardian 2 email address', 'guardian2 email address'],
  'guardian1_relationship': ['parent1_relationship', 'primary_guardian_relation', 'guardian1relation'],
  'guardian2_relationship': ['parent2_relationship', 'secondary_guardian_relation', 'guardian2relation'],
  'current_gpa': ['gpa', 'grade_point_average', 'current_grade_point_average'],
  'academic_status': ['status', 'enrollment_status', 'student_status', 'enrollment'],
  'graduation_year': ['grad_year', 'expected_graduation', 'year_of_graduation'],
  'state_id': ['state_student_id', 'state_identifier', 'state_number'],
  'qualification1': ['qualification', 'degree1', 'primary_qualification'],
  'qualification2': ['degree2', 'secondary_qualification'],
  'qualification3': ['degree3', 'tertiary_qualification'],
  'certification1': ['certification', 'license1', 'primary_certification'],
  'certification2': ['license2', 'secondary_certification'],
  'certification3': ['license3', 'tertiary_certification'],
  'school_teacher_id': ['teacher_number', 'teacher_code', 'staff_number'],
  'record_date': ['result date', 'date', 'export date', 'record_date', 'result_date'],
  'total_days_present': ['total days present', 'days present', 'present days', 'days_present'],
  'total_days_possible': ['total days possible', 'days possible', 'possible days', 'days_possible'],
  'fy_absences_total': ['fy absences (total days)', 'total absences', 'absences total', 'absences_total'],
  'fy_absences_excused': ['fy absences (excused days)', 'excused absences', 'absences_excused'],
  'fy_absences_unexcused': ['fy absences (unexcused days)', 'unexcused absences', 'absences_unexcused'],
  'fy_tardies_total': ['fy tardies (total days)', 'total tardies', 'tardies', 'tardies_total'],
  'daily_attendance_rate': ['daily attendance rate', 'daily rate', 'attendance_rate'],
  'mp1_attendance_rate': ['mp1 (daily attendance rate)', 'mp1 attendance rate', 'mp1 rate'],
  'mp2_attendance_rate': ['mp2 (daily attendance rate)', 'mp2 attendance rate', 'mp2 rate'],
  'mp3_attendance_rate': ['mp3 (daily attendance rate)', 'mp3 attendance rate', 'mp3 rate'],
  'mp4_attendance_rate': ['mp4 (daily attendance rate)', 'mp4 attendance rate', 'mp4 rate']
};


// Special handling for school-related fields
const SCHOOL_FIELDS = ['school_id', 'school_name', 'school_code'];

export const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

export const createColumnMap = (headers: string[]): Record<string, number> => {
  const columnMap: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    if (header) {
      const normalizedHeader = String(header).toLowerCase().trim();
      columnMap[normalizedHeader] = index;
      // Also add normalized version
      columnMap[normalizeColumnName(header)] = index;
    }
  });
  
  return columnMap;
};

function checkAlias(normalizedCol: string, dbCol: string): boolean {
  const aliases = COLUMN_ALIASES[dbCol] || [];
  return aliases.some(alias => {
    const normalizedAlias = normalizeColumnName(alias);
    const lowerAlias = alias.toLowerCase().trim();
    return normalizedAlias === normalizedCol || 
           lowerAlias === normalizedCol ||
           // Also check original column name against aliases
           normalizedCol.includes(normalizedAlias) ||
           normalizedAlias.includes(normalizedCol);
  });
}

function isSchoolField(field: string): boolean {
  return SCHOOL_FIELDS.includes(field) ||
         field.toLowerCase().includes('school') ||
         field.toLowerCase().includes('campus');
}

export function findBestColumnMatches(
  csvColumns: string[],
  dbColumns: string[],
  threshold = 0.4
): ColumnMapping[] {
  const normalizedCsvColumns = csvColumns.map(normalizeColumnName);
  const normalizedDbColumns = dbColumns.map(normalizeColumnName);

  return csvColumns.map((csvCol, index): ColumnMapping => {
    const normalizedCsvCol = normalizedCsvColumns[index];

    // Skip school-related fields as they'll be handled automatically
    if (isSchoolField(csvCol)) {
      return {
        csvColumn: csvCol,
        dbColumn: 'school_id',
        similarity: 1,
        matched: true,
        manual: false
      };
    }

    // Try exact match first
    const exactMatchIndex = dbColumns.findIndex(dbCol =>
      normalizeColumnName(dbCol) === normalizedCsvCol ||
      checkAlias(normalizedCsvCol, dbCol) ||
      checkAlias(csvCol.toLowerCase().trim(), dbCol)
    );

    if (exactMatchIndex !== -1) {
      return {
        csvColumn: csvCol,
        dbColumn: dbColumns[exactMatchIndex],
        similarity: 1,
        matched: true,
        manual: false
      };
    }

    // Calculate similarities for fuzzy matching
    const similarities = dbColumns.map(dbCol => {
      const normalizedDbCol = normalizedDbColumns[dbColumns.indexOf(dbCol)];

      // Check for common variations
      if (checkAlias(normalizedCsvCol, dbCol)) {
        return 0.9;
      }

      // Check for substring matches
      const csvLower = csvCol.toLowerCase().trim();
      const dbLower = dbCol.toLowerCase().trim();
      
      if (normalizedDbCol.includes(normalizedCsvCol) ||
          normalizedCsvCol.includes(normalizedDbCol) ||
          csvLower.includes(dbLower) ||
          dbLower.includes(csvLower)) {
        return 0.85;
      }

      // Check for word matches
      const csvWords = normalizedCsvCol.split(/[^a-z0-9]+/);
      const dbWords = normalizedDbCol.split(/[^a-z0-9]+/);
      const wordMatch = csvWords.some(word =>
        dbWords.some(dbWord => dbWord === word)
      );
      if (wordMatch) {
        return 0.7;
      }

      // Use string similarity for remaining cases
      return stringSimilarity.compareTwoStrings(normalizedCsvCol, normalizedDbCol);
    });

    const bestMatchIndex = similarities.reduce(
      (maxIndex, similarity, currentIndex) =>
        similarity > similarities[maxIndex] ? currentIndex : maxIndex,
      0
    );

    return {
      csvColumn: csvCol,
      dbColumn: dbColumns[bestMatchIndex],
      similarity: similarities[bestMatchIndex],
      matched: similarities[bestMatchIndex] >= threshold,
      manual: false
    };
  });
}