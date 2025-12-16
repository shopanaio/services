/**
 * Casdoor configuration interface
 */
export interface CasdoorConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  applicationName: string;
  organizationName: string;
  certificate?: string;
  googleProvider?: string;
  oauthRedirectUri?: string;
}

/**
 * Response status constants
 */
export const StatusOk = "ok";
export const ResponseTypeCode = "code";
export const ResponseTypeToken = "token";
export const MethodSignIn = "signin";
export const MethodSignUp = "signup";
export const SignInMethodPassword = "Password";

/**
 * Casdoor API response
 */
export interface CasdoorResponse<T = unknown> {
  status: string;
  msg: string;
  data?: T;
  data2?: unknown;
}

/**
 * Casdoor user
 */
export interface CasdoorUser {
  owner: string;
  name: string;
  id: string;
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  type: string;
  createdTime: string;
  updatedTime: string;
  isAdmin: boolean;
  isDeleted: boolean;
  signupApplication: string;
  properties?: Record<string, string>;
}

/**
 * Sign in input
 */
export interface SignInInput {
  organization: string;
  email: string;
  password: string;
  application: string;
}

/**
 * Sign in payload sent to Casdoor
 */
export interface SignInPayload {
  application: string;
  autoSignin: boolean;
  organization: string;
  password: string;
  signinMethod: string;
  type: string;
  username: string;
}

/**
 * OAuth2 provider sign up input
 */
export interface OAuth2ProviderSignUpInput {
  provider: string;
  code: string;
  application: string;
  redirectUri: string;
}

/**
 * OAuth2 provider payload
 */
export interface OAuth2ProviderPayload {
  type: string;
  application: string;
  provider: string;
  code: string;
  state: string;
  redirectUri: string;
  method: string;
}

/**
 * Get pagination users input
 */
export interface GetPaginationUsersInput {
  owner: string;
  page: number;
  pageSize: number;
  field?: string;
  value?: string;
  sortField?: string;
  sortOrder?: string;
}

/**
 * OAuth2 token response
 */
export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  expiry?: Date;
}

/**
 * JWT claims from Casdoor
 */
export interface CasdoorJwtClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  email?: string;
}
