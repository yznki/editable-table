<script setup lang="ts" generic="TRow extends Record<string, any> = Record<string, any>">
  import { computed, ref, watch } from "vue";
  import { cva } from "class-variance-authority";
  import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
  import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
  import type { EditableTableColumn } from "#editable-table/types/column";
  import ContextMenu from "#editable-table/components/ContextMenu/ContextMenu.vue";

  interface EditableTableHeaderMenuProps {
    columns: EditableTableColumn<TRow>[];
    hiddenColumnKeys: string[];
    position: { left: number; top: number };
  }

  const props = defineProps<EditableTableHeaderMenuProps>();
  const isVisible = defineModel<boolean>({ default: false });

  const emit = defineEmits<{
    (event: "toggle-column", columnIndex: number): void;
    (event: "show-hidden"): void;
  }>();

  const isVisibilityMenuOpen = ref(false);
  const visibilityMenuPosition = ref<{ left: number; top: number } | null>(null);
  const visibilityMenuAlignment = ref<"start" | "end">("start");
  const visibilityButton = ref<HTMLElement | null>(null);
  const visibilityCloseTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

  const headerMenuTitle = cva("px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-grey-500");
  const headerMenuItem = cva("flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left", {
    variants: {
      hidden: {
        true: "text-grey-500 hover:bg-grey-50",
        false: "text-grey-800 hover:bg-grey-50"
      }
    },
    defaultVariants: {
      hidden: false
    }
  });
  const headerMenuSubmenuItem = cva("flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left", {
    variants: {
      active: {
        true: "bg-grey-100 text-grey-900",
        false: "hover:bg-grey-50 text-grey-800"
      }
    },
    defaultVariants: {
      active: false
    }
  });

  const hiddenCount = computed(() => props.hiddenColumnKeys.length);

  function clearVisibilityCloseTimeout() {
    if (visibilityCloseTimeout.value !== null) {
      clearTimeout(visibilityCloseTimeout.value);
      visibilityCloseTimeout.value = null;
    }
  }

  function updateVisibilityMenuPosition() {
    const trigger = visibilityButton.value;
    if (!trigger) return;
    const parentMenu = trigger.closest("[data-context-menu]") as HTMLElement | null;
    const triggerRect = trigger.getBoundingClientRect();
    const parentRect = parentMenu?.getBoundingClientRect();
    if (!parentRect) return;

    const gap = 4;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const spaceOnRight = viewportWidth ? viewportWidth - triggerRect.right : parentRect.right - triggerRect.right;
    const spaceOnLeft = viewportWidth ? triggerRect.left : triggerRect.left - parentRect.left;
    const estimatedMenuWidth = Math.max(parentRect.width, 240);
    const shouldOpenLeft = spaceOnRight < estimatedMenuWidth + gap && spaceOnLeft > spaceOnRight;

    visibilityMenuAlignment.value = shouldOpenLeft ? "end" : "start";
    visibilityMenuPosition.value = {
      left: shouldOpenLeft ? parentRect.left - gap * 4 : triggerRect.right + gap,
      top: triggerRect.top
    };
  }

  function openVisibilityMenu() {
    clearVisibilityCloseTimeout();
    updateVisibilityMenuPosition();
    isVisibilityMenuOpen.value = true;
  }

  function scheduleCloseVisibilityMenu() {
    clearVisibilityCloseTimeout();
    visibilityCloseTimeout.value = setTimeout(() => {
      isVisibilityMenuOpen.value = false;
    }, 100);
  }

  watch(isVisible, (open) => {
    if (open) {
      updateVisibilityMenuPosition();
      return;
    }
    clearVisibilityCloseTimeout();
    isVisibilityMenuOpen.value = false;
  });
</script>

<template>
  <ContextMenu v-model="isVisible" :position="props.position" alignment="start" vertical-alignment="none" transition="fade" clamp-to-viewport>
    <div class="space-y-1 min-w-64 max-w-xs">
      <div :class="headerMenuTitle()">Columns</div>
      <button
        ref="visibilityButton"
        type="button"
        :class="headerMenuSubmenuItem({ active: isVisibilityMenuOpen })"
        @mouseenter="openVisibilityMenu"
        @mouseleave="scheduleCloseVisibilityMenu"
        @click="openVisibilityMenu">
        <span class="flex min-w-0 items-center gap-2">
          <FontAwesomeIcon :icon="faEye" class="h-4 w-4 text-grey-400" />
          <span class="truncate">Visibility</span>
        </span>
        <span class="text-xs text-grey-400 shrink-0">{{ hiddenCount ? hiddenCount : "" }}</span>
      </button>
      <ContextMenu
        v-model="isVisibilityMenuOpen"
        :position="visibilityMenuPosition ?? { left: 0, top: 0 }"
        :alignment="visibilityMenuAlignment"
        vertical-alignment="none"
        transition="fade"
        clamp-to-viewport>
        <div
          class="space-y-1 min-w-64 max-w-xs"
          @mouseenter="clearVisibilityCloseTimeout"
          @mouseleave="scheduleCloseVisibilityMenu">
          <div :class="headerMenuTitle()">Visibility</div>
          <button
            v-for="(column, columnIndex) in props.columns"
            :key="`header-menu-${String(column.rowKey)}`"
            type="button"
            :class="headerMenuItem({ hidden: Boolean(column.hidden) })"
            @click="emit('toggle-column', columnIndex)">
            <span class="flex min-w-0 items-center gap-2">
              <FontAwesomeIcon :icon="column.hidden ? faEyeSlash : faEye" class="h-4 w-4 text-grey-400" />
              <span class="truncate">{{ column.title }}</span>
            </span>
            <span class="text-xs text-grey-400 shrink-0">{{ column.hidden ? "Hidden" : "Shown" }}</span>
          </button>
          <button v-if="hiddenCount" type="button" :class="headerMenuItem({ hidden: false })" @click="emit('show-hidden')">
            <span class="flex min-w-0 items-center gap-2">
              <FontAwesomeIcon :icon="faEye" class="h-4 w-4 text-grey-400" />
              <span class="truncate">Show all hidden</span>
            </span>
            <span class="text-xs text-grey-400 shrink-0">{{ hiddenCount }}</span>
          </button>
        </div>
      </ContextMenu>
    </div>
  </ContextMenu>
</template>
