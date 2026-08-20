import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  DiscountCodeRelayInput,
  DiscountExternalReferenceRelayInput,
  DiscountReadModel,
  DiscountRedemptionRelayInput,
  DiscountUsageReservationRelayInput,
} from "../../repositories/DiscountRepository.js";
import {
  DiscountCodeConnectionResolver,
  DiscountExternalReferenceConnectionResolver,
  DiscountRedemptionConnectionResolver,
  DiscountUsageReservationConnectionResolver,
} from "./DiscountConnectionResolver.js";
import { PricingType } from "./PricingType.js";
import { toGraphqlBigInt } from "./references.js";
import {
  DiscountAmountOffRuleResolver,
  DiscountBuyerContextResolver,
  DiscountBuyXGetYRuleResolver,
  DiscountChannelResolver,
  DiscountCombinationResolver,
  DiscountFreeShippingRuleResolver,
  DiscountFunctionBindingResolver,
  DiscountMinimumRequirementResolver,
  DiscountTargetSelectionResolver,
  DiscountUsageSummaryResolver,
} from "./DiscountValueResolver.js";

@SubgraphReference()
export class DiscountResolver extends PricingType<string, DiscountReadModel> {
  async $preload() {
    const discount = await this.$ctx.loaders.discount.load(this.$props);
    if (!discount) {
      throw new PreloadNotFoundError(`Discount with ID ${this.$props} not found`);
    }
    return discount;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Discount);
  }

  method() {
    return this.$get("method");
  }
  calculationStrategy() {
    return this.$get("calculationStrategy");
  }
  kind() {
    return this.$get("kind");
  }
  discountClass() {
    return this.$get("discountClass");
  }
  state() {
    return this.$get("state");
  }
  effectiveStatus() {
    return this.$get("effectiveStatus");
  }
  title() {
    return this.$get("title");
  }
  primaryCode() {
    return this.$get("primaryCode");
  }
  codesCount() {
    return this.$get("codesCount");
  }
  currency() {
    return this.$get("currency");
  }
  priority() {
    return this.$get("priority");
  }
  async usageLimit() {
    return toGraphqlBigInt(await this.$get("usageLimit"));
  }
  appliesOncePerCustomer() {
    return this.$get("appliesOncePerCustomer");
  }
  appliesOnOneTimePurchase() {
    return this.$get("appliesOnOneTimePurchase");
  }
  appliesOnSubscription() {
    return this.$get("appliesOnSubscription");
  }
  startsAt() {
    return this.$get("startsAt");
  }
  endsAt() {
    return this.$get("endsAt");
  }
  revision() {
    return this.$get("revision");
  }
  async reservedUsageCount() {
    return toGraphqlBigInt(await this.$get("reservedUsageCount"));
  }
  async usageCount() {
    return toGraphqlBigInt(await this.$get("usageCount"));
  }
  tags() {
    return this.$get("tags");
  }
  channelCodes() {
    return this.$get("channelCodes");
  }
  featuredChannelCodes() {
    return this.$get("featuredChannelCodes");
  }
  combinesWithProductDiscounts() {
    return this.$get("combinesWithProductDiscounts");
  }
  combinesWithOrderDiscounts() {
    return this.$get("combinesWithOrderDiscounts");
  }
  combinesWithShippingDiscounts() {
    return this.$get("combinesWithShippingDiscounts");
  }
  createdById() {
    return this.$get("createdById");
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
  archivedAt() {
    return this.$get("archivedAt");
  }

  async functionBinding() {
    const aggregate = await this.$ctx.kernel.repository.discount.findAggregateById(this.$props);
    return aggregate?.functionBinding
      ? new DiscountFunctionBindingResolver(aggregate.functionBinding, this.$ctx)
      : null;
  }

  async rule() {
    const rule = await this.$ctx.loaders.discountRule.load(this.$props);
    if (!rule) return null;

    switch (rule.kind) {
      case "AMOUNT_OFF":
        return new DiscountAmountOffRuleResolver(rule.value, this.$ctx);
      case "BUY_X_GET_Y":
        return new DiscountBuyXGetYRuleResolver(rule.value, this.$ctx);
      case "FREE_SHIPPING":
        return new DiscountFreeShippingRuleResolver(rule.value, this.$ctx);
    }
  }

  async minimumRequirement() {
    const requirement = await this.$ctx.loaders.discountMinimumRequirement.load(this.$props);
    return requirement ? new DiscountMinimumRequirementResolver(requirement, this.$ctx) : null;
  }

  async targetSelections() {
    const [selections, targets] = await Promise.all([
      this.$ctx.loaders.discountTargetSelections.load(this.$props),
      this.$ctx.loaders.discountTargets.load(this.$props),
    ]);
    return selections.map(
      (selection) =>
        new DiscountTargetSelectionResolver(
          {
            selection,
            targets: targets.filter(
              (target) =>
                target.role === selection.role && target.targetType === selection.targetType,
            ),
          },
          this.$ctx,
        ),
    );
  }

  async buyerContext() {
    const [context, customers, segments] = await Promise.all([
      this.$ctx.loaders.discountBuyerContext.load(this.$props),
      this.$ctx.loaders.discountEligibleCustomers.load(this.$props),
      this.$ctx.loaders.discountEligibleSegments.load(this.$props),
    ]);
    if (!context) return null;

    return new DiscountBuyerContextResolver({ context, customers, segments }, this.$ctx);
  }

  async channels() {
    const channels = await this.$ctx.loaders.discountChannels.load(this.$props);
    return channels.map((channel) => new DiscountChannelResolver(channel, this.$ctx));
  }

  async combinations() {
    const combinations = await this.$ctx.loaders.discountCombinations.load(this.$props);
    return combinations.map(
      (combination) => new DiscountCombinationResolver(combination, this.$ctx),
    );
  }

  async usage() {
    const usage = await this.$ctx.loaders.discountUsageSummary.load(this.$props);
    if (!usage) {
      throw new PreloadNotFoundError(`Usage summary for discount ${this.$props} not found`);
    }
    return new DiscountUsageSummaryResolver(usage, this.$ctx);
  }

  codes(args: DiscountCodeRelayInput) {
    return new DiscountCodeConnectionResolver({ ...args, discountId: this.$props }, this.$ctx);
  }

  usageReservations(args: DiscountUsageReservationRelayInput) {
    return new DiscountUsageReservationConnectionResolver(
      { ...args, discountId: this.$props },
      this.$ctx,
    );
  }

  redemptions(args: DiscountRedemptionRelayInput) {
    return new DiscountRedemptionConnectionResolver(
      { ...args, discountId: this.$props },
      this.$ctx,
    );
  }

  externalReferences(args: DiscountExternalReferenceRelayInput) {
    return new DiscountExternalReferenceConnectionResolver(
      { ...args, discountId: this.$props },
      this.$ctx,
    );
  }
}
