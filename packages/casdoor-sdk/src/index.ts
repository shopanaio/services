export { CasdoorNodeClient } from "./client.js";
export type {
  CasdoorApiResponse,
  CasdoorHttpResult,
  CasdoorStatus,
  CookieJarLike,
  CookieStrategy,
  RequestContext,
} from "./types/api.js";
export type { CasdoorNodeClientConfig } from "./types/config.js";
export {
  CasdoorApiError,
  CasdoorHttpError,
  CasdoorInvalidResponseError,
} from "./http/errors.js";
export { ctxFromHeaders, applySetCookieHeader } from "./adapters/node.js";

// Re-export types from casdoor-nodejs-sdk
export type { User } from "casdoor-nodejs-sdk/lib/cjs/user";
export type { Role } from "casdoor-nodejs-sdk/lib/cjs/role";
export type { Token } from "casdoor-nodejs-sdk/lib/cjs/token";
export type { Application } from "casdoor-nodejs-sdk/lib/cjs/application";
export type { Organization } from "casdoor-nodejs-sdk/lib/cjs/organization";
export type { Permission } from "casdoor-nodejs-sdk/lib/cjs/permission";
export type { Config as SdkConfig } from "casdoor-nodejs-sdk/lib/cjs/config";
export { SDK } from "casdoor-nodejs-sdk";
