<script setup lang="ts">
  import { computed } from "vue";
  import { cva } from "class-variance-authority";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { faArrowDown, faArrowUp, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";

  import ContextMenu from "@components/ContextMenu/ContextMenu.vue";
  import type { ContextMenuPosition } from "@components/ContextMenu/ContextMenu.vue";

  interface EditableTableRowMenuProps {
    position: ContextMenuPosition;
    rowIndex: number;
    rowsLength: number;
  }

  const props = defineProps<EditableTableRowMenuProps>();

  const emit = defineEmits<{
    (event: "insert-above"): void;
    (event: "insert-below"): void;
    (event: "move-up"): void;
    (event: "move-down"): void;
    (event: "delete-row"): void;
  }>();

  const isVisible = defineModel<boolean>({ default: false });

  const titleClass = cva("px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500");
  const actionClass = cva("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left", {
    variants: {
      destructive: {
        true: "text-red-600 hover:bg-red-50",
        false: "text-gray-800 hover:bg-gray-50"
      },
      disabled: {
        true: "cursor-not-allowed text-gray-400 hover:bg-transparent",
        false: ""
      }
    },
    compoundVariants: [
      {
        destructive: true,
        disabled: true,
        class: "text-red-300 hover:bg-transparent"
      }
    ],
    defaultVariants: {
      destructive: false,
      disabled: false
    }
  });

  const canMoveUp = computed(() => props.rowIndex > 0);
  const canMoveDown = computed(() => props.rowIndex < props.rowsLength - 1);

  function onInsertAbove() {
    emit("insert-above");
    isVisible.value = false;
  }

  function onInsertBelow() {
    emit("insert-below");
    isVisible.value = false;
  }

  function onMoveUp() {
    if (!canMoveUp.value) return;
    emit("move-up");
    isVisible.value = false;
  }

  function onMoveDown() {
    if (!canMoveDown.value) return;
    emit("move-down");
    isVisible.value = false;
  }

  function onDeleteRow() {
    emit("delete-row");
    isVisible.value = false;
  }
</script>

<template>
  <ContextMenu v-model="isVisible" :position="props.position" alignment="start" vertical-alignment="center" clamp-to-viewport>
    <div class="w-56 space-y-1">
      <div :class="titleClass()">Row {{ props.rowIndex + 1 }}</div>

      <button type="button" :class="actionClass()" @click="onInsertAbove">
        <span class="flex items-center gap-2">
          <FontAwesomeIcon :icon="faPlus" class="h-4 w-4 text-gray-500" />
          <span>Add row above</span>
        </span>
      </button>

      <button type="button" :class="actionClass()" @click="onInsertBelow">
        <span class="flex items-center gap-2">
          <FontAwesomeIcon :icon="faPlus" class="h-4 w-4 text-gray-500" />
          <span>Add row below</span>
        </span>
      </button>

      <div class="my-1 border-t border-gray-200" />

      <button type="button" :class="actionClass({ disabled: !canMoveUp })" @click="onMoveUp">
        <span class="flex items-center gap-2">
          <FontAwesomeIcon :icon="faArrowUp" class="h-4 w-4 text-gray-500" />
          <span>Move up</span>
        </span>
      </button>

      <button type="button" :class="actionClass({ disabled: !canMoveDown })" @click="onMoveDown">
        <span class="flex items-center gap-2">
          <FontAwesomeIcon :icon="faArrowDown" class="h-4 w-4 text-gray-500" />
          <span>Move down</span>
        </span>
      </button>

      <div class="my-1 border-t border-gray-200" />

      <button type="button" :class="actionClass({ destructive: true })" @click="onDeleteRow">
        <span class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-red-500" />
          <span>Delete row</span>
        </span>
        <FontAwesomeIcon :icon="faTrashCan" class="h-4 w-4 text-red-500" />
      </button>
    </div>
  </ContextMenu>
</template>
