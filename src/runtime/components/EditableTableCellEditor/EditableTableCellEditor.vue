<script setup lang="ts" generic="TValue extends string | number | boolean">
  import { nextTick, onMounted, ref, watch } from "vue";
  import { ColumnType } from "@models/column";
  import { cva } from "class-variance-authority";

  export interface EditableTableCellEditorProps {
    type?: ColumnType;
    isEditable?: boolean;
  }

  const props = withDefaults(defineProps<EditableTableCellEditorProps>(), { type: "text", isEditable: false });

  const emit = defineEmits<{
    (event: "blur", e: FocusEvent): void;
  }>();

  const value = defineModel<TValue>();

  const editorRoot = ref<HTMLElement | null>(null);

  const contentClass = cva("block w-full h-full bg-transparent text-sm leading-6 outline-none border-none p-0", {
    variants: {
      editable: {
        true: "select-text",
        false: "select-none text-gray-800"
      }
    },
    defaultVariants: {
      editable: false
    }
  });

  async function focusInput() {
    if (!props.isEditable) return;

    await nextTick();

    const target =
      editorRoot.value?.querySelector<HTMLElement>("input, textarea, select, button, [contenteditable='true']") ?? editorRoot.value ?? null;

    if (!target || typeof target.focus !== "function") return;

    if (target === editorRoot.value && target instanceof HTMLElement) {
      target.tabIndex = -1;
    }

    target.focus({ preventScroll: true });

    if (target instanceof HTMLInputElement && target.type !== "checkbox" && target.type !== "radio") {
      target.select?.();
    }
  }

  watch(
    () => props.isEditable,
    (editable) => {
      if (editable) focusInput();
    }
  );

  onMounted(() => {
    focusInput();
  });
</script>

<template>
  <div ref="editorRoot" class="w-full h-full" @focusout="emit('blur', $event)">
    <span v-if="!isEditable" :class="contentClass({ editable: false })">
      {{ value }}
    </span>

    <div v-else-if="type === 'custom'" :class="contentClass({ editable: true })">
      <slot />
    </div>

    <div v-else-if="type === 'boolean'" :class="[contentClass({ editable: true }), 'flex items-center gap-2']">
      <input type="checkbox" v-model="value" class="h-4 w-4" />
    </div>

    <input v-else-if="type === 'number'" type="number" v-model.number="value" :class="contentClass({ editable: true })" />

    <input v-else-if="type === 'date'" type="date" v-model="value" :class="contentClass({ editable: true })" />

    <input v-else type="text" v-model="value" :class="contentClass({ editable: true })" />
  </div>
</template>
