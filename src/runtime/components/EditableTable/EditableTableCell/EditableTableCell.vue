<script setup lang="ts" generic="TRow extends Record<string, any>, TKey extends keyof TRow">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";

  import EditableTableCellEditor from "#editable-table/components/EditableTable/EditableTableCellEditor/EditableTableCellEditor.vue";
  import { useEditableTableEditing } from "#editable-table/composables/useEditableTableEditing";
  import { useEditableTableNavigation } from "#editable-table/composables/useEditableTableNavigation";
  import { useSmartTooltip } from "#editable-table/composables/useSmartTooltip";
  import { type ColumnType } from "#editable-table/types/column";

  type ArrowNavigationKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

  const props = defineProps<{
    rowId: string | number;
    columnKey: TKey;
    columnType?: ColumnType;
    columnEditable?: boolean;
    selectOptions?: string[];
    columnRequired?: boolean;
    columnValidation?:
      | ((value: unknown, row: TRow) => string | null | undefined | boolean)
      | Array<(value: unknown, row: TRow) => string | null | undefined | boolean>;
    columnAllowCustomOptions?: boolean;
    rowData: TRow;

    rowIndex: number;
    columnIndex: number;

    rowCount: number;
    columnCount: number;

    selectionRange?: {
      startRowIndex: number;
      endRowIndex: number;
      startColumnIndex: number;
      endColumnIndex: number;
    } | null;
  }>();

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
  const tooltipElement = ref<HTMLElement | null>(null);
  const tableRootElement = ref<HTMLElement | null>(null);
  const isHovered = ref(false);
  const originalValue = ref<TRow[TKey] | null>(null);
  const hasOriginalValue = ref(false);
  const selectOnFocus = ref(true);
  const navigationKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  const isEditable = computed(() => props.columnEditable !== false);

  const isActive = computed(() => {
    if (!isEditable.value) return false;
    return isEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
  });

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

  function isDateValue(input: unknown): input is Date {
    return typeof input === "object" && input !== null && input instanceof Date;
  }

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
          if (isDateValue(currentValue)) {
            if (Number.isNaN(currentValue.getTime())) {
              return "Enter a valid date.";
            }
            break;
          }

          const parsed = new Date(String(currentValue));
          if (Number.isNaN(parsed.getTime())) {
            return "Enter a valid date.";
          }
          break;
        }
        default:
          break;
      }
    }

    const validators =
      Array.isArray(props.columnValidation) ? props.columnValidation
      : props.columnValidation ? [props.columnValidation]
      : [];
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

  const tooltipId = computed(() => `editable-table-tooltip-${String(props.rowId)}-${String(props.columnKey)}`);
  const isTooltipVisible = computed(() => Boolean(validationMessage.value) && isHovered.value);

  const { position: tooltipPosition } = useSmartTooltip({
    triggerElement: cellElement,
    tooltipElement,
    boundaryElement: tableRootElement,
    isOpen: isTooltipVisible,
    preferredPlacement: "top",
    maxWidth: 360,
    minWidth: 180,
    gap: 8,
    padding: 8
  });

  const cellClass = computed(() => [
    "relative h-11 outline-none transition-colors px-3 py-2 bg-white border border-transparent",
    isEditable.value ? "cursor-text" : "cursor-not-allowed bg-slate-100 text-slate-500 border-slate-200",
    isActive.value ? "bg-accent-50/70" : "",
    isEditable.value && isFocused.value ? "border-accent-200 shadow-[inset_0_0_0_2px_rgba(var(--color-accent-100),0.45)]"
    : isEditable.value ? "hover:bg-gray-50"
    : "",
    isEditable.value && isSelected.value ?
      "bg-accent-50/40 shadow-[inset_0_0_0_1px_rgba(var(--color-accent-100),0.25)]"
    : isEditable.value ? "hover:bg-gray-50"
    : "",
    isInvalid.value ? "border-error-100 shadow-[inset_0_0_0_1px_rgba(205,0,47,0.35)]" : ""
  ]);

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
    if (!isEditable.value) return;
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
    if (!isEditable.value) return;
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
    if (!isEditable.value) return;
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
    // Handle Tab separately (includes Shift+Tab)
    if (event.key === "Tab") {
      if (!isFocused.value) return;
      event.preventDefault();
      if (isActive.value) {
        stopEditing();
      }
      const direction = event.shiftKey ? "left" : "right";
      move(direction, props.rowCount, props.columnCount);
      return;
    }

    if (!isFocused.value || isActive.value) return;
    if (!isEditable.value) return;

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
      beginEditWithValue(!value.value as TRow[TKey]);
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
      if (!isEditable.value) return;
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

  watch(isEditable, (editable) => {
    if (editable) return;
    if (isEditing({ rowId: props.rowId, columnKey: String(props.columnKey) })) {
      stopEditing();
    }
  });

  watch(keys.escape, (pressed) => {
    if (!pressed || !isActive.value) {
      return;
    }

    if (hasOriginalValue.value) {
      value.value = originalValue.value;
    }

    stopEditing();
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

  onMounted(() => {
    tableRootElement.value = cellElement.value?.closest("[data-editable-table-root]") as HTMLElement | null;
  });

  function onBlur() {
    stopEditing();
  }
</script>

<template>
  <div
    tabindex="0"
    ref="cellElement"
    :class="[cellClass, !isActive ? 'select-none' : '', 'relative']"
    :aria-invalid="isInvalid ? 'true' : 'false'"
    :aria-disabled="!isEditable ? 'true' : undefined"
    :aria-describedby="isTooltipVisible ? tooltipId : undefined"
    @mousedown="onMouseDown"
    @keydown="onKeyDown"
    @dblclick="onDblClick"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false">
    <div class="w-full h-full whitespace-nowrap overflow-hidden">
      <EditableTableCellEditor
        v-model="value"
        :type="columnType"
        :select-options="selectOptions"
        :allow-custom-options="columnAllowCustomOptions"
        :select-on-focus="selectOnFocus"
        @blur="onBlur"
        class="w-full"
        :is-editable="isActive && isEditable" />
    </div>
    <teleport to="body">
      <div
        v-if="validationMessage && isTooltipVisible"
        :id="tooltipId"
        ref="tooltipElement"
        role="tooltip"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium leading-[1.35] text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.12)] break-words whitespace-normal"
        :style="tooltipPosition.style">
        {{ validationMessage }}
      </div>
    </teleport>
  </div>
</template>
