import type { Table } from "drizzle-orm";
import type { ColumnNames } from "./types.js";

/**
 * Join type
 */
export type JoinType = "left" | "right" | "inner" | "full";

/**
 * Join configuration for a field
 */
export type Join = {
  /** Join type (default: 'left') */
  type?: JoinType;
  /** Target schema for the join (lazy reference to avoid circular dependencies) */
  schema: () => ObjectSchema;
  /** Field name in target schema to join on */
  column: string;
  /**
   * Select: array of field names in target schema to apply filters to
   * When filtering on this field, the filter will be applied to all select fields
   */
  select?: string[];
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
export type FieldConfig = {
  /** Column name in the table */
  column: string;
  /** Alias for select */
  as?: string;
  /** Join configuration */
  join?: Join;
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
   * Get the target schema for a join
   */
  getJoinSchema(name: string): ObjectSchema | undefined {
    const join = this.getJoin(name);
    if (!join) return undefined;

    return join.schema();
  }
}

/**
 * Create an object schema
 *
 * @example
 * ```ts
 * const translationSchema = createSchema({
 *   table: translation,
 *   tableName: "translation",
 *   fields: {
 *     entityId: { column: "entity_id" },
 *     value: { column: "value" },
 *     searchValue: { column: "search_value" },
 *   }
 * });
 *
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
 *         schema: () => translationSchema,
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
