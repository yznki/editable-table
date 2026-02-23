import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { ColumnType, EditableTableColumn } from "#editable-table/types/column";

export type ColumnRenderEntry<TRow extends Record<string, any>> =
  | { type: "column"; column: EditableTableColumn<TRow>; columnIndex: number; visibleIndex: number }
  | { type: "indicator"; hiddenColumnKeys: string[]; id: string };

type StoredTablePreferences = {
  version: 1;
  columnOrder: string[];
  hiddenColumns?: string[];
  columnTypes?: Record<string, ColumnType>;
  columnWidths?: Record<string, number | string>;
  sort?: { columnKey: string; direction: "asc" | "desc" };
};

interface ColumnPreferencesOptions<TRow extends Record<string, any>> {
  columns: Ref<EditableTableColumn<TRow>[]>;
  indexColumnWidth: string;
  hiddenIndicatorWidth?: string;
  storageKey?: string;
  disabled?: boolean;
  rowsLength?: Ref<number> | ComputedRef<number>;
  onApplySort?: (column: EditableTableColumn<TRow>, direction: "asc" | "desc") => void;
}

export function useEditableTableColumnPreferences<TRow extends Record<string, any>>(options: ColumnPreferencesOptions<TRow>) {
  const hiddenIndicatorWidth = options.hiddenIndicatorWidth ?? "0.6rem";
  const minimumExplicitColumnWidthInPixels = 80;
  const storedSort = ref<StoredTablePreferences["sort"] | null>(null);
  const initialColumnSignature = ref<string | null>(null);
  const isApplyingPreferences = ref(false);
  const hasLoadedPreferences = ref(false);
  const hasAppliedStoredSort = ref(false);
  const initialColumnsSnapshot = ref<EditableTableColumn<TRow>[]>([]);
  const isClientEnvironment = typeof window !== "undefined";

  const rowsLength = options.rowsLength ?? computed(() => 0);

  const columnRenderEntries = computed<ColumnRenderEntry<TRow>[]>(() => {
    const entries: ColumnRenderEntry<TRow>[] = [];

    let visibleIndex = 0;
    let pendingHidden: string[] = [];

    options.columns.value.forEach((column, columnIndex) => {
      const columnKey = String(column.rowKey);
      if (column.hidden) {
        pendingHidden.push(columnKey);
        return;
      }

      if (pendingHidden.length) {
        entries.push({
          type: "indicator",
          hiddenColumnKeys: [...pendingHidden],
          id: `hidden-${pendingHidden.join("-")}-${columnKey}`
        });
        pendingHidden = [];
      }

      entries.push({ type: "column", column, columnIndex, visibleIndex });
      visibleIndex += 1;
    });

    if (pendingHidden.length) {
      entries.push({
        type: "indicator",
        hiddenColumnKeys: [...pendingHidden],
        id: `hidden-tail-${pendingHidden.join("-")}`
      });
    }

    return entries;
  });

  const visibleColumnEntries = computed(() =>
    columnRenderEntries.value.filter(
      (entry): entry is { type: "column"; column: EditableTableColumn<TRow>; columnIndex: number; visibleIndex: number } =>
        entry.type === "column"
    )
  );

  const visibleColumns = computed(() => visibleColumnEntries.value.map((entry) => entry.column));

  function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function resolveColumnTrack(column: EditableTableColumn<TRow>) {
    const minimumWidth = getMinimumWidth(column);

    if (typeof column.width === "number" && Number.isFinite(column.width)) {
      const width = Math.max(minimumExplicitColumnWidthInPixels, Math.floor(column.width));
      return `minmax(${minimumWidth}px, ${width}px)`;
    }

    if (typeof column.width === "string" && column.width.trim().length) {
      const widthValue = column.width.trim();
      if (widthValue.startsWith("minmax(")) {
        return widthValue;
      }
      if (widthValue.endsWith("fr")) {
        return `minmax(${minimumWidth}px, ${widthValue})`;
      }
      return `minmax(${minimumWidth}px, ${widthValue})`;
    }

    const columnWeight = resolveColumnWeight(column);
    return `minmax(${minimumWidth}px, ${columnWeight}fr)`;
  }

  function getMinimumWidth(column: EditableTableColumn<TRow>) {
    const configuredMinimumWidth = typeof column.minWidth === "number" && Number.isFinite(column.minWidth) ? Math.floor(column.minWidth) : 96;
    return Math.max(64, configuredMinimumWidth);
  }

  function resolveColumnWeight(column: EditableTableColumn<TRow>) {
    if (column.type === "boolean") {
      return 0.8;
    }

    if (column.type === "number") {
      return 0.9;
    }

    if (column.type === "date") {
      return 1.05;
    }

    if (column.type === "select") {
      const optionLengths = (column.options ?? []).map((option) => option.length);
      const longestOptionLength = optionLengths.length ? Math.max(...optionLengths) : 0;
      const longestLabelLength = Math.max(column.title.length, longestOptionLength);
      const extraWeight = clamp((longestLabelLength - 12) / 14, 0, 0.9);
      return 1.25 + extraWeight;
    }

    return 1;
  }

  const gridTemplateColumns = computed(() => {
    const columnTracks = columnRenderEntries.value.map((entry) => {
      if (entry.type === "indicator") return hiddenIndicatorWidth;
      return resolveColumnTrack(entry.column);
    });
    const tracks = columnTracks.length ? `${columnTracks.join(" ")}` : "";
    return `${options.indexColumnWidth}${tracks ? ` ${tracks}` : ""}`;
  });

  function getColumnKey(column: EditableTableColumn<TRow>) {
    return String(column.rowKey);
  }

  function resolveStorageKey() {
    if (options.disabled) return null;
    if (options.storageKey) return options.storageKey;
    if (!initialColumnSignature.value) return null;
    const locationKey = typeof window !== "undefined" ? window.location.pathname : "table";
    return `editable-table:${locationKey}:${initialColumnSignature.value}`;
  }

  function clearStoredPreferences() {
    if (!isClientEnvironment) return;
    const key = resolveStorageKey();
    if (!key) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  }

  function loadStoredPreferences(): StoredTablePreferences | null {
    if (!isClientEnvironment) return null;
    const key = resolveStorageKey();
    if (!key) return null;

    try {
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) return null;
      const parsed = JSON.parse(rawValue) as StoredTablePreferences;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.columnOrder)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveStoredPreferences(preferences: StoredTablePreferences) {
    if (!isClientEnvironment) return;
    const key = resolveStorageKey();
    if (!key) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors to avoid blocking table interactions.
    }
  }

  function applyStoredPreferences(preferences: StoredTablePreferences) {
    if (!options.columns.value.length) return;
    isApplyingPreferences.value = true;

    const columnMap = new Map(options.columns.value.map((column) => [getColumnKey(column), column]));
    const orderedColumns: EditableTableColumn<TRow>[] = [];
    const usedKeys = new Set<string>();

    preferences.columnOrder.forEach((key) => {
      const column = columnMap.get(key);
      if (!column) return;
      orderedColumns.push(column);
      usedKeys.add(key);
    });

    options.columns.value.forEach((column) => {
      const key = getColumnKey(column);
      if (!usedKeys.has(key)) orderedColumns.push(column);
    });

    const hiddenSet = new Set(preferences.hiddenColumns ?? []);
    const typeMap = preferences.columnTypes ?? {};
    const widthMap = preferences.columnWidths ?? {};

    let nextColumns = orderedColumns.map((column) => {
      const key = getColumnKey(column);
      const nextType = typeMap[key] ?? column.type;
      const nextWidth = widthMap[key] ?? column.width;
      return {
        ...column,
        type: nextType,
        width: nextWidth,
        hidden: hiddenSet.has(key)
      };
    });

    // Guard against persisted states that hide every column, which collapses the table to index width only.
    if (nextColumns.length && nextColumns.every((column) => column.hidden)) {
      nextColumns = nextColumns.map((column, index) => (index === 0 ? { ...column, hidden: false } : column));
    }

    options.columns.value = nextColumns;

    storedSort.value = preferences.sort ?? null;
    hasAppliedStoredSort.value = false;
    isApplyingPreferences.value = false;
  }

  function persistPreferences() {
    if (isApplyingPreferences.value) return;
    const key = resolveStorageKey();
    if (!key) return;

    const columnOrder = options.columns.value.map((column) => getColumnKey(column));
    const hiddenColumns = options.columns.value.filter((column) => column.hidden).map((column) => getColumnKey(column));
    const columnTypes = options.columns.value.reduce<Record<string, ColumnType>>((accumulator, column) => {
      if (column.type) {
        accumulator[getColumnKey(column)] = column.type;
      }
      return accumulator;
    }, {});

    const columnWidths = options.columns.value.reduce<Record<string, number | string>>((accumulator, column) => {
      if (typeof column.width === "number" || typeof column.width === "string") {
        accumulator[getColumnKey(column)] = column.width;
      }
      return accumulator;
    }, {});

    saveStoredPreferences({
      version: 1,
      columnOrder,
      hiddenColumns,
      columnTypes,
      columnWidths,
      sort: storedSort.value ?? undefined
    });
  }

  function recordSort(columnKey: string, direction: "asc" | "desc") {
    storedSort.value = { columnKey, direction };
    hasAppliedStoredSort.value = true;
    persistPreferences();
  }

  function hideColumn(columnIndex: number | null) {
    if (columnIndex === null) return;
    const target = options.columns.value[columnIndex];
    if (!target) return;
    const visibleCount = options.columns.value.filter((column) => !column.hidden).length;
    if (visibleCount <= 1 && !target.hidden) return;
    options.columns.value = options.columns.value.map((column, index) => (index === columnIndex ? { ...column, hidden: true } : column));
  }

  function revealHiddenColumns(hiddenColumnKeys: string[]) {
    if (!hiddenColumnKeys.length) return;
    const hiddenSet = new Set(hiddenColumnKeys);
    options.columns.value = options.columns.value.map((column) => {
      const key = getColumnKey(column);
      if (!hiddenSet.has(key)) return column;
      return { ...column, hidden: false };
    });
  }

  watch(
    options.columns,
    (nextColumns) => {
      if (initialColumnSignature.value || !nextColumns.length) return;
      initialColumnSignature.value = nextColumns.map((column) => getColumnKey(column)).join("|");
      initialColumnsSnapshot.value = nextColumns.map((column) => ({ ...column }));
    },
    { immediate: true }
  );

  watch(
    [options.columns, initialColumnSignature],
    () => {
      if (hasLoadedPreferences.value) return;
      if (!isClientEnvironment) return;
      if (!initialColumnSignature.value || !options.columns.value.length) return;
      const preferences = loadStoredPreferences();
      if (preferences) {
        applyStoredPreferences(preferences);
      }
      hasLoadedPreferences.value = true;
    },
    { immediate: true }
  );

  watch(
    options.columns,
    () => {
      if (!hasLoadedPreferences.value) return;
      if (!isClientEnvironment) return;
      persistPreferences();
    },
    { deep: true, flush: "sync" }
  );

  watch(
    [rowsLength, () => options.columns.value.length, storedSort],
    () => {
      if (!hasLoadedPreferences.value) return;
      if (hasAppliedStoredSort.value) return;
      if (!storedSort.value) {
        hasAppliedStoredSort.value = true;
        return;
      }
      if (!rowsLength.value || !options.columns.value.length) return;
      if (!options.onApplySort) {
        hasAppliedStoredSort.value = true;
        return;
      }

      const targetColumn = options.columns.value.find((column) => String(column.rowKey) === storedSort.value?.columnKey);
      if (!targetColumn) {
        hasAppliedStoredSort.value = true;
        return;
      }

      options.onApplySort(targetColumn, storedSort.value.direction);
      hasAppliedStoredSort.value = true;
    },
    { immediate: true }
  );

  function resetTableState() {
    clearStoredPreferences();
    storedSort.value = null;
    hasAppliedStoredSort.value = true;

    if (!initialColumnsSnapshot.value.length) return;
    options.columns.value = initialColumnsSnapshot.value.map((column) => ({ ...column })) as EditableTableColumn<TRow>[];
  }

  return {
    columnRenderEntries,
    visibleColumnEntries,
    visibleColumns,
    gridTemplateColumns,
    hiddenIndicatorWidth,
    hideColumn,
    revealHiddenColumns,
    recordSort,
    resetTableState
  };
}
