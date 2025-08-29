import stringSimilarity from 'string-similarity';

export interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
  similarity: number;
  matched?: boolean;
  manual?: boolean;
}

// Common variations of column names
const COLUMN_ALIASES: Record<string, string[]> = {
  'first_name': ['firstname', 'fname', 'first', 'givenname', 'given_name'],
  'last_name': ['lastname', 'lname', 'last', 'surname', 'familyname', 'family_name'],
  'email': ['emailaddress', 'mail', 'email_address', 'student_email', 'teacher_email'],
  'phone': ['phonenumber', 'telephone', 'contact', 'mobile', 'cell', 'phone_number'],
  'grade_level': ['grade', 'class', 'year', 'level', 'student_grade', 'current_grade'],
  'school_id': ['schoolid', 'school_number', 'schoolnumber', 'school_code'],
  'student_id': ['studentid', 'learnerid', 'student_number', 'student_code'],
  'teacher_id': ['teacherid', 'instructor_id', 'staff_id', 'teacher_code'],
  'dob': ['dateofbirth', 'birthdate', 'birth_date', 'date_of_birth'],
  'gender': ['sex', 'gender_identity'],
  'ethnicity': ['race', 'ethnic_group', 'ethnic_background', 'racial_group'],
  'guardian1_name': ['parent1_name', 'primary_guardian', 'guardian_name', 'parent1', 'guardian1'],
  'guardian2_name': ['parent2_name', 'secondary_guardian', 'guardian2', 'parent2'],
  'guardian1_email': ['parent1_email', 'primary_guardian_email', 'guardian1email', 'parent1email'],
  'guardian2_email': ['parent2_email', 'secondary_guardian_email', 'guardian2email', 'parent2email'],
  'guardian1_relationship': ['parent1_relationship', 'primary_guardian_relation', 'guardian1relation'],
  'guardian2_relationship': ['parent2_relationship', 'secondary_guardian_relation', 'guardian2relation'],
  'current_gpa': ['gpa', 'grade_point_average', 'current_grade_point_average'],
  'academic_status': ['status', 'enrollment_status', 'student_status'],
  'graduation_year': ['grad_year', 'expected_graduation', 'year_of_graduation'],
  'state_id': ['state_student_id', 'state_identifier', 'state_number'],
  'qualification1': ['qualification', 'degree1', 'primary_qualification'],
  'qualification2': ['degree2', 'secondary_qualification'],
  'qualification3': ['degree3', 'tertiary_qualification'],
  'certification1': ['certification', 'license1', 'primary_certification'],
  'certification2': ['license2', 'secondary_certification'],
  'certification3': ['license3', 'tertiary_certification'],
  'school_teacher_id': ['teacher_number', 'teacher_code', 'staff_number'],
  'school_student_id': ['student_number', 'student_code', 'local_id']
};

// Add specific mappings for attendance columns
const ATTENDANCE_SPECIFIC_MAPPINGS: Record<string, string> = {
  'id': 'school_student_id',
  'student id': 'school_student_id',
  'studentid': 'school_student_id',
  'result date': 'record_date',
  'date': 'record_date',
  'export date': 'record_date',
  'total days present': 'total_days_present',
  'days present': 'total_days_present',
  'present days': 'total_days_present',
  'total days possible': 'total_days_possible',
  'days possible': 'total_days_possible',
  'possible days': 'total_days_possible',
  'fy absences (total days)': 'fy_absences_total',
  'total absences': 'fy_absences_total',
  'absences total': 'fy_absences_total',
  'fy absences (excused days)': 'fy_absences_excused',
  'excused absences': 'fy_absences_excused',
  'excused': 'fy_absences_excused',
  'fy absences (unexcused days)': 'fy_absences_unexcused',
  'unexcused absences': 'fy_absences_unexcused',
  'unexcused': 'fy_absences_unexcused',
  'fy tardies (total days)': 'fy_tardies_total',
  'tardies': 'fy_tardies_total',
  'total tardies': 'fy_tardies_total',
  'daily attendance rate': 'daily_attendance_rate',
  'daily rate': 'daily_attendance_rate',
  'mp1 (daily attendance rate)': 'mp1_attendance_rate',
  'mp1 rate': 'mp1_attendance_rate',
  'mp2 (daily attendance rate)': 'mp2_attendance_rate',
  'mp2 rate': 'mp2_attendance_rate',
  'mp3 (daily attendance rate)': 'mp3_attendance_rate',
  'mp3 rate': 'mp3_attendance_rate',
  'mp4 (daily attendance rate)': 'mp4_attendance_rate',
  'mp4 rate': 'mp4_attendance_rate',
  'student': 'last_name',
  'state id': 'state_id',
  'current school': 'school_name',
  'grade': 'grade_level',
  'race': 'ethnicity',
  'gender': 'gender',
  'age (yrs)': 'age_years',
  'age (yrs, mos)': 'age_years_months',
  'zip code': 'zip_code',
  'home language': 'home_language',
  'time in district (yrs)': 'time_in_district_years',
  'time in district (yrs, mos)': 'time_in_district_years_months',
  'time in district (level)': 'time_in_district_level',
  'time in school (yrs)': 'time_in_school_years',
  'time in school (yrs, mos)': 'time_in_school_years_months',
  'ethnicity': 'ethnicity',
  'native country': 'native_country',
  '2023-24 gr 3 attendance': 'attendance_year',
  'level': 'grade_level',
  'fy tardies (excused days)': 'fy_tardies_excused',
  'fy tardies (unexcused days)': 'fy_tardies_unexcused',
  'fy virtual (days)': 'fy_virtual_days',
  'mp1 (level - scorecustomn_1)': 'mp1_level',
  'mp1 (total days present)': 'mp1_days_present',
  'mp1 (total days possible)': 'mp1_days_possible',
  'mp1 absences (total days)': 'mp1_absences_total',
  'mp1 absences (excused days)': 'mp1_absences_excused',
  'mp1 absences (unexcused days)': 'mp1_absences_unexcused',
  'mp1 tardies (total days)': 'mp1_tardies_total',
  'mp1 tardies (excused days)': 'mp1_tardies_excused',
  'mp1 tardies (unexcused days)': 'mp1_tardies_unexcused',
  'mp1 virtual (days)': 'mp1_virtual_days',
};

// Special handling for school-related fields
const SCHOOL_FIELDS = ['school_id', 'school_name', 'school_code'];

export const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/^id/, '') // Remove leading 'id'
    .replace(/id$/, ''); // Remove trailing 'id'
};

export const createColumnMap = (headers: string[]): Record<string, number> => {
  const columnMap: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    if (header) {
      const normalizedHeader = normalizeColumnName(header);
      columnMap[normalizedHeader] = index;
      
      // Add common aliases
      if (normalizedHeader.includes('student') && normalizedHeader.includes('id')) {
        columnMap['studentid'] = index;
      } else if (normalizedHeader.includes('result') && normalizedHeader.includes('date')) {
        columnMap['recorddate'] = index;
      } else if (normalizedHeader.includes('total') && normalizedHeader.includes('days') && normalizedHeader.includes('present')) {
        columnMap['totaldayspresent'] = index;
      } else if (normalizedHeader.includes('total') && normalizedHeader.includes('days') && normalizedHeader.includes('possible')) {
        columnMap['totaldayspossible'] = index;
      } else if (normalizedHeader.includes('fy') && normalizedHeader.includes('absences') && normalizedHeader.includes('total')) {
        columnMap['fyabsencestotal'] = index;
      } else if (normalizedHeader.includes('fy') && normalizedHeader.includes('absences') && normalizedHeader.includes('excused')) {
        columnMap['fyabsencesexcused'] = index;
      } else if (normalizedHeader.includes('fy') && normalizedHeader.includes('absences') && normalizedHeader.includes('unexcused')) {
        columnMap['fyabsencesunexcused'] = index;
      } else if (normalizedHeader.includes('fy') && normalizedHeader.includes('tardies') && normalizedHeader.includes('total')) {
        columnMap['fytardiestotal'] = index;
      } else if (normalizedHeader.includes('daily') && normalizedHeader.includes('attendance') && normalizedHeader.includes('rate')) {
        columnMap['dailyattendancerate'] = index;
      }
    }
  });
  
  return columnMap;
};

function checkAlias(normalizedCol: string, dbCol: string): boolean {
  const aliases = COLUMN_ALIASES[dbCol] || [];
  return aliases.some(alias => normalizeColumnName(alias) === normalizedCol);
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

    // Check for specific attendance mappings first
    const attendanceMatch = ATTENDANCE_SPECIFIC_MAPPINGS[csvCol.toLowerCase()];
    if (attendanceMatch) {
      return {
        csvColumn: csvCol,
        dbColumn: attendanceMatch,
        similarity: 1,
        matched: true,
        manual: false
      };
    }

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
      checkAlias(normalizedCsvCol, dbCol)
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
      const normalizedDbCol = normalizeColumnName(dbCol);

      // Check for common variations
      if (checkAlias(normalizedCsvCol, dbCol)) {
        return 0.9;
      }

      // Check for substring matches
      if (normalizedDbCol.includes(normalizedCsvCol) ||
          normalizedCsvCol.includes(normalizedDbCol)) {
        return 0.8;
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
  }).filter(mapping => mapping.dbColumn !== 'school_id' || !isSchoolField(mapping.csvColumn));
}