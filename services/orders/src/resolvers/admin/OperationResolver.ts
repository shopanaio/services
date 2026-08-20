import { GLOBAL_ID_NAMESPACE, GlobalIdEntity, composeGlobalId } from "@shopana/shared-graphql-guid";
import { TypePolicy } from "@shopana/type-resolver";
import { OrderResolver } from "./OrderResolver.js";
import { OrdersType } from "./OrdersType.js";
import { nullableString, numberValue, stringValue, type Row } from "./values.js";

@TypePolicy<OrderOperationResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class OrderOperationResolver extends OrdersType<string, Row> {
  protected async $preload(): Promise<Row> {
    const operation = await this.$ctx.loaders.operation.load(this.$props);
    if (!operation) throw new Error("ORDER_OPERATION_NOT_FOUND");
    return operation;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OrderOperation);
  }
  async kind() {
    return stringValue(await this.$data, "kind");
  }
  async status() {
    return stringValue(await this.$data, "status");
  }
  async order() {
    const id = nullableString(await this.$data, "orderId");
    return id ? new OrderResolver(id, this.$ctx) : null;
  }
  async resourceId() {
    const row = await this.$data;
    const id = nullableString(row, "resourceId");
    return id
      ? composeGlobalId(
          GLOBAL_ID_NAMESPACE,
          nullableString(row, "resourceType") ?? "OrderOperationResource",
          id,
        )
      : null;
  }
  async idempotencyKey() {
    return stringValue(await this.$data, "idempotencyKey");
  }
  async progress() {
    const row = await this.$data;
    const total = numberValue(row, "progressTotal");
    return total > 0 ? Math.round((numberValue(row, "progressCurrent") / total) * 100) : null;
  }
  async failureCode() {
    return nullableString(await this.$data, "failureCode");
  }
  async failureMessage() {
    return nullableString(await this.$data, "failureMessage");
  }
  async retryable() {
    const status = stringValue(await this.$data, "status");
    const code = nullableString(await this.$data, "failureCode") ?? "";
    return status === "FAILED" && /TIMEOUT|UNAVAILABLE|TEMPORAR/.test(code);
  }
  async createdAt() {
    return stringValue(await this.$data, "createdAt");
  }
  async startedAt() {
    return nullableString(await this.$data, "startedAt");
  }
  async completedAt() {
    return nullableString(await this.$data, "completedAt");
  }
}
