<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { EditableTableColumn } from "#editable-table/types/column";
  import { cva } from "class-variance-authority";
  import { computed, ref } from "vue";

  type StatType = "sum" | "average" | "minimum" | "maximum" | "count";

  interface EditableTableFooterProps {
    rows: TRow[];
    columns: EditableTableColumn<TRow>[];
    selectionRange: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number } | null;
    selectedRowIndexes: number[];
    selectedColumnIndexes: number[];
  }

  const statOptions: { value: StatType; label: string }[] = [
    { value: "sum", label: "Sum" },
    { value: "average", label: "Average" },
    { value: "minimum", label: "Minimum" },
    { value: "maximum", label: "Maximum" },
    { value: "count", label: "Count" }
  ];
  const selectedStat = ref<StatType>("sum");

  const props = defineProps<EditableTableFooterProps>();

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

  const hasStats = computed(() => numericStats.value.length > 0);
</script>

<template>
  <div :class="footerRow()">
    <div :class="[footerContent(), hasStats ? '' : 'invisible pointer-events-none']" :aria-hidden="!hasStats">
      <label class="flex items-center gap-1 text-gray-500">
        <select v-model="selectedStat" :class="footerSelect()" :disabled="!hasStats">
          <option v-for="option in statOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <span v-for="statistic in numericStats" :key="statistic.key" :class="footerStat()">
        {{ statistic.title }}:
        <strong class="font-semibold text-gray-900">{{ statistic.value }}</strong>
      </span>
    </div>
  </div>
</template>
