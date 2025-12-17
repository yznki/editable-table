<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import { cva } from "class-variance-authority";
  import { ColumnType } from "@models/column";
  import ContextMenu from "../ContextMenu/ContextMenu.vue";

  interface ColumnTypeOption {
    value: ColumnType;
    label: string;
  }

  interface EditableTableColumnMenuProps {
    columnTitle: string;
    columnType: ColumnType;
    position: { left: number; top: number };
    availableTypes: ColumnTypeOption[];
    canMoveLeft: boolean;
    canMoveRight: boolean;
  }

  const props = defineProps<EditableTableColumnMenuProps>();

  const emit = defineEmits<{
    (event: "select-type", type: ColumnType): void;
    (event: "move-left"): void;
    (event: "move-right"): void;
  }>();

  const isVisible = defineModel<boolean>({ default: false });

  const isTypeSelectorOpen = ref(false);

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
    if (!props.canMoveLeft) return;
    emit("move-left");
    isVisible.value = false;
  }

  function onMoveRight() {
    if (!props.canMoveRight) return;
    emit("move-right");
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
      {{ columnTitle }}
    </div>
    <button v-if="!isTypeSelectorOpen" type="button" :class="optionClass({ active: isTypeSelectorOpen })" @click="toggleTypeSelector">
      <span class="font-medium">Type</span>
      <span class="text-xs text-gray-500">{{ columnType }}</span>
    </button>

    <div v-if="isTypeSelectorOpen" class="px-1">
      <select :value="columnType" :class="selectClass()" @change="onTypeChange">
        <option v-for="option in availableTypes" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="mt-1 space-y-1 border-t border-gray-100 pt-2">
      <button type="button" :class="actionClass({ disabled: !canMoveLeft })" :disabled="!canMoveLeft" @click="onMoveLeft">Move left</button>
      <button type="button" :class="actionClass({ disabled: !canMoveRight })" :disabled="!canMoveRight" @click="onMoveRight">
        Move right
      </button>
    </div>
  </ContextMenu>
</template>
