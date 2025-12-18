<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, nextTick, ref, watch } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { ColumnType, EditableTableColumn, defaultColumnTypeOptions, resolveColumnTypeOption } from "@models/column";
  import { EditableTableProps } from "@models/table";
  import { useEditableTableClipboard, type TableSelectionRange } from "@composables/useEditableTableClipboard";
  import { useEditableTableNavigation, type NavigationSelectionState } from "@composables/useEditableTableNavigation";
  import { useEditableTableColumnDrag } from "@composables/useEditableTableColumnDrag";
  import { useEditableTableHistory } from "@composables/useEditableTableHistory";
  import { useEditableTableEditing } from "@composables/useEditableTableEditing";
  import EditableTableColumnMenu from "./EditableTableColumnMenu/EditableTableColumnMenu.vue";
  import EditableTableCell from "./EditableTableCell/EditableTableCell.vue";
  import EditableTableFooter from "./EditableTableFooter/EditableTableFooter.vue";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { faPlus } from "@fortawesome/free-solid-svg-icons";

  type CellPosition = { rowIndex: number; columnIndex: number };
  type CellChange = {
    rowId: string | number;
    columnKey: keyof TRow | string;
    previousValue: TRow[keyof TRow];
    nextValue: TRow[keyof TRow];
  };

  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { idPropertyName: "id", allowColumnTypeChanges: false });

  const rows = defineModel<TRow[]>({ default: () => [] });
  const columns = defineModel<EditableTableColumn<TRow>[]>("columns", { default: () => [] });

  const selectionAnchor = ref<CellPosition | null>(null);
  const selectionEnd = ref<CellPosition | null>(null);
  const preserveSelectionOnNextFocus = ref(false);
  const shouldBlockHeaderClick = ref(false);

  const tableElement = ref<HTMLElement | null>(null);
  const headerRowElement = ref<HTMLElement | null>(null);
  const bodyWrapperElement = ref<HTMLElement | null>(null);
  const columnMenuPosition = ref<{ left: number; top: number } | null>(null);
  const columnMenuIndex = ref<number | null>(null);
  const indexColumnWidth = "3rem";

  const isColumnMenuVisible = ref(false);
  const getColumnTypeOption = (type?: ColumnType) => resolveColumnTypeOption(type, defaultColumnTypeOptions);

  const { pushEntry: pushHistoryEntry, undo, redo } = useEditableTableHistory();
  const { clearActive, activePosition, setActive, handleTableKeyDown, disableScrollOnNextFocus } = useEditableTableNavigation();
  const { startEditing } = useEditableTableEditing();

  onClickOutside(tableElement, () => {
    clearActive();
    selectionAnchor.value = null;
    selectionEnd.value = null;
  });

  function getDefaultValueForColumn(column: EditableTableColumn<TRow>) {
    switch (column.type) {
      case "number":
        return null as TRow[keyof TRow];
      case "boolean":
        return false as TRow[keyof TRow];
      default:
        return "" as TRow[keyof TRow];
    }
  }

  function createEmptyRow(): TRow {
    const nextRow = {} as TRow;

    columns.value.forEach((column) => {
      (nextRow as any)[column.rowKey] = getDefaultValueForColumn(column);
    });

    const idKey = props.idPropertyName as keyof TRow;
    const hasIds = rows.value.some((currentRow) => currentRow?.[idKey] !== undefined && currentRow?.[idKey] !== null);

    if (hasIds && !(idKey in nextRow)) {
      const numericIds = rows.value.map((currentRow) => currentRow?.[idKey]).filter((id) => typeof id === "number" && Number.isFinite(id));

      if (numericIds.length) {
        (nextRow as any)[idKey] = Math.max(...numericIds) + 1;
      } else {
        (nextRow as any)[idKey] = rows.value.length + 1;
      }
    }

    return nextRow;
  }

  function addRow(afterRowIndex?: number) {
    const newRow = createEmptyRow();
    const insertionIndex = typeof afterRowIndex === "number" ? Math.min(afterRowIndex + 1, rows.value.length) : rows.value.length;
    const nextRows = [...rows.value];
    nextRows.splice(insertionIndex, 0, newRow);
    rows.value = nextRows;
    return insertionIndex;
  }

  async function focusAndEditCell(rowIndex: number, columnIndex: number) {
    await nextTick();
    const row = rows.value[rowIndex];
    const column = columns.value[columnIndex];
    if (!row || !column) return;

    const position = { rowIndex, columnIndex };
    setActive(position);
    selectionAnchor.value = position;
    selectionEnd.value = position;
    preserveSelectionOnNextFocus.value = false;

    startEditing({
      rowId: getRowId(row, rowIndex),
      columnKey: String(column.rowKey)
    });
  }

  const gridStyle = computed(() => ({
    gridTemplateColumns: `${indexColumnWidth} repeat(${columns.value.length}, minmax(0, 1fr))`
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
    if (!columns.value.length) return [];
    const { startColumnIndex, endColumnIndex } = selectionRange.value;
    const maximumColumnIndex = Math.max(0, columns.value.length - 1);
    const safeStartColumnIndex = Math.min(Math.max(startColumnIndex, 0), maximumColumnIndex);
    const safeEndColumnIndex = Math.min(Math.max(endColumnIndex, 0), maximumColumnIndex);
    return Array.from({ length: safeEndColumnIndex - safeStartColumnIndex + 1 }, (_, columnOffset) => safeStartColumnIndex + columnOffset);
  });

  const activeColumnMenu = computed(() => {
    if (columnMenuIndex.value === null) return null;
    return columns.value[columnMenuIndex.value] ?? null;
  });

  const draggingColumnClass = computed(() =>
    isDragging.value ? "opacity-30 transition-opacity duration-150 ease-out" : "transition-opacity duration-150 ease-out"
  );

  const draggingColumnBodyClass = computed(() =>
    isDragging.value ?
      "opacity-30 pointer-events-none transition-opacity duration-150 ease-out"
    : "transition-opacity duration-150 ease-out"
  );

  /**
   * Gets the unique identifier for a given row.
   * @param row - The row object.
   * @param rowIndex - The index of the row.
   */
  const getRowId = (row: TRow, rowIndex: number) => {
    const rowId = row[props.idPropertyName as keyof TRow];
    return rowId ?? rowIndex;
  };

  function applyCellChanges(changes: CellChange[], direction: "undo" | "redo") {
    if (!changes.length) return;

    const changesByRow = changes.reduce((accumulator, change) => {
      const current = accumulator.get(change.rowId) ?? [];
      current.push(change);
      accumulator.set(change.rowId, current);
      return accumulator;
    }, new Map<CellChange["rowId"], CellChange[]>());

    rows.value = rows.value.map((row, rowIndex) => {
      const rowId = getRowId(row, rowIndex);
      const rowChanges = changesByRow.get(rowId);
      if (!rowChanges?.length) return row;

      const updatedRow = { ...row };
      rowChanges.forEach((change) => {
        const value = direction === "undo" ? change.previousValue : change.nextValue;
        updatedRow[change.columnKey as keyof TRow] = value;
      });

      return updatedRow;
    });
  }

  function recordCellChanges(changes: CellChange[], description: string) {
    if (!changes.length) return;

    pushHistoryEntry({
      description,
      undo() {
        applyCellChanges(changes, "undo");
      },
      redo() {
        applyCellChanges(changes, "redo");
      }
    });
  }

  function coerceValueForType(value: unknown, type: ColumnType) {
    if (value === null || value === undefined) return { value, changed: false };

    switch (type) {
      case "number": {
        if (value === "") return { value, changed: false };
        if (typeof value === "number") return { value, changed: false };
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) return { value, changed: false };
        return { value: numericValue, changed: !Object.is(value, numericValue) };
      }
      case "boolean": {
        if (value === "") return { value, changed: false };
        if (typeof value === "boolean") return { value, changed: false };
        const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : value;
        if (
          normalizedValue === 1 ||
          normalizedValue === "1" ||
          normalizedValue === "true" ||
          normalizedValue === "yes" ||
          normalizedValue === "on"
        ) {
          return { value: true, changed: !Object.is(value, true) };
        }
        if (
          normalizedValue === 0 ||
          normalizedValue === "0" ||
          normalizedValue === "false" ||
          normalizedValue === "no" ||
          normalizedValue === "off"
        ) {
          return { value: false, changed: !Object.is(value, false) };
        }
        return { value, changed: false };
      }
      case "date": {
        if (value === "") return { value, changed: false };
        const existingDate = value instanceof Date ? value : new Date(value as any);
        if (Number.isNaN(existingDate.getTime())) return { value, changed: false };
        const formattedDate = existingDate.toISOString().slice(0, 10);
        return { value: formattedDate, changed: !Object.is(value, formattedDate) };
      }
      case "text":
      case "select":
      case "custom":
      default:
        return { value, changed: false };
    }
  }

  function coerceColumnValues(columnKey: keyof TRow | string, targetType: ColumnType) {
    const valueChanges: CellChange[] = [];

    rows.value = rows.value.map((row, rowIndex) => {
      const currentValue = row[columnKey as keyof TRow];
      const { value: coercedValue, changed } = coerceValueForType(currentValue, targetType);
      if (!changed) return row;

      const nextRow = { ...row, [columnKey]: coercedValue };
      valueChanges.push({
        rowId: getRowId(row, rowIndex),
        columnKey,
        previousValue: currentValue,
        nextValue: coercedValue as TRow[keyof TRow]
      });

      return nextRow;
    });

    return valueChanges;
  }

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
    selectionEnd.value = { rowIndex, columnIndex: Math.max(0, columns.value.length - 1) };
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

  function onCellCommit(payload: {
    rowIndex: number;
    columnIndex: number;
    rowId: string | number;
    columnKey: string;
    previousValue: TRow[keyof TRow];
    nextValue: TRow[keyof TRow];
  }) {
    const { rowId, columnKey, previousValue, nextValue } = payload;
    if (Object.is(previousValue, nextValue)) return;

    recordCellChanges(
      [
        {
          rowId,
          columnKey,
          previousValue,
          nextValue
        }
      ],
      `Edit ${String(columnKey)}`
    );
  }

  function isEditableEventTarget(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return false;

    const tagName = target.tagName?.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
  }

  /**
   * Handles keydown events for table navigation, selection, and history.
   * @param event - The keyboard event.
   */
  function onKeyDown(event: KeyboardEvent) {
    const isUndoShortcut = (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z";
    const isRedoShortcut =
      (event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));

    if (isUndoShortcut || isRedoShortcut) {
      if (isEditableEventTarget(event)) return;
      event.preventDefault();
      isUndoShortcut ? undo() : redo();
      return;
    }

    const selectionState: NavigationSelectionState = {
      selectionAnchor,
      selectionEnd,
      preserveSelectionOnNextFocus
    };

    handleTableKeyDown({
      event,
      rowsLength: rows.value.length,
      columnsLength: columns.value.length,
      selectionState,
      activePosition,
      setActive,
      scrollContainer: bodyWrapperElement
    });
  }

  async function onAddRowClick(targetColumnIndex = 0) {
    const columnIndex = Math.min(targetColumnIndex, Math.max(0, columns.value.length - 1));
    const newRowIndex = addRow(rows.value.length - 1);
    await nextTick();
    bodyWrapperElement.value?.scrollTo({ top: bodyWrapperElement.value.scrollHeight });
    if (columns.value.length) {
      focusAndEditCell(newRowIndex, columnIndex);
    }
  }

  function onEnterNavigation(payload: { rowIndex: number; columnIndex: number; columnKey: string; isLastRow: boolean }) {
    const targetRowIndex = payload.rowIndex + 1;

    if (payload.isLastRow) {
      const newRowIndex = addRow(payload.rowIndex);
      nextTick(() => {
        bodyWrapperElement.value?.scrollTo({ top: bodyWrapperElement.value.scrollHeight });
        focusAndEditCell(newRowIndex, payload.columnIndex);
      });
      return;
    }

    nextTick(() => {
      focusAndEditCell(targetRowIndex, payload.columnIndex);
    });
  }

  /**
   * Opens the column menu for the specified column index.
   * @param columnIndex - The index of the column to open the menu for.
   * @param event - The mouse or keyboard event that triggered the menu opening.
   */
  function openColumnMenu(columnIndex: number, event: MouseEvent | KeyboardEvent) {
    const headerCellElement = event.currentTarget as HTMLElement | null;
    const tableRect = tableElement.value?.getBoundingClientRect();
    const headerRect = headerCellElement?.getBoundingClientRect();
    if (!tableRect || !headerRect) return;

    columnMenuIndex.value = columnIndex;
    columnMenuPosition.value = {
      left: headerRect.left - tableRect.left + headerRect.width / 2,
      top: headerRect.bottom - tableRect.top + 8
    };
    isColumnMenuVisible.value = true;
  }

  /**
   * Closes the column menu.
   */
  function closeColumnMenu() {
    columnMenuIndex.value = null;
    columnMenuPosition.value = null;
    isColumnMenuVisible.value = false;
  }

  /**
   * Updates the type of the currently selected column in the column menu.
   * @param type - The new column type to set.
   */
  function updateColumnType(type: ColumnType) {
    if (columnMenuIndex.value === null) return;
    if (!props.allowColumnTypeChanges) return;

    const column = columns.value[columnMenuIndex.value];
    if (!column) return;

    const previousType = column.type ?? "text";
    if (previousType === type) return;

    const columnKey = column.rowKey;
    const columnTitle = column.title;

    const applyType = (nextType: ColumnType) => {
      columns.value = columns.value.map((currentColumn) =>
        currentColumn.rowKey === columnKey ? { ...currentColumn, type: nextType } : currentColumn
      );
    };

    const valueChanges = coerceColumnValues(columnKey, type);
    applyType(type);

    pushHistoryEntry({
      description: `Change "${columnTitle}" type to ${type}`,
      undo() {
        applyType(previousType);
        applyCellChanges(valueChanges, "undo");
      },
      redo() {
        applyType(type);
        applyCellChanges(valueChanges, "redo");
      }
    });
  }

  /**
   * Handles header click events to open the column menu.
   * @param columnIndex - The index of the clicked column.
   * @param event - The mouse or keyboard event.
   */
  function onHeaderClick(columnIndex: number, event: MouseEvent | KeyboardEvent) {
    if (shouldBlockHeaderClick.value) return;
    openColumnMenu(columnIndex, event);
  }

  /**
   * Moves the column at the current columnMenuIndex in the specified direction.
   * @param direction - The direction to move the column ("left", "right", "first", "last").
   */
  function moveColumn(direction: "left" | "right" | "first" | "last") {
    if (columnMenuIndex.value === null) return;

    let targetIndex = columnMenuIndex.value;

    switch (direction) {
      case "left":
        targetIndex = columnMenuIndex.value - 1;
        break;
      case "right":
        targetIndex = columnMenuIndex.value + 1;
        break;
      case "first":
        targetIndex = 0;
        break;
      case "last":
        targetIndex = columns.value.length - 1;
        break;
    }

    if (targetIndex < 0 || targetIndex >= columns.value.length || targetIndex === columnMenuIndex.value) {
      return;
    }

    const updatedColumns = [...columns.value];
    const [movedColumn] = updatedColumns.splice(columnMenuIndex.value, 1);
    updatedColumns.splice(targetIndex, 0, movedColumn);

    columns.value = updatedColumns;
    columnMenuIndex.value = targetIndex;
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

  function sortRows(direction: "asc" | "desc") {
    if (columnMenuIndex.value === null) return;
    const column = columns.value[columnMenuIndex.value];
    if (!column) return;

    const columnKey = column.rowKey as keyof TRow;
    const columnType = column.type ?? "text";

    disableScrollOnNextFocus();
    rows.value = [...rows.value].sort((rowA, rowB) => compareValuesForSort(rowA?.[columnKey], rowB?.[columnKey], columnType, direction));
  }

  const { handleCopyEvent, handlePasteEvent } = useEditableTableClipboard<TRow>({
    rows,
    columns,
    selectionRange,
    selectedRowIndexes,
    selectedColumnIndexes,
    getRowId,
    onCellsChanged(changes) {
      recordCellChanges(changes, "Paste values");
    }
  });

  const {
    dragPreviewStyle,
    draggingColumn,
    draggingColumnIndex,
    isDragging,
    onPointerDown: onColumnPointerDown
  } = useEditableTableColumnDrag<TRow>({
    columns,
    tableElement,
    headerRowElement
  });

  watch(
    columns,
    () => {
      if (columnMenuIndex.value === null) return;
      if (!columns.value[columnMenuIndex.value]) {
        closeColumnMenu();
      }
    },
    { deep: true }
  );

  watch(isDragging, (active) => {
    if (active) {
      isColumnMenuVisible.value = false;
      columnMenuIndex.value = null;
      shouldBlockHeaderClick.value = true;
      return;
    }

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        shouldBlockHeaderClick.value = false;
      });
    } else {
      shouldBlockHeaderClick.value = false;
    }
  });

  const tableRoot = cva("relative w-full h-full text-sm flex flex-col");
  const headerRow = cva("relative grid border-b border-gray-300 bg-gray-50 font-medium");
  const headerCell = cva("relative px-3 py-2 truncate cursor-pointer transition-colors hover:bg-white");
  const indexCell = cva("px-2 py-2 text-right text-xs text-gray-500 select-none bg-gray-50");
  const bodyRow = cva("grid border-b border-gray-200");
  const bodyWrapper = cva("relative flex-1 overflow-auto");
  const addRowRow = cva("grid border-b border-gray-200 bg-gray-100 text-gray-600");
  const addRowButton = cva(
    "col-span-full flex items-center justify-center gap-2 py-2 text-sm font-medium w-full cursor-pointer select-none transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
  );
  const addRowIcon = cva("text-gray-500");
</script>

<template>
  <div
    ref="tableElement"
    data-editable-table-root
    :class="tableRoot()"
    @paste="handlePasteEvent"
    @keydown.capture="onKeyDown"
    @copy.capture="handleCopyEvent">
    <div ref="headerRowElement" :class="headerRow()" :style="gridStyle">
      <div :class="indexCell()">#</div>
      <div
        v-for="(column, columnIndex) in columns"
        :key="String(column.rowKey)"
        :class="[headerCell(), draggingColumnIndex === columnIndex ? draggingColumnClass : '', 'flex items-center gap-2 truncate']"
        role="button"
        tabindex="0"
        :data-column-index="columnIndex"
        :data-column-key="String(column.rowKey)"
        @pointerdown="onColumnPointerDown(columnIndex, $event)"
        @click="onHeaderClick(columnIndex, $event)">
        <div class="flex min-w-0 items-center gap-2">
          <FontAwesomeIcon
            v-if="getColumnTypeOption(column.type).icon"
            :icon="getColumnTypeOption(column.type).icon"
            class="text-gray-400"
            size="xs" />
          <span class="truncate">{{ column.title }}</span>
        </div>
      </div>
    </div>

    <div v-if="isDragging && dragPreviewStyle && draggingColumn" class="pointer-events-none absolute z-20" :style="dragPreviewStyle">
      <div class="rounded-md border border-blue-200 bg-white px-3 py-2 shadow-lg ring-2 ring-blue-100">
        {{ draggingColumn.title }}
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
          :class="draggingColumnIndex === columnIndex ? draggingColumnBodyClass : ''"
          @cell-select="onCellSelect"
          @cell-focus="onCellFocus"
          @cell-commit="onCellCommit"
          @enter-navigation="onEnterNavigation" />
      </div>

      <div :class="addRowRow()" :style="gridStyle">
        <button
          type="button"
          :class="addRowButton()"
          title="Add new row"
          aria-label="Add new row"
          @click="onAddRowClick()"
          @keydown.enter.prevent="onAddRowClick()"
          @keydown.space.prevent="onAddRowClick()">
          <FontAwesomeIcon :icon="faPlus" :class="addRowIcon()" />
        </button>
      </div>
    </div>

    <EditableTableFooter
      :rows="rows"
      :columns="columns"
      :selection-range="selectionRange"
      :selected-row-indexes="selectedRowIndexes"
      :selected-column-indexes="selectedColumnIndexes" />

    <EditableTableColumnMenu
      v-if="columnMenuIndex !== null && columnMenuPosition && activeColumnMenu"
      v-model="isColumnMenuVisible"
      :position="columnMenuPosition"
      :column="activeColumnMenu"
      :column-index="columnMenuIndex"
      :columns-length="columns.length"
      :can-change-type="props.allowColumnTypeChanges"
      @select-type="updateColumnType"
      @move-left="moveColumn('left')"
      @move-right="moveColumn('right')"
      @move-first="moveColumn('first')"
      @move-last="moveColumn('last')"
      @sort-ascending="sortRows('asc')"
      @sort-descending="sortRows('desc')" />
  </div>
</template>
