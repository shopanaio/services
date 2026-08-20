import type { ServiceContext } from "../../context/types.js";
import type { CustomerAddressConnectionInput } from "../../repositories/address/CustomerAddressRepository.js";
import type {
  CustomerGroupMembershipConnectionInput,
  CustomerGroupRelayInput,
} from "../../repositories/classification/CustomerGroupRepository.js";
import type {
  CustomerSegmentMembershipConnectionInput,
  CustomerSegmentRelayInput,
} from "../../repositories/classification/CustomerSegmentRepository.js";
import type {
  CustomerTagAssignmentConnectionInput,
  CustomerTagRelayInput,
} from "../../repositories/classification/CustomerTagRepository.js";
import type { CustomerConsentEventConnectionInput } from "../../repositories/consent/CustomerConsentRepository.js";
import type { CustomerConnectionInput } from "../../repositories/customer/CustomerRepository.js";
import type {
  CustomerDataRequestRelayInput,
  CustomerMergeRelayInput,
} from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import type { CustomerMonetaryStatisticsConnectionInput } from "../../repositories/statistics/CustomerStatisticsRepository.js";
import type { CustomerTaxExemptionConnectionInput } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import type { CustomerTaxIdentifierConnectionInput } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) {
    return existing;
  }

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async customer(id: string) {
    const { CustomerResolver } = await import("./CustomerResolver.js");
    return new CustomerResolver(id, this.ctx);
  }

  async customerConnection(input: CustomerConnectionInput) {
    const { CustomerConnectionResolver } = await import("./CustomerConnectionResolver.js");
    return new CustomerConnectionResolver(input, this.ctx);
  }

  async comparison(id: string) {
    const { CustomerComparisonResolver } = await import("./CustomerComparisonResolver.js");
    return new CustomerComparisonResolver(id, this.ctx);
  }

  async comparisonItem(id: string) {
    const { CustomerComparisonItemResolver } = await import("./CustomerComparisonResolver.js");
    return new CustomerComparisonItemResolver(id, this.ctx);
  }

  async externalReference(id: string) {
    const { CustomerExternalReferenceResolver } =
      await import("./CustomerExternalReferenceResolver.js");
    return new CustomerExternalReferenceResolver(id, this.ctx);
  }

  async address(id: string) {
    const { CustomerAddressResolver } = await import("./CustomerAddressResolver.js");
    return new CustomerAddressResolver(id, this.ctx);
  }

  async addressConnection(input: CustomerAddressConnectionInput) {
    const { CustomerAddressConnectionResolver } =
      await import("./CustomerAddressConnectionResolver.js");
    return new CustomerAddressConnectionResolver(input, this.ctx);
  }

  async taxIdentifier(id: string) {
    const { CustomerTaxIdentifierResolver } = await import("./CustomerTaxIdentifierResolver.js");
    return new CustomerTaxIdentifierResolver(id, this.ctx);
  }

  async taxIdentifierConnection(input: CustomerTaxIdentifierConnectionInput) {
    const { CustomerTaxIdentifierConnectionResolver } =
      await import("./CustomerTaxIdentifierConnectionResolver.js");
    return new CustomerTaxIdentifierConnectionResolver(input, this.ctx);
  }

  async taxExemption(id: string) {
    const { CustomerTaxExemptionResolver } = await import("./CustomerTaxExemptionResolver.js");
    return new CustomerTaxExemptionResolver(id, this.ctx);
  }

  async taxExemptionConnection(input: CustomerTaxExemptionConnectionInput) {
    const { CustomerTaxExemptionConnectionResolver } =
      await import("./CustomerTaxExemptionConnectionResolver.js");
    return new CustomerTaxExemptionConnectionResolver(input, this.ctx);
  }

  async consent(id: string) {
    const { CustomerConsentResolver } = await import("./CustomerConsentResolver.js");
    return new CustomerConsentResolver(id, this.ctx);
  }

  async consentEvent(id: string) {
    const { CustomerConsentEventResolver } = await import("./CustomerConsentEventResolver.js");
    return new CustomerConsentEventResolver(id, this.ctx);
  }

  async consentEventConnection(input: CustomerConsentEventConnectionInput) {
    const { CustomerConsentEventConnectionResolver } =
      await import("./CustomerConsentEventConnectionResolver.js");
    return new CustomerConsentEventConnectionResolver(input, this.ctx);
  }

  async group(id: string) {
    const { CustomerGroupResolver } = await import("./CustomerGroupResolver.js");
    return new CustomerGroupResolver(id, this.ctx);
  }

  async groupConnection(input: CustomerGroupRelayInput) {
    const { CustomerGroupConnectionResolver } =
      await import("./CustomerGroupConnectionResolver.js");
    return new CustomerGroupConnectionResolver(input, this.ctx);
  }

  async groupMembership(id: string) {
    const { CustomerGroupMembershipResolver } =
      await import("./CustomerGroupMembershipResolver.js");
    return new CustomerGroupMembershipResolver(id, this.ctx);
  }

  async groupMembershipConnection(input: CustomerGroupMembershipConnectionInput) {
    const { CustomerGroupMembershipConnectionResolver } =
      await import("./CustomerGroupMembershipConnectionResolver.js");
    return new CustomerGroupMembershipConnectionResolver(input, this.ctx);
  }

  async tag(id: string) {
    const { CustomerTagResolver } = await import("./CustomerTagResolver.js");
    return new CustomerTagResolver(id, this.ctx);
  }

  async tagConnection(input: CustomerTagRelayInput) {
    const { CustomerTagConnectionResolver } = await import("./CustomerTagConnectionResolver.js");
    return new CustomerTagConnectionResolver(input, this.ctx);
  }

  async tagAssignment(id: string) {
    const { CustomerTagAssignmentResolver } = await import("./CustomerTagAssignmentResolver.js");
    return new CustomerTagAssignmentResolver(id, this.ctx);
  }

  async tagAssignmentConnection(input: CustomerTagAssignmentConnectionInput) {
    const { CustomerTagAssignmentConnectionResolver } =
      await import("./CustomerTagAssignmentConnectionResolver.js");
    return new CustomerTagAssignmentConnectionResolver(input, this.ctx);
  }

  async segment(id: string) {
    const { CustomerSegmentResolver } = await import("./CustomerSegmentResolver.js");
    return new CustomerSegmentResolver(id, this.ctx);
  }

  async segmentConnection(input: CustomerSegmentRelayInput) {
    const { CustomerSegmentConnectionResolver } =
      await import("./CustomerSegmentConnectionResolver.js");
    return new CustomerSegmentConnectionResolver(input, this.ctx);
  }

  async segmentMembership(id: string) {
    const { CustomerSegmentMembershipResolver } =
      await import("./CustomerSegmentMembershipResolver.js");
    return new CustomerSegmentMembershipResolver(id, this.ctx);
  }

  async segmentMembershipConnection(input: CustomerSegmentMembershipConnectionInput) {
    const { CustomerSegmentMembershipConnectionResolver } =
      await import("./CustomerSegmentMembershipConnectionResolver.js");
    return new CustomerSegmentMembershipConnectionResolver(input, this.ctx);
  }

  async statistics(customerId: string) {
    const { CustomerStatisticsResolver } = await import("./CustomerStatisticsResolver.js");
    return new CustomerStatisticsResolver(customerId, this.ctx);
  }

  async monetaryStatistics(id: string) {
    const { CustomerMonetaryStatisticsResolver } =
      await import("./CustomerMonetaryStatisticsResolver.js");
    return new CustomerMonetaryStatisticsResolver(id, this.ctx);
  }

  async monetaryStatisticsConnection(input: CustomerMonetaryStatisticsConnectionInput) {
    const { CustomerMonetaryStatisticsConnectionResolver } =
      await import("./CustomerMonetaryStatisticsConnectionResolver.js");
    return new CustomerMonetaryStatisticsConnectionResolver(input, this.ctx);
  }

  async merge(id: string) {
    const { CustomerMergeResolver } = await import("./CustomerMergeResolver.js");
    return new CustomerMergeResolver(id, this.ctx);
  }

  async mergeConnection(input: CustomerMergeRelayInput) {
    const { CustomerMergeConnectionResolver } =
      await import("./CustomerMergeConnectionResolver.js");
    return new CustomerMergeConnectionResolver(input, this.ctx);
  }

  async dataRequest(id: string) {
    const { CustomerDataRequestResolver } = await import("./CustomerDataRequestResolver.js");
    return new CustomerDataRequestResolver(id, this.ctx);
  }

  async dataRequestConnection(input: CustomerDataRequestRelayInput) {
    const { CustomerDataRequestConnectionResolver } =
      await import("./CustomerDataRequestConnectionResolver.js");
    return new CustomerDataRequestConnectionResolver(input, this.ctx);
  }

  async customersQuery() {
    const { CustomersQueryResolver } = await import("./QueryResolver.js");
    return new CustomersQueryResolver({}, this.ctx);
  }

  async customersMutation() {
    const { CustomersMutationResolver } = await import("./MutationResolver.js");
    return new CustomersMutationResolver({}, this.ctx);
  }
}
