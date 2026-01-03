<script setup lang="ts">
  import type { EditableTableColumn } from "#editable-table/types/column";
  import { computed, ref } from "vue";

  type MemberRow = {
    id: number;
    name: string;
    role: string;
    squad: string;
    tickets: number;
    active: boolean;
    joinedAt: string;
  };

  const baseRows: MemberRow[] = [
    { id: 101, name: "Lena Rivers", role: "Product Designer", squad: "Atlas", tickets: 12, active: true, joinedAt: "2022-03-14" },
    { id: 102, name: "Milo Park", role: "Staff Engineer", squad: "Atlas", tickets: 8, active: true, joinedAt: "2021-09-30" },
    { id: 103, name: "Ivy Santos", role: "Data Analyst", squad: "Aurora", tickets: 6, active: true, joinedAt: "2020-11-12" },
    { id: 104, name: "Rei Onishi", role: "Product Manager", squad: "Helix", tickets: 4, active: false, joinedAt: "2019-06-01" },
    { id: 105, name: "Zoe Malik", role: "QA Lead", squad: "Nova", tickets: 9, active: true, joinedAt: "2023-01-09" },
    { id: 106, name: "Caleb Noor", role: "Ops Engineer", squad: "Atlas", tickets: 3, active: true, joinedAt: "2022-07-21" },
    { id: 107, name: "Ari Chen", role: "UX Researcher", squad: "Aurora", tickets: 5, active: false, joinedAt: "2021-02-18" },
    { id: 108, name: "Sofia Marin", role: "Frontend Engineer", squad: "Nova", tickets: 7, active: true, joinedAt: "2023-05-11" }
  ];

  const columns = ref<EditableTableColumn<MemberRow>[]>([
    {
      rowKey: "name",
      title: "Name",
      type: "text",
      required: true,
      validate: (value) => (String(value ?? "").trim().length < 2 ? "Name must be at least 2 characters." : null)
    },
    {
      rowKey: "role",
      title: "Role",
      type: "select",
      options: [
        "Product Designer",
        "Staff Engineer",
        "Data Analyst",
        "Product Manager",
        "QA Lead",
        "Ops Engineer",
        "UX Researcher",
        "Frontend Engineer"
      ],
      allowCustomOptions: true,
      hidden: true
    },
    {
      rowKey: "squad",
      title: "Squad",
      type: "select",
      options: ["Atlas", "Aurora", "Helix", "Nova"],
      allowCustomOptions: false
    },
    {
      rowKey: "tickets",
      title: "Open tickets",
      type: "number",
      validate: (value) => (Number(value) > 20 ? "Keep ticket load under 20." : null)
    },
    { rowKey: "active", title: "Active", type: "boolean" },
    {
      rowKey: "joinedAt",
      title: "Joined",
      type: "date",
      validate: (value) => {
        const date = new Date(String(value ?? ""));
        if (Number.isNaN(date.getTime())) return "Enter a valid date.";
        if (date > new Date()) return "Start date cannot be in the future.";
        return null;
      }
    }
  ]);

  const rows = ref<MemberRow[]>(cloneRows(baseRows));

  const activeCount = computed(() => rows.value.filter((row) => row.active).length);
  const totalTickets = computed(() => rows.value.reduce((total, row) => total + (Number(row.tickets) || 0), 0));
  const avgTickets = computed(() => (rows.value.length ? (totalTickets.value / rows.value.length).toFixed(1) : "0"));
  const newestJoin = computed(() => {
    const dates = rows.value
      .map((row) => row.joinedAt)
      .filter(Boolean)
      .sort();
    return dates.length ? dates[dates.length - 1] : "";
  });
  const rowsPreview = computed(() => JSON.stringify(rows.value.slice(0, 4), null, 2));

  const validationExamples = [
    { title: "Required values", detail: "Blank names highlight as invalid." },
    { title: "Custom rules", detail: "Short names and ticket counts over 20 show messages." },
    { title: "Type checks", detail: "Non-numeric ticket values are rejected." },
    { title: "Dates", detail: "Invalid or future start dates trigger errors." }
  ];

  const hotkeys = [
    { combo: "Type", note: "Start editing immediately based on column type" },
    { combo: "Enter", note: "Start editing; press again to commit and move down" },
    { combo: "Tab / Shift+Tab", note: "Move horizontally and commit the current edit" },
    { combo: "Shift + arrows", note: "Extend selection across rows or columns" },
    { combo: "Cmd/Ctrl + arrows", note: "Jump to the start/end of a row or column" },
    { combo: "Backspace / Delete", note: "Clear a cell and start editing" },
    { combo: "Cmd/Ctrl + C / V", note: "Copy/paste ranges directly from spreadsheets" },
    { combo: "Cmd/Ctrl + Z / Y", note: "Undo and redo table history" }
  ];

  const tips = [
    "Drag headers or row numbers to reorder columns and rows.",
    "Right-click the header row to manage column visibility.",
    "Look for the tiny eye badge between columns to reveal hidden ones.",
    "Role is a freeform select; Squad is preset-only.",
    "Hover red borders to see validation messages.",
    "Press Esc to cancel an edit and revert.",
    "Use the Add row button to append a row then start typing immediately."
  ];

  const featureHighlights = [
    { title: "Type-to-edit", detail: "Start typing to edit; numbers, booleans, and text are type-aware." },
    { title: "Row + column drag", detail: "Drag headers or row numbers to reorder instantly." },
    { title: "Context menus", detail: "Right-click the header row or a row number for actions." },
    { title: "Visibility controls", detail: "Hide columns and reveal via subtle indicators or header menu." },
    { title: "Select modes", detail: "Role allows custom entries; Squad is preset-only." },
    { title: "Validation", detail: "Required fields and custom rules show inline errors." },
    { title: "Clipboard", detail: "Copy/paste ranges straight to and from spreadsheets." },
    { title: "History", detail: "Undo and redo with Cmd/Ctrl + Z/Y." },
    { title: "Persistence", detail: "Column order, visibility, and sort are stored per user." }
  ];

  function cloneRows(source: MemberRow[]) {
    return source.map((row) => ({ ...row }));
  }

  function resetRows() {
    rows.value = cloneRows(baseRows);
  }

  function addSampleRow() {
    rows.value = [
      ...rows.value,
      {
        id: Date.now(),
        name: `New hire ${rows.value.length + 1}`,
        role: "Engineer",
        squad: "Nova",
        tickets: Math.floor(Math.random() * 6) + 2,
        active: true,
        joinedAt: new Date().toISOString().slice(0, 10)
      }
    ];
  }

  function applyValidationExamples() {
    const exampleRows = cloneRows(baseRows);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);

    if (exampleRows[0]) exampleRows[0].name = "A";
    if (exampleRows[1]) exampleRows[1].tickets = 27;
    if (exampleRows[2]) exampleRows[2].joinedAt = futureDate.toISOString().slice(0, 10);
    if (exampleRows[3]) exampleRows[3].name = "";
    if (exampleRows[4]) exampleRows[4].joinedAt = "not-a-date";

    rows.value = exampleRows;
  }

  function formatDate(date: string) {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden bg-linear-to-br from-[#f9fafb] via-[#f3f0ff] to-[#e9f7ff] text-slate-900 font-['Space_Grotesk','Manrope',system-ui,sans-serif]">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        class="absolute -left-32 top-10 h-64 w-64 rounded-full bg-linear-to-br from-indigo-200 via-white to-emerald-100 blur-3xl opacity-60" />
      <div
        class="absolute -right-12 -bottom-16 h-72 w-72 rounded-full bg-linear-to-tr from-orange-100 via-white to-sky-100 blur-3xl opacity-70" />
    </div>

    <main class="relative mx-auto max-w-7xl px-6 py-10 space-y-10">
      <header class="max-w-4xl space-y-6">
        <p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Nuxt module · editable grid</p>
        <h1 class="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">Editable Table built for flow, not forms.</h1>
        <p class="text-lg leading-relaxed text-slate-700">
          Compose spreadsheet-like experiences with real keyboard support, type-aware editors, clipboard integration, and row/column
          utilities. Every interaction in the table below updates the live data snapshot.
        </p>
        <div class="flex flex-wrap gap-3 text-sm font-medium text-slate-800">
          <span class="rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-slate-200">Keyboard-first</span>
          <span class="rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-slate-200">Copy/Paste to Sheets</span>
          <span class="rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-slate-200">Column + row controls</span>
          <span class="rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-slate-200">Tailwind styled</span>
        </div>
      </header>

      <section class="overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Live demo</p>
            <p class="text-lg font-semibold text-slate-900">Product teams roster</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow-md"
              @click="resetRows">
              Reset data
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:shadow-md"
              @click="applyValidationExamples">
              Show validation errors
            </button>
            <button
              type="button"
              class="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-px hover:shadow-lg"
              @click="addSampleRow">
              Add sample row
            </button>
          </div>
        </div>

        <div class="border-b border-slate-200/70 bg-linear-to-b from-white to-slate-50/60 px-4 pb-4 pt-3">
          <EditableTable v-model="rows" v-model:columns="columns" allow-column-type-changes storage-key="playground-roster" />
        </div>

        <div class="border-b border-slate-200/70 bg-white/80 px-5 py-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation walkthrough</p>
              <p class="text-sm text-slate-600">
                Load the validation errors and hover the red borders in the table to see each rule in action.
              </p>
            </div>
            <div class="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div v-for="example in validationExamples" :key="example.title" class="rounded-xl bg-white/90 px-3 py-2 ring-1 ring-slate-200">
                <p class="text-sm font-semibold text-slate-900">{{ example.title }}</p>
                <p class="mt-1 leading-relaxed text-slate-600">{{ example.detail }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-900 text-white shadow-lg ring-1 ring-black/10">
            <div class="px-4 py-3 text-xs uppercase tracking-wide text-white/70">Active teammates</div>
            <div class="px-4 pb-4 text-3xl font-semibold">{{ activeCount }} / {{ rows.length }}</div>
          </div>
          <div class="rounded-2xl bg-white/90 shadow-inner ring-1 ring-slate-200">
            <div class="px-4 py-3 text-xs uppercase tracking-wide text-slate-500">Open tickets</div>
            <div class="flex items-baseline gap-2 px-4 pb-4">
              <span class="text-3xl font-semibold text-slate-900">{{ totalTickets }}</span>
              <span class="text-sm text-slate-500">avg {{ avgTickets }}</span>
            </div>
          </div>
          <div class="rounded-2xl bg-white/90 shadow-inner ring-1 ring-slate-200 sm:col-span-2">
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-xs uppercase tracking-wide text-slate-500">Most recent start date</span>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Sort by Joined →</span>
            </div>
            <div class="px-4 pb-4 text-lg font-semibold text-slate-900">{{ formatDate(newestJoin ?? "") }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Feature set</p>
            <h3 class="text-lg font-semibold text-slate-900">Everything enabled in this playground</h3>
          </div>
          <span class="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">Latest</span>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in featureHighlights"
            :key="feature.title"
            class="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <p class="text-sm font-semibold text-slate-900">{{ feature.title }}</p>
            <p class="mt-2 text-xs leading-relaxed text-slate-600">{{ feature.detail }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Ways to explore</p>
              <h3 class="text-lg font-semibold text-slate-900">Try these interactions in the table</h3>
            </div>
            <span class="rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">Hands-on</span>
          </div>
          <ul class="mt-4 space-y-3 text-slate-700">
            <li v-for="tip in tips" :key="tip" class="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/80">
              <span class="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-900" />
              <span class="leading-relaxed">{{ tip }}</span>
            </li>
          </ul>
        </div>

        <div class="grid gap-6">
          <div class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Keyboard palette</p>
                <h3 class="text-lg font-semibold text-slate-900">Stay in flow without the mouse</h3>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
                >Power user</span
              >
            </div>
            <div class="mt-4 space-y-2">
              <div
                v-for="entry in hotkeys"
                :key="entry.combo"
                class="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/80">
                <span class="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{{
                  entry.combo
                }}</span>
                <span class="leading-relaxed text-slate-700">{{ entry.note }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-white/70 bg-slate-900 text-slate-100 shadow-xl ring-1 ring-black/10 backdrop-blur">
            <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-white/60">Data snapshot</p>
                <h3 class="text-lg font-semibold">Rows sync live as you edit</h3>
              </div>
              <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                {{ rows.length }} rows
              </span>
            </div>
            <pre class="max-h-56 overflow-auto px-5 py-4 text-xs leading-relaxed text-emerald-100/90"
              >{{ rowsPreview }}
            </pre>
            <p class="px-5 pb-5 text-xs text-white/70">Copy/paste or undo/redo above and watch this snapshot update instantly.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Manrope:wght@500;600&display=swap");
</style>
