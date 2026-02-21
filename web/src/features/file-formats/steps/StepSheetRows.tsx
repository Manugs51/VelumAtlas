import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ParsedSheet } from '@/features/file-formats/types';

type StepSheetRowsProps = {
  sheets: ParsedSheet[];
  sheetIndex: number | null;
  headerRowIndex: number | null;
  dataStartRowIndex: number | null;
  maxRowIndex: number;
  onSheetChange: (value: number | null) => void;
  onHeaderRowChange: (value: number | null) => void;
  onDataStartRowChange: (value: number | null) => void;
  onChooseHeaderRow: () => void;
  onChooseDataStartRow: () => void;
};

export function StepSheetRows({
  sheets,
  sheetIndex,
  headerRowIndex,
  dataStartRowIndex,
  maxRowIndex,
  onSheetChange,
  onHeaderRowChange,
  onDataStartRowChange,
  onChooseHeaderRow,
  onChooseDataStartRow
}: StepSheetRowsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="sheet-select">Sheet</Label>
        <Select
          id="sheet-select"
          value={sheetIndex === null ? '' : String(sheetIndex)}
          onChange={(event) => {
            const value = event.target.value;
            onSheetChange(value === '' ? null : Number(value));
          }}
        >
          <option value="">Choose a sheet</option>
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
            max={Math.max(0, maxRowIndex)}
            value={headerRowIndex ?? ''}
            placeholder="Choose row"
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                onHeaderRowChange(null);
                return;
              }
              onHeaderRowChange(Math.min(Math.max(0, Number(raw) || 0), Math.max(0, maxRowIndex)));
            }}
          />
          <Button type="button" variant="outline" onClick={onChooseHeaderRow} disabled={sheetIndex === null}>
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
            max={Math.max(0, maxRowIndex)}
            value={dataStartRowIndex ?? ''}
            placeholder="Choose row"
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                onDataStartRowChange(null);
                return;
              }
              onDataStartRowChange(Math.min(Math.max(0, Number(raw) || 0), Math.max(0, maxRowIndex)));
            }}
          />
          <Button type="button" variant="outline" onClick={onChooseDataStartRow} disabled={sheetIndex === null}>
            Choose Row
          </Button>
        </div>
      </div>
    </div>
  );
}
