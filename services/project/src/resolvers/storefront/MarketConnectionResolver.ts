import type { MarketRelayInput } from "../../repositories/market/MarketRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type MarketConnectionInput = Pick<
  MarketRelayInput,
  "first" | "after" | "last" | "before"
> & { storeId: string };

export class MarketConnectionResolver extends BaseConnectionResolver<MarketConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { storeId, ...args } = this.$props;
    return this.$ctx.kernel.repository.market.getConnection(storeId, args);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.market(nodeId);
  }

  async nodes() {
    const edges = await this.$get("edges");
    return Promise.all(edges.map(({ nodeId }) => this.createNodeResolver(nodeId)));
  }
}
