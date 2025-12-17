<script setup lang="ts">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  export interface ContextMenuPosition {
    left: number;
    top: number;
  }

  export interface ContextMenuProps {
    isOpen: boolean;
    position: ContextMenuPosition;
    align?: "center" | "start" | "end";
  }

  const props = withDefaults(defineProps<ContextMenuProps>(), { align: "center" });
  const emit = defineEmits<{
    (event: "close"): void;
  }>();

  const menuElement = ref<HTMLElement | null>(null);

  const menuClass = cva(
    "absolute z-20 min-w-[12rem] rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg ring-1 ring-black/5 transition"
  );

  const alignmentClass = computed(() =>
    props.align === "start" ? "" : props.align === "end" ? "-translate-x-full" : "-translate-x-1/2"
  );

  const menuStyle = computed(() => ({
    left: `${props.position.left}px`,
    top: `${props.position.top}px`
  }));

  onClickOutside(menuElement, () => {
    if (!props.isOpen) return;
    emit("close");
  });
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1">
    <div v-if="isOpen" ref="menuElement" :class="[menuClass(), alignmentClass()]" :style="menuStyle">
      <slot />
    </div>
  </Transition>
</template>
