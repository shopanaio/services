import type { Table } from "drizzle-orm";
import type { ColumnNames } from "./types.js";

/**
 * Join type
 */
export type JoinType = "left" | "right" | "inner" | "full";

/**
 * Join configuration for a field
 */
export type Join<T extends Table = Table> = {
  /** Join type (default: 'left') */
  type?: JoinType;
  /** Target table for the join */
  table: T | (() => T);
  /** Column in target table to join on */
  column: ColumnNames<T>;
  /**
   * Select: array of fields in target table to apply filters to
   * When filtering on this field, the filter will be applied to all select fields
   */
  select?: ColumnNames<T>[];
  /** Self-referencing join */
  self?: boolean;
  /** Composite key fields */
  composite?: Array<{
    field: string;
    column: string;
  }>;
};

/**
 * Field configuration in schema
 */
export type FieldConfig<T extends Table = Table> = {
  /** Column name in the table */
  column: string;
  /** Alias for select */
  as?: string;
  /** Join configuration */
  join?: Join<T>;
};

/**
 * Schema configuration
 */
export type SchemaConfig<T extends Table> = {
  /** Source table */
  table: T;
  /** Table name (for aliasing) */
  tableName: string;
  /** Field configurations */
  fields: Record<string, FieldConfig>;
  /** Default fields to select */
  defaultFields?: string[];
  /** Default order */
  defaultOrder?: string[];
};

/**
 * Object schema for query building (matches goqutil.ObjectSchema)
 */
export class ObjectSchema<T extends Table = Table> {
  readonly table: T;
  readonly tableName: string;
  readonly fields: Map<string, FieldConfig>;
  readonly defaultFields: string[];
  readonly defaultOrder: string[];

  constructor(config: SchemaConfig<T>) {
    this.table = config.table;
    this.tableName = config.tableName;
    this.fields = new Map(Object.entries(config.fields));
    this.defaultFields = config.defaultFields ?? [];
    this.defaultOrder = config.defaultOrder ?? [];
  }

  /**
   * Get field configuration by name
   */
  getField(name: string): FieldConfig | undefined {
    return this.fields.get(name);
  }

  /**
   * Check if field has a join
   */
  hasJoin(name: string): boolean {
    const field = this.fields.get(name);
    return field?.join !== undefined;
  }

  /**
   * Get join for a field
   */
  getJoin(name: string): Join | undefined {
    return this.fields.get(name)?.join;
  }

  /**
   * Get the target table for a join (resolves lazy references)
   */
  getJoinTable(name: string): Table | undefined {
    const join = this.getJoin(name);
    if (!join) return undefined;

    return typeof join.table === "function" ? join.table() : join.table;
  }
}

/**
 * Create an object schema
 *
 * @example
 * ```ts
 * const productSchema = createSchema({
 *   table: product,
 *   tableName: "product",
 *   fields: {
 *     id: { column: "id" },
 *     handle: { column: "handle" },
 *     title: {
 *       column: "id",
 *       join: {
 *         type: "left",
 *         table: () => translation,
 *         column: "entityId",
 *         select: ["value", "searchValue"],
 *       }
 *     }
 *   }
 * });
 * ```
 */
export function createSchema<T extends Table>(
  config: SchemaConfig<T>
): ObjectSchema<T> {
  return new ObjectSchema(config);
}

/**
 * Join information collected during query building
 */
export type JoinInfo = {
  type: JoinType;
  sourceAlias: string;
  targetTable: Table;
  targetAlias: string;
  conditions: Array<{
    sourceCol: string;
    targetCol: string;
  }>;
};

/**
 * Generate table alias with depth prefix (matches goqutil.TPrefix)
 */
export function tablePrefix(tableName: string, depth: number): string {
  return `t${depth}_${tableName}`;
}
