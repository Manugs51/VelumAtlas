export type ParsedSheet = {
  name: string;
  rows: string[][];
};

export type FileFormatSummary = {
  id: string;
  profileName: string;
  sourceFile: string;
  sheetName: string;
  headerRowIndex: number;
  dataStartRowIndex: number;
  createdAt: string;
};

export const canonicalFields = [
  { key: 'bookingDate', label: 'Booking Date', required: true },
  { key: 'valueDate', label: 'Value Date', required: false },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'currency', label: 'Currency', required: true },
  { key: 'reference', label: 'Reference', required: false },
  { key: 'runningBalance', label: 'Running Balance (Current Value)', required: false }
] as const;

export type CanonicalFieldKey = (typeof canonicalFields)[number]['key'];

export type ColumnMapping = Record<CanonicalFieldKey, number | null>;

export type RowPickerTarget = 'header' | 'dataStart' | null;

export type ColumnPickerTarget = CanonicalFieldKey | null;

export type CurrencyMode = 'column' | 'fixed';

export type SheetColumn = {
  index: number;
  key: string;
  label: string;
};
