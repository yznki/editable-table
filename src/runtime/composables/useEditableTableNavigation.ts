import { onBeforeUnmount, ref } from "vue";

export interface TableCellPosition {
  rowIndex: number;
  columnIndex: number;
}

type NavigationKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab";

const activePosition = ref<TableCellPosition | null>(null);
const handledNavigationKeys = new Set<NavigationKey>();

export function useEditableTableNavigation() {
  function setActive(position: TableCellPosition) {
    activePosition.value = position;
  }

  function move(direction: "left" | "right" | "up" | "down", rowCount: number, columnCount: number) {
    if (!activePosition.value) return;

    let { rowIndex, columnIndex } = activePosition.value;

    if (direction === "left") {
      if (columnIndex > 0) {
        columnIndex--;
      } else if (rowIndex > 0) {
        rowIndex--;
        columnIndex = columnCount - 1;
      }
    }

    if (direction === "right") {
      if (columnIndex < columnCount - 1) {
        columnIndex++;
      } else if (rowIndex < rowCount - 1) {
        rowIndex++;
        columnIndex = 0;
      }
    }

    if (direction === "up") {
      rowIndex = Math.max(0, rowIndex - 1);
    }

    if (direction === "down") {
      rowIndex = Math.min(rowCount - 1, rowIndex + 1);
    }

    activePosition.value = { rowIndex, columnIndex };
  }

  function shouldHandleNavigationKey(key: NavigationKey, pressed: boolean, canHandle: boolean, isEditing: boolean) {
    if (!pressed) {
      handledNavigationKeys.delete(key);
      return false;
    }

    if (!canHandle || isEditing) return false;
    if (handledNavigationKeys.has(key)) return false;

    handledNavigationKeys.add(key);
    return true;
  }

  onBeforeUnmount(() => {
    handledNavigationKeys.clear();
  });

  return {
    activePosition,
    setActive,
    move,
    shouldHandleNavigationKey
  };
}
