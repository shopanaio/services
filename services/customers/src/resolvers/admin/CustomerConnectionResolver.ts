import type { CustomerRelayInput } from "../../repositories/customer/CustomerRepository.js";
import { CustomersType } from "./CustomersType.js";
import { CustomerResolver } from "./CustomerResolver.js";

export type CustomerConnectionInput = CustomerRelayInput;

/**
 * Customer connection resolver - handles Relay-style pagination
 */
export class CustomerConnectionResolver extends CustomersType<
  CustomerConnectionInput,
  {
    edges: Array<{ cursor: string; nodeId: string }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  }
> {
  static fields = {
    edges: () => CustomerEdgeResolver,
  };

  async loadData() {
    const services = this.ctx.kernel.getServices();
    return services.repository.customer.getConnection(this.value);
  }

  async edges() {
    const data = await this.getData();
    return data.edges;
  }

  async pageInfo() {
    const data = await this.getData();
    return data.pageInfo;
  }

  async totalCount() {
    const data = await this.getData();
    return data.totalCount;
  }
}

/**
 * Customer edge resolver
 */
export class CustomerEdgeResolver extends CustomersType<
  { cursor: string; nodeId: string },
  { cursor: string; nodeId: string }
> {
  static fields = {
    node: () => CustomerResolver,
  };

  async loadData() {
    return this.value;
  }

  async cursor() {
    return this.value.cursor;
  }

  async node() {
    return this.value.nodeId;
  }
}
