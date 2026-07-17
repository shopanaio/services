import {
  decodeGlobalId,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import type {
  DiscountCodeRelayInput,
  DiscountConnectionInput,
  DiscountExternalReferenceRelayInput,
  DiscountRedemptionRelayInput,
  DiscountUsageReservationRelayInput,
} from "../../repositories/DiscountRepository.js";
import {
  DiscountCodeConnectionResolver,
  DiscountConnectionResolver,
  DiscountExternalReferenceConnectionResolver,
  DiscountRedemptionConnectionResolver,
  DiscountUsageReservationConnectionResolver,
} from "./DiscountConnectionResolver.js";
import { PricingType } from "./PricingType.js";

@ApolloQuery
export class QueryResolver extends PricingType<Record<string, never>> {
  pricingQuery() {
    return this.resolvers.pricingQuery();
  }
}

export class PricingQueryResolver extends PricingType<Record<string, never>> {
  async node(args: { id: string }): Promise<unknown | null> {
    let typeName: string;
    try {
      typeName = decodeGlobalId(args.id).typeName;
    } catch {
      return null;
    }

    const id = this.safeDecodeId(args.id, typeName as GlobalIdType);
    if (!id) return null;

    switch (typeName) {
      case GlobalIdEntity.Discount:
        return (await this.$ctx.loaders.discount.load(id))
          ? this.resolvers.discount(id)
          : null;
      case GlobalIdEntity.DiscountCode:
        return (await this.$ctx.loaders.discountCode.load(id))
          ? this.resolvers.discountCode(id)
          : null;
      case GlobalIdEntity.DiscountUsageReservation:
        return (await this.$ctx.loaders.discountUsageReservation.load(id))
          ? this.resolvers.discountUsageReservation(id)
          : null;
      case GlobalIdEntity.DiscountRedemption:
        return (await this.$ctx.loaders.discountRedemption.load(id))
          ? this.resolvers.discountRedemption(id)
          : null;
      case GlobalIdEntity.DiscountRedemptionAllocation:
        return (await this.$ctx.loaders.discountRedemptionAllocation.load(id))
          ? this.resolvers.discountRedemptionAllocation(id)
          : null;
      case GlobalIdEntity.DiscountExternalReference:
        return (await this.$ctx.loaders.discountExternalReference.load(id))
          ? this.resolvers.discountExternalReference(id)
          : null;
      default:
        return null;
    }
  }

  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async discount(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.Discount);
    return (await this.$ctx.loaders.discount.load(id))
      ? this.resolvers.discount(id)
      : null;
  }

  discounts(args: DiscountConnectionInput) {
    return new DiscountConnectionResolver(args, this.$ctx);
  }

  async discountCode(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.DiscountCode);
    return (await this.$ctx.loaders.discountCode.load(id))
      ? this.resolvers.discountCode(id)
      : null;
  }

  discountCodes(args: DiscountCodeRelayInput) {
    return new DiscountCodeConnectionResolver(args, this.$ctx);
  }

  async discountUsageReservation(args: { id: string }) {
    const id = this.decodeId(
      args.id,
      GlobalIdEntity.DiscountUsageReservation,
    );
    return (await this.$ctx.loaders.discountUsageReservation.load(id))
      ? this.resolvers.discountUsageReservation(id)
      : null;
  }

  discountUsageReservations(args: DiscountUsageReservationRelayInput) {
    return new DiscountUsageReservationConnectionResolver(args, this.$ctx);
  }

  async discountRedemption(args: { id: string }) {
    const id = this.decodeId(args.id, GlobalIdEntity.DiscountRedemption);
    return (await this.$ctx.loaders.discountRedemption.load(id))
      ? this.resolvers.discountRedemption(id)
      : null;
  }

  discountRedemptions(args: DiscountRedemptionRelayInput) {
    return new DiscountRedemptionConnectionResolver(args, this.$ctx);
  }

  async discountRedemptionAllocation(args: { id: string }) {
    const id = this.decodeId(
      args.id,
      GlobalIdEntity.DiscountRedemptionAllocation,
    );
    return (await this.$ctx.loaders.discountRedemptionAllocation.load(id))
      ? this.resolvers.discountRedemptionAllocation(id)
      : null;
  }

  async discountExternalReference(args: { id: string }) {
    const id = this.decodeId(
      args.id,
      GlobalIdEntity.DiscountExternalReference,
    );
    return (await this.$ctx.loaders.discountExternalReference.load(id))
      ? this.resolvers.discountExternalReference(id)
      : null;
  }

  discountExternalReferences(args: DiscountExternalReferenceRelayInput) {
    return new DiscountExternalReferenceConnectionResolver(args, this.$ctx);
  }

  private safeDecodeId(
    globalId: string,
    expectedType: GlobalIdType,
  ): string | null {
    try {
      return this.decodeId(globalId, expectedType);
    } catch {
      return null;
    }
  }
}
