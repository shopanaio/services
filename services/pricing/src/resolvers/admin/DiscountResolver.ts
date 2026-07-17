import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { DiscountListView } from "../../repositories/models/readModels.js";
import { PricingType } from "./PricingType.js";

@SubgraphReference()
export class DiscountResolver extends PricingType<
  string,
  DiscountListView
> {
  async $preload() {
    const discount = await this.$ctx.kernel.repository.discount.findById(
      this.$props,
    );
    if (!discount) {
      throw new PreloadNotFoundError(
        `Discount with ID ${this.$props} not found`,
      );
    }
    return discount;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Discount);
  }

  method() { return this.$get("method"); }
  kind() { return this.$get("kind"); }
  discountClass() { return this.$get("discountClass"); }
  state() { return this.$get("state"); }
  effectiveStatus() { return this.$get("effectiveStatus"); }
  title() { return this.$get("title"); }
  primaryCode() { return this.$get("primaryCode"); }
  codesCount() { return this.$get("codesCount"); }
  currency() { return this.$get("currency"); }
  priority() { return this.$get("priority"); }
  usageLimit() { return this.$get("usageLimit"); }
  appliesOncePerCustomer() { return this.$get("appliesOncePerCustomer"); }
  appliesOnOneTimePurchase() { return this.$get("appliesOnOneTimePurchase"); }
  appliesOnSubscription() { return this.$get("appliesOnSubscription"); }
  startsAt() { return this.$get("startsAt"); }
  endsAt() { return this.$get("endsAt"); }
  revision() { return this.$get("revision"); }
  reservedUsageCount() { return this.$get("reservedUsageCount"); }
  usageCount() { return this.$get("usageCount"); }
  tags() { return this.$get("tags"); }
  channelCodes() { return this.$get("channelCodes"); }
  featuredChannelCodes() { return this.$get("featuredChannelCodes"); }
  combinesWithProductDiscounts() {
    return this.$get("combinesWithProductDiscounts");
  }
  combinesWithOrderDiscounts() {
    return this.$get("combinesWithOrderDiscounts");
  }
  combinesWithShippingDiscounts() {
    return this.$get("combinesWithShippingDiscounts");
  }
  createdById() { return this.$get("createdById"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
  archivedAt() { return this.$get("archivedAt"); }
}
