<script setup lang="ts">
  import "active-table";

  const data = defineModel({ default: [] });
</script>

<template>
  <active-table :data="data" />
</template>
