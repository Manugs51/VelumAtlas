import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const canonicalFields = [
  { key: 'bookingDate', label: 'Booking Date' },
  { key: 'valueDate', label: 'Value Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'reference', label: 'Reference' },
  { key: 'balance', label: 'Balance (Optional)' }
] as const;

type CanonicalFieldKey = (typeof canonicalFields)[number]['key'];
type ColumnMapping = Record<CanonicalFieldKey, number | null>;

type ParsedSheet = {
  name: string;
  rows: string[][];
};

const emptyMapping: ColumnMapping = {
  bookingDate: null,
  valueDate: null,
  description: null,
  amount: null,
  currency: null,
  reference: null,
  balance: null
};

function toText(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function toColumnLabel(index: number): string {
  let current = index + 1;
  let label = '';
  while (current > 0) {
    const rem = (current - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

async function readWorkbook(file: File): Promise<ParsedSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: ''
    });

    const rows = data.map((row) => row.map(toText));
    return { name: sheetName, rows };
  });
}

function App() {
  const [profileName, setProfileName] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [dataStartRowIndex, setDataStartRowIndex] = useState(1);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [status, setStatus] = useState('Upload a file to start.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSheet = sheets[sheetIndex];
  const rows = activeSheet?.rows ?? [];

  const columnCount = useMemo(() => {
    return rows.reduce((acc, row) => Math.max(acc, row.length), 0);
  }, [rows]);

  const columns = useMemo(() => {
    const headerRow = rows[headerRowIndex] ?? [];
    return Array.from({ length: columnCount }, (_, index) => {
      const label = headerRow[index] || `Column ${toColumnLabel(index)}`;
      return {
        index,
        key: toColumnLabel(index),
        label
      };
    });
  }, [rows, headerRowIndex, columnCount]);

  const previewRows = useMemo(() => {
    return rows.slice(dataStartRowIndex, dataStartRowIndex + 12);
  }, [rows, dataStartRowIndex]);

  useEffect(() => {
    if (!rows.length) return;
    if (headerRowIndex >= rows.length) setHeaderRowIndex(0);
    if (dataStartRowIndex >= rows.length) setDataStartRowIndex(Math.min(1, rows.length - 1));
  }, [rows, headerRowIndex, dataStartRowIndex]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await readWorkbook(file);
      if (!parsed.length) {
        setStatus('No sheets detected in this file.');
        return;
      }

      setSheets(parsed);
      setSheetIndex(0);
      setHeaderRowIndex(0);
      setDataStartRowIndex(1);
      setMapping(emptyMapping);
      setFileName(file.name);
      setStatus(`Loaded ${parsed.length} sheet(s) from ${file.name}.`);
    } catch {
      setStatus('Failed to parse file. Try CSV, XLS, or XLSX.');
    }
  }

  function handleMappingChange(field: CanonicalFieldKey, value: string) {
    setMapping((current) => ({
      ...current,
      [field]: value === '' ? null : Number(value)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSheet) {
      setStatus('Upload a file before submitting.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      profileName: profileName || 'Untitled profile',
      sourceFile: fileName,
      sheetName: activeSheet.name,
      headerRowIndex,
      dataStartRowIndex,
      mapping,
      sampleRows: previewRows
    };

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/v1/import-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('API returned a non-2xx response');
      }

      setStatus('Profile submitted successfully.');
    } catch {
      setStatus('API not available yet. Payload prepared correctly for future backend endpoint.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f7f2] via-[#fdfcf8] to-[#eef6f7] py-10">
      <div className="container mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <p className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Import Profile Builder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Define Bank/Broker File Format</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Upload a statement file, choose which row starts the data, and map columns to canonical fields.
          </p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>1. File Setup</CardTitle>
              <CardDescription>Upload CSV/XLS/XLSX and choose sheet/header/data rows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Example: Santander Checking CSV"
                />
              </div>

              <div className="md:col-span-2 grid gap-2">
                <Label htmlFor="statement-file">Statement File</Label>
                <Input id="statement-file" type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
                <p className="text-xs text-muted-foreground">{fileName || 'No file selected'}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sheet">Sheet</Label>
                <Select
                  id="sheet"
                  value={String(sheetIndex)}
                  onChange={(event) => {
                    setSheetIndex(Number(event.target.value));
                    setHeaderRowIndex(0);
                    setDataStartRowIndex(1);
                    setMapping(emptyMapping);
                  }}
                  disabled={!sheets.length}
                >
                  {sheets.map((sheet, index) => (
                    <option key={sheet.name} value={index}>
                      {sheet.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="header-row">Header Row (0-based)</Label>
                <Input
                  id="header-row"
                  type="number"
                  min={0}
                  max={Math.max(rows.length - 1, 0)}
                  value={headerRowIndex}
                  onChange={(event) => setHeaderRowIndex(Math.max(0, Number(event.target.value) || 0))}
                  disabled={!rows.length}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="data-start">Data Start Row (0-based)</Label>
                <Input
                  id="data-start"
                  type="number"
                  min={0}
                  max={Math.max(rows.length - 1, 0)}
                  value={dataStartRowIndex}
                  onChange={(event) => setDataStartRowIndex(Math.max(0, Number(event.target.value) || 0))}
                  disabled={!rows.length}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Column Mapping</CardTitle>
              <CardDescription>Map your file columns to the canonical transaction fields.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {canonicalFields.map((field) => (
                <div className="grid gap-2" key={field.key}>
                  <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
                  <Select
                    id={`map-${field.key}`}
                    value={mapping[field.key] === null ? '' : String(mapping[field.key])}
                    onChange={(event) => handleMappingChange(field.key, event.target.value)}
                    disabled={!columns.length}
                  >
                    <option value="">Unmapped</option>
                    {columns.map((column) => (
                      <option key={column.key} value={column.index}>
                        {column.key} - {column.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Data Preview</CardTitle>
              <CardDescription>Preview starts from the selected data row.</CardDescription>
            </CardHeader>
            <CardContent>
              {previewRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Row #</TableHead>
                      {columns.map((column) => (
                        <TableHead key={column.key}>{column.key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIndex) => (
                      <TableRow key={`${dataStartRowIndex + rowIndex}`}>
                        <TableCell className="font-medium">{dataStartRowIndex + rowIndex}</TableCell>
                        {columns.map((column) => (
                          <TableCell key={`${dataStartRowIndex + rowIndex}-${column.key}`}>{row[column.index] || ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No rows to preview yet.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{status}</p>
            <Button type="submit" disabled={isSubmitting || !rows.length}>
              {isSubmitting ? 'Submitting...' : 'Save Import Profile'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default App;
