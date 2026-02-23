import { computed, ref } from "vue";
import { useEventListener } from "@vueuse/core";

/**
 * Minimal tab item model for drag operations.
 */
interface TabItem {
  /**
   * Unique tab identifier.
   */
  id: string;

  /**
   * Display name used in drag preview.
   */
  name: string;
}

/**
 * Options for requirement-set tab drag behavior.
 */
interface UseRequirementSetTabDragOptions {
  /**
   * Container element reference for preview positioning.
   */
  containerEl: { value: HTMLElement | null };

  /**
   * Strip element reference used for pointer metrics.
   */
  stripEl: { value: HTMLElement | null };

  /**
   * Getter returning current ordered tab items.
   */
  getItems: () => TabItem[];

  /**
   * Callback invoked with reordered identifiers during drag.
   */
  onReorder: (orderedIds: string[]) => void;
}

/**
 * Provides drag-and-drop behavior for requirement-set tabs.
 * @param options Configuration for drag metrics and reorder callback.
 * @returns Drag state and handlers for tab interactions.
 */
export function useRequirementSetTabDrag(options: UseRequirementSetTabDragOptions) {
  const isTabPointerDown = ref(false);
  const isTabDragging = ref(false);
  const dragStartPointerX = ref(0);
  const currentPointerX = ref(0);
  const draggingSheetId = ref<string | null>(null);
  const draggingSheetIndex = ref<number | null>(null);
  const pointerOriginElement = ref<HTMLElement | null>(null);
  const initialSheetOrder = ref<string[]>([]);
  const previousBodyUserSelect = ref<string | null>(null);
  const suppressTabClick = ref(false);
  const dragPreviewDimensions = ref<{ width: number; height: number; left: number; top: number } | null>(null);

  const draggingSheet = computed(() => {
    if (!draggingSheetId.value) return null;
    return options.getItems().find((sheet) => sheet.id === draggingSheetId.value) ?? null;
  });

  const tabDragPreviewStyle = computed(() => {
    if (!isTabDragging.value || !dragPreviewDimensions.value) return null;

    const deltaPointerX = currentPointerX.value - dragStartPointerX.value;
    const { width, height, left, top } = dragPreviewDimensions.value;

    return {
      width: `${width}px`,
      height: `${height}px`,
      left: `${left}px`,
      top: `${top}px`,
      transform: `translateX(${deltaPointerX}px)`
    };
  });

  /**
   * Restores user-select style after dragging.
   * @returns void
   */
  function resetBodyUserSelect() {
    if (previousBodyUserSelect.value === null) return;
    document.body.style.userSelect = previousBodyUserSelect.value;
    previousBodyUserSelect.value = null;
  }

  /**
   * Resets all drag state fields.
   * @returns void
   */
  function resetTabDragState() {
    isTabPointerDown.value = false;
    isTabDragging.value = false;
    draggingSheetIndex.value = null;
    draggingSheetId.value = null;
    pointerOriginElement.value = null;
    dragPreviewDimensions.value = null;
    initialSheetOrder.value = [];
    resetBodyUserSelect();
  }

  /**
   * Collects visible tab metrics excluding the active drag item.
   * @param activeIdentifier Dragging tab identifier.
   * @returns Sorted positional metrics for insertion logic.
   */
  function collectTabMetrics(activeIdentifier: string | null) {
    const stripElement = options.stripEl.value;
    if (!stripElement) return [];

    const stripRectangle = stripElement.getBoundingClientRect();

    return Array.from(stripElement.querySelectorAll<HTMLElement>("[data-sheet-id]"))
      .map((tabElement) => {
        const tabRectangle = tabElement.getBoundingClientRect();
        return { id: tabElement.dataset.sheetId ?? "", left: tabRectangle.left - stripRectangle.left, width: tabRectangle.width };
      })
      .filter((metric) => metric.id && metric.id !== activeIdentifier)
      .sort((firstMetric, secondMetric) => firstMetric.left - secondMetric.left);
  }

  /**
   * Resolves insertion index for the current pointer position.
   * @param relativePointerX Pointer x relative to the strip element.
   * @param activeIdentifier Dragging tab identifier.
   * @param isDraggingRight Whether drag direction is to the right.
   * @returns Insertion index or null when inactive.
   */
  function findTabInsertionIndex(relativePointerX: number, activeIdentifier: string | null, isDraggingRight: boolean) {
    if (!activeIdentifier) return null;

    const metrics = collectTabMetrics(activeIdentifier);
    if (!metrics.length) return 0;

    const insertionThreshold = isDraggingRight ? 0.1 : 0.9;
    for (let index = 0; index < metrics.length; index++) {
      const metric = metrics[index];
      if (!metric) continue;
      if (relativePointerX < metric.left + metric.width * insertionThreshold) return index;
    }

    return metrics.length;
  }

  /**
   * Emits reordered identifiers at the computed insertion index.
   * @param insertionIndex Target insertion index.
   * @returns void
   */
  function reorderSheets(insertionIndex: number | null) {
    const activeIdentifier = draggingSheetId.value;
    if (insertionIndex === null || !activeIdentifier) return;

    const currentIdentifiers = options.getItems().map((item) => item.id);
    const activeIndex = currentIdentifiers.findIndex((identifier) => identifier === activeIdentifier);
    if (activeIndex === -1) return;

    const remainingIdentifiers = currentIdentifiers.filter((identifier) => identifier !== activeIdentifier);
    const clampedIndex = Math.min(Math.max(0, insertionIndex), remainingIdentifiers.length);
    remainingIdentifiers.splice(clampedIndex, 0, activeIdentifier);

    options.onReorder(remainingIdentifiers);
    draggingSheetIndex.value = remainingIdentifiers.findIndex((identifier) => identifier === activeIdentifier);
  }

  /**
   * Starts drag mode and captures initial dimensions.
   * @param index Tab index where dragging started.
   * @returns void
   */
  function beginTabDragging(index: number) {
    const containerElement = options.containerEl.value;
    const originTabElement = pointerOriginElement.value;
    const tabItems = options.getItems();
    if (!containerElement || !originTabElement || !tabItems.length) return;

    const containerRectangle = containerElement.getBoundingClientRect();
    const tabRectangle = originTabElement.getBoundingClientRect();
    const activeTabItem = tabItems[index];
    if (!activeTabItem) return;

    isTabDragging.value = true;
    draggingSheetIndex.value = index;
    draggingSheetId.value = activeTabItem.id;
    dragPreviewDimensions.value = {
      width: tabRectangle.width,
      height: tabRectangle.height,
      left: tabRectangle.left - containerRectangle.left,
      top: tabRectangle.top - containerRectangle.top
    };
    initialSheetOrder.value = tabItems.map((item) => item.id);

    previousBodyUserSelect.value = document.body.style.userSelect;
    document.body.style.userSelect = "none";
  }

  /**
   * Updates drag position and applies reorder logic.
   * @param event Pointer move event.
   * @returns void
   */
  function updateTabDragPosition(event: PointerEvent) {
    if (!isTabPointerDown.value) return;

    const previousPointerX = currentPointerX.value;
    currentPointerX.value = event.clientX;
    const isDraggingRight = currentPointerX.value >= previousPointerX;
    const hasMovedEnough = Math.abs(currentPointerX.value - dragStartPointerX.value) > 4;

    if (!isTabDragging.value && hasMovedEnough) {
      beginTabDragging(draggingSheetIndex.value ?? 0);
    }

    const stripElement = options.stripEl.value;
    if (!isTabDragging.value || !stripElement) return;

    event.preventDefault();

    const stripRectangle = stripElement.getBoundingClientRect();
    const relativePointerX = currentPointerX.value - stripRectangle.left;
    const insertionIndex = findTabInsertionIndex(relativePointerX, draggingSheetId.value, isDraggingRight);
    reorderSheets(insertionIndex);
  }

  /**
   * Commits drag operation and clears transient state.
   * @returns void
   */
  function commitTabDrag() {
    if (isTabDragging.value) {
      suppressTabClick.value = true;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          suppressTabClick.value = false;
        });
      } else {
        suppressTabClick.value = false;
      }
    }

    resetTabDragState();
  }

  /**
   * Cancels drag and restores initial tab order.
   * @returns void
   */
  function cancelTabDrag() {
    if (isTabDragging.value && initialSheetOrder.value.length) {
      options.onReorder([...initialSheetOrder.value]);
    }

    resetTabDragState();
  }

  /**
   * Handles pointer down and primes drag tracking.
   * @param index Tab index at pointer down.
   * @param event Pointer event.
   * @returns void
   */
  function onSheetPointerDown(index: number, event: PointerEvent) {
    if (event.button !== 0) return;

    const targetElement = event.target as HTMLElement | null;
    if (targetElement?.closest("[data-tab-action='true']")) return;

    isTabPointerDown.value = true;
    dragStartPointerX.value = event.clientX;
    currentPointerX.value = event.clientX;
    draggingSheetIndex.value = index;
    pointerOriginElement.value = event.currentTarget as HTMLElement | null;
  }

  /**
   * Prevents click behavior immediately after a drag.
   * @param event Mouse event to optionally suppress.
   * @returns True when click was suppressed.
   */
  function shouldSuppressClick(event: MouseEvent) {
    if (!suppressTabClick.value) return false;
    event.preventDefault();
    return true;
  }

  if (import.meta.client) {
    useEventListener(window, "pointermove", updateTabDragPosition, { passive: false });
    useEventListener(window, "pointerup", commitTabDrag);
    useEventListener(window, "pointercancel", cancelTabDrag);
  }

  return {
    isTabDragging,
    draggingSheetId,
    draggingSheet,
    tabDragPreviewStyle,
    onSheetPointerDown,
    shouldSuppressClick,
    cancelTabDrag
  };
}
