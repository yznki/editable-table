<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref, watch } from "vue";
  import { cva } from "class-variance-authority";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import {
    faAnglesLeft,
    faAnglesRight,
    faArrowDownWideShort,
    faArrowLeftLong,
    faArrowRightLong,
    faArrowUpShortWide,
    faEyeSlash
  } from "@fortawesome/free-solid-svg-icons";
  import {
    ColumnType,
    type ColumnTypeOption,
    type EditableTableColumn,
    defaultColumnTypeOptions,
    resolveColumnTypeOption
  } from "#editable-table/types/column";
  import { useMagicKeys } from "@vueuse/core";
  import ContextMenu, { type ContextMenuPosition } from "#editable-table/components/ContextMenu/ContextMenu.vue";

  interface EditableTableColumnMenuProps {
    column: EditableTableColumn<TRow>;
    columnIndex: number;
    columnsLength: number;
    position: { left: number; top: number };
    availableTypes?: ColumnTypeOption[];
    canChangeType?: boolean;
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
    (event: "hide-column"): void;
  }>();

  const { current } = useMagicKeys();

  const isShiftHeld = computed(() => current.has("shift"));

  const isVisible = defineModel<boolean>({ default: false });

  const isTypeSubmenuOpen = ref(false);
  const typeSubmenuPosition = ref<ContextMenuPosition>({ top: 0, left: 0 });
  const typeSubmenuAlignment = ref<"start" | "end">("start");
  const typeButtonElement = ref<HTMLElement | null>(null);
  const typeSubmenuCloseTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
  const isTypeChangeAllowed = computed(() => props.canChangeType ?? true);

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
  const moveLeftIcon = computed(() => (isShiftHeld.value ? faAnglesLeft : faArrowLeftLong));
  const moveRightIcon = computed(() => (isShiftHeld.value ? faAnglesRight : faArrowRightLong));

  function clearTypeSubmenuCloseTimeout() {
    if (typeSubmenuCloseTimeout.value !== null) {
      clearTimeout(typeSubmenuCloseTimeout.value);
      typeSubmenuCloseTimeout.value = null;
    }
  }

  function updateTypeSubmenuPosition() {
    const typeRect = typeButtonElement.value?.getBoundingClientRect();
    const parentMenuRect = typeButtonElement.value?.closest("[data-context-menu]")?.getBoundingClientRect();
    if (!typeRect || !parentMenuRect) return;

    const gap = 4;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const spaceOnRight = viewportWidth ? viewportWidth - typeRect.right : parentMenuRect.right - typeRect.right;
    const spaceOnLeft = viewportWidth ? typeRect.left : typeRect.left - parentMenuRect.left;
    const estimatedMenuWidth = Math.max(parentMenuRect.width, 240);
    const shouldOpenLeft = spaceOnRight < estimatedMenuWidth + gap && spaceOnLeft > spaceOnRight;

    typeSubmenuAlignment.value = shouldOpenLeft ? "end" : "start";
    typeSubmenuPosition.value = {
      left: shouldOpenLeft ? parentMenuRect.left - gap * 4 : typeRect.right + gap,
      top: typeRect.top
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
    direction === "asc" ? emit("sort-ascending") : emit("sort-descending");
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

  function onHideColumn() {
    emit("hide-column");
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

      <template v-if="isTypeChangeAllowed">
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
        </button>

        <ContextMenu
          v-model="isTypeSubmenuOpen"
          :position="typeSubmenuPosition"
          :alignment="typeSubmenuAlignment"
          vertical-alignment="none"
          transition="fade">
          <div class="space-y-1" @mouseenter="clearTypeSubmenuCloseTimeout" @mouseleave="scheduleCloseTypeSubmenu">
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
      </template>

      <div class="mt-1 space-y-1 border-t border-gray-100 pt-2">
        <button type="button" :class="actionClass()" @click="sort('asc')">
          <span class="flex items-center gap-2">
            <FontAwesomeIcon :icon="faArrowUpShortWide" class="h-4 w-4 text-gray-500" />
            <span>Sort ascending</span>
          </span>
        </button>
        <button type="button" :class="actionClass()" @click="sort('desc')">
          <span class="flex items-center gap-2">
            <FontAwesomeIcon :icon="faArrowDownWideShort" class="h-4 w-4 text-gray-500" />
            <span>Sort descending</span>
          </span>
        </button>
        <button type="button" :class="actionClass()" @click="onHideColumn">
          <span class="flex items-center gap-2">
            <FontAwesomeIcon :icon="faEyeSlash" class="h-4 w-4 text-gray-500" />
            <span>Hide column</span>
          </span>
        </button>
        <div class="border-t border-gray-100 pt-2 space-y-1">
          <button type="button" :class="actionClass({ disabled: !canMoveLeft })" :disabled="!canMoveLeft" @click="onMoveLeft">
            <span class="flex items-center gap-2">
              <FontAwesomeIcon :icon="moveLeftIcon" class="h-4 w-4 text-gray-500" />
              <span>Move {{ !isShiftHeld ? "left" : "to start" }}</span>
            </span>
          </button>
          <button type="button" :class="actionClass({ disabled: !canMoveRight })" :disabled="!canMoveRight" @click="onMoveRight">
            <span class="flex items-center gap-2">
              <FontAwesomeIcon :icon="moveRightIcon" class="h-4 w-4 text-gray-500" />
              <span>Move {{ !isShiftHeld ? "right" : "to end" }}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </ContextMenu>
</template>
