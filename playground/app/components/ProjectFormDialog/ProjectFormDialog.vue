<script setup lang="ts">
  import { computed, reactive, watch } from "vue";

  /**
   * Configuration properties for the project form dialog.
   */
  interface Properties {
    /**
     * Enables edit mode labels and behavior.
     */
    isEditMode: boolean;

    /**
     * Initial project name applied when opening the dialog.
     */
    initialName?: string;

    /**
     * Initial project description applied when opening the dialog.
     */
    initialDescription?: string;
  }

  /**
   * Payload for submitted project form data.
   */
  interface ProjectFormSubmission {
    /**
     * Project name value.
     */
    name: string;

    /**
     * Project description value.
     */
    description: string;
  }

  const isVisible = defineModel<boolean>({ default: false });

  const properties = withDefaults(defineProps<Properties>(), {
    initialName: "",
    initialDescription: ""
  });

  /**
   * Emitted actions for the project form dialog.
   */
  const emitEvent = defineEmits<{
    /**
     * Fired when valid form data is submitted.
     */
    (event: "submit", payload: ProjectFormSubmission): void;
  }>();

  const formState = reactive({
    name: "",
    description: ""
  });

  const canSubmit = computed(() => formState.name.trim().length > 0);

  /**
   * Closes the dialog.
   * @returns void
   */
  function closeDialog() {
    isVisible.value = false;
  }

  /**
   * Submits the form when valid.
   * @returns void
   */
  function submitForm() {
    if (!canSubmit.value) return;

    emitEvent("submit", {
      name: formState.name.trim(),
      description: formState.description.trim()
    });
  }

  watch(
    () => isVisible.value,
    (isDialogVisible) => {
      if (!isDialogVisible) return;
      formState.name = properties.initialName;
      formState.description = properties.initialDescription;
    },
    { immediate: true }
  );
</script>

<template>
  <AppDialog v-model="isVisible" max-width-class="max-w-lg">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-xl font-bold">{{ isEditMode ? "Edit Project" : "Create Project" }}</h3>
        <p class="mt-1 text-sm text-slate-600">
          {{ isEditMode ? "Update project metadata." : "Define project metadata. Requirement sets start with one default sheet." }}
        </p>
      </div>
      <button
        type="button"
        aria-label="Close dialog"
        @click="closeDialog"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-[#0A8276]/40 hover:bg-[#0A8276]/5">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <form class="mt-5 space-y-3" @submit.prevent="submitForm">
      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Name</span>
        <input
          v-model="formState.name"
          required
          type="text"
          placeholder="Powertrain Controller"
          class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0A8276] focus:ring-2 focus:ring-[#0A8276]/15" />
      </label>

      <label class="block">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</span>
        <textarea
          v-model="formState.description"
          rows="4"
          placeholder="Scope, stakeholders, and engineering context"
          class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0A8276] focus:ring-2 focus:ring-[#0A8276]/15" />
      </label>

      <button
        type="submit"
        :disabled="!canSubmit"
        class="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
        :class="canSubmit ? 'bg-[#0A8276] hover:bg-[#086d63]' : 'cursor-not-allowed bg-slate-400'">
        {{ isEditMode ? "Save Changes" : "Create Project" }}
      </button>
    </form>
  </AppDialog>
</template>
