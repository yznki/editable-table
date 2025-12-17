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
    isOpen: boolean;
    availableTypes: ColumnTypeOption[];
    canMoveLeft: boolean;
    canMoveRight: boolean;
  }

  const props = defineProps<EditableTableColumnMenuProps>();
  const emit = defineEmits<{
    (event: "close"): void;
    (event: "select-type", type: ColumnType): void;
    (event: "move-left"): void;
    (event: "move-right"): void;
  }>();

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

  watch(
    () => props.isOpen,
    (open) => {
      if (!open) {
        isTypeSelectorOpen.value = false;
      }
    }
  );

  function toggleTypeSelector() {
    isTypeSelectorOpen.value = !isTypeSelectorOpen.value;
  }

  function onTypeChange(event: Event) {
    const value = (event.target as HTMLSelectElement | null)?.value as ColumnType | undefined;
    if (!value) return;
    emit("select-type", value);
    emit("close");
    isTypeSelectorOpen.value = false;
  }
</script>

<template>
  <ContextMenu :is-open="isOpen" :position="menuPosition" align="center" @close="emit('close')">
    <div :class="titleClass()">
      {{ columnTitle }}
    </div>
    <button type="button" :class="optionClass({ active: isTypeSelectorOpen })" @click="toggleTypeSelector">
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
      <button
        type="button"
        :class="actionClass({ disabled: !canMoveLeft })"
        :disabled="!canMoveLeft"
        @click="
          () => {
            if (!canMoveLeft) return;
            emit('move-left');
            emit('close');
          }
        ">
        Move left
      </button>
      <button
        type="button"
        :class="actionClass({ disabled: !canMoveRight })"
        :disabled="!canMoveRight"
        @click="
          () => {
            if (!canMoveRight) return;
            emit('move-right');
            emit('close');
          }
        ">
        Move right
      </button>
    </div>
  </ContextMenu>
</template>
