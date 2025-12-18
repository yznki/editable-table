import { computed, ref } from "vue";

export interface TableHistoryEntry {
  description: string;
  undo: () => void;
  redo: () => void;
}

export function useEditableTableHistory() {
  const undoStack = ref<TableHistoryEntry[]>([]);
  const redoStack = ref<TableHistoryEntry[]>([]);

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function pushEntry(entry: TableHistoryEntry) {
    undoStack.value = [...undoStack.value, entry];
    redoStack.value = [];
  }

  function undo() {
    const entry = undoStack.value.pop();
    if (!entry) return;

    entry.undo();
    redoStack.value = [...redoStack.value, entry];
  }

  function redo() {
    const entry = redoStack.value.pop();
    if (!entry) return;

    entry.redo();
    undoStack.value = [...undoStack.value, entry];
  }

  return {
    canRedo,
    canUndo,
    pushEntry,
    redo,
    undo
  };
}
