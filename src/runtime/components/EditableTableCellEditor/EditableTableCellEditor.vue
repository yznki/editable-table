<script setup lang="ts" generic="TValue extends string | number | boolean">
  import { ColumnType } from "@models/column";

  const props = withDefaults(defineProps<{ type?: ColumnType }>(), { type: "text" });

  const value = defineModel<TValue>();
</script>

<template>
  <slot v-if="type === 'custom'" />

  <input v-else-if="type === 'boolean'" type="checkbox" v-model="value" />

  <input v-else-if="type === 'number'" type="number" v-model.number="value" />

  <input v-else-if="type === 'date'" type="date" v-model="value" />

  <input v-else type="text" v-model="value" />
</template>
