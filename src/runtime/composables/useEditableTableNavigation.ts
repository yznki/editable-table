import { onBeforeUnmount, ref, type Ref } from "vue";

export interface TableCellPosition {
  rowIndex: number;
  columnIndex: number;
}

export interface NavigationSelectionState {
  selectionAnchor: Ref<TableCellPosition | null>;
  selectionEnd: Ref<TableCellPosition | null>;
  preserveSelectionOnNextFocus: Ref<boolean>;
}

export interface NavigationContext {
  event: KeyboardEvent;
  rowsLength: number;
  columnsLength: number;
  selectionState: NavigationSelectionState;
  activePosition: Ref<TableCellPosition | null>;
  setActive: (position: TableCellPosition) => void;
  setSelection: (position: TableCellPosition, extend: boolean) => void;
  scrollContainer?: Ref<HTMLElement | null>;
}

type NavigationKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Tab";

const activePosition = ref<TableCellPosition | null>(null);
const handledNavigationKeys = new Set<NavigationKey>();

export function useEditableTableNavigation() {
  function setActive(position: TableCellPosition) {
    activePosition.value = position;
  }

  function clearActive() {
    activePosition.value = null;
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

  function handleTableKeyDown(context: NavigationContext) {
    const {
      event,
      rowsLength,
      columnsLength,
      selectionState,
      activePosition: positionRef,
      setActive: setActivePosition,
      setSelection,
      scrollContainer
    } = context;

    const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const isArrow = arrowKeys.includes(event.key);

    if (!isArrow) return;

    const { selectionAnchor, selectionEnd, preserveSelectionOnNextFocus } = selectionState;

    if ((event.metaKey || event.ctrlKey) && isArrow) {
      event.preventDefault();

      const currentPosition = positionRef.value ?? { rowIndex: 0, columnIndex: 0 };
      const maximumRowIndex = Math.max(0, rowsLength - 1);
      const maximumColumnIndex = Math.max(0, columnsLength - 1);

      const targetPosition =
        event.key === "ArrowUp" ? { rowIndex: 0, columnIndex: currentPosition.columnIndex }
        : event.key === "ArrowDown" ? { rowIndex: maximumRowIndex, columnIndex: currentPosition.columnIndex }
        : event.key === "ArrowLeft" ? { rowIndex: currentPosition.rowIndex, columnIndex: 0 }
        : { rowIndex: currentPosition.rowIndex, columnIndex: maximumColumnIndex };

      if (event.shiftKey) {
        if (!selectionAnchor.value) selectionAnchor.value = currentPosition;
        selectionEnd.value = targetPosition;
        preserveSelectionOnNextFocus.value = true;
      } else {
        selectionAnchor.value = targetPosition;
        selectionEnd.value = targetPosition;
      }

      if (event.key === "ArrowDown" && scrollContainer?.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
      } else if (event.key === "ArrowUp" && scrollContainer?.value) {
        scrollContainer.value.scrollTop = 0;
      }

      setActivePosition(targetPosition);
      return;
    }

    if (event.shiftKey && isArrow) {
      event.preventDefault();
      if (!selectionAnchor.value) {
        const currentPosition = positionRef.value ?? { rowIndex: 0, columnIndex: 0 };
        selectionAnchor.value = currentPosition;
        selectionEnd.value = currentPosition;
      }
      preserveSelectionOnNextFocus.value = true;
    }
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
    clearActive,
    move,
    handleTableKeyDown,
    shouldHandleNavigationKey
  };
}
