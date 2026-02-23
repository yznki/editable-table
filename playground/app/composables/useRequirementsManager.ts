import { useLocalStorage } from "@vueuse/core";

export type RequirementType = "Performance" | "Functional" | "Condition" | "Design Characteristic";
export type Asil = "Qm" | "JamaA" | "JamaB" | "JamaC" | "JamaD";

/**
 * Requirement validation error model.
 */
export interface RequirementValidationError {
  /**
   * Field key associated with the validation error.
   */
  field: string;

  /**
   * User-facing validation message.
   */
  message: string;
}

/**
 * Editable requirement row model.
 */
export interface RequirementRow {
  /**
   * Requirement key identifier.
   */
  key: string;

  /**
   * Requirement name.
   */
  name: string;

  /**
   * Requirement category.
   */
  type: RequirementType;

  /**
   * Safety integrity level.
   */
  asil: Asil;

  /**
   * Functional requirement description.
   */
  description: string;

  /**
   * Parametric symbol.
   */
  symbol: string;

  /**
   * Parametric unit.
   */
  unit: string;

  /**
   * Minimum value.
   */
  minimum: string;

  /**
   * Maximum value.
   */
  maximum: string;

  /**
   * Typical value.
   */
  typical: string;
}

/**
 * Requirement set model within a project.
 */
export interface RequirementSheet {
  /**
   * Requirement-set identifier.
   */
  id: string;

  /**
   * Requirement-set display name.
   */
  name: string;

  /**
   * Requirements in this set.
   */
  requirements: RequirementRow[];
}

/**
 * Project model stored in local persistence.
 */
export interface ProjectRecord {
  /**
   * Project identifier.
   */
  id: string;

  /**
   * Project name.
   */
  name: string;

  /**
   * Project description.
   */
  description: string;

  /**
   * ISO timestamp for creation.
   */
  createdAt: string;

  /**
   * ISO timestamp for last update.
   */
  updatedAt: string;

  /**
   * Requirement sets in this project.
   */
  sheets: RequirementSheet[];
}

/**
 * Root storage model for the requirements manager.
 */
interface RequirementsManagerStorage {
  /**
   * Storage schema version.
   */
  version: number;

  /**
   * Persisted projects.
   */
  projects: ProjectRecord[];
}

export const REQUIREMENT_TYPES: RequirementType[] = ["Performance", "Functional", "Condition", "Design Characteristic"];
export const ASIL_VALUES: Asil[] = ["Qm", "JamaA", "JamaB", "JamaC", "JamaD"];
const LEGACY_REQUIREMENT_TYPE_ALIASES = new Set(["DesignCharacteristic"]);

const STORAGE_KEY = "requirements-manager-storage-v1";
const NEXT_PROJECT_ID_KEY = "requirements-manager-next-project-id";
const NEXT_SHEET_ID_KEY = "requirements-manager-next-sheet-id";

/**
 * Allocates the next incremental identifier for a counter key.
 * @param storageKey Local storage counter key.
 * @returns Incremental identifier as a string.
 */
function nextIncrementalId(storageKey: string) {
  if (!import.meta.client) {
    return String(Date.now());
  }

  const counter = useLocalStorage<number>(storageKey, 1);
  const current = Number(counter.value);
  const safeCurrent = Number.isFinite(current) && current >= 1 ? Math.floor(current) : 1;
  const next = safeCurrent + 1;

  counter.value = next;
  return String(safeCurrent);
}

/**
 * Returns reactive requirements-manager storage.
 * @returns Reactive local-storage state for projects.
 */
export function useRequirementsManagerStorage() {
  return useLocalStorage<RequirementsManagerStorage>(STORAGE_KEY, {
    version: 1,
    projects: []
  });
}

/**
 * Creates an empty requirement row.
 * @returns Default requirement row.
 */
export function createEmptyRequirement(): RequirementRow {
  return {
    key: "",
    name: "",
    type: "Performance",
    asil: "Qm",
    description: "",
    symbol: "",
    unit: "",
    minimum: "",
    maximum: "",
    typical: ""
  };
}

/**
 * Creates a default requirement set.
 * @param name Display name for the requirement set.
 * @returns Requirement-set record with one empty row.
 */
export function createDefaultSheet(name = "Requirement Set 1"): RequirementSheet {
  return {
    id: nextIncrementalId(NEXT_SHEET_ID_KEY),
    name,
    requirements: [createEmptyRequirement()]
  };
}

/**
 * Creates a new project record with one default set.
 * @param name Project name.
 * @param description Project description.
 * @returns Initialized project record.
 */
export function createProject(name: string, description: string): ProjectRecord {
  const now = new Date().toISOString();

  return {
    id: nextIncrementalId(NEXT_PROJECT_ID_KEY),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    sheets: [createDefaultSheet()]
  };
}

/**
 * Validates a requirement row against domain rules.
 * @param row Requirement row to validate.
 * @returns Validation errors for the row.
 */
export function validateRequirement(row: RequirementRow): RequirementValidationError[] {
  const errors: RequirementValidationError[] = [];

  if (!row.key.trim()) {
    errors.push({ field: "key", message: "Key is required." });
  }

  if (!row.name.trim()) {
    errors.push({ field: "name", message: "Name is required." });
  }

  if (!REQUIREMENT_TYPES.includes(row.type) && !LEGACY_REQUIREMENT_TYPE_ALIASES.has(row.type)) {
    errors.push({ field: "type", message: "Type is invalid." });
  }

  if (!ASIL_VALUES.includes(row.asil)) {
    errors.push({ field: "asil", message: "Asil is invalid." });
  }

  if (row.type === "Performance") {
    if (!row.symbol.trim()) {
      errors.push({ field: "symbol", message: "Parametric (Performance) requirements must have a Symbol." });
    }

    if (!row.unit.trim()) {
      errors.push({ field: "unit", message: "Parametric (Performance) requirements must have a Unit." });
    }

    if (row.description.trim()) {
      errors.push({ field: "description", message: "Parametric (Performance) requirements must not have a Description." });
    }

    const hasAnyLimit = row.minimum.trim() || row.typical.trim() || row.maximum.trim();

    if (!hasAnyLimit) {
      errors.push({
        field: "minimumTypicalMaximum",
        message: "Parametric (Performance) requirements must have at least one of Minimum, Typical, or Maximum."
      });
    }
  } else if (row.type === "Functional") {
    if (!row.description.trim()) {
      errors.push({ field: "description", message: "Non-parametric (Functional) requirements must have a Description." });
    }

    if (row.unit.trim()) {
      errors.push({ field: "unit", message: "Non-parametric (Functional) requirements must not have a Unit." });
    }

    const hasAnyLimit = row.minimum.trim() || row.typical.trim() || row.maximum.trim();

    if (hasAnyLimit) {
      errors.push({
        field: "minimumTypicalMaximum",
        message: "Non-parametric (Functional) requirements must not have Minimum, Typical, or Maximum."
      });
    }
  }

  return errors;
}
