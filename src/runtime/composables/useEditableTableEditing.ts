import { ref } from "vue";

export interface EditingCell {
  rowId: string | number;
  columnKey: string;
}

const activeCell = ref<EditingCell | null>(null);

export function useEditableTableEditing() {
  function startEditing(cell: EditingCell) {
    activeCell.value = cell;
  }

  function stopEditing() {
    activeCell.value = null;
  }

  function isEditing(cell: EditingCell) {
    return activeCell.value?.rowId === cell.rowId && activeCell.value?.columnKey === cell.columnKey;
  }

  return {
    activeCell,
    startEditing,
    stopEditing,
    isEditing
  };
}
