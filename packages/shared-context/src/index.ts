// Types
export type {
  ContextStore,
  ContextUser,
  ContextCustomer,
  UserError,
  GetCurrentUserResult,
  GetCurrentStoreResult,
} from "./types.js";

// Admin context middleware (for Inventory, Media, etc.)
export {
  buildAdminContextMiddleware,
  type AdminContextMiddlewareOptions,
} from "./adminContextMiddleware.js";

// Storefront context middleware (for Checkout, Orders, etc.)
export {
  buildStorefrontContextMiddleware,
  type StorefrontContextMiddlewareOptions,
} from "./storefrontContextMiddleware.js";
