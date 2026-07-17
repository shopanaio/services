import type {
  DiscountConnectionInput,
  DiscountConnectionResult,
} from "../../repositories/DiscountRepository.js";
import { PricingType } from "./PricingType.js";

export class DiscountConnectionResolver extends PricingType<
  DiscountConnectionInput,
  DiscountConnectionResult
> {
  $preload(): Promise<DiscountConnectionResult> {
    return this.$ctx.kernel.repository.discount.getConnection(this.$props);
  }

  async edges() {
    const edges = await this.$get("edges");
    return Promise.all(
      (edges ?? []).map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.resolvers.discount(edge.nodeId),
      })),
    );
  }

  pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
