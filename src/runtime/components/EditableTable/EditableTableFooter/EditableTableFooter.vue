<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { type EditableTableColumn } from "#editable-table/types/column";
  import { cva } from "class-variance-authority";
  import { computed, ref } from "vue";

  type StatType = "sum" | "average" | "minimum" | "maximum" | "count";

  const statOptions: { value: StatType; label: string }[] = [
    { value: "sum", label: "Sum" },
    { value: "average", label: "Average" },
    { value: "minimum", label: "Minimum" },
    { value: "maximum", label: "Maximum" },
    { value: "count", label: "Count" }
  ];
  const selectedStat = ref<StatType>("sum");

  const props = defineProps<{
    rows: TRow[];
    columns: EditableTableColumn<TRow>[];
    selectionRange: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number } | null;
    selectedRowIndexes: number[];
    selectedColumnIndexes: number[];
  }>();

  const footerRow = cva("sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur flex justify-end");
  const footerContent = cva("flex items-center justify-end gap-3 px-3 py-2 text-xs text-gray-600");
  const footerStat = cva("flex items-center gap-1 text-gray-700");
  const footerSelect = cva(
    "border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-accent-100"
  );

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
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2">
    <div v-if="hasStats" :class="footerRow()">
      <div :class="footerContent()">
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
      </div>
    </div>
  </Transition>
</template>
