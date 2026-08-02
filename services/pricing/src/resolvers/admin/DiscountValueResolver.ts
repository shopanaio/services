import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { DiscountRuleReadModel } from "../../repositories/DiscountRepository.js";
import type {
  DiscountBuyerContext,
  DiscountChannel,
  DiscountCombinationClass,
  DiscountEligibleCustomer,
  DiscountEligibleSegment,
  DiscountFunctionBinding,
  DiscountMinimumRequirement,
  DiscountTarget,
  DiscountTargetSelection,
  DiscountUsageSummaryView,
} from "../../repositories/models/index.js";
import { PricingType } from "./PricingType.js";
import {
  catalogTargetReference,
  customerReference,
  encodeCatalogTargetId,
  toGraphqlBigInt,
} from "./references.js";

export class DiscountAmountOffRuleResolver extends PricingType<
  Extract<DiscountRuleReadModel, { kind: "AMOUNT_OFF" }>["value"]
> {
  operation() { return this.$props.operation; }
  valueType() { return this.$props.valueType; }
  percentageBps() { return this.$props.percentageBps; }
  amountMinor() { return toGraphqlBigInt(this.$props.amountMinor); }
  allocationMethod() { return this.$props.allocationMethod; }
  maximumDiscountMinor() {
    return toGraphqlBigInt(this.$props.maximumDiscountMinor);
  }
}

export class DiscountBuyXGetYRuleResolver extends PricingType<
  Extract<DiscountRuleReadModel, { kind: "BUY_X_GET_Y" }>["value"]
> {
  requirementType() { return this.$props.requirementType; }
  requiredQuantity() { return this.$props.requiredQuantity; }
  requiredSubtotalMinor() {
    return toGraphqlBigInt(this.$props.requiredSubtotalMinor);
  }
  benefitQuantity() { return this.$props.benefitQuantity; }
  benefitStrategy() { return this.$props.benefitStrategy; }
  benefitOperation() { return this.$props.benefitOperation; }
  benefitValueType() { return this.$props.benefitValueType; }
  benefitPercentageBps() { return this.$props.benefitPercentageBps; }
  benefitAmountMinor() {
    return toGraphqlBigInt(this.$props.benefitAmountMinor);
  }
  usesPerOrderLimit() { return this.$props.usesPerOrderLimit; }
}

export class DiscountFreeShippingRuleResolver extends PricingType<
  Extract<DiscountRuleReadModel, { kind: "FREE_SHIPPING" }>["value"]
> {
  maximumShippingPriceMinor() {
    return toGraphqlBigInt(this.$props.maximumShippingPriceMinor);
  }
}

export class DiscountMinimumRequirementResolver extends PricingType<DiscountMinimumRequirement> {
  requirementType() { return this.$props.requirementType; }
  subtotalMinor() { return toGraphqlBigInt(this.$props.subtotalMinor); }
  quantity() { return this.$props.quantity; }
}

interface TargetSelectionResolverProps {
  selection: DiscountTargetSelection;
  targets: DiscountTarget[];
}

export class DiscountTargetSelectionResolver extends PricingType<TargetSelectionResolverProps> {
  role() { return this.$props.selection.role; }
  targetType() { return this.$props.selection.targetType; }
  targets() {
    return this.$props.targets.map(
      (target) => new DiscountTargetResolver(target, this.$ctx),
    );
  }
}

export class DiscountTargetResolver extends PricingType<DiscountTarget> {
  targetId() { return encodeCatalogTargetId(this.$props); }
  targetType() { return this.$props.targetType; }
  target() { return catalogTargetReference(this.$props); }
  referenceStatus() { return this.$props.referenceStatus; }
  referenceStatusChangedAt() {
    return this.$props.referenceStatusChangedAt;
  }
  referenceCheckedAt() { return this.$props.referenceCheckedAt; }
  createdAt() { return this.$props.createdAt; }
}

interface BuyerContextResolverProps {
  context: DiscountBuyerContext;
  customers: DiscountEligibleCustomer[];
  segments: DiscountEligibleSegment[];
}

export class DiscountBuyerContextResolver extends PricingType<BuyerContextResolverProps> {
  type() { return this.$props.context.contextType; }
  customers() {
    return this.$props.customers.map(
      (customer) => new DiscountEligibleCustomerResolver(customer, this.$ctx),
    );
  }
  segments() {
    return this.$props.segments.map(
      (segment) => new DiscountEligibleSegmentResolver(segment, this.$ctx),
    );
  }
  createdAt() { return this.$props.context.createdAt; }
  updatedAt() { return this.$props.context.updatedAt; }
}

export class DiscountEligibleCustomerResolver extends PricingType<DiscountEligibleCustomer> {
  customerId() {
    return encodeGlobalIdByType(
      this.$props.customerId,
      GlobalIdEntity.Customer,
    );
  }
  customer() { return customerReference(this.$props.customerId); }
  referenceStatus() { return this.$props.referenceStatus; }
  referenceStatusChangedAt() {
    return this.$props.referenceStatusChangedAt;
  }
  referenceCheckedAt() { return this.$props.referenceCheckedAt; }
  createdAt() { return this.$props.createdAt; }
}

export class DiscountEligibleSegmentResolver extends PricingType<DiscountEligibleSegment> {
  segmentId() {
    return encodeGlobalIdByType(
      this.$props.segmentId,
      GlobalIdEntity.CustomerSegment,
    );
  }
  referenceStatus() { return this.$props.referenceStatus; }
  referenceStatusChangedAt() {
    return this.$props.referenceStatusChangedAt;
  }
  referenceCheckedAt() { return this.$props.referenceCheckedAt; }
  createdAt() { return this.$props.createdAt; }
}

export class DiscountChannelResolver extends PricingType<DiscountChannel> {
  code() { return this.$props.channelCode; }
  featured() { return this.$props.isFeatured; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
}

export class DiscountCombinationResolver extends PricingType<DiscountCombinationClass> {
  discountClass() { return this.$props.combinesWithClass; }
  createdAt() { return this.$props.createdAt; }
}

export class DiscountFunctionBindingResolver extends PricingType<DiscountFunctionBinding> {
  id() { return encodeGlobalIdByType(this.$props.id, GlobalIdEntity.DiscountFunctionBinding); }
  target() { return this.$props.target; }
  contractVersion() { return this.$props.contractVersion; }
  installationId() { return encodeGlobalIdByType(this.$props.installationId, GlobalIdEntity.AppInstallation); }
  functionKey() { return this.$props.functionKey; }
  precedence() { return this.$props.precedence; }
  activationSequence() { return toGraphqlBigInt(BigInt(this.$props.activationSequence)); }
  status() { return this.$props.status; }
  failureMode() { return this.$props.failureMode; }
  configurationSnapshot() { return this.$props.configurationSnapshot; }
  configurationRevision() { return this.$props.configurationRevision; }
  routeRevision() { return this.$props.routeRevision; }
  createdAt() { return this.$props.createdAt; }
  updatedAt() { return this.$props.updatedAt; }
}

export class DiscountUsageSummaryResolver extends PricingType<DiscountUsageSummaryView> {
  usageLimit() { return toGraphqlBigInt(this.$props.usageLimit); }
  reservedCount() { return toGraphqlBigInt(this.$props.reservedCount); }
  committedCount() { return toGraphqlBigInt(this.$props.committedCount); }
  reversedCount() { return toGraphqlBigInt(this.$props.reversedCount); }
  netCommittedCount() {
    return toGraphqlBigInt(this.$props.netCommittedCount);
  }
  consumedCount() { return toGraphqlBigInt(this.$props.consumedCount); }
  remainingCount() { return toGraphqlBigInt(this.$props.remainingCount); }
  version() { return toGraphqlBigInt(this.$props.version); }
  updatedAt() { return this.$props.updatedAt; }
}
