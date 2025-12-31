import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import { useEventListener, useMagicKeys } from "@vueuse/core";

interface RowDragOptions<TRow extends Record<string, any>> {
  rows: Ref<TRow[]>;
  tableElement: Ref<HTMLElement | null>;
  bodyWrapperElement: Ref<HTMLElement | null>;
  getRowId: (row: TRow) => string | number;
}

interface DragPreviewDimensions {
  width: number;
  height: number;
  left: number;
  top: number;
}

interface RowMetric {
  id: string;
  top: number;
  height: number;
}

export function useEditableTableRowDrag<TRow extends Record<string, any>>(options: RowDragOptions<TRow>) {
  const { rows, tableElement, bodyWrapperElement, getRowId } = options;
  const { escape: escapeKey } = useMagicKeys();

  const isPointerDown = ref(false);
  const isDragging = ref(false);
  const dragStartY = ref(0);
  const currentY = ref(0);
  const draggingRowId = ref<string | null>(null);
  const draggingRowIndex = ref<number | null>(null);
  const dragPreviewDimensions = ref<DragPreviewDimensions | null>(null);
  const initialRowOrder = ref<TRow[]>([]);
  const previousUserSelect = ref<string | null>(null);
  const pointerOriginElement = ref<HTMLElement | null>(null);

  const dragPreviewStyle = computed(() => {
    if (!isDragging.value || !dragPreviewDimensions.value) return null;
    const deltaY = currentY.value - dragStartY.value;
    const { width, height, left, top } = dragPreviewDimensions.value;
    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translateY(${deltaY}px)`,
      left: `${left}px`,
      top: `${top}px`
    } satisfies Partial<CSSStyleDeclaration>;
  });

  const draggingRow = computed(() => {
    if (!draggingRowId.value) return null;
    return rows.value.find((row) => String(getRowId(row)) === draggingRowId.value) ?? null;
  });

  function resetUserSelect() {
    if (previousUserSelect.value === null) return;
    document.body.style.userSelect = previousUserSelect.value;
    previousUserSelect.value = null;
  }

  function resetDragState() {
    isPointerDown.value = false;
    isDragging.value = false;
    draggingRowId.value = null;
    draggingRowIndex.value = null;
    dragPreviewDimensions.value = null;
    initialRowOrder.value = [];
    pointerOriginElement.value = null;
    resetUserSelect();
  }

  function collectRowMetrics(activeId: string | null): RowMetric[] {
    const body = bodyWrapperElement.value;
    if (!body) return [];

    const bodyRect = body.getBoundingClientRect();

    return Array.from(body.querySelectorAll<HTMLElement>("[data-row-id]"))
      .map((rowElement) => {
        const rect = rowElement.getBoundingClientRect();
        return {
          id: rowElement.dataset.rowId ?? "",
          top: rect.top - bodyRect.top,
          height: rect.height
        } satisfies RowMetric;
      })
      .filter((metric) => metric.id && metric.id !== activeId)
      .sort((metricA, metricB) => metricA.top - metricB.top);
  }

  function findInsertionIndex(relativeY: number, activeId: string | null, isDraggingDown: boolean) {
    if (!activeId) return null;
    const metrics = collectRowMetrics(activeId);
    if (!metrics.length) return 0;

    const insertionThreshold = isDraggingDown ? 0.1 : 0.9;

    for (let index = 0; index < metrics.length; index++) {
      const { top, height } = metrics[index];
      if (relativeY < top + height * insertionThreshold) return index;
    }

    return metrics.length;
  }

  function reorderRows(insertionIndex: number | null) {
    if (insertionIndex === null) return;
    if (!draggingRowId.value) return;

    const activeId = draggingRowId.value;
    const currentRows = [...rows.value];
    const activeIndex = currentRows.findIndex((row) => String(getRowId(row)) === activeId);
    if (activeIndex === -1) return;

    const activeRow = currentRows[activeIndex];
    const remainingRows = currentRows.filter((row) => String(getRowId(row)) !== activeId);

    const clampedIndex = Math.min(Math.max(0, insertionIndex), remainingRows.length);
    remainingRows.splice(clampedIndex, 0, activeRow);

    rows.value = remainingRows;
    draggingRowIndex.value = remainingRows.findIndex((row) => String(getRowId(row)) === activeId);
  }

  function beginDragging(rowIndex: number) {
    const table = tableElement.value;
    const rowElement = pointerOriginElement.value;
    if (!table || !rowElement) return;

    const tableRect = table.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();

    isDragging.value = true;
    draggingRowIndex.value = rowIndex;
    draggingRowId.value = rowElement.dataset.rowId ?? String(getRowId(rows.value[rowIndex]));
    dragPreviewDimensions.value = {
      width: rowRect.width,
      height: rowRect.height,
      left: rowRect.left - tableRect.left,
      top: rowRect.top - tableRect.top
    } satisfies DragPreviewDimensions;

    initialRowOrder.value = [...rows.value];

    previousUserSelect.value = document.body.style.userSelect;
    document.body.style.userSelect = "none";
  }

  function updateDragPosition(event: PointerEvent) {
    if (!isPointerDown.value) return;

    const previousY = currentY.value;
    currentY.value = event.clientY;
    const isDraggingDown = currentY.value >= previousY;
    const hasMovedEnough = Math.abs(currentY.value - dragStartY.value) > 4;
    if (!isDragging.value && hasMovedEnough) {
      beginDragging(draggingRowIndex.value ?? 0);
    }

    if (!isDragging.value || !bodyWrapperElement.value) return;
    event.preventDefault();

    const bodyRect = bodyWrapperElement.value.getBoundingClientRect();
    const relativeY = currentY.value - bodyRect.top;
    const insertionIndex = findInsertionIndex(relativeY, draggingRowId.value, isDraggingDown);
    reorderRows(insertionIndex);
  }

  function commitDrag() {
    resetDragState();
  }

  function cancelDrag() {
    if (isDragging.value && initialRowOrder.value.length) {
      rows.value = initialRowOrder.value.map((row) => row);
    }
    resetDragState();
  }

  function onPointerDown(rowIndex: number, event: PointerEvent) {
    if (event.button !== 0) return;
    isPointerDown.value = true;
    dragStartY.value = event.clientY;
    currentY.value = event.clientY;
    draggingRowIndex.value = rowIndex;
    pointerOriginElement.value =
      (event.currentTarget as HTMLElement | null)?.closest("[data-row-id]") ?? (event.currentTarget as HTMLElement | null);
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
    draggingRow,
    draggingRowIndex,
    isDragging,
    onPointerDown
  };
}
