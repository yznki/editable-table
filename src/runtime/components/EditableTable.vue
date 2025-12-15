<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { EditableTableProps } from "@models/table";
  import { useEditableTableNavigation } from "@composables/useEditableTableNavigation";
  import EditableTableCell from "./EditableTableCell/EditableTableCell.vue";

  const tableRoot = cva("w-full overflow-x-auto text-sm");

  const headerRow = cva("grid border-b border-gray-300 bg-gray-50 font-medium");
  const headerCell = cva("px-3 py-2 truncate");
  const indexCell = cva("px-2 py-2 text-right text-xs text-gray-500 select-none bg-gray-50");

  const bodyRow = cva("grid border-b border-gray-200");
  const footerRow = cva("sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur");
  const footerContent = cva("flex items-center justify-end gap-3 px-3 py-2 text-xs text-gray-600");
  const footerStat = cva("flex items-center gap-1 text-gray-700");
  const footerSelect = cva("border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400");

  const props = withDefaults(defineProps<EditableTableProps<TRow>>(), { idPropertyName: "id" });

  const rows = defineModel<TRow[]>({ default: () => [] });

  const { clearActive, activePosition } = useEditableTableNavigation();
  const tableElement = ref<HTMLElement | null>(null);

  onClickOutside(tableElement, () => {
    clearActive();
  });

  const indexColumnWidth = "3rem";
  const selectedRowIndices = ref<number[]>([]);
  const lastSelectedRow = ref<number | null>(null);

  type StatType = "sum" | "avg" | "min" | "max" | "count";
  const statOptions: { value: StatType; label: string }[] = [
    { value: "sum", label: "Sum" },
    { value: "avg", label: "Average" },
    { value: "min", label: "Min" },
    { value: "max", label: "Max" },
    { value: "count", label: "Count" }
  ];
  const selectedStat = ref<StatType>("sum");

  const getRowId = (row: TRow, rowIndex: number) => {
    const rowId = row[props.idPropertyName as keyof TRow];
    return rowId ?? rowIndex;
  };

  const gridStyle = computed(() => ({
    gridTemplateColumns: `${indexColumnWidth} repeat(${props.columns.length}, minmax(0, 1fr))`
  }));

  const isRowSelected = (rowIndex: number) => selectedRowIndices.value.includes(rowIndex);

  function onIndexClick(rowIndex: number, event: MouseEvent) {
    if (event.shiftKey && lastSelectedRow.value !== null) {
      const start = Math.min(lastSelectedRow.value, rowIndex);
      const end = Math.max(lastSelectedRow.value, rowIndex);
      selectedRowIndices.value = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    } else {
      selectedRowIndices.value = [rowIndex];
    }
    lastSelectedRow.value = rowIndex;
  }

  const visibleSelection = computed(() => {
    if (selectedRowIndices.value.length === 0) {
      return rows.value.map((_, index) => index);
    }
    return [...selectedRowIndices.value].sort((a, b) => a - b);
  });

  const activeColumn = computed(() => {
    const pos = activePosition.value;
    if (!pos) return null;
    return props.columns[pos.columnIndex];
  });

  const numericStats = computed(() => {
    const column = activeColumn.value;
    if (!column || column.type !== "number" || visibleSelection.value.length === 0) return [];

    const values = visibleSelection.value
      .map((rowIndex) => Number(rows.value[rowIndex][column.rowKey]))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return [];

    const sum = values.reduce((acc, value) => acc + value, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = values.length;

    const valueByStat: Record<StatType, number> = { sum, avg, min, max, count };
    const displayValue = valueByStat[selectedStat.value];

    return [
      {
        key: String(column.rowKey),
        title: column.title,
        value: Number.isFinite(displayValue) ? displayValue : ""
      }
    ];
  });
</script>

<template>
  <div ref="tableElement" :class="tableRoot()">
    <div :class="headerRow()" :style="gridStyle">
      <div :class="indexCell()">#</div>
      <div v-for="column in columns" :key="String(column.rowKey)" :class="headerCell()">
        {{ column.title }}
      </div>
    </div>

    <div>
      <div
        v-for="(row, rowIndex) in rows"
        :key="String(getRowId(row, rowIndex))"
        :class="[bodyRow(), isRowSelected(rowIndex) && 'bg-blue-50/40']"
        :style="gridStyle">
        <div :class="indexCell()" @click="onIndexClick(rowIndex, $event)">{{ rowIndex + 1 }}</div>
        <EditableTableCell
          v-for="(column, columnIndex) in columns"
          :key="String(column.rowKey)"
          v-model="rows[rowIndex][column.rowKey as keyof TRow]"
          :row-id="getRowId(row, rowIndex)"
          :column-key="column.rowKey"
          :column-type="column.type"
          :row-index="rowIndex"
          :column-index="columnIndex"
          :row-count="rows.length"
          :column-count="columns.length" />
      </div>
      <div :class="footerRow()">
        <div :class="footerContent()">
          <span class="text-gray-500"> Rows {{ visibleSelection[0] + 1 }}-{{ visibleSelection[visibleSelection.length - 1] + 1 }} </span>
          <div v-if="numericStats.length" class="flex items-center gap-4">
            <label class="flex items-center gap-1 text-gray-500">
              <select v-model="selectedStat" :class="footerSelect()">
                <option v-for="option in statOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
            <span v-for="stat in numericStats" :key="stat.key" :class="footerStat()">
              {{ stat.title }}:
              <strong class="font-semibold text-gray-900">{{ stat.value }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
