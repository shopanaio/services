import { z } from "zod";
import { CustomerAddressValidationStatus, CustomerAdminLifecycleStatus, CustomerConsentAdminState, CustomerConsentChannel, CustomerConsentOptInLevel, CustomerTaxExemptionStatus, CustomerTaxIdentifierStatus } from "@/graphql/types";

const optionalText = z.string().max(2000);
const optionalPhone = z.string().refine((value) => !value || /^\+[1-9]\d{7,14}$/.test(value), "Use E.164 format, for example +12025550147");

export const customerProfileSchema = z.object({
  prefix: z.string(),
  firstName: z.string().trim().min(1, "First name is required"),
  middleName: z.string(),
  lastName: z.string().trim().min(1, "Last name is required"),
  suffix: z.string(),
  preferredLocale: z.string().min(1, "Preferred locale is required"),
  dateOfBirth: z.string(),
  gender: z.string(),
});
export type CustomerProfileValues = z.infer<typeof customerProfileSchema>;

export const customerContactSchema = z.object({
  email: z.string().refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email"),
  phoneE164: optionalPhone,
});
export type CustomerContactValues = z.infer<typeof customerContactSchema>;

export const customerCompanySchema = z.object({ companyName: z.string(), jobTitle: z.string() });
export type CustomerCompanyValues = z.infer<typeof customerCompanySchema>;

export const customerStatusSchema = z.object({
  status: z.enum(CustomerAdminLifecycleStatus),
  blockedReason: z.string(),
}).superRefine((value, context) => {
  if (value.status === CustomerAdminLifecycleStatus.Blocked && !value.blockedReason.trim()) {
    context.addIssue({ code: "custom", path: ["blockedReason"], message: "A block reason is required" });
  }
});
export type CustomerStatusValues = z.infer<typeof customerStatusSchema>;

export const customerNoteSchema = z.object({ note: optionalText });
export type CustomerNoteValues = z.infer<typeof customerNoteSchema>;
export const customerModerationSchema = z.object({ moderationNote: optionalText });
export type CustomerModerationValues = z.infer<typeof customerModerationSchema>;

export const customerGroupsSchema = z.object({ groupIds: z.array(z.string()), primaryGroupId: z.string().nullable() }).refine((value) => !value.primaryGroupId || value.groupIds.includes(value.primaryGroupId), { path: ["primaryGroupId"], message: "Primary group must be selected" });
export type CustomerGroupsValues = z.infer<typeof customerGroupsSchema>;
export const customerTagsSchema = z.object({ tagIds: z.array(z.string()) });
export type CustomerTagsValues = z.infer<typeof customerTagsSchema>;
export const customerSegmentsSchema = z.object({ segmentIds: z.array(z.string()) });
export type CustomerSegmentsValues = z.infer<typeof customerSegmentsSchema>;

export const customerAddressDraftSchema = z.object({
  key: z.string(), id: z.string().optional(), label: z.string(), prefix: z.string(), firstName: z.string(), middleName: z.string(), lastName: z.string(), suffix: z.string(), companyName: z.string(), phoneE164: optionalPhone,
  address1: z.string().trim().min(1, "Address line 1 is required"), address2: z.string(), city: z.string().trim().min(1, "City is required"), regionName: z.string(), regionCode: z.string(), postalCode: z.string(), countryCode: z.string().min(1, "Country is required"), validationStatus: z.enum(CustomerAddressValidationStatus), isDefaultShipping: z.boolean(), isDefaultBilling: z.boolean(),
});
export const customerAddressManagerSchema = z.object({ items: z.array(customerAddressDraftSchema), deletedIds: z.array(z.string()), defaultShippingKey: z.string().nullable(), defaultBillingKey: z.string().nullable() });

export const customerConsentRowSchema = z.object({ channel: z.enum(CustomerConsentChannel), enabled: z.boolean(), locked: z.boolean(), existingState: z.string().nullable(), state: z.enum(CustomerConsentAdminState).nullable(), optInLevel: z.enum(CustomerConsentOptInLevel), contactPoint: z.string() }).superRefine((value, context) => {
  if (value.enabled && !value.state) context.addIssue({ code: "custom", path: ["state"], message: "Choose a consent state" });
  if (value.enabled && !value.contactPoint.trim()) context.addIssue({ code: "custom", path: ["contactPoint"], message: "Contact point is required" });
});
export const customerConsentsSchema = z.object({ channels: z.array(customerConsentRowSchema) });
export type CustomerConsentsValues = z.infer<typeof customerConsentsSchema>;

export const customerTaxIdentifierDraftSchema = z.object({ key: z.string(), id: z.string().optional(), identifierType: z.string().trim().min(1, "Type is required"), countryCode: z.string(), value: z.string().trim().min(1, "Value is required"), status: z.enum(CustomerTaxIdentifierStatus), isPrimary: z.boolean(), validFrom: z.string(), validTo: z.string() });
export const customerTaxIdentifiersManagerSchema = z.object({ items: z.array(customerTaxIdentifierDraftSchema), deletedIds: z.array(z.string()) });
export const customerTaxExemptionDraftSchema = z.object({ key: z.string(), id: z.string().optional(), code: z.string().trim().min(1, "Code is required"), countryCode: z.string(), regionCode: z.string(), reason: z.string(), status: z.enum(CustomerTaxExemptionStatus), certificateFile: z.object({ id: z.string(), originalName: z.string().nullable().optional(), url: z.string() }).nullable(), validFrom: z.string(), validTo: z.string() });
export const customerTaxExemptionsManagerSchema = z.object({ items: z.array(customerTaxExemptionDraftSchema), deletedIds: z.array(z.string()) });
