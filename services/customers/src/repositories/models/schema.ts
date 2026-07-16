import { pgSchema } from "drizzle-orm/pg-core";

export const customersSchema = pgSchema("customers");

export const customerLifecycleStatusEnum = customersSchema.enum(
  "customer_lifecycle_status",
  ["ACTIVE", "DISABLED", "BLOCKED", "MERGED", "REDACTED"]
);

export const customerAccountStatusEnum = customersSchema.enum(
  "customer_account_status",
  ["GUEST", "INVITED", "REGISTERED"]
);

export const addressValidationStatusEnum = customersSchema.enum(
  "address_validation_status",
  ["UNVALIDATED", "VALID", "INVALID"]
);

export const taxIdentifierStatusEnum = customersSchema.enum(
  "tax_identifier_status",
  ["UNVERIFIED", "VERIFIED", "REJECTED", "EXPIRED"]
);

export const taxExemptionStatusEnum = customersSchema.enum(
  "tax_exemption_status",
  ["ACTIVE", "EXPIRED", "REVOKED"]
);

export const consentChannelEnum = customersSchema.enum("consent_channel", [
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PUSH",
]);

export const consentStateEnum = customersSchema.enum("consent_state", [
  "NOT_SUBSCRIBED",
  "PENDING",
  "SUBSCRIBED",
  "UNSUBSCRIBED",
  "INVALID",
  "REDACTED",
]);

export const consentOptInLevelEnum = customersSchema.enum(
  "consent_opt_in_level",
  ["UNKNOWN", "SINGLE_OPT_IN", "CONFIRMED_OPT_IN"]
);

export const assignmentSourceEnum = customersSchema.enum("assignment_source", [
  "MANUAL",
  "RULE",
  "IMPORT",
  "SYSTEM",
]);

export const customerSegmentTypeEnum = customersSchema.enum(
  "customer_segment_type",
  ["MANUAL", "DYNAMIC"]
);

export const customerSegmentStatusEnum = customersSchema.enum(
  "customer_segment_status",
  ["DRAFT", "ACTIVE", "ARCHIVED"]
);

export const customerMergeStatusEnum = customersSchema.enum(
  "customer_merge_status",
  ["REQUESTED", "IN_PROGRESS", "COMPLETED", "FAILED"]
);

export const customerDataRequestTypeEnum = customersSchema.enum(
  "customer_data_request_type",
  ["ACCESS", "EXPORT", "CORRECTION", "ERASURE"]
);

export const customerDataRequestStatusEnum = customersSchema.enum(
  "customer_data_request_status",
  ["PENDING", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"]
);
