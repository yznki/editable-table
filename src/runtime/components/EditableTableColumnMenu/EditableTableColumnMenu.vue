<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref, watch } from "vue";
  import { cva } from "class-variance-authority";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import {
    ColumnType,
    type ColumnTypeOption,
    type EditableTableColumn,
    defaultColumnTypeOptions,
    resolveColumnTypeOption
  } from "@models/column";
  import ContextMenu from "../ContextMenu/ContextMenu.vue";
  import type { ContextMenuPosition } from "../ContextMenu/ContextMenu.vue";
  import { useMagicKeys } from "@vueuse/core";

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
    (event: "sort-ascending"): void;
    (event: "sort-descending"): void;
  }>();

  const { current } = useMagicKeys();

  const isShiftHeld = computed(() => current.has("shift"));

  const isVisible = defineModel<boolean>({ default: false });

  const isTypeSubmenuOpen = ref(false);
  const typeSubmenuPosition = ref<ContextMenuPosition>({ top: 0, left: 0 });
  const typeButtonElement = ref<HTMLElement | null>(null);
  const typeSubmenuCloseTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  const optionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 transition-colors text-left", {
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

  const titleClass = cva("px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500");

  const actionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left", {
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

  const typeOptionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left", {
    variants: {
      active: {
        true: "bg-gray-100 text-gray-900",
        false: "hover:bg-gray-50 text-gray-800"
      }
    },
    defaultVariants: {
      active: false
    }
  });

  const menuPosition = computed(() => props.position);
  const typeOptions = computed<ColumnTypeOption[]>(() => {
    const availableTypes = props.availableTypes?.length ? props.availableTypes : defaultColumnTypeOptions;
    return availableTypes.map((option) => {
      const fallback = defaultColumnTypeOptions.find((defaultOption) => defaultOption.value === option.value);
      return {
        ...fallback,
        ...option,
        icon: option.icon ?? fallback?.icon
      } as ColumnTypeOption;
    });
  });
  const canMoveLeft = computed(() => props.columnIndex > 0);
  const canMoveRight = computed(() => props.columnIndex < props.columnsLength - 1);
  const currentTypeOption = computed(() => resolveColumnTypeOption(props.column.type, typeOptions.value));

  function clearTypeSubmenuCloseTimeout() {
    if (typeSubmenuCloseTimeout.value !== null) {
      clearTimeout(typeSubmenuCloseTimeout.value);
      typeSubmenuCloseTimeout.value = null;
    }
  }

  function updateTypeSubmenuPosition() {
    const typeRect = typeButtonElement.value?.getBoundingClientRect();
    const tableRootRect = typeButtonElement.value?.closest("[data-editable-table-root]")?.getBoundingClientRect();
    if (!typeRect || !tableRootRect) return;

    typeSubmenuPosition.value = {
      left: typeRect.right - tableRootRect.left + 4,
      top: typeRect.top - tableRootRect.top + typeRect.height / 2
    };
  }

  function openTypeSubmenu() {
    clearTypeSubmenuCloseTimeout();
    updateTypeSubmenuPosition();
    isTypeSubmenuOpen.value = true;
  }

  function scheduleCloseTypeSubmenu() {
    clearTypeSubmenuCloseTimeout();
    typeSubmenuCloseTimeout.value = setTimeout(() => {
      isTypeSubmenuOpen.value = false;
    }, 100);
  }

  function selectType(type: ColumnType) {
    emit("select-type", type);
    isVisible.value = false;
    isTypeSubmenuOpen.value = false;
  }

  function sort(direction: "asc" | "desc") {
    emit(direction === "asc" ? "sort-ascending" : "sort-descending");
    isVisible.value = false;
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
      if (open) {
        updateTypeSubmenuPosition();
      } else {
        clearTypeSubmenuCloseTimeout();
        isTypeSubmenuOpen.value = false;
      }
    }
  );
</script>

<template>
  <ContextMenu v-model="isVisible" :position="menuPosition" alignment="center">
    <div class="relative">
      <div :class="titleClass()">
        {{ column.title }}
      </div>

      <button
        ref="typeButtonElement"
        type="button"
        :class="optionClass({ active: isTypeSubmenuOpen })"
        @mouseenter="openTypeSubmenu"
        @mouseleave="scheduleCloseTypeSubmenu">
        <div class="flex items-center gap-2">
          <FontAwesomeIcon v-if="currentTypeOption.icon" :icon="currentTypeOption.icon" class="h-4 w-4 text-gray-600" />
          <span class="font-medium">Type</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-500">
          <FontAwesomeIcon v-if="currentTypeOption.icon" :icon="currentTypeOption.icon" class="h-3 w-3" />
          <span>{{ currentTypeOption.label }}</span>
        </div>
      </button>

      <ContextMenu
        v-model="isTypeSubmenuOpen"
        :position="typeSubmenuPosition"
        alignment="start"
        vertical-alignment="center"
        transition="fade"
        @mouseenter="clearTypeSubmenuCloseTimeout"
        @mouseleave="scheduleCloseTypeSubmenu">
        <div class="space-y-1">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            :class="typeOptionClass({ active: option.value === currentTypeOption.value })"
            @click="selectType(option.value)">
            <div class="flex items-center gap-2">
              <FontAwesomeIcon v-if="option.icon" :icon="option.icon" class="h-4 w-4" />
              <span>{{ option.label }}</span>
            </div>
            <span v-if="option.value === currentTypeOption.value" class="text-xs text-gray-500">Current</span>
          </button>
        </div>
      </ContextMenu>

      <div class="mt-1 space-y-1 border-t border-gray-100 pt-2">
        <button type="button" :class="actionClass()" @click="sort('asc')">Sort ascending</button>
        <button type="button" :class="actionClass()" @click="sort('desc')">Sort descending</button>
        <div class="border-t border-gray-100 pt-2 space-y-1">
          <button type="button" :class="actionClass({ disabled: !canMoveLeft })" :disabled="!canMoveLeft" @click="onMoveLeft">
            Move {{ !isShiftHeld ? "left" : "to start" }}
          </button>
          <button type="button" :class="actionClass({ disabled: !canMoveRight })" :disabled="!canMoveRight" @click="onMoveRight">
            Move {{ !isShiftHeld ? "right" : "to end" }}
          </button>
        </div>
      </div>
    </div>
  </ContextMenu>
</template>
