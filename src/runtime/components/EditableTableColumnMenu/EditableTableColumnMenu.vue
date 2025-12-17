<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref, watch } from "vue";
  import { cva } from "class-variance-authority";
  import { ColumnType, type EditableTableColumn } from "@models/column";
  import ContextMenu from "../ContextMenu/ContextMenu.vue";
  import { useMagicKeys } from "@vueuse/core";

  interface ColumnTypeOption {
    value: ColumnType;
    label: string;
  }

  interface EditableTableColumnMenuProps {
    column: EditableTableColumn<TRow>;
    columnIndex: number;
    columnsLength: number;
    position: { left: number; top: number };
    availableTypes?: ColumnTypeOption[];
  }

  const props = defineProps<EditableTableColumnMenuProps>();

  const emit = defineEmits<{
    (event: "select-type", type: ColumnType): void;
    (event: "move-left"): void;
    (event: "move-right"): void;
    (event: "move-first"): void;
    (event: "move-last"): void;
  }>();

  const { current } = useMagicKeys();

  const isShiftHeld = computed(() => current.has("shift"));

  const isVisible = defineModel<boolean>({ default: false });

  const isTypeSelectorOpen = ref(false);

  const defaultTypeOptions: ColumnTypeOption[] = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "select", label: "Select" },
    { value: "date", label: "Date" },
    { value: "custom", label: "Custom" }
  ];

  const optionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 transition-colors", {
    variants: {
      active: {
        true: "bg-gray-100 text-gray-900",
        false: "hover:bg-gray-50"
      }
    },
    defaultVariants: {
      active: false
    }
  });

  const selectClass = cva(
    "mt-2 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
  );

  const titleClass = cva("px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500");

  const actionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors", {
    variants: {
      disabled: {
        true: "text-gray-400 cursor-not-allowed",
        false: "hover:bg-gray-50 text-gray-800"
      }
    },
    defaultVariants: {
      disabled: false
    }
  });

  const menuPosition = computed(() => props.position);
  const typeOptions = computed(() => props.availableTypes ?? defaultTypeOptions);
  const canMoveLeft = computed(() => props.columnIndex > 0);
  const canMoveRight = computed(() => props.columnIndex < props.columnsLength - 1);

  function toggleTypeSelector() {
    isTypeSelectorOpen.value = !isTypeSelectorOpen.value;
  }

  function onTypeChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value as ColumnType | undefined;
    if (!value) return;
    emit("select-type", value);
    isVisible.value = false;
    isTypeSelectorOpen.value = false;
  }

  function onMoveLeft() {
    if (!canMoveLeft.value) return;
    isShiftHeld.value ? emit("move-first") : emit("move-left");
    isVisible.value = false;
  }

  function onMoveRight() {
    if (!canMoveRight.value) return;
    isShiftHeld.value ? emit("move-last") : emit("move-right");
    isVisible.value = false;
  }

  watch(
    () => isVisible.value,
    (open) => {
      if (!open) {
        isTypeSelectorOpen.value = false;
      }
    }
  );
</script>

<template>
  <ContextMenu v-model="isVisible" :position="menuPosition" alignment="center">
    <div :class="titleClass()">
      {{ column.title }}
    </div>
    <button v-if="!isTypeSelectorOpen" type="button" :class="optionClass({ active: isTypeSelectorOpen })" @click="toggleTypeSelector">
      <span class="font-medium">Type</span>
      <span class="text-xs text-gray-500">{{ column.type ?? "text" }}</span>
    </button>

    <div v-if="isTypeSelectorOpen" class="px-1">
      <select :value="column.type ?? 'text'" :class="selectClass()" @change="onTypeChange">
        <option v-for="option in typeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="mt-1 space-y-1 border-t border-gray-100 pt-2">
      <button type="button" :class="actionClass({ disabled: !canMoveLeft })" :disabled="!canMoveLeft" @click="onMoveLeft">
        Move {{ !isShiftHeld ? "left" : "to start" }}
      </button>
      <button type="button" :class="actionClass({ disabled: !canMoveRight })" :disabled="!canMoveRight" @click="onMoveRight">
        Move {{ !isShiftHeld ? "right" : "to end" }}
      </button>
    </div>
  </ContextMenu>
</template>
