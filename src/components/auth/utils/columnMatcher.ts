import stringSimilarity from 'string-similarity';
import { ColumnMapping } from '../types';

export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
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
    const similarities = normalizedDbColumns.map(dbCol => 
      stringSimilarity.compareTwoStrings(normalizedCsvCol, dbCol)
    );

    const bestMatchIndex = similarities.reduce(
      (maxIndex, similarity, currentIndex) =>
        similarity > similarities[maxIndex] ? currentIndex : maxIndex,
      0
    );

    return {
      csvColumn: csvCol,
      dbColumn: dbColumns[bestMatchIndex],
      similarity: similarities[bestMatchIndex]
    };
  }).filter(mapping => mapping.similarity >= threshold);
}