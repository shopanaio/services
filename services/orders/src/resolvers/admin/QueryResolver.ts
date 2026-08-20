import { GlobalIdEntity, decodeGlobalIdByType } from "@shopana/shared-graphql-guid";
import { ApolloQuery, TypePolicy } from "@shopana/type-resolver";
import { OrderConnectionResolver, type OrderConnectionInput } from "./ConnectionResolvers.js";
import { OrderEditSessionResolver } from "./EditSessionResolver.js";
import { OrderOperationResolver } from "./OperationResolver.js";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";

@ApolloQuery
export class QueryResolver extends OrdersType<Record<string, never>> {
  ordersQuery() {
    return new OrdersQueryResolver({}, this.$ctx);
  }
}

@TypePolicy<OrdersQueryResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrdersQueryResolver extends OrdersType<Record<string, never>> {
  async order(args: { id: string }) {
    const id = safeDecode(args.id, GlobalIdEntity.Order);
    if (!id || !(await this.$ctx.loaders.order.load(id))) return null;
    return new OrderResolver(id, this.$ctx);
  }
  async orderByNumber(args: { number: string }) {
    const row = await this.$ctx.repository.adminRead.findByNumber(this.$ctx.store.id, args.number);
    return row ? new OrderResolver(String(row.id), this.$ctx) : null;
  }
  orders(args: OrderConnectionInput) {
    return new OrderConnectionResolver(args, this.$ctx);
  }
  async orderEditSession(args: { id: string }) {
    const id = safeDecode(args.id, GlobalIdEntity.OrderEditSession);
    if (!id || !(await this.$ctx.loaders.editSession.load(id))) return null;
    return new OrderEditSessionResolver(id, this.$ctx);
  }
  async orderOperation(args: { id: string }) {
    const id = safeDecode(args.id, GlobalIdEntity.OrderOperation);
    if (!id || !(await this.$ctx.loaders.operation.load(id))) return null;
    return new OrderOperationResolver(id, this.$ctx);
  }
}

function safeDecode(id: string, type: GlobalIdEntity): string | null {
  try {
    return decodeGlobalIdByType(id, type);
  } catch {
    return null;
  }
}
