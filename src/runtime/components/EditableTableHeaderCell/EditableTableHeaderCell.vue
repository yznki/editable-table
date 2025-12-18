<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed } from "vue";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import type { ColumnType, ColumnTypeOption, EditableTableColumn } from "@models/column";

  interface EditableTableHeaderCellProps {
    column: EditableTableColumn<TRow>;
    columnIndex: number;
    draggingColumnIndex?: number | null;
    draggingColumnClass?: string;
    headerClass?: string;
    getColumnTypeOption: (type?: ColumnType) => ColumnTypeOption;
  }

  const props = defineProps<EditableTableHeaderCellProps>();
  const emit = defineEmits<{
    (event: "header-click", columnIndex: number, originalEvent: MouseEvent | KeyboardEvent): void;
    (event: "pointer-down", columnIndex: number, originalEvent: PointerEvent): void;
  }>();

  const isDragging = computed(() => props.draggingColumnIndex === props.columnIndex);
  const columnTypeOption = computed(() => props.getColumnTypeOption(props.column.type));
</script>

<template>
  <div
    :class="[headerClass, isDragging ? draggingColumnClass : '', 'flex items-center gap-2 truncate']"
    role="button"
    tabindex="0"
    :data-column-index="columnIndex"
    :data-column-key="String(column.rowKey)"
    @pointerdown="(event) => emit('pointer-down', columnIndex, event)"
    @click="(event) => emit('header-click', columnIndex, event)">
    <div class="flex min-w-0 items-center gap-2">
      <FontAwesomeIcon v-if="columnTypeOption.icon" :icon="columnTypeOption.icon" class="text-gray-400" size="xs" />
      <span class="truncate">{{ column.title }}</span>
    </div>
  </div>
</template>
