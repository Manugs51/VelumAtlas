import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type ParsedSheet = {
  name: string;
  rows: string[][];
};

type FileFormatSummary = {
  id: string;
  profileName: string;
  sourceFile: string;
  sheetName: string;
  headerRowIndex: number;
  dataStartRowIndex: number;
  createdAt: string;
};

type RowPickerTarget = 'header' | 'dataStart' | null;

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

    return {
      name: sheetName,
      rows: data.map((row) => row.map(toText))
    };
  });
}

export function FileFormatsPage() {
  const [formats, setFormats] = useState<FileFormatSummary[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [dataStartRowIndex, setDataStartRowIndex] = useState(1);
  const [status, setStatus] = useState('No file loaded yet.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowPickerTarget, setRowPickerTarget] = useState<RowPickerTarget>(null);
  const [rowPickerSelection, setRowPickerSelection] = useState<number | null>(null);

  const activeSheet = sheets[sheetIndex];
  const rows = activeSheet?.rows ?? [];

  const columnCount = useMemo(() => rows.reduce((acc, row) => Math.max(acc, row.length), 0), [rows]);

  const columns = useMemo(() => {
    const headerRow = rows[headerRowIndex] ?? [];
    return Array.from({ length: columnCount }, (_, index) => {
      const value = headerRow[index];
      const label = value && value.length ? value : `Column ${toColumnLabel(index)}`;
      return { index, key: toColumnLabel(index), label };
    });
  }, [rows, headerRowIndex, columnCount]);

  const previewRows = useMemo(() => rows.slice(dataStartRowIndex, dataStartRowIndex + 12), [rows, dataStartRowIndex]);
  const pickerRows = useMemo(() => rows.slice(0, 40), [rows]);

  useEffect(() => {
    if (!rows.length) return;
    if (headerRowIndex >= rows.length) setHeaderRowIndex(0);
    if (dataStartRowIndex >= rows.length) setDataStartRowIndex(Math.max(0, rows.length - 1));
  }, [rows, headerRowIndex, dataStartRowIndex]);

  function resetCreateState() {
    setProfileName('');
    setFileName('');
    setSheets([]);
    setSheetIndex(0);
    setHeaderRowIndex(0);
    setDataStartRowIndex(1);
    setStatus('No file loaded yet.');
    setRowPickerTarget(null);
    setRowPickerSelection(null);
  }

  function openCreateModal() {
    resetCreateState();
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    resetCreateState();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await readWorkbook(file);
      if (!parsed.length) {
        setStatus('File read failed: no sheets found.');
        return;
      }

      setSheets(parsed);
      setSheetIndex(0);
      setHeaderRowIndex(0);
      setDataStartRowIndex(1);
      setFileName(file.name);
      setStatus(`Loaded ${parsed.length} sheet(s) from ${file.name}.`);
    } catch {
      setStatus('Could not parse file. Please use CSV, XLS, or XLSX.');
    }
  }

  function openRowPicker(target: Exclude<RowPickerTarget, null>) {
    setRowPickerTarget(target);
    setRowPickerSelection(target === 'header' ? headerRowIndex : dataStartRowIndex);
  }

  function closeRowPicker() {
    setRowPickerTarget(null);
    setRowPickerSelection(null);
  }

  function confirmRowPickerSelection() {
    if (rowPickerSelection === null) return;
    if (rowPickerTarget === 'header') setHeaderRowIndex(rowPickerSelection);
    if (rowPickerTarget === 'dataStart') setDataStartRowIndex(rowPickerSelection);
    closeRowPicker();
  }

  function renderRowPickerActions() {
    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Selected row: {rowPickerSelection === null ? 'none' : rowPickerSelection}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={closeRowPicker}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmRowPickerSelection} disabled={rowPickerSelection === null}>
            Confirm Row
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSheet) {
      setStatus('Please upload a file first.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      profileName: profileName || 'Untitled profile',
      sourceFile: fileName,
      sheetName: activeSheet.name,
      headerRowIndex,
      dataStartRowIndex,
      sampleRows: previewRows
    };

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/v1/import-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Request failed');
    } catch {
      setStatus('API endpoint is not ready yet. Profile kept locally for preview.');
    }

    const created: FileFormatSummary = {
      id: crypto.randomUUID(),
      profileName: payload.profileName,
      sourceFile: payload.sourceFile,
      sheetName: payload.sheetName,
      headerRowIndex: payload.headerRowIndex,
      dataStartRowIndex: payload.dataStartRowIndex,
      createdAt: new Date().toISOString()
    };

    setFormats((current) => [created, ...current]);
    setIsSubmitting(false);
    closeCreateModal();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8f7f2] via-[#fdfcf8] to-[#eef6f7] py-10">
      <div className="container mx-auto max-w-6xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Import Profiles
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">File Formats</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Define reusable bank or broker statement formats before importing transactions.
            </p>
          </div>
          <Button onClick={openCreateModal}>Create New File Format</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Existing Formats</CardTitle>
            <CardDescription>Saved format definitions for statement imports.</CardDescription>
          </CardHeader>
          <CardContent>
            {formats.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Sheet</TableHead>
                    <TableHead>Header Row</TableHead>
                    <TableHead>Data Start</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formats.map((format) => (
                    <TableRow key={format.id}>
                      <TableCell className="font-medium">{format.profileName}</TableCell>
                      <TableCell>{format.sourceFile}</TableCell>
                      <TableCell>{format.sheetName}</TableCell>
                      <TableCell>{format.headerRowIndex}</TableCell>
                      <TableCell>{format.dataStartRowIndex}</TableCell>
                      <TableCell>{new Date(format.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No file formats yet. Create the first one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={isCreateOpen}
        title="Create New File Format"
        description="Start with profile name and file upload. Once read, choose sheet and row positions."
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 grid gap-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Example: BBVA Checking XLS"
              />
            </div>

            <div className="md:col-span-2 grid gap-2">
              <Label htmlFor="statement-file">Statement File</Label>
              <Input id="statement-file" type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">{fileName || 'No file selected'}</p>
            </div>

            {sheets.length ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="sheet-select">Sheet</Label>
                  <Select
                    id="sheet-select"
                    value={String(sheetIndex)}
                    onChange={(event) => {
                      setSheetIndex(Number(event.target.value));
                      setHeaderRowIndex(0);
                      setDataStartRowIndex(1);
                    }}
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
                  <div className="flex gap-2">
                    <Input
                      id="header-row"
                      type="number"
                      min={0}
                      max={Math.max(0, rows.length - 1)}
                      value={headerRowIndex}
                      onChange={(event) => setHeaderRowIndex(Math.max(0, Number(event.target.value) || 0))}
                    />
                    <Button type="button" variant="outline" onClick={() => openRowPicker('header')}>
                      Choose Row
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="data-start-row">Data Start Row (0-based)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="data-start-row"
                      type="number"
                      min={0}
                      max={Math.max(0, rows.length - 1)}
                      value={dataStartRowIndex}
                      onChange={(event) => setDataStartRowIndex(Math.max(0, Number(event.target.value) || 0))}
                    />
                    <Button type="button" variant="outline" onClick={() => openRowPicker('dataStart')}>
                      Choose Row
                    </Button>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Quick Preview</Label>
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
                          <TableCell>{dataStartRowIndex + rowIndex}</TableCell>
                          {columns.map((column) => (
                            <TableCell key={`${dataStartRowIndex + rowIndex}-${column.key}`}>{row[column.index] || ''}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{status}</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !sheets.length}>
                {isSubmitting ? 'Saving...' : 'Save Format'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={rowPickerTarget !== null}
        title={rowPickerTarget === 'header' ? 'Pick Header Row' : 'Pick Data Start Row'}
        description="Click any row to highlight it in green, then confirm your selection."
        zIndexClassName="z-[60]"
      >
        <div className="space-y-4">
          {renderRowPickerActions()}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Row #</TableHead>
                {columns.map((column) => (
                  <TableHead key={`picker-${column.key}`}>{column.key}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pickerRows.map((row, index) => (
                <TableRow
                  key={`picker-row-${index}`}
                  className={cn('cursor-pointer', rowPickerSelection === index ? 'bg-emerald-100 hover:bg-emerald-100' : '')}
                  onClick={() => setRowPickerSelection(index)}
                >
                  <TableCell className="font-medium">{index}</TableCell>
                  {columns.map((column) => (
                    <TableCell key={`picker-row-${index}-${column.key}`}>{row[column.index] || ''}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {renderRowPickerActions()}
        </div>
      </Modal>
    </main>
  );
}
