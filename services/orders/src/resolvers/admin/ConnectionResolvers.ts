import { TypePolicy } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseAdminOrderWhere } from "../../application/admin/AdminOrderBulkSelection.js";
import type { AdminOrderBulkPredicate } from "../../application/admin/AdminOrderBulkSelection.js";
import { ApiOrderWhereInputSchema } from "../../interfaces/gql-admin-api/schemas.js";
import type { ApiOrdersQueryOrdersArgs } from "../../interfaces/gql-admin-api/types.js";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import type {
  AdminOrderListInput,
  AdminOrderListRow,
} from "../../repositories/admin/AdminOrderReadRepository.js";

export type OrderConnectionInput = ApiOrdersQueryOrdersArgs;

@TypePolicy<OrderConnectionResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrderConnectionResolver extends OrdersType<OrderConnectionInput> {
  private result?: Promise<{
    nodes: readonly AdminOrderListRow[];
    edges: readonly { cursor: string; node: OrderResolver }[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  }>;

  edges() {
    return this.load().then((result) => result.edges);
  }
  nodes() {
    return this.load().then((result) =>
      result.nodes.map((row) => new OrderResolver(row.id, this.$ctx)),
    );
  }
  pageInfo() {
    return this.load().then((result) => result.pageInfo);
  }
  totalCount() {
    return this.load().then((result) => result.totalCount);
  }

  private load() {
    this.result ??= this.execute();
    return this.result;
  }

  private async execute() {
    if (this.$props.first != null && this.$props.last != null) {
      throw new GraphQLError("Use either first or last, not both", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if ((this.$props.first ?? this.$props.last ?? 1) <= 0) {
      throw new GraphQLError("Connection page size must be positive", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    if (
      (this.$props.first != null && this.$props.before != null) ||
      (this.$props.last != null && this.$props.after != null)
    ) {
      throw new GraphQLError("Cursor direction does not match pagination direction", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    const backward = this.$props.last != null;
    const size = Math.min(Math.max(this.$props.first ?? this.$props.last ?? 20, 1), 100);
    const cursor = decodeCursor(this.$props.after ?? this.$props.before ?? null);
    const where = this.$props.where ?? {};
    const order = this.$props.orderBy?.[0];
    const direction = String(order?.direction ?? "DESC");
    const field = String(order?.field ?? "CREATED_AT");
    if (field === "CUSTOMER_NAME" || containsPiiFilter(where as Record<string, unknown>)) {
      const allowed = await this.authProvider.authorize({
        organizationId: this.$ctx.store.organizationId,
        domain: `store:${this.$ctx.store.id}`,
        resource: "store.data",
        action: "admin",
      });
      if (!allowed) {
        throw new GraphQLError("PII filters and sorting require elevated access", {
          extensions: { code: "FORBIDDEN" },
        });
      }
    }
    let sort: AdminOrderListInput["sort"] = `${field}_${
      direction === "ASC" ? "ASC" : "DESC"
    }` as AdminOrderListInput["sort"];
    if (backward)
      sort = sort?.endsWith("_ASC")
        ? (sort.replace("_ASC", "_DESC") as typeof sort)
        : (sort?.replace("_DESC", "_ASC") as typeof sort);
    const filter = mapWhere(where as Record<string, unknown>);
    const request: AdminOrderListInput = {
      storeId: this.$ctx.store.id,
      first: size,
      ...(cursor ? { after: cursor } : {}),
      ...filter,
      sort,
    };
    const [page, totalCount] = await Promise.all([
      this.$ctx.repository.adminRead.list(request),
      this.$ctx.repository.adminRead.count({ storeId: request.storeId, ...filter }),
    ]);
    const nodes = backward ? [...page.nodes].reverse() : page.nodes;
    const edges = nodes.map((node) => ({
      cursor: encodeCursor(node),
      node: new OrderResolver(node.id, this.$ctx),
    }));
    return {
      nodes,
      edges,
      totalCount,
      pageInfo: {
        hasNextPage: backward ? Boolean(this.$props.before) : page.hasNextPage,
        hasPreviousPage: backward ? page.hasNextPage : Boolean(this.$props.after),
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
    };
  }
}

function containsPiiFilter(where: Record<string, unknown>): boolean {
  if (
    ["customerName", "customerEmail", "customerPhone"].some(
      (field) => where[field] !== null && where[field] !== undefined,
    )
  ) {
    return true;
  }
  return ["and", "or"].some(
    (operator) =>
      Array.isArray(where[operator]) &&
      where[operator].some(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          containsPiiFilter(item as Record<string, unknown>),
      ),
  );
}

function mapWhere(
  rawWhere: Record<string, unknown>,
): Pick<AdminOrderListInput, "archived" | "predicate"> {
  const parsed = ApiOrderWhereInputSchema().parse(rawWhere) as Record<string, unknown>;
  const archived =
    typeof parsed.archived === "boolean"
      ? parsed.archived
      : containsArchivedFilter(parsed)
        ? null
        : false;
  const where = decodeWhereIds({ ...parsed });
  delete where.archived;
  const predicate: AdminOrderBulkPredicate | undefined = Object.keys(where).length
    ? parseAdminOrderWhere(where)
    : undefined;
  return { archived, ...(predicate ? { predicate } : {}) };
}

function containsArchivedFilter(where: Record<string, unknown>): boolean {
  if (typeof where.archived === "boolean") return true;
  return ["and", "or"].some(
    (operator) =>
      Array.isArray(where[operator]) &&
      where[operator].some(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          containsArchivedFilter(item as Record<string, unknown>),
      ),
  );
}

function decodeWhereIds(where: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["and", "or"] as const) {
    if (Array.isArray(where[key])) {
      where[key] = where[key].map((item) =>
        decodeWhereIds({ ...(item as Record<string, unknown>) }),
      );
    }
  }
  decodeIdFilter(where, "id", GlobalIdEntity.Order);
  decodeIdFilter(where, "customerId", GlobalIdEntity.Customer);
  return where;
}

function decodeIdFilter(
  where: Record<string, unknown>,
  field: string,
  type: GlobalIdEntity,
): void {
  const value = where[field];
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const filter = { ...(value as Record<string, unknown>) };
  if (typeof filter.eq === "string") filter.eq = decodeGlobalIdByType(filter.eq, type);
  for (const operator of ["in", "notIn"] as const) {
    if (Array.isArray(filter[operator])) {
      filter[operator] = filter[operator].map((id) => decodeGlobalIdByType(String(id), type));
    }
  }
  where[field] = filter;
}

function encodeCursor(row: AdminOrderListRow): string {
  return Buffer.from(
    JSON.stringify({ orderId: encodeGlobalIdByType(row.id, GlobalIdEntity.Order) }),
    "utf8",
  ).toString("base64url");
}

function decodeCursor(cursor: string | null): { id: string } | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    if (typeof value.orderId !== "string") throw new Error("ORDER_CURSOR_INVALID");
    const id = decodeGlobalIdByType(value.orderId, GlobalIdEntity.Order);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      throw new Error("ORDER_CURSOR_INVALID");
    }
    return { id };
  } catch {
    throw new Error("ORDER_CURSOR_INVALID");
  }
}
