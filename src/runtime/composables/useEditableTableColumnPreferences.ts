import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import { useLocalStorage } from "@vueuse/core";
import type { ColumnType, EditableTableColumn } from "#editable-table/types/column";

export type ColumnRenderEntry<TRow extends Record<string, any>> =
  | { type: "column"; column: EditableTableColumn<TRow>; columnIndex: number; visibleIndex: number }
  | { type: "indicator"; hiddenColumnKeys: string[]; id: string };

type StoredTablePreferences = {
  version: 1;
  columnOrder: string[];
  hiddenColumns?: string[];
  columnTypes?: Record<string, ColumnType>;
  sort?: { columnKey: string; direction: "asc" | "desc" };
};

const preferencesStoreByKey = new Map<string, { value: StoredTablePreferences | null }>();

function getPreferencesStore(key: string) {
  const existing = preferencesStoreByKey.get(key);
  if (existing) return existing;

  const created = useLocalStorage<StoredTablePreferences | null>(key, null);
  preferencesStoreByKey.set(key, created);
  return created;
}

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
  const storedSort = ref<StoredTablePreferences["sort"] | null>(null);
  const initialColumnSignature = ref<string | null>(null);
  const isApplyingPreferences = ref(false);
  const hasLoadedPreferences = ref(false);
  const hasAppliedStoredSort = ref(false);

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

  const gridTemplateColumns = computed(() => {
    const columnTracks = columnRenderEntries.value.map((entry) => (entry.type === "indicator" ? hiddenIndicatorWidth : "minmax(0, 1fr)"));
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

  function loadStoredPreferences(): StoredTablePreferences | null {
    if (!import.meta.client) return null;
    const key = resolveStorageKey();
    if (!key) return null;

    try {
      const parsed = getPreferencesStore(key).value;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.columnOrder)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveStoredPreferences(preferences: StoredTablePreferences) {
    if (!import.meta.client) return;
    const key = resolveStorageKey();
    if (!key) return;

    try {
      getPreferencesStore(key).value = preferences;
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

    let nextColumns = orderedColumns.map((column) => {
      const key = getColumnKey(column);
      const nextType = typeMap[key] ?? column.type;
      return {
        ...column,
        type: nextType,
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

    saveStoredPreferences({
      version: 1,
      columnOrder,
      hiddenColumns,
      columnTypes,
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
    },
    { immediate: true }
  );

  watch(
    [options.columns, initialColumnSignature],
    () => {
      if (hasLoadedPreferences.value) return;
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
      persistPreferences();
    },
    { deep: true }
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

  return {
    columnRenderEntries,
    visibleColumnEntries,
    visibleColumns,
    gridTemplateColumns,
    hiddenIndicatorWidth,
    hideColumn,
    revealHiddenColumns,
    recordSort
  };
}
