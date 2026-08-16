import type {
  WishlistCreateParams,
  WishlistCreateResult,
  WishlistDeleteParams,
  WishlistDeleteResult,
  WishlistProductAddParams,
  WishlistProductAddResult,
  WishlistProductRemoveParams,
  WishlistProductRemoveResult,
  WishlistUpdateParams,
  WishlistUpdateResult,
} from "../../scripts/wishlist/index.js";

export interface WishlistWorkflowContext {
  organizationId: string;
  storeId: string;
  customerId: string;
  locale?: string;
  requestId: string;
}

export interface WishlistCreateWorkflowInput {
  params: Omit<WishlistCreateParams, "customerId">;
  context: WishlistWorkflowContext;
}
export type WishlistCreateWorkflowResult = WishlistCreateResult;

export interface WishlistUpdateWorkflowInput {
  params: Omit<WishlistUpdateParams, "customerId">;
  context: WishlistWorkflowContext;
}
export type WishlistUpdateWorkflowResult = WishlistUpdateResult;

export interface WishlistDeleteWorkflowInput {
  params: Omit<WishlistDeleteParams, "customerId">;
  context: WishlistWorkflowContext;
}
export type WishlistDeleteWorkflowResult = WishlistDeleteResult;

export interface WishlistProductAddWorkflowInput {
  params: Omit<WishlistProductAddParams, "customerId">;
  context: WishlistWorkflowContext;
}
export type WishlistProductAddWorkflowResult = WishlistProductAddResult;

export interface WishlistProductRemoveWorkflowInput {
  params: Omit<WishlistProductRemoveParams, "customerId">;
  context: WishlistWorkflowContext;
}
export type WishlistProductRemoveWorkflowResult = WishlistProductRemoveResult;
