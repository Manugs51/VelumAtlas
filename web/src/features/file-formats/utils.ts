import * as XLSX from 'xlsx';
import type { ParsedSheet, SheetColumn } from '@/features/file-formats/types';

export function toText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function toColumnLabel(index: number): string {
  let current = index + 1;
  let label = '';
  while (current > 0) {
    const rem = (current - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

export function buildColumns(rows: string[][], headerRowIndex: number | null): SheetColumn[] {
  const columnCount = rows.reduce((acc, row) => Math.max(acc, row.length), 0);
  const headerRow = headerRowIndex === null ? [] : (rows[headerRowIndex] ?? []);

  return Array.from({ length: columnCount }, (_, index) => {
    const headerValue = headerRow[index];
    const label = headerValue && headerValue.length > 0 ? headerValue : `Column ${toColumnLabel(index)}`;
    return {
      index,
      key: toColumnLabel(index),
      label
    };
  });
}

export function createEmptyColumnMapping() {
  return {
    bookingDate: null,
    valueDate: null,
    description: null,
    amount: null,
    currency: null,
    reference: null,
    runningBalance: null
  };
}

export function getCanonicalFieldLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    bookingDate: 'Booking Date',
    valueDate: 'Value Date',
    description: 'Description',
    amount: 'Amount',
    currency: 'Currency',
    reference: 'Reference',
    runningBalance: 'Running Balance (Current Value)'
  };
  return labels[fieldKey] ?? fieldKey;
}

export async function readWorkbook(file: File): Promise<ParsedSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: ''
    });

    return {
      name: sheetName,
      rows: data.map((row) => row.map(toText))
    };
  });
}
