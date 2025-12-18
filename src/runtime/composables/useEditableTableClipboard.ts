import { ComputedRef, Ref } from "vue";
import { EditableTableColumn } from "@models/column";

export interface TableSelectionRange {
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

export interface ClipboardOptions<TRow extends Record<string, any>> {
  rows: Ref<TRow[]>;
  columns: Ref<EditableTableColumn<TRow>[]>;
  selectionRange: ComputedRef<TableSelectionRange | null>;
  selectedRowIndexes: ComputedRef<number[]>;
  selectedColumnIndexes: ComputedRef<number[]>;
  getRowId?: (row: TRow, rowIndex: number) => string | number;
  onCellsChanged?: (
    payload: {
      rowId: string | number;
      columnKey: keyof TRow | string;
      previousValue: TRow[keyof TRow];
      nextValue: TRow[keyof TRow];
    }[]
  ) => void;
}

export function useEditableTableClipboard<TRow extends Record<string, any>>(options: ClipboardOptions<TRow>) {
  const { rows, columns, selectionRange, selectedRowIndexes, selectedColumnIndexes, getRowId, onCellsChanged } = options;

  function applyValueToCell(
    rowIndex: number,
    columnIndex: number,
    rawValue: string
  ):
    | {
        rowId: string | number;
        columnKey: keyof TRow | string;
        previousValue: TRow[keyof TRow];
        nextValue: TRow[keyof TRow];
      }
    | undefined {
    const column = columns.value[columnIndex];
    if (!column) return;

    const key = column.rowKey as keyof TRow;

    let parsedValue: any = rawValue;
    if (column.type === "number") {
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) return;
      parsedValue = numberValue;
    } else if (column.type === "boolean") {
      const normalizedValue = rawValue.trim().toLowerCase();
      parsedValue = ["true", "1", "yes", "y", "on", "✓", "✔"].includes(normalizedValue);
    }

    const previousValue = rows.value[rowIndex][key];
    const nextValue = parsedValue as TRow[keyof TRow];

    if (Object.is(previousValue, nextValue)) return undefined;

    rows.value[rowIndex][key] = nextValue;

    return {
      rowId: getRowId ? getRowId(rows.value[rowIndex], rowIndex) : rowIndex,
      columnKey: key,
      previousValue,
      nextValue
    };
  }

  function handleCopyEvent(event: ClipboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    if (!selectionRange.value) return;

    const rowIndexes = selectedRowIndexes.value;
    const columnIndexes = selectedColumnIndexes.value;

    if (!rowIndexes.length || !columnIndexes.length) return;

    const matrix = rowIndexes.map((rowIndex) =>
      columnIndexes.map((columnIndex) => {
        const column = columns.value[columnIndex];
        if (!column) return "";
        const value = rows.value[rowIndex]?.[column.rowKey];
        return value ?? "";
      })
    );

    const textContent = matrix.map((row) => row.join("\t")).join("\n");
    event.preventDefault();
    event.clipboardData?.setData("text/plain", textContent);
  }

  function handlePasteEvent(event: ClipboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    if (!selectionRange.value) return;

    const textContent = event.clipboardData?.getData("text") ?? "";
    if (!textContent) return;

    event.preventDefault();

    const normalizedText = textContent.replace(/\r/g, "");
    const lines = normalizedText.split("\n").filter((line, index, array) => !(line === "" && index === array.length - 1));
    const matrix = lines.map((line) => line.split("\t"));
    if (!matrix.length) return;

    const rowIndexes = selectedRowIndexes.value;
    const columnIndexes = selectedColumnIndexes.value;

    if (!rowIndexes.length || !columnIndexes.length) return;

    const matrixWidth = Math.max(...matrix.map((row) => row.length));
    const matrixHeight = matrix.length;

    if (matrixHeight === 1 && matrixWidth === 1) {
      const singleValue = matrix[0][0] ?? "";
      const changes: NonNullable<ReturnType<typeof applyValueToCell>>[] = [];

      rowIndexes.forEach((rowIndex) => {
        columnIndexes.forEach((columnIndex) => {
          const change = applyValueToCell(rowIndex, columnIndex, singleValue);
          if (change) changes.push(change);
        });
      });

      if (changes.length) onCellsChanged?.(changes);
      return;
    }

    const rowsToFill = Math.min(rowIndexes.length, matrixHeight);
    const columnsToFill = Math.min(columnIndexes.length, matrixWidth);

    const changes: NonNullable<ReturnType<typeof applyValueToCell>>[] = [];

    for (let rowOffset = 0; rowOffset < rowsToFill; rowOffset++) {
      for (let columnOffset = 0; columnOffset < columnsToFill; columnOffset++) {
        const change = applyValueToCell(rowIndexes[rowOffset], columnIndexes[columnOffset], matrix[rowOffset]?.[columnOffset] ?? "");
        if (change) changes.push(change);
      }
    }

    if (changes.length) {
      onCellsChanged?.(changes);
    }
  }

  return {
    handleCopyEvent,
    handlePasteEvent
  };
}
