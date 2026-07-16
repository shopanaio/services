import type { ApiCustomer, ApiCustomerAddress, ApiCustomerTaxExemption, ApiCustomerTaxIdentifier, ApiFile } from "@/graphql/types";
import { CustomerAddressValidationStatus, CustomerTaxExemptionStatus, CustomerTaxIdentifierStatus } from "@/graphql/types";

export type CustomerAddressDraft = {
  key: string;
  id?: string;
  label: string;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  companyName: string;
  phoneE164: string;
  address1: string;
  address2: string;
  city: string;
  regionName: string;
  regionCode: string;
  postalCode: string;
  countryCode: string;
  validationStatus: CustomerAddressValidationStatus;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
};

export type CustomerTaxIdentifierDraft = {
  key: string;
  id?: string;
  identifierType: string;
  countryCode: string;
  value: string;
  status: CustomerTaxIdentifierStatus;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
};

export type CustomerTaxExemptionDraft = {
  key: string;
  id?: string;
  code: string;
  countryCode: string;
  regionCode: string;
  reason: string;
  status: CustomerTaxExemptionStatus;
  certificateFile: Pick<ApiFile, "id" | "originalName" | "url"> | null;
  validFrom: string;
  validTo: string;
};

export const draftKey = () => `new-${crypto.randomUUID()}`;

export function addressToDraft(address: ApiCustomerAddress): CustomerAddressDraft {
  return {
    key: address.id,
    id: address.id,
    label: address.label ?? "",
    prefix: address.prefix ?? "",
    firstName: address.firstName ?? "",
    middleName: address.middleName ?? "",
    lastName: address.lastName ?? "",
    suffix: address.suffix ?? "",
    companyName: address.companyName ?? "",
    phoneE164: address.phoneE164 ?? "",
    address1: address.address1,
    address2: address.address2 ?? "",
    city: address.city,
    regionName: address.regionName ?? "",
    regionCode: address.regionCode ?? "",
    postalCode: address.postalCode ?? "",
    countryCode: address.countryCode,
    validationStatus: address.validationStatus,
    isDefaultShipping: address.isDefaultShipping,
    isDefaultBilling: address.isDefaultBilling,
  };
}

export function customerAddressDrafts(customer: ApiCustomer) {
  const loaded = customer.addresses.edges.map((edge) => edge.node);
  const byId = new Map(loaded.map((item) => [item.id, item]));
  if (customer.defaultShippingAddress) byId.set(customer.defaultShippingAddress.id, customer.defaultShippingAddress);
  if (customer.defaultBillingAddress) byId.set(customer.defaultBillingAddress.id, customer.defaultBillingAddress);
  return [...byId.values()].map(addressToDraft);
}

export function emptyAddressDraft(): CustomerAddressDraft {
  return {
    key: draftKey(),
    label: "",
    prefix: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    companyName: "",
    phoneE164: "",
    address1: "",
    address2: "",
    city: "",
    regionName: "",
    regionCode: "",
    postalCode: "",
    countryCode: "",
    validationStatus: CustomerAddressValidationStatus.Unvalidated,
    isDefaultShipping: false,
    isDefaultBilling: false,
  };
}

export function identifierToDraft(item: ApiCustomerTaxIdentifier): CustomerTaxIdentifierDraft {
  return {
    key: item.id,
    id: item.id,
    identifierType: item.identifierType,
    countryCode: item.countryCode ?? "",
    value: item.value,
    status: item.status,
    isPrimary: item.isPrimary,
    validFrom: item.validFrom ?? "",
    validTo: item.validTo ?? "",
  };
}

export function emptyIdentifierDraft(): CustomerTaxIdentifierDraft {
  return {
    key: draftKey(),
    identifierType: "",
    countryCode: "",
    value: "",
    status: CustomerTaxIdentifierStatus.Unverified,
    isPrimary: false,
    validFrom: "",
    validTo: "",
  };
}

export function exemptionToDraft(item: ApiCustomerTaxExemption): CustomerTaxExemptionDraft {
  return {
    key: item.id,
    id: item.id,
    code: item.code,
    countryCode: item.countryCode ?? "",
    regionCode: item.regionCode ?? "",
    reason: item.reason ?? "",
    status: item.status,
    certificateFile: item.certificateFile ? { id: item.certificateFile.id, originalName: item.certificateFile.originalName, url: item.certificateFile.url } : null,
    validFrom: item.validFrom ?? "",
    validTo: item.validTo ?? "",
  };
}

export function emptyExemptionDraft(): CustomerTaxExemptionDraft {
  return {
    key: draftKey(),
    code: "",
    countryCode: "",
    regionCode: "",
    reason: "",
    status: CustomerTaxExemptionStatus.Active,
    certificateFile: null,
    validFrom: "",
    validTo: "",
  };
}

export function cleanOptional(value: string) {
  return value.trim() || null;
}

export function sameDraft(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
