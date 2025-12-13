export type ColumnType = "text" | "number" | "boolean" | "select" | "date" | "custom";

export interface EditableTableColumn<TRow extends Record<string, any> = Record<string, any>> {
  rowKey: keyof TRow | string;
  title: string;

  type?: ColumnType;

  editable?: boolean;
  required?: boolean;

  width?: number | string;
}
