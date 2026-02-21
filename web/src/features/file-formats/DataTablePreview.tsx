import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SheetColumn } from '@/features/file-formats/types';

type DataTablePreviewProps = {
  rows: string[][];
  columns: SheetColumn[];
  fromRow?: number;
  maxRows?: number;
  highlightedRowIndices?: number[];
  selectedRowIndex?: number | null;
  highlightedColumnIndices?: Set<number>;
  selectedColumnIndex?: number | null;
  onRowClick?: (rowIndex: number) => void;
  onColumnClick?: (columnIndex: number) => void;
  tableIdPrefix: string;
};

export function DataTablePreview({
  rows,
  columns,
  fromRow = 0,
  maxRows = 12,
  highlightedRowIndices = [],
  selectedRowIndex = null,
  highlightedColumnIndices,
  selectedColumnIndex = null,
  onRowClick,
  onColumnClick,
  tableIdPrefix
}: DataTablePreviewProps) {
  const visibleRows = rows.slice(fromRow, fromRow + maxRows);
  const highlightedRowSet = new Set(highlightedRowIndices);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Row #</TableHead>
          {columns.map((column) => (
            <TableHead
              key={`${tableIdPrefix}-head-${column.key}`}
              className={cn(
                onColumnClick ? 'cursor-pointer select-none' : '',
                highlightedColumnIndices?.has(column.index) ? 'bg-sky-100 text-foreground' : '',
                selectedColumnIndex === column.index ? 'bg-amber-200 text-foreground' : ''
              )}
              onClick={onColumnClick ? () => onColumnClick(column.index) : undefined}
            >
              <span className="block font-semibold">{column.key}</span>
              <span className="block text-xs text-muted-foreground">{column.label}</span>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleRows.map((row, rowOffset) => {
          const rowIndex = fromRow + rowOffset;
          const isHighlightedRow = highlightedRowSet.has(rowIndex);
          const isSelectedRow = selectedRowIndex === rowIndex;

          return (
            <TableRow
              key={`${tableIdPrefix}-row-${rowIndex}`}
              className={cn(
                onRowClick ? 'cursor-pointer' : '',
                isHighlightedRow ? 'bg-emerald-50 hover:bg-emerald-50' : '',
                isSelectedRow ? 'bg-emerald-100 hover:bg-emerald-100' : ''
              )}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
            >
              <TableCell className="font-medium">{rowIndex}</TableCell>
              {columns.map((column) => (
                <TableCell
                  key={`${tableIdPrefix}-cell-${rowIndex}-${column.key}`}
                  className={cn(
                    highlightedColumnIndices?.has(column.index) ? 'bg-sky-50' : '',
                    selectedColumnIndex === column.index ? 'bg-amber-100' : ''
                  )}
                >
                  {row[column.index] || ''}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
