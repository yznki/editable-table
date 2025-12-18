<script setup lang="ts" generic="TRow extends Record<string, any>, TKey extends keyof TRow">
  import { computed, onBeforeUnmount, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  import EditableTableCellEditor from "@components/EditableTable/EditableTableCellEditor/EditableTableCellEditor.vue";
  import { useEditableTableEditing } from "@composables/useEditableTableEditing";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import { ColumnType } from "@models/column";

  interface SelectionRange {
    startRowIndex: number;
    endRowIndex: number;
    startColumnIndex: number;
    endColumnIndex: number;
  }

  type ArrowNavigationKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

  interface EditableTableCellProps {
    rowId: string | number;
    columnKey: TKey;
    columnType?: ColumnType;

    rowIndex: number;
    columnIndex: number;

    rowCount: number;
    columnCount: number;

    selectionRange?: SelectionRange | null;
  }

  const props = defineProps<EditableTableCellProps>();

  const emit = defineEmits<{
    (event: "cell-select", payload: { rowIndex: number; columnIndex: number; shift: boolean }): void;
    (event: "cell-focus", payload: { rowIndex: number; columnIndex: number }): void;
    (
      event: "cell-commit",
      payload: { rowIndex: number; columnIndex: number; rowId: string | number; columnKey: string; previousValue: any; nextValue: any }
    ): void;
  }>();

  const value = defineModel<TRow[TKey]>();

  const { isEditing, startEditing, stopEditing } = useEditableTableEditing();
  const { activePosition, setActive, move, shouldHandleNavigationKey, shouldScrollOnNextFocus, allowScrollOnNextFocus } =
    useEditableTableNavigation();

  const keys = useMagicKeys({
    passive: false,
    onEventFired(event) {
      if (event.type !== "keydown") return;
      if (!navigationKeys.has(event.key)) return;

      if (isFocused.value && !isActive.value) {
        event.preventDefault();
      }
    }
  });

  const repeatTimeoutHandles = new Map<ArrowNavigationKey, number>();
  const cellElement = ref<HTMLElement | null>(null);
  const originalValue = ref<TRow[TKey] | null>(null);
  const hasOriginalValue = ref(false);
  const navigationKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  const isActive = computed(() =>
    isEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    })
  );

  const isFocused = computed(
    () => activePosition.value?.rowIndex === props.rowIndex && activePosition.value?.columnIndex === props.columnIndex
  );

  const isSelected = computed(() => {
    if (!props.selectionRange) return false;
    const { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex } = props.selectionRange;
    return (
      props.rowIndex >= startRowIndex &&
      props.rowIndex <= endRowIndex &&
      props.columnIndex >= startColumnIndex &&
      props.columnIndex <= endColumnIndex
    );
  });

  const cellClass = cva("relative cursor-text outline-none transition-colors px-3 py-2 bg-white border border-transparent", {
    variants: {
      active: {
        true: "bg-blue-50/70",
        false: ""
      },
      focused: {
        true: "border-blue-500 shadow-[inset_0_0_0_2px_rgba(37,99,235,0.45)]",
        false: "hover:bg-gray-50"
      },
      selected: {
        true: "bg-blue-50/40 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.25)]",
        false: "hover:bg-gray-50"
      }
    }
  });

  function stopRepeat(key: ArrowNavigationKey) {
    const timeoutHandle = repeatTimeoutHandles.get(key);
    if (timeoutHandle !== undefined) {
      window.clearTimeout(timeoutHandle);
      repeatTimeoutHandles.delete(key);
    }
  }

  function stopAllRepeats() {
    repeatTimeoutHandles.forEach((timeoutHandle) => window.clearTimeout(timeoutHandle));
    repeatTimeoutHandles.clear();
  }

  function startRepeat(key: ArrowNavigationKey, direction: "left" | "right" | "up" | "down") {
    stopRepeat(key);
    move(direction, props.rowCount, props.columnCount);

    const initialDelay = 300;
    const minimumDelay = 60;
    const accelerationFactor = 0.85;

    const schedule = (delay: number) => {
      const timeoutHandle = window.setTimeout(() => {
        move(direction, props.rowCount, props.columnCount);
        const nextDelay = Math.max(minimumDelay, delay * accelerationFactor);
        schedule(nextDelay);
      }, delay);

      repeatTimeoutHandles.set(key, timeoutHandle);
    };

    schedule(initialDelay);
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    setActive({
      rowIndex: props.rowIndex,
      columnIndex: props.columnIndex
    });
    emit("cell-select", { rowIndex: props.rowIndex, columnIndex: props.columnIndex, shift: event.shiftKey });
  }

  function onDblClick() {
    startEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
  }

  watch(isFocused, (focused) => {
    if (!focused) return;

    if (!shouldScrollOnNextFocus.value) {
      allowScrollOnNextFocus();
      return;
    }
    cellElement.value?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  watch(isActive, (active) => {
    if (active) {
      originalValue.value = value.value ?? null;
      hasOriginalValue.value = true;
      return;
    }

    if (hasOriginalValue.value) {
      const previousValue = originalValue.value;
      const nextValue = value.value;

      if (!Object.is(previousValue, nextValue)) {
        emit("cell-commit", {
          rowIndex: props.rowIndex,
          columnIndex: props.columnIndex,
          rowId: props.rowId,
          columnKey: String(props.columnKey),
          previousValue,
          nextValue
        });
      }

      originalValue.value = null;
      hasOriginalValue.value = false;
    }
  });

  watch(keys.enter, (pressed) => {
    if (!pressed || !isFocused.value) return;

    if (!isActive.value) {
      startEditing({
        rowId: props.rowId,
        columnKey: String(props.columnKey)
      });
      return;
    }

    stopEditing();
    move("down", props.rowCount, props.columnCount);
  });

  watch(isFocused, (focused) => {
    if (focused) {
      emit("cell-focus", { rowIndex: props.rowIndex, columnIndex: props.columnIndex });
    }
  });

  watch(keys.escape, (pressed) => {
    if (!pressed || !isActive.value) {
      return;
    }

    if (originalValue.value !== null) {
      value.value = originalValue.value;
    }

    stopEditing();
  });

  watch(keys.tab, (pressed) => {
    if (!shouldHandleNavigationKey("Tab", pressed, isFocused.value, isActive.value, { allowWhileEditing: true })) return;
    if (isActive.value) {
      stopEditing();
    }
    move(keys.shift.value ? "left" : "right", props.rowCount, props.columnCount);
  });

  watch(keys.arrowLeft, (pressed) => {
    if (keys.meta.value || keys.ctrl.value) return;
    if (!pressed) {
      shouldHandleNavigationKey("ArrowLeft", pressed, isFocused.value, isActive.value);
      stopRepeat("ArrowLeft");
      return;
    }

    if (!shouldHandleNavigationKey("ArrowLeft", pressed, isFocused.value, isActive.value)) return;
    startRepeat("ArrowLeft", "left");
  });

  watch(keys.arrowRight, (pressed) => {
    if (keys.meta.value || keys.ctrl.value) return;
    if (!pressed) {
      shouldHandleNavigationKey("ArrowRight", pressed, isFocused.value, isActive.value);
      stopRepeat("ArrowRight");
      return;
    }

    if (!shouldHandleNavigationKey("ArrowRight", pressed, isFocused.value, isActive.value)) return;
    startRepeat("ArrowRight", "right");
  });

  watch(keys.arrowUp, (pressed) => {
    if (keys.meta.value || keys.ctrl.value) return;
    if (!pressed) {
      shouldHandleNavigationKey("ArrowUp", pressed, isFocused.value, isActive.value);
      stopRepeat("ArrowUp");
      return;
    }

    if (!shouldHandleNavigationKey("ArrowUp", pressed, isFocused.value, isActive.value)) return;
    startRepeat("ArrowUp", "up");
  });

  watch(keys.arrowDown, (pressed) => {
    if (keys.meta.value || keys.ctrl.value) return;
    if (!pressed) {
      shouldHandleNavigationKey("ArrowDown", pressed, isFocused.value, isActive.value);
      stopRepeat("ArrowDown");
      return;
    }

    if (!shouldHandleNavigationKey("ArrowDown", pressed, isFocused.value, isActive.value)) return;
    startRepeat("ArrowDown", "down");
  });

  onBeforeUnmount(() => {
    stopAllRepeats();
  });

  function onBlur() {
    stopEditing();
  }
</script>

<template>
  <div
    tabindex="0"
    ref="cellElement"
    :class="[cellClass({ active: isActive, focused: isFocused, selected: isSelected }), !isActive ? 'select-none' : '']"
    @mousedown="onMouseDown"
    @dblclick="onDblClick">
    <EditableTableCellEditor v-model="value" :type="columnType" @blur="onBlur" class="w-full" :is-editable="isActive" />
  </div>
</template>
