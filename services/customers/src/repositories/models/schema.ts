import { pgSchema } from "drizzle-orm/pg-core";

export const customersSchema = pgSchema("customers");

export const customerLifecycleStatusEnum = customersSchema.enum(
  "customer_lifecycle_status",
  ["active", "disabled", "merged", "redacted"]
);

export const customerAccountStatusEnum = customersSchema.enum(
  "customer_account_status",
  ["guest", "invited", "registered"]
);

export const addressValidationStatusEnum = customersSchema.enum(
  "address_validation_status",
  ["unvalidated", "valid", "invalid"]
);

export const taxIdentifierStatusEnum = customersSchema.enum(
  "tax_identifier_status",
  ["unverified", "verified", "rejected", "expired"]
);

export const taxExemptionStatusEnum = customersSchema.enum(
  "tax_exemption_status",
  ["active", "expired", "revoked"]
);

export const consentChannelEnum = customersSchema.enum("consent_channel", [
  "email",
  "sms",
  "whatsapp",
  "push",
]);

export const consentStateEnum = customersSchema.enum("consent_state", [
  "not_subscribed",
  "pending",
  "subscribed",
  "unsubscribed",
  "invalid",
  "redacted",
]);

export const consentOptInLevelEnum = customersSchema.enum(
  "consent_opt_in_level",
  ["unknown", "single_opt_in", "confirmed_opt_in"]
);

export const assignmentSourceEnum = customersSchema.enum("assignment_source", [
  "manual",
  "rule",
  "import",
  "system",
]);

export const customerSegmentTypeEnum = customersSchema.enum(
  "customer_segment_type",
  ["manual", "dynamic"]
);

export const customerSegmentStatusEnum = customersSchema.enum(
  "customer_segment_status",
  ["draft", "active", "archived"]
);

export const customerMergeStatusEnum = customersSchema.enum(
  "customer_merge_status",
  ["requested", "in_progress", "completed", "failed"]
);

export const customerDataRequestTypeEnum = customersSchema.enum(
  "customer_data_request_type",
  ["access", "export", "correction", "erasure"]
);

export const customerDataRequestStatusEnum = customersSchema.enum(
  "customer_data_request_status",
  ["pending", "processing", "completed", "rejected", "cancelled"]
);
