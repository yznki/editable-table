<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section v-if="isPageLoading" class="w-full px-4 py-6 md:px-6 lg:px-8">
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

    <section v-else-if="project" class="w-full px-4 py-6 md:px-6 lg:px-8">
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
        <div ref="tabsContainerEl" class="relative border-b border-slate-200 bg-slate-100 px-4 pt-3">
          <div ref="tabsStripEl" class="flex items-end gap-1 overflow-x-auto">
            <div
              v-for="(sheet, index) in project.sheets"
              :key="sheet.id"
              :data-sheet-id="sheet.id"
              :class="[
                'group relative -mb-px flex h-11 cursor-grab select-none items-center gap-2 rounded-t-xl border px-3 text-sm transition active:cursor-grabbing',
                activeSheetId === sheet.id ?
                  'z-10 border-slate-300 border-b-white bg-white text-slate-900 shadow-[0_-1px_0_rgba(255,255,255,0.7)] ring-1 ring-[#0A8276]/15'
                : 'border-slate-300/90 border-b-slate-300 bg-slate-200/80 text-slate-600 hover:bg-slate-200',
                draggingSheetId === sheet.id && isTabDragging ? 'opacity-30' : ''
              ]"
              @pointerdown="onSheetPointerDown(index, $event)">
              <button
                v-if="renamingSheetId !== sheet.id"
                type="button"
                @click="onSelectSheet(sheet.id, $event)"
                @dblclick="onSheetDoubleClick(sheet.id, sheet.name, $event)"
                class="max-w-[220px] truncate text-left">
                {{ sheet.name }}
              </button>

              <input
                v-else
                ref="renameInputEl"
                v-model="renameBuffer"
                data-tab-action="true"
                @keydown.enter.prevent="commitRenameSheet(sheet.id)"
                @keydown.esc.prevent="cancelRenameSheet"
                @blur="commitRenameSheet(sheet.id)"
                class="w-44 rounded border border-[#0A8276]/60 bg-white px-2 py-1 text-xs outline-none" />

              <button
                type="button"
                title="Delete sheet"
                data-tab-action="true"
                @click.stop="requestDeleteSheet(sheet.id)"
                class="rounded px-1 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600">
                ×
              </button>
            </div>

            <button
              type="button"
              data-tab-action="true"
              @click="addSheet"
              class="mb-1 ml-1 flex h-9 items-center rounded-lg border border-dashed border-slate-400 px-3 text-sm font-semibold text-slate-600 transition hover:border-[#0A8276] hover:text-[#0A8276]">
              + Set
            </button>
          </div>

          <div v-if="isTabDragging && tabDragPreviewStyle && draggingSheet" class="pointer-events-none absolute inset-0 z-20">
            <div
              class="absolute flex h-11 items-center rounded-t-xl border border-[#0A8276]/35 border-b-white bg-white px-3 text-sm font-medium text-slate-900 shadow-lg ring-2 ring-[#0A8276]/15"
              :style="tabDragPreviewStyle">
              {{ draggingSheet.name }}
            </div>
          </div>
        </div>

        <div class="w-full p-4 md:p-6">
          <EditableTable
            v-if="activeSheetDraft"
            v-model="activeSheetDraft.requirements"
            v-model:columns="tableColumns"
            v-model:isValid="isTableValid" />
        </div>
      </section>
    </section>

    <section v-else class="mx-auto px-6 py-12 text-center">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Project not found</h1>
        <p class="mt-2 text-sm text-slate-600">The selected project does not exist in local storage.</p>
        <NuxtLink to="/" class="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Back to projects
        </NuxtLink>
      </div>
    </section>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="sheetDeleteDialog" class="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm" @click="closeDeleteSheetDialog" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]">
      <div v-if="sheetDeleteDialog" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-slate-900">Delete Requirement Set</h3>
          <p class="mt-2 text-sm text-slate-600">
            Are you sure you want to delete
            <span class="font-semibold text-slate-800">"{{ sheetDeleteDialog.name }}"</span>?
          </p>
          <p v-if="!canDeleteCurrentSheet" class="mt-2 text-xs text-rose-700">A project must keep at least one requirement set.</p>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="closeDeleteSheetDialog"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              No
            </button>
            <button
              type="button"
              :disabled="!canDeleteCurrentSheet"
              @click="confirmDeleteSheet"
              class="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition"
              :class="canDeleteCurrentSheet ? 'bg-rose-600 hover:bg-rose-500' : 'cursor-not-allowed bg-slate-400'">
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="sheetSwitchDialog" class="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]">
      <div v-if="sheetSwitchDialog" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-slate-900">Unsaved Changes</h3>
          <p class="mt-2 text-sm text-slate-600">You have unsaved changes in this requirement set.</p>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="discardAndSwitch"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Discard
            </button>
            <button
              v-if="canSave"
              type="button"
              @click="saveAndSwitch"
              class="rounded-lg bg-[#0A8276] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#086d63]">
              Save & switch
            </button>
            <button
              v-else
              type="button"
              @click="cancelSwitchDialog"
              class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700">
              Continue editing
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from "vue";
  import { useEventListener, useMagicKeys } from "@vueuse/core";
  import type { EditableTableColumn } from "#editable-table/types/column";
  import {
    ASIL_VALUES,
    REQUIREMENT_TYPES,
    createDefaultSheet,
    type ProjectRecord,
    type RequirementRow,
    type RequirementSheet,
    useRequirementsManagerStorage,
    validateRequirement
  } from "~/composables/useRequirementsManager";

  const route = useRoute();
  const router = useRouter();
  const storage = useRequirementsManagerStorage();
  const isPageLoading = ref(true);

  const isPerformanceRequirement = (row: RequirementRow) => row.type === "Performance";
  const isFunctionalRequirement = (row: RequirementRow) => row.type === "Functional";
  const isDescriptionEditable = (row: RequirementRow) => !isPerformanceRequirement(row);
  const isUnitEditable = (row: RequirementRow) => !isFunctionalRequirement(row);
  const isLimitEditable = (row: RequirementRow) => !isFunctionalRequirement(row);
  const isSymbolEditable = (row: RequirementRow) => !isFunctionalRequirement(row);

  const tableColumns = ref<EditableTableColumn<RequirementRow>[]>([
    {
      rowKey: "key",
      title: "Key",
      type: "text",
      editable: true,
      required: true,
      validate: (v) => (String(v || "").trim() ? null : "Key is required.")
    },
    {
      rowKey: "name",
      title: "Name",
      type: "text",
      editable: true,
      required: true,
      validate: (v) => (String(v || "").trim() ? null : "Name is required.")
    },
    {
      rowKey: "type",
      title: "Type",
      type: "select",
      editable: true,
      required: true,
      options: REQUIREMENT_TYPES,
      allowCustomOptions: false,
      validate: (value) => (REQUIREMENT_TYPES.includes(String(value) as RequirementRow["type"]) ? null : "Type is invalid.")
    },
    {
      rowKey: "asil",
      title: "Asil",
      type: "select",
      editable: true,
      required: true,
      options: ASIL_VALUES,
      allowCustomOptions: false,
      validate: (value) => (ASIL_VALUES.includes(String(value) as RequirementRow["asil"]) ? null : "Asil is invalid.")
    },
    {
      rowKey: "description",
      title: "Description",
      type: "text",
      editable: isDescriptionEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "description")?.message ?? null
    },
    {
      rowKey: "symbol",
      title: "Symbol",
      type: "text",
      editable: isSymbolEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "symbol")?.message ?? null
    },
    {
      rowKey: "unit",
      title: "Unit",
      type: "text",
      editable: isUnitEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "unit")?.message ?? null
    },
    {
      rowKey: "minimum",
      title: "Minimum",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "minimumTypicalMaximum")?.message ?? null
    },
    {
      rowKey: "typical",
      title: "Typical",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "minimumTypicalMaximum")?.message ?? null
    },
    {
      rowKey: "maximum",
      title: "Maximum",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((err) => err.field === "minimumTypicalMaximum")?.message ?? null
    }
  ]);

  const currentProject = computed(() => {
    const projectId = String(route.params.projectId || "");
    return storage.value.projects.find((project) => project.id === projectId) ?? null;
  });

  const project = computed(() => currentProject.value);
  const activeSheetId = ref<string | null>(null);
  const activeSheetDraft = ref<RequirementSheet | null>(null);
  const isTableValid = ref(true);
  const saveMessage = ref("Not saved yet");

  const renamingSheetId = ref<string | null>(null);
  const renameBuffer = ref("");
  const renameInputEl = ref<HTMLInputElement | null>(null);

  const sheetDeleteDialog = ref<{ id: string; name: string } | null>(null);
  const canDeleteCurrentSheet = computed(() => !!project.value && project.value.sheets.length > 1);

  const sheetSwitchDialog = ref(false);
  const pendingSheetSwitchId = ref<string | null>(null);

  const tabsContainerEl = ref<HTMLElement | null>(null);
  const tabsStripEl = ref<HTMLElement | null>(null);
  const isTabPointerDown = ref(false);
  const isTabDragging = ref(false);
  const tabDragStartX = ref(0);
  const tabCurrentX = ref(0);
  const draggingSheetId = ref<string | null>(null);
  const draggingSheetIndex = ref<number | null>(null);
  const tabPointerOriginEl = ref<HTMLElement | null>(null);
  const initialSheetOrder = ref<RequirementSheet[]>([]);
  const previousBodyUserSelect = ref<string | null>(null);
  const suppressTabClick = ref(false);
  const tabDragPreviewDimensions = ref<{ width: number; height: number; left: number; top: number } | null>(null);
  const { escape: escapeKey } = useMagicKeys();

  const isDeepEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

  const persistedActiveSheet = computed(() => {
    if (!project.value || !activeSheetId.value) return null;
    return project.value.sheets.find((sheet) => sheet.id === activeSheetId.value) ?? null;
  });

  const hasUnsavedChanges = computed(() => {
    if (!activeSheetDraft.value || !persistedActiveSheet.value) return false;
    return !isDeepEqual(activeSheetDraft.value.requirements, persistedActiveSheet.value.requirements);
  });

  const allRowsAreDomainValid = computed(() => {
    if (!activeSheetDraft.value) return false;
    return activeSheetDraft.value.requirements.every((row) => validateRequirement(row).length === 0);
  });

  const canSave = computed(() => !!activeSheetDraft.value && hasUnsavedChanges.value && isTableValid.value && allRowsAreDomainValid.value);

  const draggingSheet = computed(() => {
    if (!project.value || !draggingSheetId.value) return null;
    return project.value.sheets.find((sheet) => sheet.id === draggingSheetId.value) ?? null;
  });

  const tabDragPreviewStyle = computed(() => {
    if (!isTabDragging.value || !tabDragPreviewDimensions.value) return null;
    const deltaX = tabCurrentX.value - tabDragStartX.value;
    const { width, height, left, top } = tabDragPreviewDimensions.value;

    return {
      width: `${width}px`,
      height: `${height}px`,
      left: `${left}px`,
      top: `${top}px`,
      transform: `translateX(${deltaX}px)`
    };
  });

  function syncSetQuery(sheetId: string, replace = false) {
    const query = { ...route.query, set: sheetId };
    if (replace) return router.replace({ path: route.path, query });
    return router.push({ path: route.path, query });
  }

  function loadSheetDraft(sheetId: string) {
    const sheet = project.value?.sheets.find((item) => item.id === sheetId) ?? null;
    activeSheetDraft.value = sheet ? (JSON.parse(JSON.stringify(sheet)) as RequirementSheet) : null;
  }

  function resolveInitialSheetId(targetProject: ProjectRecord) {
    const routeSet = String(route.query.set || "");
    if (targetProject.sheets.some((sheet) => sheet.id === routeSet)) return routeSet;
    return targetProject.sheets[0]?.id ?? null;
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

  function switchToSheet(sheetId: string) {
    if (!project.value) return;
    const exists = project.value.sheets.some((sheet) => sheet.id === sheetId);
    if (!exists) return;
    activeSheetId.value = sheetId;
    loadSheetDraft(sheetId);
    syncSetQuery(sheetId);
  }

  function requestSheetSwitch(sheetId: string) {
    if (!project.value || !activeSheetId.value || sheetId === activeSheetId.value) return;

    if (hasUnsavedChanges.value) {
      pendingSheetSwitchId.value = sheetId;
      sheetSwitchDialog.value = true;
      return;
    }

    switchToSheet(sheetId);
  }

  function cancelSwitchDialog() {
    pendingSheetSwitchId.value = null;
    sheetSwitchDialog.value = false;
  }

  function discardAndSwitch() {
    const targetId = pendingSheetSwitchId.value;
    cancelSwitchDialog();
    if (!targetId) return;
    switchToSheet(targetId);
  }

  function saveAndSwitch() {
    const targetId = pendingSheetSwitchId.value;
    if (!targetId) return;
    const didSave = saveActiveSheet();
    if (!didSave) return;
    cancelSwitchDialog();
    switchToSheet(targetId);
  }

  function saveActiveSheet() {
    if (!project.value || !activeSheetId.value || !activeSheetDraft.value) return false;
    if (!canSave.value) return false;

    const projectIndex = storage.value.projects.findIndex((p) => p.id === project.value?.id);
    if (projectIndex < 0) return false;

    const sheetIndex = storage.value.projects[projectIndex]?.sheets.findIndex((sheet) => sheet.id === activeSheetId.value) ?? -1;
    if (sheetIndex < 0) return false;

    const timestamp = new Date().toISOString();

    if (!storage.value.projects[projectIndex]?.sheets[sheetIndex]) return false;

    storage.value.projects[projectIndex].sheets[sheetIndex].requirements = JSON.parse(JSON.stringify(activeSheetDraft.value.requirements));
    storage.value.projects[projectIndex].updatedAt = timestamp;

    loadSheetDraft(activeSheetId.value);
    saveMessage.value = `Saved at ${new Date(timestamp).toLocaleString()}`;
    return true;
  }

  function addSheet() {
    if (!project.value) return;
    const nextIndex = project.value.sheets.length + 1;
    const sheet = createDefaultSheet(`Requirement Set ${nextIndex}`);
    project.value.sheets.push(sheet);
    project.value.updatedAt = new Date().toISOString();
    switchToSheet(sheet.id);
  }

  function requestDeleteSheet(sheetId: string) {
    if (!project.value) return;
    const sheet = project.value.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheetDeleteDialog.value = { id: sheet.id, name: sheet.name };
  }

  function closeDeleteSheetDialog() {
    sheetDeleteDialog.value = null;
  }

  function confirmDeleteSheet() {
    if (!project.value || !sheetDeleteDialog.value || !canDeleteCurrentSheet.value) {
      closeDeleteSheetDialog();
      return;
    }

    const deletingId = sheetDeleteDialog.value.id;
    project.value.sheets = project.value.sheets.filter((item) => item.id !== deletingId);
    project.value.updatedAt = new Date().toISOString();

    if (activeSheetId.value === deletingId) {
      const fallback = project.value.sheets[0]?.id ?? null;
      if (fallback) switchToSheet(fallback);
    }

    closeDeleteSheetDialog();
  }

  async function beginRenameSheet(sheetId: string, name: string) {
    renamingSheetId.value = sheetId;
    renameBuffer.value = name;
    await nextTick();
    renameInputEl.value?.focus();
    renameInputEl.value?.select();
  }

  function commitRenameSheet(sheetId: string) {
    if (!project.value) return;
    const sheet = project.value.sheets.find((item) => item.id === sheetId);
    if (!sheet) {
      renamingSheetId.value = null;
      return;
    }
    const nextName = renameBuffer.value.trim();
    sheet.name = nextName || sheet.name;
    project.value.updatedAt = new Date().toISOString();
    renamingSheetId.value = null;
  }

  function cancelRenameSheet() {
    renamingSheetId.value = null;
    renameBuffer.value = "";
  }

  const resetBodyUserSelect = () => {
    if (previousBodyUserSelect.value === null) return;
    document.body.style.userSelect = previousBodyUserSelect.value;
    previousBodyUserSelect.value = null;
  };

  const resetTabDragState = () => {
    isTabPointerDown.value = false;
    isTabDragging.value = false;
    draggingSheetIndex.value = null;
    draggingSheetId.value = null;
    tabPointerOriginEl.value = null;
    tabDragPreviewDimensions.value = null;
    initialSheetOrder.value = [];
    resetBodyUserSelect();
  };

  const collectTabMetrics = (activeId: string | null) => {
    const strip = tabsStripEl.value;
    if (!strip) return [];
    const stripRect = strip.getBoundingClientRect();

    return Array.from(strip.querySelectorAll<HTMLElement>("[data-sheet-id]"))
      .map((tab) => {
        const rect = tab.getBoundingClientRect();
        return { id: tab.dataset.sheetId ?? "", left: rect.left - stripRect.left, width: rect.width };
      })
      .filter((metric) => metric.id && metric.id !== activeId)
      .sort((a, b) => a.left - b.left);
  };

  const findTabInsertionIndex = (relativeX: number, activeId: string | null, isDraggingRight: boolean) => {
    if (!activeId) return null;
    const metrics = collectTabMetrics(activeId);
    if (!metrics.length) return 0;

    const insertionThreshold = isDraggingRight ? 0.1 : 0.9;
    for (let index = 0; index < metrics.length; index++) {
      const metric = metrics[index];

      if (!metric) continue;

      const { left, width } = metric;
      if (relativeX < left + width * insertionThreshold) return index;
    }

    return metrics.length;
  };

  const reorderSheets = (insertionIndex: number | null) => {
    if (!project.value || insertionIndex === null || !draggingSheetId.value) return;

    const currentSheets = [...project.value.sheets];
    const activeId = draggingSheetId.value;
    const activeIndex = currentSheets.findIndex((sheet) => sheet.id === activeId);
    if (activeIndex === -1) return;

    const active = currentSheets[activeIndex];
    const remaining = currentSheets.filter((sheet) => sheet.id !== activeId);
    const clampedIndex = Math.min(Math.max(0, insertionIndex), remaining.length);

    if (!active) return;

    remaining.splice(clampedIndex, 0, active);

    project.value.sheets = remaining;
    project.value.updatedAt = new Date().toISOString();
    draggingSheetIndex.value = remaining.findIndex((sheet) => sheet.id === activeId);
  };

  const beginTabDragging = (index: number) => {
    const container = tabsContainerEl.value;
    const originTab = tabPointerOriginEl.value;
    if (!container || !originTab || !project.value) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = originTab.getBoundingClientRect();
    const active = project.value.sheets[index];
    if (!active) return;

    isTabDragging.value = true;
    draggingSheetIndex.value = index;
    draggingSheetId.value = active.id;
    tabDragPreviewDimensions.value = {
      width: tabRect.width,
      height: tabRect.height,
      left: tabRect.left - containerRect.left,
      top: tabRect.top - containerRect.top
    };
    initialSheetOrder.value = [...project.value.sheets];

    previousBodyUserSelect.value = document.body.style.userSelect;
    document.body.style.userSelect = "none";
  };

  const updateTabDragPosition = (event: PointerEvent) => {
    if (!isTabPointerDown.value) return;

    const previousX = tabCurrentX.value;
    tabCurrentX.value = event.clientX;
    const isDraggingRight = tabCurrentX.value >= previousX;
    const hasMovedEnough = Math.abs(tabCurrentX.value - tabDragStartX.value) > 4;

    if (!isTabDragging.value && hasMovedEnough) {
      beginTabDragging(draggingSheetIndex.value ?? 0);
    }

    if (!isTabDragging.value || !tabsStripEl.value) return;
    event.preventDefault();

    const stripRect = tabsStripEl.value.getBoundingClientRect();
    const relativeX = tabCurrentX.value - stripRect.left;
    const insertionIndex = findTabInsertionIndex(relativeX, draggingSheetId.value, isDraggingRight);
    reorderSheets(insertionIndex);
  };

  const commitTabDrag = () => {
    if (isTabDragging.value) {
      suppressTabClick.value = true;
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          suppressTabClick.value = false;
        });
      } else {
        suppressTabClick.value = false;
      }
    }
    resetTabDragState();
  };

  const cancelTabDrag = () => {
    if (isTabDragging.value && project.value && initialSheetOrder.value.length) {
      project.value.sheets = [...initialSheetOrder.value];
    }
    resetTabDragState();
  };

  const onSheetPointerDown = (index: number, event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-tab-action='true']")) return;

    isTabPointerDown.value = true;
    tabDragStartX.value = event.clientX;
    tabCurrentX.value = event.clientX;
    draggingSheetIndex.value = index;
    tabPointerOriginEl.value = event.currentTarget as HTMLElement | null;
  };

  const onSelectSheet = (sheetId: string, event: MouseEvent) => {
    if (suppressTabClick.value) {
      event.preventDefault();
      return;
    }
    requestSheetSwitch(sheetId);
  };

  const onSheetDoubleClick = (sheetId: string, name: string, event: MouseEvent) => {
    if (suppressTabClick.value) {
      event.preventDefault();
      return;
    }
    beginRenameSheet(sheetId, name);
  };

  if (import.meta.client) {
    useEventListener(window, "pointermove", updateTabDragPosition, { passive: false });
    useEventListener(window, "pointerup", commitTabDrag);
    useEventListener(window, "pointercancel", cancelTabDrag);
  }

  watch(
    () => escapeKey?.value,
    (pressed) => {
      if (!pressed) return;
      if (isTabDragging.value) cancelTabDrag();
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
