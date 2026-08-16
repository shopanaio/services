import {
  decodeGlobalId,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import type { CustomerConnectionInput } from "../../repositories/customer/CustomerRepository.js";
import type { CustomerGroupRelayInput } from "../../repositories/classification/CustomerGroupRepository.js";
import type { CustomerSegmentRelayInput } from "../../repositories/classification/CustomerSegmentRepository.js";
import type { CustomerTagRelayInput } from "../../repositories/classification/CustomerTagRepository.js";
import type {
  CustomerDataRequestRelayInput,
  CustomerMergeRelayInput,
} from "../../repositories/lifecycle/CustomerLifecycleRepository.js";
import { CustomerAddressResolver } from "./CustomerAddressResolver.js";
import { CustomerConnectionResolver } from "./CustomerConnectionResolver.js";
import { CustomerConsentEventResolver } from "./CustomerConsentEventResolver.js";
import { CustomerConsentResolver } from "./CustomerConsentResolver.js";
import {
  CustomerComparisonItemResolver,
  CustomerComparisonResolver,
} from "./CustomerComparisonResolver.js";
import { CustomerDataRequestConnectionResolver } from "./CustomerDataRequestConnectionResolver.js";
import { CustomerDataRequestResolver } from "./CustomerDataRequestResolver.js";
import { CustomerExternalReferenceResolver } from "./CustomerExternalReferenceResolver.js";
import { CustomerGroupConnectionResolver } from "./CustomerGroupConnectionResolver.js";
import { CustomerGroupMembershipResolver } from "./CustomerGroupMembershipResolver.js";
import { CustomerGroupResolver } from "./CustomerGroupResolver.js";
import { CustomerMergeConnectionResolver } from "./CustomerMergeConnectionResolver.js";
import { CustomerMergeResolver } from "./CustomerMergeResolver.js";
import { CustomerMonetaryStatisticsResolver } from "./CustomerMonetaryStatisticsResolver.js";
import { CustomerResolver } from "./CustomerResolver.js";
import { CustomerSegmentConnectionResolver } from "./CustomerSegmentConnectionResolver.js";
import { CustomerSegmentMembershipResolver } from "./CustomerSegmentMembershipResolver.js";
import { CustomerSegmentResolver } from "./CustomerSegmentResolver.js";
import { CustomerTagAssignmentResolver } from "./CustomerTagAssignmentResolver.js";
import { CustomerTagConnectionResolver } from "./CustomerTagConnectionResolver.js";
import { CustomerTagResolver } from "./CustomerTagResolver.js";
import { CustomerTaxExemptionResolver } from "./CustomerTaxExemptionResolver.js";
import { CustomerTaxIdentifierResolver } from "./CustomerTaxIdentifierResolver.js";
import { CustomersType } from "./CustomersType.js";
import type { IAM } from "@shopana/broker-types";

@ApolloQuery
export class QueryResolver extends CustomersType<Record<string, never>> {
  customersQuery() {
    return new CustomersQueryResolver({}, this.$ctx);
  }
}

export class CustomersQueryResolver extends CustomersType<
  Record<string, never>
> {
  async customerAccountsSettings() {
    const store = this.$ctx.store;
    const allowed = await this.authProvider.authorize({
      organizationId: store.organizationId,
      domain: `store:${store.id}`,
      resource: "store.profile",
      action: "read",
    });
    if (!allowed) return null;

    const configuration =
      await this.$ctx.kernel.repository.storefrontAuth.findByStoreId(store.id);
    if (!configuration) return null;
    if (configuration.organizationId !== store.organizationId) {
      throw new Error("Storefront auth organization does not match current store");
    }

    const result = await this.$ctx.kernel.getServices().broker.call<
      IAM.ServiceLinkedApplicationAuthSettingsResult,
      IAM.GetServiceLinkedApplicationAuthSettingsParams
    >("iam.getServiceLinkedApplicationAuthSettings", {
      applicationId: configuration.applicationId,
      organizationId: store.organizationId,
      linkedOwner: {
        linkedOwnerType: "store",
        linkedOwnerId: store.id,
      },
    });
    if (!result.success) {
      throw new GraphQLError(
        result.error ?? "Failed to read customer account settings",
        {
          extensions: {
            code: result.errorCode ?? "CUSTOMER_ACCOUNTS_SETTINGS_UNAVAILABLE",
          },
        },
      );
    }
    return result.settings ? toGraphqlCustomerAccountsSettings(result.settings) : null;
  }

  private safeDecodeId(
    globalId: string,
    expectedType: GlobalIdType
  ): string | null {
    try {
      return this.decodeId(globalId, expectedType);
    } catch {
      return null;
    }
  }

  async node(args: { id: string }) {
    let typeName: string;
    try {
      typeName = decodeGlobalId(args.id).typeName;
    } catch {
      return null;
    }

    switch (typeName) {
      case GlobalIdEntity.Customer: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.Customer);
        if (!id || !(await this.$ctx.loaders.customer.load(id))) return null;
        return new CustomerResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerAddress: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerAddress);
        if (!id || !(await this.$ctx.loaders.address.load(id))) return null;
        return new CustomerAddressResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerTaxIdentifier: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerTaxIdentifier
        );
        if (!id || !(await this.$ctx.loaders.taxIdentifier.load(id))) {
          return null;
        }
        return new CustomerTaxIdentifierResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerTaxExemption: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerTaxExemption
        );
        if (!id || !(await this.$ctx.loaders.taxExemption.load(id))) {
          return null;
        }
        return new CustomerTaxExemptionResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerConsent: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerConsent);
        if (!id || !(await this.$ctx.loaders.consent.load(id))) return null;
        return new CustomerConsentResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerComparison: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerComparison,
        );
        if (!id || !(await this.$ctx.loaders.comparison.load(id))) return null;
        return new CustomerComparisonResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerComparisonItem: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerComparisonItem,
        );
        if (!id || !(await this.$ctx.loaders.comparisonItem.load(id))) {
          return null;
        }
        return new CustomerComparisonItemResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerConsentEvent: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerConsentEvent
        );
        if (!id || !(await this.$ctx.loaders.consentEvent.load(id))) {
          return null;
        }
        return new CustomerConsentEventResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerExternalReference: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerExternalReference
        );
        if (!id || !(await this.$ctx.loaders.externalReference.load(id))) {
          return null;
        }
        return new CustomerExternalReferenceResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerGroup: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerGroup);
        if (!id || !(await this.$ctx.loaders.group.load(id))) return null;
        return new CustomerGroupResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerGroupMembership: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerGroupMembership
        );
        if (!id || !(await this.$ctx.loaders.groupMembership.load(id))) {
          return null;
        }
        return new CustomerGroupMembershipResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerTag: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerTag);
        if (!id || !(await this.$ctx.loaders.tag.load(id))) return null;
        return new CustomerTagResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerTagAssignment: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerTagAssignment
        );
        if (!id || !(await this.$ctx.loaders.tagAssignment.load(id))) {
          return null;
        }
        return new CustomerTagAssignmentResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerSegment: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerSegment);
        if (!id || !(await this.$ctx.loaders.segment.load(id))) return null;
        return new CustomerSegmentResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerSegmentMembership: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerSegmentMembership
        );
        if (!id || !(await this.$ctx.loaders.segmentMembership.load(id))) {
          return null;
        }
        return new CustomerSegmentMembershipResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerMonetaryStatistics: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerMonetaryStatistics
        );
        if (!id || !(await this.$ctx.loaders.monetaryStatistics.load(id))) {
          return null;
        }
        return new CustomerMonetaryStatisticsResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerMerge: {
        const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerMerge);
        if (!id || !(await this.$ctx.loaders.customerMerge.load(id))) {
          return null;
        }
        return new CustomerMergeResolver(id, this.$ctx);
      }
      case GlobalIdEntity.CustomerDataRequest: {
        const id = this.safeDecodeId(
          args.id,
          GlobalIdEntity.CustomerDataRequest
        );
        if (!id || !(await this.$ctx.loaders.customerDataRequest.load(id))) {
          return null;
        }
        return new CustomerDataRequestResolver(id, this.$ctx);
      }
      default:
        return null;
    }
  }

  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async customer(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.Customer);
    if (!id || !(await this.$ctx.loaders.customer.load(id))) return null;
    return new CustomerResolver(id, this.$ctx);
  }

  async customerByEmail(args: { email: string }) {
    const customer = await this.$ctx.kernel.repository.customer.findByEmail(
      args.email
    );
    if (!customer) return null;
    this.$ctx.loaders.customer.prime(customer.id, customer);
    return new CustomerResolver(customer.id, this.$ctx);
  }

  customers(args: CustomerConnectionInput) {
    return new CustomerConnectionResolver(args, this.$ctx);
  }

  async customerAddress(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerAddress);
    if (!id || !(await this.$ctx.loaders.address.load(id))) return null;
    return new CustomerAddressResolver(id, this.$ctx);
  }

  async customerTaxIdentifier(args: { id: string }) {
    const id = this.safeDecodeId(
      args.id,
      GlobalIdEntity.CustomerTaxIdentifier
    );
    if (!id || !(await this.$ctx.loaders.taxIdentifier.load(id))) return null;
    return new CustomerTaxIdentifierResolver(id, this.$ctx);
  }

  async customerTaxExemption(args: { id: string }) {
    const id = this.safeDecodeId(
      args.id,
      GlobalIdEntity.CustomerTaxExemption
    );
    if (!id || !(await this.$ctx.loaders.taxExemption.load(id))) return null;
    return new CustomerTaxExemptionResolver(id, this.$ctx);
  }

  async customerConsent(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerConsent);
    if (!id || !(await this.$ctx.loaders.consent.load(id))) return null;
    return new CustomerConsentResolver(id, this.$ctx);
  }

  async customerGroup(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerGroup);
    if (!id || !(await this.$ctx.loaders.group.load(id))) return null;
    return new CustomerGroupResolver(id, this.$ctx);
  }

  customerGroups(args: CustomerGroupRelayInput) {
    return new CustomerGroupConnectionResolver(args, this.$ctx);
  }

  async customerTag(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerTag);
    if (!id || !(await this.$ctx.loaders.tag.load(id))) return null;
    return new CustomerTagResolver(id, this.$ctx);
  }

  customerTags(args: CustomerTagRelayInput) {
    return new CustomerTagConnectionResolver(args, this.$ctx);
  }

  async customerSegment(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerSegment);
    if (!id || !(await this.$ctx.loaders.segment.load(id))) return null;
    return new CustomerSegmentResolver(id, this.$ctx);
  }

  customerSegments(args: CustomerSegmentRelayInput) {
    return new CustomerSegmentConnectionResolver(args, this.$ctx);
  }

  async customerMerge(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerMerge);
    if (!id || !(await this.$ctx.loaders.customerMerge.load(id))) return null;
    return new CustomerMergeResolver(id, this.$ctx);
  }

  customerMerges(args: CustomerMergeRelayInput) {
    return new CustomerMergeConnectionResolver(args, this.$ctx);
  }

  async customerDataRequest(args: { id: string }) {
    const id = this.safeDecodeId(args.id, GlobalIdEntity.CustomerDataRequest);
    if (!id || !(await this.$ctx.loaders.customerDataRequest.load(id))) {
      return null;
    }
    return new CustomerDataRequestResolver(id, this.$ctx);
  }

  customerDataRequests(args: CustomerDataRequestRelayInput) {
    return new CustomerDataRequestConnectionResolver(args, this.$ctx);
  }
}

function toGraphqlCustomerAccountsSettings(
  settings: IAM.ServiceLinkedApplicationAuthSettings,
) {
  return {
    ...settings,
    methods: settings.methods.map((method) => ({
      ...method,
      method: method.method.toUpperCase(),
    })).concat({
      method: "PHONE_OTP",
      enabled: false,
      configured: false,
    }),
    providers: settings.providers.map((provider) => ({
      ...provider,
      provider: provider.provider.toUpperCase(),
    })),
  };
}
