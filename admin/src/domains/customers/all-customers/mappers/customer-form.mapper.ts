import type { FieldPath } from "react-hook-form";
import type {
  ApiCustomer,
  ApiCustomerAddressCreateOperationInput,
  ApiCustomerAddressUpdateOperationInput,
  ApiCustomerCreateInput,
  ApiCustomerUpdateInput,
  ApiGenericUserError,
} from "@/graphql/types";
import { CustomerConsentChannel, CustomerConsentOptInLevel } from "@/graphql/types";
import type { CustomerFormValues } from "../modals/customer-modal/schema";

function toAddress(values: CustomerFormValues): ApiCustomerAddressCreateOperationInput | null {
  const address = values.defaultAddress;
  const hasAddress = Object.values(address).some((value) => value.trim().length > 0);
  if (!hasAddress) return null;

  return {
    address1: address.address1.trim(),
    address2: address.address2.trim() || null,
    city: address.city.trim(),
    regionName: address.province.trim() || null,
    postalCode: address.postalCode.trim() || null,
    countryCode: address.countryCode,
    isDefaultShipping: true,
  };
}

export function buildCustomerCreateInput(values: CustomerFormValues): ApiCustomerCreateInput {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    phoneE164: values.phone.trim() || null,
    preferredLocale: values.locale,
    note: values.note.trim() || null,
    moderationNote: values.moderationNote.trim() || null,
  };
}

export function buildCustomerUpdateInput(
  values: CustomerFormValues,
  customer?: ApiCustomer | null,
): ApiCustomerUpdateInput {
  const address = toAddress(values);
  const existingAddress = customer?.defaultShippingAddress;
  const addressUpdate: ApiCustomerAddressUpdateOperationInput | null =
    address && existingAddress
      ? {
          addressId: existingAddress.id,
          operations: {
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            regionName: address.regionName,
            postalCode: address.postalCode,
            countryCode: address.countryCode,
          },
        }
      : null;
  const consents = [
    {
      channel: CustomerConsentChannel.Email,
      state: values.emailMarketingState,
      contactPoint: values.email.trim().toLowerCase(),
      optInLevel: CustomerConsentOptInLevel.Unknown,
    },
    ...(values.phone.trim()
      ? [
          {
            channel: CustomerConsentChannel.Sms,
            state: values.smsMarketingState,
            contactPoint: values.phone.trim(),
            optInLevel: CustomerConsentOptInLevel.Unknown,
          },
        ]
      : []),
  ];

  return {
    profile: {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      preferredLocale: values.locale,
    },
    contact: {
      email: values.email.trim().toLowerCase(),
      phoneE164: values.phone.trim() || null,
    },
    status: {
      status: values.status,
      blockedReason: values.status === "BLOCKED" ? values.blockedReason.trim() : null,
    },
    note: { note: values.note.trim() || null },
    moderation: { moderationNote: values.moderationNote.trim() || null },
    segments: { segmentIds: values.segmentIds },
    tags: { tagIds: values.tagIds },
    consents: { set: consents },
    addresses: address
      ? existingAddress
        ? { update: addressUpdate ? [addressUpdate] : [] }
        : { create: [address] }
      : existingAddress
        ? { deleteIds: [existingAddress.id], defaultShippingAddressId: null }
        : undefined,
  };
}

const fieldMap: Record<string, FieldPath<CustomerFormValues>> = {
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phoneE164: "phone",
  "contact.email": "email",
  "contact.phoneE164": "phone",
  "profile.firstName": "firstName",
  "profile.lastName": "lastName",
  "profile.preferredLocale": "locale",
  "status.status": "status",
  "status.blockedReason": "blockedReason",
  "segments.segmentIds": "segmentIds",
  "tags.tagIds": "tagIds",
  "addresses.create.address1": "defaultAddress.address1",
  "addresses.create.city": "defaultAddress.city",
  "addresses.create.postalCode": "defaultAddress.postalCode",
  "addresses.create.countryCode": "defaultAddress.countryCode",
};

export function mapCustomerUserErrors(errors: ApiGenericUserError[]) {
  return errors.map((error) => {
    const path = error.field?.join(".") ?? null;
    return {
      field: path ? (fieldMap[path] ?? null) : null,
      message: error.message,
    };
  });
}
