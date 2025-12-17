import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import { useEventListener, useMagicKeys } from "@vueuse/core";
import { EditableTableColumn } from "@models/column";

interface ColumnDragOptions<TRow extends Record<string, any>> {
  columns: Ref<EditableTableColumn<TRow>[]>;
  tableElement: Ref<HTMLElement | null>;
  headerRowElement: Ref<HTMLElement | null>;
}

interface DragPreviewDimensions {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface ColumnMetric {
  key: string;
  left: number;
  width: number;
}

export function useEditableTableColumnDrag<TRow extends Record<string, any>>(options: ColumnDragOptions<TRow>) {
  const { columns, tableElement, headerRowElement } = options;

  const { escape: escapeKey } = useMagicKeys();

  const isPointerDown = ref(false);
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const currentX = ref(0);
  const draggingColumnKey = ref<string | null>(null);
  const draggingColumnIndex = ref<number | null>(null);
  const dragPreviewDimensions = ref<DragPreviewDimensions | null>(null);
  const initialColumnOrder = ref<EditableTableColumn<TRow>[]>([]);
  const previousUserSelect = ref<string | null>(null);
  const pointerOriginElement = ref<HTMLElement | null>(null);

  const dragPreviewStyle = computed(() => {
    if (!isDragging.value || !dragPreviewDimensions.value) return null;

    const deltaX = currentX.value - dragStartX.value;
    const { width, height, left, top } = dragPreviewDimensions.value;

    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translateX(${deltaX}px)`,
      left: `${left}px`,
      top: `${top}px`
    } satisfies Partial<CSSStyleDeclaration>;
  });

  const draggingColumn = computed(() => {
    if (!draggingColumnKey.value) return null;
    return columns.value.find((column) => String(column.rowKey) === draggingColumnKey.value) ?? null;
  });

  function resetUserSelect() {
    if (previousUserSelect.value === null) return;
    document.body.style.userSelect = previousUserSelect.value;
    previousUserSelect.value = null;
  }

  function resetDragState() {
    isPointerDown.value = false;
    isDragging.value = false;
    draggingColumnKey.value = null;
    draggingColumnIndex.value = null;
    dragPreviewDimensions.value = null;
    initialColumnOrder.value = [];
    pointerOriginElement.value = null;
    resetUserSelect();
  }

  function collectColumnMetrics(activeKey: string | null): ColumnMetric[] {
    const headerRow = headerRowElement.value;
    if (!headerRow) return [];

    const headerRect = headerRow.getBoundingClientRect();

    return Array.from(headerRow.querySelectorAll<HTMLElement>("[data-column-key]"))
      .map((cell) => {
        const rect = cell.getBoundingClientRect();
        return {
          key: cell.dataset.columnKey ?? "",
          left: rect.left - headerRect.left,
          width: rect.width
        } satisfies ColumnMetric;
      })
      .filter((metric) => metric.key && metric.key !== activeKey)
      .sort((a, b) => a.left - b.left);
  }

  function findInsertionIndex(relativeX: number, activeKey: string | null) {
    if (!activeKey) return null;
    const metrics = collectColumnMetrics(activeKey);
    if (!metrics.length) return 0;

    for (let index = 0; index < metrics.length; index++) {
      const { left, width } = metrics[index];
      const swapThreshold = width * 0.35;
      if (relativeX < left + swapThreshold) return index;
    }

    return metrics.length;
  }

  function reorderColumns(insertionIndex: number | null) {
    if (insertionIndex === null) return;
    if (!draggingColumnKey.value) return;

    const activeKey = draggingColumnKey.value;
    const currentColumns = [...columns.value];
    const activeIndex = currentColumns.findIndex((column) => String(column.rowKey) === activeKey);
    if (activeIndex === -1) return;

    const activeColumn = currentColumns[activeIndex];
    const remainingColumns = currentColumns.filter((column) => String(column.rowKey) !== activeKey);

    const clampedIndex = Math.min(Math.max(0, insertionIndex), remainingColumns.length);
    remainingColumns.splice(clampedIndex, 0, activeColumn);

    columns.value = remainingColumns;
    draggingColumnIndex.value = remainingColumns.findIndex((column) => String(column.rowKey) === activeKey);
  }

  function beginDragging(columnIndex: number) {
    const headerRow = headerRowElement.value;
    const table = tableElement.value;
    const headerCell = pointerOriginElement.value;

    if (!headerRow || !table || !headerCell) return;

    const tableRect = table.getBoundingClientRect();
    const cellRect = headerCell.getBoundingClientRect();

    isDragging.value = true;
    draggingColumnIndex.value = columnIndex;
    draggingColumnKey.value = headerCell.dataset.columnKey ?? String(columns.value[columnIndex]?.rowKey ?? "");
    dragPreviewDimensions.value = {
      width: cellRect.width,
      height: cellRect.height,
      left: cellRect.left - tableRect.left,
      top: cellRect.top - tableRect.top
    } satisfies DragPreviewDimensions;

    initialColumnOrder.value = [...columns.value];

    previousUserSelect.value = document.body.style.userSelect;
    document.body.style.userSelect = "none";
  }

  function updateDragPosition(event: PointerEvent) {
    if (!isPointerDown.value) return;

    currentX.value = event.clientX;
    const hasMovedEnough = Math.abs(currentX.value - dragStartX.value) > 4;
    if (!isDragging.value && hasMovedEnough) {
      beginDragging(draggingColumnIndex.value ?? 0);
    }

    if (!isDragging.value || !headerRowElement.value) return;
    event.preventDefault();

    const headerRect = headerRowElement.value.getBoundingClientRect();
    const relativeX = currentX.value - headerRect.left;
    const insertionIndex = findInsertionIndex(relativeX, draggingColumnKey.value);
    reorderColumns(insertionIndex);
  }

  function commitDrag() {
    resetDragState();
  }

  function cancelDrag() {
    if (isDragging.value && initialColumnOrder.value.length) {
      columns.value = initialColumnOrder.value;
    }
    resetDragState();
  }

  function onPointerDown(columnIndex: number, event: PointerEvent) {
    if (event.button !== 0) return;
    isPointerDown.value = true;
    dragStartX.value = event.clientX;
    currentX.value = event.clientX;
    draggingColumnIndex.value = columnIndex;
    pointerOriginElement.value = event.currentTarget as HTMLElement | null;
  }

  const stopPointerMove =
    typeof window !== "undefined" ? useEventListener(window, "pointermove", updateDragPosition, { passive: false }) : () => {};
  const stopPointerUp = typeof window !== "undefined" ? useEventListener(window, "pointerup", commitDrag) : () => {};
  const stopPointerCancel = typeof window !== "undefined" ? useEventListener(window, "pointercancel", cancelDrag) : () => {};

  watch(escapeKey, (pressed) => {
    if (!pressed) return;
    if (isDragging.value) {
      cancelDrag();
    }
  });

  onBeforeUnmount(() => {
    stopPointerMove();
    stopPointerUp();
    stopPointerCancel();
    resetUserSelect();
  });

  return {
    cancelDrag,
    dragPreviewStyle,
    draggingColumn,
    draggingColumnIndex,
    draggingColumnKey,
    isDragging,
    onPointerDown
  };
}
