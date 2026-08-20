import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { Customer } from "../../repositories/models/index.js";
import type { CustomerAddressRelayInput } from "../../repositories/address/CustomerAddressRepository.js";
import type { CustomerGroupMembershipRelayInput } from "../../repositories/classification/CustomerGroupRepository.js";
import type { CustomerSegmentMembershipRelayInput } from "../../repositories/classification/CustomerSegmentRepository.js";
import type { CustomerTagAssignmentRelayInput } from "../../repositories/classification/CustomerTagRepository.js";
import type { CustomerMonetaryStatisticsRelayInput } from "../../repositories/statistics/CustomerStatisticsRepository.js";
import type { CustomerTaxExemptionRelayInput } from "../../repositories/tax/CustomerTaxExemptionRepository.js";
import type { CustomerTaxIdentifierRelayInput } from "../../repositories/tax/CustomerTaxIdentifierRepository.js";
import { CustomersType } from "./CustomersType.js";

@SubgraphReference()
export class CustomerResolver extends CustomersType<string, Customer> {
  async $preload() {
    const customer = await this.$ctx.loaders.customer.load(this.$props);
    if (!customer) {
      throw new PreloadNotFoundError(`Customer with ID ${this.$props} not found`);
    }
    return customer;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Customer);
  }

  lifecycleStatus() {
    return this.$get("lifecycleStatus");
  }

  accountStatus() {
    return this.$get("accountStatus");
  }

  iamPrincipalId() {
    return this.$get("iamPrincipalId");
  }

  email() {
    return this.$get("email");
  }

  emailVerified() {
    return this.$get("emailVerified");
  }

  phoneE164() {
    return this.$get("phoneE164");
  }

  phoneVerified() {
    return this.$get("phoneVerified");
  }

  prefix() {
    return this.$get("prefix");
  }

  firstName() {
    return this.$get("firstName");
  }

  middleName() {
    return this.$get("middleName");
  }

  lastName() {
    return this.$get("lastName");
  }

  suffix() {
    return this.$get("suffix");
  }

  async displayName(): Promise<string> {
    const customer = await this.$preload();
    const personName = [
      customer.prefix,
      customer.firstName,
      customer.middleName,
      customer.lastName,
      customer.suffix,
    ]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" ");

    return (
      personName ||
      customer.companyName?.trim() ||
      customer.email ||
      customer.phoneE164 ||
      "Customer"
    );
  }

  preferredLocale() {
    return this.$get("preferredLocale");
  }

  dateOfBirth() {
    return this.$get("dateOfBirth");
  }

  gender() {
    return this.$get("gender");
  }

  companyName() {
    return this.$get("companyName");
  }

  jobTitle() {
    return this.$get("jobTitle");
  }

  note() {
    return this.$get("note");
  }

  blockedReason() {
    return this.$get("blockedReason");
  }

  moderationNote() {
    return this.$get("moderationNote");
  }

  source() {
    return this.$get("source");
  }

  createdByUserId() {
    return this.$get("createdByUserId");
  }

  revision() {
    return this.$get("revision");
  }

  lastActivityAt() {
    return this.$get("lastActivityAt");
  }

  async mergedInto() {
    const customerId = await this.$get("mergedIntoCustomerId");
    return customerId ? this.resolvers.customer(customerId) : null;
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

  redactedAt() {
    return this.$get("redactedAt");
  }

  async defaultShippingAddress() {
    const addresses = await this.$ctx.loaders.addressesByCustomer.load(this.$props);
    const address = addresses.find((item) => item.isDefaultShipping);
    return address ? this.resolvers.address(address.id) : null;
  }

  async defaultBillingAddress() {
    const addresses = await this.$ctx.loaders.addressesByCustomer.load(this.$props);
    const address = addresses.find((item) => item.isDefaultBilling);
    return address ? this.resolvers.address(address.id) : null;
  }

  addresses(args: CustomerAddressRelayInput) {
    return this.resolvers.addressConnection({
      ...args,
      customerId: this.$props,
    });
  }

  taxIdentifiers(args: CustomerTaxIdentifierRelayInput) {
    return this.resolvers.taxIdentifierConnection({
      ...args,
      customerId: this.$props,
    });
  }

  taxExemptions(args: CustomerTaxExemptionRelayInput) {
    return this.resolvers.taxExemptionConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async consents() {
    const consents = await this.$ctx.loaders.consentsByCustomer.load(this.$props);
    return Promise.all(consents.map((consent) => this.resolvers.consent(consent.id)));
  }

  groupMemberships(args: CustomerGroupMembershipRelayInput) {
    return this.resolvers.groupMembershipConnection({
      ...args,
      customerId: this.$props,
    });
  }

  tagAssignments(args: CustomerTagAssignmentRelayInput) {
    return this.resolvers.tagAssignmentConnection({
      ...args,
      customerId: this.$props,
    });
  }

  segmentMemberships(args: CustomerSegmentMembershipRelayInput) {
    return this.resolvers.segmentMembershipConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async statistics() {
    const statistics = await this.$ctx.loaders.statisticsByCustomer.load(this.$props);
    return statistics ? this.resolvers.statistics(this.$props) : null;
  }

  monetaryStatistics(args: CustomerMonetaryStatisticsRelayInput) {
    return this.resolvers.monetaryStatisticsConnection({
      ...args,
      customerId: this.$props,
    });
  }

  async comparison() {
    const comparison = await this.$ctx.loaders.comparisonByCustomer.load(this.$props);
    return comparison ? this.resolvers.comparison(comparison.id) : null;
  }

  async externalReferences() {
    const references = await this.$ctx.loaders.externalReferencesByCustomer.load(this.$props);
    return Promise.all(
      references.map((reference) => this.resolvers.externalReference(reference.id)),
    );
  }
}
