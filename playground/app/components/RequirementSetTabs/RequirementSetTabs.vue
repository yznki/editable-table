<script setup lang="ts">
  import { nextTick, ref, watch } from "vue";
  import type { RequirementSheet } from "~/composables/useRequirementsManager";
  import { useRequirementSetTabDrag } from "~/composables/useRequirementSetTabDrag";

  /**
   * Configuration properties for requirement-set tabs.
   */
  interface Properties {
    /**
     * Requirement sets available for the current project.
     */
    sheets: RequirementSheet[];

    /**
     * Currently selected requirement-set identifier.
     */
    activeSheetId: string | null;
  }

  const properties = defineProps<Properties>();

  /**
   * Emitted actions for requirement-set tab interactions.
   */
  const emitEvent = defineEmits<{
    /**
     * Fired when a tab is selected.
     */
    (event: "select", sheetId: string): void;

    /**
     * Fired when the add-set action is requested.
     */
    (event: "add"): void;

    /**
     * Fired when delete is requested for a set.
     */
    (event: "delete", sheetId: string): void;

    /**
     * Fired when a set rename is committed.
     */
    (event: "rename", payload: { id: string; name: string }): void;

    /**
     * Fired when drag-and-drop emits a new order.
     */
    (event: "reorder", orderedIds: string[]): void;
  }>();

  const tabsContainerElement = ref<HTMLElement | null>(null);
  const tabsStripElement = ref<HTMLElement | null>(null);
  const renamingSheetId = ref<string | null>(null);
  const renameBuffer = ref("");
  const renameInputElement = ref<HTMLInputElement | null>(null);

  const {
    isTabDragging,
    draggingSheetId,
    draggingSheet,
    tabDragPreviewStyle,
    onSheetPointerDown,
    shouldSuppressClick,
    cancelTabDrag
  } = useRequirementSetTabDrag({
    containerEl: tabsContainerElement,
    stripEl: tabsStripElement,
    getItems: () => properties.sheets,
    onReorder: (orderedIds) => emitEvent("reorder", orderedIds)
  });

  /**
   * Selects a requirement set from the tabs UI.
   * @param sheetId Target requirement-set identifier.
   * @param event Mouse click event.
   * @returns void
   */
  function onSelectSheet(sheetId: string, event: MouseEvent) {
    if (shouldSuppressClick(event)) return;
    emitEvent("select", sheetId);
  }

  /**
   * Enables inline rename mode for a requirement-set tab.
   * @param sheetId Requirement-set identifier.
   * @param name Current requirement-set name.
   * @param event Mouse double-click event.
   * @returns Promise resolved after input focus is applied.
   */
  async function beginRenameSheet(sheetId: string, name: string, event: MouseEvent) {
    if (shouldSuppressClick(event)) return;
    renamingSheetId.value = sheetId;
    renameBuffer.value = name;
    await nextTick();
    renameInputElement.value?.focus();
    renameInputElement.value?.select();
  }

  /**
   * Commits rename for a requirement-set tab.
   * @param sheetId Requirement-set identifier.
   * @returns void
   */
  function commitRenameSheet(sheetId: string) {
    const nextName = renameBuffer.value.trim();
    if (nextName) {
      emitEvent("rename", { id: sheetId, name: nextName });
    }
    renamingSheetId.value = null;
    renameBuffer.value = "";
  }

  /**
   * Cancels rename mode for a requirement-set tab.
   * @returns void
   */
  function cancelRenameSheet() {
    renamingSheetId.value = null;
    renameBuffer.value = "";
  }

  watch(
    () => properties.sheets.map((sheet) => sheet.id).join("|"),
    () => {
      if (renamingSheetId.value && !properties.sheets.some((sheet) => sheet.id === renamingSheetId.value)) {
        cancelRenameSheet();
      }
    }
  );

  defineExpose({
    cancelTabDrag
  });
</script>

<template>
  <div ref="tabsContainerElement" class="relative border-b border-slate-200 bg-slate-100 px-4 pt-3">
    <div ref="tabsStripElement" class="flex items-end gap-1 overflow-x-auto">
      <div
        v-for="(sheet, index) in sheets"
        :key="sheet.id"
        :data-sheet-id="sheet.id"
        :class="[
          'group relative -mb-px flex h-11 cursor-grab select-none items-center gap-2 rounded-t-xl border px-3 text-sm transition active:cursor-grabbing',
          activeSheetId === sheet.id
            ? 'z-10 border-slate-300 border-b-white bg-white text-slate-900 shadow-[0_-1px_0_rgba(255,255,255,0.7)] ring-1 ring-[#0A8276]/15'
            : 'border-slate-300/90 border-b-slate-300 bg-slate-200/80 text-slate-600 hover:bg-slate-200',
          draggingSheetId === sheet.id && isTabDragging ? 'opacity-30' : ''
        ]"
        @pointerdown="onSheetPointerDown(index, $event)">
        <button
          v-if="renamingSheetId !== sheet.id"
          type="button"
          @click="onSelectSheet(sheet.id, $event)"
          @dblclick="beginRenameSheet(sheet.id, sheet.name, $event)"
          class="max-w-[220px] truncate text-left">
          {{ sheet.name }}
        </button>

        <input
          v-else
          ref="renameInputElement"
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
          @click.stop="emitEvent('delete', sheet.id)"
          class="rounded px-1 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600">
          ×
        </button>
      </div>

      <button
        type="button"
        data-tab-action="true"
        @click="emitEvent('add')"
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
</template>
