import type { FieldPath } from "react-hook-form";
import type {
  ApiCustomer,
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomerUserError,
} from "../graphql/operation-types";
import type { CustomerFormValues } from "../modals/customer-modal/schema";

function toAddress(values: CustomerFormValues) {
  const address = values.defaultAddress;
  const hasAddress = Object.values(address).some((value) => value.trim().length > 0);
  if (!hasAddress) return null;

  return {
    address1: address.address1.trim(),
    address2: address.address2.trim() || null,
    city: address.city.trim(),
    province: address.province.trim() || null,
    postalCode: address.postalCode.trim(),
    countryCode: address.countryCode,
  };
}

const sharedInput = (values: CustomerFormValues) => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim().toLowerCase(),
  phone: values.phone.trim() || null,
  status: values.status,
  locale: values.locale,
  taxExempt: values.taxExempt,
  tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
  note: values.note.trim() || null,
  emailMarketingState: values.emailMarketingState,
  smsMarketingState: values.smsMarketingState,
  segmentIds: values.segmentIds,
  defaultAddress: toAddress(values),
  riskLevel: values.riskLevel,
  blockedReason: values.blockedReason.trim() || null,
  moderationNote: values.moderationNote.trim() || null,
});

export function buildCustomerCreateInput(values: CustomerFormValues): CustomerCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    ...sharedInput(values),
  };
}

export function buildCustomerUpdateInput(
  values: CustomerFormValues,
  customer: ApiCustomer,
): CustomerUpdateInput {
  return {
    id: customer.id,
    expectedVersion: customer.version,
    ...sharedInput(values),
  };
}

const fieldMap: Record<string, FieldPath<CustomerFormValues>> = {
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  status: "status",
  locale: "locale",
  taxExempt: "taxExempt",
  tags: "tags",
  note: "note",
  emailMarketingState: "emailMarketingState",
  smsMarketingState: "smsMarketingState",
  segmentIds: "segmentIds",
  riskLevel: "riskLevel",
  blockedReason: "blockedReason",
  moderationNote: "moderationNote",
  "defaultAddress.address1": "defaultAddress.address1",
  "defaultAddress.address2": "defaultAddress.address2",
  "defaultAddress.city": "defaultAddress.city",
  "defaultAddress.province": "defaultAddress.province",
  "defaultAddress.postalCode": "defaultAddress.postalCode",
  "defaultAddress.countryCode": "defaultAddress.countryCode",
};

export function mapCustomerUserErrors(errors: CustomerUserError[]) {
  return errors.map((error) => ({
    field: error.field ? fieldMap[error.field] ?? null : null,
    message: error.message,
  }));
}
