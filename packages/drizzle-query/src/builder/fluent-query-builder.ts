import type { Column, SQL, Table, View } from "drizzle-orm";

/**
 * SQL.Aliased type for computed view fields
 */
type SQLAliased = SQL.Aliased;
import { createSchema, ObjectSchema, type FieldConfig, type Join } from "../schema.js";
import type {
  DrizzleExecutor,
  FieldsDef,
  LocalLeafPaths,
  NestedPaths,
  NestedWhereInput,
  OrderByItem,
  QueryBuilderConfig,
  Selectable,
} from "../types.js";
import { QueryBuilder } from "./query-builder.js";
import type { FieldDefinition, JoinDefinition, FieldBuilder, JoinFieldDefinition } from "./helpers.js";
import type {
  FluentFieldsDef,
  ToFieldsDef,
  ExecuteOptions,
  CountOptions,
  FluentQueryConfig,
  QuerySnapshot,
  FluentQueryBuilderLike,
} from "./fluent-types.js";
import {
  transformWhereInput,
  type WhereFieldMapper,
  type WhereFieldMapperConfig,
  type WhereFieldMapperScope,
  type WhereFieldMappers,
} from "../where-transform.js";

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
  T extends Selectable,
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
  private _whereMapperScope: WhereFieldMapperScope | null = null;

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
   * query.defaultOrder({ field: "createdAt", orderBy: "desc" })
   * ```
   */
  defaultOrder(
    order: OrderByItem<NestedPaths<InferredFields>>
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
   * Map values for a local leaf field in where filters.
   */
  mapWhereField(
    field: LocalLeafPaths<InferredFields>,
    mapper: WhereFieldMapper | WhereFieldMapperConfig
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      whereFieldMappers: {
        ...this.config.whereFieldMappers,
        [field]: mapper,
      } as WhereFieldMappers<InferredFields>,
    });
  }

  /**
   * Map values for multiple local leaf fields in where filters.
   */
  mapWhereFields(
    mappers: WhereFieldMappers<InferredFields>
  ): FluentQueryBuilder<T, Fields, InferredFields, Types> {
    return new FluentQueryBuilder(this.table, this.tableName, this.fieldsDef, {
      ...this.config,
      whereFieldMappers: {
        ...this.config.whereFieldMappers,
        ...mappers,
      },
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
   * Execute count query and return total number of matching rows.
   * Uses only where filter, no sorting or pagination needed.
   *
   * @example
   * ```ts
   * const total = await query.count(db, {
   *   where: { status: "active" }
   * });
   * ```
   */
  async count(
    db: DrizzleExecutor,
    options?: CountOptions<InferredFields>
  ): Promise<number> {
    const where = options?.where ?? this.config.defaultWhere;
    const mappedWhere = this.mapWhereForExecution(where);
    const qb = this.getQueryBuilder();
    return qb.count(db, { where: mappedWhere as NestedWhereInput<FieldsDef> });
  }

  /**
   * Get count SQL without executing
   *
   * @example
   * ```ts
   * const sql = query.getCountSql({ where: { status: "active" } });
   * console.log(sql.toQuery());
   * ```
   */
  getCountSql(options?: CountOptions<InferredFields>): SQL {
    const where = options?.where ?? this.config.defaultWhere;
    const mappedWhere = this.mapWhereForExecution(where);
    const qb = this.getQueryBuilder();
    return qb.buildCountSql({
      where: mappedWhere as NestedWhereInput<FieldsDef>,
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
   * Get where mapper scope for this builder and joined relation builders.
   *
   * @internal
   */
  getWhereMapperScope(): WhereFieldMapperScope {
    if (!this._whereMapperScope) {
      this._whereMapperScope = this.buildWhereMapperScope();
    }
    return this._whereMapperScope;
  }

  /**
   * Apply configured where field mappers before query execution.
   *
   * @internal
   */
  mapWhereForExecution(
    where: NestedWhereInput<InferredFields> | null | undefined
  ): NestedWhereInput<InferredFields> | null | undefined {
    return transformWhereInput(where, this.getWhereMapperScope());
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
    return this._queryBuilder!;
  }

  private buildSchema(): ObjectSchema {
    const schemaFields: Record<string, FieldConfig> = {};

    for (const [name, fieldDef] of Object.entries(this.fieldsDef)) {
      const def = fieldDef as FieldDefinition<FluentFieldsDef | undefined>;
      const config: FieldConfig = { column: def.column };

      if (def.join) {
        const joinDef = def.join as JoinDefinition<FluentFieldsDef>;
        const targetBuilder = joinDef.target();
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

  private buildWhereMapperScope(): WhereFieldMapperScope {
    const relations: WhereFieldMapperScope["relations"] = {};

    for (const [name, fieldDef] of Object.entries(this.fieldsDef)) {
      const def = fieldDef as FieldDefinition<FluentFieldsDef | undefined>;

      if (def.join) {
        const joinDef = def.join as JoinDefinition<FluentFieldsDef>;
        relations[name] = () => joinDef.target().getWhereMapperScope();
      }
    }

    return {
      mappers: {
        ...(this.config.whereFieldMappers as Record<
          string,
          WhereFieldMapper | WhereFieldMapperConfig
        > | undefined),
      },
      relations,
    };
  }

  private resolveOptions(
    options?: ExecuteOptions<InferredFields>
  ): {
    where: Record<string, unknown> | undefined;
    order: OrderByItem<string>[] | undefined;
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
      ? (options.order as OrderByItem<string>[])
      : this.config.defaultOrder
        ? [this.config.defaultOrder as OrderByItem<string>]
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
    const where = this.mapWhereForExecution(
      options?.where ?? this.config.defaultWhere
    );

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
 * Drizzle ORM symbol for accessing table/view name
 */
const DrizzleTableName = Symbol.for("drizzle:Name");

/**
 * Drizzle ORM symbol for accessing table columns
 */
const DrizzleColumns = Symbol.for("drizzle:Columns");

/**
 * Drizzle ORM symbol for accessing view base config (contains name and selectedFields)
 */
const DrizzleViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");

/**
 * Drizzle ORM symbol for checking if something is a view
 */
const DrizzleIsDrizzleView = Symbol.for("drizzle:IsDrizzleView");

/**
 * Type to infer FluentFieldsDef from a Drizzle table's columns
 */
type InferFieldsFromTable<T extends Table> = {
  [K in keyof T["_"]["columns"] & string]: FieldBuilder;
};

/**
 * Type to infer FieldsDef from a Drizzle table (all columns as `true`)
 */
type InferFieldsDefFromTable<T extends Table> = {
  [K in keyof T["_"]["columns"] & string]: true;
};

/**
 * Type to infer FluentFieldsDef from a Drizzle view's selected fields
 */
type InferFieldsFromView<T extends View> = {
  [K in keyof T["_"]["selectedFields"] & string]: FieldBuilder;
};

/**
 * Type to infer FieldsDef from a Drizzle view (all fields as `true`)
 */
type InferFieldsDefFromView<T extends View> = {
  [K in keyof T["_"]["selectedFields"] & string]: true;
};

/**
 * Create field definitions from table columns
 */
function createFieldsFromTable<T extends Table>(table: T): InferFieldsFromTable<T> {
  const tableAny = table as unknown as Record<symbol, Record<string, { name: string }> | undefined>;
  const columns = tableAny[DrizzleColumns];

  if (!columns) {
    return {} as InferFieldsFromTable<T>;
  }

  const fields: Record<string, FieldBuilder> = {};
  for (const [key, column] of Object.entries(columns)) {
    fields[key] = {
      column: column.name,
      join: undefined,
      leftJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: column.name,
          join: { type: "left", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      innerJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: column.name,
          join: { type: "inner", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      rightJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: column.name,
          join: { type: "right", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      fullJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: column.name,
          join: { type: "full", target: () => target, column: getColumnName(joinColumn) },
        };
      },
    };
  }

  return fields as InferFieldsFromTable<T>;
}

/**
 * Get the column name from a view selected field.
 * Handles both regular Column objects (.name) and SQL.Aliased objects (.fieldAlias)
 */
function getColumnName(field: unknown): string {
  const f = field as { name?: string; fieldAlias?: string };
  // SQL.Aliased has fieldAlias property, Column has name property
  return f.fieldAlias ?? f.name ?? "unknown";
}

/**
 * View base config structure from Drizzle ORM
 */
interface ViewBaseConfig {
  name: string;
  originalName: string;
  schema?: string;
  selectedFields: Record<string, unknown>;
  query?: unknown;
  isExisting?: boolean;
  isAlias?: boolean;
}

/**
 * Create field definitions from view selected fields
 */
function createFieldsFromView<T extends View>(view: T): InferFieldsFromView<T> {
  const viewAny = view as unknown as Record<symbol, ViewBaseConfig | undefined>;
  const config = viewAny[DrizzleViewBaseConfig];

  if (!config || !config.selectedFields) {
    return {} as InferFieldsFromView<T>;
  }

  const selectedFields = config.selectedFields;

  const fields: Record<string, FieldBuilder> = {};
  for (const [key, column] of Object.entries(selectedFields)) {
    const columnName = getColumnName(column);
    fields[key] = {
      column: columnName,
      join: undefined,
      leftJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: columnName,
          join: { type: "left", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      innerJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: columnName,
          join: { type: "inner", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      rightJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: columnName,
          join: { type: "right", target: () => target, column: getColumnName(joinColumn) },
        };
      },
      fullJoin<TFields extends FluentFieldsDef>(
        target: FluentQueryBuilderLike<TFields>,
        joinColumn: Column | SQLAliased
      ): JoinFieldDefinition<TFields> {
        return {
          column: columnName,
          join: { type: "full", target: () => target, column: getColumnName(joinColumn) },
        };
      },
    };
  }

  return fields as InferFieldsFromView<T>;
}

/**
 * Check if a Selectable is a View (has IsDrizzleView symbol or ViewBaseConfig)
 */
function isView(tableOrView: Selectable): tableOrView is View {
  const asRecord = tableOrView as unknown as Record<symbol, unknown>;
  // Check for IsDrizzleView symbol first, then fall back to ViewBaseConfig
  return (
    (DrizzleIsDrizzleView in asRecord && asRecord[DrizzleIsDrizzleView] === true) ||
    (DrizzleViewBaseConfig in asRecord && asRecord[DrizzleViewBaseConfig] !== undefined)
  );
}

/**
 * Get the name of a table or view
 */
function getTableOrViewName(tableOrView: Selectable): string {
  const asRecord = tableOrView as unknown as Record<symbol, unknown>;

  // For views, get name from ViewBaseConfig
  if (isView(tableOrView)) {
    const config = asRecord[DrizzleViewBaseConfig] as ViewBaseConfig | undefined;
    if (config?.name) {
      return config.name;
    }
  }

  // For tables, use DrizzleTableName
  const tableName = asRecord[DrizzleTableName] as string | undefined;
  return tableName ?? "unknown";
}

/**
 * Create a fluent query builder with all table columns
 *
 * @example
 * ```ts
 * // Use all columns from the table automatically
 * const usersQuery = createQuery(users);
 *
 * // Equivalent to:
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   name: field(users.name),
 *   email: field(users.email),
 *   // ... all columns
 * });
 * ```
 */
export function createQuery<T extends Table>(
  table: T
): FluentQueryBuilder<T, InferFieldsFromTable<T>, InferFieldsDefFromTable<T>, T["$inferSelect"]>;

/**
 * Create a fluent query builder with all view selected fields
 *
 * @example
 * ```ts
 * // Use all selected fields from the view automatically
 * const userStatsQuery = createQuery(userStatsView);
 *
 * // Equivalent to:
 * const userStatsQuery = createQuery(userStatsView, {
 *   userId: field(userStatsView.userId),
 *   totalOrders: field(userStatsView.totalOrders),
 *   // ... all selected fields
 * });
 * ```
 */
export function createQuery<T extends View>(
  view: T
): FluentQueryBuilder<T, InferFieldsFromView<T>, InferFieldsDefFromView<T>, T["$inferSelect"]>;

/**
 * Create a fluent query builder with custom field definitions
 *
 * @example
 * ```ts
 * const usersQuery = createQuery(users, {
 *   id: field(users.id),
 *   name: field(users.name),
 *   address: field(users.id).leftJoin(addressQuery, addresses.userId),
 * });
 * ```
 */
export function createQuery<
  T extends Selectable,
  const Fields extends FluentFieldsDef,
>(
  table: T,
  fields: Fields
): FluentQueryBuilder<T, Fields, ToFieldsDef<Fields>, T["$inferSelect"]>;

export function createQuery<
  T extends Selectable,
  const Fields extends FluentFieldsDef,
>(
  table: T,
  fields?: Fields
): FluentQueryBuilder<
  T,
  Fields | InferFieldsFromTable<T & Table> | InferFieldsFromView<T & View>,
  ToFieldsDef<Fields> | InferFieldsDefFromTable<T & Table> | InferFieldsDefFromView<T & View>,
  T["$inferSelect"]
> {
  // Extract table/view name from Drizzle
  const tableName = getTableOrViewName(table);

  // If fields not provided, create from table columns or view selected fields
  let resolvedFields: FluentFieldsDef;
  if (fields) {
    resolvedFields = fields;
  } else if (isView(table)) {
    resolvedFields = createFieldsFromView(table);
  } else {
    resolvedFields = createFieldsFromTable(table as unknown as Table);
  }

  return new FluentQueryBuilder(
    table,
    tableName,
    resolvedFields as Fields | InferFieldsFromTable<T & Table> | InferFieldsFromView<T & View>
  ) as FluentQueryBuilder<
    T,
    Fields | InferFieldsFromTable<T & Table> | InferFieldsFromView<T & View>,
    ToFieldsDef<Fields> | InferFieldsDefFromTable<T & Table> | InferFieldsDefFromView<T & View>,
    T["$inferSelect"]
  >;
}
