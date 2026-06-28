import type { StockRelayInput } from "../../repositories/stock/StockRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

/**
 * StockConnection - resolves paginated stock list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class StockConnectionResolver extends BaseConnectionResolver<StockRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.stock.getConnection(this.$props);
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.stock(nodeId);
  }
}
