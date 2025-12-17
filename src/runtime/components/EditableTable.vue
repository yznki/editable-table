<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { EditableTableProps } from "@models/table";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import EditableTableCell from "./EditableTableCell/EditableTableCell.vue";

  const tableRoot = cva("relative w-full h-full text-sm flex flex-col");

  const headerRow = cva("grid border-b border-gray-300 bg-gray-50 font-medium");
  const headerCell = cva("px-3 py-2 truncate");
  const indexCell = cva("px-2 py-2 text-right text-xs text-gray-500 select-none bg-gray-50");

  const bodyRow = cva("grid border-b border-gray-200");
  const bodyWrapper = cva("relative flex-1 overflow-auto");
  const footerRow = cva("sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-end");
  const footerContent = cva("flex items-center justify-end gap-3 px-3 py-2 text-xs text-gray-600");
  const footerStat = cva("flex items-center gap-1 text-gray-700");
  const footerSelect = cva("border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400");

  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { idPropertyName: "id" });

  const rows = defineModel<TRow[]>({ default: () => [] });

  const { clearActive, activePosition, setActive } = useEditableTableNavigation();
  const tableElement = ref<HTMLElement | null>(null);

  onClickOutside(tableElement, () => {
    clearActive();
    selectionAnchor.value = null;
    selectionEnd.value = null;
  });

  const indexColumnWidth = "3rem";

  type CellPosition = { rowIndex: number; columnIndex: number };
  interface SelectionRange {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }

  const selectionAnchor = ref<CellPosition | null>(null);
  const selectionEnd = ref<CellPosition | null>(null);
  const preserveSelectionOnNextFocus = ref(false);

  type StatType = "sum" | "avg" | "min" | "max" | "count";
  const statOptions: { value: StatType; label: string }[] = [
    { value: "sum", label: "Sum" },
    { value: "avg", label: "Average" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "count", label: "Count" }
  ];
  const selectedStat = ref<StatType>("sum");

  const getRowId = (row: TRow, rowIndex: number) => {
    const rowId = row[props.idPropertyName as keyof TRow];
    return rowId ?? rowIndex;
  };

  const gridStyle = computed(() => ({
    gridTemplateColumns: `${indexColumnWidth} repeat(${props.columns.length}, minmax(0, 1fr))`
  }));

  function setSelection(position: CellPosition, extend: boolean) {
    if (extend && selectionAnchor.value) {
      selectionEnd.value = position;
    } else {
      selectionAnchor.value = position;
      selectionEnd.value = position;
    }
  }

  const selectionRange = computed<SelectionRange | null>(() => {
    if (!selectionAnchor.value || !selectionEnd.value) return null;
    const startRow = Math.min(selectionAnchor.value.rowIndex, selectionEnd.value.rowIndex);
    const endRow = Math.max(selectionAnchor.value.rowIndex, selectionEnd.value.rowIndex);
    const startCol = Math.min(selectionAnchor.value.columnIndex, selectionEnd.value.columnIndex);
    const endCol = Math.max(selectionAnchor.value.columnIndex, selectionEnd.value.columnIndex);
    return { startRow, endRow, startCol, endCol };
  });

  const selectedRowIndexes = computed(() => {
    if (!selectionRange.value) return [];
    if (!rows.value.length) return [];
    const { startRow, endRow } = selectionRange.value;
    const maxRow = Math.max(0, rows.value.length - 1);
    const safeStart = Math.min(Math.max(startRow, 0), maxRow);
    const safeEnd = Math.min(Math.max(endRow, 0), maxRow);
    return Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => safeStart + i);
  });

  const selectedColumnIndexes = computed(() => {
    if (!selectionRange.value) return [];
    if (!props.columns.length) return [];
    const { startCol, endCol } = selectionRange.value;
    const maxCol = Math.max(0, props.columns.length - 1);
    const safeStart = Math.min(Math.max(startCol, 0), maxCol);
    const safeEnd = Math.min(Math.max(endCol, 0), maxCol);
    return Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => safeStart + i);
  });

  const selectionLabel = computed(() => {
    if (!selectionRange.value) return "";
    const { startRow, endRow } = selectionRange.value;
    return startRow === endRow ? `Row ${startRow + 1}` : `Rows ${startRow + 1}-${endRow + 1}`;
  });

  function onIndexClick(rowIndex: number, event: MouseEvent) {
    const position: CellPosition = { rowIndex, columnIndex: 0 };
    const extend = event.shiftKey && selectionAnchor.value !== null;
    setSelection({ ...position, columnIndex: 0 }, extend);
    selectionAnchor.value = selectionAnchor.value ? { ...selectionAnchor.value, columnIndex: 0 } : position;
    selectionEnd.value = { rowIndex, columnIndex: Math.max(0, props.columns.length - 1) };
    preserveSelectionOnNextFocus.value = extend;
  }

  function onCellSelect(payload: { rowIndex: number; columnIndex: number; shift: boolean }) {
    const { rowIndex, columnIndex, shift } = payload;
    setSelection({ rowIndex, columnIndex }, shift);
    preserveSelectionOnNextFocus.value = shift;
  }

  function onCellFocus(payload: { rowIndex: number; columnIndex: number }) {
    if (preserveSelectionOnNextFocus.value && selectionAnchor.value) {
      selectionEnd.value = { rowIndex: payload.rowIndex, columnIndex: payload.columnIndex };
      preserveSelectionOnNextFocus.value = false;
      return;
    }
    preserveSelectionOnNextFocus.value = false;
    setSelection({ rowIndex: payload.rowIndex, columnIndex: payload.columnIndex }, false);
  }

  function onKeyDown(event: KeyboardEvent) {
    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const isArrow = arrowKeys.includes(event.key);

    // Jump to edges with Ctrl/Cmd + arrows
    if (isArrow && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();

      const current = activePosition.value ?? { rowIndex: 0, columnIndex: 0 };
      const rowMax = Math.max(0, rows.value.length - 1);
      const colMax = Math.max(0, props.columns.length - 1);

      const target =
        event.key === "ArrowUp"
          ? { rowIndex: 0, columnIndex: current.columnIndex }
          : event.key === "ArrowDown"
            ? { rowIndex: rowMax, columnIndex: current.columnIndex }
            : event.key === "ArrowLeft"
              ? { rowIndex: current.rowIndex, columnIndex: 0 }
              : { rowIndex: current.rowIndex, columnIndex: colMax };

      if (event.shiftKey) {
        if (!selectionAnchor.value) selectionAnchor.value = current;
        selectionEnd.value = target;
        preserveSelectionOnNextFocus.value = true;
      } else {
        selectionAnchor.value = target;
        selectionEnd.value = target;
      }

      setActive(target);
      return;
    }

    // Extend selection with shift + arrows
    if (isArrow && event.shiftKey) {
      event.preventDefault();
      if (!selectionAnchor.value) {
        const current = activePosition.value ?? { rowIndex: 0, columnIndex: 0 };
        selectionAnchor.value = current;
        selectionEnd.value = current;
      }
      preserveSelectionOnNextFocus.value = true;
    }

    // Copy handled in onCopy; allow default for inputs
  }

  const numericStats = computed(() => {
    if (!selectionRange.value) return [];

    const columnsInSelection = selectedColumnIndexes.value
      .map((colIndex) => ({ index: colIndex, column: props.columns[colIndex] }))
      .filter(({ column }) => column && column.type === "number");

    if (!columnsInSelection.length) return [];

    let rowsInSelection = selectedRowIndexes.value;

    if (selectionRange.value.startRow === selectionRange.value.endRow) {
      rowsInSelection = rows.value.map((_, index) => index);
    }

    return columnsInSelection
      .map(({ column }) => {
        const values = rowsInSelection
          .map((rowIndex) => Number(rows.value[rowIndex]?.[column.rowKey]))
          .filter((value) => Number.isFinite(value));

        if (!values.length) return null;

        const sum = values.reduce((acc, value) => acc + value, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const count = values.length;

        const valueByStat: Record<StatType, number> = { sum, avg, min, max, count };
        const displayValue = valueByStat[selectedStat.value];

        return {
          key: String(column.rowKey),
          title: column.title,
          value: Number.isFinite(displayValue) ? displayValue : ""
        };
      })
      .filter((stat): stat is { key: string; title: string; value: number | string } => Boolean(stat));
  });

  function onCopy(event: ClipboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    if (!selectionRange.value) return;

    const rowIndices = selectedRowIndexes.value;
    const columnIndices = selectedColumnIndexes.value;

    if (!rowIndices.length || !columnIndices.length) return;

    const matrix = rowIndices.map((rowIndex) =>
      columnIndices.map((colIndex) => {
        const column = props.columns[colIndex];
        if (!column) return "";
        const value = rows.value[rowIndex]?.[column.rowKey];
        return value ?? "";
      })
    );

    const text = matrix.map((row) => row.join("\t")).join("\n");
    event.preventDefault();
    event.clipboardData?.setData("text/plain", text);
  }

  function applyValueToCell(rowIndex: number, columnIndex: number, rawValue: string) {
    const column = props.columns[columnIndex];
    if (!column) return;
    const key = column.rowKey as keyof TRow;

    let parsed: any = rawValue;
    if (column.type === "number") {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) return;
      parsed = num;
    } else if (column.type === "boolean") {
      const normalized = rawValue.trim().toLowerCase();
      parsed = ["true", "1", "yes", "y", "on", "✓", "✔"].includes(normalized);
    }

    rows.value[rowIndex][key] = parsed as TRow[keyof TRow];
  }

  function onPaste(event: ClipboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }

    if (!selectionRange.value) return;

    const text = event.clipboardData?.getData("text") ?? "";
    if (!text) return;

    event.preventDefault();

    const normalized = text.replace(/\r/g, "");
    const lines = normalized.split("\n").filter((line, idx, arr) => !(line === "" && idx === arr.length - 1));
    const matrix = lines.map((line) => line.split("\t"));
    if (!matrix.length) return;
    const width = Math.max(...matrix.map((row) => row.length));
    const height = matrix.length;

    const rowIndices = selectedRowIndexes.value;
    const columnIndices = selectedColumnIndexes.value;

    if (!rowIndices.length || !columnIndices.length) return;

    if (height === 1 && width === 1) {
      const value = matrix[0][0] ?? "";
      rowIndices.forEach((rowIndex) => {
        columnIndices.forEach((columnIndex) => applyValueToCell(rowIndex, columnIndex, value));
      });
      return;
    }

    const rowsToFill = Math.min(rowIndices.length, height);
    const colsToFill = Math.min(columnIndices.length, width);

    for (let r = 0; r < rowsToFill; r++) {
      for (let c = 0; c < colsToFill; c++) {
        applyValueToCell(rowIndices[r], columnIndices[c], matrix[r]?.[c] ?? "");
      }
    }
  }
</script>

<template>
  <div ref="tableElement" :class="tableRoot()" @paste="onPaste" @keydown.capture="onKeyDown" @copy.capture="onCopy">
    <div :class="headerRow()" :style="gridStyle">
      <div :class="indexCell()">#</div>
      <div v-for="column in columns" :key="String(column.rowKey)" :class="headerCell()">
        {{ column.title }}
      </div>
    </div>

    <div :class="bodyWrapper()">
      <div v-for="(row, rowIndex) in rows" :key="String(getRowId(row, rowIndex))" :class="bodyRow()" :style="gridStyle">
        <div :class="indexCell()" @click="onIndexClick(rowIndex, $event)">{{ rowIndex + 1 }}</div>
        <EditableTableCell
          v-for="(column, columnIndex) in columns"
          :key="String(column.rowKey)"
          v-model="rows[rowIndex][column.rowKey as keyof TRow]"
          :row-id="getRowId(row, rowIndex)"
          :column-key="column.rowKey"
          :column-type="column.type"
          :row-index="rowIndex"
          :column-index="columnIndex"
          :row-count="rows.length"
          :column-count="columns.length"
          :selection-range="selectionRange"
          @cell-select="onCellSelect"
          @cell-focus="onCellFocus" />
      </div>
    </div>

    <div :class="footerRow()">
      <div :class="footerContent()">
        <template v-if="numericStats.length">
          <label class="flex items-center gap-1 text-gray-500">
            <select v-model="selectedStat" :class="footerSelect()">
              <option v-for="option in statOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <span v-for="stat in numericStats" :key="stat.key" :class="footerStat()">
            {{ stat.title }}:
            <strong class="font-semibold text-gray-900">{{ stat.value }}</strong>
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
