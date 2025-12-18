# Editable Table for Nuxt

Rich, keyboard-friendly spreadsheet interactions packaged as a Nuxt module. Drop the `<EditableTable />` component into any Nuxt app to get inline editing, selection, clipboard support, and column/row tools out of the box.

- [🧪 Playground](./playground/app.vue)

## Highlights

- Inline editors for text, number, boolean (checkbox), date, and custom cells.
- Spreadsheet-grade keyboard support: arrows, Tab/Shift+Tab, Enter, Esc, Shift+arrows for range selection, Cmd/Ctrl+Z/Y for undo/redo.
- Copy/paste ranges to and from spreadsheets (tab/newline delimited).
- Select columns that remember any value you type, show pills in display mode, and offer a scrollable, keyboard-friendly dropdown with filtering and arrow navigation.
- Column tools: reorder via drag, type switching (optional), and sort asc/desc.
- Row tools: add rows, insert above/below, move up/down, delete.
- Numeric rollups for selected number columns (sum/avg/min/max/count).
- Ships with Tailwind-powered styling and Font Awesome icons pre-wired.

## Installation

```bash
npm install editable-table
```

Enable the module in your Nuxt config:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["editable-table"],
  editableTable: {}
});
```

The module:

- Registers the `<EditableTable />` component globally.
- Auto-imports composables under `@composables`.
- Exposes types under `@models`.
- Injects the Tailwind plugin and base styles for the table UI.

## Quick start

```vue
<script setup lang="ts">
  import type { EditableTableColumn } from "@models/column";

  type PersonRow = {
    id: number;
    name: string;
    age: number;
    active: boolean;
    joinedAt: string;
  };

  const rows = ref<PersonRow[]>([
    { id: 1, name: "Ada Lovelace", age: 36, active: true, joinedAt: "1843-07-01" },
    { id: 2, name: "Alan Turing", age: 41, active: false, joinedAt: "1950-06-23" }
  ]);

  const columns = ref<EditableTableColumn<PersonRow>[]>([
    { rowKey: "name", title: "Name", type: "text" },
    { rowKey: "age", title: "Age", type: "number" },
    { rowKey: "active", title: "Active", type: "boolean" },
    { rowKey: "joinedAt", title: "Joined", type: "date" }
  ]);
</script>

<template>
  <EditableTable v-model="rows" v-model:columns="columns" allow-column-type-changes />
</template>
```

`v-model` keeps your data in sync; edits emit back into `rows` and `columns`.

## Component API

### `<EditableTable />` props

- `v-model` (`T[]`): Array of row objects. Each row should contain keys referenced by your columns.
- `v-model:columns` (`EditableTableColumn<T>[]`): Column definitions (see below).
- `allow-column-type-changes` (`boolean`, default `false`): Enables the type selector in the column menu and coerces values when switching types.

### Column shape

```ts
type ColumnType = "text" | "number" | "boolean" | "select" | "date" | "custom";

interface EditableTableColumn<TRow> {
  rowKey: keyof TRow | string; // field on the row object
  title: string; // header label
  type?: ColumnType; // defaults to "text"
  width?: number | string; // reserved for future use
}
```

Type handling:

- `number`: coerces numeric-looking strings to numbers.
- `boolean`: checkbox editor; accepts common truthy/falsey strings on paste.
- `date`: ISO `YYYY-MM-DD` strings in the UI; accepts `Date` or parsable strings.
- `select`: values typed in any cell become reusable options; display mode shows colored pills; dropdown is scrollable, filterable, arrow-navigable, and closes on Enter selection.
- `custom`: rendered as text input by default (slotting coming later).

### Keyboard & mouse reference

- `Enter`: start editing; while editing, commit and move down.
- `Tab` / `Shift+Tab`: move right/left (commits current edit).
- `Esc`: revert the current cell to its original value and exit edit mode.
- Arrow keys: navigate cells; hold `Shift` to extend selection; hold `Cmd/Ctrl` to jump to first/last row/column in the current direction.
- `Cmd/Ctrl+Z` / `Cmd/Ctrl+Y` or `Cmd/Ctrl+Shift+Z`: undo/redo.
- Click a header: open the column menu (sort, move, type switch).
- Drag a header: reorder columns.
- Click a row number: select a row; `Shift+click` to select a range; right-click to open the row menu (insert, move, delete).
- `Cmd/Ctrl+C` / `Cmd/Ctrl+V`: copy/paste selections to/from spreadsheets (tab/newline grid).

### Data notes

- The table assigns stable internal IDs to rows to keep history and row actions consistent even when objects are replaced.
- Pastes of multi-cell ranges respect your selection shape; single values paste into every selected cell.
- Numeric rollups in the footer appear when a selection includes number-typed columns; choose Sum/Average/Min/Max/Count from the footer select.

## Styling

Tailwind is already wired through Vite and the module injects base styles from `src/runtime/tailwind.css`. The root element carries `data-editable-table-root` if you need to target it. You can extend Tailwind utilities in your app to theme the table.

## Local development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Playground (http://localhost:3000)
npm run dev

# Build the playground
npm run dev:build

# Format
npm run format
npm run format:check
```

When publishing, `npm run prepack` builds the module output under `dist`.
