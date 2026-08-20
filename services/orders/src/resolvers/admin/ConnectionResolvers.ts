import { TypePolicy } from "@shopana/type-resolver";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import type {
  AdminOrderListInput,
  AdminOrderListRow,
} from "../../repositories/admin/AdminOrderReadRepository.js";

export type OrderConnectionInput = Readonly<{
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: Record<string, unknown> | null;
  orderBy?: readonly Record<string, unknown>[] | null;
}>;

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
    const backward = this.$props.last != null;
    const size = Math.min(Math.max(this.$props.first ?? this.$props.last ?? 20, 1), 100);
    const cursor = decodeCursor(this.$props.after ?? this.$props.before ?? null);
    const where = this.$props.where ?? {};
    const order = this.$props.orderBy?.[0];
    const direction = String(order?.direction ?? "DESC");
    const field = String(order?.field ?? "CREATED_AT");
    let sort: AdminOrderListInput["sort"] = `${field === "UPDATED_AT" ? "UPDATED_AT" : "CREATED_AT"}_${direction === "ASC" ? "ASC" : "DESC"}`;
    if (backward)
      sort = sort?.endsWith("_ASC")
        ? (sort.replace("_ASC", "_DESC") as typeof sort)
        : (sort?.replace("_DESC", "_ASC") as typeof sort);
    const filter = mapWhere(where);
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
      cursor: encodeCursor(node, field),
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

function mapWhere(
  where: Record<string, unknown>,
): Omit<AdminOrderListInput, "storeId" | "first" | "after" | "sort"> {
  const status = asFilter(where.status);
  const payment = asFilter(where.paymentStatus);
  const fulfillment = asFilter(where.fulfillmentStatus);
  const archived = typeof where.archived === "boolean" ? where.archived : undefined;
  const customer = asFilter(where.customerId);
  const query = typeof where.query === "string" ? where.query : undefined;
  return {
    ...(status.length ? { statuses: status as AdminOrderListInput["statuses"] } : {}),
    ...(payment.length ? { paymentStatuses: payment } : {}),
    ...(fulfillment.length ? { fulfillmentStatuses: fulfillment } : {}),
    ...(archived !== undefined ? { archived } : {}),
    ...(typeof customer[0] === "string" ? { customerId: customer[0] } : {}),
    ...(query ? { query } : {}),
  };
}

function asFilter(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const filter = value as Record<string, unknown>;
  if (Array.isArray(filter.in)) return filter.in.map(String);
  return filter.eq == null ? [] : [String(filter.eq)];
}

function encodeCursor(row: AdminOrderListRow, field: string): string {
  const at = field === "UPDATED_AT" ? row.updatedAt : row.createdAt;
  return Buffer.from(JSON.stringify({ at, id: row.id }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null): { at: string; id: string } | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    return typeof value.at === "string" && typeof value.id === "string"
      ? { at: value.at, id: value.id }
      : null;
  } catch {
    throw new Error("ORDER_CURSOR_INVALID");
  }
}
