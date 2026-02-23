<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section v-if="workingProject" class="w-full px-4 py-6 md:px-6 lg:px-8">
      <header class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <NuxtLink to="/" class="text-xs uppercase tracking-wide text-[#0A8276] hover:text-[#086d63]">← Back to projects</NuxtLink>
            <h1 class="mt-3 text-3xl font-black text-slate-900 md:text-4xl">{{ workingProject.name }}</h1>
            <p class="mt-2 max-w-4xl text-sm text-slate-600 md:text-base">{{ workingProject.description || "No description" }}</p>
          </div>

          <div class="flex flex-col items-end gap-2">
            <button
              type="button"
              :disabled="!canSave"
              @click="saveProject"
              class="rounded-xl px-4 py-2 text-sm font-semibold transition"
              :class="canSave ? 'bg-[#0A8276] text-white hover:bg-[#086d63]' : 'cursor-not-allowed bg-slate-600 text-slate-300'">
              Save
            </button>
            <p class="text-xs" :class="canSave ? 'text-[#0A8276]' : 'text-rose-700'">
              {{
                canSave ?
                  "Ready to save"
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
              v-for="(sheet, index) in workingProject.sheets"
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
            v-if="activeSheet"
            v-model="activeSheet.requirements"
            v-model:columns="tableColumns"
            v-model:isValid="isTableValid"
          />
        </div>
      </section>
    </section>

    <section v-else class="mx-auto max-w-2xl px-6 py-12 text-center">
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
          <p v-if="!canDeleteCurrentSheet" class="mt-2 text-xs text-rose-700">
            A project must keep at least one requirement set.
          </p>

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
  </main>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from "vue";
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
  const storage = useRequirementsManagerStorage();

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
      validate: (value) => (String(value || "").trim() ? null : "Key is required.")
    },
    {
      rowKey: "name",
      title: "Name",
      type: "text",
      editable: true,
      required: true,
      validate: (value) => (String(value || "").trim() ? null : "Name is required.")
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

  const workingProject = ref<ProjectRecord | null>(null);
  const activeSheetId = ref<string | null>(null);
  const isTableValid = ref(true);
  const saveMessage = ref("Not saved yet");

  const renamingSheetId = ref<string | null>(null);
  const renameBuffer = ref("");
  const renameInputEl = ref<HTMLInputElement | null>(null);
  const sheetDeleteDialog = ref<{ id: string; name: string } | null>(null);
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

  watch(
    currentProject,
    (project) => {
      if (!project) {
        workingProject.value = null;
        activeSheetId.value = null;
        return;
      }

      workingProject.value = JSON.parse(JSON.stringify(project)) as ProjectRecord;
      activeSheetId.value = workingProject.value.sheets[0]?.id ?? null;
      saveMessage.value = `Loaded from local storage at ${new Date().toLocaleTimeString()}`;
    },
    { immediate: true }
  );

  const activeSheet = computed(() => {
    if (!workingProject.value || !activeSheetId.value) return null;
    return workingProject.value.sheets.find((sheet) => sheet.id === activeSheetId.value) ?? null;
  });

  const allRowsAreDomainValid = computed(() => {
    if (!workingProject.value) return false;

    return workingProject.value.sheets.every((sheet) => sheet.requirements.every((row) => validateRequirement(row).length === 0));
  });

  const hasUnsavedChanges = computed(() => {
    if (!workingProject.value || !currentProject.value) return false;
    return !isDeepEqual(workingProject.value, currentProject.value);
  });

  const canSave = computed(() => !!activeSheet.value && hasUnsavedChanges.value && isTableValid.value && allRowsAreDomainValid.value);
  const canDeleteCurrentSheet = computed(() => !!workingProject.value && workingProject.value.sheets.length > 1);
  const draggingSheet = computed(() => {
    if (!workingProject.value || !draggingSheetId.value) return null;
    return workingProject.value.sheets.find((sheet) => sheet.id === draggingSheetId.value) ?? null;
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

  const addSheet = () => {
    if (!workingProject.value) return;

    const nextIndex = workingProject.value.sheets.length + 1;
    const sheet = createDefaultSheet(`Requirement Set ${nextIndex}`);

    workingProject.value.sheets.push(sheet);
    activeSheetId.value = sheet.id;
  };

  const requestDeleteSheet = (sheetId: string) => {
    if (!workingProject.value) return;
    const sheet = workingProject.value.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheetDeleteDialog.value = { id: sheet.id, name: sheet.name };
  };

  const closeDeleteSheetDialog = () => {
    sheetDeleteDialog.value = null;
  };

  const confirmDeleteSheet = () => {
    if (!workingProject.value || !sheetDeleteDialog.value) return;
    if (!canDeleteCurrentSheet.value) {
      closeDeleteSheetDialog();
      return;
    }

    const sheetId = sheetDeleteDialog.value.id;
    workingProject.value.sheets = workingProject.value.sheets.filter((item) => item.id !== sheetId);

    if (activeSheetId.value === sheetId) {
      activeSheetId.value = workingProject.value.sheets[0]?.id ?? null;
    }

    closeDeleteSheetDialog();
  };

  const beginRenameSheet = async (sheetId: string, name: string) => {
    renamingSheetId.value = sheetId;
    renameBuffer.value = name;
    await nextTick();
    renameInputEl.value?.focus();
    renameInputEl.value?.select();
  };

  const commitRenameSheet = (sheetId: string) => {
    if (!workingProject.value) return;

    const sheet = workingProject.value.sheets.find((item) => item.id === sheetId);

    if (!sheet) {
      renamingSheetId.value = null;
      return;
    }

    const nextName = renameBuffer.value.trim();
    sheet.name = nextName || sheet.name;
    renamingSheetId.value = null;
  };

  const cancelRenameSheet = () => {
    renamingSheetId.value = null;
    renameBuffer.value = "";
  };

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
        return {
          id: tab.dataset.sheetId ?? "",
          left: rect.left - stripRect.left,
          width: rect.width
        };
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
      const { left, width } = metrics[index];
      if (relativeX < left + width * insertionThreshold) return index;
    }

    return metrics.length;
  };

  const reorderSheets = (insertionIndex: number | null) => {
    if (!workingProject.value) return;
    if (insertionIndex === null || !draggingSheetId.value) return;

    const currentSheets = [...workingProject.value.sheets];
    const activeId = draggingSheetId.value;
    const activeIndex = currentSheets.findIndex((sheet) => sheet.id === activeId);
    if (activeIndex === -1) return;

    const activeSheet = currentSheets[activeIndex];
    const remainingSheets = currentSheets.filter((sheet) => sheet.id !== activeId);

    const clampedIndex = Math.min(Math.max(0, insertionIndex), remainingSheets.length);
    remainingSheets.splice(clampedIndex, 0, activeSheet);

    workingProject.value.sheets = remainingSheets;
    draggingSheetIndex.value = remainingSheets.findIndex((sheet) => sheet.id === activeId);
  };

  const beginTabDragging = (index: number) => {
    const container = tabsContainerEl.value;
    const originTab = tabPointerOriginEl.value;
    if (!container || !originTab || !workingProject.value) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = originTab.getBoundingClientRect();
    const activeSheet = workingProject.value.sheets[index];
    if (!activeSheet) return;

    isTabDragging.value = true;
    draggingSheetIndex.value = index;
    draggingSheetId.value = activeSheet.id;
    tabDragPreviewDimensions.value = {
      width: tabRect.width,
      height: tabRect.height,
      left: tabRect.left - containerRect.left,
      top: tabRect.top - containerRect.top
    };
    initialSheetOrder.value = [...workingProject.value.sheets];

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
    if (isTabDragging.value && workingProject.value && initialSheetOrder.value.length) {
      workingProject.value.sheets = [...initialSheetOrder.value];
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
    activeSheetId.value = sheetId;
  };

  const onSheetDoubleClick = (sheetId: string, name: string, event: MouseEvent) => {
    if (suppressTabClick.value) {
      event.preventDefault();
      return;
    }
    beginRenameSheet(sheetId, name);
  };

  const saveProject = () => {
    if (!workingProject.value || !currentProject.value) return;
    if (!canSave.value || !activeSheet.value) return;

    const timestamp = new Date().toISOString();

    const updatedProject: ProjectRecord = {
      ...workingProject.value,
      updatedAt: timestamp
    };

    const projectIndex = storage.value.projects.findIndex((project) => project.id === currentProject.value?.id);

    if (projectIndex < 0) return;

    storage.value.projects[projectIndex] = JSON.parse(JSON.stringify(updatedProject)) as ProjectRecord;
    workingProject.value = JSON.parse(JSON.stringify(updatedProject)) as ProjectRecord;

    saveMessage.value = `Saved at ${new Date(timestamp).toLocaleString()}`;
  };

  watch(
    [workingProject, currentProject],
    ([working, current]) => {
      if (!working || !current) return;
      if (isDeepEqual(working, current)) return;

      saveMessage.value = "Unsaved changes";
    },
    { deep: true }
  );

  watch(
    () => workingProject.value?.sheets,
    (sheets) => {
      if (!sheets) return;

      sheets.forEach((sheet) => {
        sheet.requirements.forEach((row) => {
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
      });
    },
    { deep: true }
  );

  if (import.meta.client) {
    useEventListener(window, "pointermove", updateTabDragPosition, { passive: false });
    useEventListener(window, "pointerup", commitTabDrag);
    useEventListener(window, "pointercancel", cancelTabDrag);
  }

  watch(escapeKey, (pressed) => {
    if (!pressed || !isTabDragging.value) return;
    cancelTabDrag();
  });
</script>
