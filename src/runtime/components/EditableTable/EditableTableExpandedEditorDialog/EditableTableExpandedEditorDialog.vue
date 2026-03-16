<script setup lang="ts">
  import { nextTick, ref, watch } from "vue";

  /**
   * Properties for the expanded editor dialog.
   */
  interface EditableTableExpandedEditorDialogProps {
    /**
     * Dialog title shown in the header.
     */
    title: string;
  }

  const props = defineProps<EditableTableExpandedEditorDialogProps>();

  const emit = defineEmits<{
    /**
     * Fired when the user cancels editing.
     */
    (event: "cancel"): void;
  }>();

  const isVisible = defineModel<boolean>("isVisible", { default: false });
  const value = defineModel<string>({ default: "" });

  const editorTextareaElement = ref<HTMLTextAreaElement | null>(null);

  function closeByCancel() {
    isVisible.value = false;
    emit("cancel");
  }

  watch(isVisible, async (visible) => {
    if (!visible) return;

    await nextTick();
    editorTextareaElement.value?.focus();
  });
</script>

<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="props.title">
      <button class="absolute inset-0 bg-slate-900/45" @click="closeByCancel" aria-label="Close editor" />
      <div class="relative z-[1] flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.24)]">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-slate-900">
            {{ props.title }}
          </h3>
          <div class="text-xs text-slate-500">Esc to close</div>
        </div>

        <textarea
          ref="editorTextareaElement"
          v-model="value"
          rows="14"
          class="min-h-[220px] w-full flex-1 resize-y overflow-auto rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-accent-300 focus:ring-2 focus:ring-accent-100" />

        <div class="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 bg-white pt-3">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            @click="closeByCancel">
            Close
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>
