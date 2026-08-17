import type { Media } from "@shopana/broker-types";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type {
  CustomerAddress,
  CustomerConsent,
  CustomerDataRequest,
  CustomerTaxExemption,
  CustomerTaxIdentifier,
} from "../../repositories/models/index.js";
import { StorefrontCustomersType } from "./StorefrontCustomersType.js";

abstract class OwnedCustomerType<TData extends { customerId: string }>
  extends StorefrontCustomersType<string, TData> {
  protected assertOwner(data: TData): TData {
    if (!this.$ctx.customer?.id || data.customerId !== this.$ctx.customer.id) {
      throw new PreloadNotFoundError("Customer-owned resource was not found");
    }
    return data;
  }

  protected async isAvailableStoreFile(fileId: string): Promise<boolean> {
    const result = await this.$ctx.kernel.getServices().broker.call<
      Media.ValidateOwnedFileResult,
      Media.ValidateOwnedFileParams
    >("media.validateOwnedFile", {
      fileId,
      owner: { type: "store", id: this.$ctx.store.id },
    });
    return result.valid;
  }
}

export class StorefrontCustomerAddressResolver extends OwnedCustomerType<CustomerAddress> {
  async $preload(): Promise<CustomerAddress> {
    const address = await this.$ctx.loaders.address.load(this.$props);
    if (!address) throw new PreloadNotFoundError("Customer address was not found");
    return this.assertOwner(address);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerAddress);
  }

  label() { return this.$get("label"); }
  prefix() { return this.$get("prefix"); }
  firstName() { return this.$get("firstName"); }
  middleName() { return this.$get("middleName"); }
  lastName() { return this.$get("lastName"); }
  suffix() { return this.$get("suffix"); }
  company() { return this.$get("companyName"); }
  address1() { return this.$get("address1"); }
  address2() { return this.$get("address2"); }
  city() { return this.$get("city"); }
  province() { return this.$get("regionName"); }
  provinceCode() { return this.$get("regionCode"); }
  country() { return this.$get("countryCode"); }
  countryCode() { return this.$get("countryCode"); }
  zip() { return this.$get("postalCode"); }
  phone() { return this.$get("phoneE164"); }
  isDefaultShipping() { return this.$get("isDefaultShipping"); }
  isDefaultBilling() { return this.$get("isDefaultBilling"); }
  validationStatus() { return this.$get("validationStatus"); }
  validatedAt() { return this.$get("validatedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }

  async name(): Promise<string> {
    const address = await this.$preload();
    return recipientName(address) || address.companyName || address.address1;
  }

  async formatted(): Promise<string[]> {
    const address = await this.$preload();
    return [
      recipientName(address),
      address.companyName,
      address.address1,
      address.address2,
      formattedArea(address),
      address.countryCode,
    ].filter((value): value is string => Boolean(value));
  }

  async formattedArea(): Promise<string | null> {
    return formattedArea(await this.$preload()) || null;
  }
}

export class StorefrontCustomerConsentResolver extends OwnedCustomerType<CustomerConsent> {
  async $preload(): Promise<CustomerConsent> {
    const consent = await this.$ctx.loaders.consent.load(this.$props);
    if (!consent) throw new PreloadNotFoundError("Customer consent was not found");
    return this.assertOwner(consent);
  }

  channel() { return this.$get("channel"); }
  state() { return this.$get("state"); }
  optInLevel() { return this.$get("optInLevel"); }
  consentedAt() { return this.$get("consentedAt"); }
  withdrawnAt() { return this.$get("withdrawnAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

export class StorefrontCustomerDataRequestResolver extends OwnedCustomerType<CustomerDataRequest> {
  async $preload(): Promise<CustomerDataRequest> {
    const request = await this.$ctx.loaders.customerDataRequest.load(this.$props);
    if (!request) {
      throw new PreloadNotFoundError("Customer privacy request was not found");
    }
    return this.assertOwner(request);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerDataRequest);
  }

  type() { return this.$get("type"); }
  status() { return this.$get("status"); }
  rejectionReason() { return this.$get("rejectionReason"); }
  requestedAt() { return this.$get("requestedAt"); }
  dueAt() { return this.$get("dueAt"); }
  startedAt() { return this.$get("startedAt"); }
  finishedAt() { return this.$get("finishedAt"); }
  updatedAt() { return this.$get("updatedAt"); }

  async correctionDetails() {
    const metadata = await this.$get("requestMetadata");
    return isRecord(metadata) ? metadata.correctionDetails ?? null : null;
  }

  async resultFile() {
    const fileId = await this.$get("resultFileId");
    return fileId && (await this.isAvailableStoreFile(fileId))
      ? {
          __typename: "GenericFile" as const,
          id: this.encodeId(fileId, GlobalIdEntity.File),
        }
      : null;
  }

}

export class StorefrontCustomerTaxIdentifierResolver extends OwnedCustomerType<CustomerTaxIdentifier> {
  async $preload(): Promise<CustomerTaxIdentifier> {
    const identifier = await this.$ctx.loaders.taxIdentifier.load(this.$props);
    if (!identifier) {
      throw new PreloadNotFoundError("Customer tax identifier was not found");
    }
    return this.assertOwner(identifier);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTaxIdentifier);
  }

  identifierType() { return this.$get("identifierType"); }
  countryCode() { return this.$get("countryCode"); }
  value() { return this.$get("value"); }
  status() { return this.$get("status"); }
  isPrimary() { return this.$get("isPrimary"); }
  verifiedAt() { return this.$get("verifiedAt"); }
  validFrom() { return this.$get("validFrom"); }
  validTo() { return this.$get("validTo"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

export class StorefrontCustomerTaxExemptionResolver extends OwnedCustomerType<CustomerTaxExemption> {
  async $preload(): Promise<CustomerTaxExemption> {
    const exemption = await this.$ctx.loaders.taxExemption.load(this.$props);
    if (!exemption) {
      throw new PreloadNotFoundError("Customer tax exemption was not found");
    }
    return this.assertOwner(exemption);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerTaxExemption);
  }

  code() { return this.$get("code"); }
  countryCode() { return this.$get("countryCode"); }
  regionCode() { return this.$get("regionCode"); }
  reason() { return this.$get("reason"); }
  status() { return this.$get("status"); }
  validFrom() { return this.$get("validFrom"); }
  validTo() { return this.$get("validTo"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }

  async certificateFile() {
    const fileId = await this.$get("certificateFileId");
    return fileId && (await this.isAvailableStoreFile(fileId))
      ? {
          __typename: "GenericFile" as const,
          id: this.encodeId(fileId, GlobalIdEntity.File),
        }
      : null;
  }

}

function recipientName(address: CustomerAddress): string {
  return [
    address.prefix,
    address.firstName,
    address.middleName,
    address.lastName,
    address.suffix,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function formattedArea(address: CustomerAddress): string {
  const region = address.regionName || address.regionCode;
  return [address.city, region, address.postalCode]
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
