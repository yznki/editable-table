<script setup lang="ts">
  import { ref } from "vue";
  import { onClickOutside } from "@vueuse/core";

  /**
   * Configuration properties for the base dialog component.
   */
  interface Properties {
    /**
     * Tailwind maximum width class applied to the dialog panel.
     */
    maxWidthClass?: string;

    /**
     * Enables closing the dialog when the backdrop is clicked.
     */
    closeOnBackdrop?: boolean;

    /**
     * Enables closing the dialog when clicking outside the dialog panel.
     */
    closeOnOutside?: boolean;
  }

  const isVisible = defineModel<boolean>({ default: false });

  const properties = withDefaults(defineProps<Properties>(), {
    maxWidthClass: "max-w-md",
    closeOnBackdrop: true,
    closeOnOutside: true
  });

  const panelElement = ref<HTMLElement | null>(null);

  /**
   * Closes the dialog.
   * @returns void
   */
  function closeDialog() {
    isVisible.value = false;
  }

  /**
   * Handles backdrop click and closes when enabled.
   * @returns void
   */
  function handleBackdropClick() {
    if (!properties.closeOnBackdrop) return;
    closeDialog();
  }

  onClickOutside(panelElement, () => {
    if (!isVisible.value || !properties.closeOnOutside) return;
    closeDialog();
  });
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm"
        @click="handleBackdropClick" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]">
      <div v-if="isVisible" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          ref="panelElement"
          :class="['w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl', maxWidthClass]"
          role="dialog"
          aria-modal="true">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
