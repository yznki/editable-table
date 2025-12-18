<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { nextTick } from "vue";
  import { cva } from "class-variance-authority";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { faPlus } from "@fortawesome/free-solid-svg-icons";
  import type { EditableTableColumn } from "@models/column";

  interface EditableTableAddRowProps {
    rows: TRow[];
    columns: EditableTableColumn<TRow>[];
    gridStyle: Record<string, string>;
    bodyWrapperElement: HTMLElement | null;
    addRow: (afterRowIndex?: number) => number;
    focusAndEditCell: (rowIndex: number, columnIndex: number) => Promise<void> | void;
  }

  const props = defineProps<EditableTableAddRowProps>();

  async function onAddRowClick(targetColumnIndex = 0) {
    const columnIndex = Math.min(targetColumnIndex, Math.max(0, props.columns.length - 1));
    const newRowIndex = props.addRow(props.rows.length - 1);
    await nextTick();
    props.bodyWrapperElement?.scrollTo({ top: props.bodyWrapperElement.scrollHeight });
    if (props.columns.length) {
      props.focusAndEditCell(newRowIndex, columnIndex);
    }
  }

  const addRowRow = cva("grid border-b border-gray-200 bg-gray-100 text-gray-600");
  const addRowButton = cva(
    "col-span-full flex items-center justify-center gap-2 py-2 text-sm font-medium w-full cursor-pointer select-none transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
  );
  const addRowIcon = cva("text-gray-500");
</script>

<template>
  <div :class="addRowRow()" :style="gridStyle">
    <button
      type="button"
      :class="addRowButton()"
      title="Add new row"
      aria-label="Add new row"
      @click="onAddRowClick()"
      @keydown.enter.prevent="onAddRowClick()"
      @keydown.space.prevent="onAddRowClick()">
      <FontAwesomeIcon :icon="faPlus" :class="addRowIcon()" />
    </button>
  </div>
</template>
