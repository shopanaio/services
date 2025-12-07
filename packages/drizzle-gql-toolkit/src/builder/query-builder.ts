import type { Table } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { ObjectSchema, type JoinInfo } from "../schema.js";
import type {
  FieldsDef,
  NestedPaths,
  NestedWhereInput,
  OrderPath,
  DrizzleExecutor,
  QueryBuilderConfig,
  ResolvePathType,
  InferSelectResultFlat,
} from "../types.js";
import { JoinCollector } from "./join-collector.js";
import { OrderBuilder } from "./order-builder.js";
import { SqlRenderer } from "./sql-renderer.js";
import { WhereBuilder, type WhereResult } from "./where-builder.js";

type ResolvedConfig = {
  maxLimit: number;
  defaultLimit: number;
  maxJoinDepth: number;
  debug: boolean;
  logger: ((message: string, data?: unknown) => void) | undefined;
};

const DEFAULT_CONFIG: ResolvedConfig = {
  maxLimit: 100,
  defaultLimit: 20,
  maxJoinDepth: 5,
  debug: false,
  logger: undefined,
};

export type TypedInput<Fields extends FieldsDef> = {
  offset?: number;
  limit?: number;
  order?: OrderPath<NestedPaths<Fields>>[];
  select?: NestedPaths<Fields>[];
  where?: NestedWhereInput<Fields>;
};

type PaginationResult = {
  limit: number;
  offset: number;
};

type QueryComponents = {
  where: SQL | undefined;
  orderSql: SQL | undefined;
  joins: JoinInfo[];
  pagination: PaginationResult;
  joinCollector: JoinCollector;
};

export class QueryBuilder<
  T extends Table,
  F extends string = string,
  Fields extends FieldsDef = FieldsDef,
  Types = T["$inferSelect"],
> {
  private readonly config: ResolvedConfig;

  constructor(
    private readonly schema: ObjectSchema<T, F, Fields, Types>,
    config?: QueryBuilderConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  where(input: NestedWhereInput<Fields> | undefined | null): WhereResult {
    const joinCollector = this.createJoinCollector();
    const builder = new WhereBuilder(
      this.schema,
      joinCollector,
      this.config.maxJoinDepth
    );
    return builder.build(input);
  }

  fromInput(input: TypedInput<Fields> | undefined | null): {
    where: SQL | undefined;
    joins: JoinInfo[];
    limit: number;
    offset: number;
    orderSql: SQL | undefined;
  } {
    const components = this.buildQueryComponents(input);
    return {
      where: components.where,
      joins: components.joins,
      limit: components.pagination.limit,
      offset: components.pagination.offset,
      orderSql: components.orderSql,
    };
  }

  buildSelectSql(input: TypedInput<Fields> | undefined | null): SQL {
    const { sql } = this.buildRawQuery(input);
    return sql;
  }

  /**
   * Execute query and return results with full table type.
   * Use querySelect() for typed results based on select fields.
   */
  async query(
    db: DrizzleExecutor,
    input?: TypedInput<Fields> | null
  ): Promise<Types[]> {
    const { sql } = this.buildRawQuery(input);
    this.log("executingQuery", { input });
    const result = await db.execute(sql);
    if (Array.isArray(result)) {
      return result as Types[];
    }
    if (result && typeof result === "object" && "rows" in result) {
      return (result as { rows: Types[] }).rows;
    }
    return [];
  }

  /**
   * Execute query with typed result based on select fields.
   * Returns only the selected fields with proper types.
   *
   * @example
   * ```ts
   * const result = await qb.querySelect(db, {
   *   select: ["id", "items.product.title"] as const,
   *   where: { status: "active" }
   * });
   * // result type: { id: string; title: string }[]
   * ```
   */
  async querySelect<const Select extends readonly NestedPaths<Fields>[]>(
    db: DrizzleExecutor,
    input: Omit<TypedInput<Fields>, "select"> & { select: Select }
  ): Promise<InferSelectResultFlat<Types, Select>[]> {
    const { sql } = this.buildRawQuery(input as unknown as TypedInput<Fields>);
    this.log("executingQuery", { input });
    const result = await db.execute(sql);
    if (Array.isArray(result)) {
      return result as InferSelectResultFlat<Types, Select>[];
    }
    if (result && typeof result === "object" && "rows" in result) {
      return (result as { rows: InferSelectResultFlat<Types, Select>[] }).rows;
    }
    return [];
  }

  private buildRawQuery(input: TypedInput<Fields> | undefined | null): {
    sql: SQL;
    where: SQL | undefined;
    joins: JoinInfo[];
    limit: number;
    offset: number;
  } {
    const components = this.buildQueryComponents(input);
    const renderer = new SqlRenderer(this.schema, components.joinCollector);

    const sqlQuery = renderer.render({
      select: input?.select as string[] | undefined,
      orderSql: components.orderSql,
      whereSql: components.where,
      limit: components.pagination.limit,
      offset: components.pagination.offset,
    });
    this.log("rawSqlBuilt", sqlQuery);

    return {
      sql: sqlQuery,
      where: components.where,
      joins: components.joins,
      limit: components.pagination.limit,
      offset: components.pagination.offset,
    };
  }

  private buildQueryComponents(
    input: TypedInput<Fields> | undefined | null
  ): QueryComponents {
    const joinCollector = this.createJoinCollector();
    const whereBuilder = new WhereBuilder(
      this.schema,
      joinCollector,
      this.config.maxJoinDepth
    );
    const whereResult = whereBuilder.build(input?.where);

    const orderBuilder = new OrderBuilder(
      this.schema,
      joinCollector,
      this.config.maxJoinDepth
    );
    const orderSql = orderBuilder.build(input?.order);

    if (input?.select) {
      for (const field of input.select as string[]) {
        joinCollector.collectJoinsForFieldPath(
          field,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.schema as any,
          0,
          this.config.maxJoinDepth
        );
      }
    }

    const pagination = this.resolvePagination({
      limit: input?.limit,
      offset: input?.offset,
    });

    this.log("componentsBuilt", {
      hasWhere: Boolean(whereResult.sql),
      joins: joinCollector.getJoins().length,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      where: whereResult.sql,
      orderSql,
      joins: joinCollector.getJoins(),
      pagination,
      joinCollector,
    };
  }

  pagination(input: { limit?: number; offset?: number } | undefined | null): PaginationResult {
    return this.resolvePagination(input ?? {});
  }

  private resolvePagination(input: { limit?: number; offset?: number }): PaginationResult {
    const limit = Math.min(
      input.limit ?? this.config.defaultLimit,
      this.config.maxLimit
    );
    return {
      limit,
      offset: Math.max(0, input.offset ?? 0),
    };
  }

  private createJoinCollector(): JoinCollector {
    return new JoinCollector(this.schema.table);
  }

  private log(event: string, data?: unknown): void {
    if (!this.config.debug) {
      return;
    }
    const logger = this.config.logger ?? console.log;
    logger(`[QueryBuilder] ${event}`, data);
  }
}
