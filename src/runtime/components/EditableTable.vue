<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { EditableTableProps } from "@models/table";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import EditableTableCell from "./EditableTableCell/EditableTableCell.vue";

  const tableRoot = cva("w-full overflow-x-auto text-sm");

  const headerRow = cva("grid border-b bg-gray-50 font-medium");
  const headerCell = cva("px-3 py-2 truncate");

  const bodyRow = cva("grid border-b");

  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { idPropertyName: "id" });

  const rows = defineModel<TRow[]>({ default: () => [] });

  const { clearActive } = useEditableTableNavigation();
  const tableElement = ref<HTMLElement | null>(null);

  onClickOutside(tableElement, () => {
    clearActive();
  });

  const getRowId = (row: TRow, rowIndex: number) => {
    const rowId = row[props.idPropertyName as keyof TRow];
    return rowId ?? rowIndex;
  };

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${props.columns.length}, minmax(0, 1fr))`
  }));
</script>

<template>
  <div ref="tableElement" :class="tableRoot()">
    <!-- Header -->
    <div :class="headerRow()" :style="gridStyle">
      <div v-for="column in columns" :key="String(column.rowKey)" :class="headerCell()">
        {{ column.title }}
      </div>
    </div>

    <!-- Rows -->
    <div>
      <div v-for="(row, rowIndex) in rows" :key="String(getRowId(row, rowIndex))" :class="bodyRow()" :style="gridStyle">
        <EditableTableCell
          v-for="(column, columnIndex) in columns"
          :key="String(column.rowKey)"
          v-model="row[column.rowKey]"
          :row-id="getRowId(row, rowIndex)"
          :column-key="column.rowKey"
          :column-type="column.type"
          :row-index="rowIndex"
          :column-index="columnIndex"
          :row-count="rows.length"
          :column-count="columns.length" />
      </div>
    </div>
  </div>
</template>
