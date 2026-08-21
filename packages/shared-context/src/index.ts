// Types
export type {
  ContextStore,
  ContextUser,
  ContextCustomer,
  UserError,
  GetCurrentUserResult,
  GetCurrentStoreResult,
} from "./types.js";
export { REQUEST_TIMESTAMP_HEADER, resolveRequestTimestamp } from "./requestTimestamp.js";

// Admin context middleware (for Inventory, Media, etc.)
export {
  buildAdminContextMiddleware,
  type AdminContextMiddlewareOptions,
} from "./adminContextMiddleware.js";
export * from "./adminAccessContext.js";

// Storefront context middleware (for Checkout, Orders, etc.)
export {
  buildStorefrontContextMiddleware,
  type StorefrontContextMiddlewareOptions,
} from "./storefrontContextMiddleware.js";
export * from "./storefrontPermissions.js";
export * from "./storefrontAccessContext.js";
