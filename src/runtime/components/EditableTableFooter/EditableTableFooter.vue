<script setup lang="ts">
  import { cva } from "class-variance-authority";

  import { computed, ref } from "vue";
  import type { PropType } from "vue";

  type StatType = "sum" | "average" | "minimum" | "maximum" | "count";

  const statOptions: { value: StatType; label: string }[] = [
    { value: "sum", label: "Sum" },
    { value: "average", label: "Average" },
    { value: "minimum", label: "Minimum" },
    { value: "maximum", label: "Maximum" },
    { value: "count", label: "Count" }
  ];
  const selectedStat = ref<StatType>("sum");

  const props = defineProps({
    rows: { type: Array as PropType<any[]>, required: true },
    columns: { type: Array as PropType<any[]>, required: true },
    selectionRange: { type: Object as PropType<any>, required: true },
    selectedRowIndexes: { type: Array as PropType<number[]>, required: true },
    selectedColumnIndexes: { type: Array as PropType<number[]>, required: true }
  });

  const footerRow = cva("sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-end");
  const footerContent = cva("flex items-center justify-end gap-3 px-3 py-2 text-xs text-gray-600");
  const footerStat = cva("flex items-center gap-1 text-gray-700");
  const footerSelect = cva("border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400");

  const numericStats = computed(() => {
    if (!props.selectionRange) return [];

    const columnsInSelection = props.selectedColumnIndexes
      .map((colIndex) => ({ index: colIndex, column: props.columns[colIndex] }))
      .filter(({ column }) => column && column.type === "number");

    if (!columnsInSelection.length) return [];

    let rowsInSelection = props.selectedRowIndexes;

    if (props.selectionRange.startRowIndex === props.selectionRange.endRowIndex) {
      rowsInSelection = props.rows.map((_, rowIndex) => rowIndex);
    }

    return columnsInSelection
      .map(({ column }) => {
        const numericValues = rowsInSelection
          .map((rowIndex) => Number(props.rows[rowIndex]?.[column.rowKey]))
          .filter((value) => Number.isFinite(value));

        if (!numericValues.length) return null;

        const sumOfValues = numericValues.reduce((accumulator, value) => accumulator + value, 0);
        const averageValue = sumOfValues / numericValues.length;
        const minimumValue = Math.min(...numericValues);
        const maximumValue = Math.max(...numericValues);
        const countOfValues = numericValues.length;

        const valueByStatistic: Record<StatType, number> = {
          sum: sumOfValues,
          average: averageValue,
          minimum: minimumValue,
          maximum: maximumValue,
          count: countOfValues
        };
        const displayValue = valueByStatistic[selectedStat.value];

        return {
          key: String(column.rowKey),
          title: column.title,
          value: Number.isFinite(displayValue) ? displayValue : ""
        };
      })
      .filter((statistic): statistic is { key: string; title: string; value: number | string } => Boolean(statistic));
  });
</script>

<template>
  <div :class="footerRow()">
    <div :class="footerContent()">
      <template v-if="numericStats.length">
        <label class="flex items-center gap-1 text-gray-500">
          <select v-model="selectedStat" :class="footerSelect()">
            <option v-for="option in statOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <span v-for="statistic in numericStats" :key="statistic.key" :class="footerStat()">
          {{ statistic.title }}:
          <strong class="font-semibold text-gray-900">{{ statistic.value }}</strong>
        </span>
      </template>
    </div>
  </div>
</template>
