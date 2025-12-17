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
  columns: EditableTableColumn<TRow>[];
  selectionRange: ComputedRef<TableSelectionRange | null>;
  selectedRowIndexes: ComputedRef<number[]>;
  selectedColumnIndexes: ComputedRef<number[]>;
}

export function useEditableTableClipboard<TRow extends Record<string, any>>(options: ClipboardOptions<TRow>) {
  const { rows, columns, selectionRange, selectedRowIndexes, selectedColumnIndexes } = options;

  function applyValueToCell(rowIndex: number, columnIndex: number, rawValue: string) {
    const column = columns[columnIndex];
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

    rows.value[rowIndex][key] = parsedValue as TRow[keyof TRow];
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
        const column = columns[columnIndex];
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
      rowIndexes.forEach((rowIndex) => {
        columnIndexes.forEach((columnIndex) => applyValueToCell(rowIndex, columnIndex, singleValue));
      });
      return;
    }

    const rowsToFill = Math.min(rowIndexes.length, matrixHeight);
    const columnsToFill = Math.min(columnIndexes.length, matrixWidth);

    for (let rowOffset = 0; rowOffset < rowsToFill; rowOffset++) {
      for (let columnOffset = 0; columnOffset < columnsToFill; columnOffset++) {
        applyValueToCell(rowIndexes[rowOffset], columnIndexes[columnOffset], matrix[rowOffset]?.[columnOffset] ?? "");
      }
    }
  }

  return {
    handleCopyEvent,
    handlePasteEvent
  };
}
