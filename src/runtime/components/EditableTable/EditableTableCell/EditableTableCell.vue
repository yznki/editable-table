<script setup lang="ts" generic="TRow extends Record<string, any>, TKey extends keyof TRow">
  import { computed, onBeforeUnmount, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  import EditableTableCellEditor from "#editable-table/components/EditableTable/EditableTableCellEditor/EditableTableCellEditor.vue";
  import { useEditableTableEditing } from "#editable-table/composables/useEditableTableEditing";
  import { useEditableTableNavigation } from "#editable-table/composables/useEditableTableNavigation";
  import { ColumnType } from "#editable-table/types/column";

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
    selectOptions?: string[];
    columnRequired?: boolean;
    columnValidation?: ((value: unknown, row: TRow) => string | null | undefined | boolean) | Array<(value: unknown, row: TRow) => string | null | undefined | boolean>;
    columnAllowCustomOptions?: boolean;
    rowData: TRow;

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
  const selectOnFocus = ref(true);
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
        true: "bg-accent-50/70",
        false: ""
      },
      focused: {
        true: "border-accent-100 shadow-[inset_0_0_0_2px_rgba(var(--color-accent-100),0.45)]",
        false: "hover:bg-grey-50"
      },
      selected: {
        true: "bg-accent-50/40 shadow-[inset_0_0_0_1px_rgba(var(--color-accent-100),0.25)]",
        false: "hover:bg-grey-50"
      },
      invalid: {
        true: "border-error-100 shadow-[inset_0_0_0_1px_rgba(205,0,47,0.45)]",
        false: ""
      }
    }
  });

  const validationMessage = computed(() => {
    const currentValue = value.value;
    const isEmpty =
      currentValue === null ||
      currentValue === undefined ||
      currentValue === "" ||
      (typeof currentValue === "string" && currentValue.trim() === "");

    if (props.columnRequired && isEmpty) {
      return "This value is required.";
    }

    if (!isEmpty) {
      switch (props.columnType) {
        case "number": {
          const numericValue = typeof currentValue === "number" ? currentValue : Number(String(currentValue));
          if (!Number.isFinite(numericValue)) {
            return "Enter a valid number.";
          }
          break;
        }
        case "boolean":
          if (typeof currentValue !== "boolean" && currentValue !== "true" && currentValue !== "false") {
            return "Enter a valid boolean.";
          }
          break;
        case "date": {
          const raw = currentValue instanceof Date ? currentValue.toISOString() : String(currentValue);
          const parsed = new Date(raw);
          if (Number.isNaN(parsed.getTime())) {
            return "Enter a valid date.";
          }
          break;
        }
        default:
          break;
      }
    }

    const validators = Array.isArray(props.columnValidation) ? props.columnValidation : props.columnValidation ? [props.columnValidation] : [];
    for (const validator of validators) {
      const result = validator(currentValue, props.rowData);
      if (typeof result === "string" && result.trim().length) {
        return result.trim();
      }
      if (result === false) {
        return "Invalid value.";
      }
    }

    return null;
  });

  const isInvalid = computed(() => validationMessage.value !== null);

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
    selectOnFocus.value = true;
    startEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
  }

  function focusCell() {
    cellElement.value?.focus({ preventScroll: true });
  }

  watch(isFocused, (focused) => {
    if (!focused) return;

    if (!isActive.value) {
      focusCell();
    }

    if (!shouldScrollOnNextFocus.value) {
      allowScrollOnNextFocus();
      return;
    }
    cellElement.value?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  watch(isActive, (active) => {
    if (!active && isFocused.value) {
      focusCell();
    }

    if (active) {
      if (!hasOriginalValue.value) {
        originalValue.value = value.value ?? null;
        hasOriginalValue.value = true;
      }
      return;
    }

    selectOnFocus.value = true;

    if (hasOriginalValue.value) {
      if (props.columnType === "number") {
        const coerced = coerceNumber(value.value);
        if (!Object.is(value.value, coerced)) {
          value.value = coerced as TRow[TKey];
        }
      }

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

  function coerceNumber(input: unknown) {
    if (input === null || input === undefined) return null;
    if (typeof input === "number") return Number.isFinite(input) ? input : null;
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }

  function isTypingKey(event: KeyboardEvent) {
    if (event.isComposing) return false;
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (event.key.length !== 1) return false;
    return true;
  }

  function shouldStartEditFromKey(event: KeyboardEvent) {
    if (!isTypingKey(event)) return false;
    if (navigationKeys.has(event.key)) return false;
    if (event.key === "\t" || event.key === "\n") return false;

    if (props.columnType === "boolean") {
      return event.key === " " || event.code === "Space";
    }

    if (props.columnType === "number") {
      return /^[0-9]$/.test(event.key) || event.key === "-" || event.key === ".";
    }

    return true;
  }

  function beginEditWithValue(nextValue: TRow[TKey]) {
    selectOnFocus.value = false;
    originalValue.value = value.value ?? null;
    hasOriginalValue.value = true;
    startEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
    value.value = nextValue;
  }

  function beginEditWithoutValue() {
    selectOnFocus.value = true;
    startEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
  }

  function defaultValueForColumn() {
    switch (props.columnType) {
      case "number":
        return null;
      case "boolean":
        return false;
      case "date":
        return "";
      default:
        return "";
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!isFocused.value || isActive.value) return;

    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      selectOnFocus.value = false;
      beginEditWithValue(defaultValueForColumn() as TRow[TKey]);
      return;
    }

    if (!shouldStartEditFromKey(event)) return;

    event.preventDefault();

    if (props.columnType === "select" && props.columnAllowCustomOptions === false) {
      beginEditWithoutValue();
      return;
    }

    if (props.columnType === "boolean") {
      beginEditWithValue((!value.value) as TRow[TKey]);
      return;
    }

    if (props.columnType === "number") {
      beginEditWithValue(event.key as TRow[TKey]);
      return;
    }

    beginEditWithValue(event.key as TRow[TKey]);
  }

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
    :class="[cellClass({ active: isActive, focused: isFocused, selected: isSelected, invalid: isInvalid }), !isActive ? 'select-none' : '', 'group']"
    @mousedown="onMouseDown"
    @keydown="onKeyDown"
    @dblclick="onDblClick">
    <EditableTableCellEditor
      v-model="value"
      :type="columnType"
      :select-options="selectOptions"
      :allow-custom-options="columnAllowCustomOptions"
      :select-on-focus="selectOnFocus"
      @blur="onBlur"
      class="w-full"
      :is-editable="isActive" />
    <div
      v-if="validationMessage"
      class="pointer-events-none absolute left-2 top-full z-20 mt-1 hidden max-w-[220px] rounded-md border border-error-200 bg-white px-2 py-1 text-xs text-error-100 shadow-sm group-hover:block">
      {{ validationMessage }}
    </div>
  </div>
</template>
