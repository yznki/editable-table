<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref, watch } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { ColumnType, EditableTableColumn, defaultColumnTypeOptions, resolveColumnTypeOption } from "#editable-table/types/column";
  import { EditableTableProps } from "#editable-table/types/table";
  import { useEditableTableClipboard, type TableSelectionRange } from "#editable-table/composables/useEditableTableClipboard";
  import { useEditableTableNavigation, type NavigationSelectionState } from "#editable-table/composables/useEditableTableNavigation";
  import { useEditableTableColumnDrag } from "#editable-table/composables/useEditableTableColumnDrag";
  import { useEditableTableHistory } from "#editable-table/composables/useEditableTableHistory";
  import { useEditableTableEditing } from "#editable-table/composables/useEditableTableEditing";
  import { useEditableTableRows } from "#editable-table/composables/useEditableTableRows";
  import { useEditableTableRowDrag } from "#editable-table/composables/useEditableTableRowDrag";
  import { useEditableTableColumnPreferences } from "#editable-table/composables/useEditableTableColumnPreferences";
  import EditableTableColumnMenu from "#editable-table/components/EditableTable/EditableTableColumnMenu/EditableTableColumnMenu.vue";
  import EditableTableRowMenu from "#editable-table/components/EditableTable/EditableTableRowMenu/EditableTableRowMenu.vue";
  import EditableTableCell from "#editable-table/components/EditableTable/EditableTableCell/EditableTableCell.vue";
  import EditableTableFooter from "#editable-table/components/EditableTable/EditableTableFooter/EditableTableFooter.vue";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { faEyeSlash, faPlus } from "@fortawesome/free-solid-svg-icons";
  import EditableTableHeaderMenu from "#editable-table/components/EditableTable/EditableTableHeaderMenu.vue";

  type CellPosition = { rowIndex: number; columnIndex: number };
  type CellChange = {
    rowId: string | number;
    columnKey: keyof TRow | string;
    previousValue: TRow[keyof TRow];
    nextValue: TRow[keyof TRow];
  };
  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { allowColumnTypeChanges: false });

  const rows = defineModel<TRow[]>({ default: () => [] });
  const columns = defineModel<EditableTableColumn<TRow>[]>("columns", { default: () => [] });

  const ROW_ID_SYMBOL = Symbol("editable-table-row-id");
  let rowIdCounter = 1;
  const rowIdMap = new WeakMap<TRow, string | number>();
  const usedRowIds = new Set<string | number>();

  type RowWithInternalId = TRow & { [ROW_ID_SYMBOL]?: string | number };

  const selectionAnchor = ref<CellPosition | null>(null);
  const selectionEnd = ref<CellPosition | null>(null);
  const preserveSelectionOnNextFocus = ref(false);
  const shouldBlockHeaderClick = ref(false);
  const shouldBlockIndexClick = ref(false);

  const tableElement = ref<HTMLElement | null>(null);
  const headerRowElement = ref<HTMLElement | null>(null);
  const bodyWrapperElement = ref<HTMLElement | null>(null);
  const manualSelectOptions = ref<Record<string, string[]>>({});
  const selectOptions = computed(() => {
    const result: Record<string, string[]> = {};

    columns.value.forEach((column) => {
      if (column.type !== "select") return;
      const key = String(column.rowKey);
      const merged = new Set<string>();

      rows.value.forEach((row) => {
        const option = normalizeSelectOption(row[column.rowKey as keyof TRow]);
        if (option) merged.add(option);
      });

      if (column.allowCustomOptions !== false) {
        const manualOptions = manualSelectOptions.value[key] ?? [];
        manualOptions.forEach((option) => {
          if (merged.has(option)) merged.add(option);
        });
      }

      const presetOptions = column.options ?? [];
      presetOptions.forEach((option) => {
        if (option) merged.add(option);
      });

      result[key] = Array.from(merged);
    });

    return result;
  });
  const columnMenuPosition = ref<{ left: number; top: number } | null>(null);
  const columnMenuIndex = ref<number | null>(null);
  const indexColumnWidth = "3rem";

  const isColumnMenuVisible = ref(false);
  const isHeaderMenuVisible = ref(false);
  const headerMenuPosition = ref<{ left: number; top: number } | null>(null);
  const getColumnTypeOption = (type?: ColumnType) => resolveColumnTypeOption(type, defaultColumnTypeOptions);

  const { pushEntry: pushHistoryEntry, undo, redo } = useEditableTableHistory();
  const { startEditing } = useEditableTableEditing();
  const { clearActive, activePosition, setActive, handleTableKeyDown, disableScrollOnNextFocus } = useEditableTableNavigation();
  const {
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
  } = useEditableTableRows<TRow>({
    rows,
    columns,
    tableElement,
    pushHistoryEntry
  });

  onClickOutside(
    tableElement,
    () => {
      clearActive();
      selectionAnchor.value = null;
      selectionEnd.value = null;
    },
    { ignore: ["[data-context-menu]"] }
  );

  const {
    columnRenderEntries,
    visibleColumnEntries,
    visibleColumns,
    gridTemplateColumns,
    hideColumn,
    revealHiddenColumns,
    recordSort
  } = useEditableTableColumnPreferences<TRow>({
    columns,
    indexColumnWidth,
    storageKey: props.storageKey,
    rowsLength: computed(() => rows.value.length),
    onApplySort(column, direction) {
      sortRowsByColumnInternal(column, direction);
    }
  });

  const gridStyle = computed(() => ({
    gridTemplateColumns: gridTemplateColumns.value
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
    if (!visibleColumns.value.length) return [];
    const { startColumnIndex, endColumnIndex } = selectionRange.value;
    const maximumColumnIndex = Math.max(0, visibleColumns.value.length - 1);
    const safeStartColumnIndex = Math.min(Math.max(startColumnIndex, 0), maximumColumnIndex);
    const safeEndColumnIndex = Math.min(Math.max(endColumnIndex, 0), maximumColumnIndex);
    return Array.from({ length: safeEndColumnIndex - safeStartColumnIndex + 1 }, (_, columnOffset) => safeStartColumnIndex + columnOffset);
  });

  const activeColumnMenu = computed(() => {
    if (columnMenuIndex.value === null) return null;
    return columns.value[columnMenuIndex.value] ?? null;
  });

  const hiddenColumnKeys = computed(() => columns.value.filter((column) => column.hidden).map((column) => String(column.rowKey)));

  const draggingColumnClass = computed(() =>
    isDragging.value ? "opacity-30 transition-opacity duration-150 ease-out" : "transition-opacity duration-150 ease-out"
  );

  const draggingColumnBodyClass = computed(() =>
    isDragging.value ?
      "opacity-30 pointer-events-none transition-opacity duration-150 ease-out"
    : "transition-opacity duration-150 ease-out"
  );

  function normalizeSelectOption(value: unknown) {
    if (value === null || value === undefined) return null;
    const stringValue = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : `${value}`;
    const trimmed = stringValue.trim();
    return trimmed.length ? trimmed : null;
  }

  function addSelectOption(columnKey: string | number, value: unknown) {
    const option = normalizeSelectOption(value);
    if (!option) return;

    const key = String(columnKey);
    const existingOptions = manualSelectOptions.value[key] ?? [];
    if (existingOptions.includes(option)) return;

    manualSelectOptions.value = {
      ...manualSelectOptions.value,
      [key]: [...existingOptions, option]
    };
  }


  function assignRowId(row: TRow, preferredId?: string | number) {
    const mappedId = rowIdMap.get(row);
    if (mappedId !== undefined) return mappedId;

    const typedRow = row as RowWithInternalId;
    const existingId = typedRow[ROW_ID_SYMBOL];
    if (existingId !== undefined) {
      rowIdMap.set(row, existingId);
      usedRowIds.add(existingId);
      return existingId;
    }

    const candidateFromData = (row as Record<string, unknown>).id;
    const dataId = typeof candidateFromData === "string" || typeof candidateFromData === "number" ? candidateFromData : undefined;
    let nextId = preferredId ?? dataId;
    if (nextId === undefined || usedRowIds.has(nextId)) {
      do {
        nextId = `editable-row-${rowIdCounter++}`;
      } while (usedRowIds.has(nextId));
    }

    rowIdMap.set(row, nextId);
    usedRowIds.add(nextId);

    if (Object.isExtensible(row)) {
      Object.defineProperty(row, ROW_ID_SYMBOL, {
        value: nextId,
        writable: false,
        enumerable: false
      });
    }

    return nextId;
  }

  function cloneRowWithId(row: TRow) {
    const rowId = assignRowId(row);
    const clonedRow = { ...row };
    assignRowId(clonedRow, rowId);
    return clonedRow;
  }

  /**
   * Gets the unique identifier for a given row.
   * @param row - The row object.
   */
  const getRowId = (row: TRow) => assignRowId(row);

  function applyCellChanges(changes: CellChange[], direction: "undo" | "redo") {
    if (!changes.length) return;

    const changesByRow = changes.reduce((accumulator, change) => {
      const current = accumulator.get(change.rowId) ?? [];
      current.push(change);
      accumulator.set(change.rowId, current);
      return accumulator;
    }, new Map<CellChange["rowId"], CellChange[]>());

    rows.value = rows.value.map((row) => {
      const rowId = getRowId(row);
      const rowChanges = changesByRow.get(rowId);
      if (!rowChanges?.length) return row;

      const updatedRow = cloneRowWithId(row);
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

    rows.value = rows.value.map((row) => {
      const rowId = getRowId(row);
      const currentValue = row[columnKey as keyof TRow];
      const { value: coercedValue, changed } = coerceValueForType(currentValue, targetType);
      if (!changed) return row;

      const nextRow = cloneRowWithId(row);
      if (coercedValue !== undefined) {
        nextRow[columnKey as keyof TRow] = coercedValue as TRow[keyof TRow];
        valueChanges.push({
          rowId,
          columnKey,
          previousValue: currentValue,
          nextValue: coercedValue as TRow[keyof TRow]
        });
      }

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
    if (shouldBlockIndexClick.value) return;
    const shouldExtendSelection = event.shiftKey && selectionAnchor.value !== null;
    selectRowRange(rowIndex, shouldExtendSelection);
    clearActive();
  }

  function onIndexContextMenu(rowIndex: number, event: MouseEvent) {
    event.preventDefault();
    const shouldExtendSelection = event.shiftKey && selectionAnchor.value !== null;
    selectRowRange(rowIndex, shouldExtendSelection);
    clearActive();
    openRowMenu(rowIndex, event);
  }

  function selectRowRange(rowIndex: number, shouldExtendSelection: boolean) {
    const position: CellPosition = { rowIndex, columnIndex: 0 };
    setSelection({ ...position, columnIndex: 0 }, shouldExtendSelection);
    selectionAnchor.value = selectionAnchor.value ? { ...selectionAnchor.value, columnIndex: 0 } : position;
    selectionEnd.value = { rowIndex, columnIndex: Math.max(0, visibleColumns.value.length - 1) };
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
    const { rowId, columnKey, previousValue, nextValue, columnIndex } = payload;
    if (Object.is(previousValue, nextValue)) return;

    const column = visibleColumnEntries.value[columnIndex]?.column;
    if (column?.type === "select") {
      if (column.allowCustomOptions !== false) {
        addSelectOption(column.rowKey as string, nextValue);
      }
    }

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
      columnsLength: visibleColumns.value.length,
      selectionState,
      activePosition,
      setActive,
      scrollContainer: bodyWrapperElement
    });
  }

  /**
   * Opens the column menu for the specified column index.
   * @param columnIndex - The index of the column to open the menu for.
   * @param event - The mouse or keyboard event that triggered the menu opening.
   */
  function openColumnMenu(columnIndex: number, event: MouseEvent | KeyboardEvent) {
    const headerCellElement = event.currentTarget as HTMLElement | null;
    const headerRect = headerCellElement?.getBoundingClientRect();
    if (!headerRect) return;

    columnMenuIndex.value = columnIndex;
    columnMenuPosition.value = {
      left: headerRect.left + headerRect.width / 2,
      top: headerRect.bottom + 8
    };
    isColumnMenuVisible.value = true;
  }

  function openHeaderMenu(event: MouseEvent) {
    event.preventDefault();
    headerMenuPosition.value = {
      left: event.clientX,
      top: event.clientY
    };
    isHeaderMenuVisible.value = true;
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

  function handleHideColumn() {
    if (columnMenuIndex.value === null) return;
    hideColumn(columnMenuIndex.value);
    closeColumnMenu();
  }

  function toggleColumnVisibility(columnIndex: number) {
    const column = columns.value[columnIndex];
    if (!column) return;
    if (column.hidden) {
      revealHiddenColumns([String(column.rowKey)]);
      return;
    }
    hideColumn(columnIndex);
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

  function sortRowsByColumnInternal(column: EditableTableColumn<TRow>, direction: "asc" | "desc") {
    const columnKey = column.rowKey as keyof TRow;
    const columnType = column.type ?? "text";

    disableScrollOnNextFocus();
    rows.value = [...rows.value].sort((rowA, rowB) => compareValuesForSort(rowA?.[columnKey], rowB?.[columnKey], columnType, direction));
  }

  function sortRows(direction: "asc" | "desc") {
    if (columnMenuIndex.value === null) return;
    const column = columns.value[columnMenuIndex.value];
    if (!column) return;

    sortRowsByColumn(column, direction);
  }

  function sortRowsByColumn(column: EditableTableColumn<TRow>, direction: "asc" | "desc", options?: { persist?: boolean }) {
    sortRowsByColumnInternal(column, direction);
    if (options?.persist === false) return;
    recordSort(String(column.rowKey), direction);
  }

  const { handleCopyEvent, handlePasteEvent } = useEditableTableClipboard<TRow>({
    rows,
    columns: visibleColumns,
    selectionRange,
    selectedRowIndexes,
    selectedColumnIndexes,
    getRowId,
    onCellsChanged(changes) {
      changes.forEach((change) => {
        const column = columns.value.find((col) => String(col.rowKey) === String(change.columnKey));
        if (column?.type === "select") {
          if (column.allowCustomOptions !== false) {
            addSelectOption(column.rowKey as string, change.nextValue);
          }
        }
      });
      recordCellChanges(changes, "Paste values");
    }
  });

  const {
    dragPreviewStyle,
    draggingColumn,
    draggingColumnKey,
    isDragging,
    onPointerDown: onColumnPointerDown
  } = useEditableTableColumnDrag<TRow>({
    columns,
    tableElement,
    headerRowElement
  });

  const {
    dragPreviewStyle: rowDragPreviewStyle,
    draggingRow,
    draggingRowIndex,
    isDragging: isRowDragging,
    onPointerDown: onRowPointerDown
  } = useEditableTableRowDrag<TRow>({
    rows,
    tableElement,
    bodyWrapperElement,
    getRowId
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

  watch(isRowDragging, (active) => {
    if (active) {
      isRowMenuVisible.value = false;
      rowMenuIndex.value = null;
      shouldBlockIndexClick.value = true;
      return;
    }

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        shouldBlockIndexClick.value = false;
      });
    } else {
      shouldBlockIndexClick.value = false;
    }
  });


  watch(
    () => rows.value.length,
    () => {
      if (rowMenuIndex.value !== null && rowMenuIndex.value >= rows.value.length) {
        closeRowMenu();
      }
    }
  );

  watch(visibleColumns, (nextColumns) => {
    if (!selectionAnchor.value || !selectionEnd.value) return;
    const maxIndex = Math.max(0, nextColumns.length - 1);
    selectionAnchor.value = { ...selectionAnchor.value, columnIndex: Math.min(selectionAnchor.value.columnIndex, maxIndex) };
    selectionEnd.value = { ...selectionEnd.value, columnIndex: Math.min(selectionEnd.value.columnIndex, maxIndex) };
  });


  function focusRow(rowIndex: number) {
    if (rowIndex < 0 || rowIndex >= rows.value.length) return;
    selectRowRange(rowIndex, false);
    preserveSelectionOnNextFocus.value = false;
    setActive({ rowIndex, columnIndex: 0 });
  }

  function focusAndEditFirstCell(rowIndex: number) {
    focusRow(rowIndex);
    const firstColumn = visibleColumns.value[0];
    const targetRow = rows.value[rowIndex];
    if (!firstColumn || !targetRow) return;
    const rowId = getRowId(targetRow);
    startEditing({ rowId, columnKey: String(firstColumn.rowKey) });
  }

  function handleInsertRow(direction: "above" | "below") {
    if (rowMenuIndex.value === null) return;
    const insertionIndex = direction === "above" ? insertRowAbove(rowMenuIndex.value) : insertRowBelow(rowMenuIndex.value);
    if (insertionIndex === null) return;
    focusAndEditFirstCell(insertionIndex);
    closeRowMenu();
  }

  function handleMoveRow(direction: "up" | "down") {
    if (rowMenuIndex.value === null) return;
    const nextIndex = direction === "up" ? moveRowUp(rowMenuIndex.value) : moveRowDown(rowMenuIndex.value);
    if (nextIndex === null) return;
    focusRow(nextIndex);
    closeRowMenu();
  }

  function handleDeleteRow() {
    if (rowMenuIndex.value === null) return;
    const nextIndex = deleteRow(rowMenuIndex.value);
    closeRowMenu();
    if (nextIndex === null) {
      selectionAnchor.value = null;
      selectionEnd.value = null;
      return;
    }
    focusRow(nextIndex);
  }

  function handleAppendRow() {
    const newRowIndex = appendRow();
    if (newRowIndex === null) return;
    focusAndEditFirstCell(newRowIndex);
  }

  const tableRoot = cva("relative w-full h-full text-sm flex flex-col text-grey-800");
  const headerRow = cva("relative grid border-b border-grey-300 bg-grey-50 font-medium");
  const headerCell = cva("relative px-3 py-2 truncate cursor-pointer transition-colors hover:bg-white");
  const headerIndexCell = cva("px-2 py-2 text-right text-xs text-grey-500 select-none bg-grey-50");
  const bodyIndexCell = cva("px-2 py-2 text-right text-xs text-grey-500 select-none bg-grey-50");
  const bodyRow = cva("grid border-b border-grey-200");
  const draggingRowClass = "bg-accent-50/40 opacity-70";
  const hiddenIndicatorCell = cva(
    "flex h-full w-full items-center justify-center gap-1 text-grey-400 select-none bg-grey-50/40 hover:bg-grey-100/60"
  );
  const hiddenIndicatorButton = cva(
    "flex items-center gap-1 rounded-full border border-grey-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-grey-500 shadow-sm transition hover:border-grey-300 hover:text-grey-600"
  );
  const bodyWrapper = cva("relative flex-1 overflow-auto");
  const addRowButton = cva(
    "col-span-full flex items-center justify-center gap-1 bg-grey-50 py-2 text-sm text-grey-700 transition hover:bg-grey-100 focus:outline-none focus:ring-0"
  );

  function formatRowPreviewValue(value: unknown, columnType?: ColumnType) {
    if (value === null || value === undefined || value === "") return "";
    if (columnType === "boolean") return value ? "true" : "false";
    return String(value);
  }
</script>

<template>
  <div
    ref="tableElement"
    data-editable-table-root
    :class="tableRoot()"
    @paste="handlePasteEvent"
    @keydown.capture="onKeyDown"
    @copy.capture="handleCopyEvent">
    <div ref="headerRowElement" :class="headerRow()" :style="gridStyle" @contextmenu="openHeaderMenu">
      <div :class="headerIndexCell()">#</div>
      <template v-for="entry in columnRenderEntries" :key="entry.type === 'column' ? String(entry.column.rowKey) : entry.id">
        <div
          v-if="entry.type === 'column'"
          :class="[
            headerCell(),
            draggingColumnKey === String(entry.column.rowKey) ? draggingColumnClass : '',
            'flex items-center gap-2 truncate'
          ]"
          role="button"
          tabindex="0"
          :data-column-index="entry.columnIndex"
          :data-column-key="String(entry.column.rowKey)"
          @pointerdown="onColumnPointerDown(entry.columnIndex, $event)"
          @click="onHeaderClick(entry.columnIndex, $event)">
          <div class="flex min-w-0 items-center gap-2">
            <FontAwesomeIcon
              v-if="getColumnTypeOption(entry.column.type).icon !== undefined"
              :icon="getColumnTypeOption(entry.column.type).icon!"
              class="text-grey-400"
              size="xs" />
            <span class="truncate">{{ entry.column.title }}</span>
          </div>
        </div>
        <button
          v-else
          type="button"
          :class="hiddenIndicatorCell()"
          :title="`Show ${entry.hiddenColumnKeys.length} hidden column${entry.hiddenColumnKeys.length > 1 ? 's' : ''}`"
          @click="revealHiddenColumns(entry.hiddenColumnKeys)">
          <span :class="hiddenIndicatorButton()">
            <FontAwesomeIcon :icon="faEyeSlash" class="h-3 w-3" />
            <span>{{ entry.hiddenColumnKeys.length }}</span>
          </span>
        </button>
      </template>
    </div>

    <div v-if="isDragging && dragPreviewStyle && draggingColumn" class="pointer-events-none absolute z-20" :style="dragPreviewStyle">
      <div class="rounded-md border border-accent-200 bg-white px-3 py-2 shadow-lg ring-2 ring-accent-100">
        {{ draggingColumn.title }}
      </div>
    </div>

    <div
      v-if="isRowDragging && rowDragPreviewStyle && draggingRowIndex !== null && draggingRow"
      class="pointer-events-none absolute z-20"
      :style="rowDragPreviewStyle">
      <div class="grid overflow-hidden rounded-md border border-accent-200 bg-white shadow-lg ring-2 ring-accent-100" :style="gridStyle">
        <div class="px-2 py-2 text-right text-xs font-semibold text-accent-200 bg-accent-50">
          {{ draggingRowIndex + 1 }}
        </div>
        <template v-for="entry in columnRenderEntries" :key="entry.type === 'column' ? `drag-${String(entry.column.rowKey)}` : `drag-${entry.id}`">
          <div
            v-if="entry.type === 'column'"
            class="px-3 py-2 text-sm text-grey-800 border-l border-accent-100 truncate">
            {{ formatRowPreviewValue(draggingRow[entry.column.rowKey as keyof TRow], entry.column.type) }}
          </div>
          <div v-else class="flex items-center justify-center border-l border-accent-100">
            <span class="h-3 w-px rounded-full bg-accent-100" />
          </div>
        </template>
      </div>
    </div>

    <div :class="bodyWrapper()" ref="bodyWrapperElement">
      <div
        v-for="(row, rowIndex) in rows"
        :key="String(getRowId(row))"
        :data-row-id="String(getRowId(row))"
        :data-row-index="rowIndex"
        :class="[bodyRow(), draggingRowIndex === rowIndex ? draggingRowClass : '']"
        :style="gridStyle">
        <div
          :class="bodyIndexCell()"
          @pointerdown="onRowPointerDown(rowIndex, $event)"
          @click="onIndexClick(rowIndex, $event)"
          @contextmenu="onIndexContextMenu(rowIndex, $event)">
          {{ rowIndex + 1 }}
        </div>
        <template v-for="entry in columnRenderEntries" :key="entry.type === 'column' ? String(entry.column.rowKey) : entry.id">
          <EditableTableCell
            v-if="entry.type === 'column'"
            v-model="rows[rowIndex][entry.column.rowKey as keyof TRow]"
            :row-id="getRowId(row)"
            :row-data="row"
            :column-key="entry.column.rowKey"
            :column-type="entry.column.type"
            :column-required="entry.column.required"
            :column-validation="entry.column.validate"
            :column-allow-custom-options="entry.column.allowCustomOptions"
            :row-index="rowIndex"
            :column-index="entry.visibleIndex"
            :row-count="rows.length"
            :column-count="visibleColumns.length"
            :selection-range="selectionRange"
            :select-options="selectOptions[String(entry.column.rowKey)] ?? []"
            :class="draggingColumnKey === String(entry.column.rowKey) ? draggingColumnBodyClass : ''"
            @cell-select="onCellSelect"
            @cell-focus="onCellFocus"
            @cell-commit="onCellCommit" />
          <div v-else :class="hiddenIndicatorCell()">
            <span class="h-3 w-px rounded-full bg-grey-300/70" />
          </div>
        </template>
      </div>

      <div v-if="columns.length" class="grid" :style="gridStyle">
        <button type="button" :class="addRowButton()" style="grid-column: 1 / -1" @click="handleAppendRow">
          <FontAwesomeIcon :icon="faPlus" class="h-4 w-4 text-grey-600" size="xs" />
          <span class="text-xs">Add row</span>
        </button>
      </div>
    </div>

    <EditableTableFooter
      :rows="rows"
      :columns="visibleColumns"
      :selection-range="selectionRange"
      :selected-row-indexes="selectedRowIndexes"
      :selected-column-indexes="selectedColumnIndexes" />

    <EditableTableRowMenu
      v-if="rowMenuIndex !== null && rowMenuPosition"
      v-model="isRowMenuVisible"
      :position="rowMenuPosition"
      :row-index="rowMenuIndex"
      :rows-length="rows.length"
      @insert-above="handleInsertRow('above')"
      @insert-below="handleInsertRow('below')"
      @move-up="handleMoveRow('up')"
      @move-down="handleMoveRow('down')"
      @delete-row="handleDeleteRow" />

    <EditableTableColumnMenu
      v-if="columnMenuIndex !== null && columnMenuPosition && activeColumnMenu"
      v-model="isColumnMenuVisible"
      :position="columnMenuPosition"
      :column="activeColumnMenu"
      :column-index="columnMenuIndex"
      :columns-length="columns.length"
      :can-change-type="props.allowColumnTypeChanges"
      @select-type="updateColumnType"
      @hide-column="handleHideColumn"
      @move-left="moveColumn('left')"
      @move-right="moveColumn('right')"
      @move-first="moveColumn('first')"
      @move-last="moveColumn('last')"
      @sort-ascending="sortRows('asc')"
      @sort-descending="sortRows('desc')" />

    <EditableTableHeaderMenu
      v-if="headerMenuPosition"
      v-model="isHeaderMenuVisible"
      :position="headerMenuPosition"
      :columns="columns"
      :hidden-column-keys="hiddenColumnKeys"
      @toggle-column="toggleColumnVisibility"
      @show-hidden="() => revealHiddenColumns(hiddenColumnKeys)" />
  </div>
</template>
