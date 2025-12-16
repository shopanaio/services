/**
 * Re-export types from @shopana/casdoor-node-sdk
 */
export type {
  User as CasdoorUser,
  AuthConfig as CasdoorConfig,
  Response as CasdoorResponse,
  OAuth2Token,
  Claims as CasdoorJwtClaims,
} from "@shopana/casdoor-node-sdk";

export type { GetPaginationUsersInput } from "./sdk.js";
export type { SignInInput, OAuth2ProviderSignUpInput } from "./login.js";

/**
 * Configuration for Casdoor client
 */
export interface CasdoorClientConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  organizationName: string;
  applicationName: string;
  certificate?: string;
}
