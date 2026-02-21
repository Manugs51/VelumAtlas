import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { canonicalFields } from '@/features/file-formats/types';
import { toColumnLabel } from '@/features/file-formats/utils';
import type { ColumnMapping, CurrencyMode, SheetColumn } from '@/features/file-formats/types';

type StepColumnsProps = {
  columnMapping: ColumnMapping;
  columnCount: number;
  columns: SheetColumn[];
  currencyMode: CurrencyMode;
  fixedCurrencyPreset: string;
  fixedCurrencyCustom: string;
  onColumnMappingChange: (fieldKey: keyof ColumnMapping, value: number | null) => void;
  onChooseColumn: (fieldKey: keyof ColumnMapping) => void;
  onCurrencyModeChange: (mode: CurrencyMode) => void;
  onFixedCurrencyPresetChange: (value: string) => void;
  onFixedCurrencyCustomChange: (value: string) => void;
};

const commonCurrencies = ['USD', 'EUR', 'GBP', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'BRL', 'CUSTOM'];

export function StepColumns({
  columnMapping,
  columnCount,
  columns,
  currencyMode,
  fixedCurrencyPreset,
  fixedCurrencyCustom,
  onColumnMappingChange,
  onChooseColumn,
  onCurrencyModeChange,
  onFixedCurrencyPresetChange,
  onFixedCurrencyCustomChange
}: StepColumnsProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-semibold">Column Mapping</h3>
        <p className="text-xs text-muted-foreground">Pick required fields visually from your table columns.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {canonicalFields.map((field) => {
          const mappedIndex = columnMapping[field.key];
          const mappedLabel =
            mappedIndex === null
              ? 'Unmapped'
              : `${toColumnLabel(mappedIndex)} - ${columns[mappedIndex]?.label ?? 'Unknown column'}`;

          const isCurrencyFixed = field.key === 'currency' && currencyMode === 'fixed';

          return (
            <div key={field.key} className="grid gap-2 rounded-md border border-border p-3">
              <Label htmlFor={`column-${field.key}`}>
                {field.label}
                {field.required ? <span className="ml-1 text-destructive">*</span> : null}
              </Label>

              {field.key === 'currency' ? (
                <div className="grid gap-2">
                  <Select
                    value={currencyMode}
                    onChange={(event) => onCurrencyModeChange(event.target.value as CurrencyMode)}
                  >
                    <option value="column">Map from column</option>
                    <option value="fixed">Use fixed currency value</option>
                  </Select>

                  {currencyMode === 'fixed' ? (
                    <>
                      <Select value={fixedCurrencyPreset} onChange={(event) => onFixedCurrencyPresetChange(event.target.value)}>
                        {commonCurrencies.map((code) => (
                          <option key={code} value={code}>
                            {code === 'CUSTOM' ? 'Custom' : code}
                          </option>
                        ))}
                      </Select>
                      {fixedCurrencyPreset === 'CUSTOM' ? (
                        <Input
                          placeholder="Type currency code (e.g. USD)"
                          value={fixedCurrencyCustom}
                          onChange={(event) => onFixedCurrencyCustomChange(event.target.value.toUpperCase())}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {!isCurrencyFixed ? (
                <div className="flex gap-2">
                  <Input
                    id={`column-${field.key}`}
                    type="number"
                    min={0}
                    max={Math.max(0, columnCount - 1)}
                    value={mappedIndex ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === '') {
                        onColumnMappingChange(field.key, null);
                        return;
                      }
                      const nextValue = Math.min(Math.max(0, Number(raw) || 0), Math.max(0, columnCount - 1));
                      onColumnMappingChange(field.key, nextValue);
                    }}
                  />
                  <Button type="button" variant="outline" onClick={() => onChooseColumn(field.key)}>
                    Choose Column
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">{isCurrencyFixed ? 'Mapped from fixed value.' : mappedLabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
