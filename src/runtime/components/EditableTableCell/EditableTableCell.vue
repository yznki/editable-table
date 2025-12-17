<script setup lang="ts" generic="TRow extends Record<string, any>, TKey extends keyof TRow">
  import { computed, onBeforeUnmount, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  import EditableTableCellEditor from "@components/EditableTableCellEditor/EditableTableCellEditor.vue";
  import { useEditableTableEditing } from "@composables/useEditableTableEditing";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import { ColumnType } from "@models/column";

  interface SelectionRange {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }

  const emit = defineEmits<{
    (event: "cell-select", payload: { rowIndex: number; columnIndex: number; shift: boolean }): void;
    (event: "cell-focus", payload: { rowIndex: number; columnIndex: number }): void;
  }>();

  /* --------------------------------------------------
   * styles
   * -------------------------------------------------- */

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

  /* --------------------------------------------------
   * props & model
   * -------------------------------------------------- */

  const props = defineProps<{
    rowId: string | number;
    columnKey: TKey;
    columnType?: ColumnType;

    rowIndex: number;
    columnIndex: number;

    rowCount: number;
    columnCount: number;

    selectionRange?: SelectionRange | null;
  }>();

  const value = defineModel<TRow[TKey]>();

  /* --------------------------------------------------
   * editing state
   * -------------------------------------------------- */

  const { isEditing, startEditing, stopEditing } = useEditableTableEditing();

  const isActive = computed(() =>
    isEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    })
  );

  /* --------------------------------------------------
   * navigation (DATA-DRIVEN)
   * -------------------------------------------------- */

  const { activePosition, setActive, move, shouldHandleNavigationKey } = useEditableTableNavigation();

  const isFocused = computed(
    () => activePosition.value?.rowIndex === props.rowIndex && activePosition.value?.columnIndex === props.columnIndex
  );

  const isSelected = computed(() => {
    if (!props.selectionRange) return false;
    const { startRow, endRow, startCol, endCol } = props.selectionRange;
    return props.rowIndex >= startRow && props.rowIndex <= endRow && props.columnIndex >= startCol && props.columnIndex <= endCol;
  });

  /* --------------------------------------------------
   * repeating navigation (hold to accelerate)
   * -------------------------------------------------- */

  type ArrowNavigationKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
  const repeatHandles = new Map<ArrowNavigationKey, number>();

  function stopRepeat(key: ArrowNavigationKey) {
    const handle = repeatHandles.get(key);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      repeatHandles.delete(key);
    }
  }

  function stopAllRepeats() {
    repeatHandles.forEach((handle) => window.clearTimeout(handle));
    repeatHandles.clear();
  }

  function startRepeat(key: ArrowNavigationKey, direction: "left" | "right" | "up" | "down") {
    stopRepeat(key);
    move(direction, props.rowCount, props.columnCount);

    const initialDelay = 300;
    const minDelay = 60;
    const accelerationFactor = 0.85;

    const schedule = (delay: number) => {
      const handle = window.setTimeout(() => {
        move(direction, props.rowCount, props.columnCount);
        const nextDelay = Math.max(minDelay, delay * accelerationFactor);
        schedule(nextDelay);
      }, delay);

      repeatHandles.set(key, handle);
    };

    schedule(initialDelay);
  }

  /* --------------------------------------------------
   * keep focused cell visible
   * -------------------------------------------------- */

  const cellElement = ref<HTMLElement | null>(null);

  watch(isFocused, (focused) => {
    if (!focused) return;
    cellElement.value?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  /* --------------------------------------------------
   * value snapshot (Escape)
   * -------------------------------------------------- */

  const originalValue = ref<TRow[TKey] | null>(null);

  watch(isActive, (active) => {
    if (active) {
      originalValue.value = value.value;
    }
  });

  /* --------------------------------------------------
   * keyboard intent (VueUse)
   * -------------------------------------------------- */

  const navigationKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

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
    if (!shouldHandleNavigationKey("Tab", pressed, isFocused.value, isActive.value)) return;
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

  /* --------------------------------------------------
   * mouse interaction
   * -------------------------------------------------- */

  function onClick(event: MouseEvent) {
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

  onBeforeUnmount(() => {
    stopAllRepeats();
  });
</script>

<template>
  <div
    tabindex="0"
    ref="cellElement"
    :class="[
      cellClass({ active: isActive, focused: isFocused, selected: isSelected }),
      !isActive ? 'select-none' : ''
    ]"
    @click="onClick"
    @dblclick="onDblClick">
    <EditableTableCellEditor v-model="value" :type="columnType" @blur="stopEditing" class="w-full" :is-editable="isActive" />
  </div>
</template>
