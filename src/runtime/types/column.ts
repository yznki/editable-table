import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDays,
  faCircleQuestion,
  faFont,
  faHashtag,
  faListUl,
  faPuzzlePiece,
  faToggleOn
} from "@fortawesome/free-solid-svg-icons";

export type ColumnType = "text" | "number" | "boolean" | "select" | "date" | "custom";

export interface EditableTableColumn<TRow extends Record<string, any> = Record<string, any>> {
  rowKey: keyof TRow | string;
  title: string;

  type?: ColumnType;

  editable?: boolean;
  required?: boolean;

  width?: number | string;
}

export interface ColumnTypeOption {
  value: ColumnType;
  label: string;
  icon?: IconDefinition;
}

const unknownTypeOption: ColumnTypeOption = {
  value: "custom",
  label: "Custom",
  icon: faCircleQuestion
};

export const defaultColumnTypeOptions: ColumnTypeOption[] = [
  { value: "text", label: "Text", icon: faFont },
  { value: "number", label: "Number", icon: faHashtag },
  { value: "boolean", label: "Boolean", icon: faToggleOn },
  { value: "select", label: "Select", icon: faListUl },
  { value: "date", label: "Date", icon: faCalendarDays },
  { value: "custom", label: "Custom", icon: faPuzzlePiece }
];

export function resolveColumnTypeOption(type: ColumnType | undefined, availableTypes?: ColumnTypeOption[]): ColumnTypeOption {
  const allOptions = availableTypes?.length ? availableTypes : defaultColumnTypeOptions;
  const defaultOption = defaultColumnTypeOptions.find((option) => option.value === (type ?? "text"));
  const matchedOption = allOptions.find((option) => option.value === (type ?? "text")) ?? defaultOption ?? unknownTypeOption;

  return {
    ...unknownTypeOption,
    ...defaultOption,
    ...matchedOption,
    value: matchedOption.value
  };
}
