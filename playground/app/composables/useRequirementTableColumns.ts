import { ref } from "vue";
import type { EditableTableColumn } from "#editable-table/types/column";
import { ASIL_VALUES, REQUIREMENT_TYPES, type RequirementRow, validateRequirement } from "~/composables/useRequirementsManager";

/**
 * Checks whether a requirement row is performance type.
 * @param requirementRow Requirement row to inspect.
 * @returns True when the row type is performance.
 */
function isPerformanceRequirement(requirementRow: RequirementRow) {
  return requirementRow.type === "Performance";
}

/**
 * Checks whether a requirement row is functional type.
 * @param requirementRow Requirement row to inspect.
 * @returns True when the row type is functional.
 */
function isFunctionalRequirement(requirementRow: RequirementRow) {
  return requirementRow.type === "Functional";
}

/**
 * Checks whether description cell should be editable.
 * @param requirementRow Requirement row to inspect.
 * @returns True when description is editable.
 */
function isDescriptionEditable(requirementRow: RequirementRow) {
  return !isPerformanceRequirement(requirementRow);
}

/**
 * Checks whether unit cell should be editable.
 * @param requirementRow Requirement row to inspect.
 * @returns True when unit is editable.
 */
function isUnitEditable(requirementRow: RequirementRow) {
  return !isFunctionalRequirement(requirementRow);
}

/**
 * Checks whether limit cells should be editable.
 * @param requirementRow Requirement row to inspect.
 * @returns True when limits are editable.
 */
function isLimitEditable(requirementRow: RequirementRow) {
  return !isFunctionalRequirement(requirementRow);
}

/**
 * Checks whether symbol cell should be editable.
 * @param requirementRow Requirement row to inspect.
 * @returns True when symbol is editable.
 */
function isSymbolEditable(requirementRow: RequirementRow) {
  return !isFunctionalRequirement(requirementRow);
}

/**
 * Creates editable table columns for requirement rows.
 * @returns Column definitions and requirement type helper functions.
 */
export function useRequirementTableColumns() {
  const columns = ref<EditableTableColumn<RequirementRow>[]>([
    {
      rowKey: "key",
      title: "Key",
      type: "text",
      editable: true,
      required: true,
      validate: (value) => (String(value || "").trim() ? null : "Key is required.")
    },
    {
      rowKey: "name",
      title: "Name",
      type: "text",
      editable: true,
      required: true,
      validate: (value) => (String(value || "").trim() ? null : "Name is required.")
    },
    {
      rowKey: "type",
      title: "Type",
      type: "select",
      editable: true,
      required: true,
      options: REQUIREMENT_TYPES,
      allowCustomOptions: false,
      validate: (value) => (REQUIREMENT_TYPES.includes(String(value) as RequirementRow["type"]) ? null : "Type is invalid.")
    },
    {
      rowKey: "asil",
      title: "Asil",
      type: "select",
      editable: true,
      required: true,
      options: ASIL_VALUES,
      allowCustomOptions: false,
      validate: (value) => (ASIL_VALUES.includes(String(value) as RequirementRow["asil"]) ? null : "Asil is invalid.")
    },
    {
      rowKey: "description",
      title: "Description",
      type: "text",
      editable: isDescriptionEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "description")?.message ?? null
    },
    {
      rowKey: "symbol",
      title: "Symbol",
      type: "text",
      editable: isSymbolEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "symbol")?.message ?? null
    },
    {
      rowKey: "unit",
      title: "Unit",
      type: "text",
      editable: isUnitEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "unit")?.message ?? null
    },
    {
      rowKey: "minimum",
      title: "Minimum",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "minimumTypicalMaximum")?.message ?? null
    },
    {
      rowKey: "typical",
      title: "Typical",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "minimumTypicalMaximum")?.message ?? null
    },
    {
      rowKey: "maximum",
      title: "Maximum",
      type: "text",
      editable: isLimitEditable,
      validate: (_, row) => validateRequirement(row).find((error) => error.field === "minimumTypicalMaximum")?.message ?? null
    }
  ]);

  return {
    columns,
    isPerformanceRequirement,
    isFunctionalRequirement
  };
}
