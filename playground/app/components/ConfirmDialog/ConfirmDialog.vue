<script setup lang="ts">
  import { computed } from "vue";

  /**
   * Configuration properties for the confirm dialog component.
   */
  interface Properties {
    /**
     * Dialog heading text.
     */
    title: string;

    /**
     * Main dialog message.
     */
    message: string;

    /**
     * Optional secondary hint text.
     */
    hint?: string;

    /**
     * Visual tone for hint text.
     */
    hintTone?: "danger" | "neutral";

    /**
     * Text for the confirm action button.
     */
    confirmLabel?: string;

    /**
     * Text for the cancel action button.
     */
    cancelLabel?: string;

    /**
     * Disables the confirm action button.
     */
    confirmDisabled?: boolean;

    /**
     * Visual tone for the confirm action button.
     */
    confirmTone?: "danger" | "brand" | "neutral";

    /**
     * Tailwind maximum width class applied to the dialog panel.
     */
    maxWidthClass?: string;
  }

  const isVisible = defineModel<boolean>({ default: false });

  const properties = withDefaults(defineProps<Properties>(), {
    hint: "",
    hintTone: "danger",
    confirmLabel: "Yes",
    cancelLabel: "No",
    confirmDisabled: false,
    confirmTone: "danger",
    maxWidthClass: "max-w-md"
  });

  /**
   * Emitted actions for confirm dialog interactions.
   */
  const emitEvent = defineEmits<{
    /**
     * Fired when the confirm action is selected.
     */
    (event: "confirm"): void;

    /**
     * Fired when the cancel action is selected.
     */
    (event: "cancel"): void;
  }>();

  const hintClass = computed(() => (properties.hintTone === "neutral" ? "text-slate-500" : "text-rose-700"));

  const confirmButtonClass = computed(() => {
    if (properties.confirmDisabled) return "cursor-not-allowed bg-slate-400";
    if (properties.confirmTone === "brand") return "bg-[#0A8276] hover:bg-[#086d63]";
    if (properties.confirmTone === "neutral") return "bg-slate-900 hover:bg-slate-700";
    return "bg-rose-600 hover:bg-rose-500";
  });

  /**
   * Handles cancel action and closes the dialog.
   * @returns void
   */
  function handleCancel() {
    emitEvent("cancel");
    isVisible.value = false;
  }

  /**
   * Handles confirm action.
   * @returns void
   */
  function handleConfirm() {
    emitEvent("confirm");
  }
</script>

<template>
  <AppDialog v-model="isVisible" :max-width-class="maxWidthClass">
    <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
    <p class="mt-2 text-sm text-slate-600">{{ message }}</p>
    <p v-if="hint" class="mt-2 text-xs" :class="hintClass">{{ hint }}</p>

    <div class="mt-5 flex items-center justify-end gap-2">
      <button
        type="button"
        @click="handleCancel"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        :disabled="confirmDisabled"
        @click="handleConfirm"
        class="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition"
        :class="confirmButtonClass">
        {{ confirmLabel }}
      </button>
    </div>
  </AppDialog>
</template>
