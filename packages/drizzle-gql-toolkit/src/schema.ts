import type { Table } from "drizzle-orm";
import type { FieldsDef, InferFieldsDef, SchemaWithFields } from "./types.js";

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
  schema: () => ObjectSchema<Table, string>;
  /** Field name in target schema to join on */
  column: string;
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
  /** Optional select alias */
  alias?: string;
  /** Join configuration */
  join?: Join;
};

/**
 * Schema configuration with typed fields
 */
export type SchemaConfig<T extends Table, F extends string = string> = {
  /** Source table */
  table: T;
  /** Table name (for aliasing) */
  tableName: string;
  /** Field configurations */
  fields: Record<F, FieldConfig>;
  /** Default fields to select */
  defaultFields?: F[];
  /** Default order */
  defaultOrder?: F[];
};

/**
 * Object schema for query building (matches goqutil.ObjectSchema)
 * @template T - Drizzle table type
 * @template F - Field names (union of string literals)
 * @template Fields - Nested fields structure for type-safe path access
 */
export class ObjectSchema<
  T extends Table = Table,
  F extends string = string,
  Fields extends FieldsDef = FieldsDef,
> implements SchemaWithFields<Fields>
{
  readonly table: T;
  readonly tableName: string;
  readonly fields: Map<string, FieldConfig>;
  readonly fieldNames: F[];
  readonly defaultFields: F[];
  readonly defaultOrder: F[];

  /**
   * Type-level field structure for nested path inference.
   * This property exists only at the type level and is not used at runtime.
   */
  declare readonly __fields: Fields;

  constructor(config: SchemaConfig<T, F>) {
    this.table = config.table;
    this.tableName = config.tableName;
    this.fields = new Map(Object.entries(config.fields));
    this.fieldNames = Object.keys(config.fields) as F[];
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
  getJoinSchema(name: string): ObjectSchema<Table, string> | undefined {
    const join = this.getJoin(name);
    if (!join) return undefined;

    return join.schema();
  }
}

/**
 * Create an object schema with typed field names and nested path support.
 *
 * The schema automatically infers nested field structures from join configurations,
 * enabling full autocomplete for nested paths like "items.product.title".
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
 *     translation: {
 *       column: "id",
 *       join: {
 *         type: "left",
 *         schema: () => translationSchema,
 *         column: "entityId",
 *       }
 *     }
 *   }
 * });
 *
 * // Query with nested fields - join is added automatically:
 * // Full autocomplete for "translation.value", "translation.searchValue", etc.
 * // qb.buildSelectSql({
 * //   select: ["id", "handle", "translation.value"],
 * //   where: { translation: { value: { $iLike: "%test%" } } },
 * //   order: ["translation.value:asc"]
 * // })
 * ```
 */
export function createSchema<
  T extends Table,
  const Config extends Record<string, FieldConfig>,
>(
  config: Omit<SchemaConfig<T, string>, "fields"> & { fields: Config }
): ObjectSchema<T, keyof Config & string, InferFieldsDef<Config>> {
  return new ObjectSchema(config as SchemaConfig<T, keyof Config & string>);
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
