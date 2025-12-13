<script setup lang="ts" generic="TRow extends Record<string, any>, TKey extends keyof TRow">
  import { computed, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  import EditableTableCellEditor from "@components/EditableTableCellEditor/EditableTableCellEditor.vue";
  import { useEditableTableEditing } from "@composables/useEditableTableEditing";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import { ColumnType } from "@models/column";

  /* --------------------------------------------------
   * styles
   * -------------------------------------------------- */

  const cellClass = cva("px-3 py-2 cursor-text outline-none transition-colors", {
    variants: {
      active: {
        true: "bg-blue-50",
        false: "hover:bg-gray-50"
      },
      focused: {
        true: "ring-2 ring-blue-400",
        false: ""
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

  const keys = useMagicKeys({ passive: false });

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

  watch(keys.escape, (pressed) => {
    if (!pressed || !isActive.value) return;

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
    if (!shouldHandleNavigationKey("ArrowLeft", pressed, isFocused.value, isActive.value)) return;
    move("left", props.rowCount, props.columnCount);
  });

  watch(keys.arrowRight, (pressed) => {
    if (!shouldHandleNavigationKey("ArrowRight", pressed, isFocused.value, isActive.value)) return;
    move("right", props.rowCount, props.columnCount);
  });

  watch(keys.arrowUp, (pressed) => {
    if (!shouldHandleNavigationKey("ArrowUp", pressed, isFocused.value, isActive.value)) return;
    move("up", props.rowCount, props.columnCount);
  });

  watch(keys.arrowDown, (pressed) => {
    if (!shouldHandleNavigationKey("ArrowDown", pressed, isFocused.value, isActive.value)) return;
    move("down", props.rowCount, props.columnCount);
  });

  /* --------------------------------------------------
   * mouse interaction
   * -------------------------------------------------- */

  function onClick() {
    setActive({
      rowIndex: props.rowIndex,
      columnIndex: props.columnIndex
    });
  }

  function onDblClick() {
    startEditing({
      rowId: props.rowId,
      columnKey: String(props.columnKey)
    });
  }
</script>

<template>
  <div
    tabindex="0"
    :class="
      cellClass({
        active: isActive,
        focused: isFocused
      })
    "
    @click="onClick"
    @dblclick="onDblClick">
    <EditableTableCellEditor v-if="isActive" v-model="value" :type="columnType" @blur="stopEditing" class="w-full" />

    <template v-else>
      {{ value }}
    </template>
  </div>
</template>
