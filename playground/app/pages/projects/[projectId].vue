<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import { useMagicKeys } from "@vueuse/core";
  import {
    createDefaultSheet,
    type ProjectRecord,
    type RequirementSheet,
    useRequirementsManagerStorage,
    validateRequirement
  } from "~/composables/useRequirementsManager";
  import { useRequirementTableColumns } from "~/composables/useRequirementTableColumns";
  import ConfirmDialog from "~/components/ConfirmDialog/ConfirmDialog.vue";
  import RequirementSetTabs from "~/components/RequirementSetTabs/RequirementSetTabs.vue";

  interface RequirementSetTabsExposed {
    cancelTabDrag: () => void;
  }

  const route = useRoute();
  const router = useRouter();
  const storage = useRequirementsManagerStorage();
  const { escape: escapeKey } = useMagicKeys();
  const { columns: tableColumns, isFunctionalRequirement, isPerformanceRequirement } = useRequirementTableColumns();

  const isPageLoading = ref(true);
  const activeSheetId = ref<string | null>(null);
  const activeSheetDraft = ref<RequirementSheet | null>(null);
  const isTableValid = ref(true);
  const saveMessage = ref("Not saved yet");
  const tabsRef = ref<RequirementSetTabsExposed | null>(null);

  const sheetDeleteDialog = ref<{ id: string; name: string } | null>(null);
  const sheetSwitchDialog = ref(false);
  const pendingSheetSwitchId = ref<string | null>(null);

  const currentProject = computed(() => {
    const projectId = String(route.params.projectId || "");
    return storage.value.projects.find((item) => item.id === projectId) ?? null;
  });

  const project = computed(() => currentProject.value);

  const persistedActiveSheet = computed(() => {
    if (!project.value || !activeSheetId.value) return null;
    return project.value.sheets.find((sheet) => sheet.id === activeSheetId.value) ?? null;
  });

  const hasUnsavedChanges = computed(() => {
    if (!activeSheetDraft.value || !persistedActiveSheet.value) return false;
    return JSON.stringify(activeSheetDraft.value.requirements) !== JSON.stringify(persistedActiveSheet.value.requirements);
  });

  const allRowsAreDomainValid = computed(() => {
    if (!activeSheetDraft.value) return false;
    return activeSheetDraft.value.requirements.every((row) => validateRequirement(row).length === 0);
  });

  const canSave = computed(() => !!activeSheetDraft.value && hasUnsavedChanges.value && isTableValid.value && allRowsAreDomainValid.value);

  const canDeleteCurrentSheet = computed(() => !!project.value && project.value.sheets.length > 1);

  const sheetDeleteMessage = computed(() => {
    if (!sheetDeleteDialog.value) return "";
    return `Are you sure you want to delete "${sheetDeleteDialog.value.name}"?`;
  });

  const isSheetDeleteDialogOpen = computed({
    get: () => sheetDeleteDialog.value !== null,
    set: (value: boolean) => {
      if (!value) sheetDeleteDialog.value = null;
    }
  });

  const isSheetSwitchDialogOpen = computed({
    get: () => sheetSwitchDialog.value,
    set: (value: boolean) => {
      sheetSwitchDialog.value = value;
      if (!value) pendingSheetSwitchId.value = null;
    }
  });

  const sheetSwitchConfirmLabel = computed(() => (canSave.value ? "Save & switch" : "Continue editing"));
  const sheetSwitchConfirmTone = computed<"brand" | "neutral">(() => (canSave.value ? "brand" : "neutral"));

  /**
   * Syncs the active requirement-set id into the route query.
   * @param sheetId Requirement-set id to persist in query string.
   * @param replace When true, replace history entry instead of pushing.
   * @returns Promise from router navigation.
   */
  function syncSetQuery(sheetId: string, replace = false) {
    const query = { ...route.query, set: sheetId };
    if (replace) return router.replace({ path: route.path, query });
    return router.push({ path: route.path, query });
  }

  /**
   * Loads the active sheet into a local editable draft.
   * @param sheetId Requirement-set id to load.
   * @returns void
   */
  function loadSheetDraft(sheetId: string) {
    const sheet = project.value?.sheets.find((item) => item.id === sheetId) ?? null;
    activeSheetDraft.value = sheet ? (JSON.parse(JSON.stringify(sheet)) as RequirementSheet) : null;
  }

  /**
   * Resolves the initial active requirement-set id for a project.
   * @param targetProject Project from storage.
   * @returns Matching query set id or the first sheet id.
   */
  function resolveInitialSheetId(targetProject: ProjectRecord) {
    const routeSet = String(route.query.set || "");
    if (targetProject.sheets.some((sheet) => sheet.id === routeSet)) return routeSet;
    return targetProject.sheets[0]?.id ?? null;
  }

  /**
   * Switches active requirement-set and refreshes route query.
   * @param sheetId Requirement-set id to activate.
   * @returns void
   */
  function switchToSheet(sheetId: string) {
    if (!project.value) return;
    if (!project.value.sheets.some((sheet) => sheet.id === sheetId)) return;

    activeSheetId.value = sheetId;
    loadSheetDraft(sheetId);
    syncSetQuery(sheetId);
  }

  /**
   * Requests a set switch and prompts when unsaved changes exist.
   * @param sheetId Requirement-set id to switch to.
   * @returns void
   */
  function requestSheetSwitch(sheetId: string) {
    if (!project.value || !activeSheetId.value || sheetId === activeSheetId.value) return;

    if (hasUnsavedChanges.value) {
      pendingSheetSwitchId.value = sheetId;
      sheetSwitchDialog.value = true;
      return;
    }

    switchToSheet(sheetId);
  }

  /**
   * Closes the unsaved-changes switch dialog.
   * @returns void
   */
  function cancelSwitchDialog() {
    pendingSheetSwitchId.value = null;
    sheetSwitchDialog.value = false;
  }

  /**
   * Discards draft changes and switches to pending requirement-set.
   * @returns void
   */
  function discardAndSwitch() {
    const targetId = pendingSheetSwitchId.value;
    cancelSwitchDialog();
    if (!targetId) return;
    switchToSheet(targetId);
  }

  /**
   * Saves current requirement-set and switches to pending set.
   * @returns void
   */
  function saveAndSwitch() {
    const targetId = pendingSheetSwitchId.value;
    if (!targetId) return;
    const didSave = saveActiveSheet();
    if (!didSave) return;

    cancelSwitchDialog();
    switchToSheet(targetId);
  }

  /**
   * Handles primary action in unsaved-changes dialog.
   * @returns void
   */
  function handleSheetSwitchConfirm() {
    if (canSave.value) {
      saveAndSwitch();
      return;
    }
    cancelSwitchDialog();
  }

  /**
   * Persists active sheet draft when valid and changed.
   * @returns true when save succeeds, otherwise false.
   */
  function saveActiveSheet() {
    if (!project.value || !activeSheetId.value || !activeSheetDraft.value) return false;
    if (!canSave.value) return false;

    const projectIndex = storage.value.projects.findIndex((item) => item.id === project.value?.id);
    if (projectIndex < 0) return false;

    const sheetIndex = storage.value.projects[projectIndex]?.sheets.findIndex((sheet) => sheet.id === activeSheetId.value) ?? -1;
    if (sheetIndex < 0) return false;
    if (!storage.value.projects[projectIndex]?.sheets[sheetIndex]) return false;

    const timestamp = new Date().toISOString();
    storage.value.projects[projectIndex].sheets[sheetIndex].requirements = JSON.parse(JSON.stringify(activeSheetDraft.value.requirements));
    storage.value.projects[projectIndex].updatedAt = timestamp;

    loadSheetDraft(activeSheetId.value);
    saveMessage.value = `Saved at ${new Date(timestamp).toLocaleString()}`;
    return true;
  }

  /**
   * Creates and activates a new requirement-set.
   * @returns void
   */
  function addSheet() {
    if (!project.value) return;

    const nextIndex = project.value.sheets.length + 1;
    const sheet = createDefaultSheet(`Requirement Set ${nextIndex}`);
    project.value.sheets.push(sheet);
    project.value.updatedAt = new Date().toISOString();
    switchToSheet(sheet.id);
  }

  /**
   * Opens delete confirmation for a requirement-set.
   * @param sheetId Requirement-set id to delete.
   * @returns void
   */
  function requestDeleteSheet(sheetId: string) {
    if (!project.value) return;
    const sheet = project.value.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheetDeleteDialog.value = { id: sheet.id, name: sheet.name };
  }

  /**
   * Deletes the selected requirement-set after confirmation.
   * @returns void
   */
  function confirmDeleteSheet() {
    if (!project.value || !sheetDeleteDialog.value || !canDeleteCurrentSheet.value) {
      sheetDeleteDialog.value = null;
      return;
    }

    const deletingId = sheetDeleteDialog.value.id;
    project.value.sheets = project.value.sheets.filter((item) => item.id !== deletingId);
    project.value.updatedAt = new Date().toISOString();

    if (activeSheetId.value === deletingId) {
      const fallbackId = project.value.sheets[0]?.id ?? null;
      if (fallbackId) switchToSheet(fallbackId);
    }

    sheetDeleteDialog.value = null;
  }

  /**
   * Renames a requirement-set.
   * @param payload Sheet id and next name.
   * @returns void
   */
  function renameSheet(payload: { id: string; name: string }) {
    if (!project.value) return;
    const sheet = project.value.sheets.find((item) => item.id === payload.id);
    if (!sheet) return;

    sheet.name = payload.name;
    project.value.updatedAt = new Date().toISOString();
  }

  /**
   * Reorders requirement-sets by emitted id order.
   * @param orderedIds New sheet id order from tabs component.
   * @returns void
   */
  function reorderSheetsByIds(orderedIds: string[]) {
    if (!project.value) return;

    const currentMap = new Map(project.value.sheets.map((sheet) => [sheet.id, sheet] as const));
    const reordered = orderedIds.map((id) => currentMap.get(id)).filter((sheet): sheet is RequirementSheet => Boolean(sheet));

    if (reordered.length !== project.value.sheets.length) return;

    project.value.sheets = reordered;
    project.value.updatedAt = new Date().toISOString();
  }

  watch(
    project,
    (nextProject) => {
      if (!nextProject) {
        activeSheetId.value = null;
        activeSheetDraft.value = null;
        return;
      }

      const nextSheetId = resolveInitialSheetId(nextProject);
      if (!nextSheetId) {
        activeSheetId.value = null;
        activeSheetDraft.value = null;
        return;
      }

      if (!activeSheetId.value || !nextProject.sheets.some((sheet) => sheet.id === activeSheetId.value)) {
        activeSheetId.value = nextSheetId;
        loadSheetDraft(nextSheetId);
      } else if (!hasUnsavedChanges.value && persistedActiveSheet.value) {
        loadSheetDraft(activeSheetId.value);
      }

      if (String(route.query.set || "") !== activeSheetId.value) {
        syncSetQuery(activeSheetId.value, true);
      }

      saveMessage.value = `Loaded at ${new Date().toLocaleTimeString()}`;
    },
    { immediate: true, deep: true }
  );

  watch(
    () => String(route.query.set || ""),
    (nextSetId) => {
      if (!project.value || !nextSetId) return;
      if (!project.value.sheets.some((sheet) => sheet.id === nextSetId)) return;
      if (activeSheetId.value === nextSetId) return;
      requestSheetSwitch(nextSetId);
    }
  );

  watch(
    () => activeSheetDraft.value?.requirements,
    (requirements) => {
      if (!requirements) return;

      requirements.forEach((row) => {
        if (isPerformanceRequirement(row) && row.description) {
          row.description = "";
        }

        if (isFunctionalRequirement(row)) {
          if (row.unit) row.unit = "";
          if (row.minimum) row.minimum = "";
          if (row.typical) row.typical = "";
          if (row.maximum) row.maximum = "";
        }
      });
    },
    { deep: true }
  );

  watch(
    () => escapeKey?.value,
    (pressed) => {
      if (!pressed) return;
      tabsRef.value?.cancelTabDrag?.();
      if (sheetSwitchDialog.value) cancelSwitchDialog();
    }
  );

  onMounted(() => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        isPageLoading.value = false;
      });
      return;
    }
    isPageLoading.value = false;
  });
</script>

<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section v-if="isPageLoading" class="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
      <div class="animate-pulse space-y-5">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div class="h-3 w-36 rounded bg-slate-200" />
          <div class="mt-4 h-8 w-80 max-w-full rounded bg-slate-200" />
          <div class="mt-3 h-4 w-full max-w-4xl rounded bg-slate-200" />
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div class="mb-4 flex gap-2">
            <div class="h-10 w-28 rounded-xl bg-slate-200" />
            <div class="h-10 w-28 rounded-xl bg-slate-200" />
            <div class="h-10 w-24 rounded-xl bg-slate-200" />
          </div>
          <div class="h-[320px] rounded-xl bg-slate-200" />
        </div>
      </div>
    </section>

    <section v-else-if="project" class="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
      <header class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <NuxtLink to="/" class="text-xs uppercase tracking-wide text-[#0A8276] hover:text-[#086d63]">← Back to projects</NuxtLink>
            <h1 class="mt-3 text-3xl font-black text-slate-900 md:text-4xl">{{ project.name }}</h1>
            <p class="mt-2 max-w-4xl text-sm text-slate-600 md:text-base">{{ project.description || "No description" }}</p>
          </div>

          <div class="flex flex-col items-end gap-2">
            <button
              type="button"
              :disabled="!canSave"
              @click="saveActiveSheet"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="canSave ? 'bg-[#0A8276] text-white hover:bg-[#086d63]' : 'cursor-not-allowed bg-slate-600 text-slate-300'">
              Save
            </button>
            <p class="text-xs" :class="canSave ? 'text-[#0A8276]' : 'text-rose-700'">
              {{
                canSave ? "Ready to save"
                : !hasUnsavedChanges ? "No changes to save"
                : "Fix validation errors before saving"
              }}
            </p>
            <p class="text-xs text-slate-500">{{ saveMessage }}</p>
          </div>
        </div>
      </header>

      <section class="mt-5 w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <RequirementSetTabs
          ref="tabsRef"
          :sheets="project.sheets"
          :active-sheet-id="activeSheetId"
          @select="requestSheetSwitch"
          @add="addSheet"
          @delete="requestDeleteSheet"
          @rename="renameSheet"
          @reorder="reorderSheetsByIds" />

        <div class="w-full p-4 md:p-6">
          <EditableTable
            v-if="activeSheetDraft"
            v-model="activeSheetDraft.requirements"
            v-model:columns="tableColumns"
            v-model:isValid="isTableValid" />
        </div>
      </section>
    </section>

    <section v-else class="mx-auto max-w-[1600px] px-6 py-12 text-center md:px-10">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Project not found</h1>
        <p class="mt-2 text-sm text-slate-600">The selected project does not exist in local storage.</p>
        <NuxtLink to="/" class="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Back to projects
        </NuxtLink>
      </div>
    </section>

    <ConfirmDialog
      v-model="isSheetDeleteDialogOpen"
      title="Delete Requirement Set"
      :message="sheetDeleteMessage"
      :hint="canDeleteCurrentSheet ? '' : 'A project must keep at least one requirement set.'"
      :confirm-disabled="!canDeleteCurrentSheet"
      confirm-label="Yes, delete"
      cancel-label="No"
      confirm-tone="danger"
      @confirm="confirmDeleteSheet" />

    <ConfirmDialog
      v-model="isSheetSwitchDialogOpen"
      title="Unsaved Changes"
      message="You have unsaved changes in this requirement set."
      :confirm-label="sheetSwitchConfirmLabel"
      cancel-label="Discard"
      :confirm-tone="sheetSwitchConfirmTone"
      @confirm="handleSheetSwitchConfirm"
      @cancel="discardAndSwitch" />
  </main>
</template>
