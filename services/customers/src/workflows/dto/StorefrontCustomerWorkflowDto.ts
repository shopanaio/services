import type {
  StorefrontCustomerAddressCreateParams,
  StorefrontCustomerAddressCreateResult,
  StorefrontCustomerAddressDefaultSetParams,
  StorefrontCustomerAddressDefaultSetResult,
  StorefrontCustomerAddressDeleteParams,
  StorefrontCustomerAddressDeleteResult,
  StorefrontCustomerAddressUpdateParams,
  StorefrontCustomerAddressUpdateResult,
  StorefrontCustomerDataRequestCancelParams,
  StorefrontCustomerDataRequestCancelResult,
  StorefrontCustomerDataRequestCreateParams,
  StorefrontCustomerDataRequestCreateResult,
  StorefrontCustomerMarketingConsentUpdateParams,
  StorefrontCustomerMarketingConsentUpdateResult,
  StorefrontCustomerTaxIdentifierCreateParams,
  StorefrontCustomerTaxIdentifierCreateResult,
  StorefrontCustomerTaxIdentifierDeleteParams,
  StorefrontCustomerTaxIdentifierDeleteResult,
  StorefrontCustomerTaxIdentifierUpdateParams,
  StorefrontCustomerTaxIdentifierUpdateResult,
  StorefrontCustomerUpdateParams,
  StorefrontCustomerUpdateResult,
} from "../../scripts/storefront/index.js";

export interface StorefrontCustomerWorkflowContext {
  organizationId: string;
  storeId: string;
  customerId: string;
  locale?: string;
  locales: string[];
  requestId: string;
}

export interface StorefrontCustomerUpdateWorkflowInput {
  params: Omit<StorefrontCustomerUpdateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerUpdateWorkflowResult = StorefrontCustomerUpdateResult;

export interface StorefrontCustomerAddressCreateWorkflowInput {
  params: Omit<StorefrontCustomerAddressCreateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerAddressCreateWorkflowResult = StorefrontCustomerAddressCreateResult;

export interface StorefrontCustomerAddressUpdateWorkflowInput {
  params: Omit<StorefrontCustomerAddressUpdateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerAddressUpdateWorkflowResult = StorefrontCustomerAddressUpdateResult;

export interface StorefrontCustomerAddressDeleteWorkflowInput {
  params: Omit<StorefrontCustomerAddressDeleteParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerAddressDeleteWorkflowResult = StorefrontCustomerAddressDeleteResult;

export interface StorefrontCustomerAddressDefaultSetWorkflowInput {
  params: Omit<StorefrontCustomerAddressDefaultSetParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerAddressDefaultSetWorkflowResult =
  StorefrontCustomerAddressDefaultSetResult;

export interface StorefrontCustomerMarketingConsentUpdateWorkflowInput {
  params: Omit<StorefrontCustomerMarketingConsentUpdateParams, "customerId" | "requestId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerMarketingConsentUpdateWorkflowResult =
  StorefrontCustomerMarketingConsentUpdateResult;

export interface StorefrontCustomerDataRequestCreateWorkflowInput {
  params: Omit<StorefrontCustomerDataRequestCreateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerDataRequestCreateWorkflowResult =
  StorefrontCustomerDataRequestCreateResult;

export interface StorefrontCustomerDataRequestCancelWorkflowInput {
  params: Omit<StorefrontCustomerDataRequestCancelParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerDataRequestCancelWorkflowResult =
  StorefrontCustomerDataRequestCancelResult;

export interface StorefrontCustomerTaxIdentifierCreateWorkflowInput {
  params: Omit<StorefrontCustomerTaxIdentifierCreateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerTaxIdentifierCreateWorkflowResult =
  StorefrontCustomerTaxIdentifierCreateResult;

export interface StorefrontCustomerTaxIdentifierUpdateWorkflowInput {
  params: Omit<StorefrontCustomerTaxIdentifierUpdateParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerTaxIdentifierUpdateWorkflowResult =
  StorefrontCustomerTaxIdentifierUpdateResult;

export interface StorefrontCustomerTaxIdentifierDeleteWorkflowInput {
  params: Omit<StorefrontCustomerTaxIdentifierDeleteParams, "customerId">;
  context: StorefrontCustomerWorkflowContext;
}
export type StorefrontCustomerTaxIdentifierDeleteWorkflowResult =
  StorefrontCustomerTaxIdentifierDeleteResult;
