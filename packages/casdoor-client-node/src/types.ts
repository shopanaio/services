// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// TypeScript port of casdoor-go-sdk v1.5.0 types

/**
 * AuthConfig is the core configuration.
 * The first step to use this SDK is to use the InitConfig function to initialize the global authConfig.
 */
export interface AuthConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  certificate: string;
  organizationName: string;
  applicationName: string;
}

/**
 * Response from Casdoor API
 */
export interface Response<T = unknown> {
  status: string;
  msg: string;
  data: T;
  data2: unknown;
}

/**
 * ManagedAccount
 */
export interface ManagedAccount {
  application: string;
  username: string;
  password: string;
  signinUrl: string;
}

/**
 * MfaProps
 */
export interface MfaProps {
  enabled: boolean;
  isPreferred: boolean;
  mfaType: string;
  secret?: string;
  countryCode?: string;
  url?: string;
  recoveryCodes?: string[];
}

/**
 * Userinfo (OIDC claims)
 */
export interface Userinfo {
  sub: string;
  iss: string;
  aud: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  picture?: string;
  address?: string;
  phone?: string;
  groups?: string[];
}

/**
 * User has the same definition as https://github.com/casdoor/casdoor/blob/master/object/user.go#L24
 */
export interface User {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;

  id: string;
  externalId: string;
  type: string;
  password: string;
  passwordSalt: string;
  passwordType: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatar: string;
  avatarType: string;
  permanentAvatar: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  countryCode: string;
  region: string;
  location: string;
  address: string[];
  affiliation: string;
  title: string;
  idCardType: string;
  idCard: string;
  homepage: string;
  bio: string;
  tag: string;
  language: string;
  gender: string;
  birthday: string;
  education: string;
  score: number;
  karma: number;
  ranking: number;
  isDefaultAvatar: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  isForbidden: boolean;
  isDeleted: boolean;
  signupApplication: string;
  hash: string;
  preHash: string;
  accessKey: string;
  accessSecret: string;

  createdIp: string;
  lastSigninTime: string;
  lastSigninIp: string;

  // OAuth providers
  github: string;
  google: string;
  qq: string;
  wechat: string;
  facebook: string;
  dingtalk: string;
  weibo: string;
  gitee: string;
  linkedin: string;
  wecom: string;
  lark: string;
  gitlab: string;
  adfs: string;
  baidu: string;
  alipay: string;
  casdoor: string;
  infoflow: string;
  apple: string;
  azuread: string;
  slack: string;
  steam: string;
  bilibili: string;
  okta: string;
  douyin: string;
  line: string;
  amazon: string;
  auth0: string;
  battlenet: string;
  bitbucket: string;
  box: string;
  cloudfoundry: string;
  dailymotion: string;
  deezer: string;
  digitalocean: string;
  discord: string;
  dropbox: string;
  eveonline: string;
  fitbit: string;
  gitea: string;
  heroku: string;
  influxcloud: string;
  instagram: string;
  intercom: string;
  kakao: string;
  lastfm: string;
  mailru: string;
  meetup: string;
  microsoftonline: string;
  naver: string;
  nextcloud: string;
  onedrive: string;
  oura: string;
  patreon: string;
  paypal: string;
  salesforce: string;
  shopify: string;
  soundcloud: string;
  spotify: string;
  strava: string;
  stripe: string;
  tiktok: string;
  tumblr: string;
  twitch: string;
  twitter: string;
  typetalk: string;
  uber: string;
  vk: string;
  wepay: string;
  xero: string;
  yahoo: string;
  yammer: string;
  yandex: string;
  zoom: string;
  metamask: string;
  web3onboard: string;
  custom: string;

  preferredMfaType: string;
  recoveryCodes: string[];
  totpSecret: string;
  mfaPhoneEnabled: boolean;
  mfaEmailEnabled: boolean;

  ldap: string;
  properties: { [key: string]: string };

  roles: Role[];
  permissions: Permission[];
  groups: string[];

  lastSigninWrongTime: string;
  signinWrongTimes: number;

  managedAccounts: ManagedAccount[];
  needUpdatePassword: boolean;
}

/**
 * Role has the same definition as https://github.com/casdoor/casdoor/blob/master/object/role.go#L24
 */
export interface Role {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];
  isEnabled: boolean;
}

/**
 * Permission
 */
export interface Permission {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  users: string[];
  groups: string[];
  roles: string[];
  domains: string[];

  model: string;
  adapter: string;
  resourceType: string;
  resources: string[];
  actions: string[];
  effect: string;
  isEnabled: boolean;

  submitter: string;
  approver: string;
  approveTime: string;
  state: string;
}

/**
 * AccountItem
 */
export interface AccountItem {
  name: string;
  visible: boolean;
  viewRule: string;
  modifyRule: string;
}

/**
 * ThemeData
 */
export interface ThemeData {
  themeType: string;
  colorPrimary: string;
  borderRadius: number;
  isCompact: boolean;
  isEnabled: boolean;
}

/**
 * MfaItem
 */
export interface MfaItem {
  name: string;
  rule: string;
}

/**
 * Organization has the same definition as https://github.com/casdoor/casdoor/blob/master/object/organization.go#L25
 */
export interface Organization {
  owner: string;
  name: string;
  createdTime: string;

  displayName: string;
  websiteUrl: string;
  logo: string;
  logoDark: string;
  favicon: string;
  passwordType: string;
  passwordSalt: string;
  passwordOptions: string[];
  passwordObfuscatorType: string;
  passwordObfuscatorKey: string;
  countryCodes: string[];
  defaultAvatar: string;
  defaultApplication: string;
  tags: string[];
  languages: string[];
  themeData: ThemeData | null;
  masterPassword: string;
  defaultPassword: string;
  masterVerificationCode: string;
  ipWhitelist: string;
  initScore: number;
  enableSoftDeletion: boolean;
  isProfilePublic: boolean;
  useEmailAsUsername: boolean;
  enableTour: boolean;
  ipRestriction: string;

  mfaItems: MfaItem[];
  accountItems: AccountItem[];
}

/**
 * ProviderItem
 */
export interface ProviderItem {
  owner: string;
  name: string;

  canSignUp: boolean;
  canSignIn: boolean;
  canUnlink: boolean;
  prompted: boolean;
  alertType: string;
  rule: string;
  provider: Provider | null;
}

/**
 * SignupItem
 */
export interface SignupItem {
  name: string;
  visible: boolean;
  required: boolean;
  prompted: boolean;
  customCss: string;
  label: string;
  placeholder: string;
  regex: string;
  rule: string;
}

/**
 * SigninMethod
 */
export interface SigninMethod {
  name: string;
  displayName: string;
  rule: string;
}

/**
 * SigninItem
 */
export interface SigninItem {
  name: string;
  visible: boolean;
  label: string;
  customCss: string;
  placeholder: string;
  rule: string;
  isCustom: boolean;
}

/**
 * SamlItem
 */
export interface SamlItem {
  name: string;
  nameFormat: string;
  value: string;
}

/**
 * Application has the same definition as https://github.com/casdoor/casdoor/blob/master/object/application.go#L61
 */
export interface Application {
  owner: string;
  name: string;
  createdTime: string;

  displayName: string;
  logo: string;
  homepageUrl: string;
  description: string;
  organization: string;
  cert: string;
  headerHtml: string;
  enablePassword: boolean;
  enableSignUp: boolean;
  enableSigninSession: boolean;
  enableAutoSignin: boolean;
  enableCodeSignin: boolean;
  enableSamlCompress: boolean;
  enableSamlC14n10: boolean;
  enableSamlPostBinding: boolean;
  useEmailAsSamlNameId: boolean;
  enableWebAuthn: boolean;
  enableLinkWithEmail: boolean;
  orgChoiceMode: string;
  samlReplyUrl: string;
  providers: ProviderItem[];
  signinMethods: SigninMethod[];
  signupItems: SignupItem[];
  signinItems: SigninItem[];
  grantTypes: string[];
  organizationObj: Organization | null;
  certPublicKey: string;
  tags: string[];
  samlAttributes: SamlItem[];
  isShared: boolean;

  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  tokenFormat: string;
  tokenSigningMethod: string;
  tokenFields: string[];
  expireInHours: number;
  refreshExpireInHours: number;
  signupUrl: string;
  signinUrl: string;
  forgetUrl: string;
  affiliationUrl: string;
  termsOfUse: string;
  signupHtml: string;
  signinHtml: string;
  themeData: ThemeData | null;
  footerHtml: string;
  formCss: string;
  formCssMobile: string;
  formOffset: number;
  formSideHtml: string;
  formBackgroundUrl: string;

  failedSigninLimit: number;
  failedSigninFrozenTime: number;

  certObj: Cert | null;
}

/**
 * Cert has the same definition as https://github.com/casdoor/casdoor/blob/master/object/cert.go#L24
 */
export interface Cert {
  owner: string;
  name: string;
  createdTime: string;

  displayName: string;
  scope: string;
  type: string;
  cryptoAlgorithm: string;
  bitSize: number;
  expireInYears: number;

  certificate: string;
  privateKey: string;
  authorityPublicKey: string;
  authorityRootPublicKey: string;
}

/**
 * Provider
 */
export interface Provider {
  owner: string;
  name: string;
  createdTime: string;

  displayName: string;
  category: string;
  type: string;
  subType: string;
  method: string;
  clientId: string;
  clientSecret: string;
  clientId2: string;
  clientSecret2: string;
  cert: string;
  customAuthUrl: string;
  customTokenUrl: string;
  customUserInfoUrl: string;
  customLogo: string;
  scopes: string;
  userMapping: { [key: string]: string };

  host: string;
  port: number;
  disableSsl: boolean;
  title: string;
  content: string;
  receiver: string;

  regionId: string;
  signName: string;
  templateCode: string;
  appId: string;

  endpoint: string;
  intranetEndpoint: string;
  domain: string;
  bucket: string;
  pathPrefix: string;

  metadata: string;
  idP: string;
  issuerUrl: string;
  enableSignAuthnRequest: boolean;

  providerUrl: string;
}

/**
 * Token has the same definition as https://github.com/casdoor/casdoor/blob/master/object/token.go#L45
 */
export interface Token {
  owner: string;
  name: string;
  createdTime: string;

  application: string;
  organization: string;
  user: string;

  code: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
  codeChallenge: string;
  codeIsUsed: boolean;
  codeExpireIn: number;
}

/**
 * IntrospectTokenResult
 */
export interface IntrospectTokenResult {
  active: boolean;
  client_id: string;
  username: string;
  token_type: string;
  exp: number;
  iat: number;
  nbf: number;
  sub: string;
  aud: string[];
  iss: string;
  jti: string;
}

/**
 * Resource has the same definition as https://github.com/casdoor/casdoor/blob/master/object/resource.go#L24
 */
export interface Resource {
  owner: string;
  name: string;
  createdTime: string;

  user: string;
  provider: string;
  application: string;
  tag: string;
  parent: string;
  fileName: string;
  fileType: string;
  fileFormat: string;
  fileSize: number;
  url: string;
  description: string;
}

/**
 * Session
 */
export interface Session {
  owner: string;
  name: string;
  createdTime: string;

  application: string;
  sessionId: string[];
}

/**
 * Group
 */
export interface Group {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;

  displayName: string;
  manager: string;
  contactEmail: string;
  type: string;
  parentId: string;
  isTopGroup: boolean;
  users: User[];

  title: string;
  key: string;
  children: Group[];

  isEnabled: boolean;
}

/**
 * Adapter
 */
export interface Adapter {
  owner: string;
  name: string;
  createdTime: string;

  table: string;
  useSameDb: boolean;
  type: string;
  databaseType: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;

  isEnabled: boolean;
}

/**
 * Enforcer
 */
export interface Enforcer {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  displayName: string;
  description: string;

  model: string;
  adapter: string;

  isEnabled: boolean;
}

/**
 * Model (Casbin model)
 */
export interface Model {
  owner: string;
  name: string;
  createdTime: string;
  updatedTime: string;
  displayName: string;
  description: string;

  modelText: string;

  isEnabled: boolean;
}

/**
 * CasbinRule
 */
export interface CasbinRule {
  id: number;
  ptype: string;
  v0: string;
  v1: string;
  v2: string;
  v3: string;
  v4: string;
  v5: string;
}

/**
 * Product
 */
export interface Product {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  image: string;
  detail: string;
  tag: string;
  currency: string;
  price: number;
  quantity: number;
  sold: number;

  providers: string[];
  returnUrl: string;

  state: string;

  providerObjs: Provider[];
}

/**
 * Payment
 */
export interface Payment {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;

  provider: string;
  type: string;
  productName: string;
  productDisplayName: string;
  detail: string;
  tag: string;
  currency: string;
  price: number;
  returnUrl: string;
  user: string;
  personName: string;
  personIdCard: string;
  personEmail: string;
  personPhone: string;

  invoiceType: string;
  invoiceTitle: string;
  invoiceTaxId: string;
  invoiceRemark: string;
  invoiceUrl: string;
  outOrderId: string;
  payUrl: string;

  state: string;
  message: string;
}

/**
 * Plan
 */
export interface Plan {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  pricePerMonth: number;
  pricePerYear: number;
  currency: string;

  isEnabled: boolean;

  role: string;
  options: string[];
}

/**
 * Pricing
 */
export interface Pricing {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  plans: string[];
  isEnabled: boolean;
  trialDuration: number;
  application: string;
}

/**
 * Subscription
 */
export interface Subscription {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;
  description: string;

  user: string;
  pricing: string;
  plan: string;
  payment: string;
  startTime: string;
  endTime: string;

  period: string;
  state: string;
}

/**
 * Syncer
 */
export interface Syncer {
  owner: string;
  name: string;
  createdTime: string;

  organization: string;
  type: string;

  host: string;
  port: number;
  user: string;
  password: string;
  databaseType: string;
  database: string;
  table: string;
  tablePrimaryKey: string;
  tableColumns: TableColumn[];
  affiliationTable: string;
  avatarBaseUrl: string;
  errorText: string;
  syncInterval: number;

  isReadOnly: boolean;
  isEnabled: boolean;
}

/**
 * TableColumn
 */
export interface TableColumn {
  name: string;
  type: string;
  casdoorName: string;
  isKey: boolean;
  isHashed: boolean;
  values: string[];
}

/**
 * Transaction
 */
export interface Transaction {
  owner: string;
  name: string;
  createdTime: string;
  displayName: string;

  provider: string;
  category: string;
  type: string;
  productName: string;
  productDisplayName: string;
  detail: string;
  tag: string;
  currency: string;
  amount: number;
  returnUrl: string;
  user: string;
  application: string;
  payment: string;

  state: string;
}

/**
 * Webhook
 */
export interface Webhook {
  owner: string;
  name: string;
  createdTime: string;

  organization: string;
  type: string;

  host: string;
  port: number;
  user: string;
  password: string;
  databaseType: string;
  database: string;
  table: string;

  isUserExtended: boolean;
  isReadOnly: boolean;
  isEnabled: boolean;
}

/**
 * CasdoorRecord (audit log)
 * Named CasdoorRecord to avoid conflict with TypeScript's built-in Record type
 */
export interface CasdoorRecord {
  id: number;
  owner: string;
  name: string;
  createdTime: string;

  organization: string;
  clientIp: string;
  user: string;
  method: string;
  requestUri: string;
  action: string;

  object: string;
  extendedUser: User | null;

  isTriggered: boolean;
}

/**
 * Claims (JWT claims including user data)
 */
export interface Claims {
  // User data embedded
  user: User;
  accessToken: string;
  // JWT standard claims
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  // Casdoor-specific
  tokenType: string;
  TokenType: string; // RefreshTokenType in Go
}

/**
 * OAuth2Token
 */
export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  expiry?: Date;
}
