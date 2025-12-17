<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { EditableTableProps } from "@models/table";
  import { useEditableTableClipboard, type TableSelectionRange } from "@composables/useEditableTableClipboard";
  import { useEditableTableNavigation, type NavigationSelectionState } from "@composables/useEditableTableNavigation";
  import EditableTableCell from "./EditableTableCell/EditableTableCell.vue";
  import EditableTableFooter from "./EditableTableFooter/EditableTableFooter.vue";

  type CellPosition = { rowIndex: number; columnIndex: number };

  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { idPropertyName: "id" });

  const rows = defineModel<TRow[]>({ default: () => [] });

  const selectionAnchor = ref<CellPosition | null>(null);
  const selectionEnd = ref<CellPosition | null>(null);
  const preserveSelectionOnNextFocus = ref(false);

  const tableElement = ref<HTMLElement | null>(null);
  const bodyWrapperElement = ref<HTMLElement | null>(null);
  const indexColumnWidth = "3rem";

  const { clearActive, activePosition, setActive, handleTableKeyDown } = useEditableTableNavigation();

  onClickOutside(tableElement, () => {
    clearActive();
    selectionAnchor.value = null;
    selectionEnd.value = null;
  });

  const gridStyle = computed(() => ({
    gridTemplateColumns: `${indexColumnWidth} repeat(${props.columns.length}, minmax(0, 1fr))`
  }));

  const selectionRange = computed<TableSelectionRange | null>(() => {
    if (!selectionAnchor.value || !selectionEnd.value) return null;
    const startRowIndex = Math.min(selectionAnchor.value.rowIndex, selectionEnd.value.rowIndex);
    const endRowIndex = Math.max(selectionAnchor.value.rowIndex, selectionEnd.value.rowIndex);
    const startColumnIndex = Math.min(selectionAnchor.value.columnIndex, selectionEnd.value.columnIndex);
    const endColumnIndex = Math.max(selectionAnchor.value.columnIndex, selectionEnd.value.columnIndex);
    return { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
  });

  const selectedRowIndexes = computed(() => {
    if (!selectionRange.value) return [];
    if (!rows.value.length) return [];
    const { startRowIndex, endRowIndex } = selectionRange.value;
    const maximumRowIndex = Math.max(0, rows.value.length - 1);
    const safeStartRowIndex = Math.min(Math.max(startRowIndex, 0), maximumRowIndex);
    const safeEndRowIndex = Math.min(Math.max(endRowIndex, 0), maximumRowIndex);
    return Array.from({ length: safeEndRowIndex - safeStartRowIndex + 1 }, (_, rowOffset) => safeStartRowIndex + rowOffset);
  });

  const selectedColumnIndexes = computed(() => {
    if (!selectionRange.value) return [];
    if (!props.columns.length) return [];
    const { startColumnIndex, endColumnIndex } = selectionRange.value;
    const maximumColumnIndex = Math.max(0, props.columns.length - 1);
    const safeStartColumnIndex = Math.min(Math.max(startColumnIndex, 0), maximumColumnIndex);
    const safeEndColumnIndex = Math.min(Math.max(endColumnIndex, 0), maximumColumnIndex);
    return Array.from({ length: safeEndColumnIndex - safeStartColumnIndex + 1 }, (_, columnOffset) => safeStartColumnIndex + columnOffset);
  });

  const { handleCopyEvent, handlePasteEvent } = useEditableTableClipboard<TRow>({
    rows,
    columns: props.columns,
    selectionRange,
    selectedRowIndexes,
    selectedColumnIndexes
  });

  /**
   * Gets the unique identifier for a given row.
   * @param row - The row object.
   * @param rowIndex - The index of the row.
   */
  const getRowId = (row: TRow, rowIndex: number) => {
    const rowId = row[props.idPropertyName as keyof TRow];
    return rowId ?? rowIndex;
  };

  /**
   * Sets the selection range based on the given position.
   * @param position - The cell position to set the selection to.
   * @param shouldExtendSelection - Whether to extend the current selection or start a new one.
   */
  function setSelection(position: CellPosition, shouldExtendSelection: boolean) {
    if (shouldExtendSelection && selectionAnchor.value) {
      selectionEnd.value = position;
      return;
    }

    selectionAnchor.value = position;
    selectionEnd.value = position;
  }

  /**
   * Handles click events on the index cell to select entire rows.
   * @param rowIndex - The index of the row that was clicked.
   * @param event - The mouse event.
   */
  function onIndexClick(rowIndex: number, event: MouseEvent) {
    const position: CellPosition = { rowIndex, columnIndex: 0 };
    const shouldExtendSelection = event.shiftKey && selectionAnchor.value !== null;
    setSelection({ ...position, columnIndex: 0 }, shouldExtendSelection);
    selectionAnchor.value = selectionAnchor.value ? { ...selectionAnchor.value, columnIndex: 0 } : position;
    selectionEnd.value = { rowIndex, columnIndex: Math.max(0, props.columns.length - 1) };
    preserveSelectionOnNextFocus.value = shouldExtendSelection;
  }

  /**
   * Handles cell selection events.
   * @param payload - The payload containing row and column indexes of the selected cell and whether to extend the selection.
   */
  function onCellSelect(payload: { rowIndex: number; columnIndex: number; shift: boolean }) {
    const { rowIndex, columnIndex, shift } = payload;
    setSelection({ rowIndex, columnIndex }, shift);
    preserveSelectionOnNextFocus.value = shift;
  }

  /**
   * Handles cell focus events.
   * @param payload - The payload containing row and column indexes of the focused cell.
   */
  function onCellFocus(payload: { rowIndex: number; columnIndex: number }) {
    if (preserveSelectionOnNextFocus.value && selectionAnchor.value) {
      selectionEnd.value = { rowIndex: payload.rowIndex, columnIndex: payload.columnIndex };
      preserveSelectionOnNextFocus.value = false;
      return;
    }

    preserveSelectionOnNextFocus.value = false;
    setSelection({ rowIndex: payload.rowIndex, columnIndex: payload.columnIndex }, false);
  }

  /**
   * Handles keydown events for table navigation and selection.
   * @param event - The keyboard event.
   */
  function onKeyDown(event: KeyboardEvent) {
    const selectionState: NavigationSelectionState = {
      selectionAnchor,
      selectionEnd,
      preserveSelectionOnNextFocus
    };

    handleTableKeyDown({
      event,
      rowsLength: rows.value.length,
      columnsLength: props.columns.length,
      selectionState,
      activePosition,
      setActive,
      setSelection,
      scrollContainer: bodyWrapperElement
    });
  }

  const tableRoot = cva("relative w-full h-full text-sm flex flex-col");
  const headerRow = cva("grid border-b border-gray-300 bg-gray-50 font-medium");
  const headerCell = cva("px-3 py-2 truncate");
  const indexCell = cva("px-2 py-2 text-right text-xs text-gray-500 select-none bg-gray-50");
  const bodyRow = cva("grid border-b border-gray-200");
  const bodyWrapper = cva("relative flex-1 overflow-auto");
</script>

<template>
  <div ref="tableElement" :class="tableRoot()" @paste="handlePasteEvent" @keydown.capture="onKeyDown" @copy.capture="handleCopyEvent">
    <div :class="headerRow()" :style="gridStyle">
      <div :class="indexCell()">#</div>
      <div v-for="column in columns" :key="String(column.rowKey)" :class="headerCell()">
        {{ column.title }}
      </div>
    </div>

    <div :class="bodyWrapper()" ref="bodyWrapperElement">
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

    <EditableTableFooter
      :rows="rows"
      :columns="columns"
      :selection-range="selectionRange"
      :selected-row-indexes="selectedRowIndexes"
      :selected-column-indexes="selectedColumnIndexes" />
  </div>
</template>
