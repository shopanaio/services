import type { Table } from "drizzle-orm";
import type { ColumnNames } from "./types.js";

/**
 * Relation configuration for a field
 */
export type Relation<T extends Table = Table> = {
  /** Target table for the relation */
  table: T | (() => T);
  /** Column in target table to join on */
  on: ColumnNames<T>;
  /**
   * Lift: array of fields in target table to apply filters to
   * When filtering on this field, the filter will be applied to all lift fields
   */
  lift?: ColumnNames<T>[];
  /** Self-referencing relation */
  self?: boolean;
  /** Composite key fields */
  composite?: Array<{
    field: string;
    on: string;
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
  /** Relation configuration */
  relation?: Relation<T>;
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
   * Check if field has a relation
   */
  hasRelation(name: string): boolean {
    const field = this.fields.get(name);
    return field?.relation !== undefined;
  }

  /**
   * Get relation for a field
   */
  getRelation(name: string): Relation | undefined {
    return this.fields.get(name)?.relation;
  }

  /**
   * Get the target table for a relation (resolves lazy references)
   */
  getRelationTable(name: string): Table | undefined {
    const relation = this.getRelation(name);
    if (!relation) return undefined;

    return typeof relation.table === "function"
      ? relation.table()
      : relation.table;
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
 *       relation: {
 *         table: () => translation,
 *         on: "entityId",
 *         lift: ["value", "searchValue"],
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
  type: "left" | "inner";
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
