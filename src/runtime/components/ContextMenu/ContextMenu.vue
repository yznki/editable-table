<script setup lang="ts">
  import { computed, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { cva } from "class-variance-authority";

  export interface ContextMenuPosition {
    left: number;
    top: number;
  }

  export interface ContextMenuProps {
    position: ContextMenuPosition;
    alignment?: "center" | "start" | "end";
    verticalAlignment?: "none" | "center";
    transition?: "default" | "fade";
  }

  const props = withDefaults(defineProps<ContextMenuProps>(), {
    alignment: "center",
    verticalAlignment: "none",
    transition: "default"
  });

  const isVisible = defineModel<boolean>({ default: false });

  const menuElement = ref<HTMLElement | null>(null);

  const menuClass = cva(
    "absolute z-20 min-w-48 rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg ring-1 ring-black/5 transition"
  );

  const alignmentClass = computed(() =>
    props.alignment === "start" ? ""
    : props.alignment === "end" ? "-translate-x-full"
    : "-translate-x-1/2"
  );

  const verticalAlignmentClass = computed(() => (props.verticalAlignment === "center" ? "-translate-y-1/2" : ""));

  const menuStyle = computed(() => ({
    left: `${props.position.left}px`,
    top: `${props.position.top}px`
  }));

  onClickOutside(menuElement, () => {
    if (!isVisible.value) return;
    isVisible.value = false;
  });
</script>

<template>
  <Transition
    :enter-active-class="props.transition === 'fade' ? 'transition duration-120 ease-out' : 'transition duration-150 ease-out'"
    :enter-from-class="props.transition === 'fade' ? 'opacity-0' : 'opacity-0 -translate-y-1'"
    :enter-to-class="props.transition === 'fade' ? 'opacity-100' : 'opacity-100 translate-y-0'"
    :leave-active-class="props.transition === 'fade' ? 'transition duration-100 ease-in' : 'transition duration-100 ease-in'"
    :leave-from-class="props.transition === 'fade' ? 'opacity-100' : 'opacity-100 translate-y-0'"
    :leave-to-class="props.transition === 'fade' ? 'opacity-0' : 'opacity-0 -translate-y-1'">
    <div v-if="isVisible" ref="menuElement" :class="[menuClass(), alignmentClass, verticalAlignmentClass]" :style="menuStyle">
      <slot />
    </div>
  </Transition>
</template>
