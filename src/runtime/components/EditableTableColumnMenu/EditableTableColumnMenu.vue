<script setup lang="ts">
  import { computed, ref, watch } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";
  import { ColumnType } from "@models/column";

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
  }

  const props = defineProps<EditableTableColumnMenuProps>();
  const emit = defineEmits<{
    (event: "close"): void;
    (event: "select-type", type: ColumnType): void;
  }>();

  const menuElement = ref<HTMLElement | null>(null);
  const isTypeSelectorOpen = ref(false);

  const menuClass = cva(
    "absolute z-20 min-w-[12rem] rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg ring-1 ring-black/5 transition"
  );
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

  const menuStyle = computed(() => ({
    left: `${props.position.left}px`,
    top: `${props.position.top}px`
  }));

  watch(
    () => props.isOpen,
    (open) => {
      if (!open) {
        isTypeSelectorOpen.value = false;
      }
    }
  );

  onClickOutside(menuElement, () => {
    if (!props.isOpen) return;
    emit("close");
    isTypeSelectorOpen.value = false;
  });

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
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1">
    <div v-if="isOpen" ref="menuElement" :class="[menuClass(), '-translate-x-1/2']" :style="menuStyle">
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
    </div>
  </Transition>
</template>
