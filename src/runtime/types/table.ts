import type { EditableTableColumn } from "./column";

export type TableRow<T extends Record<string, any> = Record<string, any>> = T;

export interface EditableTableProps<TRow extends Record<string, any> = Record<string, any>> {
  modelValue: TRow[];
  columns: EditableTableColumn<TRow>[];

  idPropertyName?: keyof TRow | string;
  allowColumnTypeChanges?: boolean;
}
