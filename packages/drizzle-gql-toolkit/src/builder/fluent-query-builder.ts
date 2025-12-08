import type { SQL, Table } from "drizzle-orm";
import { createSchema, ObjectSchema, type FieldConfig, type Join } from "../schema.js";
import type {
  DrizzleExecutor,
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
  QueryBuilderConfig,
} from "../types.js";
import { QueryBuilder } from "./query-builder.js";
import type { FieldDefinition, JoinDefinition } from "./helpers.js";
import type {
  FluentFieldsDef,
  ToFieldsDef,
  ExecuteOptions,
  FluentQueryConfig,
  QuerySnapshot,
  FluentQueryBuilderLike,
} from "./fluent-types.js";

/**
 * Error thrown when limit exceeds maxLimit
 */
export class MaxLimitExceededError extends Error {
  constructor(requested: number, maxLimit: number) {
    super(`Requested limit ${requested} exceeds maximum allowed limit ${maxLimit}`);
    this.name = "MaxLimitExceededError";
  }
}

/**
 * Immutable Fluent Query Builder
 *
 * Each configuration method returns a new instance with updated config.
 * Provides full type inference for select, order, and where fields.
 *
 * @example
 * ```ts
 * const usersQuery = createQuery(users, {
 *   id: field("id"),
 *   name: field("name"),
 *   email: field("email"),
 * })
 *   .defaultOrder("id:asc")
 *   .defaultSelect(["id", "name"])
 *   .maxLimit(100)
 *   .defaultLimit(20);
 *
 * // Full autocomplete for select, order, where
 * const result = await usersQuery.execute(db, {
 *   select: ["id", "name"],  // autocomplete
 *   order: ["name:asc"],     // autocomplete
 *   where: { name: "test" }, // autocomplete
 * });
 * ```
 */
export class FluentQueryBuilder<
  T extends Table,
  Fields extends FluentFieldsDef,
  // Inferred FieldsDef for type-safe paths
  InferredFields extends FieldsDef = ToFieldsDef<Fields>,
  Types = T["$inferSelect"],
> implements FluentQueryBuilderLike<Fields> {
  private readonly table: T;
  private readonly tableName: string;
  private readonly fieldsDef: Fields;
  private readonly config: FluentQueryConfig<InferredFields>;

  // Cached ObjectSchema and QueryBuilder
  private _schema: ObjectSchema | null = null;
  private _queryBuilder: QueryBuilder<T, string, FieldsDef, Types> | null = null;

  constructor(
    table: T,
    tableName: string,
    fieldsDef: Fields,
    config: FluentQueryConfig<InferredFields> = {}
  ) {
    this.table = table;
    this.tableName = tableName;
    this.fieldsDef = fieldsDef;
    this.config = config;
  }

  /**
   * Set default order (applies if no order provided in execute())
   *
   * @example
   * ```ts
   * query.defaultOrder("createdAt:desc")
   * ```
   */
  defaultOrder(
    order: OrderPath<NestedPaths<InferredFields>>
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      defaultOrder: order,
    });
  }

  /**
   * Set default fields to select (applies if no select provided in execute())
   *
   * @example
   * ```ts
   * query.defaultSelect(["id", "name", "email"])
   * ```
   */
  defaultSelect(
    fields: NestedPaths<InferredFields>[]
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      defaultSelect: [...fields],
    });
  }

  /**
   * Fields that are always included in select (even if not in select list)
   *
   * @example
   * ```ts
   * query.include(["id"]) // id is always returned
   * ```
   */
  include(
    fields: NestedPaths<InferredFields>[]
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      include: [...fields],
    });
  }

  /**
   * Fields that are always excluded from select
   *
   * @example
   * ```ts
   * query.exclude(["password", "secretKey"])
   * ```
   */
  exclude(
    fields: NestedPaths<InferredFields>[]
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      exclude: [...fields],
    });
  }

  /**
   * Set maximum allowed limit (throws MaxLimitExceededError if exceeded)
   *
   * @example
   * ```ts
   * query.maxLimit(100) // throws if limit > 100
   * ```
   */
  maxLimit(limit: number): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      maxLimit: limit,
    });
  }

  /**
   * Set default limit (applies if no limit provided in execute())
   *
   * @example
   * ```ts
   * query.defaultLimit(20)
   * ```
   */
  defaultLimit(limit: number): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      defaultLimit: limit,
    });
  }

  /**
   * Set default where conditions (applies if no where provided in execute())
   *
   * @example
   * ```ts
   * query.defaultWhere({ deletedAt: null })
   * ```
   */
  defaultWhere(
    where: NestedWhereInput<InferredFields>
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      defaultWhere: { ...where },
    });
  }

  /**
   * Execute query and return results
   *
   * @example
   * ```ts
   * const results = await query.execute(db, {
   *   where: { status: "active" },
   *   order: ["createdAt:desc"],
   *   limit: 10,
   * });
   * ```
   */
  async execute(
    db: DrizzleExecutor,
    options?: ExecuteOptions<InferredFields>
  ): Promise<Types[]> {
    const resolvedOptions = this.resolveOptions(options);
    const qb = this.getQueryBuilder();

    return qb.query(db, {
      where: resolvedOptions.where as NestedWhereInput<FieldsDef>,
      order: resolvedOptions.order as never,
      select: resolvedOptions.select as never,
      limit: resolvedOptions.limit,
      offset: resolvedOptions.offset,
    });
  }

  /**
   * Get SQL query without executing
   *
   * @example
   * ```ts
   * const sql = query.getSql({ limit: 10 });
   * console.log(sql.toQuery());
   * ```
   */
  getSql(options?: ExecuteOptions<InferredFields>): SQL {
    const resolvedOptions = this.resolveOptions(options);
    const qb = this.getQueryBuilder();

    return qb.buildSelectSql({
      where: resolvedOptions.where as NestedWhereInput<FieldsDef>,
      order: resolvedOptions.order as never,
      select: resolvedOptions.select as never,
      limit: resolvedOptions.limit,
      offset: resolvedOptions.offset,
    });
  }

  /**
   * Get current configuration snapshot
   *
   * @example
   * ```ts
   * const snapshot = query.getSnapshot();
   * console.log(snapshot.config.maxLimit);
   * ```
   */
  getSnapshot(): QuerySnapshot<InferredFields> {
    return {
      tableName: this.tableName,
      fields: Object.keys(this.fieldsDef) as (keyof InferredFields & string)[],
      config: { ...this.config },
    };
  }

  /**
   * Get the fields definition (for internal use and type inference)
   */
  getFieldsDef(): Fields {
    return this.fieldsDef;
  }

  /**
   * Get the table (for internal use)
   */
  getTable(): T {
    return this.table;
  }

  /**
   * Get table name (for internal use)
   */
  getTableName(): string {
    return this.tableName;
  }

  /**
   * Get the underlying ObjectSchema
   */
  getSchema(): ObjectSchema {
    if (!this._schema) {
      this._schema = this.buildSchema();
    }
    return this._schema;
  }

  /**
   * Get the underlying QueryBuilder
   */
  getQueryBuilder(): QueryBuilder<T, string, FieldsDef, Types> {
    if (!this._queryBuilder) {
      const schema = this.getSchema();
      const qbConfig: QueryBuilderConfig = {};
      if (this.config.maxLimit !== undefined) {
        qbConfig.maxLimit = this.config.maxLimit;
      }
      if (this.config.defaultLimit !== undefined) {
        qbConfig.defaultLimit = this.config.defaultLimit;
      }
      this._queryBuilder = new QueryBuilder(
        schema as ObjectSchema<T, string, FieldsDef, Types>,
        qbConfig
      );
    }
    return this._queryBuilder;
  }

  private buildSchema(): ObjectSchema {
    const schemaFields: Record<string, FieldConfig> = {};

    for (const [name, fieldDef] of Object.entries(this.fieldsDef)) {
      const def = fieldDef as FieldDefinition<FluentFieldsDef | undefined>;
      const config: FieldConfig = { column: def.column };

      if (def.join) {
        const joinDef = def.join as JoinDefinition<FluentFieldsDef>;
        const targetBuilder = joinDef.target() as FluentQueryBuilder<Table, FluentFieldsDef>;
        const join: Join = {
          type: joinDef.type,
          schema: () => targetBuilder.getSchema(),
          column: joinDef.column,
        };
        config.join = join;
      }

      schemaFields[name] = config;
    }

    return createSchema({
      table: this.table,
      tableName: this.tableName,
      fields: schemaFields,
    }) as ObjectSchema;
  }

  private resolveOptions(
    options?: ExecuteOptions<InferredFields>
  ): {
    where: Record<string, unknown> | undefined;
    order: string[] | undefined;
    select: string[] | undefined;
    limit: number;
    offset: number;
  } {
    // Resolve limit with validation
    let limit = options?.limit ?? this.config.defaultLimit ?? 20;
    if (this.config.maxLimit !== undefined && limit > this.config.maxLimit) {
      throw new MaxLimitExceededError(limit, this.config.maxLimit);
    }

    // Resolve order
    const order = options?.order
      ? (options.order as string[])
      : this.config.defaultOrder
        ? [this.config.defaultOrder as string]
        : undefined;

    // Resolve select with include/exclude
    let select: string[] | undefined = options?.select
      ? (options.select as string[])
      : this.config.defaultSelect
        ? (this.config.defaultSelect as string[])
        : undefined;

    if (select) {
      // Add included fields
      if (this.config.include) {
        const selectSet = new Set(select);
        for (const field of this.config.include as string[]) {
          selectSet.add(field);
        }
        select = Array.from(selectSet);
      }

      // Remove excluded fields
      if (this.config.exclude) {
        const excludeSet = new Set(this.config.exclude as string[]);
        select = select.filter((f) => !excludeSet.has(f));
      }
    }

    // Resolve where
    const where = options?.where ?? this.config.defaultWhere;

    return {
      where: where as Record<string, unknown> | undefined,
      order,
      select,
      limit,
      offset: options?.offset ?? 0,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Drizzle ORM symbol for accessing table name
 */
const DrizzleTableName = Symbol.for("drizzle:Name");

/**
 * Create a fluent query builder with full type inference
 *
 * @example
 * ```ts
 * import { createQuery, field, leftJoin } from "@shopana/drizzle-gql-toolkit/builder";
 *
 * const addressQuery = createQuery(addresses, {
 *   id: field("id"),
 *   city: field("city"),
 *   country: field("country"),
 * });
 *
 * const usersQuery = createQuery(users, {
 *   id: field("id"),
 *   name: field("name"),
 *   address: field("id", leftJoin(() => addressQuery, "userId")),
 * })
 *   .defaultOrder("id:asc")
 *   .defaultSelect(["id", "name"])
 *   .maxLimit(100)
 *   .defaultLimit(20);
 *
 * // Full autocomplete for select, order, where
 * const result = await usersQuery.execute(db, {
 *   select: ["id", "name", "address.city"],
 *   order: ["name:asc"],
 *   where: { name: "test" },
 * });
 * ```
 */
export function createQuery<
  T extends Table,
  const Fields extends FluentFieldsDef,
>(
  table: T,
  fields: Fields
): FluentQueryBuilder<T, Fields, ToFieldsDef<Fields>, T["$inferSelect"]> {
  // Extract table name from Drizzle table
  const tableAny = table as unknown as Record<symbol, string | undefined>;
  const tableName = tableAny[DrizzleTableName] ?? "unknown";

  return new FluentQueryBuilder(table, tableName, fields);
}
