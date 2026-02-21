import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { DataTablePreview } from '@/features/file-formats/DataTablePreview';
import { StepColumns } from '@/features/file-formats/steps/StepColumns';
import { StepProfileFile } from '@/features/file-formats/steps/StepProfileFile';
import { StepSheetRows } from '@/features/file-formats/steps/StepSheetRows';
import {
  canonicalFields,
  type CanonicalFieldKey,
  type ColumnMapping,
  type ColumnPickerTarget,
  type CurrencyMode,
  type FileFormatSummary,
  type ParsedSheet,
  type RowPickerTarget
} from '@/features/file-formats/types';
import { buildColumns, createEmptyColumnMapping, getCanonicalFieldLabel, readWorkbook, toColumnLabel } from '@/features/file-formats/utils';

type WizardStep = 1 | 2 | 3;

export function FileFormatsPage() {
  const [formats, setFormats] = useState<FileFormatSummary[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [profileName, setProfileName] = useState('');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);

  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
  const [dataStartRowIndex, setDataStartRowIndex] = useState<number | null>(null);

  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(createEmptyColumnMapping());
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('column');
  const [fixedCurrencyPreset, setFixedCurrencyPreset] = useState('USD');
  const [fixedCurrencyCustom, setFixedCurrencyCustom] = useState('');

  const [status, setStatus] = useState('No file loaded yet.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rowPickerTarget, setRowPickerTarget] = useState<RowPickerTarget>(null);
  const [rowPickerSelection, setRowPickerSelection] = useState<number | null>(null);

  const [columnPickerTarget, setColumnPickerTarget] = useState<ColumnPickerTarget>(null);
  const [columnPickerSelection, setColumnPickerSelection] = useState<number | null>(null);

  const selectedSheet = sheetIndex === null ? null : sheets[sheetIndex] ?? null;
  const fallbackPreviewSheet = sheets[0] ?? null;
  const previewSheet = selectedSheet ?? fallbackPreviewSheet;

  const selectedRows = selectedSheet?.rows ?? [];
  const previewRows = previewSheet?.rows ?? [];

  const activeRows = wizardStep === 3 ? selectedRows : previewRows;
  const activeColumns = useMemo(() => buildColumns(activeRows, headerRowIndex), [activeRows, headerRowIndex]);
  const pickerColumns = useMemo(() => buildColumns(selectedRows, headerRowIndex), [selectedRows, headerRowIndex]);

  const mappedColumnIndices = useMemo(() => {
    const values = Object.entries(columnMapping)
      .filter(([fieldKey, value]) => value !== null && (fieldKey !== 'currency' || currencyMode === 'column'))
      .map(([, value]) => value as number);
    return new Set(values);
  }, [columnMapping, currencyMode]);

  const effectiveFixedCurrency =
    fixedCurrencyPreset === 'CUSTOM' ? fixedCurrencyCustom.trim().toUpperCase() : fixedCurrencyPreset;

  const missingRequiredFields = useMemo(() => {
    return canonicalFields.filter((field) => {
      if (!field.required) return false;
      if (field.key === 'currency') {
        return currencyMode === 'column' ? columnMapping.currency === null : effectiveFixedCurrency.length === 0;
      }
      return columnMapping[field.key] === null;
    });
  }, [columnMapping, currencyMode, effectiveFixedCurrency]);

  const canGoToStep2 = profileName.trim().length > 0 && sheets.length > 0;
  const canGoToStep3 = sheetIndex !== null && headerRowIndex !== null && dataStartRowIndex !== null;
  const canSave = canGoToStep3 && missingRequiredFields.length === 0;

  function resetCreateState() {
    setWizardStep(1);
    setProfileName('');
    setFileName('');
    setSheets([]);
    setSheetIndex(null);
    setHeaderRowIndex(null);
    setDataStartRowIndex(null);
    setColumnMapping(createEmptyColumnMapping());
    setCurrencyMode('column');
    setFixedCurrencyPreset('USD');
    setFixedCurrencyCustom('');
    setStatus('No file loaded yet.');
    setRowPickerTarget(null);
    setRowPickerSelection(null);
    setColumnPickerTarget(null);
    setColumnPickerSelection(null);
    setIsSubmitting(false);
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
      setSheetIndex(null);
      setHeaderRowIndex(null);
      setDataStartRowIndex(null);
      setColumnMapping(createEmptyColumnMapping());
      setCurrencyMode('column');
      setFileName(file.name);
      setStatus(`Loaded ${parsed.length} sheet(s) from ${file.name}.`);
    } catch {
      setStatus('Could not parse file. Please use CSV, XLS, or XLSX.');
    }
  }

  function goNextStep() {
    if (wizardStep === 1) {
      if (!canGoToStep2) {
        setStatus('Provide profile name and upload a valid file before continuing.');
        return;
      }
      setWizardStep(2);
      setStatus('Choose sheet and row positions.');
      return;
    }

    if (wizardStep === 2) {
      if (!canGoToStep3) {
        setStatus('You must choose sheet, header row, and data start row to continue.');
        return;
      }
      setWizardStep(3);
      setStatus('Map required columns and configure currency.');
    }
  }

  function goBackStep() {
    setWizardStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));
  }

  function openRowPicker(target: Exclude<RowPickerTarget, null>) {
    if (!selectedSheet) {
      setStatus('Choose a sheet first.');
      return;
    }
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

  function openColumnPicker(fieldKey: CanonicalFieldKey) {
    if (!selectedSheet) {
      setStatus('Choose sheet and rows first.');
      return;
    }
    setColumnPickerTarget(fieldKey);
    setColumnPickerSelection(columnMapping[fieldKey]);
  }

  function closeColumnPicker() {
    setColumnPickerTarget(null);
    setColumnPickerSelection(null);
  }

  function confirmColumnPickerSelection() {
    if (columnPickerTarget === null || columnPickerSelection === null) return;
    setColumnMapping((current) => ({ ...current, [columnPickerTarget]: columnPickerSelection }));
    closeColumnPicker();
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

  function renderColumnPickerActions() {
    const selectedLabel =
      columnPickerSelection === null
        ? 'none'
        : `${toColumnLabel(columnPickerSelection)} - ${pickerColumns[columnPickerSelection]?.label ?? 'Unknown column'}`;

    return (
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Selected column: {selectedLabel}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={closeColumnPicker}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmColumnPickerSelection} disabled={columnPickerSelection === null}>
            Confirm Column
          </Button>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSheet || headerRowIndex === null || dataStartRowIndex === null) {
      setStatus('Sheet and row setup is incomplete.');
      return;
    }

    if (!canSave) {
      setStatus(`Map required fields first: ${missingRequiredFields.map((field) => field.label).join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      profileName: profileName || 'Untitled profile',
      sourceFile: fileName,
      sheetName: selectedSheet.name,
      headerRowIndex,
      dataStartRowIndex,
      columnMapping,
      currency: {
        mode: currencyMode,
        fixedValue: currencyMode === 'fixed' ? effectiveFixedCurrency : null
      },
      sampleRows: selectedRows.slice(dataStartRowIndex, dataStartRowIndex + 12)
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

  const previewFromRow = wizardStep === 3 ? (dataStartRowIndex ?? 0) : 0;
  const previewMaxRows = wizardStep === 2 ? 24 : 12;
  const previewHighlightedRows = wizardStep === 2
    ? [headerRowIndex, dataStartRowIndex].filter((value): value is number => value !== null)
    : [];

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
              <DataTablePreview
                rows={formats.map((format) => [
                  format.profileName,
                  format.sourceFile,
                  format.sheetName,
                  String(format.headerRowIndex),
                  String(format.dataStartRowIndex),
                  new Date(format.createdAt).toLocaleString()
                ])}
                columns={[
                  { index: 0, key: 'A', label: 'Profile' },
                  { index: 1, key: 'B', label: 'File' },
                  { index: 2, key: 'C', label: 'Sheet' },
                  { index: 3, key: 'D', label: 'Header Row' },
                  { index: 4, key: 'E', label: 'Data Start' },
                  { index: 5, key: 'F', label: 'Created' }
                ]}
                maxRows={formats.length}
                tableIdPrefix="formats"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No file formats yet. Create the first one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={isCreateOpen}
        title="Create New File Format"
        description="Step-by-step setup for profile, row detection, and column mapping."
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 text-sm">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={cn(
                  'rounded-full border px-3 py-1',
                  wizardStep === step ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                )}
              >
                Step {step}
              </div>
            ))}
          </div>

          {wizardStep === 1 ? (
            <StepProfileFile
              profileName={profileName}
              onProfileNameChange={setProfileName}
              fileName={fileName}
              onFileChange={handleFileChange}
            />
          ) : null}

          {wizardStep === 2 ? (
            <StepSheetRows
              sheets={sheets}
              sheetIndex={sheetIndex}
              headerRowIndex={headerRowIndex}
              dataStartRowIndex={dataStartRowIndex}
              maxRowIndex={Math.max(0, selectedRows.length - 1)}
              onSheetChange={(nextSheetIndex) => {
                setSheetIndex(nextSheetIndex);
                setHeaderRowIndex(null);
                setDataStartRowIndex(null);
                setColumnMapping(createEmptyColumnMapping());
              }}
              onHeaderRowChange={setHeaderRowIndex}
              onDataStartRowChange={setDataStartRowIndex}
              onChooseHeaderRow={() => openRowPicker('header')}
              onChooseDataStartRow={() => openRowPicker('dataStart')}
            />
          ) : null}

          {wizardStep === 3 ? (
            <StepColumns
              columnMapping={columnMapping}
              columnCount={activeColumns.length}
              columns={activeColumns}
              currencyMode={currencyMode}
              fixedCurrencyPreset={fixedCurrencyPreset}
              fixedCurrencyCustom={fixedCurrencyCustom}
              onColumnMappingChange={(fieldKey, value) => {
                setColumnMapping((current) => ({ ...current, [fieldKey]: value }));
              }}
              onChooseColumn={openColumnPicker}
              onCurrencyModeChange={(mode) => {
                setCurrencyMode(mode);
                if (mode === 'fixed') {
                  setColumnMapping((current) => ({ ...current, currency: null }));
                }
              }}
              onFixedCurrencyPresetChange={setFixedCurrencyPreset}
              onFixedCurrencyCustomChange={setFixedCurrencyCustom}
            />
          ) : null}

          <div className="space-y-2">
            <Label>
              {wizardStep === 1 ? 'File Preview' : wizardStep === 2 ? 'Sheet / Row Preview' : 'Mapped Columns Preview'}
            </Label>
            {activeRows.length ? (
              <DataTablePreview
                rows={activeRows}
                columns={activeColumns}
                fromRow={previewFromRow}
                maxRows={previewMaxRows}
                highlightedRowIndices={previewHighlightedRows}
                highlightedColumnIndices={wizardStep === 3 ? mappedColumnIndices : undefined}
                tableIdPrefix="wizard-preview"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Upload a file to show table preview.</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{status}</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={closeCreateModal}>
                Cancel
              </Button>
              {wizardStep > 1 ? (
                <Button type="button" variant="outline" onClick={goBackStep}>
                  Back
                </Button>
              ) : null}

              {wizardStep < 3 ? (
                <Button
                  type="button"
                  onClick={goNextStep}
                  disabled={(wizardStep === 1 && !canGoToStep2) || (wizardStep === 2 && !canGoToStep3)}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !canSave}>
                  {isSubmitting ? 'Saving...' : 'Save Format'}
                </Button>
              )}
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

          <DataTablePreview
            rows={selectedRows}
            columns={pickerColumns}
            maxRows={40}
            selectedRowIndex={rowPickerSelection}
            onRowClick={setRowPickerSelection}
            tableIdPrefix="row-picker"
          />

          {renderRowPickerActions()}
        </div>
      </Modal>

      <Modal
        open={columnPickerTarget !== null}
        title={`Pick Column For ${columnPickerTarget ? getCanonicalFieldLabel(columnPickerTarget) : ''}`}
        description="Click a column header or any cell in that column, then confirm your selection."
        zIndexClassName="z-[70]"
      >
        <div className="space-y-4">
          {renderColumnPickerActions()}

          <DataTablePreview
            rows={selectedRows}
            columns={pickerColumns}
            maxRows={24}
            selectedColumnIndex={columnPickerSelection}
            onColumnClick={setColumnPickerSelection}
            tableIdPrefix="column-picker"
          />

          {renderColumnPickerActions()}
        </div>
      </Modal>
    </main>
  );
}
