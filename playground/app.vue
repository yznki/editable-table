<script setup lang="ts">
  import type { EditableTableColumn } from "@models/column";

  type UserRow = {
    id: number;
    name: string;
    age: number;
    active: boolean;
    joinedAt: string;
  };

  const rows = ref<UserRow[]>([
    {
      id: 1,
      name: "Alice",
      age: 24,
      active: true,
      joinedAt: "2024-01-12"
    },
    {
      id: 2,
      name: "Bob",
      age: 31,
      active: false,
      joinedAt: "2023-06-03"
    },
    {
      id: 3,
      name: "Charlie",
      age: 28,
      active: true,
      joinedAt: "2022-11-21"
    },
    {
      id: 4,
      name: "Diana",
      age: 35,
      active: false,
      joinedAt: "2021-09-15"
    },
    {
      id: 5,
      name: "Ethan",
      age: 22,
      active: true,
      joinedAt: "2024-03-30"
    },
    {
      id: 6,
      name: "Fiona",
      age: 29,
      active: true,
      joinedAt: "2023-12-05"
    },
    {
      id: 7,
      name: "George",
      age: 33,
      active: false,
      joinedAt: "2022-07-19"
    },
    {
      id: 8,
      name: "Hannah",
      age: 27,
      active: true,
      joinedAt: "2021-04-22"
    }
  ]);

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
