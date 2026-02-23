<script setup lang="ts" generic="TValue extends string | number | boolean | null">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

  export interface EditableTableSelectCellProps {
    isEditable?: boolean;
    options?: string[];
    allowCustomOptions?: boolean;
  }

  const props = withDefaults(defineProps<EditableTableSelectCellProps>(), {
    isEditable: false,
    options: () => [],
    allowCustomOptions: true
  });

  const value = defineModel<TValue>();

  const isDropdownOpen = ref(false);
  const dropdownStyle = ref<Record<string, string>>({});
  const placement = ref<"top" | "bottom">("bottom");
  const inputElement = ref<HTMLElement | null>(null);
  const dropdownElement = ref<HTMLElement | null>(null);
  const highlightedIndex = ref<number>(-1);
  const hasTyped = ref(false);
  const inputValue = ref("");

  const displayValue = computed(() => {
    if (value.value === null || value.value === undefined) return "";
    return String(value.value);
  });

  const displayInputValue = computed(() => (props.allowCustomOptions ? displayValue.value : inputValue.value));

  const filteredOptions = computed(() => {
    const query = (props.allowCustomOptions ? displayValue.value : inputValue.value).trim().toLowerCase();
    const shouldFilter = hasTyped.value && query.length > 0;
    if (!shouldFilter) return props.options;
    return props.options.filter((option) => option.toLowerCase().includes(query));
  });

  const dropdownEntries = computed(() => {
    const entries = filteredOptions.value.map((option) => ({ label: option, isNew: false }));
    const input = (props.allowCustomOptions ? displayValue.value : inputValue.value).trim();
    const normalizedInput = input.toLowerCase();
    const hasInput = hasTyped.value && normalizedInput.length > 0;

    if (hasInput && props.allowCustomOptions) {
      const existingIndex = entries.findIndex((entry) => entry.label.toLowerCase() === normalizedInput);
      if (existingIndex !== -1) {
        entries.splice(existingIndex, 1);
      }
      entries.unshift({ label: input, isNew: true });
    }

    return entries;
  });

  const inputClass = "w-full bg-transparent text-sm leading-6 outline-none border-none p-0 m-0";

  function selectOption(option: string) {
    value.value = option as TValue;
    inputValue.value = option;
    isDropdownOpen.value = false;
    highlightedIndex.value = -1;
    hasTyped.value = false;
    nextTick(() => {
      inputElement.value?.blur();
    });
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function computeDropdownPosition() {
    if (!isDropdownOpen.value) return;
    const trigger = inputElement.value;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
    if (!viewportWidth || !viewportHeight) return;

    const gap = 6;
    const padding = 8;
    const maxHeight = 220;
    const spaceBelow = viewportHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;
    const shouldOpenUp = spaceBelow < 140 && spaceAbove > spaceBelow;

    placement.value = shouldOpenUp ? "top" : "bottom";

    const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow;
    const resolvedHeight = clamp(availableHeight, 80, maxHeight);
    const width = Math.min(triggerRect.width, viewportWidth - padding * 2);
    const left = clamp(triggerRect.left, padding, viewportWidth - width - padding);

    let top = placement.value === "bottom" ? triggerRect.bottom + gap : triggerRect.top - resolvedHeight - gap;
    top = clamp(top, padding, viewportHeight - resolvedHeight - padding);

    dropdownStyle.value = {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      maxHeight: `${resolvedHeight}px`
    };
  }

  function openDropdown() {
    if (!dropdownEntries.value.length) return;
    isDropdownOpen.value = true;
    highlightedIndex.value = dropdownEntries.value.length ? 0 : -1;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | null;
    const nextValue = target?.value ?? "";
    inputValue.value = nextValue;
    if (props.allowCustomOptions) {
      value.value = nextValue as TValue;
    }
    hasTyped.value = true;
    openDropdown();
  }

  function moveHighlight(direction: "up" | "down") {
    if (!dropdownEntries.value.length) return;
    if (!isDropdownOpen.value) {
      openDropdown();
      return;
    }

    const lastIndex = dropdownEntries.value.length - 1;
    if (direction === "down") {
      highlightedIndex.value = highlightedIndex.value < lastIndex ? highlightedIndex.value + 1 : lastIndex;
    } else {
      highlightedIndex.value = highlightedIndex.value > 0 ? highlightedIndex.value - 1 : 0;
    }

    nextTick(() => {
      const active = dropdownElement.value?.querySelector<HTMLElement>("[data-option][data-active='true']");
      active?.scrollIntoView({ block: "nearest" });
    });
  }

  function closeOnOutsideClick(event: MouseEvent) {
    if (!isDropdownOpen.value) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (inputElement.value?.contains(target)) return;
    if (dropdownElement.value?.contains(target)) return;
    isDropdownOpen.value = false;
  }

  function recomputeOnFrame() {
    requestAnimationFrame(() => {
      computeDropdownPosition();
    });
  }

  onMounted(() => {
    window.addEventListener("resize", recomputeOnFrame, { passive: true });
    window.addEventListener("scroll", recomputeOnFrame, { passive: true });
    document.addEventListener("scroll", recomputeOnFrame, { passive: true, capture: true });
    window.addEventListener("mousedown", closeOnOutsideClick);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", recomputeOnFrame);
    window.removeEventListener("scroll", recomputeOnFrame);
    document.removeEventListener("scroll", recomputeOnFrame, true);
    window.removeEventListener("mousedown", closeOnOutsideClick);
  });

  watch(
    () => props.options,
    () => {
      nextTick(computeDropdownPosition);
    }
  );

  watch(
    () => filteredOptions.value.length,
    () => {
      if (isDropdownOpen.value) nextTick(computeDropdownPosition);
      highlightedIndex.value = dropdownEntries.value.length ? Math.min(highlightedIndex.value, dropdownEntries.value.length - 1) : -1;
    }
  );

  watch(isDropdownOpen, (open) => {
    if (open) {
      nextTick(computeDropdownPosition);
    }
  });

  watch(
    () => props.isEditable,
    (editable) => {
      if (!editable) {
        isDropdownOpen.value = false;
        highlightedIndex.value = -1;
        hasTyped.value = false;
        inputValue.value = displayValue.value;
      } else {
        hasTyped.value = false;
        inputValue.value = displayValue.value;
      }
    },
    { immediate: true }
  );
</script>

<template>
  <div class="relative w-full">
    <div class="flex items-center w-full h-full">
      <template v-if="!isEditable">
        <span v-if="displayValue" class="text-sm leading-6 truncate p-0 m-0">{{ displayValue }}</span>
        <span v-else class="text-sm leading-6 p-0 m-0">
          {{ value }}
        </span>
      </template>

      <template v-else>
        <input
          ref="inputElement"
          type="text"
          :value="displayInputValue"
          :readonly="!allowCustomOptions"
          :class="inputClass"
          @focus="openDropdown()"
          @input="handleInput"
          @keydown.escape="isDropdownOpen = false"
          @keydown.down.prevent.stop="moveHighlight('down')"
          @keydown.up.prevent.stop="moveHighlight('up')"
          @keydown.enter.prevent.stop="
            highlightedIndex >= 0 && dropdownEntries[highlightedIndex] && selectOption(dropdownEntries[highlightedIndex].label)
          " />
        <teleport to="body">
          <div
            v-if="options?.length && isDropdownOpen"
            ref="dropdownElement"
            class="z-50 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5"
            :style="dropdownStyle">
            <button
              v-for="(entry, optionIndex) in dropdownEntries"
              :key="entry.label + optionIndex"
              type="button"
              class="flex w-full items-center px-3 py-2 text-left text-sm text-gray-800 transition hover:bg-gray-50"
              :data-option="true"
              :data-active="highlightedIndex === optionIndex"
              :class="highlightedIndex === optionIndex ? 'bg-gray-50' : ''"
              @mousedown.prevent="selectOption(entry.label)"
              @click.prevent="selectOption(entry.label)">
              <span class="truncate">{{ entry.label }}</span>
            </button>
          </div>
        </teleport>
      </template>
    </div>
  </div>
</template>
