import type { Ref } from "vue";
import type { ColumnType, EditableTableColumn } from "@models/column";

interface UseEditableTableSortingOptions<TRow extends Record<string, any>> {
  rows: Ref<TRow[]>;
  columns: Ref<EditableTableColumn<TRow>[]>;
  disableScrollOnNextFocus?: () => void;
}

function normalizeForSort(value: unknown, type: ColumnType) {
  if (value === null || value === undefined) {
    return { comparable: null, isNullish: true };
  }

  switch (type) {
    case "number": {
      const numericValue = typeof value === "number" ? value : Number(value);
      return { comparable: numericValue, isNullish: Number.isNaN(numericValue) };
    }
    case "boolean":
      return { comparable: value === true || value === "true" || value === 1 ? 1 : 0, isNullish: false };
    case "date": {
      const timestamp = value instanceof Date ? value.getTime() : new Date(value as any).getTime();
      return { comparable: timestamp, isNullish: Number.isNaN(timestamp) };
    }
    case "select":
    case "custom":
    case "text":
    default:
      return { comparable: String(value).toLowerCase(), isNullish: false };
  }
}

function compareValuesForSort(a: unknown, b: unknown, type: ColumnType, direction: "asc" | "desc") {
  const normalizedA = normalizeForSort(a, type);
  const normalizedB = normalizeForSort(b, type);

  if (normalizedA.isNullish && normalizedB.isNullish) return 0;
  if (normalizedA.isNullish) return 1;
  if (normalizedB.isNullish) return -1;

  if (normalizedA.comparable === normalizedB.comparable) return 0;

  if (normalizedA.comparable === null && normalizedB.comparable !== null) return 1;
  if (normalizedA.comparable !== null && normalizedB.comparable === null) return -1;
  if (normalizedA.comparable === null && normalizedB.comparable === null) return 0;

  const result = (normalizedA.comparable as any) > (normalizedB.comparable as any) ? 1 : -1;
  return direction === "asc" ? result : -result;
}

export function useEditableTableSorting<TRow extends Record<string, any>>(options: UseEditableTableSortingOptions<TRow>) {
  const { rows, columns, disableScrollOnNextFocus } = options;

  function sortByColumn(columnIndex: number, direction: "asc" | "desc") {
    const column = columns.value[columnIndex];
    if (!column) return;

    const columnKey = column.rowKey as keyof TRow;
    const columnType = column.type ?? "text";

    disableScrollOnNextFocus?.();
    rows.value = [...rows.value].sort((rowA, rowB) => compareValuesForSort(rowA?.[columnKey], rowB?.[columnKey], columnType, direction));
  }

  return {
    sortByColumn
  };
}
