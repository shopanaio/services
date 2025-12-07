import type { Table, Column } from "drizzle-orm";
import type {
  FieldsDef,
  InferFieldsDef,
  InferFieldTypes,
  SchemaWithFields,
  SchemaWithTypes,
} from "./types.js";
import { UnknownFieldError } from "./errors.js";

/**
 * Aliased table type - a table with columns accessible by name
 */
export type AliasedTable = Table & Record<string, Column>;

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
 * @template Types - Inferred field types from table columns
 */
export class ObjectSchema<
  T extends Table = Table,
  F extends string = string,
  Fields extends FieldsDef = FieldsDef,
  Types = T["$inferSelect"],
> implements SchemaWithFields<Fields>, SchemaWithTypes<T, Types>
{
  readonly table: T;
  readonly tableName: string;
  readonly fields: Map<string, FieldConfig>;
  readonly fieldNames: F[];
  readonly defaultFields: F[];
  readonly defaultOrder: F[];
  readonly cacheKey: string;
  private readonly pathCache = new Map<string, FieldConfig[]>();

  /**
   * Type-level field structure for nested path inference.
   * This property exists only at the type level and is not used at runtime.
   */
  declare readonly __fields: Fields;

  /**
   * Type-level table reference for type inference.
   */
  declare readonly __table: T;

  /**
   * Type-level field types mapping for result inference.
   */
  declare readonly __types: Types;

  constructor(config: SchemaConfig<T, F>, cacheKey: string) {
    this.table = config.table;
    this.tableName = config.tableName;
    this.fields = new Map(Object.entries(config.fields));
    this.fieldNames = Object.keys(config.fields) as F[];
    this.defaultFields = config.defaultFields ?? [];
    this.defaultOrder = config.defaultOrder ?? [];
    this.cacheKey = cacheKey;
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

  resolveFieldPath(path: string): FieldConfig[] {
    const cached = this.pathCache.get(path);
    if (cached) {
      return cached;
    }

    const segments = path.split(".");
    const configs: FieldConfig[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentSchema: ObjectSchema<any, any, any, any> = this;

    for (const segment of segments) {
      const field = currentSchema.getField(segment);
      if (!field) {
        throw new UnknownFieldError(segment);
      }

      configs.push(field);

      if (field.join) {
        currentSchema = field.join.schema();
      }
    }

    this.pathCache.set(path, configs);
    return configs;
  }
}

const schemaCache = new WeakMap<Table, Map<string, ObjectSchema>>();

function getSchemaCacheKey(
  fields: Record<string, FieldConfig>,
  tableName: string
): string {
  const normalized = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, field]) => {
      if (!field.join) {
        return `${name}:${field.column}:field`;
      }
      const targetSchema = field.join.schema();
      const compositeKey = field.join.composite
        ? field.join.composite
            .map((c) => `${c.field}:${c.column}`)
            .sort()
            .join("|")
        : "";
      const targetKey = targetSchema.cacheKey ?? targetSchema.tableName;
      return `${name}:${field.column}:join:${field.join.type ?? "left"}:${field.join.column}:${targetKey}:${compositeKey}`;
    });
  return `${tableName}|${normalized.join(",")}`;
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
): ObjectSchema<T, keyof Config & string, InferFieldsDef<Config>, InferFieldTypes<T, Config>> {
  let cacheForTable = schemaCache.get(config.table);
  if (!cacheForTable) {
    cacheForTable = new Map();
    schemaCache.set(config.table, cacheForTable);
  }

  const cacheKey = getSchemaCacheKey(config.fields, config.tableName);
  const cached = cacheForTable.get(cacheKey);
  if (cached) {
    return cached as ObjectSchema<T, keyof Config & string, InferFieldsDef<Config>, InferFieldTypes<T, Config>>;
  }

  const schema = new ObjectSchema(
    config as SchemaConfig<T, keyof Config & string>,
    cacheKey
  );
  cacheForTable.set(cacheKey, schema);
  return schema as ObjectSchema<T, keyof Config & string, InferFieldsDef<Config>, InferFieldTypes<T, Config>>;
}

/**
 * Join information collected during query building
 */
export type JoinInfo = {
  type: JoinType;
  sourceTable: AliasedTable;
  targetTable: AliasedTable;
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
