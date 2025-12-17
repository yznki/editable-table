<script setup lang="ts">
  const data = ref([]);
  const columns = 25;
  const rows = 200;

  function fillUpArray() {
    const header = Array.from({ length: columns }, (_, colIdx) => `col${colIdx + 1}`);
    const rowsData = Array.from({ length: rows }, () => Array.from({ length: columns }, () => "test"));
    return [header, ...rowsData];
  }

  onMounted(() => {
    data.value = fillUpArray() as never[];
  });
</script>

<template>
  <EditableTable v-model="data" />

  <pre>{{ data }}</pre>
</template>
