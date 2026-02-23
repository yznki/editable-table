import { useLocalStorage } from "@vueuse/core";

export type RequirementType = "Performance" | "Functional" | "Condition" | "DesignCharacteristic";
export type Asil = "Qm" | "JamaA" | "JamaB" | "JamaC" | "JamaD";

export interface RequirementValidationError {
  field: string;
  message: string;
}

export interface RequirementRow {
  key: string;
  name: string;
  type: RequirementType;
  asil: Asil;
  description: string;
  symbol: string;
  unit: string;
  minimum: string;
  maximum: string;
  typical: string;
}

export interface RequirementSheet {
  id: string;
  name: string;
  requirements: RequirementRow[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sheets: RequirementSheet[];
}

interface RequirementsManagerStorage {
  version: number;
  projects: ProjectRecord[];
}

export const REQUIREMENT_TYPES: RequirementType[] = ["Performance", "Functional", "Condition", "DesignCharacteristic"];
export const ASIL_VALUES: Asil[] = ["Qm", "JamaA", "JamaB", "JamaC", "JamaD"];

const STORAGE_KEY = "requirements-manager-storage-v1";

export function useRequirementsManagerStorage() {
  return useLocalStorage<RequirementsManagerStorage>(STORAGE_KEY, {
    version: 1,
    projects: []
  });
}

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

export function createDefaultSheet(name = "Requirement Set 1"): RequirementSheet {
  return {
    id: crypto.randomUUID(),
    name,
    requirements: [createEmptyRequirement()]
  };
}

export function createProject(name: string, description: string): ProjectRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    sheets: [createDefaultSheet()]
  };
}

export function validateRequirement(row: RequirementRow): RequirementValidationError[] {
  const errors: RequirementValidationError[] = [];

  if (!row.key.trim()) {
    errors.push({ field: "key", message: "Key is required." });
  }

  if (!row.name.trim()) {
    errors.push({ field: "name", message: "Name is required." });
  }

  if (!REQUIREMENT_TYPES.includes(row.type)) {
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
