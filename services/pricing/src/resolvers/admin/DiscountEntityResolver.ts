import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  DiscountCodeListView,
  DiscountExternalReference,
  DiscountRedemption,
  DiscountRedemptionAllocation,
  DiscountUsageReservation,
} from "../../repositories/models/index.js";
import { PricingType } from "./PricingType.js";
import { customerReference, toGraphqlBigInt } from "./references.js";

@SubgraphReference()
export class DiscountCodeResolver extends PricingType<string, DiscountCodeListView> {
  async $preload() {
    const code = await this.$ctx.loaders.discountCode.load(this.$props);
    if (!code) {
      throw new PreloadNotFoundError(`Discount code with ID ${this.$props} not found`);
    }
    return code;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.DiscountCode);
  }
  async discount() {
    return this.resolvers.discount(await this.$get("discountId"));
  }
  code() {
    return this.$get("code");
  }
  async normalizedCode() {
    const normalized = await this.$get("normalizedCode");
    return normalized ?? (await this.$get("code")).trim().toUpperCase();
  }
  status() {
    return this.$get("status");
  }
  async usageLimit() {
    return toGraphqlBigInt(await this.$get("usageLimit"));
  }
  async reservedCount() {
    return toGraphqlBigInt(await this.$get("reservedCount"));
  }
  async committedCount() {
    return toGraphqlBigInt(await this.$get("committedCount"));
  }
  async reversedCount() {
    return toGraphqlBigInt(await this.$get("reversedCount"));
  }
  async usageCount() {
    return toGraphqlBigInt(await this.$get("usageCount"));
  }
  async remainingCount() {
    return toGraphqlBigInt(await this.$get("remainingCount"));
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  disabledAt() {
    return this.$get("disabledAt");
  }
}

@SubgraphReference()
export class DiscountUsageReservationResolver extends PricingType<
  string,
  DiscountUsageReservation
> {
  async $preload() {
    const reservation = await this.$ctx.loaders.discountUsageReservation.load(this.$props);
    if (!reservation) {
      throw new PreloadNotFoundError(`Discount usage reservation with ID ${this.$props} not found`);
    }
    return reservation;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.DiscountUsageReservation);
  }
  async discount() {
    return this.resolvers.discount(await this.$get("discountId"));
  }
  async discountCode() {
    const codeId = await this.$get("codeId");
    return codeId ? this.resolvers.discountCode(codeId) : null;
  }
  async customerId() {
    const customerId = await this.$get("customerId");
    return customerId ? encodeGlobalIdByType(customerId, GlobalIdEntity.Customer) : null;
  }
  async customer() {
    const customerId = await this.$get("customerId");
    return customerId ? customerReference(customerId) : null;
  }
  async checkoutId() {
    return encodeGlobalIdByType(await this.$get("checkoutId"), GlobalIdEntity.Checkout);
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  status() {
    return this.$get("status");
  }
  expiresAt() {
    return this.$get("expiresAt");
  }
  committedAt() {
    return this.$get("committedAt");
  }
  closedAt() {
    return this.$get("closedAt");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
}

@SubgraphReference()
export class DiscountRedemptionResolver extends PricingType<string, DiscountRedemption> {
  async $preload() {
    const redemption = await this.$ctx.loaders.discountRedemption.load(this.$props);
    if (!redemption) {
      throw new PreloadNotFoundError(`Discount redemption with ID ${this.$props} not found`);
    }
    return redemption;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.DiscountRedemption);
  }
  async discount() {
    return this.resolvers.discount(await this.$get("discountId"));
  }
  async discountCode() {
    const codeId = await this.$get("codeId");
    return codeId ? this.resolvers.discountCode(codeId) : null;
  }
  async reservation() {
    const reservationId = await this.$get("reservationId");
    return reservationId ? this.resolvers.discountUsageReservation(reservationId) : null;
  }
  async customerId() {
    const customerId = await this.$get("customerId");
    return customerId ? encodeGlobalIdByType(customerId, GlobalIdEntity.Customer) : null;
  }
  async customer() {
    const customerId = await this.$get("customerId");
    return customerId ? customerReference(customerId) : null;
  }
  async checkoutId() {
    return encodeGlobalIdByType(await this.$get("checkoutId"), GlobalIdEntity.Checkout);
  }
  async orderId() {
    return encodeGlobalIdByType(await this.$get("orderId"), GlobalIdEntity.Order);
  }
  idempotencyKey() {
    return this.$get("idempotencyKey");
  }
  status() {
    return this.$get("status");
  }
  discountClass() {
    return this.$get("discountClass");
  }
  configurationRevision() {
    return this.$get("configurationRevision");
  }
  currency() {
    return this.$get("currency");
  }
  async amountMinor() {
    return toGraphqlBigInt(await this.$get("amountMinor"));
  }
  committedAt() {
    return this.$get("committedAt");
  }
  reversedAt() {
    return this.$get("reversedAt");
  }
  reversalReason() {
    return this.$get("reversalReason");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }

  async allocations() {
    const rows = await this.$ctx.loaders.discountRedemptionAllocations.load(this.$props);
    for (const row of rows) {
      this.$ctx.loaders.discountRedemptionAllocation.prime(row.id, row);
    }
    return rows.map((row) => new DiscountRedemptionAllocationResolver(row.id, this.$ctx));
  }
}

@SubgraphReference()
export class DiscountRedemptionAllocationResolver extends PricingType<
  string,
  DiscountRedemptionAllocation
> {
  async $preload() {
    const allocation = await this.$ctx.loaders.discountRedemptionAllocation.load(this.$props);
    if (!allocation) {
      throw new PreloadNotFoundError(
        `Discount redemption allocation with ID ${this.$props} not found`,
      );
    }
    return allocation;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.DiscountRedemptionAllocation);
  }
  async redemption() {
    return this.resolvers.discountRedemption(await this.$get("redemptionId"));
  }
  targetType() {
    return this.$get("targetType");
  }
  async targetId() {
    const [targetId, targetType] = await Promise.all([
      this.$get("targetId"),
      this.$get("targetType"),
    ]);
    if (!targetId) return null;
    return targetType === "ORDER_LINE"
      ? encodeGlobalIdByType(targetId, GlobalIdEntity.OrderLine)
      : targetId;
  }
  quantity() {
    return this.$get("quantity");
  }
  async amountMinor() {
    return toGraphqlBigInt(await this.$get("amountMinor"));
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class DiscountExternalReferenceResolver extends PricingType<
  string,
  DiscountExternalReference
> {
  async $preload() {
    const reference = await this.$ctx.loaders.discountExternalReference.load(this.$props);
    if (!reference) {
      throw new PreloadNotFoundError(
        `Discount external reference with ID ${this.$props} not found`,
      );
    }
    return reference;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.DiscountExternalReference);
  }
  async discount() {
    return this.resolvers.discount(await this.$get("discountId"));
  }
  externalSystem() {
    return this.$get("externalSystem");
  }
  externalType() {
    return this.$get("externalType");
  }
  externalId() {
    return this.$get("externalId");
  }
  externalUrl() {
    return this.$get("externalUrl");
  }
  direction() {
    return this.$get("direction");
  }
  syncStatus() {
    return this.$get("syncStatus");
  }
  etag() {
    return this.$get("etag");
  }
  contentChecksum() {
    return this.$get("contentChecksum");
  }
  lastSyncedAt() {
    return this.$get("lastSyncedAt");
  }
  lastError() {
    return this.$get("lastError");
  }
  metadata() {
    return this.$get("metadata");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  deletedAt() {
    return this.$get("deletedAt");
  }
}
