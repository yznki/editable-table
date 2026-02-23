import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";
import { useEventListener, useMagicKeys } from "@vueuse/core";
import { type EditableTableColumn } from "#editable-table/types/column";

/**
 * Visible column entry used by resize behavior.
 */
interface VisibleColumnEntry<TRow extends Record<string, any>> {
  /**
   * Column definition.
   */
  column: EditableTableColumn<TRow>;

  /**
   * Index in the full columns list.
   */
  columnIndex: number;

  /**
   * Visible order index.
   */
  visibleIndex: number;
}

/**
 * Resize composable configuration.
 */
interface UseEditableTableColumnResizeOptions<TRow extends Record<string, any>> {
  /**
   * Reactive table columns.
   */
  columns: Ref<EditableTableColumn<TRow>[]>;

  /**
   * Header row element containing visible column cells.
   */
  headerRowElement: Ref<HTMLElement | null>;

  /**
   * Visible column entries in render order.
   */
  visibleColumnEntries: ComputedRef<VisibleColumnEntry<TRow>[]>;
}

/**
 * Column resize state during pointer interaction.
 */
interface ResizeSession<TRow extends Record<string, any>> {
  /**
   * Resized column index in full columns list.
   */
  activeColumnIndex: number;

  /**
   * Resized column key string.
   */
  activeColumnKey: string;

  /**
   * Active column visible index.
   */
  activeVisibleIndex: number;

  /**
   * Pointer start x position.
   */
  startX: number;

  /**
   * Start widths for visible columns.
   */
  startWidths: number[];

  /**
   * Minimum widths for visible columns.
   */
  minimumWidths: number[];

  /**
   * Original column width values to restore on cancel.
   */
  originalWidthsByColumnIndex: Map<number, number | string | undefined>;

  /**
   * Visible entries snapshot at resize start.
   */
  visibleEntries: VisibleColumnEntry<TRow>[];
}

const DEFAULT_MINIMUM_COLUMN_WIDTH_IN_PIXELS = 96;

/**
 * Provides production-grade column resize with hard constraints and right-side redistribution.
 * @param options Resize options.
 * @returns Resize controls and reactive resize flags.
 */
export function useEditableTableColumnResize<TRow extends Record<string, any>>(options: UseEditableTableColumnResizeOptions<TRow>) {
  const { columns, headerRowElement, visibleColumnEntries } = options;
  const { escape: escapeKey } = useMagicKeys();

  const resizeSession = ref<ResizeSession<TRow> | null>(null);
  const isResizing = computed(() => resizeSession.value !== null);
  const resizingColumnKey = computed(() => resizeSession.value?.activeColumnKey ?? null);

  let previousBodyUserSelect = "";
  let previousBodyCursor = "";

  /**
   * Resolves minimum width for a column.
   * @param column Target column.
   * @returns Minimum width in pixels.
   */
  function getMinimumWidth(column: EditableTableColumn<TRow>) {
    const configuredMinimumWidth =
      typeof column.minWidth === "number" && Number.isFinite(column.minWidth) ? Math.floor(column.minWidth) : DEFAULT_MINIMUM_COLUMN_WIDTH_IN_PIXELS;
    return Math.max(64, configuredMinimumWidth);
  }

  /**
   * Reads visible header cell widths.
   * @param entries Visible column entries.
   * @returns Widths in visible order.
   */
  function readVisibleColumnWidths(entries: VisibleColumnEntry<TRow>[]) {
    const headerRow = headerRowElement.value;
    if (!headerRow) return null;

    const widths: number[] = [];
    for (const entry of entries) {
      const headerCell = headerRow.querySelector<HTMLElement>(`[data-column-index="${entry.columnIndex}"]`);
      if (!headerCell) return null;
      widths.push(headerCell.getBoundingClientRect().width);
    }
    return widths;
  }

  /**
   * Applies computed widths to columns as `fr` tracks.
   * @param visibleEntries Visible column entries.
   * @param nextWidthsInPixels Next widths for visible columns.
   * @returns void
   */
  function applyWidths(visibleEntries: VisibleColumnEntry<TRow>[], nextWidthsInPixels: number[]) {
    const totalWidth = nextWidthsInPixels.reduce((accumulator, width) => accumulator + width, 0);
    if (!Number.isFinite(totalWidth) || totalWidth <= 0) return;

    const visibleCount = Math.max(1, visibleEntries.length);
    const widthByColumnIndex = new Map<number, string>();

    visibleEntries.forEach((entry, index) => {
      const widthRatio = nextWidthsInPixels[index] / totalWidth;
      const weight = Math.max(0.05, widthRatio * visibleCount);
      widthByColumnIndex.set(entry.columnIndex, `${weight.toFixed(5)}fr`);
    });

    columns.value = columns.value.map((column, columnIndex) => {
      const width = widthByColumnIndex.get(columnIndex);
      if (!width) return column;
      return {
        ...column,
        width
      };
    });
  }

  /**
   * Builds a resize session from pointer start.
   * @param columnIndex Column index in full list.
   * @param startX Pointer x position.
   * @returns Session object or null when resize cannot start.
   */
  function createResizeSession(columnIndex: number, startX: number) {
    const visibleEntries = visibleColumnEntries.value;
    if (!visibleEntries.length) return null;

    const activeVisibleIndex = visibleEntries.findIndex((entry) => entry.columnIndex === columnIndex);
    if (activeVisibleIndex < 0) return null;
    if (activeVisibleIndex >= visibleEntries.length - 1) return null;

    const startWidths = readVisibleColumnWidths(visibleEntries);
    if (!startWidths) return null;

    const minimumWidths = visibleEntries.map((entry) => getMinimumWidth(entry.column));
    const activeColumn = columns.value[columnIndex];
    if (!activeColumn) return null;

    const originalWidthsByColumnIndex = new Map<number, number | string | undefined>();
    columns.value.forEach((column, currentIndex) => {
      originalWidthsByColumnIndex.set(currentIndex, column.width);
    });

    return {
      activeColumnIndex: columnIndex,
      activeColumnKey: String(activeColumn.rowKey),
      activeVisibleIndex,
      startX,
      startWidths,
      minimumWidths,
      originalWidthsByColumnIndex,
      visibleEntries: [...visibleEntries]
    } satisfies ResizeSession<TRow>;
  }

  /**
   * Computes resized widths with right-side redistribution and hard constraints.
   * @param session Active resize session.
   * @param pointerX Current pointer x.
   * @returns Next widths in pixels.
   */
  function computeWidths(session: ResizeSession<TRow>, pointerX: number) {
    const nextWidths = [...session.startWidths];
    const { activeVisibleIndex, minimumWidths } = session;
    const targetStartWidth = session.startWidths[activeVisibleIndex] ?? 0;

    let maximumGrowth = 0;
    for (let index = activeVisibleIndex + 1; index < session.startWidths.length; index++) {
      const availableWidth = (session.startWidths[index] ?? 0) - (minimumWidths[index] ?? DEFAULT_MINIMUM_COLUMN_WIDTH_IN_PIXELS);
      maximumGrowth += Math.max(0, availableWidth);
    }

    const maximumShrink = Math.max(0, targetStartWidth - (minimumWidths[activeVisibleIndex] ?? DEFAULT_MINIMUM_COLUMN_WIDTH_IN_PIXELS));
    const rawDelta = pointerX - session.startX;
    const constrainedDelta = Math.min(Math.max(rawDelta, -maximumShrink), maximumGrowth);

    nextWidths[activeVisibleIndex] = targetStartWidth + constrainedDelta;

    if (constrainedDelta > 0) {
      let remainingReduction = constrainedDelta;
      for (let index = activeVisibleIndex + 1; index < nextWidths.length; index++) {
        const minimumWidth = minimumWidths[index] ?? DEFAULT_MINIMUM_COLUMN_WIDTH_IN_PIXELS;
        const reducibleWidth = Math.max(0, nextWidths[index] - minimumWidth);
        if (reducibleWidth <= 0) continue;
        const reduction = Math.min(reducibleWidth, remainingReduction);
        nextWidths[index] -= reduction;
        remainingReduction -= reduction;
        if (remainingReduction <= 0) break;
      }
    } else if (constrainedDelta < 0) {
      const growthAmount = Math.abs(constrainedDelta);
      const rightIndexes = Array.from(
        { length: Math.max(0, nextWidths.length - (activeVisibleIndex + 1)) },
        (_, offset) => activeVisibleIndex + 1 + offset
      );

      if (rightIndexes.length) {
        const rightTotalWidth = rightIndexes.reduce((accumulator, index) => accumulator + (session.startWidths[index] ?? 0), 0);
        const safeRightTotalWidth = rightTotalWidth > 0 ? rightTotalWidth : rightIndexes.length;

        let distributedGrowth = 0;
        rightIndexes.forEach((index, listIndex) => {
          if (listIndex === rightIndexes.length - 1) {
            const remainingGrowth = growthAmount - distributedGrowth;
            nextWidths[index] += remainingGrowth;
            return;
          }

          const baseWidth = session.startWidths[index] ?? 0;
          const ratio = safeRightTotalWidth > 0 ? baseWidth / safeRightTotalWidth : 1 / rightIndexes.length;
          const growth = growthAmount * ratio;
          nextWidths[index] += growth;
          distributedGrowth += growth;
        });
      }
    }

    return nextWidths;
  }

  /**
   * Restores prior body interaction styles.
   * @returns void
   */
  function restoreBodyStyles() {
    document.body.style.userSelect = previousBodyUserSelect;
    document.body.style.cursor = previousBodyCursor;
  }

  /**
   * Finalizes current resize interaction.
   * @returns void
   */
  function finishResize() {
    resizeSession.value = null;
    restoreBodyStyles();
  }

  /**
   * Cancels current resize and restores original column widths.
   * @returns void
   */
  function cancelResize() {
    const session = resizeSession.value;
    if (session) {
      columns.value = columns.value.map((column, columnIndex) => {
        if (!session.originalWidthsByColumnIndex.has(columnIndex)) return column;
        return {
          ...column,
          width: session.originalWidthsByColumnIndex.get(columnIndex)
        };
      });
    }
    finishResize();
  }

  /**
   * Starts resize for a column handle.
   * @param columnIndex Column index in full columns list.
   * @param event Pointer event from resize handle.
   * @returns void
   */
  function onResizeHandlePointerDown(columnIndex: number, event: PointerEvent) {
    if (event.button !== 0) return;
    const session = createResizeSession(columnIndex, event.clientX);
    if (!session) return;

    previousBodyUserSelect = document.body.style.userSelect;
    previousBodyCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    resizeSession.value = session;
  }

  /**
   * Handles pointer move during active resize.
   * @param event Pointer move event.
   * @returns void
   */
  function onPointerMove(event: PointerEvent) {
    const session = resizeSession.value;
    if (!session) return;
    event.preventDefault();
    const nextWidths = computeWidths(session, event.clientX);
    applyWidths(session.visibleEntries, nextWidths);
  }

  /**
   * Handles pointer up for resize completion.
   * @returns void
   */
  function onPointerUp() {
    if (!resizeSession.value) return;
    finishResize();
  }

  const stopPointerMove = typeof window !== "undefined" ? useEventListener(window, "pointermove", onPointerMove, { passive: false }) : () => {};
  const stopPointerUp = typeof window !== "undefined" ? useEventListener(window, "pointerup", onPointerUp) : () => {};
  const stopPointerCancel = typeof window !== "undefined" ? useEventListener(window, "pointercancel", cancelResize) : () => {};

  const stopEscapeWatch = watch(escapeKey, (pressed) => {
    if (!pressed) return;
    if (resizeSession.value) {
      cancelResize();
    }
  });

  onBeforeUnmount(() => {
    stopPointerMove();
    stopPointerUp();
    stopPointerCancel();
    stopEscapeWatch();
    if (resizeSession.value) {
      restoreBodyStyles();
    }
  });

  return {
    cancelResize,
    isResizing,
    onResizeHandlePointerDown,
    resizingColumnKey
  };
}
