import type {
  DiscountCodeRelayInput,
  DiscountConnectionInput,
  DiscountConnectionResult,
  DiscountExternalReferenceRelayInput,
  DiscountRedemptionRelayInput,
  DiscountUsageReservationRelayInput,
} from "../../repositories/DiscountRepository.js";
import { PricingType } from "./PricingType.js";

abstract class BaseConnectionResolver<
  TInput,
> extends PricingType<TInput, DiscountConnectionResult> {
  abstract $preload(): Promise<DiscountConnectionResult>;

  protected abstract createNodeResolver(
    nodeId: string,
  ): unknown | Promise<unknown>;

  async edges() {
    const edges = await this.$get("edges");
    return Promise.all(
      (edges ?? []).map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.createNodeResolver(edge.nodeId),
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

export class DiscountConnectionResolver extends BaseConnectionResolver<DiscountConnectionInput> {
  $preload(): Promise<DiscountConnectionResult> {
    return this.$ctx.kernel.repository.discount.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.discount(nodeId);
  }
}

export type DiscountCodeConnectionInput = DiscountCodeRelayInput & {
  discountId?: string;
};

export class DiscountCodeConnectionResolver extends BaseConnectionResolver<DiscountCodeConnectionInput> {
  $preload(): Promise<DiscountConnectionResult> {
    const { discountId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.discount.getCodeConnection({
      ...args,
      where: discountId
        ? {
            _and: [
              { discountId: { _eq: discountId } },
              ...(where ? [where] : []),
            ],
          }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.discountCode(nodeId);
  }
}

export type DiscountUsageReservationConnectionInput =
  DiscountUsageReservationRelayInput & { discountId?: string };

export class DiscountUsageReservationConnectionResolver extends BaseConnectionResolver<DiscountUsageReservationConnectionInput> {
  $preload(): Promise<DiscountConnectionResult> {
    const { discountId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.discount.getUsageReservationConnection({
      ...args,
      where: discountId
        ? {
            _and: [
              { discountId: { _eq: discountId } },
              ...(where ? [where] : []),
            ],
          }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.discountUsageReservation(nodeId);
  }
}

export type DiscountRedemptionConnectionInput =
  DiscountRedemptionRelayInput & { discountId?: string };

export class DiscountRedemptionConnectionResolver extends BaseConnectionResolver<DiscountRedemptionConnectionInput> {
  $preload(): Promise<DiscountConnectionResult> {
    const { discountId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.discount.getRedemptionConnection({
      ...args,
      where: discountId
        ? {
            _and: [
              { discountId: { _eq: discountId } },
              ...(where ? [where] : []),
            ],
          }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.discountRedemption(nodeId);
  }
}

export type DiscountExternalReferenceConnectionInput =
  DiscountExternalReferenceRelayInput & { discountId?: string };

export class DiscountExternalReferenceConnectionResolver extends BaseConnectionResolver<DiscountExternalReferenceConnectionInput> {
  $preload(): Promise<DiscountConnectionResult> {
    const { discountId, where, ...args } = this.$props;
    return this.$ctx.kernel.repository.discount.getExternalReferenceConnection({
      ...args,
      where: discountId
        ? {
            _and: [
              { discountId: { _eq: discountId } },
              ...(where ? [where] : []),
            ],
          }
        : where,
    });
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.discountExternalReference(nodeId);
  }
}
