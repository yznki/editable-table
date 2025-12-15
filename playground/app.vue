<script setup lang="ts">
  import type { EditableTableColumn } from "@models/column";

  type UserRow = {
    id: number;
    name: string;
    age: number;
    active: boolean;
    joinedAt: string;
  };

  const rowCount = 10;

  function generateRows() {
    const mockNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah"];
    const result: UserRow[] = [];
    for (let i = 1; i <= rowCount; i++) {
      const name = mockNames[(i - 1) % mockNames.length];
      result.push({
        id: i,
        name: `${name} ${i}`,
        age: 20 + ((i * 7) % 20),
        active: i % 2 === 0,
        joinedAt: new Date(2020 + (i % 5), (i * 3) % 12, ((i * 5) % 28) + 1).toISOString().slice(0, 10)
      });
    }
    return result;
  }

  const rows = ref<UserRow[]>(generateRows());

  const columns: EditableTableColumn<UserRow>[] = [
    {
      rowKey: "name",
      title: "Name",
      type: "text"
    },
    {
      rowKey: "age",
      title: "Age",
      type: "number"
    },
    {
      rowKey: "active",
      title: "Active",
      type: "boolean"
    },
    {
      rowKey: "joinedAt",
      title: "Joined",
      type: "date"
    }
  ];
</script>

<template>
  <div style="padding: 24px">
    <h1>Editable Table Playground</h1>

    <EditableTable v-model="rows" :columns="columns" id-property-name="id" />

    <pre>
      {{ rows.length }}
    </pre>

    <pre style="margin-top: 24px"
      >{{ rows }}
    </pre>
  </div>
</template>
