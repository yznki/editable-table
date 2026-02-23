<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Editable Table Test Page</h1>
        <p class="text-gray-600">Comprehensive test of all editable table features and column types</p>
      </div>

      <!-- Feature List -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Column Types Tested</h2>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Text (editable)</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Number</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Boolean (toggle)</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Select (with custom options)</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Date picker</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Features Tested</h2>
          <ul class="space-y-2 text-sm text-gray-700">
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Cell editing & validation</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Clipboard (copy/paste)</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Column & row dragging</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Keyboard navigation</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Context menus</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>History (undo/redo)</li>
            <li class="flex items-center"><span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Column preferences</li>
          </ul>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div class="flex flex-wrap gap-3">
          <button
            @click="addRow"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            + Add Row
          </button>
          <button
            @click="clearData"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
            Clear Data
          </button>
          <button
            @click="toggleValidation"
            class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
            {{ showValidation ? "Hide" : "Show" }} Validation Errors
          </button>
          <button
            @click="logTableState"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
            Log Table State
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">Test Table</h2>
          <p class="text-sm text-gray-600 mt-2">
            Try: <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Tab</span> to navigate,
            <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Ctrl+Z</span> to undo,
            <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Drag</span> to reorder columns/rows,
            <span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">Right-click</span> for context menus
          </p>
        </div>

        <div class="p-6 overflow-x-auto">
          <EditableTable
            v-model="tableData"
            v-model:columns="tableColumns"
            v-model:isValid="isTableValid"
            :allow-column-type-changes="true"
            storage-key="editable-table-test" />
        </div>

        <!-- Validation Status -->
        <div v-if="showValidation" class="p-6 bg-gray-50 border-t border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">Table Status</h3>
          <div class="space-y-2 text-sm">
            <p class="flex items-center">
              <span :class="isTableValid ? 'text-green-600' : 'text-red-600'" class="mr-2 font-bold">
                {{ isTableValid ? "✓" : "✗" }}
              </span>
              <span :class="isTableValid ? 'text-green-600' : 'text-red-600'">
                {{ isTableValid ? "All rows are valid" : "Some rows have validation errors" }}
              </span>
            </p>
            <p class="text-gray-700">
              Total rows: <span class="font-semibold">{{ tableData.length }}</span>
            </p>
            <p class="text-gray-700">
              Total columns: <span class="font-semibold">{{ tableColumns.length }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Data Preview -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Data Preview (JSON)</h2>
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-xs leading-relaxed">
          <pre>{{ JSON.stringify(tableData, null, 2) }}</pre>
        </div>
      </div>

      <!-- Instructions -->
      <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-blue-900 mb-3">How to Test All Features</h3>
        <div class="space-y-2 text-sm text-blue-800">
          <p>
            <strong>Cell Editing:</strong> Click any cell to edit. For text and number fields, type to edit. For numbers, only digits are
            allowed.
          </p>
          <p><strong>Boolean Cells:</strong> Click to toggle between true/false.</p>
          <p><strong>Select Cells:</strong> Click to open dropdown with preset and custom options. Type to add new options.</p>
          <p><strong>Date Cells:</strong> Click to open date picker.</p>
          <p><strong>Validation:</strong> Try entering invalid data (non-numbers in number fields, etc.) to see validation in action.</p>
          <p><strong>Column Dragging:</strong> Drag column headers to reorder columns.</p>
          <p><strong>Row Dragging:</strong> Drag row numbers to reorder rows.</p>
          <p><strong>Selection:</strong> Click cells and drag to select multiple cells. Use Shift+Click for range selection.</p>
          <p><strong>Clipboard:</strong> Use Ctrl+C to copy selected cells, Ctrl+V to paste. Use Ctrl+X to cut.</p>
          <p><strong>History:</strong> Use Ctrl+Z to undo and Ctrl+Shift+Z to redo changes.</p>
          <p><strong>Context Menus:</strong> Right-click on column headers or row numbers to see context menu options.</p>
          <p><strong>Required Fields:</strong> Fields marked as required cannot be left empty.</p>
          <p><strong>Column Preferences:</strong> Column visibility and order preferences are saved in localStorage.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import type { EditableTableColumn } from "#editable-table/types/column";

  interface TestTableRow {
    id: string;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
    department: string;
    startDate: string;
    notes: string;
  }

  const tableData = ref<TestTableRow[]>([
    {
      id: "1",
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      age: 28,
      isActive: true,
      department: "Engineering",
      startDate: "2022-01-15",
      notes: "Senior Developer"
    },
    {
      id: "2",
      name: "Bob Smith",
      email: "bob.smith@example.com",
      age: 35,
      isActive: true,
      department: "Product",
      startDate: "2021-06-20",
      notes: "Product Manager"
    },
    {
      id: "3",
      name: "Carol White",
      email: "carol.white@example.com",
      age: 32,
      isActive: false,
      department: "Design",
      startDate: "2023-03-10",
      notes: "UX Designer"
    },
    {
      id: "4",
      name: "David Brown",
      email: "david.brown@example.com",
      age: 29,
      isActive: true,
      department: "Engineering",
      startDate: "2022-11-01",
      notes: "Full Stack Developer"
    },
    {
      id: "5",
      name: "Eve Davis",
      email: "eve.davis@example.com",
      age: 31,
      isActive: true,
      department: "Marketing",
      startDate: "2021-09-15",
      notes: "Marketing Lead"
    }
  ]);

  const tableColumns = ref<EditableTableColumn<TestTableRow>[]>([
    {
      rowKey: "id",
      title: "ID",
      type: "text",
      editable: false,
      width: 80
    },
    {
      rowKey: "name",
      title: "Name",
      type: "text",
      editable: true,
      required: true,
      validate: [
        (value) => {
          const str = String(value || "").trim();
          if (str.length < 2) return "Name must be at least 2 characters";
          if (str.length > 100) return "Name must not exceed 100 characters";
          return null;
        },
        () => "Test validation tooltip for Name column"
      ]
    },
    {
      rowKey: "email",
      title: "Email",
      type: "text",
      editable: true,
      required: true,
      validate: [
        (value) => {
          const email = String(value || "").trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) return "Invalid email format";
          return null;
        },
        () => "Email format should follow user@domain.com pattern"
      ]
    },
    {
      rowKey: "age",
      title: "Age",
      type: "number",
      editable: true,
      required: true,
      validate: [
        (value) => {
          const num = Number(value);
          if (isNaN(num)) return "Must be a number";
          if (num < 18) return "Age must be at least 18";
          if (num > 100) return "Age must not exceed 100";
          return null;
        },
        () => "This is a test validation message for the Age column with a longer description"
      ]
    },
    {
      rowKey: "isActive",
      title: "Active",
      type: "boolean",
      editable: true,
      validate: () => "Boolean field validation tooltip test message"
    },
    {
      rowKey: "department",
      title: "Department",
      type: "select",
      editable: true,
      required: true,
      options: ["Engineering", "Product", "Design", "Marketing", "Sales", "HR"],
      allowCustomOptions: true,
      validate: () => "Department must be selected from the list"
    },
    {
      rowKey: "startDate",
      title: "Start Date",
      type: "date",
      editable: true,
      required: true,
      validate: [
        (value) => {
          const date = new Date(String(value || ""));
          if (isNaN(date.getTime())) return "Invalid date format";
          return null;
        },
        () => "Ensure the date is in YYYY-MM-DD format for consistency"
      ]
    },
    {
      rowKey: "notes",
      title: "Notes",
      type: "text",
      editable: true,
      validate: () => "Notes field validation tooltip example with extended message length"
    }
  ]);

  const isTableValid = ref(true);
  const showValidation = ref(false);

  const addRow = () => {
    const newId = String(Math.max(...tableData.value.map((r) => parseInt(r.id) || 0), 0) + 1);
    tableData.value.push({
      id: newId,
      name: "",
      email: "",
      age: 0,
      isActive: false,
      department: "",
      startDate: new Date().toISOString().split("T")[0] || "",
      notes: ""
    });
  };

  const clearData = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      tableData.value = [];
    }
  };

  const toggleValidation = () => {
    showValidation.value = !showValidation.value;
  };

  const logTableState = () => {
    console.table({
      "Total Rows": tableData.value.length,
      "Total Columns": tableColumns.value.length,
      "Is Valid": isTableValid.value,
      "Visible Columns": tableColumns.value.filter((c) => !c.hidden).length,
      "Hidden Columns": tableColumns.value.filter((c) => c.hidden).length
    });
    console.log("Table Data:", tableData.value);
    console.log("Table Columns:", tableColumns.value);
  };
</script>
