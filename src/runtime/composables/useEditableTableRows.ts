import { ref, type Ref } from "vue";
import type { EditableTableColumn } from "@models/column";
import type { TableHistoryEntry } from "./useEditableTableHistory";

type RowMenuPosition = { left: number; top: number };

export interface UseEditableTableRowsOptions<TRow extends Record<string, any> = Record<string, any>> {
  rows: Ref<TRow[]>;
  columns: Ref<EditableTableColumn<TRow>[]>;
  tableElement: Ref<HTMLElement | null>;
  pushHistoryEntry: (entry: TableHistoryEntry) => void;
}

export function useEditableTableRows<TRow extends Record<string, any> = Record<string, any>>(options: UseEditableTableRowsOptions<TRow>) {
  const isRowMenuVisible = ref(false);
  const rowMenuIndex = ref<number | null>(null);
  const rowMenuPosition = ref<RowMenuPosition | null>(null);

  function closeRowMenu() {
    isRowMenuVisible.value = false;
    rowMenuIndex.value = null;
    rowMenuPosition.value = null;
  }

  function openRowMenu(rowIndex: number, event: MouseEvent) {
    const tableRect = options.tableElement.value?.getBoundingClientRect();
    const targetRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    if (!tableRect || !targetRect) return;

    rowMenuIndex.value = rowIndex;
    rowMenuPosition.value = {
      left: targetRect.right - tableRect.left + 8,
      top: targetRect.top - tableRect.top + targetRect.height / 2
    };
    isRowMenuVisible.value = true;
  }

  function defaultValueForColumn(column: EditableTableColumn<TRow>) {
    switch (column.type) {
      case "number":
        return null;
      case "boolean":
        return false;
      case "date":
        return "";
      default:
        return "";
    }
  }

  function createEmptyRow(): TRow {
    const nextRow: Record<string, unknown> = {};
    options.columns.value.forEach((column) => {
      nextRow[column.rowKey as string] = defaultValueForColumn(column);
    });
    return nextRow as TRow;
  }

  function applyRowChange(description: string, nextRows: TRow[]) {
    const previousRows = options.rows.value;
    options.rows.value = nextRows;

    options.pushHistoryEntry({
      description,
      undo() {
        options.rows.value = previousRows;
      },
      redo() {
        options.rows.value = nextRows;
      }
    });
  }

  function appendRow() {
    const nextRows = [...options.rows.value, createEmptyRow()];
    applyRowChange(`Add row ${nextRows.length}`, nextRows);
    return nextRows.length - 1;
  }

  function insertRow(targetIndex: number, position: "above" | "below") {
    const insertionIndex = position === "above" ? targetIndex : targetIndex + 1;
    if (insertionIndex < 0 || insertionIndex > options.rows.value.length) return null;

    const nextRows = [...options.rows.value];
    nextRows.splice(insertionIndex, 0, createEmptyRow());
    applyRowChange(`Insert row ${insertionIndex + 1}`, nextRows);

    return insertionIndex;
  }

  function insertRowAbove(targetIndex: number) {
    return insertRow(targetIndex, "above");
  }

  function insertRowBelow(targetIndex: number) {
    return insertRow(targetIndex, "below");
  }

  function moveRow(targetIndex: number, direction: "up" | "down") {
    if (direction === "up" && targetIndex <= 0) return null;
    if (direction === "down" && targetIndex >= options.rows.value.length - 1) return null;

    const destinationIndex = direction === "up" ? targetIndex - 1 : targetIndex + 1;
    const nextRows = [...options.rows.value];
    const [row] = nextRows.splice(targetIndex, 1);
    nextRows.splice(destinationIndex, 0, row);

    applyRowChange(`Move row ${direction === "up" ? "up" : "down"}`, nextRows);
    return destinationIndex;
  }

  function moveRowUp(targetIndex: number) {
    return moveRow(targetIndex, "up");
  }

  function moveRowDown(targetIndex: number) {
    return moveRow(targetIndex, "down");
  }

  function deleteRow(targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= options.rows.value.length) return null;

    const nextRows = options.rows.value.filter((_, index) => index !== targetIndex);
    applyRowChange(`Delete row ${targetIndex + 1}`, nextRows);

    if (!nextRows.length) return null;
    return Math.min(targetIndex, nextRows.length - 1);
  }

  return {
    isRowMenuVisible,
    rowMenuIndex,
    rowMenuPosition,
    openRowMenu,
    closeRowMenu,
    insertRowAbove,
    insertRowBelow,
    moveRowUp,
    moveRowDown,
    deleteRow,
    appendRow
  };
}
