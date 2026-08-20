export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** Stable identifier of a catalog-owned authentication method. */
  ApplicationAuthMethodId: { input: any; output: any };
  BigInt: { input: number; output: number };
  /** Calendar date in ISO 8601 YYYY-MM-DD form. */
  Date: { input: any; output: any };
  /** An ISO 8601 date-time string. */
  DateTime: { input: string; output: string };
  /** Valid email address */
  Email: { input: string; output: string };
  /** An arbitrary JSON value. */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown> };
  /** Unix timestamp in milliseconds */
  Timestamp: { input: string; output: string };
  TransportOptions: { input: unknown; output: unknown };
  Upload: { input: File; output: File };
  join__FieldSet: { input: any; output: any };
  link__Import: { input: any; output: any };
};

/**
 * Action level for permissions.
 * Hierarchy: read < write < admin
 * - admin includes write and read
 * - write includes read
 */
export enum Action {
  Admin = "admin",
  Read = "read",
  Write = "write",
}

export type ApiApiKey = {
  __typename?: "ApiKey";
  id: Scalars["ID"]["output"];
};

/** How a capability is selected for execution. */
export enum AppCapabilityAssignmentMode {
  Resource = "RESOURCE",
  Store = "STORE",
}

/** State of the route assignment used to resolve a capability. */
export enum AppCapabilityAssignmentStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
}

/** A concrete capability route contributed by an installed App. */
export type ApiAppCapabilityBinding = ApiNode & {
  __typename?: "AppCapabilityBinding";
  assignmentMode: AppCapabilityAssignmentMode;
  assignmentStatus?: Maybe<AppCapabilityAssignmentStatus>;
  capability: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  operation: Scalars["String"]["output"];
  precedence?: Maybe<Scalars["Int"]["output"]>;
  status: AppCapabilityBindingStatus;
  targetAction: Scalars["String"]["output"];
  targetAppCode: Scalars["String"]["output"];
};

/** State of a capability route owned by an installation. */
export enum AppCapabilityBindingStatus {
  Active = "ACTIVE",
  Deprecated = "DEPRECATED",
  Inactive = "INACTIVE",
  Maintenance = "MAINTENANCE",
}

/** A capability declared by an App manifest. */
export type ApiAppCapabilityDefinition = {
  __typename?: "AppCapabilityDefinition";
  assignmentMode: AppCapabilityAssignmentMode;
  key: Scalars["String"]["output"];
  operations: Array<ApiAppCapabilityOperation>;
};

/** One operation exposed by an App capability. */
export type ApiAppCapabilityOperation = {
  __typename?: "AppCapabilityOperation";
  /** The App action that implements the operation. */
  action: Scalars["String"]["output"];
  /** The operation name used by platform callers. */
  name: Scalars["String"]["output"];
};

/** Input for changing installation configuration without a lifecycle update. */
export type ApiAppConfigureInput = {
  configuration: Scalars["JSON"]["input"];
  expectedConfigurationVersion: Scalars["Int"]["input"];
  /** Replaces the granted scopes when provided. */
  grantedScopes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  installationId: Scalars["ID"]["input"];
};

/** Payload returned after changing installation configuration. */
export type ApiAppConfigurePayload = {
  __typename?: "AppConfigurePayload";
  installation?: Maybe<ApiAppInstallation>;
  userErrors: Array<ApiGenericUserError>;
};

/** A Relay connection of bundled Apps. */
export type ApiAppConnection = {
  __typename?: "AppConnection";
  edges: Array<ApiAppEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** A bundled App that can be installed in a store. */
export type ApiAppDefinition = {
  __typename?: "AppDefinition";
  /** Capabilities declared by the bundled manifest. */
  capabilities: Array<ApiAppCapabilityDefinition>;
  /** Stable manifest code used to identify the App. */
  code: Scalars["String"]["output"];
  /** Human-readable App description. */
  description: Scalars["String"]["output"];
  /** Human-readable App name. */
  displayName: Scalars["String"]["output"];
  /** GraphQL surfaces declared by the bundled manifest. */
  graphql: ApiAppGraphQlSurfaces;
  /** App icon or logo used by Admin surfaces. */
  icon: ApiAppIcon;
  /** The current store installation, when one exists. */
  installation?: Maybe<ApiAppInstallation>;
  /** Whether this App has a non-terminal installation in the current store. */
  installed: Scalars["Boolean"]["output"];
  /** Permissions requested by the bundled manifest. */
  permissions: Array<ApiAppPermission>;
  /** Current runtime health, when the runtime can be checked. */
  runtimeHealth: ApiAppRuntimeHealth;
  /** Current process-local runtime state. */
  runtimeStatus: AppRuntimeStatus;
  /** Bundled semantic version. */
  version: Scalars["String"]["output"];
};

/** An edge in a bundled App connection. */
export type ApiAppEdge = {
  __typename?: "AppEdge";
  cursor: Scalars["String"]["output"];
  node: ApiAppDefinition;
};

/** GraphQL surfaces contributed by an App. */
export type ApiAppGraphQlSurfaces = {
  __typename?: "AppGraphQLSurfaces";
  admin: Scalars["Boolean"]["output"];
  storefront: Scalars["Boolean"]["output"];
};

/** Visual identity declared by an App manifest. */
export type ApiAppIcon = {
  __typename?: "AppIcon";
  /** Accessible alternative text. */
  alt: Scalars["String"]["output"];
  /** Same-origin or trusted image URL. */
  url: Scalars["String"]["output"];
};

/** Input for installing a bundled App in the current store. */
export type ApiAppInstallInput = {
  appCode: Scalars["String"]["input"];
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  configuration?: InputMaybe<Scalars["JSON"]["input"]>;
  grantedScopes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  secrets?: InputMaybe<Array<ApiAppSecretInput>>;
};

/** A bundled App installed in the current store. */
export type ApiAppInstallation = ApiNode & {
  __typename?: "AppInstallation";
  appCode: Scalars["String"]["output"];
  capabilities: Array<ApiAppCapabilityBinding>;
  configuration: Scalars["JSON"]["output"];
  configurationVersion: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  healthStatus: AppInstallationHealthStatus;
  id: Scalars["ID"]["output"];
  installedAt?: Maybe<Scalars["DateTime"]["output"]>;
  installedByUserId?: Maybe<Scalars["ID"]["output"]>;
  installedVersion?: Maybe<Scalars["String"]["output"]>;
  lastError?: Maybe<ApiAppInstallationError>;
  lifecycleOperations: ApiAppLifecycleOperationConnection;
  manifestHash?: Maybe<Scalars["String"]["output"]>;
  manifestSnapshots: ApiAppManifestSnapshotConnection;
  scopes: Array<ApiAppInstallationScope>;
  status: AppInstallationStatus;
  suspendedAt?: Maybe<Scalars["DateTime"]["output"]>;
  targetVersion?: Maybe<Scalars["String"]["output"]>;
  uninstalledAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

/** A bundled App installed in the current store. */
export type ApiAppInstallationLifecycleOperationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** A bundled App installed in the current store. */
export type ApiAppInstallationManifestSnapshotsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Input for a lifecycle action on an existing installation. */
export type ApiAppInstallationActionInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  installationId: Scalars["ID"]["input"];
};

/** The latest persisted App installation failure. */
export type ApiAppInstallationError = {
  __typename?: "AppInstallationError";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

/** Persisted health state of an App installation. */
export enum AppInstallationHealthStatus {
  Degraded = "DEGRADED",
  Healthy = "HEALTHY",
  Unhealthy = "UNHEALTHY",
  Unknown = "UNKNOWN",
}

/** A permission grant recorded for an App installation. */
export type ApiAppInstallationScope = {
  __typename?: "AppInstallationScope";
  granted: Scalars["Boolean"]["output"];
  grantedAt: Scalars["DateTime"]["output"];
  revokedAt?: Maybe<Scalars["DateTime"]["output"]>;
  scope: Scalars["String"]["output"];
};

/** Lifecycle state of an App installation. */
export enum AppInstallationStatus {
  Active = "ACTIVE",
  Installing = "INSTALLING",
  InstallFailed = "INSTALL_FAILED",
  PendingConsent = "PENDING_CONSENT",
  Resuming = "RESUMING",
  Suspended = "SUSPENDED",
  Suspending = "SUSPENDING",
  Uninstalled = "UNINSTALLED",
  Uninstalling = "UNINSTALLING",
  UninstallFailed = "UNINSTALL_FAILED",
  UpdateFailed = "UPDATE_FAILED",
  Updating = "UPDATING",
}

/** Actor that initiated an App lifecycle operation. */
export enum AppLifecycleActorType {
  Service = "SERVICE",
  System = "SYSTEM",
  User = "USER",
}

/** A durable App lifecycle operation. */
export type ApiAppLifecycleOperation = ApiNode & {
  __typename?: "AppLifecycleOperation";
  actorId?: Maybe<Scalars["String"]["output"]>;
  actorType: AppLifecycleActorType;
  completedAt?: Maybe<Scalars["DateTime"]["output"]>;
  correlationId?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  error?: Maybe<ApiAppLifecycleOperationError>;
  id: Scalars["ID"]["output"];
  installation: ApiAppInstallation;
  previousInstallationStatus?: Maybe<AppInstallationStatus>;
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: AppLifecycleOperationStatus;
  targetVersion: Scalars["String"]["output"];
  type: AppLifecycleOperationType;
  updatedAt: Scalars["DateTime"]["output"];
  workflowId: Scalars["String"]["output"];
};

/** A Relay connection of lifecycle operations. */
export type ApiAppLifecycleOperationConnection = {
  __typename?: "AppLifecycleOperationConnection";
  edges: Array<ApiAppLifecycleOperationEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** An edge in an App lifecycle operation connection. */
export type ApiAppLifecycleOperationEdge = {
  __typename?: "AppLifecycleOperationEdge";
  cursor: Scalars["String"]["output"];
  node: ApiAppLifecycleOperation;
};

/** Failure recorded for an App lifecycle operation. */
export type ApiAppLifecycleOperationError = {
  __typename?: "AppLifecycleOperationError";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

/** Execution state of an App lifecycle operation. */
export enum AppLifecycleOperationStatus {
  Failed = "FAILED",
  Pending = "PENDING",
  Running = "RUNNING",
  Succeeded = "SUCCEEDED",
}

/** Type of an App lifecycle operation. */
export enum AppLifecycleOperationType {
  Install = "INSTALL",
  Resume = "RESUME",
  Suspend = "SUSPEND",
  Uninstall = "UNINSTALL",
  Update = "UPDATE",
}

/** Payload returned after accepting a lifecycle operation. */
export type ApiAppLifecyclePayload = {
  __typename?: "AppLifecyclePayload";
  /** Whether an earlier request with the same client mutation ID was reused. */
  duplicate: Scalars["Boolean"]["output"];
  installation?: Maybe<ApiAppInstallation>;
  operation?: Maybe<ApiAppLifecycleOperation>;
  userErrors: Array<ApiGenericUserError>;
};

/** An immutable manifest snapshot used by a lifecycle operation. */
export type ApiAppManifestSnapshot = ApiNode & {
  __typename?: "AppManifestSnapshot";
  appCode: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  manifest: Scalars["JSON"]["output"];
  manifestHash: Scalars["String"]["output"];
  version: Scalars["String"]["output"];
};

/** A Relay connection of App manifest snapshots. */
export type ApiAppManifestSnapshotConnection = {
  __typename?: "AppManifestSnapshotConnection";
  edges: Array<ApiAppManifestSnapshotEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** An edge in an App manifest snapshot connection. */
export type ApiAppManifestSnapshotEdge = {
  __typename?: "AppManifestSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: ApiAppManifestSnapshot;
};

/** Ordering configuration for App */
export type ApiAppOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: AppOrderField;
};

/** Fields available for sorting App */
export enum AppOrderField {
  /** Sort by capabilities */
  Capabilities = "capabilities",
  /** Sort by code */
  Code = "code",
  /** Sort by displayName */
  DisplayName = "displayName",
  /** Sort by installed */
  Installed = "installed",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by version */
  Version = "version",
}

/** A permission requested by an App manifest. */
export type ApiAppPermission = {
  __typename?: "AppPermission";
  /** Whether the permission is granted to the current installation. */
  granted: Scalars["Boolean"]["output"];
  scope: Scalars["String"]["output"];
};

/** The health check result for a bundled App runtime. */
export type ApiAppRuntimeHealth = {
  __typename?: "AppRuntimeHealth";
  message?: Maybe<Scalars["String"]["output"]>;
  status: AppRuntimeHealthStatus;
};

/** Health reported by a ready App runtime. */
export enum AppRuntimeHealthStatus {
  Degraded = "DEGRADED",
  Healthy = "HEALTHY",
  Unhealthy = "UNHEALTHY",
}

/** Runtime state of a bundled App. */
export enum AppRuntimeStatus {
  Failed = "FAILED",
  Ready = "READY",
  Registered = "REGISTERED",
  Starting = "STARTING",
  Stopped = "STOPPED",
}

/** A write-only secret supplied during install or update. */
export type ApiAppSecretInput = {
  name: Scalars["String"]["input"];
  value: Scalars["String"]["input"];
};

/** Input for updating an App installation. */
export type ApiAppUpdateInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  configuration?: InputMaybe<Scalars["JSON"]["input"]>;
  /** Required when configuration is changed. */
  expectedConfigurationVersion?: InputMaybe<Scalars["Int"]["input"]>;
  /** Replaces the granted scopes when provided. */
  grantedScopes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  installationId: Scalars["ID"]["input"];
  /** Sets or rotates the named secrets without returning their values. */
  secrets?: InputMaybe<Array<ApiAppSecretInput>>;
};

/** Filter conditions for App */
export type ApiAppWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiAppWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiAppWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiAppWhereInput>>;
  /** Filter by capabilities */
  capabilities?: InputMaybe<ApiStringFilter>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<ApiStringFilter>;
  /** Filter by installed */
  installed?: InputMaybe<ApiBooleanFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by version */
  version?: InputMaybe<ApiStringFilter>;
};

/** An organization-owned application authentication realm. */
export type ApiApplication = ApiNode & {
  __typename?: "Application";
  /** Timestamp when the application was archived. */
  archivedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Authentication configuration for this application. */
  auth: ApiApplicationAuthConfiguration;
  /** Timestamp when the application was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Optional application description. */
  description?: Maybe<Scalars["String"]["output"]>;
  /** Human-readable application name. */
  displayName: Scalars["String"]["output"];
  /** Globally unique application identifier. */
  id: Scalars["ID"]["output"];
  /** Read-only resource lifecycle management metadata. */
  management: ApiResourceManagement;
  /** URL-friendly application name. */
  name: Scalars["String"]["output"];
  /** Find an OAuth client by its public client identifier. */
  oauthClient?: Maybe<ApiApplicationOAuthClient>;
  /** OAuth clients registered for this application. */
  oauthClients: ApiApplicationOAuthClientConnection;
  /** Organization that owns the application. */
  organization: ApiOrganization;
  /** Identifier of the organization that owns the application. */
  organizationId: Scalars["ID"]["output"];
  /** Immutable OAuth resource audience assigned by IAM. */
  resource: Scalars["String"]["output"];
  /** Current revision used for optimistic concurrency. */
  revision: Scalars["Int"]["output"];
  /** Current application lifecycle status. */
  status: ApplicationLifecycleStatus;
  /** Timestamp when the application was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Find a user within this application realm. */
  user?: Maybe<ApiApplicationUser>;
  /** Users registered within this application realm. */
  users: ApiApplicationUserConnection;
};

/** An organization-owned application authentication realm. */
export type ApiApplicationOauthClientArgs = {
  clientId: Scalars["String"]["input"];
};

/** An organization-owned application authentication realm. */
export type ApiApplicationOauthClientsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiApplicationOAuthClientOrderByInput>>;
  where?: InputMaybe<ApiApplicationOAuthClientWhereInput>;
};

/** An organization-owned application authentication realm. */
export type ApiApplicationUserArgs = {
  id: Scalars["ID"]["input"];
};

/** An organization-owned application authentication realm. */
export type ApiApplicationUsersArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiApplicationUserOrderByInput>>;
  where?: InputMaybe<ApiApplicationUserWhereInput>;
};

/** Input for archiving an application. */
export type ApiApplicationArchiveInput = {
  /** Application to archive. */
  applicationId: Scalars["ID"]["input"];
  /** Revision expected by the caller. */
  expectedRevision: Scalars["Int"]["input"];
  /** Organization that owns the application. */
  organizationId: Scalars["ID"]["input"];
};

/** Result of archiving an application. */
export type ApiApplicationArchivePayload = {
  __typename?: "ApplicationArchivePayload";
  application?: Maybe<ApiApplication>;
  userErrors: Array<ApiGenericUserError>;
};

/** Allowed background colors for hosted authentication UI. */
export enum ApplicationAuthBackgroundColor {
  Slate = "SLATE",
  White = "WHITE",
}

/** Branding values used by the hosted authentication UI. */
export type ApiApplicationAuthBranding = {
  __typename?: "ApplicationAuthBranding";
  backgroundColor?: Maybe<ApplicationAuthBackgroundColor>;
  displayName?: Maybe<Scalars["String"]["output"]>;
  headline?: Maybe<Scalars["String"]["output"]>;
  logoUrl?: Maybe<Scalars["String"]["output"]>;
  primaryColor?: Maybe<ApplicationAuthPrimaryColor>;
};

/** Branding values for the hosted authentication UI. */
export type ApiApplicationAuthBrandingInput = {
  backgroundColor?: InputMaybe<ApplicationAuthBackgroundColor>;
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  headline?: InputMaybe<Scalars["String"]["input"]>;
  logoUrl?: InputMaybe<Scalars["String"]["input"]>;
  primaryColor?: InputMaybe<ApplicationAuthPrimaryColor>;
};

/** Administrative authentication configuration of an application realm. */
export type ApiApplicationAuthConfiguration = {
  __typename?: "ApplicationAuthConfiguration";
  /** Access token lifetime in seconds. */
  accessTokenTtlSeconds: Scalars["Int"]["output"];
  /** Application that owns this configuration. */
  applicationId: Scalars["ID"]["output"];
  /** Find an authentication method by its catalog identifier. */
  authMethod: ApiApplicationAuthMethod;
  /** Authentication methods supported by the realm. */
  authMethods: Array<ApiApplicationAuthMethod>;
  /** Hosted authentication UI branding. */
  branding: ApiApplicationAuthBranding;
  /** Read-only consent policy enforced by the protocol version. */
  consentMode: ApplicationConsentMode;
  /** Timestamp when the configuration was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Default locale for hosted authentication UI and messages. */
  defaultLocale: LocaleCode;
  /** Email delivery configuration without credential values. */
  emailDelivery: ApiApplicationAuthEmailDeliveryConfiguration;
  /** Whether a verified email is required by the realm. */
  emailVerificationRequired: Scalars["Boolean"]["output"];
  /** ID token lifetime in seconds. */
  idTokenTtlSeconds: Scalars["Int"]["output"];
  /** Canonical OAuth 2.1 and OpenID Connect endpoint URLs. */
  protocolUrls: ApiApplicationAuthProtocolUrls;
  /** Find a social provider by its catalog name. */
  provider: ApiApplicationAuthProvider;
  /** Social providers supported by the realm. */
  providers: Array<ApiApplicationAuthProvider>;
  /** Whether the application realm accepts authentication traffic. */
  realmEnabled: Scalars["Boolean"]["output"];
  /** Refresh token lifetime in seconds. */
  refreshTokenTtlSeconds: Scalars["Int"]["output"];
  /** Registration policy for new application users. */
  registrationMode: ApplicationRegistrationMode;
  /** Current revision used for optimistic concurrency. */
  revision: Scalars["Int"]["output"];
  /** Application session lifetime in seconds. */
  sessionTtlSeconds: Scalars["Int"]["output"];
  /** Locales supported by the application realm. */
  supportedLocales: Array<LocaleCode>;
  /** Origins trusted by the application realm. */
  trustedOrigins: Array<ApiApplicationAuthTrustedOrigin>;
  /** Timestamp when the configuration was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

/** Administrative authentication configuration of an application realm. */
export type ApiApplicationAuthConfigurationAuthMethodArgs = {
  id: Scalars["ApplicationAuthMethodId"]["input"];
};

/** Administrative authentication configuration of an application realm. */
export type ApiApplicationAuthConfigurationProviderArgs = {
  name: ApplicationAuthProviderName;
};

/** Non-secret email delivery configuration for an application realm. */
export type ApiApplicationAuthEmailDeliveryConfiguration = {
  __typename?: "ApplicationAuthEmailDeliveryConfiguration";
  configured: Scalars["Boolean"]["output"];
  emailOtpSignInTemplateId?: Maybe<Scalars["String"]["output"]>;
  emailVerificationTemplateId?: Maybe<Scalars["String"]["output"]>;
  passwordResetTemplateId?: Maybe<Scalars["String"]["output"]>;
  senderIdentity?: Maybe<Scalars["String"]["output"]>;
  transportProfile?: Maybe<Scalars["String"]["output"]>;
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedBy?: Maybe<Scalars["ID"]["output"]>;
};

/** References to a preconfigured email transport and message templates. */
export type ApiApplicationAuthEmailDeliveryInput = {
  emailOtpSignInTemplateId: Scalars["String"]["input"];
  emailVerificationTemplateId: Scalars["String"]["input"];
  passwordResetTemplateId: Scalars["String"]["input"];
  senderIdentity: Scalars["String"]["input"];
  transportProfile: Scalars["String"]["input"];
};

/** Status and enabled capabilities of a catalog-owned authentication method. */
export type ApiApplicationAuthMethod = {
  __typename?: "ApplicationAuthMethod";
  availableCapabilities: Array<ApplicationAuthMethodCapability>;
  configured: Scalars["Boolean"]["output"];
  enabledCapabilities: Array<ApplicationAuthMethodCapability>;
  id: Scalars["ApplicationAuthMethodId"]["output"];
  revision: Scalars["Int"]["output"];
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedBy?: Maybe<Scalars["ID"]["output"]>;
};

/** Capability exposed by an authentication method. */
export enum ApplicationAuthMethodCapability {
  PasswordReset = "PASSWORD_RESET",
  SignIn = "SIGN_IN",
  SignUp = "SIGN_UP",
}

/** Result of updating an application authentication method. */
export type ApiApplicationAuthMethodPayload = {
  __typename?: "ApplicationAuthMethodPayload";
  authMethod?: Maybe<ApiApplicationAuthMethod>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating enabled capabilities of an authentication method. */
export type ApiApplicationAuthMethodUpdateInput = {
  applicationId: Scalars["ID"]["input"];
  enabledCapabilities: Array<ApplicationAuthMethodCapability>;
  expectedRevision: Scalars["Int"]["input"];
  methodId: Scalars["ApplicationAuthMethodId"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** Allowed primary colors for hosted authentication UI. */
export enum ApplicationAuthPrimaryColor {
  Blue = "BLUE",
  Emerald = "EMERALD",
  Indigo = "INDIGO",
  Violet = "VIOLET",
}

/** Canonical OAuth 2.1 and OpenID Connect URLs for an application realm. */
export type ApiApplicationAuthProtocolUrls = {
  __typename?: "ApplicationAuthProtocolUrls";
  authorizationUrl: Scalars["String"]["output"];
  endSessionUrl: Scalars["String"]["output"];
  issuer: Scalars["String"]["output"];
  jwksUrl: Scalars["String"]["output"];
  oauthAuthorizationServerMetadataUrl: Scalars["String"]["output"];
  oidcDiscoveryUrl: Scalars["String"]["output"];
  providerCallbackUrls: Array<ApiApplicationAuthProviderCallbackUrl>;
  revocationUrl: Scalars["String"]["output"];
  tokenUrl: Scalars["String"]["output"];
};

/** Non-secret status of a social authentication provider. */
export type ApiApplicationAuthProvider = {
  __typename?: "ApplicationAuthProvider";
  applicationId: Scalars["ID"]["output"];
  /** Exact callback URL computed by IAM. */
  callbackUrl: Scalars["String"]["output"];
  configured: Scalars["Boolean"]["output"];
  enabled: Scalars["Boolean"]["output"];
  /** Masked client identifier safe for administrative display. */
  maskedClientId?: Maybe<Scalars["String"]["output"]>;
  provider: ApplicationAuthProviderName;
  revision: Scalars["Int"]["output"];
  scopes: Array<Scalars["String"]["output"]>;
  supported: Scalars["Boolean"]["output"];
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedBy?: Maybe<Scalars["ID"]["output"]>;
};

/** Computed callback URL for a catalog-owned social provider. */
export type ApiApplicationAuthProviderCallbackUrl = {
  __typename?: "ApplicationAuthProviderCallbackUrl";
  provider: ApplicationAuthProviderName;
  url: Scalars["String"]["output"];
};

/** Input for configuring credentials and scopes of a social provider. */
export type ApiApplicationAuthProviderConfigureInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  clientSecret: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  provider: ApplicationAuthProviderName;
  scopes: Array<Scalars["String"]["input"]>;
};

/** Input for deleting credentials from a disabled social provider. */
export type ApiApplicationAuthProviderCredentialsDeleteInput = {
  applicationId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  provider: ApplicationAuthProviderName;
};

/** Input for replacing social provider credentials. */
export type ApiApplicationAuthProviderCredentialsRotateInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  clientSecret: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  provider: ApplicationAuthProviderName;
};

/** Social authentication providers supported by the code-owned catalog. */
export enum ApplicationAuthProviderName {
  Facebook = "FACEBOOK",
  Google = "GOOGLE",
}

/** Result of changing a social provider configuration. */
export type ApiApplicationAuthProviderPayload = {
  __typename?: "ApplicationAuthProviderPayload";
  provider?: Maybe<ApiApplicationAuthProvider>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating non-secret social provider settings. */
export type ApiApplicationAuthProviderUpdateInput = {
  applicationId: Scalars["ID"]["input"];
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  provider: ApplicationAuthProviderName;
  scopes?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Input for safely validating a social provider configuration. */
export type ApiApplicationAuthProviderValidateInput = {
  applicationId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  provider: ApplicationAuthProviderName;
};

/** Safe validation result for a social provider configuration. */
export type ApiApplicationAuthProviderValidation = {
  __typename?: "ApplicationAuthProviderValidation";
  checkedAt: Scalars["DateTime"]["output"];
  provider: ApplicationAuthProviderName;
  /** Stable non-secret reason code when validation did not succeed. */
  reasonCode?: Maybe<Scalars["String"]["output"]>;
  revision: Scalars["Int"]["output"];
  status: ApplicationAuthProviderValidationStatus;
};

/** Result of validating a social provider configuration. */
export type ApiApplicationAuthProviderValidationPayload = {
  __typename?: "ApplicationAuthProviderValidationPayload";
  userErrors: Array<ApiGenericUserError>;
  validation?: Maybe<ApiApplicationAuthProviderValidation>;
};

/** Result status of a safe provider configuration validation. */
export enum ApplicationAuthProviderValidationStatus {
  Invalid = "INVALID",
  Unavailable = "UNAVAILABLE",
  Valid = "VALID",
}

/** Input for enabling or disabling an application realm. */
export type ApiApplicationAuthRealmEnabledSetInput = {
  applicationId: Scalars["ID"]["input"];
  enabled: Scalars["Boolean"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** An exact origin trusted by an application realm. */
export type ApiApplicationAuthTrustedOrigin = {
  __typename?: "ApplicationAuthTrustedOrigin";
  createdAt: Scalars["DateTime"]["output"];
  origin: Scalars["String"]["output"];
};

/** Input for updating application authentication policy and presentation. */
export type ApiApplicationAuthUpdateInput = {
  accessTokenTtlSeconds?: InputMaybe<Scalars["Int"]["input"]>;
  applicationId: Scalars["ID"]["input"];
  branding?: InputMaybe<ApiApplicationAuthBrandingInput>;
  defaultLocale?: InputMaybe<LocaleCode>;
  emailDelivery?: InputMaybe<ApiApplicationAuthEmailDeliveryInput>;
  emailVerificationRequired?: InputMaybe<Scalars["Boolean"]["input"]>;
  expectedRevision: Scalars["Int"]["input"];
  idTokenTtlSeconds?: InputMaybe<Scalars["Int"]["input"]>;
  organizationId: Scalars["ID"]["input"];
  refreshTokenTtlSeconds?: InputMaybe<Scalars["Int"]["input"]>;
  registrationMode?: InputMaybe<ApplicationRegistrationMode>;
  sessionTtlSeconds?: InputMaybe<Scalars["Int"]["input"]>;
  trustedOrigins?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Result of updating application authentication configuration. */
export type ApiApplicationAuthUpdatePayload = {
  __typename?: "ApplicationAuthUpdatePayload";
  configuration?: Maybe<ApiApplicationAuthConfiguration>;
  userErrors: Array<ApiGenericUserError>;
};

/** A paginated connection of applications. */
export type ApiApplicationConnection = {
  __typename?: "ApplicationConnection";
  /** Application edges in the current page. */
  edges: Array<ApiApplicationEdge>;
  /** Information needed to continue pagination. */
  pageInfo: ApiPageInfo;
  /** Total number of applications matching the filter. */
  totalCount: Scalars["Int"]["output"];
};

/** Consent policy supported by the current protocol version. */
export enum ApplicationConsentMode {
  /** Authorization requires explicit user consent when consent is applicable. */
  Explicit = "EXPLICIT",
}

/** Input for creating an application. */
export type ApiApplicationCreateInput = {
  /** Optional application description. */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** Human-readable application name. */
  displayName: Scalars["String"]["input"];
  /** URL-friendly application name. */
  name: Scalars["String"]["input"];
  /** Organization that will own the application. */
  organizationId: Scalars["ID"]["input"];
};

/** Result of creating an application. */
export type ApiApplicationCreatePayload = {
  __typename?: "ApplicationCreatePayload";
  application?: Maybe<ApiApplication>;
  userErrors: Array<ApiGenericUserError>;
};

/** An application and its pagination cursor. */
export type ApiApplicationEdge = {
  __typename?: "ApplicationEdge";
  /** Opaque pagination cursor. */
  cursor: Scalars["String"]["output"];
  /** Application at the end of the edge. */
  node: ApiApplication;
};

/** Lifecycle status of an application realm. */
export enum ApplicationLifecycleStatus {
  /** The application is active. */
  Active = "ACTIVE",
  /** The application is archived and cannot be used for new authentication. */
  Archived = "ARCHIVED",
}

/** Application realm management mutations. */
export type ApiApplicationMutation = {
  __typename?: "ApplicationMutation";
  /** Archive an application realm. */
  applicationArchive: ApiApplicationArchivePayload;
  /** Update enabled capabilities of an authentication method. */
  applicationAuthMethodUpdate: ApiApplicationAuthMethodPayload;
  /** Configure credentials and scopes of a social provider. */
  applicationAuthProviderConfigure: ApiApplicationAuthProviderPayload;
  /** Delete credentials from a disabled social provider. */
  applicationAuthProviderCredentialsDelete: ApiApplicationAuthProviderPayload;
  /** Replace social provider credentials. */
  applicationAuthProviderCredentialsRotate: ApiApplicationAuthProviderPayload;
  /** Update non-secret social provider settings. */
  applicationAuthProviderUpdate: ApiApplicationAuthProviderPayload;
  /** Safely validate a social provider configuration. */
  applicationAuthProviderValidate: ApiApplicationAuthProviderValidationPayload;
  /** Enable or disable an application authentication realm. */
  applicationAuthRealmEnabledSet: ApiApplicationAuthUpdatePayload;
  /** Update application authentication policy and presentation. */
  applicationAuthUpdate: ApiApplicationAuthUpdatePayload;
  /** Create an application realm. */
  applicationCreate: ApiApplicationCreatePayload;
  /** Archive an OAuth client. */
  applicationOAuthClientArchive: ApiApplicationOAuthClientPayload;
  /** Create an OAuth client with fixed protocol policy. */
  applicationOAuthClientCreate: ApiApplicationOAuthClientCreatePayload;
  /** Enable or disable an OAuth client. */
  applicationOAuthClientEnabledSet: ApiApplicationOAuthClientPayload;
  /** Rotate a confidential OAuth client secret. */
  applicationOAuthClientSecretRotate: ApiApplicationOAuthClientSecretRotatePayload;
  /** Change first-party consent bypass policy for an OAuth client. */
  applicationOAuthClientSkipConsentSet: ApiApplicationOAuthClientPayload;
  /** Update mutable OAuth client metadata. */
  applicationOAuthClientUpdate: ApiApplicationOAuthClientPayload;
  /** Update application metadata. */
  applicationUpdate: ApiApplicationUpdatePayload;
  /** Unlink a login account from an application user. */
  applicationUserAccountUnlink: ApiApplicationUserAccountUnlinkPayload;
  /** Block an application user. */
  applicationUserBlock: ApiApplicationUserPayload;
  /** Revoke every active session of an application user. */
  applicationUserSessionsRevokeAll: ApiApplicationUserSessionsRevokeAllPayload;
  /** Unblock an application user. */
  applicationUserUnblock: ApiApplicationUserPayload;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationArchiveArgs = {
  input: ApiApplicationArchiveInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthMethodUpdateArgs = {
  input: ApiApplicationAuthMethodUpdateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthProviderConfigureArgs = {
  input: ApiApplicationAuthProviderConfigureInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthProviderCredentialsDeleteArgs = {
  input: ApiApplicationAuthProviderCredentialsDeleteInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthProviderCredentialsRotateArgs = {
  input: ApiApplicationAuthProviderCredentialsRotateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthProviderUpdateArgs = {
  input: ApiApplicationAuthProviderUpdateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthProviderValidateArgs = {
  input: ApiApplicationAuthProviderValidateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthRealmEnabledSetArgs = {
  input: ApiApplicationAuthRealmEnabledSetInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationAuthUpdateArgs = {
  input: ApiApplicationAuthUpdateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationCreateArgs = {
  input: ApiApplicationCreateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientArchiveArgs = {
  input: ApiApplicationOAuthClientArchiveInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientCreateArgs = {
  input: ApiApplicationOAuthClientCreateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientEnabledSetArgs = {
  input: ApiApplicationOAuthClientEnabledSetInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientSecretRotateArgs = {
  input: ApiApplicationOAuthClientSecretRotateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientSkipConsentSetArgs = {
  input: ApiApplicationOAuthClientSkipConsentSetInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationOAuthClientUpdateArgs = {
  input: ApiApplicationOAuthClientUpdateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationUpdateArgs = {
  input: ApiApplicationUpdateInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationUserAccountUnlinkArgs = {
  input: ApiApplicationUserAccountUnlinkInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationUserBlockArgs = {
  input: ApiApplicationUserStatusSetInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationUserSessionsRevokeAllArgs = {
  input: ApiApplicationUserSessionsRevokeAllInput;
};

/** Application realm management mutations. */
export type ApiApplicationMutationApplicationUserUnblockArgs = {
  input: ApiApplicationUserStatusSetInput;
};

/** An OAuth 2.1 client registered within an application realm. */
export type ApiApplicationOAuthClient = ApiNode & {
  __typename?: "ApplicationOAuthClient";
  applicationId: Scalars["ID"]["output"];
  archived: Scalars["Boolean"]["output"];
  archivedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Public, globally unique OAuth client identifier. */
  clientId: Scalars["String"]["output"];
  clientType: ApplicationOAuthClientType;
  createdAt: Scalars["DateTime"]["output"];
  createdBy: Scalars["ID"]["output"];
  disabled: Scalars["Boolean"]["output"];
  enableEndSession: Scalars["Boolean"]["output"];
  environment: ApplicationOAuthClientEnvironment;
  /** Read-only grant types enforced by the protocol policy. */
  grantTypes: Array<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  organizationId: Scalars["ID"]["output"];
  postLogoutRedirectUris: Array<Scalars["String"]["output"]>;
  protocolPolicyVersion: Scalars["Int"]["output"];
  redirectUris: Array<Scalars["String"]["output"]>;
  /** Whether Proof Key for Code Exchange is required. */
  requirePkce: Scalars["Boolean"]["output"];
  /** Read-only resource audience inherited from the application. */
  resources: Array<Scalars["String"]["output"]>;
  /** Read-only response types enforced by the protocol policy. */
  responseTypes: Array<Scalars["String"]["output"]>;
  revision: Scalars["Int"]["output"];
  skipConsent: Scalars["Boolean"]["output"];
  tokenEndpointAuthMethod: ApplicationOAuthTokenEndpointAuthMethod;
  updatedAt: Scalars["DateTime"]["output"];
  updatedBy: Scalars["ID"]["output"];
};

/** Input for archiving an OAuth client. */
export type ApiApplicationOAuthClientArchiveInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** A paginated connection of OAuth clients. */
export type ApiApplicationOAuthClientConnection = {
  __typename?: "ApplicationOAuthClientConnection";
  edges: Array<ApiApplicationOAuthClientEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Input for creating an OAuth client with fixed protocol policy. */
export type ApiApplicationOAuthClientCreateInput = {
  applicationId: Scalars["ID"]["input"];
  clientType: ApplicationOAuthClientType;
  enableEndSession?: InputMaybe<Scalars["Boolean"]["input"]>;
  environment: ApplicationOAuthClientEnvironment;
  name: Scalars["String"]["input"];
  organizationId: Scalars["ID"]["input"];
  postLogoutRedirectUris?: InputMaybe<Array<Scalars["String"]["input"]>>;
  redirectUris: Array<Scalars["String"]["input"]>;
  skipConsent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Result of creating an OAuth client. */
export type ApiApplicationOAuthClientCreatePayload = {
  __typename?: "ApplicationOAuthClientCreatePayload";
  client?: Maybe<ApiApplicationOAuthClient>;
  /** One-time plaintext secret for a confidential client; otherwise null. */
  clientSecret?: Maybe<Scalars["String"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** An OAuth client and its pagination cursor. */
export type ApiApplicationOAuthClientEdge = {
  __typename?: "ApplicationOAuthClientEdge";
  cursor: Scalars["String"]["output"];
  node: ApiApplicationOAuthClient;
};

/** Input for enabling or disabling an OAuth client. */
export type ApiApplicationOAuthClientEnabledSetInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  enabled: Scalars["Boolean"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** Environment used to enforce redirect URI policy. */
export enum ApplicationOAuthClientEnvironment {
  Development = "DEVELOPMENT",
  Production = "PRODUCTION",
}

/** Ordering configuration for application OAuth clients. */
export type ApiApplicationOAuthClientOrderByInput = {
  direction: SortDirection;
  field: ApplicationOAuthClientOrderField;
};

/** Fields available for ordering application OAuth clients. */
export enum ApplicationOAuthClientOrderField {
  CreatedAt = "CREATED_AT",
  Name = "NAME",
  UpdatedAt = "UPDATED_AT",
}

/** Result of changing an OAuth client. */
export type ApiApplicationOAuthClientPayload = {
  __typename?: "ApplicationOAuthClientPayload";
  client?: Maybe<ApiApplicationOAuthClient>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for rotating a confidential OAuth client secret. */
export type ApiApplicationOAuthClientSecretRotateInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** Result of rotating a confidential OAuth client secret. */
export type ApiApplicationOAuthClientSecretRotatePayload = {
  __typename?: "ApplicationOAuthClientSecretRotatePayload";
  client?: Maybe<ApiApplicationOAuthClient>;
  /** One-time plaintext replacement secret. */
  clientSecret?: Maybe<Scalars["String"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for changing first-party consent bypass policy. */
export type ApiApplicationOAuthClientSkipConsentSetInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  organizationId: Scalars["ID"]["input"];
  skipConsent: Scalars["Boolean"]["input"];
};

/** OAuth client confidentiality classification. */
export enum ApplicationOAuthClientType {
  Confidential = "CONFIDENTIAL",
  Public = "PUBLIC",
}

/** Input for updating mutable OAuth client metadata. */
export type ApiApplicationOAuthClientUpdateInput = {
  applicationId: Scalars["ID"]["input"];
  clientId: Scalars["String"]["input"];
  enableEndSession?: InputMaybe<Scalars["Boolean"]["input"]>;
  environment?: InputMaybe<ApplicationOAuthClientEnvironment>;
  expectedRevision: Scalars["Int"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
  organizationId: Scalars["ID"]["input"];
  postLogoutRedirectUris?: InputMaybe<Array<Scalars["String"]["input"]>>;
  redirectUris?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Filter conditions for application OAuth clients. */
export type ApiApplicationOAuthClientWhereInput = {
  archived?: InputMaybe<Scalars["Boolean"]["input"]>;
  clientType?: InputMaybe<Array<ApplicationOAuthClientType>>;
  disabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  environment?: InputMaybe<Array<ApplicationOAuthClientEnvironment>>;
  search?: InputMaybe<Scalars["String"]["input"]>;
};

/** Token endpoint authentication method enforced by IAM. */
export enum ApplicationOAuthTokenEndpointAuthMethod {
  ClientSecretBasic = "CLIENT_SECRET_BASIC",
  None = "NONE",
}

/** Ordering configuration for applications. */
export type ApiApplicationOrderByInput = {
  /** Sort direction. */
  direction: SortDirection;
  /** Field to order by. */
  field: ApplicationOrderField;
};

/** Fields available for ordering applications. */
export enum ApplicationOrderField {
  CreatedAt = "CREATED_AT",
  DisplayName = "DISPLAY_NAME",
  Name = "NAME",
  UpdatedAt = "UPDATED_AT",
}

/** Application realm management queries. */
export type ApiApplicationQuery = {
  __typename?: "ApplicationQuery";
  /** Get an application owned by the selected organization. */
  application?: Maybe<ApiApplication>;
  /** List applications owned by the selected organization. */
  applications: ApiApplicationConnection;
};

/** Application realm management queries. */
export type ApiApplicationQueryApplicationArgs = {
  id: Scalars["ID"]["input"];
  organizationId: Scalars["ID"]["input"];
};

/** Application realm management queries. */
export type ApiApplicationQueryApplicationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiApplicationOrderByInput>>;
  organizationId: Scalars["ID"]["input"];
  where?: InputMaybe<ApiApplicationWhereInput>;
};

/** Registration policy for new application users. */
export enum ApplicationRegistrationMode {
  /** New user registration is disabled. */
  Disabled = "DISABLED",
  /** New users may register through enabled sign-up methods. */
  Open = "OPEN",
}

/** Input for updating application metadata. */
export type ApiApplicationUpdateInput = {
  /** Application to update. */
  applicationId: Scalars["ID"]["input"];
  /** New application description. */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** New human-readable application name. */
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  /** Revision expected by the caller. */
  expectedRevision: Scalars["Int"]["input"];
  /** New URL-friendly application name. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** Organization that owns the application. */
  organizationId: Scalars["ID"]["input"];
};

/** Result of updating application metadata. */
export type ApiApplicationUpdatePayload = {
  __typename?: "ApplicationUpdatePayload";
  application?: Maybe<ApiApplication>;
  userErrors: Array<ApiGenericUserError>;
};

/** A user scoped to a single application authentication realm. */
export type ApiApplicationUser = ApiNode & {
  __typename?: "ApplicationUser";
  applicationId: Scalars["ID"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  email: Scalars["Email"]["output"];
  emailVerified: Scalars["Boolean"]["output"];
  firstName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  imageUrl?: Maybe<Scalars["String"]["output"]>;
  lastName?: Maybe<Scalars["String"]["output"]>;
  /** Linked login accounts without provider credentials or tokens. */
  linkedAccounts: Array<ApiApplicationUserLinkedAccount>;
  name: Scalars["String"]["output"];
  /** Safe security metadata without credentials or token values. */
  security: ApiApplicationUserSecurityMetadata;
  status: ApplicationUserStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

/** Input for unlinking a login account from an application user. */
export type ApiApplicationUserAccountUnlinkInput = {
  accountId: Scalars["ID"]["input"];
  applicationId: Scalars["ID"]["input"];
  organizationId: Scalars["ID"]["input"];
  userId: Scalars["ID"]["input"];
};

/** Result of unlinking an application user login account. */
export type ApiApplicationUserAccountUnlinkPayload = {
  __typename?: "ApplicationUserAccountUnlinkPayload";
  unlinkedAccountId?: Maybe<Scalars["ID"]["output"]>;
  user?: Maybe<ApiApplicationUser>;
  userErrors: Array<ApiGenericUserError>;
};

/** A paginated connection of application users. */
export type ApiApplicationUserConnection = {
  __typename?: "ApplicationUserConnection";
  edges: Array<ApiApplicationUserEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** An application user and its pagination cursor. */
export type ApiApplicationUserEdge = {
  __typename?: "ApplicationUserEdge";
  cursor: Scalars["String"]["output"];
  node: ApiApplicationUser;
};

/** A login account linked to an application user. */
export type ApiApplicationUserLinkedAccount = ApiNode & {
  __typename?: "ApplicationUserLinkedAccount";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  /** Whether unlinking this account would remove the user's last login method. */
  isOnlyLoginMethod: Scalars["Boolean"]["output"];
  provider: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

/** Ordering configuration for application users. */
export type ApiApplicationUserOrderByInput = {
  direction: SortDirection;
  field: ApplicationUserOrderField;
};

/** Fields available for ordering application users. */
export enum ApplicationUserOrderField {
  CreatedAt = "CREATED_AT",
  Email = "EMAIL",
  Name = "NAME",
  UpdatedAt = "UPDATED_AT",
}

/** Result of changing an application user's security status. */
export type ApiApplicationUserPayload = {
  __typename?: "ApplicationUserPayload";
  user?: Maybe<ApiApplicationUser>;
  userErrors: Array<ApiGenericUserError>;
};

/** Safe aggregate security metadata for an application user. */
export type ApiApplicationUserSecurityMetadata = {
  __typename?: "ApplicationUserSecurityMetadata";
  activeSessionCount: Scalars["Int"]["output"];
  hasPasswordLogin: Scalars["Boolean"]["output"];
  linkedAccountCount: Scalars["Int"]["output"];
};

/** Input for revoking every session of an application user. */
export type ApiApplicationUserSessionsRevokeAllInput = {
  applicationId: Scalars["ID"]["input"];
  organizationId: Scalars["ID"]["input"];
  userId: Scalars["ID"]["input"];
};

/** Result of revoking every session of an application user. */
export type ApiApplicationUserSessionsRevokeAllPayload = {
  __typename?: "ApplicationUserSessionsRevokeAllPayload";
  revokedCount: Scalars["Int"]["output"];
  user?: Maybe<ApiApplicationUser>;
  userErrors: Array<ApiGenericUserError>;
};

/** Administrative security status of an application user. */
export enum ApplicationUserStatus {
  Active = "ACTIVE",
  Blocked = "BLOCKED",
}

/** Input for blocking or unblocking an application user. */
export type ApiApplicationUserStatusSetInput = {
  applicationId: Scalars["ID"]["input"];
  organizationId: Scalars["ID"]["input"];
  userId: Scalars["ID"]["input"];
};

/** Filter conditions for application users. */
export type ApiApplicationUserWhereInput = {
  emailVerified?: InputMaybe<Scalars["Boolean"]["input"]>;
  search?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<Array<ApplicationUserStatus>>;
};

/** Filter conditions for applications. */
export type ApiApplicationWhereInput = {
  /** Search by application name or display name. */
  search?: InputMaybe<Scalars["String"]["input"]>;
  /** Limit results to the selected lifecycle statuses. */
  status?: InputMaybe<Array<ApplicationLifecycleStatus>>;
};

export type ApiAppsMutation = {
  __typename?: "AppsMutation";
  /** Update installation configuration and granted scopes. */
  appConfigure: ApiAppConfigurePayload;
  /** Install a bundled App in the current store. */
  appInstall: ApiAppLifecyclePayload;
  /** Resume a suspended App installation. */
  appResume: ApiAppLifecyclePayload;
  /** Temporarily disable an active App installation. */
  appSuspend: ApiAppLifecyclePayload;
  /** Uninstall an App from the current store. */
  appUninstall: ApiAppLifecyclePayload;
  /** Update an installed App to the bundled target version. */
  appUpdate: ApiAppLifecyclePayload;
};

export type ApiAppsMutationAppConfigureArgs = {
  input: ApiAppConfigureInput;
};

export type ApiAppsMutationAppInstallArgs = {
  input: ApiAppInstallInput;
};

export type ApiAppsMutationAppResumeArgs = {
  input: ApiAppInstallationActionInput;
};

export type ApiAppsMutationAppSuspendArgs = {
  input: ApiAppInstallationActionInput;
};

export type ApiAppsMutationAppUninstallArgs = {
  input: ApiAppInstallationActionInput;
};

export type ApiAppsMutationAppUpdateArgs = {
  input: ApiAppUpdateInput;
};

export type ApiAppsQuery = {
  __typename?: "AppsQuery";
  /** Get a bundled App definition by its stable code. */
  appDefinition?: Maybe<ApiAppDefinition>;
  /** Get an App installation by its global ID. */
  appInstallation?: Maybe<ApiAppInstallation>;
  /** Get a lifecycle operation by its global ID. */
  appLifecycleOperation?: Maybe<ApiAppLifecycleOperation>;
  /** List bundled Apps and their installation state for the current store. */
  apps: ApiAppConnection;
};

export type ApiAppsQueryAppDefinitionArgs = {
  code: Scalars["String"]["input"];
};

export type ApiAppsQueryAppInstallationArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiAppsQueryAppLifecycleOperationArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiAppsQueryAppsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiAppOrderByInput>>;
  where?: InputMaybe<ApiAppWhereInput>;
};

export type ApiAuthMutation = {
  __typename?: "AuthMutation";
  signIn: ApiUserSignInPayload;
  signOut: ApiUserSignOutPayload;
  signUp: ApiUserSignUpPayload;
  tokenRefresh: ApiUserTokenRefreshPayload;
};

export type ApiAuthMutationSignInArgs = {
  input: ApiUserSignInInput;
};

export type ApiAuthMutationSignOutArgs = {
  input: ApiUserSignOutInput;
};

export type ApiAuthMutationSignUpArgs = {
  input: ApiUserSignUpInput;
};

export type ApiAuthMutationTokenRefreshArgs = {
  input: ApiUserTokenRefreshInput;
};

/** Authentication tokens. */
export type ApiAuthTokenPayload = {
  __typename?: "AuthTokenPayload";
  /** Access token for API requests. */
  accessToken: Scalars["String"]["output"];
  /** Expiration time in seconds. */
  expiresIn: Scalars["Int"]["output"];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars["String"]["output"];
};

/** Input for authorize check. */
export type ApiAuthorizeInput = {
  /** Action to check. */
  action: Scalars["String"]["input"];
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars["String"]["input"];
  /** Organization ID. */
  organizationId: Scalars["ID"]["input"];
  /** Resource to check. */
  resource: Scalars["String"]["input"];
};

export type ApiAuthorizePayload = {
  __typename?: "AuthorizePayload";
  /** Whether access is allowed. */
  allowed: Scalars["Boolean"]["output"];
  /** Reason for denial (if denied). */
  deniedReason?: Maybe<Scalars["String"]["output"]>;
};

export enum AutomaticFulfillmentMode {
  AllLineItems = "ALL_LINE_ITEMS",
  Disabled = "DISABLED",
  GiftCardsOnly = "GIFT_CARDS_ONLY",
}

/** Input for uploading avatar or logo. */
export type ApiAvatarUploadInput = {
  /** The file to upload. */
  file: Scalars["Upload"]["input"];
  /**
   * Owner ID (User or Organization global ID).
   * The asset group will be resolved by this ID.
   */
  ownerId: Scalars["ID"]["input"];
};

/** Payload for avatar/logo upload. */
export type ApiAvatarUploadPayload = {
  __typename?: "AvatarUploadPayload";
  /** The uploaded file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiBigIntFilter = {
  _between?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  _eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  _gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  _gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  _in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  _lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  _neq?: InputMaybe<Scalars["BigInt"]["input"]>;
  _notIn?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
};

/** Filter operators for Boolean fields */
export type ApiBooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** A bucket represents an S3 storage bucket for a project. */
export type ApiBucket = {
  __typename?: "Bucket";
  /** S3 bucket name. */
  bucketName: Scalars["String"]["output"];
  /** The date and time when the bucket was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: Maybe<Scalars["String"]["output"]>;
  /** The globally unique ID of the bucket. */
  id: Scalars["ID"]["output"];
  /** Priority for bucket selection. */
  priority: Scalars["Int"]["output"];
  /** AWS region. */
  region: Scalars["String"]["output"];
  /** Bucket status (active, archived, etc). */
  status: Scalars["String"]["output"];
  /** The date and time when the bucket was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

/** Input for creating a bucket. */
export type ApiBucketCreateInput = {
  /** S3 bucket name (must be unique). */
  bucketName: Scalars["String"]["input"];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: InputMaybe<Scalars["String"]["input"]>;
  /** Priority for bucket selection (default: 0). */
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  /** AWS region (default: us-east-1). */
  region?: InputMaybe<Scalars["String"]["input"]>;
  /** Bucket status (default: active). */
  status?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for bucket creation. */
export type ApiBucketCreatePayload = {
  __typename?: "BucketCreatePayload";
  /** The created bucket. */
  bucket?: Maybe<ApiBucket>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export enum BulkUpdateCancelReason {
  Superseded = "SUPERSEDED",
  System = "SYSTEM",
  User = "USER",
}

/** Single operation in bulk update job. */
export type ApiBulkUpdateItem = {
  __typename?: "BulkUpdateItem";
  /** Cancel reason (only for CANCELLED/SUPERSEDED). */
  cancelReason?: Maybe<BulkUpdateCancelReason>;
  /** Execution errors. */
  errors: Array<ApiBulkUpdateUserError>;
  /** When finished. */
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Item ID. */
  id: Scalars["ID"]["output"];
  /** Order within product. */
  opIndex: Scalars["Int"]["output"];
  /** Operation type. */
  opType: BulkUpdateOpType;
  /** Product ID. */
  productId: Scalars["ID"]["output"];
  /** When started. */
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Current status. */
  status: BulkUpdateItemStatus;
  /** Job that superseded this item. */
  supersededByJobId?: Maybe<Scalars["ID"]["output"]>;
  /** Variant ID (null for product-level operations). */
  variantId?: Maybe<Scalars["ID"]["output"]>;
};

export type ApiBulkUpdateItemConnection = {
  __typename?: "BulkUpdateItemConnection";
  edges: Array<ApiBulkUpdateItemEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiBulkUpdateItemEdge = {
  __typename?: "BulkUpdateItemEdge";
  cursor: Scalars["String"]["output"];
  node: ApiBulkUpdateItem;
};

export enum BulkUpdateItemStatus {
  Cancelled = "CANCELLED",
  Failed = "FAILED",
  Pending = "PENDING",
  Running = "RUNNING",
  Succeeded = "SUCCEEDED",
  Superseded = "SUPERSEDED",
}

/** Job progress. All counters computed from items. */
export type ApiBulkUpdateJobProgress = {
  __typename?: "BulkUpdateJobProgress";
  /** Cancelled. */
  cancelled: Scalars["Int"]["output"];
  /** Done (succeeded + failed + cancelled + superseded). */
  done: Scalars["Int"]["output"];
  /** Failed. */
  failed: Scalars["Int"]["output"];
  /** Pending execution. */
  pending: Scalars["Int"]["output"];
  /** Currently running. */
  running: Scalars["Int"]["output"];
  /** Successfully applied. */
  succeeded: Scalars["Int"]["output"];
  /** Superseded by another job. */
  superseded: Scalars["Int"]["output"];
  /** Total operations. */
  total: Scalars["Int"]["output"];
};

export enum BulkUpdateJobStatus {
  Cancelled = "CANCELLED",
  Completed = "COMPLETED",
  Queued = "QUEUED",
  Running = "RUNNING",
}

export enum BulkUpdateOpType {
  ProductCategoryUpdate = "PRODUCT_CATEGORY_UPDATE",
  ProductComponentConfigurationCreate = "PRODUCT_COMPONENT_CONFIGURATION_CREATE",
  ProductComponentConfigurationDelete = "PRODUCT_COMPONENT_CONFIGURATION_DELETE",
  ProductComponentConfigurationUpdate = "PRODUCT_COMPONENT_CONFIGURATION_UPDATE",
  ProductComponentDependencyRulesSync = "PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC",
  ProductComponentGroupsSync = "PRODUCT_COMPONENT_GROUPS_SYNC",
  ProductComponentPricingTemplatesSync = "PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC",
  ProductComponentRemove = "PRODUCT_COMPONENT_REMOVE",
  ProductComponentSettingsUpdate = "PRODUCT_COMPONENT_SETTINGS_UPDATE",
  ProductTagUpdate = "PRODUCT_TAG_UPDATE",
  ProductUpdate = "PRODUCT_UPDATE",
  VariantCreate = "VARIANT_CREATE",
  VariantDelete = "VARIANT_DELETE",
  VariantUpdate = "VARIANT_UPDATE",
}

/** Bulk update error with operation context. */
export type ApiBulkUpdateUserError = ApiUserError & {
  __typename?: "BulkUpdateUserError";
  /** Error code. */
  code?: Maybe<Scalars["String"]["output"]>;
  /** Input field path. */
  field?: Maybe<Array<Scalars["String"]["output"]>>;
  /** Error message. */
  message: Scalars["String"]["output"];
  /** Operation that failed. */
  operation?: Maybe<Scalars["String"]["output"]>;
  /** Product ID. */
  productId?: Maybe<Scalars["ID"]["output"]>;
  /** Variant ID. */
  variantId?: Maybe<Scalars["ID"]["output"]>;
};

export type ApiCatalogMutation = {
  __typename?: "CatalogMutation";
  /** Create a new category */
  categoryCreate: ApiCategoryCreatePayload;
  /** Delete a category */
  categoryDelete: ApiCategoryDeletePayload;
  /** Move a category to a new parent or position */
  categoryMove: ApiCategoryMovePayload;
  /** Rebalance category tree positions */
  categoryRebalance: ApiCategoryRebalancePayload;
  /** Unified category update with optimistic locking. */
  categoryUpdate: ApiCategoryUpdatePayload;
  /** Add products to a collection */
  collectionAddProducts: ApiCollectionAddProductsPayload;
  /** Create a new collection */
  collectionCreate: ApiCollectionCreatePayload;
  /** Delete a collection */
  collectionDelete: ApiCollectionDeletePayload;
  /** Move a product within a collection */
  collectionMoveProduct: ApiCollectionMoveProductPayload;
  /** Remove products from a collection */
  collectionRemoveProducts: ApiCollectionRemoveProductsPayload;
  /** Update an existing collection */
  collectionUpdate: ApiCollectionUpdatePayload;
  /** Update collection rules for automatic product inclusion */
  collectionUpdateRules: ApiCollectionUpdateRulesPayload;
  /**
   * Start async bulk update.
   * Requires X-Idempotency-Key header.
   */
  productBulkUpdate: ApiProductBulkUpdatePayload;
  /** Create a new product */
  productCreate: ApiProductCreatePayload;
  /** Delete an existing product */
  productDelete: ApiProductDeletePayload;
  productOptionCategoryCreate: ApiProductOptionCategoryCreatePayload;
  productOptionCategoryDelete: ApiProductOptionCategoryDeletePayload;
  productOptionCategoryUpdate: ApiProductOptionCategoryUpdatePayload;
  /**
   * Unified product update with optimistic locking.
   * Supports product, component, and variant updates in a single request.
   */
  productUpdate: ApiProductUpdatePayload;
  /** Create a new tag */
  tagCreate: ApiTagCreatePayload;
  /** Delete a tag */
  tagDelete: ApiTagDeletePayload;
  /** Update an existing tag */
  tagUpdate: ApiTagUpdatePayload;
  /** Create a new vendor */
  vendorCreate: ApiVendorCreatePayload;
};

export type ApiCatalogMutationCategoryCreateArgs = {
  input: ApiCategoryCreateInput;
};

export type ApiCatalogMutationCategoryDeleteArgs = {
  input: ApiCategoryDeleteInput;
};

export type ApiCatalogMutationCategoryMoveArgs = {
  input: ApiCategoryMoveInput;
};

export type ApiCatalogMutationCategoryRebalanceArgs = {
  input: ApiCategoryRebalanceInput;
};

export type ApiCatalogMutationCategoryUpdateArgs = {
  categoryId: Scalars["ID"]["input"];
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  operations?: InputMaybe<ApiCategoryUpdateInput>;
};

export type ApiCatalogMutationCollectionAddProductsArgs = {
  input: ApiCollectionAddProductsInput;
};

export type ApiCatalogMutationCollectionCreateArgs = {
  input: ApiCollectionCreateInput;
};

export type ApiCatalogMutationCollectionDeleteArgs = {
  input: ApiCollectionDeleteInput;
};

export type ApiCatalogMutationCollectionMoveProductArgs = {
  input: ApiCollectionMoveProductInput;
};

export type ApiCatalogMutationCollectionRemoveProductsArgs = {
  input: ApiCollectionRemoveProductsInput;
};

export type ApiCatalogMutationCollectionUpdateArgs = {
  input: ApiCollectionUpdateInput;
};

export type ApiCatalogMutationCollectionUpdateRulesArgs = {
  input: ApiCollectionUpdateRulesInput;
};

export type ApiCatalogMutationProductBulkUpdateArgs = {
  input: ApiProductBulkUpdateInput;
};

export type ApiCatalogMutationProductCreateArgs = {
  input: ApiProductCreateInput;
};

export type ApiCatalogMutationProductDeleteArgs = {
  input: ApiProductDeleteInput;
};

export type ApiCatalogMutationProductOptionCategoryCreateArgs = {
  input: ApiProductOptionCategoryCreateInput;
};

export type ApiCatalogMutationProductOptionCategoryDeleteArgs = {
  input: ApiProductOptionCategoryDeleteInput;
};

export type ApiCatalogMutationProductOptionCategoryUpdateArgs = {
  input: ApiProductOptionCategoryUpdateInput;
};

export type ApiCatalogMutationProductUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  operations?: InputMaybe<ApiProductUpdateInput>;
  productId: Scalars["ID"]["input"];
};

export type ApiCatalogMutationTagCreateArgs = {
  input: ApiTagCreateInput;
};

export type ApiCatalogMutationTagDeleteArgs = {
  input: ApiTagDeleteInput;
};

export type ApiCatalogMutationTagUpdateArgs = {
  input: ApiTagUpdateInput;
};

export type ApiCatalogMutationVendorCreateArgs = {
  input: ApiVendorCreateInput;
};

export type ApiCatalogQuery = {
  __typename?: "CatalogQuery";
  /** Get categories with Relay-style pagination */
  categories: ApiCategoryConnection;
  /** Get a category by ID */
  category?: Maybe<ApiCategory>;
  /** Get a collection by ID */
  collection?: Maybe<ApiCollection>;
  /** Get a collection by its handle */
  collectionByHandle?: Maybe<ApiCollection>;
  /** Preview count of products matching collection rules */
  collectionRulesPreviewCount: Scalars["Int"]["output"];
  /** Get collections with Relay-style pagination */
  collections: ApiCollectionConnection;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a product by ID */
  product?: Maybe<ApiProduct>;
  /** Get bulk update job by ID. */
  productBulkUpdateJob?: Maybe<ApiProductBulkUpdateJob>;
  /**
   * Get product bulk update jobs for the current store.
   * Defaults to active jobs when statusFilter is omitted.
   */
  productBulkUpdateJobs: ApiProductBulkUpdateJobConnection;
  productOptionCategories: ApiProductOptionCategoryConnection;
  productOptionCategory?: Maybe<ApiProductOptionCategory>;
  /** Get products with Relay-style pagination */
  products: ApiProductConnection;
  /** Get a tag by ID */
  tag?: Maybe<ApiTag>;
  /** Get tags with Relay-style pagination */
  tags: ApiTagConnection;
  /** Get a variant by ID */
  variant?: Maybe<ApiVariant>;
  /** Get variants with Relay-style pagination */
  variants: ApiVariantConnection;
  /** Get a vendor by ID */
  vendor?: Maybe<ApiVendor>;
  /** Get vendors with Relay-style pagination */
  vendors: ApiVendorConnection;
};

export type ApiCatalogQueryCategoriesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiCategoryCategoriesMetaInput>;
  orderBy?: InputMaybe<Array<ApiCategoryOrderByInput>>;
  where?: InputMaybe<ApiCategoryWhereInput>;
};

export type ApiCatalogQueryCategoryArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryCollectionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryCollectionByHandleArgs = {
  handle: Scalars["String"]["input"];
};

export type ApiCatalogQueryCollectionRulesPreviewCountArgs = {
  rules: Array<ApiCollectionRuleInput>;
};

export type ApiCatalogQueryCollectionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiCatalogQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiCatalogQueryProductArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryProductBulkUpdateJobArgs = {
  jobId: Scalars["ID"]["input"];
};

export type ApiCatalogQueryProductBulkUpdateJobsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  statusFilter?: InputMaybe<Array<BulkUpdateJobStatus>>;
};

export type ApiCatalogQueryProductOptionCategoriesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiProductOptionCategoryOrderByInput>>;
  where?: InputMaybe<ApiProductOptionCategoryWhereInput>;
};

export type ApiCatalogQueryProductOptionCategoryArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryProductsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiProductProductsMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductOrderByInput>>;
  where?: InputMaybe<ApiProductWhereInput>;
};

export type ApiCatalogQueryTagArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryTagsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiTagOrderByInput>>;
  where?: InputMaybe<ApiTagWhereInput>;
};

export type ApiCatalogQueryVariantArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryVariantsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiVariantOrderByInput>>;
  where?: InputMaybe<ApiVariantWhereInput>;
};

export type ApiCatalogQueryVendorArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiCatalogQueryVendorsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiVendorOrderByInput>>;
  where?: InputMaybe<ApiVendorWhereInput>;
};

/** A category represents a hierarchical grouping of products. */
export type ApiCategory = ApiNode & {
  __typename?: "Category";
  /** All ancestor categories from root to parent. */
  ancestors: Array<ApiCategory>;
  /** Direct child categories. */
  children: Array<ApiCategory>;
  /** The date and time when the category was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Default product sort for this category PLP. */
  defaultSort: ProductSortBy;
  /** Default sort direction for this category PLP. */
  defaultSortDirection: SortDirection;
  /** The date and time when the category was deleted (soft delete). */
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** The depth of this category in the hierarchy (0 for root). */
  depth: Scalars["Int"]["output"];
  /** The category description. */
  description?: Maybe<ApiRichText>;
  /** Short category excerpt. */
  excerpt?: Maybe<ApiRichText>;
  /** The URL-friendly handle for the category. */
  handle: Scalars["String"]["output"];
  /** The globally unique ID of the category. */
  id: Scalars["ID"]["output"];
  /** Whether the category is currently published. */
  isPublished: Scalars["Boolean"]["output"];
  /** Media files associated with this category. */
  media: Array<ApiCategoryMediaItem>;
  /** The display name of the category. */
  name: Scalars["String"]["output"];
  /** The parent category, if any. */
  parent?: Maybe<ApiCategory>;
  /** The materialized path for this category. */
  path: Scalars["String"]["output"];
  /** The total number of products in this category. */
  productsCount: Scalars["Int"]["output"];
  /** The date and time when the category was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Optimistic locking revision number. Incremented on each update. */
  revision: Scalars["Int"]["output"];
  /** SEO metadata. */
  seo?: Maybe<ApiSeo>;
  /** The date and time when the category was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCategoryCategoriesMetaInput = {
  hierarchyScope?: InputMaybe<ApiCategoryHierarchyScopeInput>;
  productsScope?: InputMaybe<ApiCategoryProductsScopeInput>;
};

/** A connection to a list of Category items. */
export type ApiCategoryConnection = {
  __typename?: "CategoryConnection";
  /** A list of edges. */
  edges: Array<ApiCategoryEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of categories. */
  totalCount: Scalars["Int"]["output"];
};

export type ApiCategoryContentInput = {
  /** The category description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** The short category excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
};

/** Input for creating a category. */
export type ApiCategoryCreateInput = {
  /** Optional description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Optional short excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
  /** The URL-friendly handle for the category. */
  handle: Scalars["String"]["input"];
  /** File IDs for category media. */
  mediaFileIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** The display name of the category. */
  name: Scalars["String"]["input"];
  /** Optional parent category ID. */
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Whether to publish immediately. */
  publish?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** SEO metadata. */
  seo?: InputMaybe<ApiSeoInput>;
};

/** Payload for category creation. */
export type ApiCategoryCreatePayload = {
  __typename?: "CategoryCreatePayload";
  /** The created category. */
  category?: Maybe<ApiCategory>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a category. */
export type ApiCategoryDeleteInput = {
  /** The ID of the category to delete. */
  id: Scalars["ID"]["input"];
  /** Whether to permanently delete (hard delete). */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Payload for category deletion. */
export type ApiCategoryDeletePayload = {
  __typename?: "CategoryDeletePayload";
  /** The ID of the deleted category. */
  deletedCategoryId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Category connection. */
export type ApiCategoryEdge = {
  __typename?: "CategoryEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiCategory;
};

export type ApiCategoryHierarchyInput = {
  /** The new parent category ID, or null for root. */
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
};

export enum CategoryHierarchyScopeDirection {
  Ancestors = "ANCESTORS",
  Descendants = "DESCENDANTS",
}

export type ApiCategoryHierarchyScopeInput = {
  direction: CategoryHierarchyScopeDirection;
  includeReference?: InputMaybe<Scalars["Boolean"]["input"]>;
  mode: CategoryHierarchyScopeMode;
  referenceId: Scalars["ID"]["input"];
};

export enum CategoryHierarchyScopeMode {
  Exclude = "EXCLUDE",
  Include = "INCLUDE",
}

export type ApiCategoryMediaInput = {
  /** File IDs for category media. */
  fileIds: Array<Scalars["ID"]["input"]>;
};

/** A media item for a category. */
export type ApiCategoryMediaItem = {
  __typename?: "CategoryMediaItem";
  /** The file reference. */
  file: ApiFile;
  /** The sort index for ordering. */
  sortIndex: Scalars["Int"]["output"];
};

/** Input for moving a category in the hierarchy. */
export type ApiCategoryMoveInput = {
  /** The ID of the category to move. */
  id: Scalars["ID"]["input"];
  /** The new parent category ID, or null for root. */
  newParentId?: InputMaybe<Scalars["ID"]["input"]>;
};

/** Payload for category move. */
export type ApiCategoryMovePayload = {
  __typename?: "CategoryMovePayload";
  /** The moved category. */
  category?: Maybe<ApiCategory>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Ordering configuration for Category */
export type ApiCategoryOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CategoryOrderField;
};

/** Fields available for sorting Category */
export enum CategoryOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by defaultSort */
  DefaultSort = "defaultSort",
  /** Sort by defaultSortDirection */
  DefaultSortDirection = "defaultSortDirection",
  /** Sort by depth */
  Depth = "depth",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by name */
  Name = "name",
  /** Sort by parentId */
  ParentId = "parentId",
  /** Sort by path */
  Path = "path",
  /** Sort by productsCount */
  ProductsCount = "productsCount",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiCategoryProductsScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars["ID"]["input"]>;
};

export type ApiCategoryRebalanceInput = {
  categoryId: Scalars["ID"]["input"];
};

export type ApiCategoryRebalancePayload = {
  __typename?: "CategoryRebalancePayload";
  category?: Maybe<ApiCategory>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCategorySortInput = {
  /** Default product sort for this category PLP. */
  defaultSort: ProductSortBy;
  /** Default sort direction for this category PLP. */
  defaultSortDirection: SortDirection;
};

export enum CategoryStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
}

/** Input for updating a category through section-based operations. */
export type ApiCategoryUpdateInput = {
  /** Translated content. */
  content?: InputMaybe<ApiCategoryContentInput>;
  /** The URL-friendly handle for the category. */
  handle?: InputMaybe<Scalars["String"]["input"]>;
  /** Hierarchy move. */
  hierarchy?: InputMaybe<ApiCategoryHierarchyInput>;
  /** Category media replacement. */
  media?: InputMaybe<ApiCategoryMediaInput>;
  /** The display name of the category. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** SEO metadata. */
  seo?: InputMaybe<ApiSeoInput>;
  /** PLP sort preferences. */
  sort?: InputMaybe<ApiCategorySortInput>;
  /** Category status. */
  status?: InputMaybe<CategoryStatus>;
};

/** Payload for category update. */
export type ApiCategoryUpdatePayload = {
  __typename?: "CategoryUpdatePayload";
  /** The updated category. */
  category?: Maybe<ApiCategory>;
  /** Results of requested category update operations. */
  operationResults: Array<ApiOperationResult>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Category */
export type ApiCategoryWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCategoryWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCategoryWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCategoryWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by defaultSort */
  defaultSort?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultSortDirection */
  defaultSortDirection?: InputMaybe<ApiStringFilter>;
  /** Filter by depth */
  depth?: InputMaybe<ApiIntFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by parentId */
  parentId?: InputMaybe<ApiIdFilter>;
  /** Filter by path */
  path?: InputMaybe<ApiStringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCdnConfiguration = ApiNode & {
  __typename?: "CdnConfiguration";
  baseUrl: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  enabled: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  name: Scalars["String"]["output"];
  pathPrefix: Scalars["String"]["output"];
  provider: Scalars["String"]["output"];
  providerConfig: Scalars["JSON"]["output"];
  secretRef?: Maybe<Scalars["String"]["output"]>;
  signingMode: Scalars["String"]["output"];
  transformConfig: Scalars["JSON"]["output"];
  transformStrategy: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  urlTemplate?: Maybe<Scalars["String"]["output"]>;
};

export type ApiCdnConfigurationCreateInput = {
  baseUrl: Scalars["String"]["input"];
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  name: Scalars["String"]["input"];
  pathPrefix?: InputMaybe<Scalars["String"]["input"]>;
  provider: Scalars["String"]["input"];
  providerConfig?: InputMaybe<Scalars["JSON"]["input"]>;
  secretRef?: InputMaybe<Scalars["String"]["input"]>;
  signingMode?: InputMaybe<Scalars["String"]["input"]>;
  transformConfig?: InputMaybe<Scalars["JSON"]["input"]>;
  transformStrategy?: InputMaybe<Scalars["String"]["input"]>;
  urlTemplate?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCdnConfigurationDeletePayload = {
  __typename?: "CdnConfigurationDeletePayload";
  deletedConfigurationId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnConfigurationPayload = {
  __typename?: "CdnConfigurationPayload";
  configuration?: Maybe<ApiCdnConfiguration>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnConfigurationTestInput = {
  configuration: ApiCdnConfigurationCreateInput;
  objectPath: Scalars["String"]["input"];
  transform?: InputMaybe<ApiImageTransformInput>;
};

export type ApiCdnConfigurationTestPayload = {
  __typename?: "CdnConfigurationTestPayload";
  preview?: Maybe<ApiCdnDeliveryPreview>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnConfigurationUpdateInput = {
  baseUrl?: InputMaybe<Scalars["String"]["input"]>;
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  id: Scalars["ID"]["input"];
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  pathPrefix?: InputMaybe<Scalars["String"]["input"]>;
  provider?: InputMaybe<Scalars["String"]["input"]>;
  providerConfig?: InputMaybe<Scalars["JSON"]["input"]>;
  secretRef?: InputMaybe<Scalars["String"]["input"]>;
  signingMode?: InputMaybe<Scalars["String"]["input"]>;
  transformConfig?: InputMaybe<Scalars["JSON"]["input"]>;
  transformStrategy?: InputMaybe<Scalars["String"]["input"]>;
  urlTemplate?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCdnDeliveryPreview = {
  __typename?: "CdnDeliveryPreview";
  configuration?: Maybe<ApiCdnConfiguration>;
  fallback: Scalars["Boolean"]["output"];
  originUrl: Scalars["String"]["output"];
  routingRule?: Maybe<ApiCdnRoutingRule>;
  url: Scalars["String"]["output"];
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnRoutingRule = ApiNode & {
  __typename?: "CdnRoutingRule";
  conditions: Scalars["JSON"]["output"];
  configuration: ApiCdnConfiguration;
  createdAt: Scalars["DateTime"]["output"];
  enabled: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  priority: Scalars["Int"]["output"];
  transformOverrides: Scalars["JSON"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCdnRoutingRuleCreateInput = {
  cdnConfigurationId: Scalars["ID"]["input"];
  conditions?: InputMaybe<Scalars["JSON"]["input"]>;
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  name: Scalars["String"]["input"];
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  transformOverrides?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiCdnRoutingRuleDeletePayload = {
  __typename?: "CdnRoutingRuleDeletePayload";
  deletedRoutingRuleId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnRoutingRulePayload = {
  __typename?: "CdnRoutingRulePayload";
  routingRule?: Maybe<ApiCdnRoutingRule>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCdnRoutingRuleUpdateInput = {
  cdnConfigurationId?: InputMaybe<Scalars["ID"]["input"]>;
  conditions?: InputMaybe<Scalars["JSON"]["input"]>;
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  id: Scalars["ID"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  transformOverrides?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiCollection = ApiNode & {
  __typename?: "Collection";
  activeFrom?: Maybe<Scalars["DateTime"]["output"]>;
  activeTo?: Maybe<Scalars["DateTime"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
  description?: Maybe<ApiRichText>;
  excerpt?: Maybe<ApiRichText>;
  handle?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  isActive: Scalars["Boolean"]["output"];
  isPublished: Scalars["Boolean"]["output"];
  media: Array<ApiCollectionMediaItem>;
  name: Scalars["String"]["output"];
  products: ApiCollectionProductConnection;
  productsCount: Scalars["Int"]["output"];
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  rules: Array<ApiCollectionRule>;
  seo?: Maybe<ApiSeo>;
  type: CollectionType;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCollectionProductsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  sort?: InputMaybe<ApiProductSortInput>;
};

export type ApiCollectionAddProductsInput = {
  collectionId: Scalars["ID"]["input"];
  productIds: Array<Scalars["ID"]["input"]>;
};

export type ApiCollectionAddProductsPayload = {
  __typename?: "CollectionAddProductsPayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionConnection = {
  __typename?: "CollectionConnection";
  edges: Array<ApiCollectionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCollectionCreateInput = {
  activeFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  activeTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<ApiRichTextInput>;
  excerpt?: InputMaybe<ApiRichTextInput>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  media?: InputMaybe<Array<ApiCollectionMediaInput>>;
  name: Scalars["String"]["input"];
  publish?: InputMaybe<Scalars["Boolean"]["input"]>;
  seo?: InputMaybe<ApiSeoInput>;
  type: CollectionType;
};

export type ApiCollectionCreatePayload = {
  __typename?: "CollectionCreatePayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiCollectionDeletePayload = {
  __typename?: "CollectionDeletePayload";
  deletedCollectionId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionEdge = {
  __typename?: "CollectionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCollection;
};

export type ApiCollectionMediaInput = {
  fileId: Scalars["ID"]["input"];
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiCollectionMediaItem = {
  __typename?: "CollectionMediaItem";
  file: ApiFile;
  sortIndex: Scalars["Int"]["output"];
};

export type ApiCollectionMeta = {
  __typename?: "CollectionMeta";
  count: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  pageCount: Scalars["Int"]["output"];
  pageSize: Scalars["Int"]["output"];
  total: Scalars["Int"]["output"];
};

export type ApiCollectionMoveProductInput = {
  afterProductId?: InputMaybe<Scalars["ID"]["input"]>;
  beforeProductId?: InputMaybe<Scalars["ID"]["input"]>;
  collectionId: Scalars["ID"]["input"];
  productId: Scalars["ID"]["input"];
};

export type ApiCollectionMoveProductPayload = {
  __typename?: "CollectionMoveProductPayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionProductConnection = {
  __typename?: "CollectionProductConnection";
  edges: Array<ApiCollectionProductEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCollectionProductEdge = {
  __typename?: "CollectionProductEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProduct;
};

export type ApiCollectionRemoveProductsInput = {
  collectionId: Scalars["ID"]["input"];
  productIds: Array<Scalars["ID"]["input"]>;
};

export type ApiCollectionRemoveProductsPayload = {
  __typename?: "CollectionRemoveProductsPayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionRule = {
  __typename?: "CollectionRule";
  field: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  operator: Scalars["String"]["output"];
  sortIndex: Scalars["Int"]["output"];
  value: Scalars["JSON"]["output"];
};

export type ApiCollectionRuleInput = {
  field: Scalars["String"]["input"];
  operator: Scalars["String"]["input"];
  value: Scalars["JSON"]["input"];
};

export enum CollectionType {
  Manual = "MANUAL",
  Rule = "RULE",
}

export type ApiCollectionUpdateInput = {
  activeFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  activeTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  defaultSort?: InputMaybe<ProductSortBy>;
  defaultSortDirection?: InputMaybe<SortDirection>;
  description?: InputMaybe<ApiRichTextInput>;
  excerpt?: InputMaybe<ApiRichTextInput>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  media?: InputMaybe<Array<ApiCollectionMediaInput>>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  publish?: InputMaybe<Scalars["Boolean"]["input"]>;
  seo?: InputMaybe<ApiSeoInput>;
};

export type ApiCollectionUpdatePayload = {
  __typename?: "CollectionUpdatePayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionUpdateRulesInput = {
  collectionId: Scalars["ID"]["input"];
  rules: Array<ApiCollectionRuleInput>;
};

export type ApiCollectionUpdateRulesPayload = {
  __typename?: "CollectionUpdateRulesPayload";
  collection?: Maybe<ApiCollection>;
  userErrors: Array<ApiGenericUserError>;
};

export enum CountryCode {
  /** Andorra */
  Ad = "AD",
  /** United Arab Emirates */
  Ae = "AE",
  /** Afghanistan */
  Af = "AF",
  /** Antigua and Barbuda */
  Ag = "AG",
  /** Albania */
  Al = "AL",
  /** Armenia */
  Am = "AM",
  /** Angola */
  Ao = "AO",
  /** Argentina */
  Ar = "AR",
  /** Austria */
  At = "AT",
  /** Australia */
  Au = "AU",
  /** Aruba */
  Aw = "AW",
  /** Åland Islands */
  Ax = "AX",
  /** Azerbaijan */
  Az = "AZ",
  /** Bosnia and Herzegovina */
  Ba = "BA",
  /** Barbados */
  Bb = "BB",
  /** Bangladesh */
  Bd = "BD",
  /** Belgium */
  Be = "BE",
  /** Burkina Faso */
  Bf = "BF",
  /** Bulgaria */
  Bg = "BG",
  /** Bahrain */
  Bh = "BH",
  /** Burundi */
  Bi = "BI",
  /** Benin */
  Bj = "BJ",
  /** Bermuda */
  Bm = "BM",
  /** Brunei */
  Bn = "BN",
  /** Bolivia */
  Bo = "BO",
  /** Brazil */
  Br = "BR",
  /** Bahamas */
  Bs = "BS",
  /** Bhutan */
  Bt = "BT",
  /** Botswana */
  Bw = "BW",
  /** Belarus */
  By = "BY",
  /** Belize */
  Bz = "BZ",
  /** Canada */
  Ca = "CA",
  /** Democratic Republic of the Congo */
  Cd = "CD",
  /** Central African Republic */
  Cf = "CF",
  /** Republic of the Congo */
  Cg = "CG",
  /** Switzerland */
  Ch = "CH",
  /** Ivory Coast */
  Ci = "CI",
  /** Chile */
  Cl = "CL",
  /** Cameroon */
  Cm = "CM",
  /** China */
  Cn = "CN",
  /** Colombia */
  Co = "CO",
  /** Costa Rica */
  Cr = "CR",
  /** Cuba */
  Cu = "CU",
  /** Cape Verde */
  Cv = "CV",
  /** Curaçao */
  Cw = "CW",
  /** Cyprus */
  Cy = "CY",
  /** Czech Republic */
  Cz = "CZ",
  /** Germany */
  De = "DE",
  /** Djibouti */
  Dj = "DJ",
  /** Denmark */
  Dk = "DK",
  /** Dominica */
  Dm = "DM",
  /** Dominican Republic */
  Do = "DO",
  /** Algeria */
  Dz = "DZ",
  /** Ecuador */
  Ec = "EC",
  /** Estonia */
  Ee = "EE",
  /** Egypt */
  Eg = "EG",
  /** Western Sahara */
  Eh = "EH",
  /** Eritrea */
  Er = "ER",
  /** Spain */
  Es = "ES",
  /** Ethiopia */
  Et = "ET",
  /** Finland */
  Fi = "FI",
  /** Fiji */
  Fj = "FJ",
  /** Micronesia */
  Fm = "FM",
  /** Faroe Islands */
  Fo = "FO",
  /** France */
  Fr = "FR",
  /** Gabon */
  Ga = "GA",
  /** United Kingdom */
  Gb = "GB",
  /** Grenada */
  Gd = "GD",
  /** Georgia */
  Ge = "GE",
  /** Guernsey */
  Gg = "GG",
  /** Ghana */
  Gh = "GH",
  /** Greenland */
  Gl = "GL",
  /** Gambia */
  Gm = "GM",
  /** Guinea */
  Gn = "GN",
  /** Equatorial Guinea */
  Gq = "GQ",
  /** Greece */
  Gr = "GR",
  /** Guatemala */
  Gt = "GT",
  /** Guinea-Bissau */
  Gw = "GW",
  /** Guyana */
  Gy = "GY",
  /** Honduras */
  Hn = "HN",
  /** Croatia */
  Hr = "HR",
  /** Haiti */
  Ht = "HT",
  /** Hungary */
  Hu = "HU",
  /** Indonesia */
  Id = "ID",
  /** Ireland */
  Ie = "IE",
  /** Israel */
  Il = "IL",
  /** Isle of Man */
  Im = "IM",
  /** India */
  In = "IN",
  /** Iraq */
  Iq = "IQ",
  /** Iran */
  Ir = "IR",
  /** Iceland */
  Is = "IS",
  /** Italy */
  It = "IT",
  /** Jersey */
  Je = "JE",
  /** Jamaica */
  Jm = "JM",
  /** Jordan */
  Jo = "JO",
  /** Japan */
  Jp = "JP",
  /** Kenya */
  Ke = "KE",
  /** Kyrgyzstan */
  Kg = "KG",
  /** Cambodia */
  Kh = "KH",
  /** Comoros */
  Km = "KM",
  /** Saint Kitts and Nevis */
  Kn = "KN",
  /** North Korea */
  Kp = "KP",
  /** South Korea */
  Kr = "KR",
  /** Kuwait */
  Kw = "KW",
  /** Kazakhstan */
  Kz = "KZ",
  /** Laos */
  La = "LA",
  /** Lebanon */
  Lb = "LB",
  /** Saint Lucia */
  Lc = "LC",
  /** Liechtenstein */
  Li = "LI",
  /** Sri Lanka */
  Lk = "LK",
  /** Liberia */
  Lr = "LR",
  /** Lesotho */
  Ls = "LS",
  /** Lithuania */
  Lt = "LT",
  /** Luxembourg */
  Lu = "LU",
  /** Latvia */
  Lv = "LV",
  /** Morocco */
  Ma = "MA",
  /** Monaco */
  Mc = "MC",
  /** Moldova */
  Md = "MD",
  /** Montenegro */
  Me = "ME",
  /** Madagascar */
  Mg = "MG",
  /** Marshall Islands */
  Mh = "MH",
  /** North Macedonia */
  Mk = "MK",
  /** Mali */
  Ml = "ML",
  /** Myanmar */
  Mm = "MM",
  /** Mongolia */
  Mn = "MN",
  /** Mauritania */
  Mr = "MR",
  /** Malta */
  Mt = "MT",
  /** Mauritius */
  Mu = "MU",
  /** Maldives */
  Mv = "MV",
  /** Malawi */
  Mw = "MW",
  /** Mexico */
  Mx = "MX",
  /** Malaysia */
  My = "MY",
  /** Mozambique */
  Mz = "MZ",
  /** Namibia */
  Na = "NA",
  /** New Caledonia */
  Nc = "NC",
  /** Niger */
  Ne = "NE",
  /** Nigeria */
  Ng = "NG",
  /** Nicaragua */
  Ni = "NI",
  /** Netherlands */
  Nl = "NL",
  /** Norway */
  No = "NO",
  /** Nepal */
  Np = "NP",
  /** New Zealand */
  Nz = "NZ",
  /** Oman */
  Om = "OM",
  /** Panama */
  Pa = "PA",
  /** Peru */
  Pe = "PE",
  /** Papua New Guinea */
  Pg = "PG",
  /** Philippines */
  Ph = "PH",
  /** Pakistan */
  Pk = "PK",
  /** Poland */
  Pl = "PL",
  /** Palestine */
  Ps = "PS",
  /** Portugal */
  Pt = "PT",
  /** Palau */
  Pw = "PW",
  /** Paraguay */
  Py = "PY",
  /** Qatar */
  Qa = "QA",
  /** Romania */
  Ro = "RO",
  /** Serbia */
  Rs = "RS",
  /** Russia */
  Ru = "RU",
  /** Rwanda */
  Rw = "RW",
  /** Saudi Arabia */
  Sa = "SA",
  /** Solomon Islands */
  Sb = "SB",
  /** Seychelles */
  Sc = "SC",
  /** Sudan */
  Sd = "SD",
  /** Sweden */
  Se = "SE",
  /** Singapore */
  Sg = "SG",
  /** Slovenia */
  Si = "SI",
  /** Slovakia */
  Sk = "SK",
  /** Sierra Leone */
  Sl = "SL",
  /** San Marino */
  Sm = "SM",
  /** Senegal */
  Sn = "SN",
  /** Suriname */
  Sr = "SR",
  /** South Sudan */
  Ss = "SS",
  /** El Salvador */
  Sv = "SV",
  /** Syria */
  Sy = "SY",
  /** Swaziland (Eswatini) */
  Sz = "SZ",
  /** Chad */
  Td = "TD",
  /** Togo */
  Tg = "TG",
  /** Thailand */
  Th = "TH",
  /** Tajikistan */
  Tj = "TJ",
  /** Timor-Leste (East Timor) */
  Tl = "TL",
  /** Turkmenistan */
  Tm = "TM",
  /** Tunisia */
  Tn = "TN",
  /** Tonga */
  To = "TO",
  /** Turkey */
  Tr = "TR",
  /** Trinidad and Tobago */
  Tt = "TT",
  /** Tanzania */
  Tz = "TZ",
  /** Ukraine */
  Ua = "UA",
  /** Uganda */
  Ug = "UG",
  /** United States */
  Us = "US",
  /** Uruguay */
  Uy = "UY",
  /** Uzbekistan */
  Uz = "UZ",
  /** Vatican City */
  Va = "VA",
  /** Saint Vincent and the Grenadines */
  Vc = "VC",
  /** Venezuela */
  Ve = "VE",
  /** British Virgin Islands */
  Vg = "VG",
  /** US Virgin Islands */
  Vi = "VI",
  /** Vietnam */
  Vn = "VN",
  /** Vanuatu */
  Vu = "VU",
  /** Samoa */
  Ws = "WS",
  /** Kosovo */
  Xk = "XK",
  /** Yemen */
  Ye = "YE",
  /** South Africa */
  Za = "ZA",
  /** Zambia */
  Zm = "ZM",
  /** Zimbabwe */
  Zw = "ZW",
}

export enum CropRegion {
  Bottom = "BOTTOM",
  Center = "CENTER",
  Left = "LEFT",
  Right = "RIGHT",
  Top = "TOP",
}

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = "AED",
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = "AFN",
  /** Albanian Lek (Albania) - 0 decimals */
  All = "ALL",
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = "AMD",
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = "ANG",
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = "AOA",
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = "ARS",
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = "AUD",
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = "AWG",
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = "AZN",
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = "BAM",
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = "BBD",
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = "BDT",
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = "BGN",
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = "BHD",
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = "BIF",
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = "BMD",
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = "BND",
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = "BOB",
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = "BRL",
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = "BSD",
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = "BTN",
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = "BWP",
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = "BYN",
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = "BZD",
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = "CAD",
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = "CDF",
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = "CHF",
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = "CLP",
  /** Chinese Yuan (China) - 2 decimals */
  Cny = "CNY",
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = "COP",
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = "CRC",
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = "CUP",
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = "CVE",
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = "CZK",
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = "DJF",
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = "DKK",
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = "DOP",
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = "DZD",
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = "EGP",
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = "ERN",
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = "ETB",
  /** Euro (European Union) - 2 decimals */
  Eur = "EUR",
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = "FJD",
  /** Falkland Islands Pound - 2 decimals */
  Fkp = "FKP",
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = "FOK",
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = "GBP",
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = "GEL",
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = "GGP",
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = "GHS",
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = "GIP",
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = "GMD",
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = "GNF",
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = "GTQ",
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = "GYD",
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = "HKD",
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = "HNL",
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = "HRK",
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = "HTG",
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = "HUF",
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = "IDR",
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = "ILS",
  /** Isle of Man Pound - 2 decimals */
  Imp = "IMP",
  /** Indian Rupee (India) - 2 decimals */
  Inr = "INR",
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = "IQD",
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = "IRR",
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = "ISK",
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = "JEP",
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = "JMD",
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = "JOD",
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = "JPY",
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = "KES",
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = "KGS",
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = "KHR",
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = "KMF",
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = "KPW",
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = "KRW",
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = "KWD",
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = "KYD",
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = "KZT",
  /** Lao Kip (Laos) - 2 decimals */
  Lak = "LAK",
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = "LBP",
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = "LKR",
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = "LRD",
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = "LSL",
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = "LYD",
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = "MAD",
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = "MDL",
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = "MGA",
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = "MKD",
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = "MMK",
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = "MNT",
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = "MOP",
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = "MRU",
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = "MUR",
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = "MVR",
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = "MWK",
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = "MXN",
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = "MYR",
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = "MZN",
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = "NAD",
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = "NGN",
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = "NIO",
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = "NOK",
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = "NPR",
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = "NZD",
  /** Omani Rial (Oman) - 3 decimals */
  Omr = "OMR",
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = "PAB",
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = "PEN",
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = "PGK",
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = "PHP",
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = "PKR",
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = "PLN",
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = "PYG",
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = "QAR",
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = "RON",
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = "RSD",
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = "RUB",
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = "RWF",
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = "SAR",
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = "SBD",
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = "SCR",
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = "SDG",
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = "SEK",
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = "SGD",
  /** Saint Helena Pound - 2 decimals */
  Shp = "SHP",
  /** Sierra Leonean Leone - 2 decimals */
  Sle = "SLE",
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = "SOS",
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = "SRD",
  /** South Sudanese Pound - 2 decimals */
  Ssp = "SSP",
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = "STN",
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = "SVC",
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = "SYP",
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = "SZL",
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = "THB",
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = "TJS",
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = "TMT",
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = "TND",
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = "TOP",
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = "TRY",
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = "TTD",
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = "TWD",
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = "TZS",
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = "UAH",
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = "UGX",
  /** United States Dollar (USA) - 2 decimals */
  Usd = "USD",
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = "UYU",
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = "UZS",
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = "VES",
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = "VND",
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = "VUV",
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = "WST",
  /** Central African CFA Franc - 0 decimals */
  Xaf = "XAF",
  /** East Caribbean Dollar - 2 decimals */
  Xcd = "XCD",
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = "XDR",
  /** West African CFA Franc - 0 decimals */
  Xof = "XOF",
  /** CFP Franc - 0 decimals */
  Xpf = "XPF",
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = "YER",
  /** South African Rand (South Africa) - 2 decimals */
  Zar = "ZAR",
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = "ZMW",
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = "ZWL",
}

export enum CurrencyDisplay {
  Code = "CODE",
  Name = "NAME",
  NarrowSymbol = "NARROW_SYMBOL",
  Symbol = "SYMBOL",
}

export enum CurrencyGrouping {
  Always = "ALWAYS",
  Auto = "AUTO",
  Min2 = "MIN2",
  Never = "NEVER",
}

export enum CurrencyRoundingMode {
  Ceil = "CEIL",
  Expand = "EXPAND",
  Floor = "FLOOR",
  HalfCeil = "HALF_CEIL",
  HalfEven = "HALF_EVEN",
  HalfExpand = "HALF_EXPAND",
  HalfFloor = "HALF_FLOOR",
  HalfTrunc = "HALF_TRUNC",
  Trunc = "TRUNC",
}

export enum CurrencySign {
  Accounting = "ACCOUNTING",
  Standard = "STANDARD",
}

export enum CurrencySignDisplay {
  Always = "ALWAYS",
  Auto = "AUTO",
  ExceptZero = "EXCEPT_ZERO",
  Negative = "NEGATIVE",
  Never = "NEVER",
}

export enum CurrencyTrailingZeroDisplay {
  Auto = "AUTO",
  StripIfInteger = "STRIP_IF_INTEGER",
}

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomer = ApiNode & {
  __typename?: "Customer";
  accountStatus: CustomerAccountStatus;
  addresses: ApiCustomerAddressConnection;
  /** Reason the customer is currently blocked. Null for other lifecycle states. */
  blockedReason?: Maybe<Scalars["String"]["output"]>;
  companyName?: Maybe<Scalars["String"]["output"]>;
  /** The customer's persisted product comparison selection. */
  comparison?: Maybe<ApiCustomerComparison>;
  /** At most one current consent record per channel. */
  consents: Array<ApiCustomerConsent>;
  createdAt: Scalars["DateTime"]["output"];
  createdByUserId?: Maybe<Scalars["String"]["output"]>;
  dateOfBirth?: Maybe<Scalars["Date"]["output"]>;
  defaultBillingAddress?: Maybe<ApiCustomerAddress>;
  defaultShippingAddress?: Maybe<ApiCustomerAddress>;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  displayName: Scalars["String"]["output"];
  email?: Maybe<Scalars["Email"]["output"]>;
  emailVerified: Scalars["Boolean"]["output"];
  /** External CRM/ERP identities currently linked to this customer. */
  externalReferences: Array<ApiCustomerExternalReference>;
  firstName?: Maybe<Scalars["String"]["output"]>;
  gender?: Maybe<Scalars["String"]["output"]>;
  groupMemberships: ApiCustomerGroupMembershipConnection;
  /** Opaque IAM principal identifier. Null for guests and imported profiles. */
  iamPrincipalId?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  jobTitle?: Maybe<Scalars["String"]["output"]>;
  lastActivityAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastName?: Maybe<Scalars["String"]["output"]>;
  lifecycleStatus: CustomerLifecycleStatus;
  mergedInto?: Maybe<ApiCustomer>;
  middleName?: Maybe<Scalars["String"]["output"]>;
  /** Internal moderation context visible only to administrators. */
  moderationNote?: Maybe<Scalars["String"]["output"]>;
  monetaryStatistics: ApiCustomerMonetaryStatisticsConnection;
  note?: Maybe<Scalars["String"]["output"]>;
  phoneE164?: Maybe<Scalars["String"]["output"]>;
  phoneVerified: Scalars["Boolean"]["output"];
  preferredLocale?: Maybe<Scalars["String"]["output"]>;
  prefix?: Maybe<Scalars["String"]["output"]>;
  redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
  revision: Scalars["Int"]["output"];
  segmentMemberships: ApiCustomerSegmentMembershipConnection;
  source: Scalars["String"]["output"];
  statistics?: Maybe<ApiCustomerStatistics>;
  suffix?: Maybe<Scalars["String"]["output"]>;
  tagAssignments: ApiCustomerTagAssignmentConnection;
  taxExemptions: ApiCustomerTaxExemptionConnection;
  taxIdentifiers: ApiCustomerTaxIdentifierConnection;
  updatedAt: Scalars["DateTime"]["output"];
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerAddressesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerAddressOrderByInput>>;
  where?: InputMaybe<ApiCustomerAddressWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerGroupMembershipsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerMonetaryStatisticsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerMonetaryStatisticsOrderByInput>>;
  where?: InputMaybe<ApiCustomerMonetaryStatisticsWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerSegmentMembershipsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTagAssignmentsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTaxExemptionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerTaxExemptionOrderByInput>>;
  where?: InputMaybe<ApiCustomerTaxExemptionWhereInput>;
};

/** A store-scoped customer business profile owned by Customers. */
export type ApiCustomerTaxIdentifiersArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerTaxIdentifierOrderByInput>>;
  where?: InputMaybe<ApiCustomerTaxIdentifierWhereInput>;
};

export enum CustomerAccountStatus {
  Guest = "GUEST",
  Invited = "INVITED",
  Registered = "REGISTERED",
}

export type ApiCustomerAccountStatusFilter = {
  _eq?: InputMaybe<CustomerAccountStatus>;
  _in?: InputMaybe<Array<CustomerAccountStatus>>;
  _neq?: InputMaybe<CustomerAccountStatus>;
  _notIn?: InputMaybe<Array<CustomerAccountStatus>>;
};

export type ApiCustomerAccountsSettings = {
  __typename?: "CustomerAccountsSettings";
  methods: Array<ApiCustomerAuthenticationMethodSettings>;
  providers: Array<ApiCustomerAuthenticationProviderSettings>;
  realmEnabled: Scalars["Boolean"]["output"];
  registrationMode: Scalars["String"]["output"];
  revision: Scalars["Int"]["output"];
};

export type ApiCustomerAccountsSettingsUpdateInput = {
  enabledMethods: Array<CustomerAuthenticationMethod>;
  expectedRevision: Scalars["Int"]["input"];
};

export type ApiCustomerAccountsSettingsUpdatePayload = {
  __typename?: "CustomerAccountsSettingsUpdatePayload";
  settings?: Maybe<ApiCustomerAccountsSettings>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerAddress = ApiNode & {
  __typename?: "CustomerAddress";
  address1: Scalars["String"]["output"];
  address2?: Maybe<Scalars["String"]["output"]>;
  city: Scalars["String"]["output"];
  companyName?: Maybe<Scalars["String"]["output"]>;
  /** Uppercase ISO 3166-1 alpha-2 code. */
  countryCode: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  firstName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  isDefaultBilling: Scalars["Boolean"]["output"];
  isDefaultShipping: Scalars["Boolean"]["output"];
  label?: Maybe<Scalars["String"]["output"]>;
  lastName?: Maybe<Scalars["String"]["output"]>;
  latitude?: Maybe<Scalars["Float"]["output"]>;
  longitude?: Maybe<Scalars["Float"]["output"]>;
  middleName?: Maybe<Scalars["String"]["output"]>;
  phoneE164?: Maybe<Scalars["String"]["output"]>;
  postalCode?: Maybe<Scalars["String"]["output"]>;
  prefix?: Maybe<Scalars["String"]["output"]>;
  regionCode?: Maybe<Scalars["String"]["output"]>;
  regionName?: Maybe<Scalars["String"]["output"]>;
  suffix?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  validatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  validationStatus: CustomerAddressValidationStatus;
};

export type ApiCustomerAddressConnection = {
  __typename?: "CustomerAddressConnection";
  edges: Array<ApiCustomerAddressEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Address values used inside the unified customerUpdate workflow. */
export type ApiCustomerAddressCreateOperationInput = {
  address1: Scalars["String"]["input"];
  address2?: InputMaybe<Scalars["String"]["input"]>;
  city: Scalars["String"]["input"];
  companyName?: InputMaybe<Scalars["String"]["input"]>;
  countryCode: Scalars["String"]["input"];
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  isDefaultBilling?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDefaultShipping?: InputMaybe<Scalars["Boolean"]["input"]>;
  label?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  latitude?: InputMaybe<Scalars["Float"]["input"]>;
  longitude?: InputMaybe<Scalars["Float"]["input"]>;
  middleName?: InputMaybe<Scalars["String"]["input"]>;
  phoneE164?: InputMaybe<Scalars["String"]["input"]>;
  postalCode?: InputMaybe<Scalars["String"]["input"]>;
  prefix?: InputMaybe<Scalars["String"]["input"]>;
  regionCode?: InputMaybe<Scalars["String"]["input"]>;
  regionName?: InputMaybe<Scalars["String"]["input"]>;
  suffix?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerAddressEdge = {
  __typename?: "CustomerAddressEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerAddress;
};

/** Ordering configuration for CustomerAddress */
export type ApiCustomerAddressOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerAddressOrderField;
};

/** Fields available for sorting CustomerAddress */
export enum CustomerAddressOrderField {
  /** Sort by city */
  City = "city",
  /** Sort by countryCode */
  CountryCode = "countryCode",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by firstName */
  FirstName = "firstName",
  /** Sort by id */
  Id = "id",
  /** Sort by isDefaultBilling */
  IsDefaultBilling = "isDefaultBilling",
  /** Sort by isDefaultShipping */
  IsDefaultShipping = "isDefaultShipping",
  /** Sort by label */
  Label = "label",
  /** Sort by lastName */
  LastName = "lastName",
  /** Sort by postalCode */
  PostalCode = "postalCode",
  /** Sort by regionCode */
  RegionCode = "regionCode",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by validationStatus */
  ValidationStatus = "validationStatus",
}

export type ApiCustomerAddressPatchInput = {
  address1?: InputMaybe<Scalars["String"]["input"]>;
  address2?: InputMaybe<Scalars["String"]["input"]>;
  city?: InputMaybe<Scalars["String"]["input"]>;
  companyName?: InputMaybe<Scalars["String"]["input"]>;
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  /** Set or clear this address as the customer's billing default. */
  isDefaultBilling?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Set or clear this address as the customer's shipping default. */
  isDefaultShipping?: InputMaybe<Scalars["Boolean"]["input"]>;
  label?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  latitude?: InputMaybe<Scalars["Float"]["input"]>;
  longitude?: InputMaybe<Scalars["Float"]["input"]>;
  middleName?: InputMaybe<Scalars["String"]["input"]>;
  phoneE164?: InputMaybe<Scalars["String"]["input"]>;
  postalCode?: InputMaybe<Scalars["String"]["input"]>;
  prefix?: InputMaybe<Scalars["String"]["input"]>;
  regionCode?: InputMaybe<Scalars["String"]["input"]>;
  regionName?: InputMaybe<Scalars["String"]["input"]>;
  suffix?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerAddressUpdateOperationInput = {
  addressId: Scalars["ID"]["input"];
  operations: ApiCustomerAddressPatchInput;
};

export enum CustomerAddressValidationStatus {
  Invalid = "INVALID",
  Unvalidated = "UNVALIDATED",
  Valid = "VALID",
}

export type ApiCustomerAddressValidationStatusFilter = {
  _eq?: InputMaybe<CustomerAddressValidationStatus>;
  _in?: InputMaybe<Array<CustomerAddressValidationStatus>>;
  _neq?: InputMaybe<CustomerAddressValidationStatus>;
  _notIn?: InputMaybe<Array<CustomerAddressValidationStatus>>;
};

/** Filter conditions for CustomerAddress */
export type ApiCustomerAddressWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerAddressWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerAddressWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerAddressWhereInput>>;
  /** Filter by city */
  city?: InputMaybe<ApiStringFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<ApiStringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefaultBilling */
  isDefaultBilling?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isDefaultShipping */
  isDefaultShipping?: InputMaybe<ApiBooleanFilter>;
  /** Filter by label */
  label?: InputMaybe<ApiStringFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<ApiStringFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<ApiStringFilter>;
  /** Filter by postalCode */
  postalCode?: InputMaybe<ApiStringFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validationStatus */
  validationStatus?: InputMaybe<ApiCustomerAddressValidationStatusFilter>;
};

/** Batched address changes scoped to the customer being updated. */
export type ApiCustomerAddressesUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerAddressCreateOperationInput>>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultBillingAddressId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Existing address ID to make the default. Explicit null clears the default. */
  defaultShippingAddressId?: InputMaybe<Scalars["ID"]["input"]>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  update?: InputMaybe<Array<ApiCustomerAddressUpdateOperationInput>>;
};

/** Lifecycle states that a merchant administrator may select directly. */
export enum CustomerAdminLifecycleStatus {
  Active = "ACTIVE",
  Blocked = "BLOCKED",
  Disabled = "DISABLED",
}

export enum CustomerAssignmentSource {
  Import = "IMPORT",
  Manual = "MANUAL",
  Rule = "RULE",
  System = "SYSTEM",
}

export type ApiCustomerAssignmentSourceFilter = {
  _eq?: InputMaybe<CustomerAssignmentSource>;
  _in?: InputMaybe<Array<CustomerAssignmentSource>>;
  _neq?: InputMaybe<CustomerAssignmentSource>;
  _notIn?: InputMaybe<Array<CustomerAssignmentSource>>;
};

export enum CustomerAuthenticationMethod {
  EmailOtp = "EMAIL_OTP",
  Password = "PASSWORD",
  PhoneOtp = "PHONE_OTP",
}

export type ApiCustomerAuthenticationMethodSettings = {
  __typename?: "CustomerAuthenticationMethodSettings";
  configured: Scalars["Boolean"]["output"];
  enabled: Scalars["Boolean"]["output"];
  method: CustomerAuthenticationMethod;
};

export enum CustomerAuthenticationProvider {
  Facebook = "FACEBOOK",
  Google = "GOOGLE",
}

export type ApiCustomerAuthenticationProviderSettings = {
  __typename?: "CustomerAuthenticationProviderSettings";
  configured: Scalars["Boolean"]["output"];
  enabled: Scalars["Boolean"]["output"];
  provider: CustomerAuthenticationProvider;
};

/** Company fields in the unified customer update. */
export type ApiCustomerCompanyUpdateInput = {
  companyName?: InputMaybe<Scalars["String"]["input"]>;
  jobTitle?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * An authenticated customer's persisted product comparison selection.
 *
 * This Admin view is read-only. Product compatibility and the comparison matrix
 * remain owned and resolved by Catalog.
 */
export type ApiCustomerComparison = ApiNode & {
  __typename?: "CustomerComparison";
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  id: Scalars["ID"]["output"];
  items: Array<ApiCustomerComparisonItem>;
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

/** One concrete Catalog variant stored as a comparison column. */
export type ApiCustomerComparisonItem = ApiNode & {
  __typename?: "CustomerComparisonItem";
  addedAt: Scalars["DateTime"]["output"];
  comparison: ApiCustomerComparison;
  id: Scalars["ID"]["output"];
  position: Scalars["Int"]["output"];
  product?: Maybe<ApiProduct>;
  productId: Scalars["ID"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  variant?: Maybe<ApiVariant>;
  variantId: Scalars["ID"]["output"];
};

export type ApiCustomerConnection = {
  __typename?: "CustomerConnection";
  edges: Array<ApiCustomerEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Current consent state for one customer and channel. */
export type ApiCustomerConsent = ApiNode & {
  __typename?: "CustomerConsent";
  channel: CustomerConsentChannel;
  consentedAt?: Maybe<Scalars["DateTime"]["output"]>;
  contactPoint: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  events: ApiCustomerConsentEventConnection;
  id: Scalars["ID"]["output"];
  optInLevel: CustomerConsentOptInLevel;
  source: Scalars["String"]["output"];
  sourceIp?: Maybe<Scalars["String"]["output"]>;
  sourceLocationId?: Maybe<Scalars["ID"]["output"]>;
  state: CustomerConsentState;
  updatedAt: Scalars["DateTime"]["output"];
  userAgent?: Maybe<Scalars["String"]["output"]>;
  withdrawnAt?: Maybe<Scalars["DateTime"]["output"]>;
};

/** Current consent state for one customer and channel. */
export type ApiCustomerConsentEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerConsentEventOrderByInput>>;
};

/** Consent states that a merchant administrator may set explicitly. */
export enum CustomerConsentAdminState {
  NotSubscribed = "NOT_SUBSCRIBED",
  Pending = "PENDING",
  Subscribed = "SUBSCRIBED",
  Unsubscribed = "UNSUBSCRIBED",
}

export enum CustomerConsentChannel {
  Email = "EMAIL",
  Push = "PUSH",
  Sms = "SMS",
  Whatsapp = "WHATSAPP",
}

/** Immutable evidence record for a consent transition. */
export type ApiCustomerConsentEvent = ApiNode & {
  __typename?: "CustomerConsentEvent";
  actorId?: Maybe<Scalars["String"]["output"]>;
  actorType: Scalars["String"]["output"];
  channel: CustomerConsentChannel;
  consent: ApiCustomerConsent;
  contactPoint: Scalars["String"]["output"];
  customer: ApiCustomer;
  evidence: Scalars["JSON"]["output"];
  id: Scalars["ID"]["output"];
  idempotencyKey?: Maybe<Scalars["String"]["output"]>;
  newState: CustomerConsentState;
  occurredAt: Scalars["DateTime"]["output"];
  optInLevel: CustomerConsentOptInLevel;
  previousState?: Maybe<CustomerConsentState>;
  requestId?: Maybe<Scalars["String"]["output"]>;
  source: Scalars["String"]["output"];
  sourceIp?: Maybe<Scalars["String"]["output"]>;
  sourceLocationId?: Maybe<Scalars["ID"]["output"]>;
  userAgent?: Maybe<Scalars["String"]["output"]>;
};

export type ApiCustomerConsentEventConnection = {
  __typename?: "CustomerConsentEventConnection";
  edges: Array<ApiCustomerConsentEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerConsentEventEdge = {
  __typename?: "CustomerConsentEventEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerConsentEvent;
};

/** Ordering configuration for CustomerConsentEvent */
export type ApiCustomerConsentEventOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerConsentEventOrderField;
};

/** Fields available for sorting CustomerConsentEvent */
export enum CustomerConsentEventOrderField {
  /** Sort by actorType */
  ActorType = "actorType",
  /** Sort by channel */
  Channel = "channel",
  /** Sort by id */
  Id = "id",
  /** Sort by newState */
  NewState = "newState",
  /** Sort by occurredAt */
  OccurredAt = "occurredAt",
  /** Sort by source */
  Source = "source",
}

export enum CustomerConsentOptInLevel {
  ConfirmedOptIn = "CONFIRMED_OPT_IN",
  SingleOptIn = "SINGLE_OPT_IN",
  Unknown = "UNKNOWN",
}

export enum CustomerConsentState {
  Invalid = "INVALID",
  NotSubscribed = "NOT_SUBSCRIBED",
  Pending = "PENDING",
  Redacted = "REDACTED",
  Subscribed = "SUBSCRIBED",
  Unsubscribed = "UNSUBSCRIBED",
}

export type ApiCustomerConsentStateFilter = {
  _eq?: InputMaybe<CustomerConsentState>;
  _in?: InputMaybe<Array<CustomerConsentState>>;
  _neq?: InputMaybe<CustomerConsentState>;
  _notIn?: InputMaybe<Array<CustomerConsentState>>;
};

/** Consent transition scoped to the customer being updated. */
export type ApiCustomerConsentUpdateOperationInput = {
  channel: CustomerConsentChannel;
  contactPoint: Scalars["String"]["input"];
  evidence?: InputMaybe<Scalars["JSON"]["input"]>;
  /** Defaults to UNKNOWN when omitted. */
  optInLevel?: InputMaybe<CustomerConsentOptInLevel>;
  sourceLocationId?: InputMaybe<Scalars["ID"]["input"]>;
  state: CustomerConsentAdminState;
};

/** Batched consent transitions keyed by channel. */
export type ApiCustomerConsentsUpdateInput = {
  set: Array<ApiCustomerConsentUpdateOperationInput>;
};

/** Contact projections in the unified customer update. */
export type ApiCustomerContactUpdateInput = {
  email?: InputMaybe<Scalars["Email"]["input"]>;
  phoneE164?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerCreateInput = {
  companyName?: InputMaybe<Scalars["String"]["input"]>;
  dateOfBirth?: InputMaybe<Scalars["Date"]["input"]>;
  email?: InputMaybe<Scalars["Email"]["input"]>;
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  gender?: InputMaybe<Scalars["String"]["input"]>;
  jobTitle?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  middleName?: InputMaybe<Scalars["String"]["input"]>;
  moderationNote?: InputMaybe<Scalars["String"]["input"]>;
  note?: InputMaybe<Scalars["String"]["input"]>;
  phoneE164?: InputMaybe<Scalars["String"]["input"]>;
  preferredLocale?: InputMaybe<Scalars["String"]["input"]>;
  prefix?: InputMaybe<Scalars["String"]["input"]>;
  suffix?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerCreatePayload = {
  __typename?: "CustomerCreatePayload";
  customer?: Maybe<ApiCustomer>;
  userErrors: Array<ApiGenericUserError>;
};

/** Auditable privacy access, export, correction or erasure workflow. */
export type ApiCustomerDataRequest = ApiNode & {
  __typename?: "CustomerDataRequest";
  customer: ApiCustomer;
  dueAt?: Maybe<Scalars["DateTime"]["output"]>;
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  legalBasis?: Maybe<Scalars["String"]["output"]>;
  rejectionReason?: Maybe<Scalars["String"]["output"]>;
  requestMetadata: Scalars["JSON"]["output"];
  requestedAt: Scalars["DateTime"]["output"];
  requestedById?: Maybe<Scalars["String"]["output"]>;
  requestedByType: Scalars["String"]["output"];
  resultFile?: Maybe<ApiFile>;
  resultFileId?: Maybe<Scalars["ID"]["output"]>;
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: CustomerDataRequestStatus;
  type: CustomerDataRequestType;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerDataRequestCancelOperationInput = {
  reason?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerDataRequestConnection = {
  __typename?: "CustomerDataRequestConnection";
  edges: Array<ApiCustomerDataRequestEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerDataRequestCreateInput = {
  customerId: Scalars["ID"]["input"];
  dueAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  legalBasis?: InputMaybe<Scalars["String"]["input"]>;
  requestMetadata?: InputMaybe<Scalars["JSON"]["input"]>;
  type: CustomerDataRequestType;
};

export type ApiCustomerDataRequestCreatePayload = {
  __typename?: "CustomerDataRequestCreatePayload";
  dataRequest?: Maybe<ApiCustomerDataRequest>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerDataRequestDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiCustomerDataRequestDeletePayload = {
  __typename?: "CustomerDataRequestDeletePayload";
  deletedDataRequestId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerDataRequestEdge = {
  __typename?: "CustomerDataRequestEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerDataRequest;
};

/** Ordering configuration for CustomerDataRequest */
export type ApiCustomerDataRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerDataRequestOrderField;
};

/** Fields available for sorting CustomerDataRequest */
export enum CustomerDataRequestOrderField {
  /** Sort by dueAt */
  DueAt = "dueAt",
  /** Sort by finishedAt */
  FinishedAt = "finishedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by requestedAt */
  RequestedAt = "requestedAt",
  /** Sort by startedAt */
  StartedAt = "startedAt",
  /** Sort by status */
  Status = "status",
  /** Sort by type */
  Type = "type",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export enum CustomerDataRequestStatus {
  Cancelled = "CANCELLED",
  Completed = "COMPLETED",
  Pending = "PENDING",
  Processing = "PROCESSING",
  Rejected = "REJECTED",
}

export type ApiCustomerDataRequestStatusFilter = {
  _eq?: InputMaybe<CustomerDataRequestStatus>;
  _in?: InputMaybe<Array<CustomerDataRequestStatus>>;
  _neq?: InputMaybe<CustomerDataRequestStatus>;
  _notIn?: InputMaybe<Array<CustomerDataRequestStatus>>;
};

export enum CustomerDataRequestType {
  Access = "ACCESS",
  Correction = "CORRECTION",
  Erasure = "ERASURE",
  Export = "EXPORT",
}

export type ApiCustomerDataRequestTypeFilter = {
  _eq?: InputMaybe<CustomerDataRequestType>;
  _in?: InputMaybe<Array<CustomerDataRequestType>>;
  _neq?: InputMaybe<CustomerDataRequestType>;
  _notIn?: InputMaybe<Array<CustomerDataRequestType>>;
};

/** Update request metadata, its customer relation, or cancel the workflow. */
export type ApiCustomerDataRequestUpdateInput = {
  cancel?: InputMaybe<ApiCustomerDataRequestCancelOperationInput>;
  customerId?: InputMaybe<Scalars["ID"]["input"]>;
  dueAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  legalBasis?: InputMaybe<Scalars["String"]["input"]>;
  requestMetadata?: InputMaybe<Scalars["JSON"]["input"]>;
  type?: InputMaybe<CustomerDataRequestType>;
};

export type ApiCustomerDataRequestUpdatePayload = {
  __typename?: "CustomerDataRequestUpdatePayload";
  dataRequest?: Maybe<ApiCustomerDataRequest>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerDataRequest */
export type ApiCustomerDataRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerDataRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerDataRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerDataRequestWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by legalBasis */
  legalBasis?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<ApiStringFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerDataRequestStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<ApiCustomerDataRequestTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCustomerDeleteInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiCustomerDeletePayload = {
  __typename?: "CustomerDeletePayload";
  deletedCustomerId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerEdge = {
  __typename?: "CustomerEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomer;
};

/** A store-scoped customer identity in an external CRM or ERP system. */
export type ApiCustomerExternalReference = ApiNode & {
  __typename?: "CustomerExternalReference";
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  externalId: Scalars["String"]["output"];
  externalSystem: Scalars["String"]["output"];
  externalType: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  metadata: Scalars["JSON"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerGroup = ApiNode & {
  __typename?: "CustomerGroup";
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  customerMemberships: ApiCustomerGroupMembershipConnection;
  customersCount: Scalars["Int"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  isActive: Scalars["Boolean"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  name: Scalars["String"]["output"];
  /** Aggregate revision incremented by definition, state and membership changes. */
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerGroupCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
};

export type ApiCustomerGroupConnection = {
  __typename?: "CustomerGroupConnection";
  edges: Array<ApiCustomerGroupEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerGroupCreateInput = {
  code: Scalars["String"]["input"];
  description?: InputMaybe<Scalars["String"]["input"]>;
  isActive?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  name: Scalars["String"]["input"];
};

export type ApiCustomerGroupCreatePayload = {
  __typename?: "CustomerGroupCreatePayload";
  group?: Maybe<ApiCustomerGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerGroupDefinitionUpdateInput = {
  code?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerGroupDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiCustomerGroupDeletePayload = {
  __typename?: "CustomerGroupDeletePayload";
  deletedGroupId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerGroupEdge = {
  __typename?: "CustomerGroupEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerGroup;
};

export type ApiCustomerGroupMembership = ApiNode & {
  __typename?: "CustomerGroupMembership";
  assignedAt: Scalars["DateTime"]["output"];
  assignedById?: Maybe<Scalars["String"]["output"]>;
  customer: ApiCustomer;
  expiresAt?: Maybe<Scalars["DateTime"]["output"]>;
  group: ApiCustomerGroup;
  id: Scalars["ID"]["output"];
  isActive: Scalars["Boolean"]["output"];
  isPrimary: Scalars["Boolean"]["output"];
  source: CustomerAssignmentSource;
};

export type ApiCustomerGroupMembershipConnection = {
  __typename?: "CustomerGroupMembershipConnection";
  edges: Array<ApiCustomerGroupMembershipEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerGroupMembershipEdge = {
  __typename?: "CustomerGroupMembershipEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerGroupMembership;
};

/** Ordering configuration for CustomerGroupMembership */
export type ApiCustomerGroupMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupMembershipOrderField;
};

/** Fields available for sorting CustomerGroupMembership */
export enum CustomerGroupMembershipOrderField {
  /** Sort by assignedAt */
  AssignedAt = "assignedAt",
  /** Sort by expiresAt */
  ExpiresAt = "expiresAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isPrimary */
  IsPrimary = "isPrimary",
  /** Sort by source */
  Source = "source",
}

/** Create a customer's membership in this group. */
export type ApiCustomerGroupMembershipRelationCreateInput = {
  customerId: Scalars["ID"]["input"];
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiCustomerGroupMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
  membershipId: Scalars["ID"]["input"];
};

export type ApiCustomerGroupMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerGroupMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  update?: InputMaybe<Array<ApiCustomerGroupMembershipRelationUpdateInput>>;
};

/** One group membership used by the unified customer update. */
export type ApiCustomerGroupMembershipUpdateOperationInput = {
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  groupId: Scalars["ID"]["input"];
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Filter conditions for CustomerGroupMembership */
export type ApiCustomerGroupMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerGroupMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerGroupMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerGroupMembershipWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by groupId */
  groupId?: InputMaybe<ApiIdFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<ApiBooleanFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiCustomerAssignmentSourceFilter>;
};

/** Replace all manual group memberships for the customer. */
export type ApiCustomerGroupMembershipsUpdateInput = {
  memberships: Array<ApiCustomerGroupMembershipUpdateOperationInput>;
};

/** Ordering configuration for CustomerGroup */
export type ApiCustomerGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerGroupOrderField;
};

/** Fields available for sorting CustomerGroup */
export enum CustomerGroupOrderField {
  /** Sort by code */
  Code = "code",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isActive */
  IsActive = "isActive",
  /** Sort by isDefault */
  IsDefault = "isDefault",
  /** Sort by name */
  Name = "name",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiCustomerGroupStateUpdateInput = {
  isActive?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiCustomerGroupUpdateInput = {
  definition?: InputMaybe<ApiCustomerGroupDefinitionUpdateInput>;
  /** Create, update, or delete customer memberships in this group. */
  memberships?: InputMaybe<ApiCustomerGroupMembershipRelationsUpdateInput>;
  state?: InputMaybe<ApiCustomerGroupStateUpdateInput>;
};

export type ApiCustomerGroupUpdatePayload = {
  __typename?: "CustomerGroupUpdatePayload";
  group?: Maybe<ApiCustomerGroup>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerGroup */
export type ApiCustomerGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerGroupWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export enum CustomerLifecycleStatus {
  Active = "ACTIVE",
  Blocked = "BLOCKED",
  Disabled = "DISABLED",
  Merged = "MERGED",
  Redacted = "REDACTED",
}

export type ApiCustomerLifecycleStatusFilter = {
  _eq?: InputMaybe<CustomerLifecycleStatus>;
  _in?: InputMaybe<Array<CustomerLifecycleStatus>>;
  _neq?: InputMaybe<CustomerLifecycleStatus>;
  _notIn?: InputMaybe<Array<CustomerLifecycleStatus>>;
};

/** Idempotent workflow that merges one customer profile into another. */
export type ApiCustomerMerge = ApiNode & {
  __typename?: "CustomerMerge";
  errorCode?: Maybe<Scalars["String"]["output"]>;
  errorMessage?: Maybe<Scalars["String"]["output"]>;
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  reason?: Maybe<Scalars["String"]["output"]>;
  requestedAt: Scalars["DateTime"]["output"];
  requestedById?: Maybe<Scalars["String"]["output"]>;
  requestedByType: Scalars["String"]["output"];
  resolution: Scalars["JSON"]["output"];
  sourceCustomer: ApiCustomer;
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: CustomerMergeStatus;
  targetCustomer: ApiCustomer;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerMergeConnection = {
  __typename?: "CustomerMergeConnection";
  edges: Array<ApiCustomerMergeEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerMergeCreateInput = {
  reason?: InputMaybe<Scalars["String"]["input"]>;
  sourceCustomerId: Scalars["ID"]["input"];
  targetCustomerId: Scalars["ID"]["input"];
};

export type ApiCustomerMergeCreatePayload = {
  __typename?: "CustomerMergeCreatePayload";
  merge?: Maybe<ApiCustomerMerge>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerMergeDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiCustomerMergeDeletePayload = {
  __typename?: "CustomerMergeDeletePayload";
  deletedMergeId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerMergeEdge = {
  __typename?: "CustomerMergeEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerMerge;
};

/** Ordering configuration for CustomerMerge */
export type ApiCustomerMergeOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMergeOrderField;
};

/** Fields available for sorting CustomerMerge */
export enum CustomerMergeOrderField {
  /** Sort by finishedAt */
  FinishedAt = "finishedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by requestedAt */
  RequestedAt = "requestedAt",
  /** Sort by startedAt */
  StartedAt = "startedAt",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export enum CustomerMergeStatus {
  Completed = "COMPLETED",
  Failed = "FAILED",
  InProgress = "IN_PROGRESS",
  Requested = "REQUESTED",
}

export type ApiCustomerMergeStatusFilter = {
  _eq?: InputMaybe<CustomerMergeStatus>;
  _in?: InputMaybe<Array<CustomerMergeStatus>>;
  _neq?: InputMaybe<CustomerMergeStatus>;
  _notIn?: InputMaybe<Array<CustomerMergeStatus>>;
};

/** Update merge metadata or either customer relation before processing starts. */
export type ApiCustomerMergeUpdateInput = {
  reason?: InputMaybe<Scalars["String"]["input"]>;
  sourceCustomerId?: InputMaybe<Scalars["ID"]["input"]>;
  targetCustomerId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiCustomerMergeUpdatePayload = {
  __typename?: "CustomerMergeUpdatePayload";
  merge?: Maybe<ApiCustomerMerge>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerMerge */
export type ApiCustomerMergeWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerMergeWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerMergeWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerMergeWhereInput>>;
  /** Filter by errorCode */
  errorCode?: InputMaybe<ApiStringFilter>;
  /** Filter by finishedAt */
  finishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedAt */
  requestedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by requestedById */
  requestedById?: InputMaybe<ApiStringFilter>;
  /** Filter by requestedByType */
  requestedByType?: InputMaybe<ApiStringFilter>;
  /** Filter by sourceCustomerId */
  sourceCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by startedAt */
  startedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerMergeStatusFilter>;
  /** Filter by targetCustomerId */
  targetCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Internal moderation context independent from the merchant note. */
export type ApiCustomerModerationUpdateInput = {
  moderationNote?: InputMaybe<Scalars["String"]["input"]>;
};

/** Rebuildable monetary customer projection for one ISO 4217 currency. */
export type ApiCustomerMonetaryStatistics = ApiNode & {
  __typename?: "CustomerMonetaryStatistics";
  averageOrderValueMinor: Scalars["BigInt"]["output"];
  currencyCode: CurrencyCode;
  customer: ApiCustomer;
  id: Scalars["ID"]["output"];
  netSpentMinor: Scalars["BigInt"]["output"];
  ordersCount: Scalars["Int"]["output"];
  totalRefundedMinor: Scalars["BigInt"]["output"];
  totalSpentMinor: Scalars["BigInt"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerMonetaryStatisticsConnection = {
  __typename?: "CustomerMonetaryStatisticsConnection";
  edges: Array<ApiCustomerMonetaryStatisticsEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerMonetaryStatisticsEdge = {
  __typename?: "CustomerMonetaryStatisticsEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerMonetaryStatistics;
};

/** Ordering configuration for CustomerMonetaryStatistics */
export type ApiCustomerMonetaryStatisticsOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerMonetaryStatisticsOrderField;
};

/** Fields available for sorting CustomerMonetaryStatistics */
export enum CustomerMonetaryStatisticsOrderField {
  /** Sort by averageOrderValueMinor */
  AverageOrderValueMinor = "averageOrderValueMinor",
  /** Sort by currencyCode */
  CurrencyCode = "currencyCode",
  /** Sort by id */
  Id = "id",
  /** Sort by netSpentMinor */
  NetSpentMinor = "netSpentMinor",
  /** Sort by ordersCount */
  OrdersCount = "ordersCount",
  /** Sort by totalRefundedMinor */
  TotalRefundedMinor = "totalRefundedMinor",
  /** Sort by totalSpentMinor */
  TotalSpentMinor = "totalSpentMinor",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

/** Filter conditions for CustomerMonetaryStatistics */
export type ApiCustomerMonetaryStatisticsWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerMonetaryStatisticsWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerMonetaryStatisticsWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerMonetaryStatisticsWhereInput>>;
  /** Filter by averageOrderValueMinor */
  averageOrderValueMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by currencyCode */
  currencyCode?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by netSpentMinor */
  netSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by totalRefundedMinor */
  totalRefundedMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Merchant note in the unified customer update. */
export type ApiCustomerNoteUpdateInput = {
  note?: InputMaybe<Scalars["String"]["input"]>;
};

/** Result of one operation in a customer-domain update. */
export type ApiCustomerOperationResult = {
  __typename?: "CustomerOperationResult";
  applied: Scalars["Boolean"]["output"];
  errors: Array<ApiGenericUserError>;
  type: CustomerOperationType;
};

export enum CustomerOperationType {
  AddressUpdate = "ADDRESS_UPDATE",
  CompanyUpdate = "COMPANY_UPDATE",
  ConsentUpdate = "CONSENT_UPDATE",
  ContactUpdate = "CONTACT_UPDATE",
  DataRequestUpdate = "DATA_REQUEST_UPDATE",
  GroupUpdate = "GROUP_UPDATE",
  MergeUpdate = "MERGE_UPDATE",
  ModerationUpdate = "MODERATION_UPDATE",
  NoteUpdate = "NOTE_UPDATE",
  ProfileUpdate = "PROFILE_UPDATE",
  SegmentUpdate = "SEGMENT_UPDATE",
  StatusUpdate = "STATUS_UPDATE",
  TagUpdate = "TAG_UPDATE",
  TaxExemptionUpdate = "TAX_EXEMPTION_UPDATE",
  TaxIdentifierUpdate = "TAX_IDENTIFIER_UPDATE",
}

/** Ordering configuration for Customer */
export type ApiCustomerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerOrderField;
};

/** Fields available for sorting Customer */
export enum CustomerOrderField {
  /** Sort by accountStatus */
  AccountStatus = "accountStatus",
  /** Sort by companyName */
  CompanyName = "companyName",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by dateOfBirth */
  DateOfBirth = "dateOfBirth",
  /** Sort by displayName */
  DisplayName = "displayName",
  /** Sort by email */
  Email = "email",
  /** Sort by firstName */
  FirstName = "firstName",
  /** Sort by id */
  Id = "id",
  /** Sort by lastActivityAt */
  LastActivityAt = "lastActivityAt",
  /** Sort by lastName */
  LastName = "lastName",
  /** Sort by lastOrderAt */
  LastOrderAt = "lastOrderAt",
  /** Sort by lifecycleStatus */
  LifecycleStatus = "lifecycleStatus",
  /** Sort by ordersCount */
  OrdersCount = "ordersCount",
  /** Sort by phoneE164 */
  PhoneE164 = "phoneE164",
  /** Sort by totalSpentMinor */
  TotalSpentMinor = "totalSpentMinor",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

/** Personal profile fields in the unified customer update. */
export type ApiCustomerProfileUpdateInput = {
  dateOfBirth?: InputMaybe<Scalars["Date"]["input"]>;
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  gender?: InputMaybe<Scalars["String"]["input"]>;
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  middleName?: InputMaybe<Scalars["String"]["input"]>;
  preferredLocale?: InputMaybe<Scalars["String"]["input"]>;
  prefix?: InputMaybe<Scalars["String"]["input"]>;
  suffix?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerSegment = ApiNode & {
  __typename?: "CustomerSegment";
  /** Optional merchant-selected #RRGGBB presentation color. */
  color?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  createdById?: Maybe<Scalars["String"]["output"]>;
  customerMemberships: ApiCustomerSegmentMembershipConnection;
  customersCount: Scalars["Int"]["output"];
  definition: Scalars["JSON"]["output"];
  definitionRevision: Scalars["Int"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  evaluationGeneration: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  materializationStatus?: Maybe<CustomerSegmentMaterializationStatus>;
  name: Scalars["String"]["output"];
  query?: Maybe<Scalars["String"]["output"]>;
  /** Aggregate revision incremented by definition, state and membership changes. */
  revision: Scalars["Int"]["output"];
  status: CustomerSegmentStatus;
  type: CustomerSegmentType;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerSegmentCustomerMembershipsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentMembershipOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
};

export enum CustomerSegmentAttributeAvailability {
  Available = "AVAILABLE",
  Unavailable = "UNAVAILABLE",
}

export type ApiCustomerSegmentAttributeDescriptor = {
  __typename?: "CustomerSegmentAttributeDescriptor";
  availability: CustomerSegmentAttributeAvailability;
  enumValues: Array<Scalars["String"]["output"]>;
  kind: CustomerSegmentAttributeKind;
  name: Scalars["String"]["output"];
  operators: Array<Scalars["String"]["output"]>;
  parameters: Array<ApiCustomerSegmentFunctionParameterDescriptor>;
  presentationKey: Scalars["String"]["output"];
  unavailabilityReason?: Maybe<Scalars["String"]["output"]>;
  valueType: Scalars["String"]["output"];
};

export enum CustomerSegmentAttributeKind {
  Function = "FUNCTION",
  List = "LIST",
  Scalar = "SCALAR",
  Virtual = "VIRTUAL",
}

export type ApiCustomerSegmentConnection = {
  __typename?: "CustomerSegmentConnection";
  edges: Array<ApiCustomerSegmentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerSegmentCreateInput = {
  color?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  name: Scalars["String"]["input"];
  query?: InputMaybe<Scalars["String"]["input"]>;
  /** Defaults to DRAFT when omitted. */
  status?: InputMaybe<CustomerSegmentStatus>;
  type: CustomerSegmentType;
};

export type ApiCustomerSegmentCreatePayload = {
  __typename?: "CustomerSegmentCreatePayload";
  segment?: Maybe<ApiCustomerSegment>;
  userErrors: Array<ApiCustomerSegmentUserError>;
};

export type ApiCustomerSegmentDefinitionUpdateInput = {
  query: Scalars["String"]["input"];
};

export type ApiCustomerSegmentDeleteInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiCustomerSegmentDeletePayload = {
  __typename?: "CustomerSegmentDeletePayload";
  deletedSegmentId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerSegmentDetailsUpdateInput = {
  color?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export enum CustomerSegmentDiagnosticSeverity {
  Error = "ERROR",
  Warning = "WARNING",
}

export type ApiCustomerSegmentEdge = {
  __typename?: "CustomerSegmentEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerSegment;
};

export type ApiCustomerSegmentFunctionParameterDescriptor = {
  __typename?: "CustomerSegmentFunctionParameterDescriptor";
  aggregate: Scalars["Boolean"]["output"];
  enumValues: Array<Scalars["String"]["output"]>;
  name: Scalars["String"]["output"];
  nullable: Scalars["Boolean"]["output"];
  operators: Array<Scalars["String"]["output"]>;
  presentationKey: Scalars["String"]["output"];
  valueType: Scalars["String"]["output"];
};

export enum CustomerSegmentMaterializationStatus {
  Failed = "FAILED",
  Pending = "PENDING",
  Ready = "READY",
  Running = "RUNNING",
}

export type ApiCustomerSegmentMembership = ApiNode & {
  __typename?: "CustomerSegmentMembership";
  customer: ApiCustomer;
  evaluatedAt: Scalars["DateTime"]["output"];
  expiresAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  isActive: Scalars["Boolean"]["output"];
  segment: ApiCustomerSegment;
  source: CustomerAssignmentSource;
};

export type ApiCustomerSegmentMembershipConnection = {
  __typename?: "CustomerSegmentMembershipConnection";
  edges: Array<ApiCustomerSegmentMembershipEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerSegmentMembershipEdge = {
  __typename?: "CustomerSegmentMembershipEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerSegmentMembership;
};

/** Ordering configuration for CustomerSegmentMembership */
export type ApiCustomerSegmentMembershipOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentMembershipOrderField;
};

/** Fields available for sorting CustomerSegmentMembership */
export enum CustomerSegmentMembershipOrderField {
  /** Sort by evaluatedAt */
  EvaluatedAt = "evaluatedAt",
  /** Sort by expiresAt */
  ExpiresAt = "expiresAt",
  /** Sort by id */
  Id = "id",
  /** Sort by source */
  Source = "source",
}

export type ApiCustomerSegmentMembershipRelationCreateInput = {
  customerId: Scalars["ID"]["input"];
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
};

export type ApiCustomerSegmentMembershipRelationUpdateInput = {
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  membershipId: Scalars["ID"]["input"];
};

export type ApiCustomerSegmentMembershipRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerSegmentMembershipRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Atomically replace all manual memberships with these customers. */
  setCustomerIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  update?: InputMaybe<Array<ApiCustomerSegmentMembershipRelationUpdateInput>>;
};

/** Filter conditions for CustomerSegmentMembership */
export type ApiCustomerSegmentMembershipWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerSegmentMembershipWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerSegmentMembershipWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerSegmentMembershipWhereInput>>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by evaluatedAt */
  evaluatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by segmentId */
  segmentId?: InputMaybe<ApiIdFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiCustomerAssignmentSourceFilter>;
};

/** Replace all manual segment memberships for the customer. */
export type ApiCustomerSegmentMembershipsUpdateInput = {
  segmentIds: Array<Scalars["ID"]["input"]>;
};

/** Ordering configuration for CustomerSegment */
export type ApiCustomerSegmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerSegmentOrderField;
};

/** Fields available for sorting CustomerSegment */
export enum CustomerSegmentOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by customersCount */
  CustomersCount = "customersCount",
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
  /** Sort by status */
  Status = "status",
  /** Sort by type */
  Type = "type",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiCustomerSegmentPreview = {
  __typename?: "CustomerSegmentPreview";
  customers?: Maybe<ApiCustomerConnection>;
  timedOut: Scalars["Boolean"]["output"];
  totalCount?: Maybe<Scalars["Int"]["output"]>;
  validation: ApiCustomerSegmentQueryValidationResult;
};

export type ApiCustomerSegmentQueryDiagnostic = {
  __typename?: "CustomerSegmentQueryDiagnostic";
  code: Scalars["String"]["output"];
  column: Scalars["Int"]["output"];
  endOffset: Scalars["Int"]["output"];
  line: Scalars["Int"]["output"];
  message: Scalars["String"]["output"];
  severity: CustomerSegmentDiagnosticSeverity;
  startOffset: Scalars["Int"]["output"];
};

export type ApiCustomerSegmentQueryValidationResult = {
  __typename?: "CustomerSegmentQueryValidationResult";
  canonicalQuery?: Maybe<Scalars["String"]["output"]>;
  complexity?: Maybe<Scalars["Int"]["output"]>;
  definition?: Maybe<Scalars["JSON"]["output"]>;
  diagnostics: Array<ApiCustomerSegmentQueryDiagnostic>;
  valid: Scalars["Boolean"]["output"];
};

export type ApiCustomerSegmentStateUpdateInput = {
  status?: InputMaybe<CustomerSegmentStatus>;
};

export enum CustomerSegmentStatus {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
}

export type ApiCustomerSegmentStatusFilter = {
  _eq?: InputMaybe<CustomerSegmentStatus>;
  _in?: InputMaybe<Array<CustomerSegmentStatus>>;
  _neq?: InputMaybe<CustomerSegmentStatus>;
  _notIn?: InputMaybe<Array<CustomerSegmentStatus>>;
};

export enum CustomerSegmentType {
  Dynamic = "DYNAMIC",
  Manual = "MANUAL",
}

export type ApiCustomerSegmentTypeFilter = {
  _eq?: InputMaybe<CustomerSegmentType>;
  _in?: InputMaybe<Array<CustomerSegmentType>>;
  _neq?: InputMaybe<CustomerSegmentType>;
  _notIn?: InputMaybe<Array<CustomerSegmentType>>;
};

export type ApiCustomerSegmentUpdateInput = {
  definition?: InputMaybe<ApiCustomerSegmentDefinitionUpdateInput>;
  details?: InputMaybe<ApiCustomerSegmentDetailsUpdateInput>;
  /** Create, update, delete, or replace manual customer memberships. */
  memberships?: InputMaybe<ApiCustomerSegmentMembershipRelationsUpdateInput>;
  state?: InputMaybe<ApiCustomerSegmentStateUpdateInput>;
};

export type ApiCustomerSegmentUpdatePayload = {
  __typename?: "CustomerSegmentUpdatePayload";
  operationResults: Array<ApiCustomerOperationResult>;
  segment?: Maybe<ApiCustomerSegment>;
  userErrors: Array<ApiCustomerSegmentUserError>;
};

export type ApiCustomerSegmentUserError = ApiUserError & {
  __typename?: "CustomerSegmentUserError";
  code: Scalars["String"]["output"];
  diagnostic?: Maybe<ApiCustomerSegmentQueryDiagnostic>;
  field?: Maybe<Array<Scalars["String"]["output"]>>;
  message: Scalars["String"]["output"];
};

/** Filter conditions for CustomerSegment */
export type ApiCustomerSegmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerSegmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerSegmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerSegmentWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by createdById */
  createdById?: InputMaybe<ApiStringFilter>;
  /** Filter by customersCount */
  customersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by description */
  description?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerSegmentStatusFilter>;
  /** Filter by type */
  type?: InputMaybe<ApiCustomerSegmentTypeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Rebuildable, currency-independent customer activity projection. */
export type ApiCustomerStatistics = {
  __typename?: "CustomerStatistics";
  cancelledOrdersCount: Scalars["Int"]["output"];
  completedOrdersCount: Scalars["Int"]["output"];
  customer: ApiCustomer;
  firstOrderAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Raw Orders service UUID; Orders Admin type is not a federation entity. */
  firstOrderId?: Maybe<Scalars["ID"]["output"]>;
  lastCheckoutAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastOrderAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastOrderId?: Maybe<Scalars["ID"]["output"]>;
  ordersCount: Scalars["Int"]["output"];
  returnsCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

/**
 * Lifecycle fields available to Admin. Merge and redaction remain dedicated
 * workflows and cannot be selected here.
 */
export type ApiCustomerStatusUpdateInput = {
  /** Required for BLOCKED. Omit for ACTIVE and DISABLED. */
  blockedReason?: InputMaybe<Scalars["String"]["input"]>;
  status: CustomerAdminLifecycleStatus;
};

export type ApiCustomerTag = ApiNode & {
  __typename?: "CustomerTag";
  createdAt: Scalars["DateTime"]["output"];
  customerAssignments: ApiCustomerTagAssignmentConnection;
  customersCount: Scalars["Int"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  normalizedName: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiCustomerTagCustomerAssignmentsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerTagAssignmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
};

export type ApiCustomerTagAssignment = ApiNode & {
  __typename?: "CustomerTagAssignment";
  assignedAt: Scalars["DateTime"]["output"];
  assignedById?: Maybe<Scalars["String"]["output"]>;
  customer: ApiCustomer;
  id: Scalars["ID"]["output"];
  tag: ApiCustomerTag;
};

export type ApiCustomerTagAssignmentConnection = {
  __typename?: "CustomerTagAssignmentConnection";
  edges: Array<ApiCustomerTagAssignmentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerTagAssignmentEdge = {
  __typename?: "CustomerTagAssignmentEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerTagAssignment;
};

/** Ordering configuration for CustomerTagAssignment */
export type ApiCustomerTagAssignmentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagAssignmentOrderField;
};

/** Fields available for sorting CustomerTagAssignment */
export enum CustomerTagAssignmentOrderField {
  /** Sort by assignedAt */
  AssignedAt = "assignedAt",
  /** Sort by id */
  Id = "id",
}

export type ApiCustomerTagAssignmentRelationCreateInput = {
  customerId: Scalars["ID"]["input"];
};

export type ApiCustomerTagAssignmentRelationsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTagAssignmentRelationCreateInput>>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

/** Filter conditions for CustomerTagAssignment */
export type ApiCustomerTagAssignmentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTagAssignmentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTagAssignmentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTagAssignmentWhereInput>>;
  /** Filter by assignedAt */
  assignedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by assignedById */
  assignedById?: InputMaybe<ApiStringFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by tagId */
  tagId?: InputMaybe<ApiIdFilter>;
};

/** Replace all tag assignments for the customer. */
export type ApiCustomerTagAssignmentsUpdateInput = {
  tagIds: Array<Scalars["ID"]["input"]>;
};

export type ApiCustomerTagConnection = {
  __typename?: "CustomerTagConnection";
  edges: Array<ApiCustomerTagEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerTagCreateInput = {
  name: Scalars["String"]["input"];
};

export type ApiCustomerTagCreatePayload = {
  __typename?: "CustomerTagCreatePayload";
  tag?: Maybe<ApiCustomerTag>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTagDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiCustomerTagDeletePayload = {
  __typename?: "CustomerTagDeletePayload";
  deletedTagId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCustomerTagEdge = {
  __typename?: "CustomerTagEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerTag;
};

/** Ordering configuration for CustomerTag */
export type ApiCustomerTagOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTagOrderField;
};

/** Fields available for sorting CustomerTag */
export enum CustomerTagOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
  /** Sort by normalizedName */
  NormalizedName = "normalizedName",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiCustomerTagUpdateInput = {
  /** Create or delete customer assignments for this tag. */
  assignments?: InputMaybe<ApiCustomerTagAssignmentRelationsUpdateInput>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiCustomerTagUpdatePayload = {
  __typename?: "CustomerTagUpdatePayload";
  operationResults: Array<ApiCustomerOperationResult>;
  tag?: Maybe<ApiCustomerTag>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for CustomerTag */
export type ApiCustomerTagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by normalizedName */
  normalizedName?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiCustomerTaxExemption = ApiNode & {
  __typename?: "CustomerTaxExemption";
  certificateFile?: Maybe<ApiFile>;
  certificateFileId?: Maybe<Scalars["ID"]["output"]>;
  code: Scalars["String"]["output"];
  countryCode?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  reason?: Maybe<Scalars["String"]["output"]>;
  regionCode?: Maybe<Scalars["String"]["output"]>;
  status: CustomerTaxExemptionStatus;
  updatedAt: Scalars["DateTime"]["output"];
  validFrom?: Maybe<Scalars["Date"]["output"]>;
  validTo?: Maybe<Scalars["Date"]["output"]>;
};

export type ApiCustomerTaxExemptionConnection = {
  __typename?: "CustomerTaxExemptionConnection";
  edges: Array<ApiCustomerTaxExemptionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerTaxExemptionCreateOperationInput = {
  certificateFileId?: InputMaybe<Scalars["ID"]["input"]>;
  code: Scalars["String"]["input"];
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  reason?: InputMaybe<Scalars["String"]["input"]>;
  regionCode?: InputMaybe<Scalars["String"]["input"]>;
  /** Defaults to ACTIVE when omitted. */
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars["Date"]["input"]>;
  validTo?: InputMaybe<Scalars["Date"]["input"]>;
};

export type ApiCustomerTaxExemptionEdge = {
  __typename?: "CustomerTaxExemptionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerTaxExemption;
};

/** Ordering configuration for CustomerTaxExemption */
export type ApiCustomerTaxExemptionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxExemptionOrderField;
};

/** Fields available for sorting CustomerTaxExemption */
export enum CustomerTaxExemptionOrderField {
  /** Sort by code */
  Code = "code",
  /** Sort by countryCode */
  CountryCode = "countryCode",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by regionCode */
  RegionCode = "regionCode",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by validFrom */
  ValidFrom = "validFrom",
  /** Sort by validTo */
  ValidTo = "validTo",
}

export type ApiCustomerTaxExemptionPatchInput = {
  certificateFileId?: InputMaybe<Scalars["ID"]["input"]>;
  code?: InputMaybe<Scalars["String"]["input"]>;
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  reason?: InputMaybe<Scalars["String"]["input"]>;
  regionCode?: InputMaybe<Scalars["String"]["input"]>;
  status?: InputMaybe<CustomerTaxExemptionStatus>;
  validFrom?: InputMaybe<Scalars["Date"]["input"]>;
  validTo?: InputMaybe<Scalars["Date"]["input"]>;
};

export enum CustomerTaxExemptionStatus {
  Active = "ACTIVE",
  Expired = "EXPIRED",
  Revoked = "REVOKED",
}

export type ApiCustomerTaxExemptionStatusFilter = {
  _eq?: InputMaybe<CustomerTaxExemptionStatus>;
  _in?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
  _neq?: InputMaybe<CustomerTaxExemptionStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxExemptionStatus>>;
};

export type ApiCustomerTaxExemptionUpdateOperationInput = {
  operations: ApiCustomerTaxExemptionPatchInput;
  taxExemptionId: Scalars["ID"]["input"];
};

/** Filter conditions for CustomerTaxExemption */
export type ApiCustomerTaxExemptionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTaxExemptionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTaxExemptionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTaxExemptionWhereInput>>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by regionCode */
  regionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerTaxExemptionStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<ApiDateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<ApiDateFilter>;
};

/** Batched tax exemption changes scoped to the customer being updated. */
export type ApiCustomerTaxExemptionsUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTaxExemptionCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  update?: InputMaybe<Array<ApiCustomerTaxExemptionUpdateOperationInput>>;
};

export type ApiCustomerTaxIdentifier = ApiNode & {
  __typename?: "CustomerTaxIdentifier";
  countryCode?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  identifierType: Scalars["String"]["output"];
  isPrimary: Scalars["Boolean"]["output"];
  normalizedValue: Scalars["String"]["output"];
  status: CustomerTaxIdentifierStatus;
  updatedAt: Scalars["DateTime"]["output"];
  validFrom?: Maybe<Scalars["Date"]["output"]>;
  validTo?: Maybe<Scalars["Date"]["output"]>;
  value: Scalars["String"]["output"];
  verifiedAt?: Maybe<Scalars["DateTime"]["output"]>;
};

export type ApiCustomerTaxIdentifierConnection = {
  __typename?: "CustomerTaxIdentifierConnection";
  edges: Array<ApiCustomerTaxIdentifierEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiCustomerTaxIdentifierCreateOperationInput = {
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  identifierType: Scalars["String"]["input"];
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Defaults to UNVERIFIED when omitted. */
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars["Date"]["input"]>;
  validTo?: InputMaybe<Scalars["Date"]["input"]>;
  value: Scalars["String"]["input"];
};

export type ApiCustomerTaxIdentifierEdge = {
  __typename?: "CustomerTaxIdentifierEdge";
  cursor: Scalars["String"]["output"];
  node: ApiCustomerTaxIdentifier;
};

/** Ordering configuration for CustomerTaxIdentifier */
export type ApiCustomerTaxIdentifierOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: CustomerTaxIdentifierOrderField;
};

/** Fields available for sorting CustomerTaxIdentifier */
export enum CustomerTaxIdentifierOrderField {
  /** Sort by countryCode */
  CountryCode = "countryCode",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by identifierType */
  IdentifierType = "identifierType",
  /** Sort by isPrimary */
  IsPrimary = "isPrimary",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by validFrom */
  ValidFrom = "validFrom",
  /** Sort by validTo */
  ValidTo = "validTo",
}

export type ApiCustomerTaxIdentifierPatchInput = {
  countryCode?: InputMaybe<Scalars["String"]["input"]>;
  identifierType?: InputMaybe<Scalars["String"]["input"]>;
  isPrimary?: InputMaybe<Scalars["Boolean"]["input"]>;
  status?: InputMaybe<CustomerTaxIdentifierStatus>;
  validFrom?: InputMaybe<Scalars["Date"]["input"]>;
  validTo?: InputMaybe<Scalars["Date"]["input"]>;
  value?: InputMaybe<Scalars["String"]["input"]>;
};

export enum CustomerTaxIdentifierStatus {
  Expired = "EXPIRED",
  Rejected = "REJECTED",
  Unverified = "UNVERIFIED",
  Verified = "VERIFIED",
}

export type ApiCustomerTaxIdentifierStatusFilter = {
  _eq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _in?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
  _neq?: InputMaybe<CustomerTaxIdentifierStatus>;
  _notIn?: InputMaybe<Array<CustomerTaxIdentifierStatus>>;
};

export type ApiCustomerTaxIdentifierUpdateOperationInput = {
  operations: ApiCustomerTaxIdentifierPatchInput;
  taxIdentifierId: Scalars["ID"]["input"];
};

/** Filter conditions for CustomerTaxIdentifier */
export type ApiCustomerTaxIdentifierWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerTaxIdentifierWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerTaxIdentifierWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerTaxIdentifierWhereInput>>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by identifierType */
  identifierType?: InputMaybe<ApiStringFilter>;
  /** Filter by isPrimary */
  isPrimary?: InputMaybe<ApiBooleanFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiCustomerTaxIdentifierStatusFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by validFrom */
  validFrom?: InputMaybe<ApiDateFilter>;
  /** Filter by validTo */
  validTo?: InputMaybe<ApiDateFilter>;
  /** Filter by value */
  value?: InputMaybe<ApiStringFilter>;
};

/** Batched tax identifier changes scoped to the customer being updated. */
export type ApiCustomerTaxIdentifiersUpdateInput = {
  create?: InputMaybe<Array<ApiCustomerTaxIdentifierCreateOperationInput>>;
  deleteIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  update?: InputMaybe<Array<ApiCustomerTaxIdentifierUpdateOperationInput>>;
};

/** Customer-level sections executed by the unified customerUpdate workflow. */
export type ApiCustomerUpdateInput = {
  addresses?: InputMaybe<ApiCustomerAddressesUpdateInput>;
  company?: InputMaybe<ApiCustomerCompanyUpdateInput>;
  consents?: InputMaybe<ApiCustomerConsentsUpdateInput>;
  contact?: InputMaybe<ApiCustomerContactUpdateInput>;
  groups?: InputMaybe<ApiCustomerGroupMembershipsUpdateInput>;
  moderation?: InputMaybe<ApiCustomerModerationUpdateInput>;
  note?: InputMaybe<ApiCustomerNoteUpdateInput>;
  profile?: InputMaybe<ApiCustomerProfileUpdateInput>;
  segments?: InputMaybe<ApiCustomerSegmentMembershipsUpdateInput>;
  status?: InputMaybe<ApiCustomerStatusUpdateInput>;
  tags?: InputMaybe<ApiCustomerTagAssignmentsUpdateInput>;
  taxExemptions?: InputMaybe<ApiCustomerTaxExemptionsUpdateInput>;
  taxIdentifiers?: InputMaybe<ApiCustomerTaxIdentifiersUpdateInput>;
};

export type ApiCustomerUpdatePayload = {
  __typename?: "CustomerUpdatePayload";
  customer?: Maybe<ApiCustomer>;
  operationResults: Array<ApiCustomerOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Customer */
export type ApiCustomerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiCustomerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiCustomerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiCustomerWhereInput>>;
  /** Filter by accountStatus */
  accountStatus?: InputMaybe<ApiCustomerAccountStatusFilter>;
  /** Filter by companyName */
  companyName?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dateOfBirth */
  dateOfBirth?: InputMaybe<ApiDateFilter>;
  /** Filter by defaultShippingCity */
  defaultShippingCity?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultShippingCountryCode */
  defaultShippingCountryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by defaultShippingRegionCode */
  defaultShippingRegionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<ApiStringFilter>;
  /** Filter by email */
  email?: InputMaybe<ApiStringFilter>;
  /** Filter by emailMarketingState */
  emailMarketingState?: InputMaybe<ApiCustomerConsentStateFilter>;
  /** Filter by emailVerified */
  emailVerified?: InputMaybe<ApiBooleanFilter>;
  /** Filter by firstName */
  firstName?: InputMaybe<ApiStringFilter>;
  /** Filter by iamPrincipalId */
  iamPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by lastActivityAt */
  lastActivityAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by lastName */
  lastName?: InputMaybe<ApiStringFilter>;
  /** Filter by lastOrderAt */
  lastOrderAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by lifecycleStatus */
  lifecycleStatus?: InputMaybe<ApiCustomerLifecycleStatusFilter>;
  /** Filter by ordersCount */
  ordersCount?: InputMaybe<ApiIntFilter>;
  /** Filter by phoneE164 */
  phoneE164?: InputMaybe<ApiStringFilter>;
  /** Filter by phoneVerified */
  phoneVerified?: InputMaybe<ApiBooleanFilter>;
  /** Filter by preferredLocale */
  preferredLocale?: InputMaybe<ApiStringFilter>;
  /** Match customers with a current membership in the selected segment IDs. */
  segmentId?: InputMaybe<ApiIdFilter>;
  /** Filter by source */
  source?: InputMaybe<ApiStringFilter>;
  /** Filter by totalSpentMinor */
  totalSpentMinor?: InputMaybe<ApiBigIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutation = {
  __typename?: "CustomersMutation";
  /** Replace the enabled customer authentication methods for the current store. */
  customerAccountsSettingsUpdate: ApiCustomerAccountsSettingsUpdatePayload;
  customerCreate: ApiCustomerCreatePayload;
  customerDataRequestCreate: ApiCustomerDataRequestCreatePayload;
  customerDataRequestDelete: ApiCustomerDataRequestDeletePayload;
  customerDataRequestUpdate: ApiCustomerDataRequestUpdatePayload;
  customerDelete: ApiCustomerDeletePayload;
  customerGroupCreate: ApiCustomerGroupCreatePayload;
  customerGroupDelete: ApiCustomerGroupDeletePayload;
  customerGroupUpdate: ApiCustomerGroupUpdatePayload;
  customerMergeCreate: ApiCustomerMergeCreatePayload;
  customerMergeDelete: ApiCustomerMergeDeletePayload;
  customerMergeUpdate: ApiCustomerMergeUpdatePayload;
  customerSegmentCreate: ApiCustomerSegmentCreatePayload;
  customerSegmentDelete: ApiCustomerSegmentDeletePayload;
  customerSegmentUpdate: ApiCustomerSegmentUpdatePayload;
  customerTagCreate: ApiCustomerTagCreatePayload;
  customerTagDelete: ApiCustomerTagDeletePayload;
  customerTagUpdate: ApiCustomerTagUpdatePayload;
  /** Unified customer profile update with optimistic locking. */
  customerUpdate: ApiCustomerUpdatePayload;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerAccountsSettingsUpdateArgs = {
  input: ApiCustomerAccountsSettingsUpdateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerCreateArgs = {
  input: ApiCustomerCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestCreateArgs = {
  input: ApiCustomerDataRequestCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestDeleteArgs = {
  input: ApiCustomerDataRequestDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDataRequestUpdateArgs = {
  dataRequestId: Scalars["ID"]["input"];
  operations?: InputMaybe<ApiCustomerDataRequestUpdateInput>;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerDeleteArgs = {
  input: ApiCustomerDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupCreateArgs = {
  input: ApiCustomerGroupCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupDeleteArgs = {
  input: ApiCustomerGroupDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerGroupUpdateArgs = {
  expectedRevision: Scalars["Int"]["input"];
  groupId: Scalars["ID"]["input"];
  operations: ApiCustomerGroupUpdateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeCreateArgs = {
  input: ApiCustomerMergeCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeDeleteArgs = {
  input: ApiCustomerMergeDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerMergeUpdateArgs = {
  mergeId: Scalars["ID"]["input"];
  operations?: InputMaybe<ApiCustomerMergeUpdateInput>;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentCreateArgs = {
  input: ApiCustomerSegmentCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentDeleteArgs = {
  input: ApiCustomerSegmentDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerSegmentUpdateArgs = {
  expectedRevision: Scalars["Int"]["input"];
  operations: ApiCustomerSegmentUpdateInput;
  segmentId: Scalars["ID"]["input"];
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagCreateArgs = {
  input: ApiCustomerTagCreateInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagDeleteArgs = {
  input: ApiCustomerTagDeleteInput;
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerTagUpdateArgs = {
  operations?: InputMaybe<ApiCustomerTagUpdateInput>;
  tagId: Scalars["ID"]["input"];
};

/** Store-scoped customer commands. */
export type ApiCustomersMutationCustomerUpdateArgs = {
  customerId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  operations: ApiCustomerUpdateInput;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQuery = {
  __typename?: "CustomersQuery";
  customer?: Maybe<ApiCustomer>;
  /** Authentication settings for customer accounts in the current store. */
  customerAccountsSettings?: Maybe<ApiCustomerAccountsSettings>;
  customerAddress?: Maybe<ApiCustomerAddress>;
  customerByEmail?: Maybe<ApiCustomer>;
  customerConsent?: Maybe<ApiCustomerConsent>;
  customerDataRequest?: Maybe<ApiCustomerDataRequest>;
  customerDataRequests: ApiCustomerDataRequestConnection;
  customerGroup?: Maybe<ApiCustomerGroup>;
  customerGroups: ApiCustomerGroupConnection;
  customerMerge?: Maybe<ApiCustomerMerge>;
  customerMerges: ApiCustomerMergeConnection;
  customerSegment?: Maybe<ApiCustomerSegment>;
  customerSegmentAttributeCatalog: Array<ApiCustomerSegmentAttributeDescriptor>;
  customerSegmentPreview: ApiCustomerSegmentPreview;
  customerSegmentQueryValidate: ApiCustomerSegmentQueryValidationResult;
  customerSegments: ApiCustomerSegmentConnection;
  customerTag?: Maybe<ApiCustomerTag>;
  customerTags: ApiCustomerTagConnection;
  customerTaxExemption?: Maybe<ApiCustomerTaxExemption>;
  customerTaxIdentifier?: Maybe<ApiCustomerTaxIdentifier>;
  customers: ApiCustomerConnection;
  /** Resolve a customer-owned Relay node by global ID. */
  node?: Maybe<ApiNode>;
  /** Resolve customer-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<ApiNode>>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerAddressArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerByEmailArgs = {
  email: Scalars["Email"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerConsentArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerDataRequestArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerDataRequestsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerDataRequestOrderByInput>>;
  where?: InputMaybe<ApiCustomerDataRequestWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerGroupArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerGroupsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerGroupOrderByInput>>;
  where?: InputMaybe<ApiCustomerGroupWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerMergeArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerMergesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerMergeOrderByInput>>;
  where?: InputMaybe<ApiCustomerMergeWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentPreviewArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  query: Scalars["String"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentQueryValidateArgs = {
  query: Scalars["String"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerSegmentsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerSegmentOrderByInput>>;
  where?: InputMaybe<ApiCustomerSegmentWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTagArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTagsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerTagOrderByInput>>;
  where?: InputMaybe<ApiCustomerTagWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTaxExemptionArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomerTaxIdentifierArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryCustomersArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiCustomerOrderByInput>>;
  where?: InputMaybe<ApiCustomerWhereInput>;
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped customer reads. The current Store is taken from trusted context. */
export type ApiCustomersQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiDateFilter = {
  _between?: InputMaybe<Array<Scalars["Date"]["input"]>>;
  _eq?: InputMaybe<Scalars["Date"]["input"]>;
  _gt?: InputMaybe<Scalars["Date"]["input"]>;
  _gte?: InputMaybe<Scalars["Date"]["input"]>;
  _in?: InputMaybe<Array<Scalars["Date"]["input"]>>;
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  _lt?: InputMaybe<Scalars["Date"]["input"]>;
  _lte?: InputMaybe<Scalars["Date"]["input"]>;
  _neq?: InputMaybe<Scalars["Date"]["input"]>;
  _notIn?: InputMaybe<Array<Scalars["Date"]["input"]>>;
};

/** Filter operators for DateTime fields */
export type ApiDateTimeFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["DateTime"]["input"]>;
};

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = "cm",
  /** Foot */
  Ft = "ft",
  /** Inch */
  In = "in",
  /** Meter */
  M = "m",
  /** Millimeter */
  Mm = "mm",
}

/** Input for setting dimensions (in millimeters). */
export type ApiDimensionsInput = {
  /** Height in millimeters. */
  height: Scalars["Int"]["input"];
  /** Length in millimeters. */
  length: Scalars["Int"]["input"];
  /** Width in millimeters. */
  width: Scalars["Int"]["input"];
};

/** A store-scoped native or Commerce Function discount aggregate owned by Pricing. */
export type ApiDiscount = ApiNode & {
  __typename?: "Discount";
  appliesOnOneTimePurchase: Scalars["Boolean"]["output"];
  appliesOnSubscription: Scalars["Boolean"]["output"];
  appliesOncePerCustomer: Scalars["Boolean"]["output"];
  archivedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Buyer eligibility is absent until it is configured on an incomplete draft. */
  buyerContext?: Maybe<ApiDiscountBuyerContext>;
  calculationStrategy: DiscountCalculationStrategy;
  channelCodes: Array<Scalars["String"]["output"]>;
  channels: Array<ApiDiscountChannel>;
  codes: ApiDiscountCodeConnection;
  codesCount: Scalars["Int"]["output"];
  combinations: Array<ApiDiscountCombination>;
  combinesWithOrderDiscounts: Scalars["Boolean"]["output"];
  combinesWithProductDiscounts: Scalars["Boolean"]["output"];
  combinesWithShippingDiscounts: Scalars["Boolean"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  createdById?: Maybe<Scalars["String"]["output"]>;
  currency: CurrencyCode;
  discountClass: DiscountClass;
  effectiveStatus: DiscountEffectiveStatus;
  endsAt?: Maybe<Scalars["DateTime"]["output"]>;
  externalReferences: ApiDiscountExternalReferenceConnection;
  featuredChannelCodes: Array<Scalars["String"]["output"]>;
  functionBinding?: Maybe<ApiDiscountFunctionBinding>;
  id: Scalars["ID"]["output"];
  kind?: Maybe<DiscountKind>;
  metadata: Scalars["JSON"]["output"];
  method: DiscountMethod;
  minimumRequirement?: Maybe<ApiDiscountMinimumRequirement>;
  /** First active code, or the oldest code when all codes are disabled. */
  primaryCode?: Maybe<Scalars["String"]["output"]>;
  priority: Scalars["Int"]["output"];
  redemptions: ApiDiscountRedemptionConnection;
  reservedUsageCount: Scalars["BigInt"]["output"];
  revision: Scalars["Int"]["output"];
  /** Exactly one rule subtype is present for a complete aggregate. */
  rule?: Maybe<ApiDiscountRule>;
  startsAt: Scalars["DateTime"]["output"];
  state: DiscountState;
  tags: Array<Scalars["String"]["output"]>;
  targetSelections: Array<ApiDiscountTargetSelection>;
  title?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  usage: ApiDiscountUsageSummary;
  usageCount: Scalars["BigInt"]["output"];
  usageLimit?: Maybe<Scalars["BigInt"]["output"]>;
  usageReservations: ApiDiscountUsageReservationConnection;
};

/** A store-scoped native or Commerce Function discount aggregate owned by Pricing. */
export type ApiDiscountCodesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountCodeOrderByInput>>;
  where?: InputMaybe<ApiDiscountCodeWhereInput>;
};

/** A store-scoped native or Commerce Function discount aggregate owned by Pricing. */
export type ApiDiscountExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountExternalReferenceOrderByInput>>;
  where?: InputMaybe<ApiDiscountExternalReferenceWhereInput>;
};

/** A store-scoped native or Commerce Function discount aggregate owned by Pricing. */
export type ApiDiscountRedemptionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountRedemptionOrderByInput>>;
  where?: InputMaybe<ApiDiscountRedemptionWhereInput>;
};

/** A store-scoped native or Commerce Function discount aggregate owned by Pricing. */
export type ApiDiscountUsageReservationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountUsageReservationOrderByInput>>;
  where?: InputMaybe<ApiDiscountUsageReservationWhereInput>;
};

export enum DiscountAllocationMethod {
  Across = "ACROSS",
  Each = "EACH",
}

export enum DiscountAllocationTargetType {
  Order = "ORDER",
  OrderLine = "ORDER_LINE",
  ShippingLine = "SHIPPING_LINE",
}

/** Percentage or fixed-amount rule used by product and order discounts. */
export type ApiDiscountAmountOffRule = {
  __typename?: "DiscountAmountOffRule";
  allocationMethod: DiscountAllocationMethod;
  amountMinor?: Maybe<Scalars["BigInt"]["output"]>;
  maximumDiscountMinor?: Maybe<Scalars["BigInt"]["output"]>;
  /** Always DECREASE for a discount. */
  operation: PriceAdjustmentOperation;
  percentageBps?: Maybe<Scalars["Int"]["output"]>;
  /** Shared percentage or fixed-amount representation. */
  valueType: PriceAdjustmentValueType;
};

export type ApiDiscountAmountOffRuleInput = {
  /** Defaults to ACROSS when omitted. */
  allocationMethod?: InputMaybe<DiscountAllocationMethod>;
  amountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  maximumDiscountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** Must be DECREASE. */
  operation: PriceAdjustmentOperation;
  percentageBps?: InputMaybe<Scalars["Int"]["input"]>;
  /** Shared percentage or fixed-amount representation. */
  valueType: PriceAdjustmentValueType;
};

export enum DiscountBenefitStrategy {
  Adjustment = "ADJUSTMENT",
  Free = "FREE",
}

export type ApiDiscountBuyXGetYRule = {
  __typename?: "DiscountBuyXGetYRule";
  benefitAmountMinor?: Maybe<Scalars["BigInt"]["output"]>;
  /** DECREASE for ADJUSTMENT; null for FREE. */
  benefitOperation?: Maybe<PriceAdjustmentOperation>;
  benefitPercentageBps?: Maybe<Scalars["Int"]["output"]>;
  benefitQuantity: Scalars["Int"]["output"];
  /** FREE or an arithmetic price adjustment. */
  benefitStrategy: DiscountBenefitStrategy;
  /** Required for ADJUSTMENT; null for FREE. */
  benefitValueType?: Maybe<PriceAdjustmentValueType>;
  requiredQuantity?: Maybe<Scalars["Int"]["output"]>;
  requiredSubtotalMinor?: Maybe<Scalars["BigInt"]["output"]>;
  requirementType: DiscountRequirementType;
  usesPerOrderLimit?: Maybe<Scalars["Int"]["output"]>;
};

export type ApiDiscountBuyXGetYRuleInput = {
  benefitAmountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** Must be DECREASE for ADJUSTMENT and null for FREE. */
  benefitOperation?: InputMaybe<PriceAdjustmentOperation>;
  benefitPercentageBps?: InputMaybe<Scalars["Int"]["input"]>;
  benefitQuantity: Scalars["Int"]["input"];
  /** FREE or an arithmetic price adjustment. */
  benefitStrategy: DiscountBenefitStrategy;
  /** Required for ADJUSTMENT and null for FREE. */
  benefitValueType?: InputMaybe<PriceAdjustmentValueType>;
  requiredQuantity?: InputMaybe<Scalars["Int"]["input"]>;
  requiredSubtotalMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  requirementType: DiscountRequirementType;
  usesPerOrderLimit?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiDiscountBuyerContext = {
  __typename?: "DiscountBuyerContext";
  createdAt: Scalars["DateTime"]["output"];
  customers: Array<ApiDiscountEligibleCustomer>;
  segments: Array<ApiDiscountEligibleSegment>;
  type: DiscountBuyerContextType;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiDiscountBuyerContextInput = {
  customerIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  segmentIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  type: DiscountBuyerContextType;
};

export enum DiscountBuyerContextType {
  All = "ALL",
  Customers = "CUSTOMERS",
  Segments = "SEGMENTS",
}

export enum DiscountCalculationStrategy {
  Function = "FUNCTION",
  Native = "NATIVE",
}

export type ApiDiscountCatalogTarget = ApiCategory | ApiProduct | ApiVariant;

export type ApiDiscountChannel = {
  __typename?: "DiscountChannel";
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  featured: Scalars["Boolean"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiDiscountChannelInput = {
  code: Scalars["String"]["input"];
  featured?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export enum DiscountClass {
  Order = "ORDER",
  Product = "PRODUCT",
  Shipping = "SHIPPING",
}

export type ApiDiscountClassFilter = {
  _eq?: InputMaybe<DiscountClass>;
  _in?: InputMaybe<Array<DiscountClass>>;
  _neq?: InputMaybe<DiscountClass>;
  _notIn?: InputMaybe<Array<DiscountClass>>;
};

/** A redeemable code and its usage projection. */
export type ApiDiscountCode = ApiNode & {
  __typename?: "DiscountCode";
  code: Scalars["String"]["output"];
  committedCount: Scalars["BigInt"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  disabledAt?: Maybe<Scalars["DateTime"]["output"]>;
  discount: ApiDiscount;
  id: Scalars["ID"]["output"];
  metadata: Scalars["JSON"]["output"];
  normalizedCode: Scalars["String"]["output"];
  remainingCount?: Maybe<Scalars["BigInt"]["output"]>;
  reservedCount: Scalars["BigInt"]["output"];
  reversedCount: Scalars["BigInt"]["output"];
  status: DiscountCodeStatus;
  updatedAt: Scalars["DateTime"]["output"];
  usageCount: Scalars["BigInt"]["output"];
  usageLimit?: Maybe<Scalars["BigInt"]["output"]>;
};

export type ApiDiscountCodeConnection = {
  __typename?: "DiscountCodeConnection";
  edges: Array<ApiDiscountCodeEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiDiscountCodeCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars["String"]["input"]>;
  code: Scalars["String"]["input"];
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  usageLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
};

export type ApiDiscountCodeDeleteOperationInput = {
  codeId: Scalars["ID"]["input"];
  expectedUpdatedAt: Scalars["DateTime"]["input"];
};

export type ApiDiscountCodeEdge = {
  __typename?: "DiscountCodeEdge";
  cursor: Scalars["String"]["output"];
  node: ApiDiscountCode;
};

export type ApiDiscountCodeOrderByInput = {
  direction: SortDirection;
  field: DiscountCodeOrderField;
};

export enum DiscountCodeOrderField {
  Code = "code",
  CreatedAt = "createdAt",
  DisabledAt = "disabledAt",
  Id = "id",
  NormalizedCode = "normalizedCode",
  RemainingCount = "remainingCount",
  ReservedCount = "reservedCount",
  Status = "status",
  UpdatedAt = "updatedAt",
  UsageCount = "usageCount",
  UsageLimit = "usageLimit",
}

export enum DiscountCodeStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
}

export type ApiDiscountCodeStatusFilter = {
  _eq?: InputMaybe<DiscountCodeStatus>;
  _in?: InputMaybe<Array<DiscountCodeStatus>>;
  _neq?: InputMaybe<DiscountCodeStatus>;
  _notIn?: InputMaybe<Array<DiscountCodeStatus>>;
};

export type ApiDiscountCodeUpdateOperationInput = {
  code?: InputMaybe<Scalars["String"]["input"]>;
  codeId: Scalars["ID"]["input"];
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  status?: InputMaybe<DiscountCodeStatus>;
  usageLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
};

export type ApiDiscountCodeWhereInput = {
  _and?: InputMaybe<Array<ApiDiscountCodeWhereInput>>;
  _not?: InputMaybe<ApiDiscountCodeWhereInput>;
  _or?: InputMaybe<Array<ApiDiscountCodeWhereInput>>;
  code?: InputMaybe<ApiStringFilter>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  disabledAt?: InputMaybe<ApiDateTimeFilter>;
  discountId?: InputMaybe<ApiIdFilter>;
  id?: InputMaybe<ApiIdFilter>;
  normalizedCode?: InputMaybe<ApiStringFilter>;
  remainingCount?: InputMaybe<ApiBigIntFilter>;
  reservedCount?: InputMaybe<ApiBigIntFilter>;
  status?: InputMaybe<ApiDiscountCodeStatusFilter>;
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  usageCount?: InputMaybe<ApiBigIntFilter>;
  usageLimit?: InputMaybe<ApiBigIntFilter>;
};

export type ApiDiscountCodesUpdateInput = {
  create?: InputMaybe<Array<ApiDiscountCodeCreateOperationInput>>;
  delete?: InputMaybe<Array<ApiDiscountCodeDeleteOperationInput>>;
  update?: InputMaybe<Array<ApiDiscountCodeUpdateOperationInput>>;
};

export type ApiDiscountCombination = {
  __typename?: "DiscountCombination";
  createdAt: Scalars["DateTime"]["output"];
  discountClass: DiscountClass;
};

export type ApiDiscountConnection = {
  __typename?: "DiscountConnection";
  edges: Array<ApiDiscountEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiDiscountCreateInput = {
  buyerContext?: InputMaybe<ApiDiscountBuyerContextInput>;
  calculationStrategy?: InputMaybe<DiscountCalculationStrategy>;
  channels?: InputMaybe<Array<ApiDiscountChannelInput>>;
  codes?: InputMaybe<Array<ApiDiscountCodeCreateOperationInput>>;
  combinesWith?: InputMaybe<Array<DiscountClass>>;
  currency: CurrencyCode;
  /** Required for FUNCTION; derived from kind for NATIVE. */
  discountClass?: InputMaybe<DiscountClass>;
  functionBinding?: InputMaybe<ApiDiscountFunctionBindingInput>;
  kind?: InputMaybe<DiscountKind>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  method: DiscountMethod;
  minimumRequirement?: InputMaybe<ApiDiscountMinimumRequirementInput>;
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  purchaseModes?: InputMaybe<ApiDiscountPurchaseModesInput>;
  rule?: InputMaybe<ApiDiscountRuleInput>;
  schedule?: InputMaybe<ApiDiscountScheduleInput>;
  /** Defaults to DRAFT when omitted. */
  state?: InputMaybe<DiscountState>;
  tags?: InputMaybe<Array<Scalars["String"]["input"]>>;
  targetSelections?: InputMaybe<Array<ApiDiscountTargetSelectionInput>>;
  title?: InputMaybe<Scalars["String"]["input"]>;
  usage?: InputMaybe<ApiDiscountUsageLimitsInput>;
};

export type ApiDiscountCreatePayload = {
  __typename?: "DiscountCreatePayload";
  discount?: Maybe<ApiDiscount>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountCurrencyFilter = {
  _eq?: InputMaybe<CurrencyCode>;
  _in?: InputMaybe<Array<CurrencyCode>>;
  _neq?: InputMaybe<CurrencyCode>;
  _notIn?: InputMaybe<Array<CurrencyCode>>;
};

export type ApiDiscountDefinitionUpdateInput = {
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  purchaseModes?: InputMaybe<ApiDiscountPurchaseModesInput>;
  schedule?: InputMaybe<ApiDiscountScheduleInput>;
  title?: InputMaybe<Scalars["String"]["input"]>;
  usage?: InputMaybe<ApiDiscountUsageLimitsInput>;
};

export type ApiDiscountDeleteInput = {
  expectedRevision: Scalars["Int"]["input"];
  id: Scalars["ID"]["input"];
};

export type ApiDiscountDeletePayload = {
  __typename?: "DiscountDeletePayload";
  deletedDiscountId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountEdge = {
  __typename?: "DiscountEdge";
  cursor: Scalars["String"]["output"];
  node: ApiDiscount;
};

/** Lifecycle plus schedule-derived state used by Admin list views. */
export enum DiscountEffectiveStatus {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
  Expired = "EXPIRED",
  Paused = "PAUSED",
  Scheduled = "SCHEDULED",
}

export type ApiDiscountEffectiveStatusFilter = {
  _eq?: InputMaybe<DiscountEffectiveStatus>;
  _in?: InputMaybe<Array<DiscountEffectiveStatus>>;
  _neq?: InputMaybe<DiscountEffectiveStatus>;
  _notIn?: InputMaybe<Array<DiscountEffectiveStatus>>;
};

export type ApiDiscountEligibleCustomer = {
  __typename?: "DiscountEligibleCustomer";
  createdAt: Scalars["DateTime"]["output"];
  customer?: Maybe<ApiCustomer>;
  customerId: Scalars["ID"]["output"];
  referenceCheckedAt?: Maybe<Scalars["DateTime"]["output"]>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt?: Maybe<Scalars["DateTime"]["output"]>;
};

export type ApiDiscountEligibleSegment = {
  __typename?: "DiscountEligibleSegment";
  createdAt: Scalars["DateTime"]["output"];
  referenceCheckedAt?: Maybe<Scalars["DateTime"]["output"]>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt?: Maybe<Scalars["DateTime"]["output"]>;
  segmentId: Scalars["ID"]["output"];
};

export type ApiDiscountExternalReference = ApiNode & {
  __typename?: "DiscountExternalReference";
  contentChecksum?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  direction: DiscountExternalSyncDirection;
  discount: ApiDiscount;
  etag?: Maybe<Scalars["String"]["output"]>;
  externalId: Scalars["String"]["output"];
  externalSystem: Scalars["String"]["output"];
  externalType: Scalars["String"]["output"];
  externalUrl?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  lastError?: Maybe<Scalars["String"]["output"]>;
  lastSyncedAt?: Maybe<Scalars["DateTime"]["output"]>;
  metadata: Scalars["JSON"]["output"];
  syncStatus: DiscountExternalSyncStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiDiscountExternalReferenceConnection = {
  __typename?: "DiscountExternalReferenceConnection";
  edges: Array<ApiDiscountExternalReferenceEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiDiscountExternalReferenceCreateInput = {
  direction: DiscountExternalSyncDirection;
  discountId: Scalars["ID"]["input"];
  externalId: Scalars["String"]["input"];
  externalSystem: Scalars["String"]["input"];
  externalType?: InputMaybe<Scalars["String"]["input"]>;
  externalUrl?: InputMaybe<Scalars["String"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiDiscountExternalReferenceCreatePayload = {
  __typename?: "DiscountExternalReferenceCreatePayload";
  externalReference?: Maybe<ApiDiscountExternalReference>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountExternalReferenceDeleteInput = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  id: Scalars["ID"]["input"];
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiDiscountExternalReferenceDeletePayload = {
  __typename?: "DiscountExternalReferenceDeletePayload";
  deletedExternalReferenceId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountExternalReferenceEdge = {
  __typename?: "DiscountExternalReferenceEdge";
  cursor: Scalars["String"]["output"];
  node: ApiDiscountExternalReference;
};

export type ApiDiscountExternalReferenceIdentityInput = {
  externalId?: InputMaybe<Scalars["String"]["input"]>;
  externalSystem?: InputMaybe<Scalars["String"]["input"]>;
  externalType?: InputMaybe<Scalars["String"]["input"]>;
  externalUrl?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiDiscountExternalReferenceOrderByInput = {
  direction: SortDirection;
  field: DiscountExternalReferenceOrderField;
};

export enum DiscountExternalReferenceOrderField {
  CreatedAt = "createdAt",
  DeletedAt = "deletedAt",
  Direction = "direction",
  ExternalId = "externalId",
  ExternalSystem = "externalSystem",
  ExternalType = "externalType",
  Id = "id",
  LastSyncedAt = "lastSyncedAt",
  SyncStatus = "syncStatus",
  UpdatedAt = "updatedAt",
}

export type ApiDiscountExternalReferenceSyncInput = {
  contentChecksum?: InputMaybe<Scalars["String"]["input"]>;
  direction?: InputMaybe<DiscountExternalSyncDirection>;
  etag?: InputMaybe<Scalars["String"]["input"]>;
  lastError?: InputMaybe<Scalars["String"]["input"]>;
  lastSyncedAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  status?: InputMaybe<DiscountExternalSyncStatus>;
};

export type ApiDiscountExternalReferenceUpdateInput = {
  identity?: InputMaybe<ApiDiscountExternalReferenceIdentityInput>;
  sync?: InputMaybe<ApiDiscountExternalReferenceSyncInput>;
};

export type ApiDiscountExternalReferenceUpdatePayload = {
  __typename?: "DiscountExternalReferenceUpdatePayload";
  externalReference?: Maybe<ApiDiscountExternalReference>;
  operationResults: Array<ApiDiscountOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountExternalReferenceWhereInput = {
  _and?: InputMaybe<Array<ApiDiscountExternalReferenceWhereInput>>;
  _not?: InputMaybe<ApiDiscountExternalReferenceWhereInput>;
  _or?: InputMaybe<Array<ApiDiscountExternalReferenceWhereInput>>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  direction?: InputMaybe<ApiDiscountExternalSyncDirectionFilter>;
  discountId?: InputMaybe<ApiIdFilter>;
  externalId?: InputMaybe<ApiStringFilter>;
  externalSystem?: InputMaybe<ApiStringFilter>;
  externalType?: InputMaybe<ApiStringFilter>;
  id?: InputMaybe<ApiIdFilter>;
  lastSyncedAt?: InputMaybe<ApiDateTimeFilter>;
  syncStatus?: InputMaybe<ApiDiscountExternalSyncStatusFilter>;
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export enum DiscountExternalSyncDirection {
  Bidirectional = "BIDIRECTIONAL",
  Export = "EXPORT",
  Import = "IMPORT",
}

export type ApiDiscountExternalSyncDirectionFilter = {
  _eq?: InputMaybe<DiscountExternalSyncDirection>;
  _in?: InputMaybe<Array<DiscountExternalSyncDirection>>;
  _neq?: InputMaybe<DiscountExternalSyncDirection>;
  _notIn?: InputMaybe<Array<DiscountExternalSyncDirection>>;
};

export enum DiscountExternalSyncStatus {
  Disabled = "DISABLED",
  Failed = "FAILED",
  Pending = "PENDING",
  Synced = "SYNCED",
}

export type ApiDiscountExternalSyncStatusFilter = {
  _eq?: InputMaybe<DiscountExternalSyncStatus>;
  _in?: InputMaybe<Array<DiscountExternalSyncStatus>>;
  _neq?: InputMaybe<DiscountExternalSyncStatus>;
  _notIn?: InputMaybe<Array<DiscountExternalSyncStatus>>;
};

export type ApiDiscountFreeShippingRule = {
  __typename?: "DiscountFreeShippingRule";
  maximumShippingPriceMinor?: Maybe<Scalars["BigInt"]["output"]>;
};

export type ApiDiscountFreeShippingRuleInput = {
  maximumShippingPriceMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
};

export type ApiDiscountFunctionBinding = {
  __typename?: "DiscountFunctionBinding";
  activationSequence: Scalars["BigInt"]["output"];
  configurationRevision: Scalars["String"]["output"];
  configurationSnapshot: Scalars["JSON"]["output"];
  contractVersion: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  failureMode: DiscountFunctionFailureMode;
  functionKey: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  installationId: Scalars["ID"]["output"];
  precedence: Scalars["Int"]["output"];
  routeRevision: Scalars["String"]["output"];
  status: DiscountFunctionBindingStatus;
  target: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiDiscountFunctionBindingInput = {
  activationSequence: Scalars["BigInt"]["input"];
  configurationRevision: Scalars["String"]["input"];
  configurationSnapshot: Scalars["JSON"]["input"];
  failureMode?: InputMaybe<DiscountFunctionFailureMode>;
  functionKey: Scalars["String"]["input"];
  installationId: Scalars["ID"]["input"];
  precedence?: InputMaybe<Scalars["Int"]["input"]>;
  routeRevision: Scalars["String"]["input"];
  status?: InputMaybe<DiscountFunctionBindingStatus>;
};

export enum DiscountFunctionBindingStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
}

export enum DiscountFunctionFailureMode {
  Optional = "OPTIONAL",
  Required = "REQUIRED",
}

export enum DiscountKind {
  AmountOffOrder = "AMOUNT_OFF_ORDER",
  AmountOffProducts = "AMOUNT_OFF_PRODUCTS",
  BuyXGetY = "BUY_X_GET_Y",
  FreeShipping = "FREE_SHIPPING",
}

export type ApiDiscountKindFilter = {
  _eq?: InputMaybe<DiscountKind>;
  _in?: InputMaybe<Array<DiscountKind>>;
  _neq?: InputMaybe<DiscountKind>;
  _notIn?: InputMaybe<Array<DiscountKind>>;
};

export type ApiDiscountLifecycleUpdateInput = {
  state: DiscountState;
};

export enum DiscountMethod {
  Automatic = "AUTOMATIC",
  Code = "CODE",
}

export type ApiDiscountMethodFilter = {
  _eq?: InputMaybe<DiscountMethod>;
  _in?: InputMaybe<Array<DiscountMethod>>;
  _neq?: InputMaybe<DiscountMethod>;
  _notIn?: InputMaybe<Array<DiscountMethod>>;
};

export type ApiDiscountMinimumRequirement = {
  __typename?: "DiscountMinimumRequirement";
  quantity?: Maybe<Scalars["Int"]["output"]>;
  requirementType: DiscountRequirementType;
  subtotalMinor?: Maybe<Scalars["BigInt"]["output"]>;
};

export type ApiDiscountMinimumRequirementInput = {
  quantity?: InputMaybe<Scalars["Int"]["input"]>;
  requirementType: DiscountRequirementType;
  subtotalMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
};

/** Wrapper used by updates so a null requirement can explicitly clear it. */
export type ApiDiscountMinimumRequirementSyncInput = {
  requirement?: InputMaybe<ApiDiscountMinimumRequirementInput>;
};

/** Result of one section in a discount aggregate update. */
export type ApiDiscountOperationResult = {
  __typename?: "DiscountOperationResult";
  applied: Scalars["Boolean"]["output"];
  errors: Array<ApiGenericUserError>;
  type: DiscountOperationType;
};

/** Sections executed by the unified discountUpdate workflow. */
export enum DiscountOperationType {
  ChannelsUpdate = "CHANNELS_UPDATE",
  CodesUpdate = "CODES_UPDATE",
  CombinationsUpdate = "COMBINATIONS_UPDATE",
  DefinitionUpdate = "DEFINITION_UPDATE",
  EligibilityUpdate = "ELIGIBILITY_UPDATE",
  ExternalReferenceUpdate = "EXTERNAL_REFERENCE_UPDATE",
  FunctionBindingUpdate = "FUNCTION_BINDING_UPDATE",
  LifecycleUpdate = "LIFECYCLE_UPDATE",
  MetadataUpdate = "METADATA_UPDATE",
  MinimumRequirementUpdate = "MINIMUM_REQUIREMENT_UPDATE",
  RuleUpdate = "RULE_UPDATE",
  TagsUpdate = "TAGS_UPDATE",
  TargetsUpdate = "TARGETS_UPDATE",
}

export type ApiDiscountOrderByInput = {
  direction: SortDirection;
  field: DiscountOrderField;
};

export enum DiscountOrderField {
  ArchivedAt = "archivedAt",
  CodesCount = "codesCount",
  CreatedAt = "createdAt",
  Currency = "currency",
  DiscountClass = "discountClass",
  EffectiveStatus = "effectiveStatus",
  EndsAt = "endsAt",
  Id = "id",
  Kind = "kind",
  Method = "method",
  PrimaryCode = "primaryCode",
  Priority = "priority",
  ReservedUsageCount = "reservedUsageCount",
  Revision = "revision",
  StartsAt = "startsAt",
  State = "state",
  Title = "title",
  UpdatedAt = "updatedAt",
  UsageCount = "usageCount",
  UsageLimit = "usageLimit",
}

export type ApiDiscountPurchaseModesInput = {
  appliesOnOneTimePurchase: Scalars["Boolean"]["input"];
  appliesOnSubscription: Scalars["Boolean"]["input"];
};

/** Order-level discount accounting header. */
export type ApiDiscountRedemption = ApiNode & {
  __typename?: "DiscountRedemption";
  allocations: Array<ApiDiscountRedemptionAllocation>;
  amountMinor: Scalars["BigInt"]["output"];
  checkoutId: Scalars["ID"]["output"];
  committedAt: Scalars["DateTime"]["output"];
  configurationRevision: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  currency: CurrencyCode;
  customer?: Maybe<ApiCustomer>;
  customerId?: Maybe<Scalars["ID"]["output"]>;
  discount: ApiDiscount;
  discountClass: DiscountClass;
  discountCode?: Maybe<ApiDiscountCode>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  metadata: Scalars["JSON"]["output"];
  orderId: Scalars["ID"]["output"];
  reservation?: Maybe<ApiDiscountUsageReservation>;
  reversalReason?: Maybe<Scalars["String"]["output"]>;
  reversedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: DiscountRedemptionStatus;
};

export type ApiDiscountRedemptionAllocation = ApiNode & {
  __typename?: "DiscountRedemptionAllocation";
  amountMinor: Scalars["BigInt"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  metadata: Scalars["JSON"]["output"];
  quantity?: Maybe<Scalars["Int"]["output"]>;
  redemption: ApiDiscountRedemption;
  targetId?: Maybe<Scalars["ID"]["output"]>;
  targetType: DiscountAllocationTargetType;
};

export type ApiDiscountRedemptionConnection = {
  __typename?: "DiscountRedemptionConnection";
  edges: Array<ApiDiscountRedemptionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiDiscountRedemptionEdge = {
  __typename?: "DiscountRedemptionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiDiscountRedemption;
};

export type ApiDiscountRedemptionOrderByInput = {
  direction: SortDirection;
  field: DiscountRedemptionOrderField;
};

export enum DiscountRedemptionOrderField {
  AmountMinor = "amountMinor",
  CommittedAt = "committedAt",
  ConfigurationRevision = "configurationRevision",
  CreatedAt = "createdAt",
  Currency = "currency",
  DiscountClass = "discountClass",
  Id = "id",
  ReversedAt = "reversedAt",
  Status = "status",
}

export enum DiscountRedemptionStatus {
  Committed = "COMMITTED",
  Reversed = "REVERSED",
}

export type ApiDiscountRedemptionStatusFilter = {
  _eq?: InputMaybe<DiscountRedemptionStatus>;
  _in?: InputMaybe<Array<DiscountRedemptionStatus>>;
  _neq?: InputMaybe<DiscountRedemptionStatus>;
  _notIn?: InputMaybe<Array<DiscountRedemptionStatus>>;
};

export type ApiDiscountRedemptionWhereInput = {
  _and?: InputMaybe<Array<ApiDiscountRedemptionWhereInput>>;
  _not?: InputMaybe<ApiDiscountRedemptionWhereInput>;
  _or?: InputMaybe<Array<ApiDiscountRedemptionWhereInput>>;
  amountMinor?: InputMaybe<ApiBigIntFilter>;
  checkoutId?: InputMaybe<ApiIdFilter>;
  codeId?: InputMaybe<ApiIdFilter>;
  committedAt?: InputMaybe<ApiDateTimeFilter>;
  configurationRevision?: InputMaybe<ApiIntFilter>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  currency?: InputMaybe<ApiDiscountCurrencyFilter>;
  customerId?: InputMaybe<ApiIdFilter>;
  discountClass?: InputMaybe<ApiDiscountClassFilter>;
  discountId?: InputMaybe<ApiIdFilter>;
  id?: InputMaybe<ApiIdFilter>;
  orderId?: InputMaybe<ApiIdFilter>;
  reservationId?: InputMaybe<ApiIdFilter>;
  reversedAt?: InputMaybe<ApiDateTimeFilter>;
  status?: InputMaybe<ApiDiscountRedemptionStatusFilter>;
};

export enum DiscountReferenceStatus {
  Stale = "STALE",
  Valid = "VALID",
}

export enum DiscountRequirementType {
  Quantity = "QUANTITY",
  Subtotal = "SUBTOTAL",
}

export enum DiscountReservationStatus {
  Active = "ACTIVE",
  Committed = "COMMITTED",
  Expired = "EXPIRED",
  Released = "RELEASED",
}

export type ApiDiscountReservationStatusFilter = {
  _eq?: InputMaybe<DiscountReservationStatus>;
  _in?: InputMaybe<Array<DiscountReservationStatus>>;
  _neq?: InputMaybe<DiscountReservationStatus>;
  _notIn?: InputMaybe<Array<DiscountReservationStatus>>;
};

export type ApiDiscountRule =
  ApiDiscountAmountOffRule | ApiDiscountBuyXGetYRule | ApiDiscountFreeShippingRule;

/** Exactly one rule field must match the owning discount kind. */
export type ApiDiscountRuleInput = {
  amountOff?: InputMaybe<ApiDiscountAmountOffRuleInput>;
  buyXGetY?: InputMaybe<ApiDiscountBuyXGetYRuleInput>;
  freeShipping?: InputMaybe<ApiDiscountFreeShippingRuleInput>;
};

export type ApiDiscountScheduleInput = {
  endsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  startsAt: Scalars["DateTime"]["input"];
};

export enum DiscountState {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
  Paused = "PAUSED",
}

export type ApiDiscountStateFilter = {
  _eq?: InputMaybe<DiscountState>;
  _in?: InputMaybe<Array<DiscountState>>;
  _neq?: InputMaybe<DiscountState>;
  _notIn?: InputMaybe<Array<DiscountState>>;
};

/** A long-lived cross-service target reference and its reconciliation state. */
export type ApiDiscountTarget = {
  __typename?: "DiscountTarget";
  createdAt: Scalars["DateTime"]["output"];
  referenceCheckedAt?: Maybe<Scalars["DateTime"]["output"]>;
  referenceStatus: DiscountReferenceStatus;
  referenceStatusChangedAt?: Maybe<Scalars["DateTime"]["output"]>;
  target?: Maybe<ApiDiscountCatalogTarget>;
  targetId: Scalars["ID"]["output"];
  targetType: DiscountTargetType;
};

export enum DiscountTargetRole {
  Benefit = "BENEFIT",
  Qualifier = "QUALIFIER",
}

export type ApiDiscountTargetSelection = {
  __typename?: "DiscountTargetSelection";
  role: DiscountTargetRole;
  targetType: DiscountTargetType;
  targets: Array<ApiDiscountTarget>;
};

export type ApiDiscountTargetSelectionInput = {
  role: DiscountTargetRole;
  /** Must be empty for ALL_PRODUCTS and non-empty for specific target types. */
  targetIds: Array<Scalars["ID"]["input"]>;
  targetType: DiscountTargetType;
};

export enum DiscountTargetType {
  AllProducts = "ALL_PRODUCTS",
  Categories = "CATEGORIES",
  Products = "PRODUCTS",
  Variants = "VARIANTS",
}

/** Discount-level sections executed by the unified discountUpdate workflow. */
export type ApiDiscountUpdateInput = {
  /** Complete channel replacement when supplied. Empty removes every channel. */
  channels?: InputMaybe<Array<ApiDiscountChannelInput>>;
  codes?: InputMaybe<ApiDiscountCodesUpdateInput>;
  /** Complete compatible-class replacement when supplied. */
  combinesWith?: InputMaybe<Array<DiscountClass>>;
  definition?: InputMaybe<ApiDiscountDefinitionUpdateInput>;
  eligibility?: InputMaybe<ApiDiscountBuyerContextInput>;
  functionBinding?: InputMaybe<ApiDiscountFunctionBindingInput>;
  lifecycle?: InputMaybe<ApiDiscountLifecycleUpdateInput>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  minimumRequirement?: InputMaybe<ApiDiscountMinimumRequirementSyncInput>;
  rule?: InputMaybe<ApiDiscountRuleInput>;
  /** Complete tag replacement when supplied. Empty removes every tag. */
  tags?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** Complete qualifier/benefit target replacement when supplied. */
  targetSelections?: InputMaybe<Array<ApiDiscountTargetSelectionInput>>;
};

export type ApiDiscountUpdatePayload = {
  __typename?: "DiscountUpdatePayload";
  discount?: Maybe<ApiDiscount>;
  operationResults: Array<ApiDiscountOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiDiscountUsageLimitsInput = {
  appliesOncePerCustomer: Scalars["Boolean"]["input"];
  usageLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
};

/** Operational capacity reservation retained as an audit record after closing. */
export type ApiDiscountUsageReservation = ApiNode & {
  __typename?: "DiscountUsageReservation";
  checkoutId: Scalars["ID"]["output"];
  closedAt?: Maybe<Scalars["DateTime"]["output"]>;
  committedAt?: Maybe<Scalars["DateTime"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  customer?: Maybe<ApiCustomer>;
  customerId?: Maybe<Scalars["ID"]["output"]>;
  discount: ApiDiscount;
  discountCode?: Maybe<ApiDiscountCode>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  metadata: Scalars["JSON"]["output"];
  status: DiscountReservationStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiDiscountUsageReservationConnection = {
  __typename?: "DiscountUsageReservationConnection";
  edges: Array<ApiDiscountUsageReservationEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiDiscountUsageReservationEdge = {
  __typename?: "DiscountUsageReservationEdge";
  cursor: Scalars["String"]["output"];
  node: ApiDiscountUsageReservation;
};

export type ApiDiscountUsageReservationOrderByInput = {
  direction: SortDirection;
  field: DiscountUsageReservationOrderField;
};

export enum DiscountUsageReservationOrderField {
  ClosedAt = "closedAt",
  CommittedAt = "committedAt",
  CreatedAt = "createdAt",
  ExpiresAt = "expiresAt",
  Id = "id",
  Status = "status",
  UpdatedAt = "updatedAt",
}

export type ApiDiscountUsageReservationWhereInput = {
  _and?: InputMaybe<Array<ApiDiscountUsageReservationWhereInput>>;
  _not?: InputMaybe<ApiDiscountUsageReservationWhereInput>;
  _or?: InputMaybe<Array<ApiDiscountUsageReservationWhereInput>>;
  checkoutId?: InputMaybe<ApiIdFilter>;
  closedAt?: InputMaybe<ApiDateTimeFilter>;
  codeId?: InputMaybe<ApiIdFilter>;
  committedAt?: InputMaybe<ApiDateTimeFilter>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  customerId?: InputMaybe<ApiIdFilter>;
  discountId?: InputMaybe<ApiIdFilter>;
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  id?: InputMaybe<ApiIdFilter>;
  status?: InputMaybe<ApiDiscountReservationStatusFilter>;
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Aggregate usage accounting including active checkout reservations. */
export type ApiDiscountUsageSummary = {
  __typename?: "DiscountUsageSummary";
  committedCount: Scalars["BigInt"]["output"];
  consumedCount: Scalars["BigInt"]["output"];
  netCommittedCount: Scalars["BigInt"]["output"];
  remainingCount?: Maybe<Scalars["BigInt"]["output"]>;
  reservedCount: Scalars["BigInt"]["output"];
  reversedCount: Scalars["BigInt"]["output"];
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  usageLimit?: Maybe<Scalars["BigInt"]["output"]>;
  version?: Maybe<Scalars["BigInt"]["output"]>;
};

/** Filters backed by pricing.discount_list_view and store-scoped relations. */
export type ApiDiscountWhereInput = {
  _and?: InputMaybe<Array<ApiDiscountWhereInput>>;
  _not?: InputMaybe<ApiDiscountWhereInput>;
  _or?: InputMaybe<Array<ApiDiscountWhereInput>>;
  appliesOnOneTimePurchase?: InputMaybe<ApiBooleanFilter>;
  appliesOnSubscription?: InputMaybe<ApiBooleanFilter>;
  appliesOncePerCustomer?: InputMaybe<ApiBooleanFilter>;
  archivedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Match discounts available on a channel code. */
  channelCode?: InputMaybe<ApiStringFilter>;
  /** Match any code assigned to the discount, including disabled codes. */
  code?: InputMaybe<ApiStringFilter>;
  combinesWithOrderDiscounts?: InputMaybe<ApiBooleanFilter>;
  combinesWithProductDiscounts?: InputMaybe<ApiBooleanFilter>;
  combinesWithShippingDiscounts?: InputMaybe<ApiBooleanFilter>;
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  createdById?: InputMaybe<ApiStringFilter>;
  currency?: InputMaybe<ApiDiscountCurrencyFilter>;
  discountClass?: InputMaybe<ApiDiscountClassFilter>;
  effectiveStatus?: InputMaybe<ApiDiscountEffectiveStatusFilter>;
  endsAt?: InputMaybe<ApiDateTimeFilter>;
  /** Match discounts featured on a channel code. */
  featuredChannelCode?: InputMaybe<ApiStringFilter>;
  id?: InputMaybe<ApiIdFilter>;
  kind?: InputMaybe<ApiDiscountKindFilter>;
  method?: InputMaybe<ApiDiscountMethodFilter>;
  primaryCode?: InputMaybe<ApiStringFilter>;
  priority?: InputMaybe<ApiIntFilter>;
  reservedUsageCount?: InputMaybe<ApiBigIntFilter>;
  revision?: InputMaybe<ApiIntFilter>;
  startsAt?: InputMaybe<ApiDateTimeFilter>;
  state?: InputMaybe<ApiDiscountStateFilter>;
  /** Match discounts assigned to at least one normalized tag. */
  tag?: InputMaybe<ApiStringFilter>;
  title?: InputMaybe<ApiStringFilter>;
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  usageCount?: InputMaybe<ApiBigIntFilter>;
  usageLimit?: InputMaybe<ApiBigIntFilter>;
};

/** External media data (YouTube, Vimeo, etc). */
export type ApiExternalMediaData = {
  __typename?: "ExternalMediaData";
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars["String"]["output"];
  /** Provider-specific metadata. */
  providerMeta?: Maybe<Scalars["JSON"]["output"]>;
};

export type ApiFacet = ApiNode & {
  __typename?: "Facet";
  facetType: FacetType;
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  lexoRank: Scalars["String"]["output"];
  scopes: Array<FacetScopeType>;
  selectionMode: FacetSelectionMode;
  slug: Scalars["String"]["output"];
  sources: Array<ApiFacetSource>;
  uiType: FacetUiType;
  values: Array<ApiFacetValue>;
};

export type ApiFacetCreateInput = {
  facetType: FacetType;
  label: Scalars["String"]["input"];
  /** Defaults to both SEARCH and CATEGORY when omitted. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug: Scalars["String"]["input"];
  sources?: InputMaybe<Array<ApiFacetCreateSourceInput>>;
  uiType?: InputMaybe<FacetUiType>;
  valueCandidates?: InputMaybe<Array<ApiFacetCreateValueCandidateInput>>;
};

export type ApiFacetCreatePayload = {
  __typename?: "FacetCreatePayload";
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetCreateSourceInput = {
  handle: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
};

export type ApiFacetCreateValueCandidateInput = {
  handle: Scalars["String"]["input"];
  label: Scalars["String"]["input"];
  sourceHandle: Scalars["String"]["input"];
};

export type ApiFacetDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiFacetDeletePayload = {
  __typename?: "FacetDeletePayload";
  deletedFacetId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetMoveInput = {
  afterFacetId?: InputMaybe<Scalars["ID"]["input"]>;
  beforeFacetId?: InputMaybe<Scalars["ID"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiFacetMovePayload = {
  __typename?: "FacetMovePayload";
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetRebalanceInput = {
  confirm?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiFacetRebalancePayload = {
  __typename?: "FacetRebalancePayload";
  facets: Array<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Listing contexts where a facet is available.
 *
 * SEARCH applies to listing requests without a category context.
 * CATEGORY applies to every category-scoped listing request.
 */
export enum FacetScopeType {
  Category = "CATEGORY",
  Search = "SEARCH",
}

export type ApiFacetScopesUpdateInput = {
  /** Only changed facets need to be included. All updates are applied atomically. */
  updates: Array<ApiFacetScopesUpdateItemInput>;
};

export type ApiFacetScopesUpdateItemInput = {
  id: Scalars["ID"]["input"];
  /** Replaces the current scopes. The list cannot be empty. */
  scopes: Array<FacetScopeType>;
};

export type ApiFacetScopesUpdatePayload = {
  __typename?: "FacetScopesUpdatePayload";
  facets: Array<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetSelectionMode {
  Multi = "MULTI",
  Single = "SINGLE",
}

export type ApiFacetSource = {
  __typename?: "FacetSource";
  handle: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
};

export type ApiFacetSourceCandidate = {
  __typename?: "FacetSourceCandidate";
  facetType: FacetType;
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  locale: Scalars["String"]["output"];
  name?: Maybe<Scalars["String"]["output"]>;
};

export type ApiFacetSourceCandidateConnection = {
  __typename?: "FacetSourceCandidateConnection";
  edges: Array<ApiFacetSourceCandidateEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiFacetSourceCandidateEdge = {
  __typename?: "FacetSourceCandidateEdge";
  cursor: Scalars["String"]["output"];
  node: ApiFacetSourceCandidate;
};

/** Ordering configuration for FacetSourceCandidate */
export type ApiFacetSourceCandidateOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FacetSourceCandidateOrderField;
};

/** Fields available for sorting FacetSourceCandidate */
export enum FacetSourceCandidateOrderField {
  /** Sort by facetType */
  FacetType = "facetType",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
  /** Sort by sortName */
  SortName = "sortName",
  /** Sort by sourceSortBucket */
  SourceSortBucket = "sourceSortBucket",
}

/** Filter conditions for FacetSourceCandidate */
export type ApiFacetSourceCandidateWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFacetSourceCandidateWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFacetSourceCandidateWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFacetSourceCandidateWhereInput>>;
  /** Filter by facetType */
  facetType?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by sortName */
  sortName?: InputMaybe<ApiStringFilter>;
  /** Filter by sourceSortBucket */
  sourceSortBucket?: InputMaybe<ApiIntFilter>;
};

export type ApiFacetSwatch = ApiNode & {
  __typename?: "FacetSwatch";
  colorOne?: Maybe<Scalars["String"]["output"]>;
  colorTwo?: Maybe<Scalars["String"]["output"]>;
  file?: Maybe<ApiFile>;
  id: Scalars["ID"]["output"];
  metadata?: Maybe<Scalars["JSON"]["output"]>;
  swatchType: SwatchType;
};

export type ApiFacetSwatchCreateInput = {
  colorOne?: InputMaybe<Scalars["String"]["input"]>;
  colorTwo?: InputMaybe<Scalars["String"]["input"]>;
  fileId?: InputMaybe<Scalars["ID"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  swatchType: SwatchType;
};

export type ApiFacetSwatchCreatePayload = {
  __typename?: "FacetSwatchCreatePayload";
  facetSwatch?: Maybe<ApiFacetSwatch>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetSwatchDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiFacetSwatchDeletePayload = {
  __typename?: "FacetSwatchDeletePayload";
  deletedFacetSwatchId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetSwatchUpdateInput = {
  colorOne?: InputMaybe<Scalars["String"]["input"]>;
  colorTwo?: InputMaybe<Scalars["String"]["input"]>;
  fileId?: InputMaybe<Scalars["ID"]["input"]>;
  id: Scalars["ID"]["input"];
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  swatchType?: InputMaybe<SwatchType>;
};

export type ApiFacetSwatchUpdatePayload = {
  __typename?: "FacetSwatchUpdatePayload";
  facetSwatch?: Maybe<ApiFacetSwatch>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetType {
  Feature = "FEATURE",
  InStock = "IN_STOCK",
  Option = "OPTION",
  Price = "PRICE",
  Tag = "TAG",
}

export enum FacetUiType {
  Boolean = "BOOLEAN",
  Checkbox = "CHECKBOX",
  Dropdown = "DROPDOWN",
  Radio = "RADIO",
  Range = "RANGE",
}

export type ApiFacetUpdateInput = {
  id: Scalars["ID"]["input"];
  label?: InputMaybe<Scalars["String"]["input"]>;
  /** Replaces the current scopes when provided. The list cannot be empty. */
  scopes?: InputMaybe<Array<FacetScopeType>>;
  selectionMode?: InputMaybe<FacetSelectionMode>;
  slug?: InputMaybe<Scalars["String"]["input"]>;
  uiType?: InputMaybe<FacetUiType>;
};

export type ApiFacetUpdatePayload = {
  __typename?: "FacetUpdatePayload";
  facet?: Maybe<ApiFacet>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValue = ApiNode & {
  __typename?: "FacetValue";
  enabled: Scalars["Boolean"]["output"];
  facet: ApiFacet;
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  kind: FacetValueKind;
  label: Scalars["String"]["output"];
  parent?: Maybe<ApiFacetValue>;
  sortIndex: Scalars["Int"]["output"];
  sourceValues: Array<ApiFacetValue>;
  swatch?: Maybe<ApiFacetSwatch>;
};

export type ApiFacetValueCandidate = {
  __typename?: "FacetValueCandidate";
  facetType: FacetType;
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  sourceHandle: Scalars["String"]["output"];
};

export type ApiFacetValueCandidateConnection = {
  __typename?: "FacetValueCandidateConnection";
  edges: Array<ApiFacetValueCandidateEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiFacetValueCandidateEdge = {
  __typename?: "FacetValueCandidateEdge";
  cursor: Scalars["String"]["output"];
  node: ApiFacetValueCandidate;
};

/** Ordering configuration for FacetValueCandidate */
export type ApiFacetValueCandidateOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FacetValueCandidateOrderField;
};

/** Fields available for sorting FacetValueCandidate */
export enum FacetValueCandidateOrderField {
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by label */
  Label = "label",
}

export enum FacetValueCandidateType {
  Feature = "FEATURE",
  Option = "OPTION",
  Tag = "TAG",
}

/** Filter conditions for FacetValueCandidate */
export type ApiFacetValueCandidateWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFacetValueCandidateWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFacetValueCandidateWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFacetValueCandidateWhereInput>>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by label */
  label?: InputMaybe<ApiStringFilter>;
};

export type ApiFacetValueCandidatesMetaInput = {
  candidateType: FacetValueCandidateType;
  facetId?: InputMaybe<Scalars["ID"]["input"]>;
  sourceHandles?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

export type ApiFacetValueCreateInput = {
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  facetId: Scalars["ID"]["input"];
  handle: Scalars["String"]["input"];
  kind?: InputMaybe<FacetValueKind>;
  label: Scalars["String"]["input"];
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  sourceValueIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  swatchId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiFacetValueCreatePayload = {
  __typename?: "FacetValueCreatePayload";
  facetValue?: Maybe<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiFacetValueDeletePayload = {
  __typename?: "FacetValueDeletePayload";
  deletedFacetValueId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export enum FacetValueKind {
  Group = "GROUP",
  Source = "SOURCE",
}

export type ApiFacetValueMergeInput = {
  facetId: Scalars["ID"]["input"];
  sourceValueIds: Array<Scalars["ID"]["input"]>;
  targetGroupValueId?: InputMaybe<Scalars["ID"]["input"]>;
  targetHandle?: InputMaybe<Scalars["String"]["input"]>;
  targetLabel?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiFacetValueMergePayload = {
  __typename?: "FacetValueMergePayload";
  facetValue?: Maybe<ApiFacetValue>;
  sourceValues: Array<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueUnmergeInput = {
  sourceValueIds: Array<Scalars["ID"]["input"]>;
};

export type ApiFacetValueUnmergePayload = {
  __typename?: "FacetValueUnmergePayload";
  affectedGroupValues: Array<ApiFacetValue>;
  sourceValues: Array<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFacetValueUpdateInput = {
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  label?: InputMaybe<Scalars["String"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  swatchId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiFacetValueUpdatePayload = {
  __typename?: "FacetValueUpdatePayload";
  facetValue?: Maybe<ApiFacetValue>;
  userErrors: Array<ApiGenericUserError>;
};

/** A file represents a stored media asset. */
export type ApiFile = ApiNode & {
  __typename?: "File";
  /** Alt text for accessibility. */
  altText?: Maybe<Scalars["String"]["output"]>;
  /** The date and time when the file was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The date and time when the file was deleted (soft delete). */
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Deletion error code, if any. */
  deletionErrorCode?: Maybe<Scalars["String"]["output"]>;
  /** Current deletion state (ACTIVE, SOFT_DELETED, DELETING). */
  deletionState: Scalars["String"]["output"];
  /** Image/video dimensions (null if not applicable). */
  dimensions?: Maybe<ApiMediaDimensions>;
  /** Duration in milliseconds (for video/audio). */
  durationMs?: Maybe<Scalars["Int"]["output"]>;
  /** File extension. */
  ext?: Maybe<Scalars["String"]["output"]>;
  /** External media data (for YouTube, Vimeo, etc). */
  externalData?: Maybe<ApiExternalMediaData>;
  /** The date and time when the last deletion error occurred. */
  failedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** The globally unique ID of the file. */
  id: Scalars["ID"]["output"];
  /** Whether the file has been processed. */
  isProcessed: Scalars["Boolean"]["output"];
  /** Last deletion error details. */
  lastDeletionError?: Maybe<Scalars["String"]["output"]>;
  mediaType: MediaType;
  /** Additional metadata. */
  meta?: Maybe<Scalars["JSON"]["output"]>;
  /** MIME type. */
  mimeType?: Maybe<Scalars["String"]["output"]>;
  /** Canonical provider URL before CDN routing and transforms. */
  originUrl: Scalars["String"]["output"];
  /** Original filename from upload. */
  originalName?: Maybe<Scalars["String"]["output"]>;
  previewFile?: Maybe<ApiFile>;
  processedAt?: Maybe<Scalars["DateTime"]["output"]>;
  processingError?: Maybe<Scalars["String"]["output"]>;
  processingStatus: MediaProcessingStatus;
  /** Provider type (s3, youtube, vimeo, url, local). */
  provider: FileProvider;
  /** S3-specific data (only for S3 provider). */
  s3Data?: Maybe<ApiS3ObjectData>;
  /** Size in bytes (0 for external providers). */
  sizeBytes: Scalars["BigInt"]["output"];
  /** Source URL (for files uploaded from URL). */
  sourceUrl?: Maybe<Scalars["String"]["output"]>;
  sources: Array<ApiMediaSource>;
  thumbhash?: Maybe<Scalars["String"]["output"]>;
  /** The date and time when the file was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Public URL to access file. */
  url: Scalars["String"]["output"];
  /** Usage summary for this file. */
  usage: ApiFileUsageSummary;
};

/** A file represents a stored media asset. */
export type ApiFileUrlArgs = {
  country?: InputMaybe<Scalars["String"]["input"]>;
  transform?: InputMaybe<ApiImageTransformInput>;
};

export type ApiFileClearErrorInput = {
  /** The ID of the file to clear deletion error for. */
  id: Scalars["ID"]["input"];
};

export type ApiFileClearErrorPayload = {
  __typename?: "FileClearErrorPayload";
  /** The file with cleared deletion error. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A connection to a list of File items. */
export type ApiFileConnection = {
  __typename?: "FileConnection";
  /** A list of edges. */
  edges: Array<ApiFileEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of files. */
  totalCount: Scalars["Int"]["output"];
};

/** Relay-style pagination input for File */
export type ApiFileConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars["Int"]["input"]>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars["Int"]["input"]>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiFileOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiFileWhereInput>;
};

/**
 * Input for creating an external media file (YouTube, Vimeo, etc).
 * Store context is determined from x-store-name header.
 */
export type ApiFileCreateExternalInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars["String"]["input"]>;
  /** Duration in milliseconds. */
  durationMs?: InputMaybe<Scalars["Int"]["input"]>;
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars["String"]["input"];
  /** Image height in pixels. */
  height?: InputMaybe<Scalars["Int"]["input"]>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars["String"]["input"]>;
  /** Title/name of the media. */
  originalName?: InputMaybe<Scalars["String"]["input"]>;
  /** Provider type. */
  provider: FileProvider;
  /** Provider-specific metadata. */
  providerMeta?: InputMaybe<Scalars["JSON"]["input"]>;
  /** Thumbnail URL. */
  thumbnailUrl?: InputMaybe<Scalars["String"]["input"]>;
  /** Public URL to access the media. */
  url: Scalars["String"]["input"];
  /** Image width in pixels. */
  width?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Payload for external file creation. */
export type ApiFileCreateExternalPayload = {
  __typename?: "FileCreateExternalPayload";
  /** The created file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a file. */
export type ApiFileDeleteInput = {
  /** The ID of the file to delete. */
  id: Scalars["ID"]["input"];
  /** Whether to permanently delete the file (hard delete). */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiFileDeleteManyInput = {
  /** The IDs of files to delete. */
  ids: Array<Scalars["ID"]["input"]>;
  /** Whether to permanently delete the files (hard delete). */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiFileDeleteManyPayload = {
  __typename?: "FileDeleteManyPayload";
  /** Files that were eligible and transitioned to SOFT_DELETED. */
  acceptedIds: Array<Scalars["ID"]["output"]>;
  /** Files for which hard delete workflow was started. */
  startedHardDeleteIds: Array<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Payload for file deletion. */
export type ApiFileDeletePayload = {
  __typename?: "FileDeletePayload";
  /** The ID of the deleted file. */
  deletedFileId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a File connection. */
export type ApiFileEdge = {
  __typename?: "FileEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiFile;
};

/** Ordering configuration for File */
export type ApiFileOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FileOrderField;
};

/** Fields available for sorting File */
export enum FileOrderField {
  /** Sort by altText */
  AltText = "altText",
  /** Sort by assetGroupId */
  AssetGroupId = "assetGroupId",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by durationMs */
  DurationMs = "durationMs",
  /** Sort by ext */
  Ext = "ext",
  /** Sort by height */
  Height = "height",
  /** Sort by id */
  Id = "id",
  /** Sort by idempotencyKey */
  IdempotencyKey = "idempotencyKey",
  /** Sort by isProcessed */
  IsProcessed = "isProcessed",
  /** Sort by mediaType */
  MediaType = "mediaType",
  /** Sort by meta */
  Meta = "meta",
  /** Sort by mimeType */
  MimeType = "mimeType",
  /** Sort by originalName */
  OriginalName = "originalName",
  /** Sort by previewFileId */
  PreviewFileId = "previewFileId",
  /** Sort by processedAt */
  ProcessedAt = "processedAt",
  /** Sort by processingError */
  ProcessingError = "processingError",
  /** Sort by processingStatus */
  ProcessingStatus = "processingStatus",
  /** Sort by provider */
  Provider = "provider",
  /** Sort by sizeBytes */
  SizeBytes = "sizeBytes",
  /** Sort by sourceUrl */
  SourceUrl = "sourceUrl",
  /** Sort by thumbhash */
  Thumbhash = "thumbhash",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by url */
  Url = "url",
  /** Sort by width */
  Width = "width",
}

/** Provider type for files. */
export enum FileProvider {
  /** Local file storage */
  Local = "LOCAL",
  /** File stored in S3 */
  S3 = "S3",
  /** External URL */
  Url = "URL",
  /** Vimeo video */
  Vimeo = "VIMEO",
  /** YouTube video */
  Youtube = "YOUTUBE",
}

export type ApiFileRestoreInput = {
  /** The ID of the file to restore. */
  id: Scalars["ID"]["input"];
};

export type ApiFileRestoreManyInput = {
  /** The IDs of files to restore. */
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiFileRestoreManyPayload = {
  __typename?: "FileRestoreManyPayload";
  /** Files that were successfully restored. */
  restoredIds: Array<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFileRestorePayload = {
  __typename?: "FileRestorePayload";
  /** The restored file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export enum FileStateScope {
  Active = "ACTIVE",
  All = "ALL",
  Deleted = "DELETED",
}

/** Input for updating a file. */
export type ApiFileUpdateInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars["String"]["input"]>;
  /** The file ID. */
  id: Scalars["ID"]["input"];
  mediaType?: InputMaybe<MediaType>;
  /** Additional metadata. */
  meta?: InputMaybe<Scalars["JSON"]["input"]>;
  /** Original name. */
  originalName?: InputMaybe<Scalars["String"]["input"]>;
  previewFileId?: InputMaybe<Scalars["ID"]["input"]>;
  processingError?: InputMaybe<Scalars["String"]["input"]>;
  processingStatus?: InputMaybe<MediaProcessingStatus>;
  thumbhash?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for file update. */
export type ApiFileUpdatePayload = {
  __typename?: "FileUpdatePayload";
  /** The updated file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Input for uploading a file from URL.
 * Store context is determined from x-store-name header.
 */
export type ApiFileUploadFromUrlInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars["String"]["input"]>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars["String"]["input"]>;
  /** URL to fetch the file from. */
  sourceUrl: Scalars["String"]["input"];
};

/**
 * Input for uploading a file via multipart form data.
 * Store context is determined from x-store-name header.
 */
export type ApiFileUploadMultipartInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars["String"]["input"]>;
  /** The file to upload. */
  file: Scalars["Upload"]["input"];
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for file upload. */
export type ApiFileUploadPayload = {
  __typename?: "FileUploadPayload";
  /** The uploaded file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiFileUsageCount = {
  __typename?: "FileUsageCount";
  /** Number of unique entities referencing the file. */
  count: Scalars["Int"]["output"];
  /** Entity type (variant, user, organization, etc). */
  entityType: Scalars["String"]["output"];
};

export type ApiFileUsageSummary = {
  __typename?: "FileUsageSummary";
  /** Usage breakdown by entity type. */
  byEntity: Array<ApiFileUsageCount>;
  /** Whether the file is active (not soft-deleted). */
  fileActive: Scalars["Boolean"]["output"];
  /** Total number of unique entities referencing the file. */
  totalCount: Scalars["Int"]["output"];
};

/** Filter conditions for File */
export type ApiFileWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiFileWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiFileWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiFileWhereInput>>;
  /** Filter by altText */
  altText?: InputMaybe<ApiStringFilter>;
  /** Filter by assetGroupId */
  assetGroupId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by durationMs */
  durationMs?: InputMaybe<ApiIntFilter>;
  /** Filter by ext */
  ext?: InputMaybe<ApiStringFilter>;
  /** Filter by height */
  height?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<ApiStringFilter>;
  /** Filter by isProcessed */
  isProcessed?: InputMaybe<ApiBooleanFilter>;
  /** Filter by mediaType */
  mediaType?: InputMaybe<ApiStringFilter>;
  /** Filter by meta */
  meta?: InputMaybe<ApiStringFilter>;
  /** Filter by mimeType */
  mimeType?: InputMaybe<ApiStringFilter>;
  /** Filter by originalName */
  originalName?: InputMaybe<ApiStringFilter>;
  /** Filter by previewFileId */
  previewFileId?: InputMaybe<ApiIdFilter>;
  /** Filter by processedAt */
  processedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by processingError */
  processingError?: InputMaybe<ApiStringFilter>;
  /** Filter by processingStatus */
  processingStatus?: InputMaybe<ApiStringFilter>;
  /** Filter by provider */
  provider?: InputMaybe<ApiStringFilter>;
  /** Filter by sizeBytes */
  sizeBytes?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceUrl */
  sourceUrl?: InputMaybe<ApiStringFilter>;
  /** Filter by thumbhash */
  thumbhash?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by url */
  url?: InputMaybe<ApiStringFilter>;
  /** Filter by width */
  width?: InputMaybe<ApiIntFilter>;
};

/** Filter operators for Float fields */
export type ApiFloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  /** Equals */
  _eq?: InputMaybe<Scalars["Float"]["input"]>;
  /** Greater than */
  _gt?: InputMaybe<Scalars["Float"]["input"]>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars["Float"]["input"]>;
  /** In array */
  _in?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Less than */
  _lt?: InputMaybe<Scalars["Float"]["input"]>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars["Float"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["Float"]["input"]>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars["Float"]["input"]>>;
};

/** A generic user-facing mutation error. */
export type ApiGenericUserError = ApiUserError & {
  __typename?: "GenericUserError";
  /** Machine-readable error code */
  code?: Maybe<Scalars["String"]["output"]>;
  /** Path to the field that caused the error */
  field?: Maybe<Array<Scalars["String"]["output"]>>;
  /** Human-readable error message */
  message: Scalars["String"]["output"];
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutation = {
  __typename?: "HeadlessAppMutation";
  /** Create a storefront, its access policy, and its initial credentials. */
  headlessStorefrontCreate: ApiHeadlessStorefrontCreatePayload;
  /** Permanently disconnect a storefront and revoke its credentials. */
  headlessStorefrontDisconnect: ApiHeadlessStorefrontPayload;
  /** Resume Storefront API access for a suspended storefront. */
  headlessStorefrontResume: ApiHeadlessStorefrontPayload;
  /** Temporarily suspend Storefront API access for a storefront. */
  headlessStorefrontSuspend: ApiHeadlessStorefrontPayload;
  /** Change the display name of an existing storefront. */
  headlessStorefrontUpdate: ApiHeadlessStorefrontPayload;
  /** Replace the complete permission grant set using optimistic concurrency. */
  storefrontAccessPolicyUpdate: ApiStorefrontAccessPolicyPayload;
  /** Revoke a private credential. */
  storefrontCredentialRevoke: ApiStorefrontCredentialPayload;
  /** Create an additional private credential for safe rotation. */
  storefrontPrivateCredentialCreate: ApiStorefrontPrivateCredentialCreatePayload;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationHeadlessStorefrontCreateArgs = {
  input: ApiHeadlessStorefrontCreateInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationHeadlessStorefrontDisconnectArgs = {
  input: ApiHeadlessStorefrontActionInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationHeadlessStorefrontResumeArgs = {
  input: ApiHeadlessStorefrontActionInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationHeadlessStorefrontSuspendArgs = {
  input: ApiHeadlessStorefrontActionInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationHeadlessStorefrontUpdateArgs = {
  input: ApiHeadlessStorefrontUpdateInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationStorefrontAccessPolicyUpdateArgs = {
  input: ApiStorefrontAccessPolicyUpdateInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationStorefrontCredentialRevokeArgs = {
  input: ApiStorefrontCredentialRevokeInput;
};

/** Headless App mutation namespace. */
export type ApiHeadlessAppMutationStorefrontPrivateCredentialCreateArgs = {
  input: ApiStorefrontPrivateCredentialCreateInput;
};

/** Headless App query namespace. */
export type ApiHeadlessAppQuery = {
  __typename?: "HeadlessAppQuery";
  /** Get a Headless storefront by its global ID. */
  headlessStorefrontConnection?: Maybe<ApiHeadlessStorefrontConnection>;
  /** List Headless storefronts owned by the active installation. */
  headlessStorefrontConnections: Array<ApiHeadlessStorefrontConnection>;
  /** Default permissions selected for a new Headless storefront. */
  headlessStorefrontDefaultPermissions: Array<Scalars["String"]["output"]>;
  /** Permission catalog used to render the Headless access policy editor. */
  headlessStorefrontPermissionCatalog: Array<ApiHeadlessStorefrontPermissionDefinition>;
};

/** Headless App query namespace. */
export type ApiHeadlessAppQueryHeadlessStorefrontConnectionArgs = {
  id: Scalars["ID"]["input"];
};

/** Input for a lifecycle action on an existing Headless storefront. */
export type ApiHeadlessStorefrontActionInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  connectionId: Scalars["ID"]["input"];
};

/** An independent custom storefront owned by the Headless App installation. */
export type ApiHeadlessStorefrontConnection = ApiNode & {
  __typename?: "HeadlessStorefrontConnection";
  createdAt: Scalars["DateTime"]["output"];
  displayName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  /** The repeat-readable public token, subject to Admin authorization. */
  publicAccessToken?: Maybe<Scalars["String"]["output"]>;
  status: HeadlessStorefrontConnectionStatus;
  storefrontAccessPolicy?: Maybe<ApiStorefrontAccessPolicy>;
  /** Credential metadata without recoverable private token values. */
  storefrontCredentials: Array<ApiStorefrontCredential>;
  updatedAt: Scalars["DateTime"]["output"];
};

/** Lifecycle state of a Headless storefront connection. */
export enum HeadlessStorefrontConnectionStatus {
  Active = "ACTIVE",
  Disconnected = "DISCONNECTED",
  Suspended = "SUSPENDED",
}

/** Input for creating a Headless storefront connection. */
export type ApiHeadlessStorefrontCreateInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  displayName: Scalars["String"]["input"];
  /** Initial Storefront API permissions. Uses App defaults when omitted. */
  permissions?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Payload returned after creating a Headless storefront. */
export type ApiHeadlessStorefrontCreatePayload = {
  __typename?: "HeadlessStorefrontCreatePayload";
  connection?: Maybe<ApiHeadlessStorefrontConnection>;
  /** Whether an earlier request with the same client mutation ID was reused. */
  duplicate: Scalars["Boolean"]["output"];
  /** Present only for the first successful execution. */
  initialStorefrontCredentials?: Maybe<ApiStorefrontInitialCredentials>;
  userErrors: Array<ApiGenericUserError>;
};

/** Payload returned after changing a Headless storefront. */
export type ApiHeadlessStorefrontPayload = {
  __typename?: "HeadlessStorefrontPayload";
  connection?: Maybe<ApiHeadlessStorefrontConnection>;
  /** Whether an earlier request with the same client mutation ID was reused. */
  duplicate: Scalars["Boolean"]["output"];
  userErrors: Array<ApiGenericUserError>;
};

/** A permission available to a Headless storefront connection. */
export type ApiHeadlessStorefrontPermissionDefinition = {
  __typename?: "HeadlessStorefrontPermissionDefinition";
  /** Supported resource action: read or write. */
  action: Scalars["String"]["output"];
  /** What granting this permission allows the storefront to do. */
  description: Scalars["String"]["output"];
  /** Canonical permission scope stored in the access policy. */
  handle: Scalars["String"]["output"];
  /** Human-readable permission label. */
  label: Scalars["String"]["output"];
  /** Protected Storefront API resource. */
  resource: Scalars["String"]["output"];
  /** Risk level used by Admin UI when presenting the permission. */
  risk: HeadlessStorefrontPermissionRisk;
};

/** Risk level shown when an administrator grants a Storefront permission. */
export enum HeadlessStorefrontPermissionRisk {
  High = "HIGH",
  Low = "LOW",
  Medium = "MEDIUM",
}

/** Input for changing a Headless storefront display name. */
export type ApiHeadlessStorefrontUpdateInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  connectionId: Scalars["ID"]["input"];
  displayName: Scalars["String"]["input"];
};

/** Hello World App queries. */
export type ApiHelloWorldAppQuery = {
  __typename?: "HelloWorldAppQuery";
  helloWorldGreeting: ApiHelloWorldGreeting;
  helloWorldSecretDigest: ApiHelloWorldSecretDigest;
};

/** Hello World App queries. */
export type ApiHelloWorldAppQueryHelloWorldSecretDigestArgs = {
  name: Scalars["String"]["input"];
};

export type ApiHelloWorldGreeting = {
  __typename?: "HelloWorldGreeting";
  appCode: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export type ApiHelloWorldSecretDigest = {
  __typename?: "HelloWorldSecretDigest";
  sha256: Scalars["String"]["output"];
};

/** Filter operators for ID fields */
export type ApiIdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars["ID"]["input"]>;
  /** In array */
  _in?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["ID"]["input"]>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

export enum ImageContentType {
  Jpg = "JPG",
  Png = "PNG",
  Webp = "WEBP",
}

export type ApiImageTransformInput = {
  crop?: InputMaybe<CropRegion>;
  maxHeight?: InputMaybe<Scalars["Int"]["input"]>;
  maxWidth?: InputMaybe<Scalars["Int"]["input"]>;
  preferredContentType?: InputMaybe<ImageContentType>;
  scale?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Filter operators for Int fields */
export type ApiIntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  /** Equals */
  _eq?: InputMaybe<Scalars["Int"]["input"]>;
  /** Greater than */
  _gt?: InputMaybe<Scalars["Int"]["input"]>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars["Int"]["input"]>;
  /** In array */
  _in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Less than */
  _lt?: InputMaybe<Scalars["Int"]["input"]>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars["Int"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["Int"]["input"]>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type ApiInventoryAlertThreshold = {
  __typename?: "InventoryAlertThreshold";
  method: ThresholdMethod;
  minimumStock: Scalars["Int"]["output"];
};

export type ApiInventoryBackorder = {
  __typename?: "InventoryBackorder";
  etaAvgDays?: Maybe<Scalars["Float"]["output"]>;
  quantity: Scalars["Int"]["output"];
};

/**
 * InventoryItem represents the inventory-specific data for a variant.
 * Each catalog variant can have a corresponding InventoryItem.
 */
export type ApiInventoryItem = ApiNode & {
  __typename?: "InventoryItem";
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock: Scalars["Boolean"]["output"];
  /** When this item was created */
  createdAt: Scalars["DateTime"]["output"];
  /** Global ID (Relay) */
  id: Scalars["ID"]["output"];
  /** Whether this item requires physical delivery. */
  requiresShipping: Scalars["Boolean"]["output"];
  /** SKU code */
  sku?: Maybe<Scalars["String"]["output"]>;
  /** Stock levels across warehouses */
  stock: Array<ApiWarehouseStock>;
  /** Total quantity available across all warehouses */
  totalAvailable: Scalars["Int"]["output"];
  /** Whether to track inventory for this item */
  trackInventory: Scalars["Boolean"]["output"];
  /** Current unit cost */
  unitCost?: Maybe<ApiInventoryItemCost>;
  /** When this item was last updated */
  updatedAt: Scalars["DateTime"]["output"];
  /** Catalog variant entity */
  variant: ApiVariant;
  /** Reference to Catalog.Variant */
  variantId: Scalars["ID"]["output"];
};

export type ApiInventoryItemConnection = {
  __typename?: "InventoryItemConnection";
  edges: Array<ApiInventoryItemEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiInventoryItemCost = {
  __typename?: "InventoryItemCost";
  /** Cost in minor units (cents) */
  amountMinor: Scalars["BigInt"]["output"];
  /** Currency code */
  currency: Scalars["String"]["output"];
  /** Effective from date */
  effectiveFrom: Scalars["DateTime"]["output"];
};

export type ApiInventoryItemCostInput = {
  amountMinor: Scalars["BigInt"]["input"];
  currency: Scalars["String"]["input"];
};

export type ApiInventoryItemEdge = {
  __typename?: "InventoryItemEdge";
  cursor: Scalars["String"]["output"];
  node: ApiInventoryItem;
};

/** Inventory tracking settings for product creation. */
export type ApiInventoryItemInput = {
  /** Allow sales when stock is zero. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Whether variants created for this product require physical delivery. */
  requiresShipping: Scalars["Boolean"]["input"];
  /** Stock Keeping Unit. */
  sku?: InputMaybe<Scalars["String"]["input"]>;
  /** Whether to track inventory for this product. */
  tracked: Scalars["Boolean"]["input"];
};

export type ApiInventoryItemInventoryItemsMetaInput = {
  warehouseScope?: InputMaybe<ApiInventoryItemWarehouseScopeInput>;
};

export type ApiInventoryItemOrderByInput = {
  direction: SortDirection;
  field: InventoryItemOrderField;
};

export enum InventoryItemOrderField {
  AvailableForSale = "availableForSale",
  Id = "id",
  ProductName = "productName",
  QuantityOnHand = "quantityOnHand",
  ReservedQuantity = "reservedQuantity",
  Sku = "sku",
  UnavailableQuantity = "unavailableQuantity",
  UpdatedAt = "updatedAt",
  VariantId = "variantId",
}

export type ApiInventoryItemStockInput = {
  onHand: Scalars["Int"]["input"];
  unavailable?: InputMaybe<Scalars["Int"]["input"]>;
  warehouseId: Scalars["ID"]["input"];
};

export type ApiInventoryItemUpdateInput = {
  /** Whether to continue selling when out of stock */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The inventory item ID to update */
  id: Scalars["ID"]["input"];
  /** Whether this item requires physical delivery. */
  requiresShipping?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** New SKU value */
  sku?: InputMaybe<Scalars["String"]["input"]>;
  /** Stock update for a specific warehouse */
  stock?: InputMaybe<ApiInventoryItemStockInput>;
  /** Whether to track inventory */
  trackInventory?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Unit cost update */
  unitCost?: InputMaybe<ApiInventoryItemCostInput>;
};

export type ApiInventoryItemUpdatePayload = {
  __typename?: "InventoryItemUpdatePayload";
  /** Updated inventory item */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** List of errors */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiInventoryItemWarehouseScopeInput = {
  mode: InventoryItemWarehouseScopeMode;
  referenceIds: Array<Scalars["ID"]["input"]>;
};

export enum InventoryItemWarehouseScopeMode {
  Exclude = "EXCLUDE",
  Include = "INCLUDE",
}

export type ApiInventoryItemWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiInventoryItemWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiInventoryItemWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiInventoryItemWhereInput>>;
  /** Filter by available for sale quantity in the selected warehouse scope */
  availableForSale?: InputMaybe<ApiIntFilter>;
  /** Filter by inventory item ID */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<ApiStringFilter>;
  /** Filter by quantity on hand in the selected warehouse scope */
  quantityOnHand?: InputMaybe<ApiIntFilter>;
  /** Filter by reserved quantity in the selected warehouse scope */
  reservedQuantity?: InputMaybe<ApiIntFilter>;
  /** Filter by SKU */
  sku?: InputMaybe<ApiStringFilter>;
  /** Filter by trackInventory */
  trackInventory?: InputMaybe<ApiBooleanFilter>;
  /** Filter by unavailable quantity in the selected warehouse scope */
  unavailableQuantity?: InputMaybe<ApiIntFilter>;
  /** Filter by variant ID */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiInventoryMutation = {
  __typename?: "InventoryMutation";
  warehouseCreate: ApiWarehouseCreatePayload;
  warehouseDelete: ApiWarehouseDeletePayload;
  warehouseStockCreate: ApiWarehouseStockCreatePayload;
  warehouseStockDelete: ApiWarehouseStockDeletePayload;
  warehouseUpdate: ApiWarehouseUpdatePayload;
};

export type ApiInventoryMutationWarehouseCreateArgs = {
  input: ApiWarehouseCreateInput;
};

export type ApiInventoryMutationWarehouseDeleteArgs = {
  input: ApiWarehouseDeleteInput;
};

export type ApiInventoryMutationWarehouseStockCreateArgs = {
  input: ApiWarehouseStockCreateInput;
};

export type ApiInventoryMutationWarehouseStockDeleteArgs = {
  input: ApiWarehouseStockDeleteInput;
};

export type ApiInventoryMutationWarehouseUpdateArgs = {
  input: ApiWarehouseUpdateInput;
};

export type ApiInventoryQuantities = {
  __typename?: "InventoryQuantities";
  availableForSale: Scalars["Int"]["output"];
  onHand: Scalars["Int"]["output"];
  reserved: Scalars["Int"]["output"];
  unavailable: Scalars["Int"]["output"];
};

export type ApiInventoryQuery = {
  __typename?: "InventoryQuery";
  /** Get an inventory item by ID */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** Get an inventory item by variant ID */
  inventoryItemByVariant?: Maybe<ApiInventoryItem>;
  /** Get inventory items with Relay-style pagination */
  inventoryItems: ApiInventoryItemConnection;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a warehouse by ID */
  warehouse?: Maybe<ApiWarehouse>;
  /** Get variants that can still be assigned to the selected warehouse */
  warehouseAssignableVariants: ApiVariantConnection;
  /** Get all warehouses */
  warehouses: ApiWarehouseConnection;
};

export type ApiInventoryQueryInventoryItemArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiInventoryQueryInventoryItemByVariantArgs = {
  variantId: Scalars["ID"]["input"];
};

export type ApiInventoryQueryInventoryItemsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiInventoryItemInventoryItemsMetaInput>;
  orderBy?: InputMaybe<Array<ApiInventoryItemOrderByInput>>;
  where?: InputMaybe<ApiInventoryItemWhereInput>;
};

export type ApiInventoryQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiInventoryQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiInventoryQueryWarehouseArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiInventoryQueryWarehouseAssignableVariantsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiWarehouseAssignableVariantOrderByInput>>;
  warehouseId: Scalars["ID"]["input"];
  where?: InputMaybe<ApiWarehouseAssignableVariantWhereInput>;
};

export type ApiInventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

export type ApiInventorySkuStatus = {
  __typename?: "InventorySkuStatus";
  backorder: ApiSkuStatusMetric;
  lowStock: ApiSkuStatusMetric;
  outOfStock: ApiSkuStatusMetric;
  total: Scalars["Int"]["output"];
};

export type ApiLabel = {
  __typename?: "Label";
  id: Scalars["ID"]["output"];
};

export type ApiListing = {
  /** The global ID of the catalog listing item. */
  id: Scalars["ID"]["output"];
};

/** A connection to catalog products. */
export type ApiListingConnection = {
  __typename?: "ListingConnection";
  /** A list of edges. */
  edges: Array<ApiListingEdge>;
  /** Ordered facet items available for the current listing result. */
  facets: Array<ApiListingFacet>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of matched sellable items. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a Listing connection. */
export type ApiListingEdge = {
  __typename?: "ListingEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiListing;
};

export type ApiListingFacet = {
  __typename?: "ListingFacet";
  /** Stable listing facet ID. */
  id: Scalars["String"]["output"];
  /** Human-readable facet label. */
  label: Scalars["String"]["output"];
  /** Facet presentation/selection type. */
  type: ListingFacetType;
  /** Facet UI type. */
  uiType: FacetUiType;
  /** Ordered values for this facet in listing UI order. */
  values: Array<ApiListingFacetValue>;
};

export enum ListingFacetType {
  Boolean = "BOOLEAN",
  List = "LIST",
  PriceRange = "PRICE_RANGE",
}

export type ApiListingFacetValue = {
  __typename?: "ListingFacetValue";
  /** Number of matched sellable items for this value. */
  count: Scalars["Int"]["output"];
  /** Stable listing facet value ID. */
  id: Scalars["String"]["output"];
  /**
   * JSON object compatible with ListingProductFilter.
   * This keeps product, vendor, price and availability facets on one contract.
   */
  input: Scalars["JSON"]["output"];
  /** Human-readable value label. */
  label: Scalars["String"]["output"];
  /** Whether this value was selected in the current request. */
  selected: Scalars["Boolean"]["output"];
  /** Swatch metadata for facet values that have one. */
  swatch?: Maybe<ApiFacetSwatch>;
};

export type ApiListingFacetValueFilter = {
  /** Facet stable identifier. */
  facet: Scalars["String"]["input"];
  /** Facet value stable identifier. */
  value: Scalars["String"]["input"];
};

export type ApiListingMutation = {
  __typename?: "ListingMutation";
  /** Create a new facet. */
  facetCreate: ApiFacetCreatePayload;
  /** Delete a facet. */
  facetDelete: ApiFacetDeletePayload;
  /** Move a facet before or after another facet. */
  facetMove: ApiFacetMovePayload;
  /** Rebalance facet lexo ranks. */
  facetRebalance: ApiFacetRebalancePayload;
  /**
   * Atomically replace scopes for multiple facets.
   * No updates are applied when any input item is invalid.
   */
  facetScopesUpdate: ApiFacetScopesUpdatePayload;
  /** Create a new facet swatch. */
  facetSwatchCreate: ApiFacetSwatchCreatePayload;
  /** Delete a facet swatch. */
  facetSwatchDelete: ApiFacetSwatchDeletePayload;
  /** Update an existing facet swatch. */
  facetSwatchUpdate: ApiFacetSwatchUpdatePayload;
  /** Update an existing facet. */
  facetUpdate: ApiFacetUpdatePayload;
  /** Create a new facet value. */
  facetValueCreate: ApiFacetValueCreatePayload;
  /** Delete a facet value. */
  facetValueDelete: ApiFacetValueDeletePayload;
  /**
   * Attach source facet values to an existing or newly-created group value.
   * This is the only mutation that merges source values into a group value.
   */
  facetValueMerge: ApiFacetValueMergePayload;
  /**
   * Detach source facet values from their group value and make them root values.
   * This is the only mutation that unmerges source values.
   */
  facetValueUnmerge: ApiFacetValueUnmergePayload;
  /** Update an existing facet value. */
  facetValueUpdate: ApiFacetValueUpdatePayload;
  /** Search configuration mutation namespace. */
  search: ApiListingSearchMutation;
};

export type ApiListingMutationFacetCreateArgs = {
  input: ApiFacetCreateInput;
};

export type ApiListingMutationFacetDeleteArgs = {
  input: ApiFacetDeleteInput;
};

export type ApiListingMutationFacetMoveArgs = {
  input: ApiFacetMoveInput;
};

export type ApiListingMutationFacetRebalanceArgs = {
  input: ApiFacetRebalanceInput;
};

export type ApiListingMutationFacetScopesUpdateArgs = {
  input: ApiFacetScopesUpdateInput;
};

export type ApiListingMutationFacetSwatchCreateArgs = {
  input: ApiFacetSwatchCreateInput;
};

export type ApiListingMutationFacetSwatchDeleteArgs = {
  input: ApiFacetSwatchDeleteInput;
};

export type ApiListingMutationFacetSwatchUpdateArgs = {
  input: ApiFacetSwatchUpdateInput;
};

export type ApiListingMutationFacetUpdateArgs = {
  input: ApiFacetUpdateInput;
};

export type ApiListingMutationFacetValueCreateArgs = {
  input: ApiFacetValueCreateInput;
};

export type ApiListingMutationFacetValueDeleteArgs = {
  input: ApiFacetValueDeleteInput;
};

export type ApiListingMutationFacetValueMergeArgs = {
  input: ApiFacetValueMergeInput;
};

export type ApiListingMutationFacetValueUnmergeArgs = {
  input: ApiFacetValueUnmergeInput;
};

export type ApiListingMutationFacetValueUpdateArgs = {
  input: ApiFacetValueUpdateInput;
};

export type ApiListingOrderByInput = {
  /** Sort key for the listing request. */
  by: ListingSortBy;
  /** Sort direction. Ignored for MANUAL and RELEVANCE. */
  direction?: InputMaybe<ListingSortDirection>;
};

export type ApiListingPriceRangeFilter = {
  /** Maximum price amount in minor units. */
  max?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** Minimum price amount in minor units. */
  min?: InputMaybe<Scalars["BigInt"]["input"]>;
};

export type ApiListingProductFilter = {
  /** Filter on if the listing item is available. */
  available?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Filter by product price range. */
  price?: InputMaybe<ApiListingPriceRangeFilter>;
  /** Filter by product-level listing facet value. */
  productFacet?: InputMaybe<ApiListingFacetValueFilter>;
  /** Filter by product vendor. */
  productVendor?: InputMaybe<Scalars["String"]["input"]>;
  /** Filter by product tag. */
  tag?: InputMaybe<Scalars["String"]["input"]>;
  /** Filter by variant-level listing facet value. */
  variantFacet?: InputMaybe<ApiListingFacetValueFilter>;
  /** Filter by variant option. */
  variantOption?: InputMaybe<ApiListingVariantOptionFilter>;
};

export type ApiListingQuery = {
  __typename?: "ListingQuery";
  /** Get a facet by ID. */
  facet?: Maybe<ApiFacet>;
  /** Get available facet source candidates for create flow. */
  facetSourceCandidates: ApiFacetSourceCandidateConnection;
  /** Get a facet swatch by ID. */
  facetSwatch?: Maybe<ApiFacetSwatch>;
  /** Get all facet swatches. */
  facetSwatches: Array<ApiFacetSwatch>;
  /** Get a facet value by ID. */
  facetValue?: Maybe<ApiFacetValue>;
  /** Get available facet source value candidates for create and edit flows. */
  facetValueCandidates: ApiFacetValueCandidateConnection;
  /** Get all facet values for a specific facet. */
  facetValues: Array<ApiFacetValue>;
  /** Get all facets. */
  facets: Array<ApiFacet>;
  /**
   * Get ordered listing structure for Admin.
   *
   * Listing service returns listing-owned order, pagination, counts, aggregates,
   * and canonical entity references only. Entity details are resolved by owning
   * subgraphs through federation.
   */
  listing: ApiListingConnection;
  /** Get a node by its global ID. */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs. */
  nodes: Array<Maybe<ApiNode>>;
  /** Search configuration and diagnostics namespace. */
  search: ApiListingSearchQuery;
};

export type ApiListingQueryFacetArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingQueryFacetSourceCandidatesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiFacetSourceCandidateOrderByInput>>;
  where?: InputMaybe<ApiFacetSourceCandidateWhereInput>;
};

export type ApiListingQueryFacetSwatchArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingQueryFacetValueArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingQueryFacetValueCandidatesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta: ApiFacetValueCandidatesMetaInput;
  orderBy?: InputMaybe<Array<ApiFacetValueCandidateOrderByInput>>;
  where?: InputMaybe<ApiFacetValueCandidateWhereInput>;
};

export type ApiListingQueryFacetValuesArgs = {
  facetId: Scalars["ID"]["input"];
};

export type ApiListingQueryListingArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  currency?: InputMaybe<CurrencyCode>;
  facets?: InputMaybe<Array<ApiListingProductFilter>>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  locale?: InputMaybe<LocaleCode>;
  orderBy?: InputMaybe<ApiListingOrderByInput>;
  query?: InputMaybe<Scalars["String"]["input"]>;
  scope?: InputMaybe<ApiListingScopeInput>;
};

export type ApiListingQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiListingScopeInput = {
  /** Category global ID. Required for CATEGORY and forbidden for GLOBAL. */
  categoryId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Scope kind for the listing request. */
  kind: ListingScopeKind;
};

export enum ListingScopeKind {
  Category = "CATEGORY",
  Global = "GLOBAL",
}

export type ApiListingSearchMutation = {
  __typename?: "ListingSearchMutation";
  productBoostCreate: ApiSearchProductBoostPayload;
  productBoostDelete: ApiSearchProductBoostPayload;
  productBoostUpdate: ApiSearchProductBoostPayload;
  /** Update the store-level search settings. */
  settingsUpdate: ApiSearchSettingsUpdatePayload;
  synonymGroupCreate: ApiSearchSynonymGroupPayload;
  synonymGroupDelete: ApiSearchSynonymGroupPayload;
  synonymGroupUpdate: ApiSearchSynonymGroupPayload;
};

export type ApiListingSearchMutationProductBoostCreateArgs = {
  input: ApiSearchProductBoostCreateInput;
};

export type ApiListingSearchMutationProductBoostDeleteArgs = {
  input: ApiSearchConfigurationDeleteInput;
};

export type ApiListingSearchMutationProductBoostUpdateArgs = {
  input: ApiSearchProductBoostUpdateInput;
};

export type ApiListingSearchMutationSettingsUpdateArgs = {
  expectedVersion: Scalars["Int"]["input"];
  operations: ApiSearchSettingsOperationsInput;
};

export type ApiListingSearchMutationSynonymGroupCreateArgs = {
  input: ApiSearchSynonymGroupCreateInput;
};

export type ApiListingSearchMutationSynonymGroupDeleteArgs = {
  input: ApiSearchConfigurationDeleteInput;
};

export type ApiListingSearchMutationSynonymGroupUpdateArgs = {
  input: ApiSearchSynonymGroupUpdateInput;
};

export type ApiListingSearchQuery = {
  __typename?: "ListingSearchQuery";
  /** Explain the canonical request-level search plan and its candidate membership. */
  explain: ApiSearchExplain;
  productBoost?: Maybe<ApiSearchProductBoost>;
  productBoosts: ApiSearchProductBoostConnection;
  /** Current search settings for the selected store, if initialized. */
  settings?: Maybe<ApiSearchSettings>;
  synonymGroup?: Maybe<ApiSearchSynonymGroup>;
  synonymGroups: ApiSearchSynonymGroupConnection;
};

export type ApiListingSearchQueryExplainArgs = {
  locale: LocaleCode;
  query: Scalars["String"]["input"];
};

export type ApiListingSearchQueryProductBoostArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingSearchQueryProductBoostsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiSearchProductBoostsMetaInput>;
  orderBy?: InputMaybe<Array<ApiSearchProductBoostOrderByInput>>;
  where?: InputMaybe<ApiSearchProductBoostWhereInput>;
};

export type ApiListingSearchQuerySynonymGroupArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiListingSearchQuerySynonymGroupsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiSearchSynonymGroupOrderByInput>>;
  where?: InputMaybe<ApiSearchSynonymGroupWhereInput>;
};

export enum ListingSortBy {
  Created = "CREATED",
  Manual = "MANUAL",
  Name = "NAME",
  Newest = "NEWEST",
  Price = "PRICE",
  Relevance = "RELEVANCE",
}

export enum ListingSortDirection {
  Asc = "asc",
  Desc = "desc",
}

export type ApiListingVariantOptionFilter = {
  /** Variant option name. */
  name: Scalars["String"]["input"];
  /** Variant option value. */
  value: Scalars["String"]["input"];
};

/** Locale configuration for the project */
export type ApiLocale = {
  __typename?: "Locale";
  /** BCP 47 locale code */
  code: LocaleCode;
  /** Whether this locale is currently active for the project */
  isActive: Scalars["Boolean"]["output"];
  /** Display name of the locale */
  name: Scalars["String"]["output"];
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = "ak",
  /** Amharic */
  Am = "am",
  /** Arabic */
  Ar = "ar",
  /** Assamese */
  As = "as",
  /** Azerbaijani */
  Az = "az",
  /** Belarusian */
  Be = "be",
  /** Bulgarian */
  Bg = "bg",
  /** Bambara */
  Bm = "bm",
  /** Bangla */
  Bn = "bn",
  /** Tibetan */
  Bo = "bo",
  /** Breton */
  Br = "br",
  /** Bosnian */
  Bs = "bs",
  /** Catalan */
  Ca = "ca",
  /** Chechen */
  Ce = "ce",
  /** Central Kurdish */
  Ckb = "ckb",
  /** Czech */
  Cs = "cs",
  /** Welsh */
  Cy = "cy",
  /** Danish */
  Da = "da",
  /** German */
  De = "de",
  /** Dzongkha */
  Dz = "dz",
  /** Ewe */
  Ee = "ee",
  /** Greek */
  El = "el",
  /** English */
  En = "en",
  /** Esperanto */
  Eo = "eo",
  /** Spanish */
  Es = "es",
  /** Estonian */
  Et = "et",
  /** Basque */
  Eu = "eu",
  /** Persian */
  Fa = "fa",
  /** Fulah */
  Ff = "ff",
  /** Finnish */
  Fi = "fi",
  /** Filipino */
  Fil = "fil",
  /** Faroese */
  Fo = "fo",
  /** French */
  Fr = "fr",
  /** Western Frisian */
  Fy = "fy",
  /** Irish */
  Ga = "ga",
  /** Scottish Gaelic */
  Gd = "gd",
  /** Galician */
  Gl = "gl",
  /** Gujarati */
  Gu = "gu",
  /** Manx */
  Gv = "gv",
  /** Hausa */
  Ha = "ha",
  /** Hebrew */
  He = "he",
  /** Hindi */
  Hi = "hi",
  /** Croatian */
  Hr = "hr",
  /** Hungarian */
  Hu = "hu",
  /** Armenian */
  Hy = "hy",
  /** Interlingua */
  Ia = "ia",
  /** Indonesian */
  Id = "id",
  /** Igbo */
  Ig = "ig",
  /** Sichuan Yi */
  Ii = "ii",
  /** Icelandic */
  Is = "is",
  /** Italian */
  It = "it",
  /** Japanese */
  Ja = "ja",
  /** Javanese */
  Jv = "jv",
  /** Georgian */
  Ka = "ka",
  /** Kikuyu */
  Ki = "ki",
  /** Kazakh */
  Kk = "kk",
  /** Kalaallisut */
  Kl = "kl",
  /** Khmer */
  Km = "km",
  /** Kannada */
  Kn = "kn",
  /** Korean */
  Ko = "ko",
  /** Kashmiri */
  Ks = "ks",
  /** Kurdish */
  Ku = "ku",
  /** Cornish */
  Kw = "kw",
  /** Kyrgyz */
  Ky = "ky",
  /** Luxembourgish */
  Lb = "lb",
  /** Ganda */
  Lg = "lg",
  /** Lingala */
  Ln = "ln",
  /** Lao */
  Lo = "lo",
  /** Lithuanian */
  Lt = "lt",
  /** Luba-Katanga */
  Lu = "lu",
  /** Latvian */
  Lv = "lv",
  /** Malagasy */
  Mg = "mg",
  /** Māori */
  Mi = "mi",
  /** Macedonian */
  Mk = "mk",
  /** Malayalam */
  Ml = "ml",
  /** Mongolian */
  Mn = "mn",
  /** Marathi */
  Mr = "mr",
  /** Malay */
  Ms = "ms",
  /** Maltese */
  Mt = "mt",
  /** Burmese */
  My = "my",
  /** Norwegian Bokmål */
  Nb = "nb",
  /** North Ndebele */
  Nd = "nd",
  /** Nepali */
  Ne = "ne",
  /** Dutch */
  Nl = "nl",
  /** Norwegian Nynorsk */
  Nn = "nn",
  /** Norwegian */
  No = "no",
  /** Oromo */
  Om = "om",
  /** Odia */
  Or = "or",
  /** Ossetic */
  Os = "os",
  /** Punjabi */
  Pa = "pa",
  /** Polish */
  Pl = "pl",
  /** Pashto */
  Ps = "ps",
  /** Portuguese (Brazil) */
  PtBr = "pt_BR",
  /** Portuguese (Portugal) */
  PtPt = "pt_PT",
  /** Quechua */
  Qu = "qu",
  /** Romansh */
  Rm = "rm",
  /** Rundi */
  Rn = "rn",
  /** Romanian */
  Ro = "ro",
  /** Russian */
  Ru = "ru",
  /** Kinyarwanda */
  Rw = "rw",
  /** Sanskrit */
  Sa = "sa",
  /** Sardinian */
  Sc = "sc",
  /** Sindhi */
  Sd = "sd",
  /** Northern Sami */
  Se = "se",
  /** Sango */
  Sg = "sg",
  /** Sinhala */
  Si = "si",
  /** Slovak */
  Sk = "sk",
  /** Slovenian */
  Sl = "sl",
  /** Shona */
  Sn = "sn",
  /** Somali */
  So = "so",
  /** Albanian */
  Sq = "sq",
  /** Serbian */
  Sr = "sr",
  /** Sundanese */
  Su = "su",
  /** Swedish */
  Sv = "sv",
  /** Swahili */
  Sw = "sw",
  /** Tamil */
  Ta = "ta",
  /** Telugu */
  Te = "te",
  /** Tajik */
  Tg = "tg",
  /** Thai */
  Th = "th",
  /** Tigrinya */
  Ti = "ti",
  /** Turkmen */
  Tk = "tk",
  /** Tongan */
  To = "to",
  /** Turkish */
  Tr = "tr",
  /** Tatar */
  Tt = "tt",
  /** Uyghur */
  Ug = "ug",
  /** Ukrainian */
  Uk = "uk",
  /** Urdu */
  Ur = "ur",
  /** Uzbek */
  Uz = "uz",
  /** Vietnamese */
  Vi = "vi",
  /** Wolof */
  Wo = "wo",
  /** Xhosa */
  Xh = "xh",
  /** Yiddish */
  Yi = "yi",
  /** Yoruba */
  Yo = "yo",
  /** Chinese (Simplified) */
  ZhCn = "zh_CN",
  /** Chinese (Traditional) */
  ZhTw = "zh_TW",
  /** Zulu */
  Zu = "zu",
}

/** Input for creating a new locale */
export type ApiLocaleCreateInput = {
  /** BCP 47 locale code to add */
  code: LocaleCode;
  /** Whether the locale should be active upon creation */
  isActive: Scalars["Boolean"]["input"];
};

/** Payload returned after creating a locale */
export type ApiLocaleCreatePayload = {
  __typename?: "LocaleCreatePayload";
  /** The newly created locale, null if creation failed */
  locale?: Maybe<ApiLocale>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

/** Input for deleting a locale */
export type ApiLocaleDeleteInput = {
  /** BCP 47 locale code to delete */
  code: LocaleCode;
};

/** Payload returned after deleting a locale */
export type ApiLocaleDeletePayload = {
  __typename?: "LocaleDeletePayload";
  /** The code of the deleted locale, null if deletion failed */
  deletedLocaleCode?: Maybe<LocaleCode>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Input for setting the default locale */
export type ApiLocaleSetDefaultInput = {
  /** BCP 47 locale code to set as default */
  locale: LocaleCode;
};

/** Payload returned after updating locale settings */
export type ApiLocaleUpdatePayload = {
  __typename?: "LocaleUpdatePayload";
  /** Whether the update was successful */
  success: Scalars["Boolean"]["output"];
  /** List of errors that occurred during update */
  userErrors: Array<ApiUserError>;
};

export type ApiLoyaltyAccount = ApiNode & {
  __typename?: "LoyaltyAccount";
  balance: ApiLoyaltyAccountBalance;
  closedAt?: Maybe<Scalars["DateTime"]["output"]>;
  customer?: Maybe<ApiCustomer>;
  customerId: Scalars["ID"]["output"];
  expiringPoints: Array<ApiLoyaltyExpiringPoints>;
  id: Scalars["ID"]["output"];
  mergedIntoAccount?: Maybe<ApiLoyaltyAccount>;
  monetaryWallets: Array<ApiLoyaltyMonetaryWallet>;
  openedAt: Scalars["DateTime"]["output"];
  program: ApiLoyaltyProgram;
  revision: Scalars["Int"]["output"];
  rewardEntitlements: Array<ApiLoyaltyRewardEntitlement>;
  status: LoyaltyAccountStatus;
  suspendedAt?: Maybe<Scalars["DateTime"]["output"]>;
  suspendedReason?: Maybe<Scalars["String"]["output"]>;
  tierMembership?: Maybe<ApiLoyaltyTierMembership>;
  tierMemberships: Array<ApiLoyaltyTierMembership>;
  transactions: ApiLoyaltyTransactionConnection;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyAccountExpiringPointsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyAccountRewardEntitlementsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyAccountTierMembershipsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyAccountTransactionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyTransactionWhereInput>;
};

export type ApiLoyaltyAccountBalance = {
  __typename?: "LoyaltyAccountBalance";
  availablePoints: Scalars["BigInt"]["output"];
  debtPoints: Scalars["BigInt"]["output"];
  lifetimeAdjustedPoints: Scalars["BigInt"]["output"];
  lifetimeEarnedPoints: Scalars["BigInt"]["output"];
  lifetimeExpiredPoints: Scalars["BigInt"]["output"];
  lifetimeRedeemedPoints: Scalars["BigInt"]["output"];
  pendingPoints: Scalars["BigInt"]["output"];
  reservedPoints: Scalars["BigInt"]["output"];
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyAccountBalanceRebuildInput = {
  accountId: Scalars["ID"]["input"];
  idempotencyKey: Scalars["String"]["input"];
};

export type ApiLoyaltyAccountBalanceRebuildPayload = {
  __typename?: "LoyaltyAccountBalanceRebuildPayload";
  account?: Maybe<ApiLoyaltyAccount>;
  balance?: Maybe<ApiLoyaltyAccountBalance>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyAccountConnection = {
  __typename?: "LoyaltyAccountConnection";
  edges: Array<ApiLoyaltyAccountEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiLoyaltyAccountEdge = {
  __typename?: "LoyaltyAccountEdge";
  cursor: Scalars["String"]["output"];
  node: ApiLoyaltyAccount;
};

export enum LoyaltyAccountStatus {
  Active = "ACTIVE",
  Closed = "CLOSED",
  Merged = "MERGED",
  Suspended = "SUSPENDED",
}

export type ApiLoyaltyAccountStatusUpdateInput = {
  accountId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  reason: Scalars["String"]["input"];
  status: LoyaltyAccountStatus;
};

export type ApiLoyaltyAccountStatusUpdatePayload = {
  __typename?: "LoyaltyAccountStatusUpdatePayload";
  account?: Maybe<ApiLoyaltyAccount>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyAccountWhereInput = {
  customerIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  hasDebt?: InputMaybe<Scalars["Boolean"]["input"]>;
  ids?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  minimumAvailablePoints?: InputMaybe<Scalars["BigInt"]["input"]>;
  programIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  statuses?: InputMaybe<Array<LoyaltyAccountStatus>>;
  tierIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

export enum LoyaltyActorType {
  AdminUser = "ADMIN_USER",
  Customer = "CUSTOMER",
  Service = "SERVICE",
  System = "SYSTEM",
}

export enum LoyaltyBalanceBucket {
  Available = "AVAILABLE",
  Debt = "DEBT",
  Pending = "PENDING",
  Reserved = "RESERVED",
}

export type ApiLoyaltyCatalogSelector = {
  __typename?: "LoyaltyCatalogSelector";
  ids: Array<Scalars["ID"]["output"]>;
  type: LoyaltyCatalogSelectorType;
};

export type ApiLoyaltyCatalogSelectorInput = {
  /** Must be empty for ALL and non-empty for every specific selector type. */
  ids: Array<Scalars["ID"]["input"]>;
  type: LoyaltyCatalogSelectorType;
};

export enum LoyaltyCatalogSelectorType {
  All = "ALL",
  Category = "CATEGORY",
  Feature = "FEATURE",
  OptionValue = "OPTION_VALUE",
  Product = "PRODUCT",
  Tag = "TAG",
  Variant = "VARIANT",
}

export enum LoyaltyDebtPolicy {
  RejectReversal = "REJECT_REVERSAL",
  TrackDebt = "TRACK_DEBT",
}

export type ApiLoyaltyDeletePayload = {
  __typename?: "LoyaltyDeletePayload";
  deletedId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyEarningActionType {
  ApplyMultiplier = "APPLY_MULTIPLIER",
  AwardCashback = "AWARD_CASHBACK",
  AwardFixedPoints = "AWARD_FIXED_POINTS",
  AwardSpendRatio = "AWARD_SPEND_RATIO",
  IssueReward = "ISSUE_REWARD",
}

export type ApiLoyaltyEarningModifier = {
  __typename?: "LoyaltyEarningModifier";
  endsAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  multiplierBps: Scalars["Int"]["output"];
  priority: Scalars["Int"]["output"];
  segmentIds: Array<Scalars["ID"]["output"]>;
  selector: ApiLoyaltyCatalogSelector;
  startsAt?: Maybe<Scalars["DateTime"]["output"]>;
  title: Scalars["String"]["output"];
};

export type ApiLoyaltyEarningModifierInput = {
  endsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  id: Scalars["ID"]["input"];
  /** 10000 equals a 1x multiplier. */
  multiplierBps: Scalars["Int"]["input"];
  priority: Scalars["Int"]["input"];
  segmentIds: Array<Scalars["ID"]["input"]>;
  selector: ApiLoyaltyCatalogSelectorInput;
  startsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  title: Scalars["String"]["input"];
};

export type ApiLoyaltyEarningRule = ApiNode & {
  __typename?: "LoyaltyEarningRule";
  action: Scalars["JSON"]["output"];
  actionSchemaVersion: Scalars["Int"]["output"];
  actionType: LoyaltyEarningActionType;
  code: Scalars["String"]["output"];
  conditionSchemaVersion: Scalars["Int"]["output"];
  conditions: Scalars["JSON"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  limitSchemaVersion: Scalars["Int"]["output"];
  limits: Scalars["JSON"]["output"];
  name: Scalars["String"]["output"];
  priority: Scalars["Int"]["output"];
  programVersion: ApiLoyaltyProgramVersion;
  stopProcessing: Scalars["Boolean"]["output"];
  triggerConfig: Scalars["JSON"]["output"];
  triggerSchemaVersion: Scalars["Int"]["output"];
  triggerType: LoyaltyEarningTriggerType;
};

export type ApiLoyaltyEarningRuleCreateInput = {
  action: Scalars["JSON"]["input"];
  actionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  actionType: LoyaltyEarningActionType;
  code: Scalars["String"]["input"];
  conditionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  conditions: Scalars["JSON"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  limitSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  limits?: Scalars["JSON"]["input"];
  name: Scalars["String"]["input"];
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  programVersionId: Scalars["ID"]["input"];
  stopProcessing?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerConfig?: Scalars["JSON"]["input"];
  triggerSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  triggerType: LoyaltyEarningTriggerType;
};

export type ApiLoyaltyEarningRuleDeleteInput = {
  earningRuleId: Scalars["ID"]["input"];
  idempotencyKey: Scalars["String"]["input"];
};

export type ApiLoyaltyEarningRuleInput = {
  action: Scalars["JSON"]["input"];
  actionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  actionType: LoyaltyEarningActionType;
  code: Scalars["String"]["input"];
  conditionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  conditions: Scalars["JSON"]["input"];
  limitSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  limits?: Scalars["JSON"]["input"];
  name: Scalars["String"]["input"];
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  stopProcessing?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerConfig?: Scalars["JSON"]["input"];
  triggerSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  triggerType: LoyaltyEarningTriggerType;
};

export type ApiLoyaltyEarningRulePayload = {
  __typename?: "LoyaltyEarningRulePayload";
  earningRule?: Maybe<ApiLoyaltyEarningRule>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyEarningRuleUpdateInput = {
  action?: InputMaybe<Scalars["JSON"]["input"]>;
  actionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  actionType?: InputMaybe<LoyaltyEarningActionType>;
  conditionSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  conditions?: InputMaybe<Scalars["JSON"]["input"]>;
  earningRuleId: Scalars["ID"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  limitSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  limits?: InputMaybe<Scalars["JSON"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  stopProcessing?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerConfig?: InputMaybe<Scalars["JSON"]["input"]>;
  triggerSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  triggerType?: InputMaybe<LoyaltyEarningTriggerType>;
};

export type ApiLoyaltyEarningRuleUsage = ApiNode & {
  __typename?: "LoyaltyEarningRuleUsage";
  earningRule: ApiLoyaltyEarningRule;
  id: Scalars["ID"]["output"];
  monetaryAmounts: Scalars["JSON"]["output"];
  occurrenceCount: Scalars["BigInt"]["output"];
  pointsAwarded: Scalars["BigInt"]["output"];
  revision: Scalars["Int"]["output"];
  scopeKey: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  windowEndedAt?: Maybe<Scalars["DateTime"]["output"]>;
  windowStartedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyEarningRuleUsageWhereInput = {
  earningRuleId: Scalars["ID"]["input"];
  effectiveAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  scopeKey?: InputMaybe<Scalars["String"]["input"]>;
};

export enum LoyaltyEarningTriggerType {
  Anniversary = "ANNIVERSARY",
  Birthday = "BIRTHDAY",
  CustomEvent = "CUSTOM_EVENT",
  Login = "LOGIN",
  Order = "ORDER",
  Referral = "REFERRAL",
  Review = "REVIEW",
  Signup = "SIGNUP",
  SubscriptionRenewal = "SUBSCRIPTION_RENEWAL",
}

export enum LoyaltyEligibleSpendBasis {
  AfterAllDiscounts = "AFTER_ALL_DISCOUNTS",
  AfterProductDiscounts = "AFTER_PRODUCT_DISCOUNTS",
}

export type ApiLoyaltyEventEvaluation = ApiNode & {
  __typename?: "LoyaltyEventEvaluation";
  account: ApiLoyaltyAccount;
  decision: LoyaltyEventEvaluationDecision;
  earningRule: ApiLoyaltyEarningRule;
  evaluatedAt: Scalars["DateTime"]["output"];
  eventFact: ApiLoyaltyEventFact;
  id: Scalars["ID"]["output"];
  monetaryAmount?: Maybe<ApiLoyaltyMoney>;
  pointsAwarded?: Maybe<Scalars["BigInt"]["output"]>;
  reasonCode: Scalars["String"]["output"];
  result: Scalars["JSON"]["output"];
  resultSchemaVersion: Scalars["Int"]["output"];
  transaction?: Maybe<ApiLoyaltyTransaction>;
};

export enum LoyaltyEventEvaluationDecision {
  Awarded = "AWARDED",
  BudgetExhausted = "BUDGET_EXHAUSTED",
  Ignored = "IGNORED",
  Ineligible = "INELIGIBLE",
  LimitReached = "LIMIT_REACHED",
}

export type ApiLoyaltyEventEvaluationWhereInput = {
  accountId?: InputMaybe<Scalars["ID"]["input"]>;
  decisions?: InputMaybe<Array<LoyaltyEventEvaluationDecision>>;
  earningRuleId?: InputMaybe<Scalars["ID"]["input"]>;
  eventFactId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiLoyaltyEventFact = ApiNode & {
  __typename?: "LoyaltyEventFact";
  customerId?: Maybe<Scalars["ID"]["output"]>;
  evaluations: Array<ApiLoyaltyEventEvaluation>;
  eventType: Scalars["String"]["output"];
  externalEventId: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  payload: Scalars["JSON"]["output"];
  payloadHash: Scalars["String"]["output"];
  payloadSchemaVersion: Scalars["Int"]["output"];
  producer: Scalars["String"]["output"];
  receivedAt: Scalars["DateTime"]["output"];
  subjectId: Scalars["String"]["output"];
  subjectType: Scalars["String"]["output"];
};

export type ApiLoyaltyEventFactWhereInput = {
  customerIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  eventTypes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  occurredFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  occurredTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  producers?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

export type ApiLoyaltyExpiringPoints = {
  __typename?: "LoyaltyExpiringPoints";
  expiresAt: Scalars["DateTime"]["output"];
  lotId: Scalars["ID"]["output"];
  points: Scalars["BigInt"]["output"];
};

export type ApiLoyaltyLedgerEntry = ApiNode & {
  __typename?: "LoyaltyLedgerEntry";
  account: ApiLoyaltyAccount;
  bucket: LoyaltyBalanceBucket;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  pointsDelta: Scalars["BigInt"]["output"];
  sequence: Scalars["Int"]["output"];
  transaction: ApiLoyaltyTransaction;
};

export type ApiLoyaltyLotAllocation = ApiNode & {
  __typename?: "LoyaltyLotAllocation";
  allocationType: LoyaltyLotAllocationType;
  createdAt: Scalars["DateTime"]["output"];
  debitEntry: ApiLoyaltyLedgerEntry;
  id: Scalars["ID"]["output"];
  lot: ApiLoyaltyPointLot;
  points: Scalars["BigInt"]["output"];
  transaction: ApiLoyaltyTransaction;
};

export enum LoyaltyLotAllocationType {
  Expire = "EXPIRE",
  Merge = "MERGE",
  Redeem = "REDEEM",
  Reverse = "REVERSE",
}

export type ApiLoyaltyMaintenanceResult = {
  __typename?: "LoyaltyMaintenanceResult";
  activatedMonetaryLots: Scalars["Int"]["output"];
  activatedPointLots: Scalars["Int"]["output"];
  activatedProgramVersions: Scalars["Int"]["output"];
  evaluatedTiers: Scalars["Int"]["output"];
  expiredMonetaryLots: Scalars["Int"]["output"];
  expiredPointLots: Scalars["Int"]["output"];
  expiredReservations: Scalars["Int"]["output"];
  expiredRewards: Scalars["Int"]["output"];
  rebuiltBalances: Scalars["Int"]["output"];
};

export type ApiLoyaltyMaintenanceRunInput = {
  effectiveAt: Scalars["DateTime"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  rebuildBalances?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiLoyaltyMaintenanceRunPayload = {
  __typename?: "LoyaltyMaintenanceRunPayload";
  result?: Maybe<ApiLoyaltyMaintenanceResult>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyModifierStackingMode {
  Add = "ADD",
  Highest = "HIGHEST",
  Multiply = "MULTIPLY",
}

export enum LoyaltyMonetaryAdjustmentDirection {
  Credit = "CREDIT",
  Debit = "DEBIT",
}

export enum LoyaltyMonetaryBalanceBucket {
  Available = "AVAILABLE",
  Debt = "DEBT",
  Pending = "PENDING",
  Reserved = "RESERVED",
}

export type ApiLoyaltyMonetaryCreditLot = ApiNode & {
  __typename?: "LoyaltyMonetaryCreditLot";
  activatedAt: Scalars["DateTime"]["output"];
  allocations: Array<ApiLoyaltyMonetaryLotAllocation>;
  amountIssued: ApiLoyaltyMoney;
  createdAt: Scalars["DateTime"]["output"];
  expiresAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  originEntry: ApiLoyaltyMonetaryLedgerEntry;
  remainingAmount: ApiLoyaltyMoney;
  wallet: ApiLoyaltyMonetaryWallet;
};

export type ApiLoyaltyMonetaryLedgerEntry = ApiNode & {
  __typename?: "LoyaltyMonetaryLedgerEntry";
  amount: ApiLoyaltyMoney;
  bucket: LoyaltyMonetaryBalanceBucket;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  sequence: Scalars["Int"]["output"];
  transaction: ApiLoyaltyMonetaryTransaction;
  wallet: ApiLoyaltyMonetaryWallet;
};

export type ApiLoyaltyMonetaryLotAllocation = ApiNode & {
  __typename?: "LoyaltyMonetaryLotAllocation";
  amount: ApiLoyaltyMoney;
  createdAt: Scalars["DateTime"]["output"];
  debitEntry: ApiLoyaltyMonetaryLedgerEntry;
  id: Scalars["ID"]["output"];
  lot: ApiLoyaltyMonetaryCreditLot;
};

export type ApiLoyaltyMonetaryTransaction = ApiNode & {
  __typename?: "LoyaltyMonetaryTransaction";
  actorId?: Maybe<Scalars["ID"]["output"]>;
  actorType: LoyaltyActorType;
  createdAt: Scalars["DateTime"]["output"];
  effectiveAt: Scalars["DateTime"]["output"];
  entries: Array<ApiLoyaltyMonetaryLedgerEntry>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  kind: LoyaltyMonetaryTransactionKind;
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  program: ApiLoyaltyProgram;
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  reasonCode: Scalars["String"]["output"];
  requestHash: Scalars["String"]["output"];
  sourceId?: Maybe<Scalars["String"]["output"]>;
  sourceRevision?: Maybe<Scalars["String"]["output"]>;
  sourceType: Scalars["String"]["output"];
  wallet: ApiLoyaltyMonetaryWallet;
};

export enum LoyaltyMonetaryTransactionKind {
  Activate = "ACTIVATE",
  AdjustCredit = "ADJUST_CREDIT",
  AdjustDebit = "ADJUST_DEBIT",
  DebtRecovery = "DEBT_RECOVERY",
  EarnPending = "EARN_PENDING",
  Expire = "EXPIRE",
  MergeTransfer = "MERGE_TRANSFER",
  Release = "RELEASE",
  Reserve = "RESERVE",
  RestoreSpend = "RESTORE_SPEND",
  ReverseEarn = "REVERSE_EARN",
  Spend = "SPEND",
}

export type ApiLoyaltyMonetaryWallet = ApiNode & {
  __typename?: "LoyaltyMonetaryWallet";
  account: ApiLoyaltyAccount;
  balance: ApiLoyaltyMonetaryWalletBalance;
  closedAt?: Maybe<Scalars["DateTime"]["output"]>;
  creditLots: Array<ApiLoyaltyMonetaryCreditLot>;
  currencyCode: CurrencyCode;
  id: Scalars["ID"]["output"];
  mergedIntoWallet?: Maybe<ApiLoyaltyMonetaryWallet>;
  openedAt: Scalars["DateTime"]["output"];
  program: ApiLoyaltyProgram;
  revision: Scalars["Int"]["output"];
  status: LoyaltyMonetaryWalletStatus;
  transactions: Array<ApiLoyaltyMonetaryTransaction>;
  updatedAt: Scalars["DateTime"]["output"];
  walletType: LoyaltyMonetaryWalletType;
};

export type ApiLoyaltyMonetaryWalletTransactionsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyMonetaryWalletAdjustInput = {
  amountMinor: Scalars["BigInt"]["input"];
  direction: LoyaltyMonetaryAdjustmentDirection;
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  occurredAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  reasonCode: Scalars["String"]["input"];
  walletId: Scalars["ID"]["input"];
};

export type ApiLoyaltyMonetaryWalletBalance = {
  __typename?: "LoyaltyMonetaryWalletBalance";
  available: ApiLoyaltyMoney;
  debt: ApiLoyaltyMoney;
  lastTransaction?: Maybe<ApiLoyaltyMonetaryTransaction>;
  pending: ApiLoyaltyMoney;
  reserved: ApiLoyaltyMoney;
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyMonetaryWalletBalanceRebuildInput = {
  idempotencyKey: Scalars["String"]["input"];
  walletId: Scalars["ID"]["input"];
};

export type ApiLoyaltyMonetaryWalletOperationPayload = {
  __typename?: "LoyaltyMonetaryWalletOperationPayload";
  monetaryWallet?: Maybe<ApiLoyaltyMonetaryWallet>;
  transaction?: Maybe<ApiLoyaltyMonetaryTransaction>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyMonetaryWalletPayload = {
  __typename?: "LoyaltyMonetaryWalletPayload";
  monetaryWallet?: Maybe<ApiLoyaltyMonetaryWallet>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyMonetaryWalletStatus {
  Active = "ACTIVE",
  Closed = "CLOSED",
  Merged = "MERGED",
  Suspended = "SUSPENDED",
}

export type ApiLoyaltyMonetaryWalletStatusUpdateInput = {
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  reasonCode: Scalars["String"]["input"];
  status: LoyaltyMonetaryWalletStatus;
  walletId: Scalars["ID"]["input"];
};

export enum LoyaltyMonetaryWalletType {
  Cashback = "CASHBACK",
  StoreCredit = "STORE_CREDIT",
}

export type ApiLoyaltyMonetaryWalletWhereInput = {
  accountIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  currencyCodes?: InputMaybe<Array<CurrencyCode>>;
  statuses?: InputMaybe<Array<LoyaltyMonetaryWalletStatus>>;
  walletTypes?: InputMaybe<Array<LoyaltyMonetaryWalletType>>;
};

export type ApiLoyaltyMoney = {
  __typename?: "LoyaltyMoney";
  amountMinor: Scalars["BigInt"]["output"];
  currencyCode: CurrencyCode;
};

export type ApiLoyaltyMutation = {
  __typename?: "LoyaltyMutation";
  accountBalanceRebuild: ApiLoyaltyAccountBalanceRebuildPayload;
  accountStatusUpdate: ApiLoyaltyAccountStatusUpdatePayload;
  earningRuleCreate: ApiLoyaltyEarningRulePayload;
  earningRuleDelete: ApiLoyaltyDeletePayload;
  earningRuleUpdate: ApiLoyaltyEarningRulePayload;
  maintenanceRun: ApiLoyaltyMaintenanceRunPayload;
  monetaryWalletAdjust: ApiLoyaltyMonetaryWalletOperationPayload;
  monetaryWalletBalanceRebuild: ApiLoyaltyMonetaryWalletPayload;
  monetaryWalletStatusUpdate: ApiLoyaltyMonetaryWalletPayload;
  pointsAdjust: ApiLoyaltyPointsAdjustPayload;
  pointsConvertToMonetary: ApiLoyaltyPointsConvertToMonetaryPayload;
  programCreate: ApiLoyaltyProgramCreatePayload;
  programUpdate: ApiLoyaltyProgramUpdatePayload;
  programVersionCreate: ApiLoyaltyProgramVersionCreatePayload;
  programVersionDelete: ApiLoyaltyProgramVersionDeletePayload;
  programVersionPublish: ApiLoyaltyProgramVersionPublishPayload;
  programVersionUpdate: ApiLoyaltyProgramVersionUpdatePayload;
  reservationRelease: ApiLoyaltyReservationReleasePayload;
  rewardDefinitionCreate: ApiLoyaltyRewardDefinitionPayload;
  rewardDefinitionDelete: ApiLoyaltyDeletePayload;
  rewardDefinitionUpdate: ApiLoyaltyRewardDefinitionPayload;
  rewardEntitlementIssue: ApiLoyaltyRewardEntitlementPayload;
  rewardEntitlementRelease: ApiLoyaltyRewardEntitlementPayload;
  rewardEntitlementRevoke: ApiLoyaltyRewardEntitlementPayload;
  tierCreate: ApiLoyaltyTierPayload;
  tierDelete: ApiLoyaltyDeletePayload;
  tierEvaluate: ApiLoyaltyTierEvaluatePayload;
  tierMembershipRevoke: ApiLoyaltyTierEvaluatePayload;
  tierPolicyDelete: ApiLoyaltyDeletePayload;
  tierPolicyUpsert: ApiLoyaltyTierPolicyPayload;
  tierRewardBenefitCreate: ApiLoyaltyTierRewardBenefitPayload;
  tierRewardBenefitDelete: ApiLoyaltyDeletePayload;
  tierUpdate: ApiLoyaltyTierPayload;
};

export type ApiLoyaltyMutationAccountBalanceRebuildArgs = {
  input: ApiLoyaltyAccountBalanceRebuildInput;
};

export type ApiLoyaltyMutationAccountStatusUpdateArgs = {
  input: ApiLoyaltyAccountStatusUpdateInput;
};

export type ApiLoyaltyMutationEarningRuleCreateArgs = {
  input: ApiLoyaltyEarningRuleCreateInput;
};

export type ApiLoyaltyMutationEarningRuleDeleteArgs = {
  input: ApiLoyaltyEarningRuleDeleteInput;
};

export type ApiLoyaltyMutationEarningRuleUpdateArgs = {
  input: ApiLoyaltyEarningRuleUpdateInput;
};

export type ApiLoyaltyMutationMaintenanceRunArgs = {
  input: ApiLoyaltyMaintenanceRunInput;
};

export type ApiLoyaltyMutationMonetaryWalletAdjustArgs = {
  input: ApiLoyaltyMonetaryWalletAdjustInput;
};

export type ApiLoyaltyMutationMonetaryWalletBalanceRebuildArgs = {
  input: ApiLoyaltyMonetaryWalletBalanceRebuildInput;
};

export type ApiLoyaltyMutationMonetaryWalletStatusUpdateArgs = {
  input: ApiLoyaltyMonetaryWalletStatusUpdateInput;
};

export type ApiLoyaltyMutationPointsAdjustArgs = {
  input: ApiLoyaltyPointsAdjustInput;
};

export type ApiLoyaltyMutationPointsConvertToMonetaryArgs = {
  input: ApiLoyaltyPointsConvertToMonetaryInput;
};

export type ApiLoyaltyMutationProgramCreateArgs = {
  input: ApiLoyaltyProgramCreateInput;
};

export type ApiLoyaltyMutationProgramUpdateArgs = {
  input: ApiLoyaltyProgramUpdateInput;
};

export type ApiLoyaltyMutationProgramVersionCreateArgs = {
  input: ApiLoyaltyProgramVersionCreateInput;
};

export type ApiLoyaltyMutationProgramVersionDeleteArgs = {
  input: ApiLoyaltyProgramVersionDeleteInput;
};

export type ApiLoyaltyMutationProgramVersionPublishArgs = {
  input: ApiLoyaltyProgramVersionPublishInput;
};

export type ApiLoyaltyMutationProgramVersionUpdateArgs = {
  input: ApiLoyaltyProgramVersionUpdateInput;
};

export type ApiLoyaltyMutationReservationReleaseArgs = {
  input: ApiLoyaltyReservationReleaseInput;
};

export type ApiLoyaltyMutationRewardDefinitionCreateArgs = {
  input: ApiLoyaltyRewardDefinitionCreateInput;
};

export type ApiLoyaltyMutationRewardDefinitionDeleteArgs = {
  input: ApiLoyaltyRewardDefinitionDeleteInput;
};

export type ApiLoyaltyMutationRewardDefinitionUpdateArgs = {
  input: ApiLoyaltyRewardDefinitionUpdateInput;
};

export type ApiLoyaltyMutationRewardEntitlementIssueArgs = {
  input: ApiLoyaltyRewardEntitlementIssueInput;
};

export type ApiLoyaltyMutationRewardEntitlementReleaseArgs = {
  input: ApiLoyaltyRewardEntitlementTransitionInput;
};

export type ApiLoyaltyMutationRewardEntitlementRevokeArgs = {
  input: ApiLoyaltyRewardEntitlementTransitionInput;
};

export type ApiLoyaltyMutationTierCreateArgs = {
  input: ApiLoyaltyTierCreateInput;
};

export type ApiLoyaltyMutationTierDeleteArgs = {
  input: ApiLoyaltyTierDeleteInput;
};

export type ApiLoyaltyMutationTierEvaluateArgs = {
  input: ApiLoyaltyTierEvaluateInput;
};

export type ApiLoyaltyMutationTierMembershipRevokeArgs = {
  input: ApiLoyaltyTierMembershipRevokeInput;
};

export type ApiLoyaltyMutationTierPolicyDeleteArgs = {
  input: ApiLoyaltyTierPolicyDeleteInput;
};

export type ApiLoyaltyMutationTierPolicyUpsertArgs = {
  input: ApiLoyaltyTierPolicyUpsertInput;
};

export type ApiLoyaltyMutationTierRewardBenefitCreateArgs = {
  input: ApiLoyaltyTierRewardBenefitCreateInput;
};

export type ApiLoyaltyMutationTierRewardBenefitDeleteArgs = {
  input: ApiLoyaltyTierRewardBenefitDeleteInput;
};

export type ApiLoyaltyMutationTierUpdateArgs = {
  input: ApiLoyaltyTierUpdateInput;
};

export type ApiLoyaltyPointLot = ApiNode & {
  __typename?: "LoyaltyPointLot";
  account: ApiLoyaltyAccount;
  activatedAt: Scalars["DateTime"]["output"];
  allocations: Array<ApiLoyaltyLotAllocation>;
  createdAt: Scalars["DateTime"]["output"];
  expiresAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  originEntry: ApiLoyaltyLedgerEntry;
  pointsIssued: Scalars["BigInt"]["output"];
  program: ApiLoyaltyProgram;
  remainingPoints: Scalars["BigInt"]["output"];
};

export type ApiLoyaltyPointsAdjustInput = {
  accountId: Scalars["ID"]["input"];
  description: Scalars["String"]["input"];
  direction: LoyaltyPointsAdjustmentDirection;
  expectedBalanceRevision: Scalars["Int"]["input"];
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  points: Scalars["BigInt"]["input"];
  reasonCode: Scalars["String"]["input"];
};

export type ApiLoyaltyPointsAdjustPayload = {
  __typename?: "LoyaltyPointsAdjustPayload";
  account?: Maybe<ApiLoyaltyAccount>;
  transaction?: Maybe<ApiLoyaltyTransaction>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyPointsAdjustmentDirection {
  Credit = "CREDIT",
  Debit = "DEBIT",
}

export type ApiLoyaltyPointsConvertToMonetaryInput = {
  accountId: Scalars["ID"]["input"];
  currencyCode: CurrencyCode;
  idempotencyKey: Scalars["String"]["input"];
  occurredAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  points: Scalars["BigInt"]["input"];
  programVersionId: Scalars["ID"]["input"];
  walletType: LoyaltyMonetaryWalletType;
};

export type ApiLoyaltyPointsConvertToMonetaryPayload = {
  __typename?: "LoyaltyPointsConvertToMonetaryPayload";
  account?: Maybe<ApiLoyaltyAccount>;
  amount?: Maybe<ApiLoyaltyMoney>;
  monetaryTransaction?: Maybe<ApiLoyaltyMonetaryTransaction>;
  monetaryWallet?: Maybe<ApiLoyaltyMonetaryWallet>;
  pointsTransaction?: Maybe<ApiLoyaltyTransaction>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgram = ApiNode & {
  __typename?: "LoyaltyProgram";
  activeVersion?: Maybe<ApiLoyaltyProgramVersion>;
  archivedAt?: Maybe<Scalars["DateTime"]["output"]>;
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  defaultCurrencyCode: CurrencyCode;
  id: Scalars["ID"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  metadata: Scalars["JSON"]["output"];
  name: Scalars["String"]["output"];
  revision: Scalars["Int"]["output"];
  status: LoyaltyProgramStatus;
  updatedAt: Scalars["DateTime"]["output"];
  versions: Array<ApiLoyaltyProgramVersion>;
};

export type ApiLoyaltyProgramConnection = {
  __typename?: "LoyaltyProgramConnection";
  edges: Array<ApiLoyaltyProgramEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiLoyaltyProgramCreateInput = {
  code: Scalars["String"]["input"];
  defaultCurrencyCode: CurrencyCode;
  idempotencyKey: Scalars["String"]["input"];
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  name: Scalars["String"]["input"];
};

export type ApiLoyaltyProgramCreatePayload = {
  __typename?: "LoyaltyProgramCreatePayload";
  program?: Maybe<ApiLoyaltyProgram>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgramEarningRules = {
  __typename?: "LoyaltyProgramEarningRules";
  eligibleSpendBasis: LoyaltyEligibleSpendBasis;
  excludedSelectors: Array<ApiLoyaltyCatalogSelector>;
  modifierStackingMode: LoyaltyModifierStackingMode;
  modifiers: Array<ApiLoyaltyEarningModifier>;
};

export type ApiLoyaltyProgramEarningRulesInput = {
  eligibleSpendBasis: LoyaltyEligibleSpendBasis;
  excludedSelectors: Array<ApiLoyaltyCatalogSelectorInput>;
  modifierStackingMode?: InputMaybe<LoyaltyModifierStackingMode>;
  modifiers: Array<ApiLoyaltyEarningModifierInput>;
};

export type ApiLoyaltyProgramEdge = {
  __typename?: "LoyaltyProgramEdge";
  cursor: Scalars["String"]["output"];
  node: ApiLoyaltyProgram;
};

export type ApiLoyaltyProgramEligibility = {
  __typename?: "LoyaltyProgramEligibility";
  channelCodes: Array<Scalars["String"]["output"]>;
  excludedSegmentIds: Array<Scalars["ID"]["output"]>;
  segmentIds: Array<Scalars["ID"]["output"]>;
  /** Present only for SEGMENTS eligibility. */
  segmentMatchMode?: Maybe<LoyaltySegmentMatchMode>;
  type: LoyaltyProgramEligibilityType;
};

export type ApiLoyaltyProgramEligibilityInput = {
  channelCodes: Array<Scalars["String"]["input"]>;
  excludedSegmentIds?: Array<Scalars["ID"]["input"]>;
  /** Must be empty for ALL and non-empty for SEGMENTS. */
  segmentIds?: Array<Scalars["ID"]["input"]>;
  /** Required for SEGMENTS and forbidden for ALL. */
  segmentMatchMode?: InputMaybe<LoyaltySegmentMatchMode>;
  type: LoyaltyProgramEligibilityType;
};

export enum LoyaltyProgramEligibilityType {
  All = "ALL",
  Segments = "SEGMENTS",
}

export type ApiLoyaltyProgramRules = {
  __typename?: "LoyaltyProgramRules";
  earning: ApiLoyaltyProgramEarningRules;
  eligibility: ApiLoyaltyProgramEligibility;
  schemaVersion: Scalars["Int"]["output"];
};

export type ApiLoyaltyProgramRulesInput = {
  earning: ApiLoyaltyProgramEarningRulesInput;
  eligibility: ApiLoyaltyProgramEligibilityInput;
  schemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
};

export enum LoyaltyProgramStatus {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
  Paused = "PAUSED",
}

export type ApiLoyaltyProgramUpdateInput = {
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  programId: Scalars["ID"]["input"];
  status?: InputMaybe<LoyaltyProgramStatus>;
};

export type ApiLoyaltyProgramUpdatePayload = {
  __typename?: "LoyaltyProgramUpdatePayload";
  program?: Maybe<ApiLoyaltyProgram>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgramVersion = ApiNode & {
  __typename?: "LoyaltyProgramVersion";
  activationDelaySeconds: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  createdById?: Maybe<Scalars["ID"]["output"]>;
  debtPolicy: LoyaltyDebtPolicy;
  earnAmountMinor: Scalars["BigInt"]["output"];
  earnPoints: Scalars["BigInt"]["output"];
  earningEnabled: Scalars["Boolean"]["output"];
  earningRules: Array<ApiLoyaltyEarningRule>;
  effectiveFrom?: Maybe<Scalars["DateTime"]["output"]>;
  effectiveTo?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  maximumOrderPercentageBps: Scalars["Int"]["output"];
  maximumRedeemPointsPerOrder?: Maybe<Scalars["BigInt"]["output"]>;
  minimumEligibleAmountMinor: Scalars["BigInt"]["output"];
  minimumRedeemPoints: Scalars["BigInt"]["output"];
  pointsExpiryDays?: Maybe<Scalars["Int"]["output"]>;
  program: ApiLoyaltyProgram;
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  publishedById?: Maybe<Scalars["ID"]["output"]>;
  redeemAmountMinor: Scalars["BigInt"]["output"];
  redeemPoints: Scalars["BigInt"]["output"];
  redemptionEnabled: Scalars["Boolean"]["output"];
  refundPolicy: LoyaltyRefundPolicy;
  restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicy;
  revision: Scalars["Int"]["output"];
  rewardDefinitions: Array<ApiLoyaltyRewardDefinition>;
  roundingMode: LoyaltyRoundingMode;
  rules: ApiLoyaltyProgramRules;
  rulesSchemaVersion: Scalars["Int"]["output"];
  status: LoyaltyProgramVersionStatus;
  tierPolicy?: Maybe<ApiLoyaltyTierPolicy>;
  tiers: Array<ApiLoyaltyTier>;
  version: Scalars["Int"]["output"];
};

export type ApiLoyaltyProgramVersionCreateInput = {
  activationDelaySeconds?: InputMaybe<Scalars["Int"]["input"]>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor: Scalars["BigInt"]["input"];
  earnPoints: Scalars["BigInt"]["input"];
  earningEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  earningRules?: Array<ApiLoyaltyEarningRuleInput>;
  effectiveFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  effectiveTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  expectedProgramRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  maximumOrderPercentageBps?: InputMaybe<Scalars["Int"]["input"]>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars["BigInt"]["input"]>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  minimumRedeemPoints?: InputMaybe<Scalars["BigInt"]["input"]>;
  pointsExpiryDays?: InputMaybe<Scalars["Int"]["input"]>;
  programId: Scalars["ID"]["input"];
  redeemAmountMinor: Scalars["BigInt"]["input"];
  redeemPoints: Scalars["BigInt"]["input"];
  redemptionEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  rewardDefinitions?: Array<ApiLoyaltyRewardDefinitionInput>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules: ApiLoyaltyProgramRulesInput;
  rulesSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  tierPolicy?: InputMaybe<ApiLoyaltyTierPolicyInput>;
  tiers?: InputMaybe<Array<ApiLoyaltyTierInput>>;
};

export type ApiLoyaltyProgramVersionCreatePayload = {
  __typename?: "LoyaltyProgramVersionCreatePayload";
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgramVersionDeleteInput = {
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  programVersionId: Scalars["ID"]["input"];
};

export type ApiLoyaltyProgramVersionDeletePayload = {
  __typename?: "LoyaltyProgramVersionDeletePayload";
  deletedProgramVersionId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgramVersionPublishInput = {
  effectiveFrom: Scalars["DateTime"]["input"];
  effectiveTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  programVersionId: Scalars["ID"]["input"];
};

export type ApiLoyaltyProgramVersionPublishPayload = {
  __typename?: "LoyaltyProgramVersionPublishPayload";
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyProgramVersionStatus {
  Active = "ACTIVE",
  Draft = "DRAFT",
  Retired = "RETIRED",
  Scheduled = "SCHEDULED",
}

export type ApiLoyaltyProgramVersionUpdateInput = {
  activationDelaySeconds?: InputMaybe<Scalars["Int"]["input"]>;
  clearEffectiveTo?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearMaximumRedeemPointsPerOrder?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearPointsExpiryDays?: InputMaybe<Scalars["Boolean"]["input"]>;
  debtPolicy?: InputMaybe<LoyaltyDebtPolicy>;
  earnAmountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  earnPoints?: InputMaybe<Scalars["BigInt"]["input"]>;
  earningEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  effectiveFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  effectiveTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  maximumOrderPercentageBps?: InputMaybe<Scalars["Int"]["input"]>;
  maximumRedeemPointsPerOrder?: InputMaybe<Scalars["BigInt"]["input"]>;
  minimumEligibleAmountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  minimumRedeemPoints?: InputMaybe<Scalars["BigInt"]["input"]>;
  pointsExpiryDays?: InputMaybe<Scalars["Int"]["input"]>;
  programVersionId: Scalars["ID"]["input"];
  redeemAmountMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  redeemPoints?: InputMaybe<Scalars["BigInt"]["input"]>;
  redemptionEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  refundPolicy?: InputMaybe<LoyaltyRefundPolicy>;
  restoredPointsExpiryPolicy?: InputMaybe<LoyaltyRestoredPointsExpiryPolicy>;
  roundingMode?: InputMaybe<LoyaltyRoundingMode>;
  rules?: InputMaybe<ApiLoyaltyProgramRulesInput>;
};

export type ApiLoyaltyProgramVersionUpdatePayload = {
  __typename?: "LoyaltyProgramVersionUpdatePayload";
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyProgramWhereInput = {
  ids?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  search?: InputMaybe<Scalars["String"]["input"]>;
  statuses?: InputMaybe<Array<LoyaltyProgramStatus>>;
};

export type ApiLoyaltyQuery = {
  __typename?: "LoyaltyQuery";
  account?: Maybe<ApiLoyaltyAccount>;
  accounts: ApiLoyaltyAccountConnection;
  customerAccount?: Maybe<ApiLoyaltyAccount>;
  earningRule?: Maybe<ApiLoyaltyEarningRule>;
  earningRuleUsages: Array<ApiLoyaltyEarningRuleUsage>;
  eventEvaluation?: Maybe<ApiLoyaltyEventEvaluation>;
  eventEvaluations: Array<ApiLoyaltyEventEvaluation>;
  eventFact?: Maybe<ApiLoyaltyEventFact>;
  eventFacts: Array<ApiLoyaltyEventFact>;
  monetaryTransaction?: Maybe<ApiLoyaltyMonetaryTransaction>;
  monetaryTransactions: Array<ApiLoyaltyMonetaryTransaction>;
  monetaryWallet?: Maybe<ApiLoyaltyMonetaryWallet>;
  monetaryWallets: Array<ApiLoyaltyMonetaryWallet>;
  node?: Maybe<ApiNode>;
  nodes: Array<Maybe<ApiNode>>;
  program?: Maybe<ApiLoyaltyProgram>;
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  programs: ApiLoyaltyProgramConnection;
  reservation?: Maybe<ApiLoyaltyReservation>;
  reservations: ApiLoyaltyReservationConnection;
  rewardDefinition?: Maybe<ApiLoyaltyRewardDefinition>;
  rewardEntitlement?: Maybe<ApiLoyaltyRewardEntitlement>;
  rewardEntitlements: Array<ApiLoyaltyRewardEntitlement>;
  tier?: Maybe<ApiLoyaltyTier>;
  tierMembership?: Maybe<ApiLoyaltyTierMembership>;
  tierMemberships: Array<ApiLoyaltyTierMembership>;
  tierPolicy?: Maybe<ApiLoyaltyTierPolicy>;
  transaction?: Maybe<ApiLoyaltyTransaction>;
  transactions: ApiLoyaltyTransactionConnection;
};

export type ApiLoyaltyQueryAccountArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryAccountsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyAccountWhereInput>;
};

export type ApiLoyaltyQueryCustomerAccountArgs = {
  customerId: Scalars["ID"]["input"];
  programId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiLoyaltyQueryEarningRuleArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryEarningRuleUsagesArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  where: ApiLoyaltyEarningRuleUsageWhereInput;
};

export type ApiLoyaltyQueryEventEvaluationArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryEventEvaluationsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  where: ApiLoyaltyEventEvaluationWhereInput;
};

export type ApiLoyaltyQueryEventFactArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryEventFactsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyEventFactWhereInput>;
};

export type ApiLoyaltyQueryMonetaryTransactionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryMonetaryTransactionsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  walletId: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryMonetaryWalletArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryMonetaryWalletsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  where: ApiLoyaltyMonetaryWalletWhereInput;
};

export type ApiLoyaltyQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiLoyaltyQueryProgramArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryProgramVersionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryProgramsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyProgramWhereInput>;
};

export type ApiLoyaltyQueryReservationArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryReservationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyReservationWhereInput>;
};

export type ApiLoyaltyQueryRewardDefinitionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryRewardEntitlementArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryRewardEntitlementsArgs = {
  first?: InputMaybe<Scalars["Int"]["input"]>;
  where: ApiLoyaltyRewardEntitlementWhereInput;
};

export type ApiLoyaltyQueryTierArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryTierMembershipArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryTierMembershipsArgs = {
  accountId: Scalars["ID"]["input"];
  first?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyQueryTierPolicyArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryTransactionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiLoyaltyQueryTransactionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<ApiLoyaltyTransactionWhereInput>;
};

export enum LoyaltyRefundPolicy {
  FullReversal = "FULL_REVERSAL",
  Proportional = "PROPORTIONAL",
}

export type ApiLoyaltyReservation = ApiNode & {
  __typename?: "LoyaltyReservation";
  account: ApiLoyaltyAccount;
  checkoutId: Scalars["ID"]["output"];
  checkoutVersion: Scalars["Int"]["output"];
  committedAt?: Maybe<Scalars["DateTime"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  discount: ApiLoyaltyMoney;
  events: Array<ApiLoyaltyReservationEvent>;
  expiredAt?: Maybe<Scalars["DateTime"]["output"]>;
  expiresAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  orderId?: Maybe<Scalars["ID"]["output"]>;
  orderRevision?: Maybe<Scalars["Int"]["output"]>;
  points: Scalars["BigInt"]["output"];
  program: ApiLoyaltyProgram;
  programVersion: ApiLoyaltyProgramVersion;
  quoteId: Scalars["ID"]["output"];
  quoteRevision: Scalars["String"]["output"];
  releasedAt?: Maybe<Scalars["DateTime"]["output"]>;
  requestHash: Scalars["String"]["output"];
  reversedAt?: Maybe<Scalars["DateTime"]["output"]>;
  revision: Scalars["Int"]["output"];
  status: LoyaltyReservationStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyReservationConnection = {
  __typename?: "LoyaltyReservationConnection";
  edges: Array<ApiLoyaltyReservationEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiLoyaltyReservationEdge = {
  __typename?: "LoyaltyReservationEdge";
  cursor: Scalars["String"]["output"];
  node: ApiLoyaltyReservation;
};

export type ApiLoyaltyReservationEvent = ApiNode & {
  __typename?: "LoyaltyReservationEvent";
  actorId?: Maybe<Scalars["ID"]["output"]>;
  actorType: LoyaltyActorType;
  createdAt: Scalars["DateTime"]["output"];
  eventId?: Maybe<Scalars["String"]["output"]>;
  eventType: LoyaltyReservationEventType;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  previousStatus?: Maybe<LoyaltyReservationStatus>;
  reasonCode: Scalars["String"]["output"];
  reservation: ApiLoyaltyReservation;
  status: LoyaltyReservationStatus;
  transaction: ApiLoyaltyTransaction;
};

export enum LoyaltyReservationEventType {
  Committed = "COMMITTED",
  Created = "CREATED",
  Expired = "EXPIRED",
  Released = "RELEASED",
  Reversed = "REVERSED",
}

export type ApiLoyaltyReservationReleaseInput = {
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  reasonCode: Scalars["String"]["input"];
  reservationId: Scalars["ID"]["input"];
};

export type ApiLoyaltyReservationReleasePayload = {
  __typename?: "LoyaltyReservationReleasePayload";
  reservation?: Maybe<ApiLoyaltyReservation>;
  transaction?: Maybe<ApiLoyaltyTransaction>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyReservationStatus {
  Active = "ACTIVE",
  Committed = "COMMITTED",
  Expired = "EXPIRED",
  Released = "RELEASED",
  Reversed = "REVERSED",
}

export type ApiLoyaltyReservationWhereInput = {
  accountIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  checkoutId?: InputMaybe<Scalars["ID"]["input"]>;
  createdFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  createdTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  expiresBefore?: InputMaybe<Scalars["DateTime"]["input"]>;
  ids?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  orderId?: InputMaybe<Scalars["ID"]["input"]>;
  programIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  statuses?: InputMaybe<Array<LoyaltyReservationStatus>>;
};

export enum LoyaltyRestoredPointsExpiryPolicy {
  OriginalExpiry = "ORIGINAL_EXPIRY",
  ResetFromRestore = "RESET_FROM_RESTORE",
}

export type ApiLoyaltyRewardDefinition = ApiNode & {
  __typename?: "LoyaltyRewardDefinition";
  code: Scalars["String"]["output"];
  configuration: Scalars["JSON"]["output"];
  configurationSchemaVersion: Scalars["Int"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  endsAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  issuanceLimit?: Maybe<Scalars["BigInt"]["output"]>;
  issuedQuantity: Scalars["BigInt"]["output"];
  name: Scalars["String"]["output"];
  perAccountLimit?: Maybe<Scalars["BigInt"]["output"]>;
  programVersion: ApiLoyaltyProgramVersion;
  rewardType: LoyaltyRewardType;
  startsAt?: Maybe<Scalars["DateTime"]["output"]>;
  validityDays?: Maybe<Scalars["Int"]["output"]>;
};

export type ApiLoyaltyRewardDefinitionCreateInput = {
  code: Scalars["String"]["input"];
  configuration: Scalars["JSON"]["input"];
  configurationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  endsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  issuanceLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  name: Scalars["String"]["input"];
  perAccountLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  programVersionId: Scalars["ID"]["input"];
  rewardType: LoyaltyRewardType;
  startsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  validityDays?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyRewardDefinitionDeleteInput = {
  idempotencyKey: Scalars["String"]["input"];
  rewardDefinitionId: Scalars["ID"]["input"];
};

export type ApiLoyaltyRewardDefinitionInput = {
  code: Scalars["String"]["input"];
  configuration: Scalars["JSON"]["input"];
  configurationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  endsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  issuanceLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  name: Scalars["String"]["input"];
  perAccountLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  rewardType: LoyaltyRewardType;
  startsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  validityDays?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyRewardDefinitionPayload = {
  __typename?: "LoyaltyRewardDefinitionPayload";
  rewardDefinition?: Maybe<ApiLoyaltyRewardDefinition>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyRewardDefinitionUpdateInput = {
  clearEndsAt?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearIssuanceLimit?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearPerAccountLimit?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearStartsAt?: InputMaybe<Scalars["Boolean"]["input"]>;
  clearValidityDays?: InputMaybe<Scalars["Boolean"]["input"]>;
  configuration?: InputMaybe<Scalars["JSON"]["input"]>;
  configurationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  endsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  issuanceLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  perAccountLimit?: InputMaybe<Scalars["BigInt"]["input"]>;
  rewardDefinitionId: Scalars["ID"]["input"];
  rewardType?: InputMaybe<LoyaltyRewardType>;
  startsAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  validityDays?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiLoyaltyRewardEntitlement = ApiNode & {
  __typename?: "LoyaltyRewardEntitlement";
  account: ApiLoyaltyAccount;
  configurationSchemaVersion: Scalars["Int"]["output"];
  configurationSnapshot: Scalars["JSON"]["output"];
  definition: ApiLoyaltyRewardDefinition;
  events: Array<ApiLoyaltyRewardEntitlementEvent>;
  expiredAt?: Maybe<Scalars["DateTime"]["output"]>;
  externalReference?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  issuanceTransaction?: Maybe<ApiLoyaltyTransaction>;
  issuedAt: Scalars["DateTime"]["output"];
  monetaryTransaction?: Maybe<ApiLoyaltyMonetaryTransaction>;
  quantity: Scalars["BigInt"]["output"];
  redeemedAt?: Maybe<Scalars["DateTime"]["output"]>;
  redeemedOrderId?: Maybe<Scalars["ID"]["output"]>;
  reservedAt?: Maybe<Scalars["DateTime"]["output"]>;
  reservedForCheckoutId?: Maybe<Scalars["ID"]["output"]>;
  revision: Scalars["Int"]["output"];
  revokedAt?: Maybe<Scalars["DateTime"]["output"]>;
  sourceEventFact?: Maybe<ApiLoyaltyEventFact>;
  status: LoyaltyRewardEntitlementStatus;
  updatedAt: Scalars["DateTime"]["output"];
  validFrom: Scalars["DateTime"]["output"];
  validTo?: Maybe<Scalars["DateTime"]["output"]>;
};

export type ApiLoyaltyRewardEntitlementEvent = ApiNode & {
  __typename?: "LoyaltyRewardEntitlementEvent";
  actorId?: Maybe<Scalars["ID"]["output"]>;
  actorType: LoyaltyActorType;
  createdAt: Scalars["DateTime"]["output"];
  entitlement: ApiLoyaltyRewardEntitlement;
  eventType: LoyaltyRewardEntitlementEventType;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  previousStatus?: Maybe<LoyaltyRewardEntitlementStatus>;
  reasonCode: Scalars["String"]["output"];
  status: LoyaltyRewardEntitlementStatus;
};

export enum LoyaltyRewardEntitlementEventType {
  Expired = "EXPIRED",
  Issued = "ISSUED",
  Redeemed = "REDEEMED",
  Released = "RELEASED",
  Reserved = "RESERVED",
  Revoked = "REVOKED",
}

export type ApiLoyaltyRewardEntitlementIssueInput = {
  accountId: Scalars["ID"]["input"];
  externalReference?: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  occurredAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  quantity?: InputMaybe<Scalars["BigInt"]["input"]>;
  rewardDefinitionId: Scalars["ID"]["input"];
};

export type ApiLoyaltyRewardEntitlementPayload = {
  __typename?: "LoyaltyRewardEntitlementPayload";
  rewardEntitlement?: Maybe<ApiLoyaltyRewardEntitlement>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyRewardEntitlementStatus {
  Expired = "EXPIRED",
  Issued = "ISSUED",
  Redeemed = "REDEEMED",
  Reserved = "RESERVED",
  Revoked = "REVOKED",
}

export type ApiLoyaltyRewardEntitlementTransitionInput = {
  entitlementId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  occurredAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  reasonCode: Scalars["String"]["input"];
};

export type ApiLoyaltyRewardEntitlementWhereInput = {
  accountIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  rewardDefinitionIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  statuses?: InputMaybe<Array<LoyaltyRewardEntitlementStatus>>;
  validAt?: InputMaybe<Scalars["DateTime"]["input"]>;
};

export enum LoyaltyRewardType {
  FixedDiscount = "FIXED_DISCOUNT",
  FreeProduct = "FREE_PRODUCT",
  FreeShipping = "FREE_SHIPPING",
  MemberBenefit = "MEMBER_BENEFIT",
  MonetaryCredit = "MONETARY_CREDIT",
  PercentageDiscount = "PERCENTAGE_DISCOUNT",
  Points = "POINTS",
  Voucher = "VOUCHER",
}

export enum LoyaltyRoundingMode {
  Down = "DOWN",
  Nearest = "NEAREST",
  Up = "UP",
}

export enum LoyaltySegmentMatchMode {
  All = "ALL",
  Any = "ANY",
}

export type ApiLoyaltyTier = ApiNode & {
  __typename?: "LoyaltyTier";
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  maintenance?: Maybe<Scalars["JSON"]["output"]>;
  name: Scalars["String"]["output"];
  programVersion: ApiLoyaltyProgramVersion;
  qualification: Scalars["JSON"]["output"];
  qualificationSchemaVersion: Scalars["Int"]["output"];
  rank: Scalars["Int"]["output"];
  rewardBenefits: Array<ApiLoyaltyTierRewardBenefit>;
};

export enum LoyaltyTierCalendarPeriod {
  Month = "MONTH",
  ProgramYear = "PROGRAM_YEAR",
  Quarter = "QUARTER",
  Year = "YEAR",
}

export type ApiLoyaltyTierCreateInput = {
  code: Scalars["String"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  maintenance?: InputMaybe<Scalars["JSON"]["input"]>;
  name: Scalars["String"]["input"];
  programVersionId: Scalars["ID"]["input"];
  qualification: Scalars["JSON"]["input"];
  qualificationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  rank: Scalars["Int"]["input"];
};

export type ApiLoyaltyTierDeleteInput = {
  idempotencyKey: Scalars["String"]["input"];
  tierId: Scalars["ID"]["input"];
};

export enum LoyaltyTierDowngradePolicy {
  EndOfMembership = "END_OF_MEMBERSHIP",
  GracePeriod = "GRACE_PERIOD",
  Immediate = "IMMEDIATE",
}

export type ApiLoyaltyTierEvaluateInput = {
  accountId: Scalars["ID"]["input"];
  effectiveAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  forceRequalification?: InputMaybe<Scalars["Boolean"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  programVersionId?: InputMaybe<Scalars["ID"]["input"]>;
  reasonCode: Scalars["String"]["input"];
};

export type ApiLoyaltyTierEvaluatePayload = {
  __typename?: "LoyaltyTierEvaluatePayload";
  tierMembership?: Maybe<ApiLoyaltyTierMembership>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export enum LoyaltyTierEvaluationWindowType {
  Calendar = "CALENDAR",
  Lifetime = "LIFETIME",
  Rolling = "ROLLING",
}

export type ApiLoyaltyTierInput = {
  code: Scalars["String"]["input"];
  maintenance?: InputMaybe<Scalars["JSON"]["input"]>;
  name: Scalars["String"]["input"];
  qualification: Scalars["JSON"]["input"];
  qualificationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  rank: Scalars["Int"]["input"];
};

export type ApiLoyaltyTierMembership = ApiNode & {
  __typename?: "LoyaltyTierMembership";
  account: ApiLoyaltyAccount;
  createdAt: Scalars["DateTime"]["output"];
  effectiveFrom: Scalars["DateTime"]["output"];
  effectiveTo?: Maybe<Scalars["DateTime"]["output"]>;
  evaluationPeriodEndedAt: Scalars["DateTime"]["output"];
  evaluationPeriodStartedAt: Scalars["DateTime"]["output"];
  events: Array<ApiLoyaltyTierMembershipEvent>;
  id: Scalars["ID"]["output"];
  qualifiedAt: Scalars["DateTime"]["output"];
  revision: Scalars["Int"]["output"];
  status: LoyaltyTierMembershipStatus;
  tier: ApiLoyaltyTier;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiLoyaltyTierMembershipEvent = ApiNode & {
  __typename?: "LoyaltyTierMembershipEvent";
  account: ApiLoyaltyAccount;
  createdAt: Scalars["DateTime"]["output"];
  evaluationRevision: Scalars["String"]["output"];
  eventType: LoyaltyTierMembershipEventType;
  id: Scalars["ID"]["output"];
  membership: ApiLoyaltyTierMembership;
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  previousTier?: Maybe<ApiLoyaltyTier>;
  reasonCode: Scalars["String"]["output"];
  tier: ApiLoyaltyTier;
};

export enum LoyaltyTierMembershipEventType {
  Downgraded = "DOWNGRADED",
  Expired = "EXPIRED",
  Qualified = "QUALIFIED",
  Renewed = "RENEWED",
  Revoked = "REVOKED",
  Upgraded = "UPGRADED",
}

export type ApiLoyaltyTierMembershipRevokeInput = {
  effectiveAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  expectedRevision: Scalars["Int"]["input"];
  idempotencyKey: Scalars["String"]["input"];
  membershipId: Scalars["ID"]["input"];
  reasonCode: Scalars["String"]["input"];
};

export enum LoyaltyTierMembershipStatus {
  Active = "ACTIVE",
  Expired = "EXPIRED",
  Revoked = "REVOKED",
}

export type ApiLoyaltyTierPayload = {
  __typename?: "LoyaltyTierPayload";
  tier?: Maybe<ApiLoyaltyTier>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyTierPolicy = ApiNode & {
  __typename?: "LoyaltyTierPolicy";
  calendarPeriod?: Maybe<LoyaltyTierCalendarPeriod>;
  createdAt: Scalars["DateTime"]["output"];
  downgradePolicy: LoyaltyTierDowngradePolicy;
  gracePeriodDays: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  membershipDurationDays?: Maybe<Scalars["Int"]["output"]>;
  metricSchemaVersion: Scalars["Int"]["output"];
  programVersion: ApiLoyaltyProgramVersion;
  programYearStartsMonth?: Maybe<Scalars["Int"]["output"]>;
  requalificationPolicy: LoyaltyTierRequalificationPolicy;
  rollingWindowDays?: Maybe<Scalars["Int"]["output"]>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export type ApiLoyaltyTierPolicyDeleteInput = {
  idempotencyKey: Scalars["String"]["input"];
  programVersionId: Scalars["ID"]["input"];
};

export type ApiLoyaltyTierPolicyInput = {
  calendarPeriod?: InputMaybe<LoyaltyTierCalendarPeriod>;
  downgradePolicy?: InputMaybe<LoyaltyTierDowngradePolicy>;
  gracePeriodDays?: InputMaybe<Scalars["Int"]["input"]>;
  membershipDurationDays?: InputMaybe<Scalars["Int"]["input"]>;
  metricSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  programYearStartsMonth?: InputMaybe<Scalars["Int"]["input"]>;
  requalificationPolicy?: InputMaybe<LoyaltyTierRequalificationPolicy>;
  rollingWindowDays?: InputMaybe<Scalars["Int"]["input"]>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export type ApiLoyaltyTierPolicyPayload = {
  __typename?: "LoyaltyTierPolicyPayload";
  tierPolicy?: Maybe<ApiLoyaltyTierPolicy>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyTierPolicyUpsertInput = {
  calendarPeriod?: InputMaybe<LoyaltyTierCalendarPeriod>;
  downgradePolicy?: InputMaybe<LoyaltyTierDowngradePolicy>;
  gracePeriodDays?: InputMaybe<Scalars["Int"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  membershipDurationDays?: InputMaybe<Scalars["Int"]["input"]>;
  metricSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  programVersionId: Scalars["ID"]["input"];
  programYearStartsMonth?: InputMaybe<Scalars["Int"]["input"]>;
  requalificationPolicy?: InputMaybe<LoyaltyTierRequalificationPolicy>;
  rollingWindowDays?: InputMaybe<Scalars["Int"]["input"]>;
  windowType: LoyaltyTierEvaluationWindowType;
};

export enum LoyaltyTierRequalificationPolicy {
  Automatic = "AUTOMATIC",
  Manual = "MANUAL",
}

export type ApiLoyaltyTierRewardBenefit = ApiNode & {
  __typename?: "LoyaltyTierRewardBenefit";
  createdAt: Scalars["DateTime"]["output"];
  grantPolicy: Scalars["JSON"]["output"];
  grantPolicySchemaVersion: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  rewardDefinition: ApiLoyaltyRewardDefinition;
  tier: ApiLoyaltyTier;
};

export type ApiLoyaltyTierRewardBenefitCreateInput = {
  grantPolicy?: Scalars["JSON"]["input"];
  grantPolicySchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  rewardDefinitionId: Scalars["ID"]["input"];
  tierId: Scalars["ID"]["input"];
};

export type ApiLoyaltyTierRewardBenefitDeleteInput = {
  idempotencyKey: Scalars["String"]["input"];
  tierRewardBenefitId: Scalars["ID"]["input"];
};

export type ApiLoyaltyTierRewardBenefitPayload = {
  __typename?: "LoyaltyTierRewardBenefitPayload";
  tierRewardBenefit?: Maybe<ApiLoyaltyTierRewardBenefit>;
  userErrors: Array<ApiLoyaltyUserError>;
};

export type ApiLoyaltyTierUpdateInput = {
  clearMaintenance?: InputMaybe<Scalars["Boolean"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  maintenance?: InputMaybe<Scalars["JSON"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  qualification?: InputMaybe<Scalars["JSON"]["input"]>;
  qualificationSchemaVersion?: InputMaybe<Scalars["Int"]["input"]>;
  rank?: InputMaybe<Scalars["Int"]["input"]>;
  tierId: Scalars["ID"]["input"];
};

export type ApiLoyaltyTransaction = ApiNode & {
  __typename?: "LoyaltyTransaction";
  account: ApiLoyaltyAccount;
  actorId?: Maybe<Scalars["ID"]["output"]>;
  actorType: LoyaltyActorType;
  causationId?: Maybe<Scalars["String"]["output"]>;
  correlationId?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  effectiveAt: Scalars["DateTime"]["output"];
  entries: Array<ApiLoyaltyLedgerEntry>;
  eventId?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  idempotencyKey: Scalars["String"]["output"];
  kind: LoyaltyTransactionKind;
  lotAllocations: Array<ApiLoyaltyLotAllocation>;
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  program: ApiLoyaltyProgram;
  programVersion?: Maybe<ApiLoyaltyProgramVersion>;
  reasonCode: Scalars["String"]["output"];
  requestHash: Scalars["String"]["output"];
  source: LoyaltyTransactionSource;
  sourceId?: Maybe<Scalars["String"]["output"]>;
  sourceRevision?: Maybe<Scalars["String"]["output"]>;
  workflowId?: Maybe<Scalars["String"]["output"]>;
};

export type ApiLoyaltyTransactionConnection = {
  __typename?: "LoyaltyTransactionConnection";
  edges: Array<ApiLoyaltyTransactionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiLoyaltyTransactionEdge = {
  __typename?: "LoyaltyTransactionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiLoyaltyTransaction;
};

export enum LoyaltyTransactionKind {
  Activate = "ACTIVATE",
  AdjustCredit = "ADJUST_CREDIT",
  AdjustDebit = "ADJUST_DEBIT",
  DebtRecovery = "DEBT_RECOVERY",
  EarnPending = "EARN_PENDING",
  Expire = "EXPIRE",
  MergeTransfer = "MERGE_TRANSFER",
  Redeem = "REDEEM",
  Release = "RELEASE",
  Reserve = "RESERVE",
  RestoreRedeem = "RESTORE_REDEEM",
  ReverseEarn = "REVERSE_EARN",
}

export enum LoyaltyTransactionSource {
  Admin = "ADMIN",
  Checkout = "CHECKOUT",
  Expiration = "EXPIRATION",
  Import = "IMPORT",
  Merge = "MERGE",
  Order = "ORDER",
  Refund = "REFUND",
  System = "SYSTEM",
}

export type ApiLoyaltyTransactionWhereInput = {
  accountIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  checkoutId?: InputMaybe<Scalars["ID"]["input"]>;
  ids?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  kinds?: InputMaybe<Array<LoyaltyTransactionKind>>;
  occurredFrom?: InputMaybe<Scalars["DateTime"]["input"]>;
  occurredTo?: InputMaybe<Scalars["DateTime"]["input"]>;
  orderId?: InputMaybe<Scalars["ID"]["input"]>;
  programIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  sourceId?: InputMaybe<Scalars["String"]["input"]>;
  sources?: InputMaybe<Array<LoyaltyTransactionSource>>;
};

export type ApiLoyaltyUserError = ApiUserError & {
  __typename?: "LoyaltyUserError";
  code?: Maybe<Scalars["String"]["output"]>;
  field?: Maybe<Array<Scalars["String"]["output"]>>;
  message: Scalars["String"]["output"];
  retryable: Scalars["Boolean"]["output"];
};

/** Image/video dimensions. */
export type ApiMediaDimensions = {
  __typename?: "MediaDimensions";
  /** Height in pixels. */
  height: Scalars["Int"]["output"];
  /** Width in pixels. */
  width: Scalars["Int"]["output"];
};

export type ApiMediaMutation = {
  __typename?: "MediaMutation";
  /**
   * Upload avatar or logo for an entity (user profile or organization).
   * The file is stored in the entity's asset group.
   */
  avatarUpload: ApiAvatarUploadPayload;
  bucketCreate: ApiBucketCreatePayload;
  cdnConfigurationCreate: ApiCdnConfigurationPayload;
  cdnConfigurationDelete: ApiCdnConfigurationDeletePayload;
  cdnConfigurationSetDefault: ApiCdnConfigurationPayload;
  cdnConfigurationTest: ApiCdnConfigurationTestPayload;
  cdnConfigurationUpdate: ApiCdnConfigurationPayload;
  cdnRoutingRuleCreate: ApiCdnRoutingRulePayload;
  cdnRoutingRuleDelete: ApiCdnRoutingRuleDeletePayload;
  cdnRoutingRuleUpdate: ApiCdnRoutingRulePayload;
  /** Clear the deletion error for one file by ID. */
  fileClearError: ApiFileClearErrorPayload;
  fileCreateExternal: ApiFileCreateExternalPayload;
  fileDelete: ApiFileDeletePayload;
  /** Delete multiple files by ID. */
  fileDeleteMany: ApiFileDeleteManyPayload;
  /** Restore a single deleted file by ID. */
  fileRestore: ApiFileRestorePayload;
  /** Restore multiple deleted files by ID. */
  fileRestoreMany: ApiFileRestoreManyPayload;
  fileUpdate: ApiFileUpdatePayload;
  fileUpload: ApiFileUploadPayload;
  fileUploadFromUrl: ApiFileUploadPayload;
  mediaSourceCreate: ApiMediaSourcePayload;
  mediaSourceDelete: ApiMediaSourceDeletePayload;
  mediaSourceUpdate: ApiMediaSourcePayload;
};

export type ApiMediaMutationAvatarUploadArgs = {
  input: ApiAvatarUploadInput;
};

export type ApiMediaMutationBucketCreateArgs = {
  input: ApiBucketCreateInput;
};

export type ApiMediaMutationCdnConfigurationCreateArgs = {
  input: ApiCdnConfigurationCreateInput;
};

export type ApiMediaMutationCdnConfigurationDeleteArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiMediaMutationCdnConfigurationSetDefaultArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiMediaMutationCdnConfigurationTestArgs = {
  input: ApiCdnConfigurationTestInput;
};

export type ApiMediaMutationCdnConfigurationUpdateArgs = {
  input: ApiCdnConfigurationUpdateInput;
};

export type ApiMediaMutationCdnRoutingRuleCreateArgs = {
  input: ApiCdnRoutingRuleCreateInput;
};

export type ApiMediaMutationCdnRoutingRuleDeleteArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiMediaMutationCdnRoutingRuleUpdateArgs = {
  input: ApiCdnRoutingRuleUpdateInput;
};

export type ApiMediaMutationFileClearErrorArgs = {
  input: ApiFileClearErrorInput;
};

export type ApiMediaMutationFileCreateExternalArgs = {
  input: ApiFileCreateExternalInput;
};

export type ApiMediaMutationFileDeleteArgs = {
  input: ApiFileDeleteInput;
};

export type ApiMediaMutationFileDeleteManyArgs = {
  input: ApiFileDeleteManyInput;
};

export type ApiMediaMutationFileRestoreArgs = {
  input: ApiFileRestoreInput;
};

export type ApiMediaMutationFileRestoreManyArgs = {
  input: ApiFileRestoreManyInput;
};

export type ApiMediaMutationFileUpdateArgs = {
  input: ApiFileUpdateInput;
};

export type ApiMediaMutationFileUploadArgs = {
  input: ApiFileUploadMultipartInput;
};

export type ApiMediaMutationFileUploadFromUrlArgs = {
  input: ApiFileUploadFromUrlInput;
};

export type ApiMediaMutationMediaSourceCreateArgs = {
  input: ApiMediaSourceCreateInput;
};

export type ApiMediaMutationMediaSourceDeleteArgs = {
  input: ApiMediaSourceDeleteInput;
};

export type ApiMediaMutationMediaSourceUpdateArgs = {
  input: ApiMediaSourceUpdateInput;
};

export enum MediaProcessingStatus {
  Failed = "FAILED",
  Pending = "PENDING",
  Processing = "PROCESSING",
  Ready = "READY",
}

export type ApiMediaQuery = {
  __typename?: "MediaQuery";
  /** Resolve and inspect the CDN route for a current-store file. */
  cdnDeliveryPreview: ApiCdnDeliveryPreview;
  /** Get a file by ID */
  file?: Maybe<ApiFile>;
  /**
   * Get files with Relay-style pagination.
   * Store context is determined from x-store-name header.
   */
  files: ApiFileConnection;
  /** Media delivery settings for the current store. */
  mediaSettings?: Maybe<ApiMediaSettings>;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
};

export type ApiMediaQueryCdnDeliveryPreviewArgs = {
  configurationId?: InputMaybe<Scalars["ID"]["input"]>;
  country?: InputMaybe<Scalars["String"]["input"]>;
  fileId: Scalars["ID"]["input"];
  transform?: InputMaybe<ApiImageTransformInput>;
};

export type ApiMediaQueryFileArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiMediaQueryFilesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiFileOrderByInput>>;
  state?: InputMaybe<FileStateScope>;
  where?: InputMaybe<ApiFileWhereInput>;
};

export type ApiMediaQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiMediaQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type ApiMediaSettings = {
  __typename?: "MediaSettings";
  assetGroupId: Scalars["ID"]["output"];
  cdnConfigurations: Array<ApiCdnConfiguration>;
  cdnRoutingRules: Array<ApiCdnRoutingRule>;
};

export type ApiMediaSource = {
  __typename?: "MediaSource";
  createdAt: Scalars["DateTime"]["output"];
  format: Scalars["String"]["output"];
  kind: Scalars["String"]["output"];
  sortOrder: Scalars["Int"]["output"];
  sourceFile: ApiFile;
};

export type ApiMediaSourceCreateInput = {
  format: Scalars["String"]["input"];
  kind: Scalars["String"]["input"];
  mediaFileId: Scalars["ID"]["input"];
  sortOrder?: InputMaybe<Scalars["Int"]["input"]>;
  sourceFileId: Scalars["ID"]["input"];
};

export type ApiMediaSourceDeleteInput = {
  mediaFileId: Scalars["ID"]["input"];
  sourceFileId: Scalars["ID"]["input"];
};

export type ApiMediaSourceDeletePayload = {
  __typename?: "MediaSourceDeletePayload";
  deletedSourceFileId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiMediaSourcePayload = {
  __typename?: "MediaSourcePayload";
  source?: Maybe<ApiMediaSource>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiMediaSourceUpdateInput = {
  format?: InputMaybe<Scalars["String"]["input"]>;
  kind?: InputMaybe<Scalars["String"]["input"]>;
  mediaFileId: Scalars["ID"]["input"];
  sortOrder?: InputMaybe<Scalars["Int"]["input"]>;
  sourceFileId: Scalars["ID"]["input"];
};

export enum MediaType {
  ExternalVideo = "EXTERNAL_VIDEO",
  GenericFile = "GENERIC_FILE",
  Image = "IMAGE",
  Model_3D = "MODEL_3D",
  Video = "VIDEO",
}

/**
 * Member with role assignment.
 * Used for both org-level (domain = "org") and store-level (domain = "store:uuid").
 */
export type ApiMember = {
  __typename?: "Member";
  /** When access was granted. */
  grantedAt: Scalars["DateTime"]["output"];
  /** User who granted access. */
  grantedBy?: Maybe<ApiUser>;
  /** Unique identifier. */
  id: Scalars["ID"]["output"];
  /**
   * Whether this member is the organization owner.
   * Owner bypasses all authorization checks within the organization.
   * Only applicable for org-level membership (domain = "org").
   */
  isOwner: Scalars["Boolean"]["output"];
  /** Role name. */
  role: Scalars["String"]["output"];
  /** User reference. */
  user: ApiUser;
};

/** Input for removing member's access. */
export type ApiMemberAccessRemoveInput = {
  /** Domain to remove access from. */
  domain: Scalars["String"]["input"];
  /** Organization ID where the member belongs. */
  organizationId: Scalars["ID"]["input"];
  /** User ID. */
  userId: Scalars["ID"]["input"];
};

export type ApiMemberAccessRemovePayload = {
  __typename?: "MemberAccessRemovePayload";
  success: Scalars["Boolean"]["output"];
  userErrors: Array<ApiGenericUserError>;
};

/** Input for inviting a member to organization. */
export type ApiMemberInviteInput = {
  /** Email address of the user to invite. */
  email: Scalars["Email"]["input"];
  /** Organization ID to invite the member to. */
  organizationId: Scalars["ID"]["input"];
  /** Role assignments (at least one required). */
  roles: Array<ApiRoleAssignment>;
};

export type ApiMemberInvitePayload = {
  __typename?: "MemberInvitePayload";
  member?: Maybe<ApiMember>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for removing a member from organization. */
export type ApiMemberRemoveInput = {
  /** Organization ID. */
  organizationId: Scalars["ID"]["input"];
  /** User ID of the member to remove. */
  userId: Scalars["ID"]["input"];
};

export type ApiMemberRemovePayload = {
  __typename?: "MemberRemovePayload";
  removedMemberId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for changing member's role. */
export type ApiMemberRoleChangeInput = {
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars["String"]["input"];
  /** Organization ID where the member belongs. */
  organizationId: Scalars["ID"]["input"];
  /** New role name. */
  role: Scalars["String"]["input"];
  /** User ID. */
  userId: Scalars["ID"]["input"];
};

export type ApiMemberRoleChangePayload = {
  __typename?: "MemberRoleChangePayload";
  member?: Maybe<ApiMember>;
  userErrors: Array<ApiGenericUserError>;
};

/**
 * Membership — universal container for members and roles.
 * Used for both Organization and Store.
 * Domain determines context: orgId for org-level, storeId for store-level.
 */
export type ApiMembership = {
  __typename?: "Membership";
  /** Available resources for role editor (org-level only). */
  availableResources?: Maybe<Array<ApiResourceDefinition>>;
  /** Domain identifier ("org" for organization, or "store:uuid"). */
  domain: Scalars["String"]["output"];
  /** All members with access to this domain. */
  members: Array<ApiMember>;
  /** Organization ID (required for casbin queries). */
  organizationId: Scalars["ID"]["output"];
  /** All roles available in this organization. */
  roles: Array<ApiRole>;
};

export type ApiMutation = {
  __typename?: "Mutation";
  /** Application realm management mutations. */
  applicationMutation: ApiApplicationMutation;
  /** Apps control-plane mutations for the current store. */
  appsMutation: ApiAppsMutation;
  /** Authentication mutations. */
  authMutation: ApiAuthMutation;
  /** Catalog mutation namespace for product, variant, category, and collection operations */
  catalogMutation: ApiCatalogMutation;
  /** Customers Admin mutation namespace. */
  customersMutation: ApiCustomersMutation;
  /** Headless App mutations for the active installation. */
  headlessAppMutation: ApiHeadlessAppMutation;
  /** Inventory mutation namespace for warehouse, stock, and inventory item operations */
  inventoryMutation: ApiInventoryMutation;
  /** Listing mutation namespace. */
  listingMutation: ApiListingMutation;
  /** Loyalty Admin mutation namespace. */
  loyaltyMutation: ApiLoyaltyMutation;
  mediaMutation: ApiMediaMutation;
  notificationsMutation: ApiNotificationsMutation;
  /** Online Store content mutation namespace. */
  onlineStoreAppMutation: ApiOnlineStoreAppMutation;
  /** Organization management mutations. */
  organizationMutation: ApiOrganizationMutation;
  /** Pricing Admin mutation namespace. */
  pricingMutation: ApiPricingMutation;
  /** Admin-only Reviews mutation namespace. */
  reviewsMutation: ApiReviewsMutation;
  /** Role management mutations. */
  roleMutation: ApiRoleMutation;
  smtpAppMutation: ApiSmtpAppMutation;
  /** Store-related mutations */
  storeMutation: ApiStoreMutation;
  /** User management mutations. */
  userMutation: ApiUserMutation;
};

/** An object with a globally unique ID. */
export type ApiNode = {
  /** The globally unique ID of the object. */
  id: Scalars["ID"]["output"];
};

export enum NotificationAudience {
  Customer = "CUSTOMER",
  Staff = "STAFF",
}

export enum NotificationChannel {
  Email = "EMAIL",
  Sms = "SMS",
  Webhook = "WEBHOOK",
}

export type ApiNotificationChannelSetEnabledPayload = {
  __typename?: "NotificationChannelSetEnabledPayload";
  setting?: Maybe<ApiNotificationChannelSetting>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiNotificationChannelSetting = {
  __typename?: "NotificationChannelSetting";
  channel: NotificationChannel;
  definitionKey: Scalars["String"]["output"];
  enabled: Scalars["Boolean"]["output"];
  replyTo?: Maybe<Scalars["String"]["output"]>;
  senderEmail?: Maybe<Scalars["String"]["output"]>;
  senderName?: Maybe<Scalars["String"]["output"]>;
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  version: Scalars["Int"]["output"];
};

export type ApiNotificationChannelSettingInput = {
  channel: NotificationChannel;
  enabled: Scalars["Boolean"]["input"];
  expectedVersion: Scalars["Int"]["input"];
  key: Scalars["String"]["input"];
  replyTo?: InputMaybe<Scalars["String"]["input"]>;
  senderEmail?: InputMaybe<Scalars["String"]["input"]>;
  senderName?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiNotificationDefinition = {
  __typename?: "NotificationDefinition";
  activeChannels: Array<NotificationChannel>;
  allowedChannels: Array<NotificationChannel>;
  audience: NotificationAudience;
  defaultChannels: Array<NotificationChannel>;
  enabled: Scalars["Boolean"]["output"];
  key: Scalars["String"]["output"];
  optional: Scalars["Boolean"]["output"];
  title: Scalars["String"]["output"];
  variables: Array<ApiNotificationTemplateVariable>;
  version: Scalars["Int"]["output"];
};

export type ApiNotificationDefinitionSetEnabledInput = {
  enabled: Scalars["Boolean"]["input"];
  expectedVersion: Scalars["Int"]["input"];
  key: Scalars["String"]["input"];
};

export type ApiNotificationDefinitionSetEnabledPayload = {
  __typename?: "NotificationDefinitionSetEnabledPayload";
  setting?: Maybe<ApiNotificationDefinitionSetting>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiNotificationDefinitionSetting = {
  __typename?: "NotificationDefinitionSetting";
  definitionKey: Scalars["String"]["output"];
  enabled: Scalars["Boolean"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiNotificationEffectiveTemplate = {
  __typename?: "NotificationEffectiveTemplate";
  bodyTemplate: Scalars["String"]["output"];
  channel: NotificationChannel;
  key: Scalars["String"]["output"];
  locale: Scalars["String"]["output"];
  plainTextTemplate?: Maybe<Scalars["String"]["output"]>;
  pointerVersion?: Maybe<Scalars["Int"]["output"]>;
  revision?: Maybe<Scalars["Int"]["output"]>;
  revisionId?: Maybe<Scalars["ID"]["output"]>;
  source: Scalars["String"]["output"];
  sourceVersion?: Maybe<Scalars["String"]["output"]>;
  subjectTemplate?: Maybe<Scalars["String"]["output"]>;
};

export type ApiNotificationPreview = {
  __typename?: "NotificationPreview";
  html?: Maybe<Scalars["String"]["output"]>;
  locale: Scalars["String"]["output"];
  sms?: Maybe<ApiNotificationSmsMetrics>;
  subject?: Maybe<Scalars["String"]["output"]>;
  text: Scalars["String"]["output"];
  warnings: Array<Scalars["String"]["output"]>;
};

export type ApiNotificationPreviewInput = {
  bodyTemplate?: InputMaybe<Scalars["String"]["input"]>;
  channel: NotificationChannel;
  data: Scalars["JSON"]["input"];
  key: Scalars["String"]["input"];
  locale?: InputMaybe<Scalars["String"]["input"]>;
  plainTextTemplate?: InputMaybe<Scalars["String"]["input"]>;
  subjectTemplate?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiNotificationPreviewPayload = {
  __typename?: "NotificationPreviewPayload";
  preview?: Maybe<ApiNotificationPreview>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiNotificationSendTestPayload = {
  __typename?: "NotificationSendTestPayload";
  userErrors: Array<ApiGenericUserError>;
  workflow?: Maybe<ApiNotificationWorkflowPayload>;
};

export type ApiNotificationSmsMetrics = {
  __typename?: "NotificationSmsMetrics";
  encoding: Scalars["String"]["output"];
  length: Scalars["Int"]["output"];
  segmentCount: Scalars["Int"]["output"];
};

export type ApiNotificationTemplateUpdateInput = {
  bodyTemplate: Scalars["String"]["input"];
  channel: NotificationChannel;
  expectedVersion: Scalars["Int"]["input"];
  key: Scalars["String"]["input"];
  locale: Scalars["String"]["input"];
  plainTextTemplate?: InputMaybe<Scalars["String"]["input"]>;
  subjectTemplate?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiNotificationTemplateUpdatePayload = {
  __typename?: "NotificationTemplateUpdatePayload";
  template?: Maybe<ApiNotificationEffectiveTemplate>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiNotificationTemplateVariable = {
  __typename?: "NotificationTemplateVariable";
  children?: Maybe<Array<ApiNotificationTemplateVariable>>;
  description: Scalars["String"]["output"];
  path: Scalars["String"]["output"];
  required: Scalars["Boolean"]["output"];
  type: Scalars["String"]["output"];
};

export type ApiNotificationTestMessageInput = {
  channel: NotificationChannel;
  customerId?: InputMaybe<Scalars["ID"]["input"]>;
  data: Scalars["JSON"]["input"];
  email?: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  key: Scalars["String"]["input"];
  locale?: InputMaybe<Scalars["String"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  phone?: InputMaybe<Scalars["String"]["input"]>;
  recipientId?: InputMaybe<Scalars["ID"]["input"]>;
  userId?: InputMaybe<Scalars["ID"]["input"]>;
};

export enum NotificationWebhookApiStability {
  Deprecated = "DEPRECATED",
  Stable = "STABLE",
  Unstable = "UNSTABLE",
}

export type ApiNotificationWebhookApiVersion = {
  __typename?: "NotificationWebhookApiVersion";
  isDefault: Scalars["Boolean"]["output"];
  stability: NotificationWebhookApiStability;
  version: Scalars["String"]["output"];
};

export type ApiNotificationWebhookCapabilities = {
  __typename?: "NotificationWebhookCapabilities";
  apiVersions: Array<ApiNotificationWebhookApiVersion>;
  events: Array<ApiNotificationWebhookEvent>;
};

export type ApiNotificationWebhookCreateInput = {
  apiVersion: Scalars["String"]["input"];
  eventType: Scalars["String"]["input"];
  format: NotificationWebhookFormat;
  url: Scalars["String"]["input"];
};

export type ApiNotificationWebhookCreatePayload = {
  __typename?: "NotificationWebhookCreatePayload";
  userErrors: Array<ApiGenericUserError>;
  webhook?: Maybe<ApiNotificationWebhookSubscription>;
};

export type ApiNotificationWebhookDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiNotificationWebhookDeletePayload = {
  __typename?: "NotificationWebhookDeletePayload";
  deletedWebhookId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiNotificationWebhookEvent = {
  __typename?: "NotificationWebhookEvent";
  eventType: Scalars["String"]["output"];
  title: Scalars["String"]["output"];
};

export enum NotificationWebhookFormat {
  Json = "JSON",
  Xml = "XML",
}

export type ApiNotificationWebhookSecretPayload = {
  __typename?: "NotificationWebhookSecretPayload";
  secret?: Maybe<Scalars["String"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export enum NotificationWebhookStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
}

export type ApiNotificationWebhookSubscription = {
  __typename?: "NotificationWebhookSubscription";
  apiVersion: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  eventType: Scalars["String"]["output"];
  format: NotificationWebhookFormat;
  id: Scalars["ID"]["output"];
  status: NotificationWebhookStatus;
  updatedAt: Scalars["DateTime"]["output"];
  url: Scalars["String"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiNotificationWebhookUpdateInput = {
  apiVersion?: InputMaybe<Scalars["String"]["input"]>;
  eventType?: InputMaybe<Scalars["String"]["input"]>;
  expectedVersion: Scalars["Int"]["input"];
  format?: InputMaybe<NotificationWebhookFormat>;
  id: Scalars["ID"]["input"];
  status?: InputMaybe<NotificationWebhookStatus>;
  url?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiNotificationWebhookUpdatePayload = {
  __typename?: "NotificationWebhookUpdatePayload";
  userErrors: Array<ApiGenericUserError>;
  webhook?: Maybe<ApiNotificationWebhookSubscription>;
};

export type ApiNotificationWorkflowPayload = {
  __typename?: "NotificationWorkflowPayload";
  accepted: Scalars["Boolean"]["output"];
  workflowId: Scalars["String"]["output"];
};

export type ApiNotificationsMutation = {
  __typename?: "NotificationsMutation";
  createWebhook: ApiNotificationWebhookCreatePayload;
  deleteStaffRecipient: ApiStaffRecipientDeletePayload;
  deleteWebhook: ApiNotificationWebhookDeletePayload;
  preview: ApiNotificationPreviewPayload;
  revealWebhookSecret: ApiNotificationWebhookSecretPayload;
  sendTest: ApiNotificationSendTestPayload;
  setChannelEnabled: ApiNotificationChannelSetEnabledPayload;
  setDefinitionEnabled: ApiNotificationDefinitionSetEnabledPayload;
  updateTemplate: ApiNotificationTemplateUpdatePayload;
  updateWebhook: ApiNotificationWebhookUpdatePayload;
  upsertStaffRecipient: ApiStaffRecipientUpsertPayload;
};

export type ApiNotificationsMutationCreateWebhookArgs = {
  input: ApiNotificationWebhookCreateInput;
};

export type ApiNotificationsMutationDeleteStaffRecipientArgs = {
  input: ApiStaffRecipientDeleteInput;
};

export type ApiNotificationsMutationDeleteWebhookArgs = {
  input: ApiNotificationWebhookDeleteInput;
};

export type ApiNotificationsMutationPreviewArgs = {
  input: ApiNotificationPreviewInput;
};

export type ApiNotificationsMutationSendTestArgs = {
  input: ApiNotificationTestMessageInput;
};

export type ApiNotificationsMutationSetChannelEnabledArgs = {
  input: ApiNotificationChannelSettingInput;
};

export type ApiNotificationsMutationSetDefinitionEnabledArgs = {
  input: ApiNotificationDefinitionSetEnabledInput;
};

export type ApiNotificationsMutationUpdateTemplateArgs = {
  input: ApiNotificationTemplateUpdateInput;
};

export type ApiNotificationsMutationUpdateWebhookArgs = {
  input: ApiNotificationWebhookUpdateInput;
};

export type ApiNotificationsMutationUpsertStaffRecipientArgs = {
  input: ApiStaffNotificationRecipientInput;
};

export type ApiNotificationsQuery = {
  __typename?: "NotificationsQuery";
  channelSettings: Array<ApiNotificationChannelSetting>;
  definitions: Array<ApiNotificationDefinition>;
  staffRecipients: Array<ApiStaffNotificationRecipient>;
  template: ApiNotificationEffectiveTemplate;
  webhookCapabilities: ApiNotificationWebhookCapabilities;
  webhookSubscriptions: Array<ApiNotificationWebhookSubscription>;
};

export type ApiNotificationsQueryChannelSettingsArgs = {
  key: Scalars["String"]["input"];
};

export type ApiNotificationsQueryTemplateArgs = {
  channel: NotificationChannel;
  key: Scalars["String"]["input"];
  locale: Scalars["String"]["input"];
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutation = {
  __typename?: "OnlineStoreAppMutation";
  navigationMenuCreate: ApiOnlineStoreNavigationMenuCreatePayload;
  navigationMenuDelete: ApiOnlineStoreNavigationMenuDeletePayload;
  navigationMenuItemCreate: ApiOnlineStoreNavigationMenuItemCreatePayload;
  navigationMenuItemDelete: ApiOnlineStoreNavigationMenuItemDeletePayload;
  navigationMenuItemUpdate: ApiOnlineStoreNavigationMenuItemUpdatePayload;
  navigationMenuUpdate: ApiOnlineStoreNavigationMenuUpdatePayload;
  pageCreate: ApiOnlineStorePageCreatePayload;
  pageDelete: ApiOnlineStorePageDeletePayload;
  pageUpdate: ApiOnlineStorePageUpdatePayload;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuCreateArgs = {
  input: ApiOnlineStoreNavigationMenuCreateInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuDeleteArgs = {
  input: ApiOnlineStoreNavigationMenuDeleteInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuItemCreateArgs = {
  input: ApiOnlineStoreNavigationMenuItemCreateInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuItemDeleteArgs = {
  input: ApiOnlineStoreNavigationMenuItemDeleteInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuItemUpdateArgs = {
  input: ApiOnlineStoreNavigationMenuItemUpdateInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationNavigationMenuUpdateArgs = {
  input: ApiOnlineStoreNavigationMenuUpdateInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationPageCreateArgs = {
  input: ApiOnlineStorePageCreateInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationPageDeleteArgs = {
  input: ApiOnlineStorePageDeleteInput;
};

/** Admin mutations scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppMutationPageUpdateArgs = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  operations: ApiOnlineStorePageUpdateInput;
  pageId: Scalars["ID"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQuery = {
  __typename?: "OnlineStoreAppQuery";
  /** Get a navigation menu by its global ID. */
  navigationMenu?: Maybe<ApiOnlineStoreNavigationMenu>;
  /** Get a navigation menu by its URL handle. */
  navigationMenuByHandle?: Maybe<ApiOnlineStoreNavigationMenu>;
  /** Get navigation menus with Relay-style pagination. */
  navigationMenus: ApiOnlineStoreNavigationMenuConnection;
  /** Get an Online Store node by its global ID. */
  node?: Maybe<ApiNode>;
  /** Get Online Store nodes by their global IDs. */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a page by its global ID. */
  page?: Maybe<ApiOnlineStorePage>;
  /** Get a page by its URL handle. */
  pageByHandle?: Maybe<ApiOnlineStorePage>;
  /** Get pages with Relay-style pagination. */
  pages: ApiOnlineStorePageConnection;
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryNavigationMenuArgs = {
  id: Scalars["ID"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryNavigationMenuByHandleArgs = {
  handle: Scalars["String"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryNavigationMenusArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiOnlineStoreNavigationMenuOrderByInput>>;
  where?: InputMaybe<ApiOnlineStoreNavigationMenuWhereInput>;
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryPageArgs = {
  id: Scalars["ID"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryPageByHandleArgs = {
  handle: Scalars["String"]["input"];
};

/** Admin queries scoped to the active Online Store App installation. */
export type ApiOnlineStoreAppQueryPagesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiOnlineStorePageOrderByInput>>;
  where?: InputMaybe<ApiOnlineStorePageWhereInput>;
};

/** A navigation menu owned by an Online Store installation. */
export type ApiOnlineStoreNavigationMenu = ApiNode & {
  __typename?: "OnlineStoreNavigationMenu";
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  items: Array<ApiOnlineStoreNavigationMenuItem>;
  name: Scalars["String"]["output"];
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiOnlineStoreNavigationMenuConnection = {
  __typename?: "OnlineStoreNavigationMenuConnection";
  edges: Array<ApiOnlineStoreNavigationMenuEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiOnlineStoreNavigationMenuCreateInput = {
  handle: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
};

export type ApiOnlineStoreNavigationMenuCreatePayload = {
  __typename?: "OnlineStoreNavigationMenuCreatePayload";
  navigationMenu?: Maybe<ApiOnlineStoreNavigationMenu>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStoreNavigationMenuDeleteInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiOnlineStoreNavigationMenuDeletePayload = {
  __typename?: "OnlineStoreNavigationMenuDeletePayload";
  deletedNavigationMenuId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStoreNavigationMenuEdge = {
  __typename?: "OnlineStoreNavigationMenuEdge";
  cursor: Scalars["String"]["output"];
  node: ApiOnlineStoreNavigationMenu;
};

/** A localized item in a navigation menu tree. */
export type ApiOnlineStoreNavigationMenuItem = ApiNode & {
  __typename?: "OnlineStoreNavigationMenuItem";
  children: Array<ApiOnlineStoreNavigationMenuItem>;
  createdAt: Scalars["DateTime"]["output"];
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  label: Scalars["String"]["output"];
  menu: ApiOnlineStoreNavigationMenu;
  openInNewTab: Scalars["Boolean"]["output"];
  parent?: Maybe<ApiOnlineStoreNavigationMenuItem>;
  revision: Scalars["Int"]["output"];
  target: ApiOnlineStoreNavigationTarget;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiOnlineStoreNavigationMenuItemCreateInput = {
  afterItemId?: InputMaybe<Scalars["ID"]["input"]>;
  beforeItemId?: InputMaybe<Scalars["ID"]["input"]>;
  handle: Scalars["String"]["input"];
  label: Scalars["String"]["input"];
  menuId: Scalars["ID"]["input"];
  openInNewTab?: InputMaybe<Scalars["Boolean"]["input"]>;
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
  target: ApiOnlineStoreNavigationTargetInput;
};

export type ApiOnlineStoreNavigationMenuItemCreatePayload = {
  __typename?: "OnlineStoreNavigationMenuItemCreatePayload";
  navigationMenuItem?: Maybe<ApiOnlineStoreNavigationMenuItem>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStoreNavigationMenuItemDeleteInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiOnlineStoreNavigationMenuItemDeletePayload = {
  __typename?: "OnlineStoreNavigationMenuItemDeletePayload";
  deletedNavigationMenuItemId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStoreNavigationMenuItemUpdateInput = {
  afterItemId?: InputMaybe<Scalars["ID"]["input"]>;
  beforeItemId?: InputMaybe<Scalars["ID"]["input"]>;
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  label?: InputMaybe<Scalars["String"]["input"]>;
  openInNewTab?: InputMaybe<Scalars["Boolean"]["input"]>;
  parentId?: InputMaybe<Scalars["ID"]["input"]>;
  target?: InputMaybe<ApiOnlineStoreNavigationTargetInput>;
};

export type ApiOnlineStoreNavigationMenuItemUpdatePayload = {
  __typename?: "OnlineStoreNavigationMenuItemUpdatePayload";
  navigationMenuItem?: Maybe<ApiOnlineStoreNavigationMenuItem>;
  userErrors: Array<ApiGenericUserError>;
};

/** Ordering configuration for OnlineStoreNavigationMenu */
export type ApiOnlineStoreNavigationMenuOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: OnlineStoreNavigationMenuOrderField;
};

/** Fields available for sorting OnlineStoreNavigationMenu */
export enum OnlineStoreNavigationMenuOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiOnlineStoreNavigationMenuUpdateInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  id: Scalars["ID"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiOnlineStoreNavigationMenuUpdatePayload = {
  __typename?: "OnlineStoreNavigationMenuUpdatePayload";
  navigationMenu?: Maybe<ApiOnlineStoreNavigationMenu>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for OnlineStoreNavigationMenu */
export type ApiOnlineStoreNavigationMenuWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiOnlineStoreNavigationMenuWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiOnlineStoreNavigationMenuWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiOnlineStoreNavigationMenuWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiOnlineStoreNavigationTarget = {
  __typename?: "OnlineStoreNavigationTarget";
  id?: Maybe<Scalars["ID"]["output"]>;
  type: OnlineStoreNavigationTargetType;
  url?: Maybe<Scalars["String"]["output"]>;
};

export type ApiOnlineStoreNavigationTargetInput = {
  id?: InputMaybe<Scalars["ID"]["input"]>;
  type: OnlineStoreNavigationTargetType;
  url?: InputMaybe<Scalars["String"]["input"]>;
};

export enum OnlineStoreNavigationTargetType {
  Category = "CATEGORY",
  Collection = "COLLECTION",
  Page = "PAGE",
  Product = "PRODUCT",
  Url = "URL",
}

/** A localized content page owned by an Online Store installation. */
export type ApiOnlineStorePage = ApiNode & {
  __typename?: "OnlineStorePage";
  body?: Maybe<ApiRichText>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  handle: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  isPublished: Scalars["Boolean"]["output"];
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  revision: Scalars["Int"]["output"];
  seo?: Maybe<ApiSeo>;
  templateSuffix?: Maybe<Scalars["String"]["output"]>;
  title: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiOnlineStorePageConnection = {
  __typename?: "OnlineStorePageConnection";
  edges: Array<ApiOnlineStorePageEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiOnlineStorePageCreateInput = {
  body?: InputMaybe<ApiRichTextInput>;
  handle: Scalars["String"]["input"];
  publish?: InputMaybe<Scalars["Boolean"]["input"]>;
  seo?: InputMaybe<ApiSeoInput>;
  templateSuffix?: InputMaybe<Scalars["String"]["input"]>;
  title: Scalars["String"]["input"];
};

export type ApiOnlineStorePageCreatePayload = {
  __typename?: "OnlineStorePageCreatePayload";
  page?: Maybe<ApiOnlineStorePage>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStorePageDeleteInput = {
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  id: Scalars["ID"]["input"];
};

export type ApiOnlineStorePageDeletePayload = {
  __typename?: "OnlineStorePageDeletePayload";
  deletedPageId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOnlineStorePageEdge = {
  __typename?: "OnlineStorePageEdge";
  cursor: Scalars["String"]["output"];
  node: ApiOnlineStorePage;
};

/** Ordering configuration for OnlineStorePage */
export type ApiOnlineStorePageOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: OnlineStorePageOrderField;
};

/** Fields available for sorting OnlineStorePage */
export enum OnlineStorePageOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by isPublished */
  IsPublished = "isPublished",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by templateSuffix */
  TemplateSuffix = "templateSuffix",
  /** Sort by title */
  Title = "title",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export enum OnlineStorePageStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
}

export type ApiOnlineStorePageUpdateInput = {
  body?: InputMaybe<ApiRichTextInput>;
  handle?: InputMaybe<Scalars["String"]["input"]>;
  seo?: InputMaybe<ApiSeoInput>;
  status?: InputMaybe<OnlineStorePageStatus>;
  templateSuffix?: InputMaybe<Scalars["String"]["input"]>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiOnlineStorePageUpdatePayload = {
  __typename?: "OnlineStorePageUpdatePayload";
  page?: Maybe<ApiOnlineStorePage>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for OnlineStorePage */
export type ApiOnlineStorePageWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiOnlineStorePageWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiOnlineStorePageWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiOnlineStorePageWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isPublished */
  isPublished?: InputMaybe<ApiBooleanFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by templateSuffix */
  templateSuffix?: InputMaybe<ApiStringFilter>;
  /** Filter by title */
  title?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Result of a single operation in the unified update. */
export type ApiOperationResult = {
  __typename?: "OperationResult";
  /** Whether the operation was applied successfully. */
  applied: Scalars["Boolean"]["output"];
  /** Per-request client correlation key for create operations. */
  clientMutationId?: Maybe<Scalars["String"]["output"]>;
  /** Entity affected by this operation. */
  entityId?: Maybe<Scalars["ID"]["output"]>;
  /** Errors that occurred during this operation. */
  errors: Array<ApiGenericUserError>;
  /** The type of operation. */
  type: OperationType;
};

/** Type of operation in the unified update. */
export enum OperationType {
  CategoryUpdate = "CATEGORY_UPDATE",
  ProductCategoryUpdate = "PRODUCT_CATEGORY_UPDATE",
  ProductComponentConfigurationCreate = "PRODUCT_COMPONENT_CONFIGURATION_CREATE",
  ProductComponentConfigurationDelete = "PRODUCT_COMPONENT_CONFIGURATION_DELETE",
  ProductComponentConfigurationUpdate = "PRODUCT_COMPONENT_CONFIGURATION_UPDATE",
  ProductComponentDependencyRulesSync = "PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC",
  ProductComponentGroupsSync = "PRODUCT_COMPONENT_GROUPS_SYNC",
  ProductComponentPricingTemplatesSync = "PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC",
  ProductComponentRemove = "PRODUCT_COMPONENT_REMOVE",
  ProductComponentSettingsUpdate = "PRODUCT_COMPONENT_SETTINGS_UPDATE",
  ProductFeaturesSync = "PRODUCT_FEATURES_SYNC",
  ProductOptionsSync = "PRODUCT_OPTIONS_SYNC",
  ProductTagUpdate = "PRODUCT_TAG_UPDATE",
  ProductUpdate = "PRODUCT_UPDATE",
  VariantCreate = "VARIANT_CREATE",
  VariantDelete = "VARIANT_DELETE",
  VariantUpdate = "VARIANT_UPDATE",
}

export type ApiOrder = {
  __typename?: "Order";
  adminNote?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  createdBy: ApiOrderActor;
  currencyCode: Scalars["String"]["output"];
  customerIdentity: ApiOrderCustomerIdentity;
  customerNote?: Maybe<Scalars["String"]["output"]>;
  customerStatistic: ApiOrderCustomerStatistic;
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  discountTotal?: Maybe<Scalars["BigInt"]["output"]>;
  grandTotal: Scalars["BigInt"]["output"];
  id: Scalars["ID"]["output"];
  labels: Array<ApiLabel>;
  lines: Array<ApiOrderLine>;
  number: Scalars["BigInt"]["output"];
  shippingTotal?: Maybe<Scalars["BigInt"]["output"]>;
  status: OrderStatus;
  subtotal: Scalars["BigInt"]["output"];
  tags: Array<ApiTag>;
  taxTotal?: Maybe<Scalars["BigInt"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiOrderActor = ApiApiKey | ApiUser;

export type ApiOrderCustomerIdentity = {
  __typename?: "OrderCustomerIdentity";
  countryCode?: Maybe<CountryCode>;
  customer?: Maybe<ApiCustomer>;
  data?: Maybe<Scalars["JSON"]["output"]>;
  email?: Maybe<Scalars["Email"]["output"]>;
  phone?: Maybe<Scalars["String"]["output"]>;
};

export type ApiOrderCustomerStatistic = {
  __typename?: "OrderCustomerStatistic";
  totalAuthorizedOrders: Scalars["Int"]["output"];
  totalGuestOrders: Scalars["Int"]["output"];
  totalRevenue: Scalars["Int"]["output"];
};

export type ApiOrderDeliveryAddress = {
  __typename?: "OrderDeliveryAddress";
  address1: Scalars["String"]["output"];
  address2?: Maybe<Scalars["String"]["output"]>;
  city: Scalars["String"]["output"];
  countryCode: CountryCode;
  data?: Maybe<Scalars["JSON"]["output"]>;
  email?: Maybe<Scalars["Email"]["output"]>;
  firstName?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  lastName?: Maybe<Scalars["String"]["output"]>;
  postalCode?: Maybe<Scalars["String"]["output"]>;
  provinceCode?: Maybe<Scalars["String"]["output"]>;
};

export type ApiOrderLine = {
  __typename?: "OrderLine";
  createdAt: Scalars["DateTime"]["output"];
  discountAmount: Scalars["Int"]["output"];
  id: Scalars["ID"]["output"];
  purchasableId: Scalars["ID"]["output"];
  quantity: Scalars["Int"]["output"];
  subtotalAmount: Scalars["Int"]["output"];
  taxAmount?: Maybe<Scalars["Int"]["output"]>;
  totalAmount: Scalars["Int"]["output"];
  unitComparePrice: Scalars["Int"]["output"];
  unitPrice: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiOrderQuery = {
  __typename?: "OrderQuery";
  order?: Maybe<ApiOrder>;
  orders: ApiOrdersOutput;
};

export type ApiOrderQueryOrderArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiOrderQueryOrdersArgs = {
  input?: InputMaybe<ApiOrdersInput>;
};

export enum OrderStatus {
  Active = "ACTIVE",
  Cancelled = "CANCELLED",
  Closed = "CLOSED",
  Draft = "DRAFT",
}

export type ApiOrdersInput = {
  order?: InputMaybe<Scalars["String"]["input"]>;
  page?: InputMaybe<Scalars["Int"]["input"]>;
  pageSize?: InputMaybe<Scalars["Int"]["input"]>;
  where?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiOrdersOutput = {
  __typename?: "OrdersOutput";
  data: Array<ApiOrder>;
  meta: ApiCollectionMeta;
};

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type ApiOrganization = ApiNode & {
  __typename?: "Organization";
  /** Applications owned by this organization. */
  applications: ApiApplicationConnection;
  /** Timestamp when the organization was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Display name (e.g., "Acme Corp"). */
  displayName: Scalars["String"]["output"];
  /** Unique identifier. */
  id: Scalars["ID"]["output"];
  /** Organization logo (from Media service). */
  logo?: Maybe<ApiFile>;
  /** Membership info (members + roles). Domain = orgId. */
  membership: ApiMembership;
  /** URL-friendly unique identifier. */
  name: Scalars["String"]["output"];
  /** Timestamp when the organization was last updated. */
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
};

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type ApiOrganizationApplicationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiApplicationOrderByInput>>;
  where?: InputMaybe<ApiApplicationWhereInput>;
};

/** A connection to a list of Organization items. */
export type ApiOrganizationConnection = {
  __typename?: "OrganizationConnection";
  /** A list of edges. */
  edges: Array<ApiOrganizationEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of organizations. */
  totalCount: Scalars["Int"]["output"];
};

/** Input for creating an organization. */
export type ApiOrganizationCreateInput = {
  /** Display name. */
  displayName: Scalars["String"]["input"];
  /** URL-friendly unique identifier. */
  name: Scalars["String"]["input"];
};

export type ApiOrganizationCreatePayload = {
  __typename?: "OrganizationCreatePayload";
  organization?: Maybe<ApiOrganization>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiOrganizationDeletePayload = {
  __typename?: "OrganizationDeletePayload";
  deletedOrganizationId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in an Organization connection. */
export type ApiOrganizationEdge = {
  __typename?: "OrganizationEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiOrganization;
};

/** Organization mutations. */
export type ApiOrganizationMutation = {
  __typename?: "OrganizationMutation";
  /** Remove member's access from domain. */
  memberAccessRemove: ApiMemberAccessRemovePayload;
  /** Invite member to organization with role assignments. */
  memberInvite: ApiMemberInvitePayload;
  /**
   * Remove member from organization.
   * Requires: org admin or owner.
   * Cannot remove owner (transfer ownership first).
   */
  memberRemove: ApiMemberRemovePayload;
  /**
   * Change role for a member in specific domain.
   * Owner cannot be demoted.
   */
  memberRoleChange: ApiMemberRoleChangePayload;
  /**
   * Create a new organization.
   * Current user becomes the owner.
   */
  organizationCreate: ApiOrganizationCreatePayload;
  /** Delete organization. Requires: org owner only. */
  organizationDelete: ApiOrganizationDeletePayload;
  /**
   * Update organization.
   * Requires: org admin or owner.
   */
  organizationUpdate: ApiOrganizationUpdatePayload;
  /**
   * Transfer organization ownership to another admin.
   * Only the current owner can transfer ownership.
   * New owner must have admin role in the organization.
   * Previous owner retains admin role.
   */
  ownershipTransfer: ApiOwnershipTransferPayload;
};

/** Organization mutations. */
export type ApiOrganizationMutationMemberAccessRemoveArgs = {
  input: ApiMemberAccessRemoveInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationMemberInviteArgs = {
  input: ApiMemberInviteInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationMemberRemoveArgs = {
  input: ApiMemberRemoveInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationMemberRoleChangeArgs = {
  input: ApiMemberRoleChangeInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationOrganizationCreateArgs = {
  input: ApiOrganizationCreateInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationOrganizationDeleteArgs = {
  id: Scalars["ID"]["input"];
};

/** Organization mutations. */
export type ApiOrganizationMutationOrganizationUpdateArgs = {
  input: ApiOrganizationUpdateInput;
};

/** Organization mutations. */
export type ApiOrganizationMutationOwnershipTransferArgs = {
  input: ApiOwnershipTransferInput;
};

/** Ordering configuration for Organization */
export type ApiOrganizationOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: OrganizationOrderField;
};

/** Fields available for sorting Organization */
export enum OrganizationOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by displayName */
  DisplayName = "displayName",
  /** Sort by name */
  Name = "name",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

/** Organization queries. */
export type ApiOrganizationQuery = {
  __typename?: "OrganizationQuery";
  /**
   * Get organization by ID or name (if user has access).
   * Provide either id or name, not both.
   */
  organization?: Maybe<ApiOrganization>;
  /**
   * Get all organizations the current user has access to with cursor pagination.
   * Returns empty connection if not authenticated.
   */
  organizations: ApiOrganizationConnection;
};

/** Organization queries. */
export type ApiOrganizationQueryOrganizationArgs = {
  id?: InputMaybe<Scalars["ID"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** Organization queries. */
export type ApiOrganizationQueryOrganizationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiOrganizationOrderByInput>>;
  where?: InputMaybe<ApiOrganizationWhereInput>;
};

/** Input for updating organization. */
export type ApiOrganizationUpdateInput = {
  /** New display name. */
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  /** Organization ID. */
  id: Scalars["ID"]["input"];
  /** Media file ID for the logo. Pass null to remove logo. */
  logoId?: InputMaybe<Scalars["ID"]["input"]>;
  /** New name (URL-friendly identifier). */
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiOrganizationUpdatePayload = {
  __typename?: "OrganizationUpdatePayload";
  organization?: Maybe<ApiOrganization>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Organization */
export type ApiOrganizationWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiOrganizationWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiOrganizationWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiOrganizationWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Input for transferring organization ownership. */
export type ApiOwnershipTransferInput = {
  /** User ID of the new owner. Must be an admin of the organization. */
  newOwnerId: Scalars["ID"]["input"];
  /** Organization ID. */
  organizationId: Scalars["ID"]["input"];
};

export type ApiOwnershipTransferPayload = {
  __typename?: "OwnershipTransferPayload";
  /** Whether the transfer was successful. */
  success: Scalars["Boolean"]["output"];
  userErrors: Array<ApiGenericUserError>;
};

/** Pagination metadata for a Relay connection. */
export type ApiPageInfo = {
  __typename?: "PageInfo";
  /** The cursor of the last edge in the current page. */
  endCursor?: Maybe<Scalars["String"]["output"]>;
  /** Whether more items exist after the current page. */
  hasNextPage: Scalars["Boolean"]["output"];
  /** Whether more items exist before the current page. */
  hasPreviousPage: Scalars["Boolean"]["output"];
  /** The cursor of the first edge in the current page. */
  startCursor?: Maybe<Scalars["String"]["output"]>;
};

/** Direction in which a price adjustment changes the base price. */
export enum PriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = "DECREASE",
  /** Add the calculated value to the base price. */
  Increase = "INCREASE",
}

/** Representation used to calculate a price adjustment. */
export enum PriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = "FIXED_AMOUNT",
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = "PERCENTAGE",
}

/** Store-scoped pricing commands. */
export type ApiPricingMutation = {
  __typename?: "PricingMutation";
  discountCreate: ApiDiscountCreatePayload;
  /**
   * Permanently delete an unused draft. Active, historical, or redeemed discounts
   * must be archived through discountUpdate instead.
   */
  discountDelete: ApiDiscountDeletePayload;
  discountExternalReferenceCreate: ApiDiscountExternalReferenceCreatePayload;
  discountExternalReferenceDelete: ApiDiscountExternalReferenceDeletePayload;
  discountExternalReferenceUpdate: ApiDiscountExternalReferenceUpdatePayload;
  /** Unified discount configuration update with optimistic locking. */
  discountUpdate: ApiDiscountUpdatePayload;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountCreateArgs = {
  input: ApiDiscountCreateInput;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountDeleteArgs = {
  input: ApiDiscountDeleteInput;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountExternalReferenceCreateArgs = {
  input: ApiDiscountExternalReferenceCreateInput;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountExternalReferenceDeleteArgs = {
  input: ApiDiscountExternalReferenceDeleteInput;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountExternalReferenceUpdateArgs = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  externalReferenceId: Scalars["ID"]["input"];
  operations: ApiDiscountExternalReferenceUpdateInput;
};

/** Store-scoped pricing commands. */
export type ApiPricingMutationDiscountUpdateArgs = {
  discountId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  operations: ApiDiscountUpdateInput;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQuery = {
  __typename?: "PricingQuery";
  discount?: Maybe<ApiDiscount>;
  discountCode?: Maybe<ApiDiscountCode>;
  discountCodes: ApiDiscountCodeConnection;
  discountExternalReference?: Maybe<ApiDiscountExternalReference>;
  discountExternalReferences: ApiDiscountExternalReferenceConnection;
  discountRedemption?: Maybe<ApiDiscountRedemption>;
  discountRedemptionAllocation?: Maybe<ApiDiscountRedemptionAllocation>;
  discountRedemptions: ApiDiscountRedemptionConnection;
  discountUsageReservation?: Maybe<ApiDiscountUsageReservation>;
  discountUsageReservations: ApiDiscountUsageReservationConnection;
  discounts: ApiDiscountConnection;
  /** Resolve a Pricing-owned Relay node by global ID. */
  node?: Maybe<ApiNode>;
  /** Resolve Pricing-owned Relay nodes while preserving input order. */
  nodes: Array<Maybe<ApiNode>>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountCodeArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountCodesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountCodeOrderByInput>>;
  where?: InputMaybe<ApiDiscountCodeWhereInput>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountExternalReferenceArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountExternalReferenceOrderByInput>>;
  where?: InputMaybe<ApiDiscountExternalReferenceWhereInput>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountRedemptionArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountRedemptionAllocationArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountRedemptionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountRedemptionOrderByInput>>;
  where?: InputMaybe<ApiDiscountRedemptionWhereInput>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountUsageReservationArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountUsageReservationsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountUsageReservationOrderByInput>>;
  where?: InputMaybe<ApiDiscountUsageReservationWhereInput>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryDiscountsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiDiscountOrderByInput>>;
  where?: InputMaybe<ApiDiscountWhereInput>;
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

/** Store-scoped pricing reads. The current Store is taken from trusted context. */
export type ApiPricingQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

/** Input for pricing widget query. */
export type ApiPricingWidgetInput = {
  /** Pagination: cursor after. */
  after?: InputMaybe<Scalars["String"]["input"]>;
  /** Currency code to filter by. */
  currency: CurrencyCode;
  /** Pagination: first N items. */
  first?: InputMaybe<Scalars["Int"]["input"]>;
  /** Start of the period (optional, defaults to 30 days ago). */
  from?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** End of the period (optional, defaults to now). */
  to?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** The variant ID to get pricing data for. */
  variantId: Scalars["ID"]["input"];
};

/** Pricing widget payload with current price, cost, history and statistics. */
export type ApiPricingWidgetPayload = {
  __typename?: "PricingWidgetPayload";
  /** Current active cost. */
  currentCostPrice?: Maybe<ApiVariantCost>;
  /** Current active price. */
  currentPrice?: Maybe<ApiVariantPrice>;
  /** Price history for the period. */
  history: ApiVariantPriceConnection;
  /** Computed statistics for the period. */
  statistics: ApiVariantPriceHistoryStatistics;
};

/** A product represents an item that can be sold. */
export type ApiProduct = ApiListing &
  ApiNode & {
    __typename?: "Product";
    /** Category assignments with relationship metadata. */
    categoryAssignments: Array<ApiProductCategoryAssignment>;
    /** The date and time when the product was created. */
    createdAt: Scalars["DateTime"]["output"];
    /** The date and time when the product was deleted (soft delete). */
    deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
    /** Product description. */
    description?: Maybe<ApiRichText>;
    /** Short excerpt. */
    excerpt?: Maybe<ApiRichText>;
    /** The features of this product. */
    features: Array<ApiProductFeature>;
    /** The URL-friendly handle for the product. */
    handle: Scalars["String"]["output"];
    /** The Product global ID. */
    id: Scalars["ID"]["output"];
    /** Whether the product is currently published. */
    isPublished: Scalars["Boolean"]["output"];
    /** Media registered on this product. */
    media: Array<ApiProductMediaItem>;
    /** The options available for this product. */
    options: Array<ApiProductOption>;
    /** Current product price range in the selected currency. */
    priceRange?: Maybe<ApiProductPriceRange>;
    /** The primary category assigned to this product. */
    primaryCategory?: Maybe<ApiCategory>;
    /** Product component data, or null when this product has no component configuration. */
    productComponent?: Maybe<ApiProductComponent>;
    /** The date and time when the product was published, or null if unpublished. */
    publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    /** Optimistic locking revision number. Incremented on each update. */
    revision: Scalars["Int"]["output"];
    /** SEO and Open Graph metadata. */
    seo?: Maybe<ApiProductSeo>;
    /** The tags associated with this product. */
    tags: Array<ApiTag>;
    /** Product title. */
    title: Scalars["String"]["output"];
    /** The date and time when the product was last updated. */
    updatedAt: Scalars["DateTime"]["output"];
    /** The variants of this product. */
    variants: ApiVariantConnection;
    /** The total number of variants for this product. */
    variantsCount: Scalars["Int"]["output"];
    /** The vendor associated with this product. */
    vendor?: Maybe<ApiVendor>;
  };

/** A product represents an item that can be sold. */
export type ApiProductVariantsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/**
 * Bulk update input - same structure as productUpdate but for multiple products.
 * Max 100 products, 500 operations total.
 */
export type ApiProductBulkUpdateInput = {
  /** List of products to update with their operations. */
  products: Array<ApiProductBulkUpdateItem>;
};

/** A single product's update within a bulk request. */
export type ApiProductBulkUpdateItem = {
  /** Expected revision for optimistic locking. If provided, fails if product was modified. */
  expectedRevision?: InputMaybe<Scalars["Int"]["input"]>;
  /** Product-level operations. */
  operations?: InputMaybe<ApiProductUpdateInput>;
  /** The product ID to update. */
  productId: Scalars["ID"]["input"];
};

/** Bulk update job with progress. */
export type ApiProductBulkUpdateJob = {
  __typename?: "ProductBulkUpdateJob";
  /** When created. */
  createdAt: Scalars["DateTime"]["output"];
  /** When finished. */
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Job ID. */
  id: Scalars["ID"]["output"];
  /** Items with pagination and filtering. */
  items: ApiBulkUpdateItemConnection;
  /** Progress computed from items. */
  progress: ApiBulkUpdateJobProgress;
  /** When started running. */
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Current status. */
  status: BulkUpdateJobStatus;
  /** Total products in batch. */
  totalProducts: Scalars["Int"]["output"];
};

/** Bulk update job with progress. */
export type ApiProductBulkUpdateJobItemsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  statusFilter?: InputMaybe<Array<BulkUpdateItemStatus>>;
};

export type ApiProductBulkUpdateJobConnection = {
  __typename?: "ProductBulkUpdateJobConnection";
  edges: Array<ApiProductBulkUpdateJobEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiProductBulkUpdateJobEdge = {
  __typename?: "ProductBulkUpdateJobEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProductBulkUpdateJob;
};

/** Result of bulk update start/cancel. */
export type ApiProductBulkUpdatePayload = {
  __typename?: "ProductBulkUpdatePayload";
  /** Created or updated job (null on validation error). */
  job?: Maybe<ApiProductBulkUpdateJob>;
  /** Validation/execution errors. */
  userErrors: Array<ApiBulkUpdateUserError>;
};

export type ApiProductCategoriesScopeInput = {
  mode: CategoryHierarchyScopeMode;
  referenceIds: Array<Scalars["ID"]["input"]>;
};

export type ApiProductCategoryAssignment = {
  __typename?: "ProductCategoryAssignment";
  category: ApiCategory;
  isPrimary: Scalars["Boolean"]["output"];
};

export enum ProductCategoryOperationAction {
  Add = "ADD",
  Move = "MOVE",
  Remove = "REMOVE",
  SetPrimary = "SET_PRIMARY",
}

/** Product category assignment operation for unified product updates. */
export type ApiProductCategoryOperationInput = {
  /** The assignment action to apply. */
  action: ProductCategoryOperationAction;
  /** Move this product after another product in the category listing. */
  afterProductId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Move this product before another product in the category listing. */
  beforeProductId?: InputMaybe<Scalars["ID"]["input"]>;
  /** The category to update for the product. */
  categoryId: Scalars["ID"]["input"];
};

/** Product component configuration associated one-to-one with a Catalog Product. */
export type ApiProductComponent = {
  __typename?: "ProductComponent";
  /** All component configurations associated with this product. */
  configurations: Array<ApiProductComponentConfiguration>;
  /** The date and time when the component data was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Configurator display style. */
  displayStyle: ProductComponentDisplayStyle;
  /** Internal component aggregate ID. */
  id: Scalars["ID"]["output"];
  /** The product that owns this component configuration. */
  product: ApiProduct;
  /** The date and time when the component data was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductComponentAdjustmentPriceRule = ApiNode &
  ApiProductComponentPriceRule & {
    __typename?: "ProductComponentAdjustmentPriceRule";
    /** Currency-specific values for FIXED_AMOUNT adjustments. */
    amounts: Array<ApiProductComponentPriceRuleAmount>;
    /** The globally unique ID of the price rule. */
    id: Scalars["ID"]["output"];
    /** Whether the adjustment decreases or increases the base price. */
    operation: PriceAdjustmentOperation;
    /** Percentage in basis points from 1 to 10000 for PERCENTAGE adjustments. */
    percentageBps?: Maybe<Scalars["Int"]["output"]>;
    /** Apply a fixed-amount or percentage adjustment to the base price. */
    strategy: ProductComponentPriceStrategy;
    /** Whether the adjustment uses a percentage or fixed amount. */
    valueType: PriceAdjustmentValueType;
  };

export type ApiProductComponentBasePriceRule = ApiNode &
  ApiProductComponentPriceRule & {
    __typename?: "ProductComponentBasePriceRule";
    /** The globally unique ID of the price rule. */
    id: Scalars["ID"]["output"];
    /** Use the referenced product or variant base price. */
    strategy: ProductComponentPriceStrategy;
  };

export type ApiProductComponentCondition = ApiNode & {
  __typename?: "ProductComponentCondition";
  /** Condition category. */
  category: ProductComponentConditionCategory;
  /** The globally unique ID of the condition. */
  id: Scalars["ID"]["output"];
  /** Condition operator. */
  operator: ProductComponentConditionOperator;
  /** Sort order within the condition group. */
  sortIndex: Scalars["Int"]["output"];
  /** Condition subject. */
  subject: ProductComponentConditionSubject;
  /** Target ID. Points to an item, group, or component configuration. */
  targetId: Scalars["ID"]["output"];
  /** Target type. */
  targetType: ProductComponentDependencyTargetType;
  /** Numeric value for numeric conditions. */
  value?: Maybe<Scalars["Int"]["output"]>;
};

export enum ProductComponentConditionCategory {
  Numeric = "NUMERIC",
  StateCheck = "STATE_CHECK",
}

export type ApiProductComponentConditionGroup = ApiNode & {
  __typename?: "ProductComponentConditionGroup";
  /** Conditions in this group. */
  conditions: Array<ApiProductComponentCondition>;
  /** The globally unique ID of the condition group. */
  id: Scalars["ID"]["output"];
  /** How conditions are combined. */
  logicOperator: ProductComponentLogicOperator;
  /** Sort order within the rule. */
  sortIndex: Scalars["Int"]["output"];
};

export type ApiProductComponentConditionGroupSyncItemInput = {
  /** Complete list of conditions. */
  conditions: Array<ApiProductComponentConditionSyncItemInput>;
  /** Existing condition group ID. Null creates a new group. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** How conditions are combined. */
  logicOperator: ProductComponentLogicOperator;
  /** Sort order within the rule. */
  sortIndex: Scalars["Int"]["input"];
};

export enum ProductComponentConditionOperator {
  Eq = "EQ",
  Gte = "GTE",
  IsNotSelected = "IS_NOT_SELECTED",
  IsSelected = "IS_SELECTED",
  Lte = "LTE",
}

export enum ProductComponentConditionSubject {
  GroupTotalQty = "GROUP_TOTAL_QTY",
  ItemQty = "ITEM_QTY",
  ItemSelected = "ITEM_SELECTED",
}

export type ApiProductComponentConditionSyncItemInput = {
  /** Condition category. */
  category: ProductComponentConditionCategory;
  /** Existing condition ID. Null creates a new condition. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Condition operator. */
  operator: ProductComponentConditionOperator;
  /** Sort order within the condition group. */
  sortIndex: Scalars["Int"]["input"];
  /** Condition subject. */
  subject: ProductComponentConditionSubject;
  /** Target ID. Points to an item, group, or component configuration. */
  targetId: Scalars["ID"]["input"];
  /** Target type. */
  targetType: ProductComponentDependencyTargetType;
  /** Numeric value for numeric conditions. */
  value?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductComponentConfiguration = ApiNode & {
  __typename?: "ProductComponentConfiguration";
  /** The date and time when the configuration was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Dependency rules in priority order. */
  dependencyRules: Array<ApiProductComponentDependencyRule>;
  /** Groups in configurator order. */
  groups: Array<ApiProductComponentGroup>;
  /** The globally unique ID of the configuration. */
  id: Scalars["ID"]["output"];
  /** Configuration name. */
  name: Scalars["String"]["output"];
  /** Reusable pricing templates. */
  pricingTemplates: Array<ApiProductComponentPricingTemplate>;
  /** The Catalog Product this configuration belongs to. */
  product: ApiProduct;
  /** The date and time when the configuration was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Variants that use this configuration. */
  variants: Array<ApiVariant>;
};

export type ApiProductComponentDependencyAction = ApiNode & {
  __typename?: "ProductComponentDependencyAction";
  /** Action type. */
  actionType: ProductComponentDependencyActionType;
  /** The globally unique ID of the action. */
  id: Scalars["ID"]["output"];
  /** Price rule for ADJUST_PRICE. */
  priceRule?: Maybe<ApiProductComponentPriceRule>;
  /** Required value for SET_REQUIRED. */
  requiredValue?: Maybe<Scalars["Boolean"]["output"]>;
  /** Sort order within the rule. */
  sortIndex: Scalars["Int"]["output"];
  /** Whether this action can stack with other matching actions. */
  stackable: Scalars["Boolean"]["output"];
  /** Target ID. Points to an item, group, or component configuration. */
  targetId: Scalars["ID"]["output"];
  /** Target type. */
  targetType: ProductComponentDependencyTargetType;
};

export type ApiProductComponentDependencyActionSyncItemInput = {
  /** Action type. */
  actionType: ProductComponentDependencyActionType;
  /** Existing action ID. Null creates a new action. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Price rule for ADJUST_PRICE. */
  priceRule?: InputMaybe<ApiProductComponentPriceRuleInput>;
  /** Required value for SET_REQUIRED. */
  requiredValue?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Sort order within the rule. */
  sortIndex: Scalars["Int"]["input"];
  /** Whether this action can stack with other matching actions. */
  stackable: Scalars["Boolean"]["input"];
  /** Target ID. Points to an item, group, or component configuration. */
  targetId: Scalars["ID"]["input"];
  /** Target type. */
  targetType: ProductComponentDependencyTargetType;
};

export enum ProductComponentDependencyActionType {
  AdjustPrice = "ADJUST_PRICE",
  Hide = "HIDE",
  SetRequired = "SET_REQUIRED",
  Show = "SHOW",
}

export type ApiProductComponentDependencyRule = ApiNode & {
  __typename?: "ProductComponentDependencyRule";
  /** Actions applied when conditions match. */
  actions: Array<ApiProductComponentDependencyAction>;
  /** Condition groups. */
  conditionGroups: Array<ApiProductComponentConditionGroup>;
  /** The date and time when the rule was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Whether the rule is enabled. */
  enabled: Scalars["Boolean"]["output"];
  /** The globally unique ID of the dependency rule. */
  id: Scalars["ID"]["output"];
  /** How condition groups are combined. */
  logicOperator: ProductComponentLogicOperator;
  /** Rule name. */
  name: Scalars["String"]["output"];
  /** Rule priority. Lower values are evaluated first. */
  priority: Scalars["Int"]["output"];
  /** The date and time when the rule was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductComponentDependencyRuleSyncItemInput = {
  /** Complete list of actions. */
  actions: Array<ApiProductComponentDependencyActionSyncItemInput>;
  /** Complete list of condition groups. */
  conditionGroups: Array<ApiProductComponentConditionGroupSyncItemInput>;
  /** Whether the rule is enabled. */
  enabled: Scalars["Boolean"]["input"];
  /**
   * Existing dependency rule ID. Null creates a new rule.
   * Existing rules in this configuration but missing from
   * ProductComponentOperationInput.dependencyRules are deleted.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** How condition groups are combined. */
  logicOperator: ProductComponentLogicOperator;
  /** Rule name. */
  name: Scalars["String"]["input"];
  /** Rule priority. */
  priority: Scalars["Int"]["input"];
};

export enum ProductComponentDependencyTargetType {
  Configuration = "CONFIGURATION",
  Group = "GROUP",
  Item = "ITEM",
}

export enum ProductComponentDisplayStyle {
  Accordion = "ACCORDION",
  Flat = "FLAT",
  Tabs = "TABS",
  Wizard = "WIZARD",
}

export type ApiProductComponentFreePriceRule = ApiNode &
  ApiProductComponentPriceRule & {
    __typename?: "ProductComponentFreePriceRule";
    /** The globally unique ID of the price rule. */
    id: Scalars["ID"]["output"];
    /** Set the component item price to zero. */
    strategy: ProductComponentPriceStrategy;
  };

export type ApiProductComponentGroup = ApiNode & {
  __typename?: "ProductComponentGroup";
  /** The date and time when the group was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The globally unique ID of the group. */
  id: Scalars["ID"]["output"];
  /** Items in group order. */
  items: Array<ApiProductComponentItem>;
  /** Maximum selected items in this group. Null means no maximum. */
  maxSelection?: Maybe<Scalars["Int"]["output"]>;
  /** Minimum selected items in this group. Null means no minimum. */
  minSelection?: Maybe<Scalars["Int"]["output"]>;
  /** Sort order within the configuration. */
  sortIndex: Scalars["Int"]["output"];
  /** Display title from current locale. */
  title: Scalars["String"]["output"];
  /** The date and time when the group was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductComponentGroupSyncItemInput = {
  /**
   * Existing group ID. Null creates a new group.
   * Existing groups in this configuration but missing from
   * ProductComponentOperationInput.groups are deleted.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Complete list of items inside this group. */
  items: Array<ApiProductComponentItemSyncItemInput>;
  maxSelection?: InputMaybe<Scalars["Int"]["input"]>;
  minSelection?: InputMaybe<Scalars["Int"]["input"]>;
  /** Sort order within the configuration. */
  sortIndex: Scalars["Int"]["input"];
  /** Localized title for current locale. */
  title: Scalars["String"]["input"];
};

export type ApiProductComponentItem = ApiNode & {
  __typename?: "ProductComponentItem";
  /** The date and time when the item was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** Default quantity. */
  defaultQty?: Maybe<Scalars["Int"]["output"]>;
  /** Featured image override. */
  featuredImage?: Maybe<ApiFile>;
  /** The group this item belongs to. */
  group: ApiProductComponentGroup;
  /** The globally unique ID of the item. */
  id: Scalars["ID"]["output"];
  /** Whether the item references a product or a concrete variant. */
  itemType: ProductComponentItemType;
  /** Maximum selectable quantity. Null means unlimited. */
  maxQty?: Maybe<Scalars["Int"]["output"]>;
  /** Minimum selectable quantity. */
  minQty?: Maybe<Scalars["Int"]["output"]>;
  /** Allowed option/value selections for PRODUCT items. */
  optionSelections: Array<ApiProductComponentItemOptionSelection>;
  /** Inline price rule. Null when pricingTemplate is used. */
  priceRule?: Maybe<ApiProductComponentPriceRule>;
  /** Reusable pricing template. Null when inline priceRule is used. */
  pricingTemplate?: Maybe<ApiProductComponentPricingTemplate>;
  /** Referenced product for PRODUCT items. */
  refProduct?: Maybe<ApiProduct>;
  /** Referenced variant for VARIANT items. */
  refVariant?: Maybe<ApiVariant>;
  /** Whether item is selected by default. */
  selected: Scalars["Boolean"]["output"];
  /** Sort order within the group. */
  sortIndex: Scalars["Int"]["output"];
  /** Optional display title override from current locale. */
  title?: Maybe<Scalars["String"]["output"]>;
  /** The date and time when the item was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Whether item is visible in the configurator. */
  visible: Scalars["Boolean"]["output"];
};

export type ApiProductComponentItemOptionSelection = ApiNode & {
  __typename?: "ProductComponentItemOptionSelection";
  /** The globally unique ID of the option selection. */
  id: Scalars["ID"]["output"];
  /** Referenced product option. */
  option: ApiProductOption;
  /** Parent option for dependent option trees. */
  parentOption?: Maybe<ApiProductOption>;
  /** Sort order within item option selections. */
  sortIndex: Scalars["Int"]["output"];
  /** Allowed values for this option. */
  values: Array<ApiProductComponentItemOptionValueSelection>;
};

export type ApiProductComponentItemOptionSelectionSyncItemInput = {
  /** Existing option selection ID. Null creates a new option selection. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Referenced product option ID. */
  optionId: Scalars["ID"]["input"];
  /** Parent option ID for dependent option trees. */
  parentOptionId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Sort order within option selections. */
  sortIndex: Scalars["Int"]["input"];
  /** Complete list of option value selections. */
  values: Array<ApiProductComponentItemOptionValueSelectionSyncItemInput>;
};

export type ApiProductComponentItemOptionValueSelection = ApiNode & {
  __typename?: "ProductComponentItemOptionValueSelection";
  /** The globally unique ID of the option value selection. */
  id: Scalars["ID"]["output"];
  /** Referenced product option value. Null when the value is unavailable. */
  optionValue?: Maybe<ApiProductOptionValue>;
  /** Sort order within option values. */
  sortIndex: Scalars["Int"]["output"];
  /** Selection status. */
  status: ProductComponentItemOptionValueSelectionStatus;
  /** Stable value copy for displaying stale/unavailable values. */
  value: Scalars["String"]["output"];
};

export enum ProductComponentItemOptionValueSelectionStatus {
  Deselected = "DESELECTED",
  New = "NEW",
  Selected = "SELECTED",
  Unavailable = "UNAVAILABLE",
}

export type ApiProductComponentItemOptionValueSelectionSyncItemInput = {
  /** Existing value selection ID. Null creates a new value selection. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Referenced product option value ID. */
  optionValueId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Sort order within option values. */
  sortIndex: Scalars["Int"]["input"];
  /** Selection status. */
  status: ProductComponentItemOptionValueSelectionStatus;
  /** Stable value copy for displaying stale/unavailable values. */
  value: Scalars["String"]["input"];
};

export type ApiProductComponentItemSyncItemInput = {
  /** Default quantity. */
  defaultQty?: InputMaybe<Scalars["Int"]["input"]>;
  /** Featured image override. */
  featuredImageId?: InputMaybe<Scalars["ID"]["input"]>;
  /**
   * Existing item ID. Null creates a new item.
   * Existing items in this group but missing from ProductComponentGroupSyncItemInput.items are deleted.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Whether the item references a product or a concrete variant. */
  itemType: ProductComponentItemType;
  /** Maximum selectable quantity. */
  maxQty?: InputMaybe<Scalars["Int"]["input"]>;
  /** Minimum selectable quantity. */
  minQty?: InputMaybe<Scalars["Int"]["input"]>;
  /** Allowed option/value selections for PRODUCT items. */
  optionSelections?: InputMaybe<Array<ApiProductComponentItemOptionSelectionSyncItemInput>>;
  /** Inline price rule. Cannot be used together with pricingTemplateId. */
  priceRule?: InputMaybe<ApiProductComponentPriceRuleInput>;
  /** Reusable pricing template ID. Cannot be used together with priceRule. */
  pricingTemplateId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Referenced product ID for PRODUCT items. */
  refProductId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Referenced variant ID for VARIANT items. */
  refVariantId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Whether item is selected by default. */
  selected: Scalars["Boolean"]["input"];
  /** Sort order within the group. */
  sortIndex: Scalars["Int"]["input"];
  /** Optional localized title override for current locale. */
  title?: InputMaybe<Scalars["String"]["input"]>;
  /** Whether item is visible in the configurator. */
  visible: Scalars["Boolean"]["input"];
};

export enum ProductComponentItemType {
  Product = "PRODUCT",
  Variant = "VARIANT",
}

export enum ProductComponentLogicOperator {
  And = "AND",
  Or = "OR",
}

/**
 * Product component operation in the unified product update.
 *
 * The owning product and expected revision are provided by productUpdate.
 * Fields that are not used by the selected action must be omitted.
 */
export enum ProductComponentOperationAction {
  ConfigurationCreate = "CONFIGURATION_CREATE",
  ConfigurationDelete = "CONFIGURATION_DELETE",
  ConfigurationUpdate = "CONFIGURATION_UPDATE",
  DependencyRulesSync = "DEPENDENCY_RULES_SYNC",
  GroupsSync = "GROUPS_SYNC",
  PricingTemplatesSync = "PRICING_TEMPLATES_SYNC",
  Remove = "REMOVE",
  SettingsUpdate = "SETTINGS_UPDATE",
}

/** A single product component operation. */
export type ApiProductComponentOperationInput = {
  /** The operation to apply. */
  action: ProductComponentOperationAction;
  /** Per-request correlation key. Required for CONFIGURATION_CREATE. */
  clientMutationId?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * Existing configuration ID.
   * Required for configuration update/delete and all configuration sync actions.
   */
  configurationId?: InputMaybe<Scalars["ID"]["input"]>;
  /**
   * Complete list of dependency rules for DEPENDENCY_RULES_SYNC.
   * Rules not present in this list are deleted.
   */
  dependencyRules?: InputMaybe<Array<ApiProductComponentDependencyRuleSyncItemInput>>;
  /** Updated configurator display style. Used by SETTINGS_UPDATE. */
  displayStyle?: InputMaybe<ProductComponentDisplayStyle>;
  /**
   * Complete list of groups for GROUPS_SYNC.
   * Groups not present in this list are deleted.
   */
  groups?: InputMaybe<Array<ApiProductComponentGroupSyncItemInput>>;
  /** Configuration name. Required for CONFIGURATION_CREATE. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * Complete list of pricing templates for PRICING_TEMPLATES_SYNC.
   * Templates not present in this list are deleted.
   */
  pricingTemplates?: InputMaybe<Array<ApiProductComponentPricingTemplateSyncItemInput>>;
};

export type ApiProductComponentOverridePriceRule = ApiNode &
  ApiProductComponentPriceRule & {
    __typename?: "ProductComponentOverridePriceRule";
    /** Currency-specific absolute prices. */
    amounts: Array<ApiProductComponentPriceRuleAmount>;
    /** The globally unique ID of the price rule. */
    id: Scalars["ID"]["output"];
    /** Replace the base price with a currency-specific absolute price. */
    strategy: ProductComponentPriceStrategy;
  };

export type ApiProductComponentPriceRule = {
  /** The globally unique ID of the price rule. */
  id: Scalars["ID"]["output"];
  /** How this rule derives the component item price. */
  strategy: ProductComponentPriceStrategy;
};

export type ApiProductComponentPriceRuleAmount = {
  __typename?: "ProductComponentPriceRuleAmount";
  /** Positive amount in minor units. */
  amountMinor: Scalars["BigInt"]["output"];
  /** The currency code. */
  currency: CurrencyCode;
};

export type ApiProductComponentPriceRuleAmountInput = {
  /** Positive amount in minor units. */
  amountMinor: Scalars["BigInt"]["input"];
  /** The currency code. */
  currency: CurrencyCode;
};

export type ApiProductComponentPriceRuleInput = {
  /** Currency-specific values for FIXED_AMOUNT adjustments and OVERRIDE rules. */
  amounts?: InputMaybe<Array<ApiProductComponentPriceRuleAmountInput>>;
  /** Existing price rule ID. Null creates a new price rule. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Required for ADJUSTMENT rules. */
  operation?: InputMaybe<PriceAdjustmentOperation>;
  /** Percentage in basis points from 1 to 10000 for PERCENTAGE adjustments. */
  percentageBps?: InputMaybe<Scalars["Int"]["input"]>;
  /** How this rule derives the component item price. */
  strategy: ProductComponentPriceStrategy;
  /** Required for ADJUSTMENT rules. */
  valueType?: InputMaybe<PriceAdjustmentValueType>;
};

export enum ProductComponentPriceStrategy {
  Adjustment = "ADJUSTMENT",
  Base = "BASE",
  Free = "FREE",
  Override = "OVERRIDE",
}

export type ApiProductComponentPricingTemplate = ApiNode & {
  __typename?: "ProductComponentPricingTemplate";
  /** The globally unique ID of the pricing template. */
  id: Scalars["ID"]["output"];
  /** Template name. */
  name: Scalars["String"]["output"];
  /** Reusable price rule. */
  priceRule: ApiProductComponentPriceRule;
  /** Sort order within configuration. */
  sortIndex: Scalars["Int"]["output"];
};

export type ApiProductComponentPricingTemplateSyncItemInput = {
  /**
   * Existing pricing template ID. Null creates a new template.
   * Existing templates in this configuration but missing from
   * ProductComponentOperationInput.pricingTemplates are deleted.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Template name. */
  name: Scalars["String"]["input"];
  /** Reusable price rule. */
  priceRule: ApiProductComponentPriceRuleInput;
  /** Sort order within configuration. */
  sortIndex: Scalars["Int"]["input"];
};

/** A connection to a list of Product items. */
export type ApiProductConnection = {
  __typename?: "ProductConnection";
  /** A list of edges. */
  edges: Array<ApiProductEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of products. */
  totalCount: Scalars["Int"]["output"];
};

/** Input for product content (description, excerpt). */
export type ApiProductContentInput = {
  /** Product description in multiple formats. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<ApiRichTextInput>;
};

/** Input for creating a product with all its data in one request. */
export type ApiProductCreateInput = {
  /** Product description. */
  description?: InputMaybe<ApiRichTextInput>;
  /** Short excerpt in multiple formats. */
  excerpt?: InputMaybe<ApiRichTextInput>;
  /** URL-friendly handle for the product. */
  handle: Scalars["String"]["input"];
  /** Inventory tracking settings for the product. */
  inventoryItem?: InputMaybe<ApiInventoryItemInput>;
  /** File IDs for product media (already uploaded via mediaMutation.fileUpload). */
  mediaFileIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Product options (e.g., Color, Size). */
  options?: InputMaybe<Array<ApiProductCreateOptionInput>>;
  /** Product title. */
  title: Scalars["String"]["input"];
  /** Variants to create (only enabled ones from UI). */
  variants?: InputMaybe<Array<ApiProductCreateVariantInput>>;
  /** Vendor ID to associate with the product. */
  vendorId?: InputMaybe<Scalars["ID"]["input"]>;
};

/** Input for creating an option during product creation. */
export type ApiProductCreateOptionInput = {
  /** Category assigned to the option. */
  categoryId: Scalars["ID"]["input"];
  /** Display name for the option. */
  name: Scalars["String"]["input"];
  /** URL-friendly slug for the option. */
  slug: Scalars["String"]["input"];
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  /** The values for this option. */
  values: Array<ApiProductCreateOptionValueInput>;
};

/** Input for creating an option value during product creation. */
export type ApiProductCreateOptionValueInput = {
  /** Display name for the value. */
  name: Scalars["String"]["input"];
  /** URL-friendly slug for the value. */
  slug: Scalars["String"]["input"];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Payload for product creation. */
export type ApiProductCreatePayload = {
  __typename?: "ProductCreatePayload";
  /** The created product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for creating a variant during product creation. */
export type ApiProductCreateVariantInput = {
  /** Handle built from option value slugs (e.g., "red-s"). */
  handle: Scalars["String"]["input"];
};

/** Input for deleting a product. */
export type ApiProductDeleteInput = {
  /** The ID of the product to delete. */
  id: Scalars["ID"]["input"];
  /** Whether to permanently delete the product (hard delete). */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Payload for product deletion. */
export type ApiProductDeletePayload = {
  __typename?: "ProductDeletePayload";
  /** The ID of the deleted product. */
  deletedProductId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Product connection. */
export type ApiProductEdge = {
  __typename?: "ProductEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiProduct;
};

/** A product feature represents either a group or an attribute. */
export type ApiProductFeature = ApiNode & {
  __typename?: "ProductFeature";
  /** Child features. Returns empty array for attributes (isGroup = false). */
  children: Array<ApiProductFeature>;
  /** Whether this feature should be highlighted in product presentation. */
  featured: Scalars["Boolean"]["output"];
  /** The globally unique ID of the feature. */
  id: Scalars["ID"]["output"];
  /** Tree position as array: [0] for root, [0, 1] for child of first group. */
  index: Array<Scalars["Int"]["output"]>;
  /** Whether this feature is a group (container) or an attribute (leaf). */
  isGroup: Scalars["Boolean"]["output"];
  /** Display name (from translations). */
  name: Scalars["String"]["output"];
  /** Parent group, if this feature belongs to a group. */
  parent?: Maybe<ApiProductFeature>;
  /** The URL-friendly slug for this feature. */
  slug: Scalars["String"]["output"];
  /** Values. Returns empty array for groups (isGroup = true). */
  values: Array<ApiProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ApiProductFeatureCreateInput = {
  /** Whether this feature should be highlighted in product presentation. */
  featured?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The ID of the product. */
  productId: Scalars["ID"]["input"];
  /** The URL-friendly slug for the feature. */
  slug: Scalars["String"]["input"];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

/** Payload for feature create. */
export type ApiProductFeatureCreatePayload = {
  __typename?: "ProductFeatureCreatePayload";
  /** The created feature. */
  feature?: Maybe<ApiProductFeature>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a feature from a product. */
export type ApiProductFeatureDeleteInput = {
  /** The ID of the feature to delete. */
  id: Scalars["ID"]["input"];
};

/** Payload for feature delete. */
export type ApiProductFeatureDeletePayload = {
  __typename?: "ProductFeatureDeletePayload";
  /** The ID of the deleted feature. */
  deletedFeatureId?: Maybe<Scalars["ID"]["output"]>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for creating a feature during product creation. */
export type ApiProductFeatureInput = {
  /** Whether this feature should be highlighted in product presentation. */
  featured?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for the feature. */
  slug: Scalars["String"]["input"];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

export type ApiProductFeatureSyncItemInput = {
  /** Whether this feature should be highlighted in product presentation. */
  featured?: Scalars["Boolean"]["input"];
  /**
   * Database ID. Null for new records.
   * - If provided: update existing feature
   * - If null/omitted: create new feature (backend generates ID)
   * Features in DB but not in this list will be DELETED.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /**
   * Tree position as integer array.
   * - [0], [1], [2] for root items
   * - [0, 0], [0, 1], [1, 0] for children
   * Parent is derived: parent of [0, 1] is [0].
   * Groups must have length 1 (root only).
   */
  index: Array<Scalars["Int"]["input"]>;
  /** Whether this is a group (true) or attribute (false). */
  isGroup: Scalars["Boolean"]["input"];
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for this feature. */
  slug: Scalars["String"]["input"];
  /** Values for this feature (only when isGroup = false). */
  values?: InputMaybe<Array<ApiProductFeatureValueSyncInput>>;
};

/** Input for updating a feature. */
export type ApiProductFeatureUpdateInput = {
  /** Whether this feature should be highlighted in product presentation. */
  featured?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The ID of the feature to update. */
  id: Scalars["ID"]["input"];
  /** Display name. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** The URL-friendly slug for the feature. */
  slug?: InputMaybe<Scalars["String"]["input"]>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductFeatureValuesInput>;
};

/** Payload for feature update. */
export type ApiProductFeatureUpdatePayload = {
  __typename?: "ProductFeatureUpdatePayload";
  /** The updated feature. */
  feature?: Maybe<ApiProductFeature>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product feature. */
export type ApiProductFeatureValue = ApiNode & {
  __typename?: "ProductFeatureValue";
  /** The globally unique ID of the feature value. */
  id: Scalars["ID"]["output"];
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars["Int"]["output"];
  /** Display name (from translations). */
  name: Scalars["String"]["output"];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars["String"]["output"];
};

/** Input for creating a feature value. */
export type ApiProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars["String"]["input"];
};

export type ApiProductFeatureValueSyncInput = {
  /** Database ID. Null for new records. */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Position within the feature's values (0, 1, 2, ...). */
  index: Scalars["Int"]["input"];
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for this feature value. */
  slug: Scalars["String"]["input"];
};

/** Input for updating an existing feature value. */
export type ApiProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars["ID"]["input"];
  /** Display name. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** The URL-friendly slug for this value. */
  slug?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for nested value operations in feature update. */
export type ApiProductFeatureValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductFeatureValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductFeatureValueUpdateInput>>;
};

/** Sync all product features in a single transaction. */
export type ApiProductFeaturesSyncInput = {
  /** Complete list of features (replaces all existing features). */
  features: Array<ApiProductFeatureSyncItemInput>;
  /** The ID of the product. */
  productId: Scalars["ID"]["input"];
};

export type ApiProductFeaturesSyncPayload = {
  __typename?: "ProductFeaturesSyncPayload";
  /** List of all synced features with their final IDs. */
  features: Array<ApiProductFeature>;
  /** The updated product. */
  product?: Maybe<ApiProduct>;
  /** Any validation errors. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductInventoryWidget = {
  __typename?: "ProductInventoryWidget";
  alertThreshold: ApiInventoryAlertThreshold;
  availableChange7d: Scalars["Int"]["output"];
  backorder: ApiInventoryBackorder;
  quantities: ApiInventoryQuantities;
  skuStatus: ApiInventorySkuStatus;
};

/** Input for product media. */
export type ApiProductMediaInput = {
  /** File IDs for product media. */
  fileIds: Array<Scalars["ID"]["input"]>;
};

/** Media registered on a product with sort order. */
export type ApiProductMediaItem = {
  __typename?: "ProductMediaItem";
  /** The file from the Media service. */
  file: ApiFile;
  /** Sort order index (lower = first). */
  sortIndex: Scalars["Int"]["output"];
};

/** A product option defines a configurable aspect of a product, such as Size or Color. */
export type ApiProductOption = ApiNode & {
  __typename?: "ProductOption";
  /** The reusable category assigned to this option. */
  category: ApiProductOptionCategory;
  /** The globally unique ID of the option. */
  id: Scalars["ID"]["output"];
  /** Display name. */
  name: Scalars["String"]["output"];
  /** The URL-friendly identifier for this option. */
  slug: Scalars["String"]["output"];
  /** Sort order within the product options list. */
  sortIndex: Scalars["Int"]["output"];
  /** The available values for this option. */
  values: Array<ApiProductOptionValue>;
};

/** A reusable category for grouping product options, such as color or size. */
export type ApiProductOptionCategory = ApiNode & {
  __typename?: "ProductOptionCategory";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  slug: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductOptionCategoryConnection = {
  __typename?: "ProductOptionCategoryConnection";
  edges: Array<ApiProductOptionCategoryEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiProductOptionCategoryCreateInput = {
  name: Scalars["String"]["input"];
  slug: Scalars["String"]["input"];
};

export type ApiProductOptionCategoryCreatePayload = {
  __typename?: "ProductOptionCategoryCreatePayload";
  category?: Maybe<ApiProductOptionCategory>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductOptionCategoryDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiProductOptionCategoryDeletePayload = {
  __typename?: "ProductOptionCategoryDeletePayload";
  deletedCategoryId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductOptionCategoryEdge = {
  __typename?: "ProductOptionCategoryEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProductOptionCategory;
};

/** Ordering configuration for ProductOptionCategory */
export type ApiProductOptionCategoryOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductOptionCategoryOrderField;
};

/** Fields available for sorting ProductOptionCategory */
export enum ProductOptionCategoryOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
  /** Sort by slug */
  Slug = "slug",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiProductOptionCategoryUpdateInput = {
  id: Scalars["ID"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
  slug?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiProductOptionCategoryUpdatePayload = {
  __typename?: "ProductOptionCategoryUpdatePayload";
  category?: Maybe<ApiProductOptionCategory>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ProductOptionCategory */
export type ApiProductOptionCategoryWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductOptionCategoryWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductOptionCategoryWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductOptionCategoryWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by slug */
  slug?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Input for creating an option on a product. */
export type ApiProductOptionCreateInput = {
  /** The category assigned to the option. */
  categoryId: Scalars["ID"]["input"];
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The ID of the product (optional when creating with product). */
  productId?: InputMaybe<Scalars["ID"]["input"]>;
  /** The URL-friendly slug for the option. */
  slug: Scalars["String"]["input"];
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  /** The values for this option. */
  values: Array<ApiProductOptionValueCreateInput>;
};

/** Payload for option create. Returns the product with new variants. */
export type ApiProductOptionCreatePayload = {
  __typename?: "ProductOptionCreatePayload";
  /** The created option. */
  option?: Maybe<ApiProductOption>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting an option from a product. */
export type ApiProductOptionDeleteInput = {
  /** The ID of the option to delete. */
  id: Scalars["ID"]["input"];
};

/** Payload for option delete. */
export type ApiProductOptionDeletePayload = {
  __typename?: "ProductOptionDeletePayload";
  /** The ID of the deleted option. */
  deletedOptionId?: Maybe<Scalars["ID"]["output"]>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A visual swatch for representing an option value. */
export type ApiProductOptionSwatch = ApiNode & {
  __typename?: "ProductOptionSwatch";
  /** The primary color (hex code or color name). */
  colorOne?: Maybe<Scalars["String"]["output"]>;
  /** The secondary color for gradients. */
  colorTwo?: Maybe<Scalars["String"]["output"]>;
  /** The file for image-based swatches. */
  file?: Maybe<ApiFile>;
  /** The globally unique ID of the swatch. */
  id: Scalars["ID"]["output"];
  /** Additional metadata for the swatch. */
  metadata?: Maybe<Scalars["JSON"]["output"]>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for creating/updating a swatch. */
export type ApiProductOptionSwatchInput = {
  /** The primary color (hex code or color name). */
  colorOne?: InputMaybe<Scalars["String"]["input"]>;
  /** The secondary color for gradients. */
  colorTwo?: InputMaybe<Scalars["String"]["input"]>;
  /** The file ID for image-based swatches. */
  fileId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Additional metadata. */
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for syncing a single option. */
export type ApiProductOptionSyncItemInput = {
  /** The category assigned to the option. */
  categoryId: Scalars["ID"]["input"];
  /** Existing option ID (null = create new). */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for the option. */
  slug: Scalars["String"]["input"];
  /** Sort order within the product options list. */
  sortIndex: Scalars["Int"]["input"];
  /** The values for this option. */
  values: Array<ApiProductOptionValueSyncInput>;
};

/** Input for updating an option. */
export type ApiProductOptionUpdateInput = {
  /** The new category assigned to the option. */
  categoryId?: InputMaybe<Scalars["ID"]["input"]>;
  /** The ID of the option to update. */
  id: Scalars["ID"]["input"];
  /** Display name. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** The new slug for the option. */
  slug?: InputMaybe<Scalars["String"]["input"]>;
  /** Sort order within the product options list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductOptionValuesInput>;
};

/** Payload for option update. */
export type ApiProductOptionUpdatePayload = {
  __typename?: "ProductOptionUpdatePayload";
  /** The updated option. */
  option?: Maybe<ApiProductOption>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product option, such as "Red" for Color or "Large" for Size. */
export type ApiProductOptionValue = ApiNode & {
  __typename?: "ProductOptionValue";
  /** The globally unique ID of the option value. */
  id: Scalars["ID"]["output"];
  /** Display name. */
  name: Scalars["String"]["output"];
  /** The URL-friendly identifier for this value. */
  slug: Scalars["String"]["output"];
  /** Sort order within the option values list. */
  sortIndex: Scalars["Int"]["output"];
  /** The visual swatch for this value (if applicable). */
  swatch?: Maybe<ApiProductOptionSwatch>;
};

/** Input for creating an option value. */
export type ApiProductOptionValueCreateInput = {
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for the value. */
  slug: Scalars["String"]["input"];
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for syncing a single option value. */
export type ApiProductOptionValueSyncInput = {
  /** Existing value ID (null = create new). */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** Display name. */
  name: Scalars["String"]["input"];
  /** The URL-friendly slug for the value. */
  slug: Scalars["String"]["input"];
  /** Sort order within the option values list. */
  sortIndex: Scalars["Int"]["input"];
  /** The swatch for this value (null to remove). */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for updating an existing option value. */
export type ApiProductOptionValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars["ID"]["input"];
  /** Display name. */
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars["String"]["input"]>;
  /** Sort order within the option values list. */
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for nested value operations in option update. */
export type ApiProductOptionValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductOptionValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductOptionValueUpdateInput>>;
};

/** Input for syncing all product options. */
export type ApiProductOptionsSyncInput = {
  /** Complete list of options (replaces existing). */
  options: Array<ApiProductOptionSyncItemInput>;
  /** The product to sync options for. */
  productId: Scalars["ID"]["input"];
};

/** Payload for options sync mutation. */
export type ApiProductOptionsSyncPayload = {
  __typename?: "ProductOptionsSyncPayload";
  /** All synced options with final IDs. */
  options: Array<ApiProductOption>;
  /** The product with updated options. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred. */
  userErrors: Array<ApiGenericUserError>;
};

/** Ordering configuration for Product */
export type ApiProductOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductOrderField;
};

/** Fields available for sorting Product */
export enum ProductOrderField {
  /** Sort by brandName */
  BrandName = "brandName",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by currency */
  Currency = "currency",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by maxAmountMinor */
  MaxAmountMinor = "maxAmountMinor",
  /** Sort by maxPriceMinor */
  MaxPriceMinor = "maxPriceMinor",
  /** Sort by minAmountMinor */
  MinAmountMinor = "minAmountMinor",
  /** Sort by minPriceMinor */
  MinPriceMinor = "minPriceMinor",
  /** Sort by name */
  Name = "name",
  /** Sort by primaryCategoryId */
  PrimaryCategoryId = "primaryCategoryId",
  /** Sort by primaryCategoryName */
  PrimaryCategoryName = "primaryCategoryName",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by vendorId */
  VendorId = "vendorId",
}

export type ApiProductPriceRange = {
  __typename?: "ProductPriceRange";
  /** Currency code used for the returned price amounts. */
  currency: CurrencyCode;
  /** Maximum product price amount in minor units. */
  maxPriceAmount: Scalars["BigInt"]["output"];
  /** Minimum product price amount in minor units. */
  minPriceAmount: Scalars["BigInt"]["output"];
};

export type ApiProductProductsMetaInput = {
  categoriesScope?: InputMaybe<ApiProductCategoriesScopeInput>;
};

export type ApiProductQuestion = ApiNode &
  ApiReviewContent & {
    __typename?: "ProductQuestion";
    answerState: ProductQuestionAnswerState;
    answers: ApiProductQuestionAnswerConnection;
    author: ApiReviewContentAuthor;
    body: Scalars["String"]["output"];
    createdAt: Scalars["DateTime"]["output"];
    deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
    externalReferences: ApiReviewContentExternalReferenceConnection;
    id: Scalars["ID"]["output"];
    idempotencyKey?: Maybe<Scalars["String"]["output"]>;
    kind: ReviewContentKind;
    locale: LocaleCode;
    metrics: ApiReviewContentMetrics;
    moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
    moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
    moderationCases: ApiReviewModerationCaseConnection;
    moderationEvents: ApiReviewModerationEventConnection;
    moderationNote?: Maybe<Scalars["String"]["output"]>;
    moderationSignals: ApiReviewModerationSignalConnection;
    product: ApiProduct;
    publications: Array<ApiReviewContentPublication>;
    publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
    reports: ApiReviewContentReportConnection;
    revision: Scalars["Int"]["output"];
    revisions: ApiReviewContentRevisionConnection;
    sourceChannel: Scalars["String"]["output"];
    sourceMetadata: Scalars["JSON"]["output"];
    status: ReviewContentStatus;
    subscriptions: ApiProductQuestionSubscriptionConnection;
    title?: Maybe<Scalars["String"]["output"]>;
    translations: Array<ApiReviewContentTranslation>;
    unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    updatedAt: Scalars["DateTime"]["output"];
    variant?: Maybe<ApiVariant>;
    votes: ApiReviewContentVoteConnection;
  };

export type ApiProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
};

export type ApiProductQuestionExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionModerationEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionModerationSignalsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionRevisionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionSubscriptionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionVotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswer = ApiNode &
  ApiReviewContent & {
    __typename?: "ProductQuestionAnswer";
    author: ApiReviewContentAuthor;
    body: Scalars["String"]["output"];
    createdAt: Scalars["DateTime"]["output"];
    deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
    externalReferences: ApiReviewContentExternalReferenceConnection;
    id: Scalars["ID"]["output"];
    idempotencyKey?: Maybe<Scalars["String"]["output"]>;
    isAccepted: Scalars["Boolean"]["output"];
    isOfficial: Scalars["Boolean"]["output"];
    kind: ReviewContentKind;
    locale: LocaleCode;
    metrics: ApiReviewContentMetrics;
    moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
    moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
    moderationCases: ApiReviewModerationCaseConnection;
    moderationEvents: ApiReviewModerationEventConnection;
    moderationNote?: Maybe<Scalars["String"]["output"]>;
    moderationSignals: ApiReviewModerationSignalConnection;
    publications: Array<ApiReviewContentPublication>;
    publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    question: ApiProductQuestion;
    redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
    reports: ApiReviewContentReportConnection;
    revision: Scalars["Int"]["output"];
    revisions: ApiReviewContentRevisionConnection;
    sortIndex: Scalars["Int"]["output"];
    sourceChannel: Scalars["String"]["output"];
    sourceMetadata: Scalars["JSON"]["output"];
    status: ReviewContentStatus;
    title?: Maybe<Scalars["String"]["output"]>;
    translations: Array<ApiReviewContentTranslation>;
    unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    updatedAt: Scalars["DateTime"]["output"];
    votes: ApiReviewContentVoteConnection;
  };

export type ApiProductQuestionAnswerExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerModerationEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerModerationSignalsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerRevisionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerVotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerConnection = {
  __typename?: "ProductQuestionAnswerConnection";
  edges: Array<ApiProductQuestionAnswerEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiProductQuestionAnswerCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars["String"]["input"]>;
  content: ApiReviewContentCreateInput;
  isAccepted?: InputMaybe<Scalars["Boolean"]["input"]>;
  isOfficial?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiProductQuestionAnswerDeleteOperationInput = {
  answerId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiProductQuestionAnswerEdge = {
  __typename?: "ProductQuestionAnswerEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProductQuestionAnswer;
};

/** Ordering configuration for ProductQuestionAnswer */
export type ApiProductQuestionAnswerOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionAnswerOrderField;
};

/** Fields available for sorting ProductQuestionAnswer */
export enum ProductQuestionAnswerOrderField {
  /** Sort by authorType */
  AuthorType = "authorType",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isAccepted */
  IsAccepted = "isAccepted",
  /** Sort by isOfficial */
  IsOfficial = "isOfficial",
  /** Sort by likeCount */
  LikeCount = "likeCount",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by questionId */
  QuestionId = "questionId",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by sortIndex */
  SortIndex = "sortIndex",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiProductQuestionAnswerPropertiesUpdateInput = {
  isAccepted?: InputMaybe<Scalars["Boolean"]["input"]>;
  isOfficial?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

export enum ProductQuestionAnswerState {
  Answered = "ANSWERED",
  Unanswered = "UNANSWERED",
}

export type ApiProductQuestionAnswerUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  properties?: InputMaybe<ApiProductQuestionAnswerPropertiesUpdateInput>;
};

export type ApiProductQuestionAnswerUpdateOperationInput = {
  answerId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  operations: ApiProductQuestionAnswerUpdateInput;
};

/** Filter conditions for ProductQuestionAnswer */
export type ApiProductQuestionAnswerWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductQuestionAnswerWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductQuestionAnswerWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isAccepted */
  isAccepted?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<ApiBooleanFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiStringFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by questionId */
  questionId?: InputMaybe<ApiIdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiProductQuestionAnswersUpdateInput = {
  create?: InputMaybe<Array<ApiProductQuestionAnswerCreateOperationInput>>;
  delete?: InputMaybe<Array<ApiProductQuestionAnswerDeleteOperationInput>>;
  update?: InputMaybe<Array<ApiProductQuestionAnswerUpdateOperationInput>>;
};

export type ApiProductQuestionConnection = {
  __typename?: "ProductQuestionConnection";
  edges: Array<ApiProductQuestionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiProductQuestionCreateInput = {
  content: ApiReviewContentCreateInput;
  productId: Scalars["ID"]["input"];
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiProductQuestionCreatePayload = {
  __typename?: "ProductQuestionCreatePayload";
  productQuestion?: Maybe<ApiProductQuestion>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionDeletePayload = {
  __typename?: "ProductQuestionDeletePayload";
  deletedProductQuestionId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProductQuestionEdge = {
  __typename?: "ProductQuestionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProductQuestion;
};

/** Ordering configuration for ProductQuestion */
export type ApiProductQuestionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ProductQuestionOrderField;
};

/** Fields available for sorting ProductQuestion */
export enum ProductQuestionOrderField {
  /** Sort by acceptedAnswerCount */
  AcceptedAnswerCount = "acceptedAnswerCount",
  /** Sort by answerCount */
  AnswerCount = "answerCount",
  /** Sort by answerState */
  AnswerState = "answerState",
  /** Sort by authorDisplayName */
  AuthorDisplayName = "authorDisplayName",
  /** Sort by authorType */
  AuthorType = "authorType",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by likeCount */
  LikeCount = "likeCount",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by officialAnswerCount */
  OfficialAnswerCount = "officialAnswerCount",
  /** Sort by productId */
  ProductId = "productId",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by reportCount */
  ReportCount = "reportCount",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by sourceChannel */
  SourceChannel = "sourceChannel",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by variantId */
  VariantId = "variantId",
}

export type ApiProductQuestionSubjectUpdateInput = {
  productId?: InputMaybe<Scalars["ID"]["input"]>;
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiProductQuestionSubscription = ApiNode & {
  __typename?: "ProductQuestionSubscription";
  channel: ReviewNotificationChannel;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  lastNotifiedAt?: Maybe<Scalars["DateTime"]["output"]>;
  locale: LocaleCode;
  question: ApiProductQuestion;
  status: ProductQuestionSubscriptionStatus;
  subscriberCustomer?: Maybe<ApiCustomer>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductQuestionSubscriptionConnection = {
  __typename?: "ProductQuestionSubscriptionConnection";
  edges: Array<ApiProductQuestionSubscriptionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiProductQuestionSubscriptionEdge = {
  __typename?: "ProductQuestionSubscriptionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiProductQuestionSubscription;
};

export enum ProductQuestionSubscriptionStatus {
  Active = "ACTIVE",
  Paused = "PAUSED",
  Unsubscribed = "UNSUBSCRIBED",
}

export type ApiProductQuestionSubscriptionUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<LocaleCode>;
  status?: InputMaybe<ProductQuestionSubscriptionStatus>;
};

export type ApiProductQuestionSubscriptionUpdatePayload = {
  __typename?: "ProductQuestionSubscriptionUpdatePayload";
  operationResults: Array<ApiReviewsOperationResult>;
  subscription?: Maybe<ApiProductQuestionSubscription>;
  userErrors: Array<ApiGenericUserError>;
};

/** Read-only projection over currently published product questions and answers. */
export type ApiProductQuestionSummary = {
  __typename?: "ProductQuestionSummary";
  answerCount: Scalars["Int"]["output"];
  answeredQuestionCount: Scalars["Int"]["output"];
  lastAnsweredAt?: Maybe<Scalars["DateTime"]["output"]>;
  lastQuestionAt?: Maybe<Scalars["DateTime"]["output"]>;
  officialAnswerCount: Scalars["Int"]["output"];
  product: ApiProduct;
  questionCount: Scalars["Int"]["output"];
  unansweredQuestionCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiProductQuestionUpdateInput = {
  /** Create, update, or delete answers owned by this question. */
  answers?: InputMaybe<ApiProductQuestionAnswersUpdateInput>;
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  subject?: InputMaybe<ApiProductQuestionSubjectUpdateInput>;
};

export type ApiProductQuestionUpdatePayload = {
  __typename?: "ProductQuestionUpdatePayload";
  operationResults: Array<ApiReviewsOperationResult>;
  productQuestion?: Maybe<ApiProductQuestion>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ProductQuestion */
export type ApiProductQuestionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductQuestionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductQuestionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductQuestionWhereInput>>;
  /** Filter by acceptedAnswerCount */
  acceptedAnswerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by answerCount */
  answerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by answerState */
  answerState?: InputMaybe<ApiStringFilter>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiStringFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by officialAnswerCount */
  officialAnswerCount?: InputMaybe<ApiIntFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiProductRatingCriterionSummary = {
  __typename?: "ProductRatingCriterionSummary";
  averageRating: Scalars["Float"]["output"];
  criterion: ApiReviewRatingCriterion;
  ratingBreakdown: ApiReviewRatingBreakdown;
  ratingSum: Scalars["BigInt"]["output"];
  reviewCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

/** Read-only projection over currently published, non-deleted product reviews. */
export type ApiProductReviewSummary = {
  __typename?: "ProductReviewSummary";
  averageRating: Scalars["Float"]["output"];
  criteria: Array<ApiProductRatingCriterionSummary>;
  lastReviewedAt?: Maybe<Scalars["DateTime"]["output"]>;
  mediaReviewCount: Scalars["Int"]["output"];
  product: ApiProduct;
  ratingBreakdown: ApiReviewRatingBreakdown;
  ratingSum: Scalars["BigInt"]["output"];
  reviewCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  verifiedReviewCount: Scalars["Int"]["output"];
};

/** Aggregated Reviews data used by product management widgets. */
export type ApiProductReviewsWidget = {
  __typename?: "ProductReviewsWidget";
  /** Published question and answer aggregates for the product. */
  questionSummary?: Maybe<ApiProductQuestionSummary>;
  /** Published review aggregates for the product. */
  reviewSummary?: Maybe<ApiProductReviewSummary>;
};

/** SEO and Open Graph metadata for a product. */
export type ApiProductSeo = {
  __typename?: "ProductSeo";
  ogDescription?: Maybe<Scalars["String"]["output"]>;
  ogImage?: Maybe<ApiFile>;
  ogTitle?: Maybe<Scalars["String"]["output"]>;
  seoDescription?: Maybe<Scalars["String"]["output"]>;
  seoTitle?: Maybe<Scalars["String"]["output"]>;
};

/** Input for updating product SEO data. */
export type ApiProductSeoInput = {
  ogDescription?: InputMaybe<Scalars["String"]["input"]>;
  ogImageId?: InputMaybe<Scalars["ID"]["input"]>;
  ogTitle?: InputMaybe<Scalars["String"]["input"]>;
  seoDescription?: InputMaybe<Scalars["String"]["input"]>;
  seoTitle?: InputMaybe<Scalars["String"]["input"]>;
};

export enum ProductSortBy {
  Manual = "MANUAL",
  Name = "NAME",
  Newest = "NEWEST",
  Price = "PRICE",
}

export type ApiProductSortInput = {
  by: ProductSortBy;
  direction?: InputMaybe<SortDirection>;
};

export enum ProductStatus {
  Draft = "DRAFT",
  Published = "PUBLISHED",
}

export enum ProductStatusAction {
  Publish = "PUBLISH",
  Unpublish = "UNPUBLISH",
}

export enum ProductTagOperationAction {
  Add = "ADD",
  Remove = "REMOVE",
}

/** Product tag assignment operation for unified product updates. */
export type ApiProductTagOperationInput = {
  /** The assignment action to apply. */
  action: ProductTagOperationAction;
  /** The tag to update for the product. */
  tagId: Scalars["ID"]["input"];
};

/** Input for product-level fields in the unified update. */
export type ApiProductUpdateInput = {
  /** Product category assignment operations. */
  categories?: InputMaybe<Array<ApiProductCategoryOperationInput>>;
  /** Product component operations. */
  components?: InputMaybe<Array<ApiProductComponentOperationInput>>;
  /** Product content (description, excerpt). */
  content?: InputMaybe<ApiProductContentInput>;
  /** Complete feature definition replacement. Empty removes all features. */
  features?: InputMaybe<Array<ApiProductFeatureSyncItemInput>>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars["String"]["input"]>;
  /** Product media. */
  media?: InputMaybe<ApiProductMediaInput>;
  /** Complete option definition replacement. Empty removes all options. */
  options?: InputMaybe<Array<ApiProductOptionSyncItemInput>>;
  /** SEO and Open Graph metadata. */
  seo?: InputMaybe<ApiProductSeoInput>;
  /** Product status: DRAFT or PUBLISHED. */
  status?: InputMaybe<ProductStatus>;
  /** Product tag assignment operations. */
  tags?: InputMaybe<Array<ApiProductTagOperationInput>>;
  /** Product title. */
  title?: InputMaybe<Scalars["String"]["input"]>;
  /** Variant create, update, and delete operations. */
  variants?: InputMaybe<Array<ApiVariantOperationInput>>;
  /** Vendor ID to associate with the product. Pass null to clear. */
  vendorId?: InputMaybe<Scalars["ID"]["input"]>;
};

/** Payload for the unified product update mutation. */
export type ApiProductUpdatePayload = {
  __typename?: "ProductUpdatePayload";
  /** Results of each operation. */
  operationResults: Array<ApiOperationResult>;
  /** The updated product with new revision. */
  product?: Maybe<ApiProduct>;
  /** All errors from all operations. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Product */
export type ApiProductWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiProductWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiProductWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiProductWhereInput>>;
  /** Filter by brandName */
  brandName?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by currency */
  currency?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by maxAmountMinor */
  maxAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by maxPriceMinor */
  maxPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minAmountMinor */
  minAmountMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by minPriceMinor */
  minPriceMinor?: InputMaybe<ApiIntFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by primaryCategoryId */
  primaryCategoryId?: InputMaybe<ApiIdFilter>;
  /** Filter by primaryCategoryName */
  primaryCategoryName?: InputMaybe<ApiStringFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by vendorId */
  vendorId?: InputMaybe<ApiIdFilter>;
};

export type ApiPurchasable = {
  /** Unique identifier of the purchasable entity. */
  id: Scalars["ID"]["output"];
};

export type ApiPurchasableSnapshot = ApiPurchasable & {
  __typename?: "PurchasableSnapshot";
  id: Scalars["ID"]["output"];
  purchasableSnapshot: Scalars["JSON"]["output"];
};

export type ApiQuery = {
  __typename?: "Query";
  /** Application realm management queries. */
  applicationQuery: ApiApplicationQuery;
  /** Apps control-plane queries for the current store. */
  appsQuery: ApiAppsQuery;
  /** Catalog query namespace for product, variant, category, and collection operations */
  catalogQuery: ApiCatalogQuery;
  /** Customers Admin query namespace. */
  customersQuery: ApiCustomersQuery;
  /** Headless App queries for the active installation. */
  headlessAppQuery: ApiHeadlessAppQuery;
  /** Hello World App query namespace. */
  helloWorldAppQuery: ApiHelloWorldAppQuery;
  /** Inventory query namespace for warehouse, stock, and inventory item operations */
  inventoryQuery: ApiInventoryQuery;
  /** Listing query namespace. */
  listingQuery: ApiListingQuery;
  /** Loyalty Admin query namespace. */
  loyaltyQuery: ApiLoyaltyQuery;
  mediaQuery: ApiMediaQuery;
  notificationsQuery: ApiNotificationsQuery;
  /** Online Store content query namespace. */
  onlineStoreAppQuery: ApiOnlineStoreAppQuery;
  orderQuery: ApiOrderQuery;
  /** Organization queries namespace. */
  organizationQuery: ApiOrganizationQuery;
  /** Pricing Admin query namespace. */
  pricingQuery: ApiPricingQuery;
  /** Admin-only Reviews query namespace. */
  reviewsQuery: ApiReviewsQuery;
  smtpAppQuery: ApiSmtpAppQuery;
  /** Store-related queries */
  storeQuery: ApiStoreQuery;
  /** User management queries. */
  userQuery: ApiUserQuery;
  /** Widget query namespace for dashboard widgets */
  widgetQuery: ApiWidgetQuery;
};

/** Resource definition for role editor UI. */
export type ApiResourceDefinition = {
  __typename?: "ResourceDefinition";
  /** Available actions for resource. */
  actions: Array<Scalars["String"]["output"]>;
  /** Resource description. */
  description?: Maybe<Scalars["String"]["output"]>;
  /** Display name. */
  displayName?: Maybe<Scalars["String"]["output"]>;
  /** Resource name (product, order, etc.). */
  name: Scalars["String"]["output"];
};

/** Read-only management metadata for an IAM resource. */
export type ApiResourceManagement = {
  __typename?: "ResourceManagement";
  /** Linked owner id, when mode is SERVICE. */
  linkedOwnerId?: Maybe<Scalars["ID"]["output"]>;
  /** Linked owner type, when mode is SERVICE. */
  linkedOwnerType?: Maybe<Scalars["String"]["output"]>;
  /** Linked service owner, when mode is SERVICE. */
  linkedService?: Maybe<Scalars["String"]["output"]>;
  /** Current management mode. */
  mode: ResourceManagementMode;
  /** Whether generic organization Admin mutations may change this resource. */
  mutableFromOrganizationAdmin: Scalars["Boolean"]["output"];
};

/** How an IAM resource lifecycle is managed. */
export enum ResourceManagementMode {
  /** The resource is managed by the organization. */
  Organization = "ORGANIZATION",
  /** The resource is managed by a linked service owner. */
  Service = "SERVICE",
}

export type ApiReview = ApiNode &
  ApiReviewContent & {
    __typename?: "Review";
    author: ApiReviewContentAuthor;
    body: Scalars["String"]["output"];
    createdAt: Scalars["DateTime"]["output"];
    deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
    externalReferences: ApiReviewContentExternalReferenceConnection;
    id: Scalars["ID"]["output"];
    idempotencyKey?: Maybe<Scalars["String"]["output"]>;
    incentiveDisclosure?: Maybe<Scalars["String"]["output"]>;
    isIncentivized: Scalars["Boolean"]["output"];
    isVerifiedPurchase: Scalars["Boolean"]["output"];
    kind: ReviewContentKind;
    locale: LocaleCode;
    media: Array<ApiReviewMedia>;
    metrics: ApiReviewContentMetrics;
    moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
    moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
    moderationCases: ApiReviewModerationCaseConnection;
    moderationEvents: ApiReviewModerationEventConnection;
    moderationNote?: Maybe<Scalars["String"]["output"]>;
    moderationSignals: ApiReviewModerationSignalConnection;
    /** Orders is not yet an admin federation entity, so evidence remains a global ID contract. */
    orderId?: Maybe<Scalars["ID"]["output"]>;
    orderLineId?: Maybe<Scalars["ID"]["output"]>;
    product: ApiProduct;
    publications: Array<ApiReviewContentPublication>;
    publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    rating: Scalars["Int"]["output"];
    ratings: Array<ApiReviewRating>;
    redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
    replies: ApiReviewReplyConnection;
    reports: ApiReviewContentReportConnection;
    revision: Scalars["Int"]["output"];
    revisions: ApiReviewContentRevisionConnection;
    sourceChannel: Scalars["String"]["output"];
    sourceMetadata: Scalars["JSON"]["output"];
    status: ReviewContentStatus;
    title?: Maybe<Scalars["String"]["output"]>;
    translations: Array<ApiReviewContentTranslation>;
    unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    updatedAt: Scalars["DateTime"]["output"];
    variant?: Maybe<ApiVariant>;
    verificationMethod?: Maybe<Scalars["String"]["output"]>;
    verificationStatus: ReviewVerificationStatus;
    verifiedAt?: Maybe<Scalars["DateTime"]["output"]>;
    votes: ApiReviewContentVoteConnection;
  };

export type ApiReviewExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewModerationEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewModerationSignalsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewRepliesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewReplyOrderByInput>>;
  where?: InputMaybe<ApiReviewReplyWhereInput>;
};

export type ApiReviewReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewRevisionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewVotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewConnection = {
  __typename?: "ReviewConnection";
  edges: Array<ApiReviewEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContent = {
  author: ApiReviewContentAuthor;
  body: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  externalReferences: ApiReviewContentExternalReferenceConnection;
  id: Scalars["ID"]["output"];
  idempotencyKey?: Maybe<Scalars["String"]["output"]>;
  kind: ReviewContentKind;
  locale: LocaleCode;
  metrics: ApiReviewContentMetrics;
  moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
  moderationCases: ApiReviewModerationCaseConnection;
  moderationEvents: ApiReviewModerationEventConnection;
  moderationNote?: Maybe<Scalars["String"]["output"]>;
  moderationSignals: ApiReviewModerationSignalConnection;
  publications: Array<ApiReviewContentPublication>;
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
  reports: ApiReviewContentReportConnection;
  revision: Scalars["Int"]["output"];
  revisions: ApiReviewContentRevisionConnection;
  sourceChannel: Scalars["String"]["output"];
  sourceMetadata: Scalars["JSON"]["output"];
  status: ReviewContentStatus;
  title?: Maybe<Scalars["String"]["output"]>;
  translations: Array<ApiReviewContentTranslation>;
  unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  votes: ApiReviewContentVoteConnection;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentModerationSignalsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentRevisionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Shared contract implemented by every moderated Reviews content aggregate. */
export type ApiReviewContentVotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewContentAuthor = {
  __typename?: "ReviewContentAuthor";
  customer?: Maybe<ApiCustomer>;
  displayName: Scalars["String"]["output"];
  /** Snapshot email; null after privacy redaction or when not collected. */
  email?: Maybe<Scalars["Email"]["output"]>;
  principalId?: Maybe<Scalars["String"]["output"]>;
  type: ReviewContentAuthorType;
};

export type ApiReviewContentAuthorCreateInput = {
  customerId?: InputMaybe<Scalars["ID"]["input"]>;
  displayName: Scalars["String"]["input"];
  email?: InputMaybe<Scalars["Email"]["input"]>;
  principalId?: InputMaybe<Scalars["String"]["input"]>;
  type: ReviewContentAuthorType;
};

export enum ReviewContentAuthorType {
  Customer = "CUSTOMER",
  External = "EXTERNAL",
  Guest = "GUEST",
  Seller = "SELLER",
  Staff = "STAFF",
  System = "SYSTEM",
}

export type ApiReviewContentAuthorUpdateInput = {
  /** Pass null to remove the customer link when the resulting author type allows it. */
  customerId?: InputMaybe<Scalars["ID"]["input"]>;
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  email?: InputMaybe<Scalars["Email"]["input"]>;
  principalId?: InputMaybe<Scalars["String"]["input"]>;
  type?: InputMaybe<ReviewContentAuthorType>;
};

export type ApiReviewContentConnection = {
  __typename?: "ReviewContentConnection";
  edges: Array<ApiReviewContentEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

/** Repository-enforced visibility controls for moderated content lists. */
export type ApiReviewContentConnectionMetaInput = {
  /** Include soft-deleted content; false by default. */
  includeDeleted?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Include privacy-redacted content; true by default for audit workflows. */
  includeRedacted?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiReviewContentCreateInput = {
  author: ApiReviewContentAuthorCreateInput;
  body: Scalars["String"]["input"];
  locale: LocaleCode;
  moderationNote?: InputMaybe<Scalars["String"]["input"]>;
  source?: InputMaybe<ApiReviewContentSourceCreateInput>;
  /** Admin imports may set an initial status; PENDING is the default. */
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiReviewContentDeleteInput = {
  expectedRevision: Scalars["Int"]["input"];
  id: Scalars["ID"]["input"];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiReviewContentEdge = {
  __typename?: "ReviewContentEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewContent;
};

export type ApiReviewContentExternalReference = ApiNode & {
  __typename?: "ReviewContentExternalReference";
  content: ApiReviewContent;
  contentChecksum?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  direction: ReviewExternalSyncDirection;
  etag?: Maybe<Scalars["String"]["output"]>;
  externalId: Scalars["String"]["output"];
  externalSystem: Scalars["String"]["output"];
  externalType: Scalars["String"]["output"];
  externalUrl?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  lastError?: Maybe<Scalars["String"]["output"]>;
  lastSyncedAt?: Maybe<Scalars["DateTime"]["output"]>;
  metadata: Scalars["JSON"]["output"];
  syncStatus: ReviewExternalSyncStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewContentExternalReferenceConnection = {
  __typename?: "ReviewContentExternalReferenceConnection";
  edges: Array<ApiReviewContentExternalReferenceEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewContentExternalReferenceCreateInput = {
  contentId: Scalars["ID"]["input"];
  direction: ReviewExternalSyncDirection;
  externalId: Scalars["String"]["input"];
  externalSystem: Scalars["String"]["input"];
  externalType: Scalars["String"]["input"];
  externalUrl?: InputMaybe<Scalars["String"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiReviewContentExternalReferenceCreatePayload = {
  __typename?: "ReviewContentExternalReferenceCreatePayload";
  externalReference?: Maybe<ApiReviewContentExternalReference>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewContentExternalReferenceDeleteInput = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  id: Scalars["ID"]["input"];
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiReviewContentExternalReferenceDeletePayload = {
  __typename?: "ReviewContentExternalReferenceDeletePayload";
  deletedExternalReferenceId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewContentExternalReferenceEdge = {
  __typename?: "ReviewContentExternalReferenceEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewContentExternalReference;
};

export type ApiReviewContentExternalReferenceIdentityInput = {
  externalId?: InputMaybe<Scalars["String"]["input"]>;
  externalSystem?: InputMaybe<Scalars["String"]["input"]>;
  externalType?: InputMaybe<Scalars["String"]["input"]>;
  externalUrl?: InputMaybe<Scalars["String"]["input"]>;
};

/** Ordering configuration for ReviewContentExternalReference */
export type ApiReviewContentExternalReferenceOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentExternalReferenceOrderField;
};

/** Fields available for sorting ReviewContentExternalReference */
export enum ReviewContentExternalReferenceOrderField {
  /** Sort by contentId */
  ContentId = "contentId",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by direction */
  Direction = "direction",
  /** Sort by externalId */
  ExternalId = "externalId",
  /** Sort by externalSystem */
  ExternalSystem = "externalSystem",
  /** Sort by externalType */
  ExternalType = "externalType",
  /** Sort by id */
  Id = "id",
  /** Sort by lastSyncedAt */
  LastSyncedAt = "lastSyncedAt",
  /** Sort by syncStatus */
  SyncStatus = "syncStatus",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiReviewContentExternalReferenceSyncInput = {
  contentChecksum?: InputMaybe<Scalars["String"]["input"]>;
  direction?: InputMaybe<ReviewExternalSyncDirection>;
  etag?: InputMaybe<Scalars["String"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
  status?: InputMaybe<ReviewExternalSyncStatus>;
};

export type ApiReviewContentExternalReferenceUpdateInput = {
  identity?: InputMaybe<ApiReviewContentExternalReferenceIdentityInput>;
  sync?: InputMaybe<ApiReviewContentExternalReferenceSyncInput>;
};

export type ApiReviewContentExternalReferenceUpdatePayload = {
  __typename?: "ReviewContentExternalReferenceUpdatePayload";
  externalReference?: Maybe<ApiReviewContentExternalReference>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewContentExternalReference */
export type ApiReviewContentExternalReferenceWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentExternalReferenceWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentExternalReferenceWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentExternalReferenceWhereInput>>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by direction */
  direction?: InputMaybe<ApiStringFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by externalType */
  externalType?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by lastSyncedAt */
  lastSyncedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by syncStatus */
  syncStatus?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export enum ReviewContentKind {
  ProductQuestion = "PRODUCT_QUESTION",
  QuestionAnswer = "QUESTION_ANSWER",
  Review = "REVIEW",
  ReviewReply = "REVIEW_REPLY",
}

/** Transactionally maintained counters used by admin filtering and sorting. */
export type ApiReviewContentMetrics = {
  __typename?: "ReviewContentMetrics";
  acceptedChildCount: Scalars["Int"]["output"];
  childCount: Scalars["Int"]["output"];
  dislikeCount: Scalars["Int"]["output"];
  lastChildAt?: Maybe<Scalars["DateTime"]["output"]>;
  likeCount: Scalars["Int"]["output"];
  mediaCount: Scalars["Int"]["output"];
  officialChildCount: Scalars["Int"]["output"];
  openReportCount: Scalars["Int"]["output"];
  reportCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewContentModerationInput = {
  moderationNote?: InputMaybe<Scalars["String"]["input"]>;
  status: ReviewContentStatus;
};

/** Ordering configuration for ReviewContent */
export type ApiReviewContentOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentOrderField;
};

/** Fields available for sorting ReviewContent */
export enum ReviewContentOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = "authorDisplayName",
  /** Sort by authorType */
  AuthorType = "authorType",
  /** Sort by childCount */
  ChildCount = "childCount",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by dislikeCount */
  DislikeCount = "dislikeCount",
  /** Sort by id */
  Id = "id",
  /** Sort by kind */
  Kind = "kind",
  /** Sort by likeCount */
  LikeCount = "likeCount",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by mediaCount */
  MediaCount = "mediaCount",
  /** Sort by openReportCount */
  OpenReportCount = "openReportCount",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by redactedAt */
  RedactedAt = "redactedAt",
  /** Sort by reportCount */
  ReportCount = "reportCount",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by sourceChannel */
  SourceChannel = "sourceChannel",
  /** Sort by status */
  Status = "status",
  /** Sort by title */
  Title = "title",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiReviewContentPublication = ApiNode & {
  __typename?: "ReviewContentPublication";
  channel: Scalars["String"]["output"];
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  lastError?: Maybe<Scalars["String"]["output"]>;
  locale?: Maybe<LocaleCode>;
  publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  scheduledAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: ReviewPublicationStatus;
  unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewContentPublicationSyncInput = {
  channel: Scalars["String"]["input"];
  locale?: InputMaybe<LocaleCode>;
  scheduledAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  status: ReviewPublicationStatus;
};

export type ApiReviewContentReport = ApiNode & {
  __typename?: "ReviewContentReport";
  assignedToPrincipalId?: Maybe<Scalars["String"]["output"]>;
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  details?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  reason: ReviewContentReportReason;
  reporterCustomer?: Maybe<ApiCustomer>;
  resolutionNote?: Maybe<Scalars["String"]["output"]>;
  resolvedAt?: Maybe<Scalars["DateTime"]["output"]>;
  resolvedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
  status: ReviewContentReportStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewContentReportAssignmentInput = {
  assignedToPrincipalId?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiReviewContentReportConnection = {
  __typename?: "ReviewContentReportConnection";
  edges: Array<ApiReviewContentReportEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewContentReportEdge = {
  __typename?: "ReviewContentReportEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewContentReport;
};

/** Ordering configuration for ReviewContentReport */
export type ApiReviewContentReportOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewContentReportOrderField;
};

/** Fields available for sorting ReviewContentReport */
export enum ReviewContentReportOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = "assignedToPrincipalId",
  /** Sort by contentId */
  ContentId = "contentId",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by reason */
  Reason = "reason",
  /** Sort by reporterCustomerId */
  ReporterCustomerId = "reporterCustomerId",
  /** Sort by resolvedAt */
  ResolvedAt = "resolvedAt",
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = "resolvedByPrincipalId",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export enum ReviewContentReportReason {
  ConflictOfInterest = "CONFLICT_OF_INTEREST",
  FraudOrScam = "FRAUD_OR_SCAM",
  Harassment = "HARASSMENT",
  HateSpeech = "HATE_SPEECH",
  IllegalContent = "ILLEGAL_CONTENT",
  IntellectualProperty = "INTELLECTUAL_PROPERTY",
  NotRelevant = "NOT_RELEVANT",
  Offensive = "OFFENSIVE",
  Other = "OTHER",
  PersonalInformation = "PERSONAL_INFORMATION",
  Spam = "SPAM",
}

export type ApiReviewContentReportResolutionInput = {
  note?: InputMaybe<Scalars["String"]["input"]>;
  /** Must be ACTIONED or DISMISSED. */
  status: ReviewContentReportStatus;
};

export enum ReviewContentReportStatus {
  Actioned = "ACTIONED",
  Dismissed = "DISMISSED",
  Open = "OPEN",
  UnderReview = "UNDER_REVIEW",
}

export type ApiReviewContentReportUpdateInput = {
  assignment?: InputMaybe<ApiReviewContentReportAssignmentInput>;
  resolution?: InputMaybe<ApiReviewContentReportResolutionInput>;
};

export type ApiReviewContentReportUpdatePayload = {
  __typename?: "ReviewContentReportUpdatePayload";
  contentReport?: Maybe<ApiReviewContentReport>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewContentReport */
export type ApiReviewContentReportWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentReportWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentReportWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentReportWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by reason */
  reason?: InputMaybe<ApiStringFilter>;
  /** Filter by reporterCustomerId */
  reporterCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Immutable aggregate snapshot used for audit and restore workflows. */
export type ApiReviewContentRevision = ApiNode & {
  __typename?: "ReviewContentRevision";
  changeReason?: Maybe<Scalars["String"]["output"]>;
  changedById?: Maybe<Scalars["String"]["output"]>;
  changedByType: Scalars["String"]["output"];
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  revision: Scalars["Int"]["output"];
  snapshot: Scalars["JSON"]["output"];
};

export type ApiReviewContentRevisionConnection = {
  __typename?: "ReviewContentRevisionConnection";
  edges: Array<ApiReviewContentRevisionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewContentRevisionEdge = {
  __typename?: "ReviewContentRevisionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewContentRevision;
};

export type ApiReviewContentSourceCreateInput = {
  channel?: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey?: InputMaybe<Scalars["String"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
};

export type ApiReviewContentSourceUpdateInput = {
  channel?: InputMaybe<Scalars["String"]["input"]>;
  idempotencyKey?: InputMaybe<Scalars["String"]["input"]>;
  metadata?: InputMaybe<Scalars["JSON"]["input"]>;
};

export enum ReviewContentStatus {
  Pending = "PENDING",
  Published = "PUBLISHED",
  Rejected = "REJECTED",
}

export type ApiReviewContentTextUpdateInput = {
  body?: InputMaybe<Scalars["String"]["input"]>;
  locale?: InputMaybe<LocaleCode>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiReviewContentTranslation = ApiNode & {
  __typename?: "ReviewContentTranslation";
  body: Scalars["String"]["output"];
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  locale: LocaleCode;
  reviewedAt?: Maybe<Scalars["DateTime"]["output"]>;
  reviewedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
  revision: Scalars["Int"]["output"];
  source: ReviewTranslationSource;
  status: ReviewContentStatus;
  title?: Maybe<Scalars["String"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewContentTranslationSyncInput = {
  body: Scalars["String"]["input"];
  locale: LocaleCode;
  source: ReviewTranslationSource;
  status?: InputMaybe<ReviewContentStatus>;
  title?: InputMaybe<Scalars["String"]["input"]>;
};

/** Common section operations reused by all content aggregate updates. */
export type ApiReviewContentUpdateInput = {
  author?: InputMaybe<ApiReviewContentAuthorUpdateInput>;
  moderation?: InputMaybe<ApiReviewContentModerationInput>;
  /** Complete publication destination replacement when supplied. */
  publications?: InputMaybe<Array<ApiReviewContentPublicationSyncInput>>;
  source?: InputMaybe<ApiReviewContentSourceUpdateInput>;
  text?: InputMaybe<ApiReviewContentTextUpdateInput>;
  /** Complete translation replacement when supplied. Empty removes all translations. */
  translations?: InputMaybe<Array<ApiReviewContentTranslationSyncInput>>;
};

export type ApiReviewContentUpdatePayload = {
  __typename?: "ReviewContentUpdatePayload";
  content?: Maybe<ApiReviewContent>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Read-only admin view of a storefront reaction. */
export type ApiReviewContentVote = ApiNode & {
  __typename?: "ReviewContentVote";
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  type: ReviewContentVoteType;
  updatedAt: Scalars["DateTime"]["output"];
  voterCustomer?: Maybe<ApiCustomer>;
};

export type ApiReviewContentVoteConnection = {
  __typename?: "ReviewContentVoteConnection";
  edges: Array<ApiReviewContentVoteEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewContentVoteEdge = {
  __typename?: "ReviewContentVoteEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewContentVote;
};

export enum ReviewContentVoteType {
  Dislike = "DISLIKE",
  Like = "LIKE",
}

/** Filter conditions for ReviewContent */
export type ApiReviewContentWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewContentWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewContentWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewContentWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by childCount */
  childCount?: InputMaybe<ApiIntFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by kind */
  kind?: InputMaybe<ApiStringFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<ApiIntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by redactedAt */
  redactedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by title */
  title?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiReviewCreateInput = {
  content: ApiReviewContentCreateInput;
  incentive?: InputMaybe<ApiReviewIncentiveUpdateInput>;
  media?: InputMaybe<Array<ApiReviewMediaSyncItemInput>>;
  orderId?: InputMaybe<Scalars["ID"]["input"]>;
  orderLineId?: InputMaybe<Scalars["ID"]["input"]>;
  productId: Scalars["ID"]["input"];
  rating: Scalars["Int"]["input"];
  ratings?: InputMaybe<Array<ApiReviewRatingValueInput>>;
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
  verification?: InputMaybe<ApiReviewVerificationUpdateInput>;
};

export type ApiReviewCreatePayload = {
  __typename?: "ReviewCreatePayload";
  review?: Maybe<ApiReview>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewDeletePayload = {
  __typename?: "ReviewDeletePayload";
  deletedReviewId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export enum ReviewDuplicatePolicy {
  AllowMultiple = "ALLOW_MULTIPLE",
  OnePerOrderLine = "ONE_PER_ORDER_LINE",
  OnePerProduct = "ONE_PER_PRODUCT",
}

export type ApiReviewEdge = {
  __typename?: "ReviewEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReview;
};

export enum ReviewExternalSyncDirection {
  Bidirectional = "BIDIRECTIONAL",
  Export = "EXPORT",
  Import = "IMPORT",
}

export enum ReviewExternalSyncStatus {
  Disabled = "DISABLED",
  Failed = "FAILED",
  Pending = "PENDING",
  Synced = "SYNCED",
}

export type ApiReviewIncentiveUpdateInput = {
  disclosure?: InputMaybe<Scalars["String"]["input"]>;
  isIncentivized: Scalars["Boolean"]["input"];
};

export type ApiReviewMedia = ApiNode & {
  __typename?: "ReviewMedia";
  caption?: Maybe<Scalars["String"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  file: ApiFile;
  id: Scalars["ID"]["output"];
  moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
  moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
  moderationNote?: Maybe<Scalars["String"]["output"]>;
  review: ApiReview;
  sortIndex: Scalars["Int"]["output"];
  status: ReviewContentStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewMediaSyncItemInput = {
  caption?: InputMaybe<Scalars["String"]["input"]>;
  fileId: Scalars["ID"]["input"];
  moderation?: InputMaybe<ApiReviewContentModerationInput>;
  sortIndex: Scalars["Int"]["input"];
};

export enum ReviewModerationAction {
  Assigned = "ASSIGNED",
  AutoFlagged = "AUTO_FLAGGED",
  Deleted = "DELETED",
  Edited = "EDITED",
  Published = "PUBLISHED",
  Redacted = "REDACTED",
  Rejected = "REJECTED",
  Restored = "RESTORED",
  Submitted = "SUBMITTED",
}

export type ApiReviewModerationCase = ApiNode & {
  __typename?: "ReviewModerationCase";
  assignedToPrincipalId?: Maybe<Scalars["String"]["output"]>;
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  dueAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  priority: Scalars["Int"]["output"];
  reasonCode: Scalars["String"]["output"];
  resolutionCode?: Maybe<Scalars["String"]["output"]>;
  resolutionNote?: Maybe<Scalars["String"]["output"]>;
  resolvedAt?: Maybe<Scalars["DateTime"]["output"]>;
  resolvedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
  status: ReviewModerationCaseStatus;
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewModerationCaseConnection = {
  __typename?: "ReviewModerationCaseConnection";
  edges: Array<ApiReviewModerationCaseEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewModerationCaseCreateInput = {
  assignedToPrincipalId?: InputMaybe<Scalars["String"]["input"]>;
  contentId: Scalars["ID"]["input"];
  dueAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  reasonCode: Scalars["String"]["input"];
};

export type ApiReviewModerationCaseCreatePayload = {
  __typename?: "ReviewModerationCaseCreatePayload";
  moderationCase?: Maybe<ApiReviewModerationCase>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewModerationCaseDetailsInput = {
  assignedToPrincipalId?: InputMaybe<Scalars["String"]["input"]>;
  dueAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  priority?: InputMaybe<Scalars["Int"]["input"]>;
  reasonCode?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiReviewModerationCaseEdge = {
  __typename?: "ReviewModerationCaseEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewModerationCase;
};

/** Ordering configuration for ReviewModerationCase */
export type ApiReviewModerationCaseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewModerationCaseOrderField;
};

/** Fields available for sorting ReviewModerationCase */
export enum ReviewModerationCaseOrderField {
  /** Sort by assignedToPrincipalId */
  AssignedToPrincipalId = "assignedToPrincipalId",
  /** Sort by contentId */
  ContentId = "contentId",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by dueAt */
  DueAt = "dueAt",
  /** Sort by id */
  Id = "id",
  /** Sort by priority */
  Priority = "priority",
  /** Sort by reasonCode */
  ReasonCode = "reasonCode",
  /** Sort by resolutionCode */
  ResolutionCode = "resolutionCode",
  /** Sort by resolvedAt */
  ResolvedAt = "resolvedAt",
  /** Sort by resolvedByPrincipalId */
  ResolvedByPrincipalId = "resolvedByPrincipalId",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiReviewModerationCaseResolutionInput = {
  resolutionCode?: InputMaybe<Scalars["String"]["input"]>;
  resolutionNote?: InputMaybe<Scalars["String"]["input"]>;
  /** Must be RESOLVED or CANCELLED. */
  status: ReviewModerationCaseStatus;
};

export enum ReviewModerationCaseStatus {
  Cancelled = "CANCELLED",
  InReview = "IN_REVIEW",
  Open = "OPEN",
  Resolved = "RESOLVED",
}

export type ApiReviewModerationCaseUpdateInput = {
  details?: InputMaybe<ApiReviewModerationCaseDetailsInput>;
  resolution?: InputMaybe<ApiReviewModerationCaseResolutionInput>;
};

export type ApiReviewModerationCaseUpdatePayload = {
  __typename?: "ReviewModerationCaseUpdatePayload";
  moderationCase?: Maybe<ApiReviewModerationCase>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewModerationCase */
export type ApiReviewModerationCaseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewModerationCaseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewModerationCaseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewModerationCaseWhereInput>>;
  /** Filter by assignedToPrincipalId */
  assignedToPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by contentId */
  contentId?: InputMaybe<ApiIdFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dueAt */
  dueAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by priority */
  priority?: InputMaybe<ApiIntFilter>;
  /** Filter by reasonCode */
  reasonCode?: InputMaybe<ApiStringFilter>;
  /** Filter by resolutionCode */
  resolutionCode?: InputMaybe<ApiStringFilter>;
  /** Filter by resolvedAt */
  resolvedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by resolvedByPrincipalId */
  resolvedByPrincipalId?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Append-only moderation timeline entry. */
export type ApiReviewModerationEvent = ApiNode & {
  __typename?: "ReviewModerationEvent";
  action: ReviewModerationAction;
  actorId?: Maybe<Scalars["String"]["output"]>;
  actorType: Scalars["String"]["output"];
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  fromStatus?: Maybe<ReviewContentStatus>;
  id: Scalars["ID"]["output"];
  isAutomated: Scalars["Boolean"]["output"];
  metadata: Scalars["JSON"]["output"];
  moderationCase?: Maybe<ApiReviewModerationCase>;
  note?: Maybe<Scalars["String"]["output"]>;
  reasonCode?: Maybe<Scalars["String"]["output"]>;
  toStatus?: Maybe<ReviewContentStatus>;
};

export type ApiReviewModerationEventConnection = {
  __typename?: "ReviewModerationEventConnection";
  edges: Array<ApiReviewModerationEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewModerationEventEdge = {
  __typename?: "ReviewModerationEventEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewModerationEvent;
};

export enum ReviewModerationMode {
  Automated = "AUTOMATED",
  Postmoderation = "POSTMODERATION",
  Premoderation = "PREMODERATION",
}

/** Immutable automated moderation evidence; it is not the moderation decision. */
export type ApiReviewModerationSignal = ApiNode & {
  __typename?: "ReviewModerationSignal";
  content: ApiReviewContent;
  createdAt: Scalars["DateTime"]["output"];
  evidence: Scalars["JSON"]["output"];
  id: Scalars["ID"]["output"];
  modelVersion?: Maybe<Scalars["String"]["output"]>;
  provider: Scalars["String"]["output"];
  score?: Maybe<Scalars["Float"]["output"]>;
  signalType: Scalars["String"]["output"];
  verdict: ReviewModerationVerdict;
};

export type ApiReviewModerationSignalConnection = {
  __typename?: "ReviewModerationSignalConnection";
  edges: Array<ApiReviewModerationSignalEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewModerationSignalEdge = {
  __typename?: "ReviewModerationSignalEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewModerationSignal;
};

export enum ReviewModerationVerdict {
  Block = "BLOCK",
  Pass = "PASS",
  Review = "REVIEW",
}

export enum ReviewNotificationChannel {
  Email = "EMAIL",
  InApp = "IN_APP",
  Push = "PUSH",
  Sms = "SMS",
}

/** Ordering configuration for Review */
export type ApiReviewOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewOrderField;
};

/** Fields available for sorting Review */
export enum ReviewOrderField {
  /** Sort by authorDisplayName */
  AuthorDisplayName = "authorDisplayName",
  /** Sort by authorType */
  AuthorType = "authorType",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by dislikeCount */
  DislikeCount = "dislikeCount",
  /** Sort by id */
  Id = "id",
  /** Sort by isIncentivized */
  IsIncentivized = "isIncentivized",
  /** Sort by likeCount */
  LikeCount = "likeCount",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by mediaCount */
  MediaCount = "mediaCount",
  /** Sort by openReportCount */
  OpenReportCount = "openReportCount",
  /** Sort by productId */
  ProductId = "productId",
  /** Sort by publishedAt */
  PublishedAt = "publishedAt",
  /** Sort by rating */
  Rating = "rating",
  /** Sort by reportCount */
  ReportCount = "reportCount",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by sourceChannel */
  SourceChannel = "sourceChannel",
  /** Sort by status */
  Status = "status",
  /** Sort by title */
  Title = "title",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by variantId */
  VariantId = "variantId",
  /** Sort by verificationStatus */
  VerificationStatus = "verificationStatus",
}

export enum ReviewPublicationStatus {
  Draft = "DRAFT",
  Failed = "FAILED",
  Published = "PUBLISHED",
  Scheduled = "SCHEDULED",
  Unpublished = "UNPUBLISHED",
}

export type ApiReviewRating = {
  __typename?: "ReviewRating";
  createdAt: Scalars["DateTime"]["output"];
  criterion: ApiReviewRatingCriterion;
  updatedAt: Scalars["DateTime"]["output"];
  value: Scalars["Int"]["output"];
};

export type ApiReviewRatingBreakdown = {
  __typename?: "ReviewRatingBreakdown";
  rating1Count: Scalars["Int"]["output"];
  rating2Count: Scalars["Int"]["output"];
  rating3Count: Scalars["Int"]["output"];
  rating4Count: Scalars["Int"]["output"];
  rating5Count: Scalars["Int"]["output"];
};

export type ApiReviewRatingCriterion = ApiNode & {
  __typename?: "ReviewRatingCriterion";
  appliesToAllProducts: Scalars["Boolean"]["output"];
  assignments: Array<ApiReviewRatingCriterionAssignment>;
  code: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  defaultDescription?: Maybe<Scalars["String"]["output"]>;
  defaultTitle: Scalars["String"]["output"];
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  isActive: Scalars["Boolean"]["output"];
  isRequired: Scalars["Boolean"]["output"];
  sortIndex: Scalars["Int"]["output"];
  translations: Array<ApiReviewRatingCriterionTranslation>;
  updatedAt: Scalars["DateTime"]["output"];
  weight: Scalars["Float"]["output"];
};

export type ApiReviewRatingCriterionApplicabilityInput = {
  appliesToAllProducts: Scalars["Boolean"]["input"];
};

export type ApiReviewRatingCriterionAssignment = ApiNode & {
  __typename?: "ReviewRatingCriterionAssignment";
  createdAt: Scalars["DateTime"]["output"];
  criterion: ApiReviewRatingCriterion;
  id: Scalars["ID"]["output"];
  isRequiredOverride?: Maybe<Scalars["Boolean"]["output"]>;
  sortIndexOverride?: Maybe<Scalars["Int"]["output"]>;
  target: ApiReviewRatingCriterionTarget;
  targetId: Scalars["ID"]["output"];
  targetType: ReviewRatingCriterionTargetType;
};

export type ApiReviewRatingCriterionAssignmentInput = {
  isRequiredOverride?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndexOverride?: InputMaybe<Scalars["Int"]["input"]>;
  targetId: Scalars["ID"]["input"];
  targetType: ReviewRatingCriterionTargetType;
};

export type ApiReviewRatingCriterionConnection = {
  __typename?: "ReviewRatingCriterionConnection";
  edges: Array<ApiReviewRatingCriterionEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewRatingCriterionCreateInput = {
  appliesToAllProducts?: InputMaybe<Scalars["Boolean"]["input"]>;
  assignments?: InputMaybe<Array<ApiReviewRatingCriterionAssignmentInput>>;
  code: Scalars["String"]["input"];
  defaultDescription?: InputMaybe<Scalars["String"]["input"]>;
  defaultTitle: Scalars["String"]["input"];
  isActive?: InputMaybe<Scalars["Boolean"]["input"]>;
  isRequired?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  translations?: InputMaybe<Array<ApiReviewRatingCriterionTranslationInput>>;
  weight?: InputMaybe<Scalars["Float"]["input"]>;
};

export type ApiReviewRatingCriterionCreatePayload = {
  __typename?: "ReviewRatingCriterionCreatePayload";
  criterion?: Maybe<ApiReviewRatingCriterion>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRatingCriterionDefinitionInput = {
  code?: InputMaybe<Scalars["String"]["input"]>;
  defaultDescription?: InputMaybe<Scalars["String"]["input"]>;
  defaultTitle?: InputMaybe<Scalars["String"]["input"]>;
  isActive?: InputMaybe<Scalars["Boolean"]["input"]>;
  isRequired?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
  weight?: InputMaybe<Scalars["Float"]["input"]>;
};

export type ApiReviewRatingCriterionDeleteInput = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  id: Scalars["ID"]["input"];
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiReviewRatingCriterionDeletePayload = {
  __typename?: "ReviewRatingCriterionDeletePayload";
  deletedCriterionId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRatingCriterionEdge = {
  __typename?: "ReviewRatingCriterionEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewRatingCriterion;
};

/** Ordering configuration for ReviewRatingCriterion */
export type ApiReviewRatingCriterionOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRatingCriterionOrderField;
};

/** Fields available for sorting ReviewRatingCriterion */
export enum ReviewRatingCriterionOrderField {
  /** Sort by appliesToAllProducts */
  AppliesToAllProducts = "appliesToAllProducts",
  /** Sort by code */
  Code = "code",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by defaultTitle */
  DefaultTitle = "defaultTitle",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isActive */
  IsActive = "isActive",
  /** Sort by isRequired */
  IsRequired = "isRequired",
  /** Sort by sortIndex */
  SortIndex = "sortIndex",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by weight */
  Weight = "weight",
}

export type ApiReviewRatingCriterionTarget = ApiCategory | ApiProduct;

export enum ReviewRatingCriterionTargetType {
  Category = "CATEGORY",
  Product = "PRODUCT",
}

export type ApiReviewRatingCriterionTranslation = {
  __typename?: "ReviewRatingCriterionTranslation";
  createdAt: Scalars["DateTime"]["output"];
  description?: Maybe<Scalars["String"]["output"]>;
  locale: LocaleCode;
  title: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiReviewRatingCriterionTranslationInput = {
  description?: InputMaybe<Scalars["String"]["input"]>;
  locale: LocaleCode;
  title: Scalars["String"]["input"];
};

export type ApiReviewRatingCriterionUpdateInput = {
  applicability?: InputMaybe<ApiReviewRatingCriterionApplicabilityInput>;
  /** Complete product/category assignment replacement when supplied. */
  assignments?: InputMaybe<Array<ApiReviewRatingCriterionAssignmentInput>>;
  definition?: InputMaybe<ApiReviewRatingCriterionDefinitionInput>;
  /** Complete translation replacement when supplied. */
  translations?: InputMaybe<Array<ApiReviewRatingCriterionTranslationInput>>;
};

export type ApiReviewRatingCriterionUpdatePayload = {
  __typename?: "ReviewRatingCriterionUpdatePayload";
  criterion?: Maybe<ApiReviewRatingCriterion>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewRatingCriterion */
export type ApiReviewRatingCriterionWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewRatingCriterionWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewRatingCriterionWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewRatingCriterionWhereInput>>;
  /** Filter by appliesToAllProducts */
  appliesToAllProducts?: InputMaybe<ApiBooleanFilter>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by defaultTitle */
  defaultTitle?: InputMaybe<ApiStringFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isActive */
  isActive?: InputMaybe<ApiBooleanFilter>;
  /** Filter by isRequired */
  isRequired?: InputMaybe<ApiBooleanFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by weight */
  weight?: InputMaybe<ApiFloatFilter>;
};

export type ApiReviewRatingUpdateInput = {
  /** Complete detailed criterion rating replacement when supplied. */
  criteria?: InputMaybe<Array<ApiReviewRatingValueInput>>;
  overall?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewRatingValueInput = {
  criterionId: Scalars["ID"]["input"];
  value: Scalars["Int"]["input"];
};

export type ApiReviewRepliesUpdateInput = {
  create?: InputMaybe<Array<ApiReviewReplyCreateOperationInput>>;
  delete?: InputMaybe<Array<ApiReviewReplyDeleteOperationInput>>;
  update?: InputMaybe<Array<ApiReviewReplyUpdateOperationInput>>;
};

export type ApiReviewReply = ApiNode &
  ApiReviewContent & {
    __typename?: "ReviewReply";
    author: ApiReviewContentAuthor;
    body: Scalars["String"]["output"];
    createdAt: Scalars["DateTime"]["output"];
    deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
    externalReferences: ApiReviewContentExternalReferenceConnection;
    id: Scalars["ID"]["output"];
    idempotencyKey?: Maybe<Scalars["String"]["output"]>;
    isOfficial: Scalars["Boolean"]["output"];
    kind: ReviewContentKind;
    locale: LocaleCode;
    metrics: ApiReviewContentMetrics;
    moderatedAt?: Maybe<Scalars["DateTime"]["output"]>;
    moderatedByPrincipalId?: Maybe<Scalars["String"]["output"]>;
    moderationCases: ApiReviewModerationCaseConnection;
    moderationEvents: ApiReviewModerationEventConnection;
    moderationNote?: Maybe<Scalars["String"]["output"]>;
    moderationSignals: ApiReviewModerationSignalConnection;
    publications: Array<ApiReviewContentPublication>;
    publishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    redactedAt?: Maybe<Scalars["DateTime"]["output"]>;
    reports: ApiReviewContentReportConnection;
    review: ApiReview;
    revision: Scalars["Int"]["output"];
    revisions: ApiReviewContentRevisionConnection;
    sortIndex: Scalars["Int"]["output"];
    sourceChannel: Scalars["String"]["output"];
    sourceMetadata: Scalars["JSON"]["output"];
    status: ReviewContentStatus;
    title?: Maybe<Scalars["String"]["output"]>;
    translations: Array<ApiReviewContentTranslation>;
    unpublishedAt?: Maybe<Scalars["DateTime"]["output"]>;
    updatedAt: Scalars["DateTime"]["output"];
    votes: ApiReviewContentVoteConnection;
  };

export type ApiReviewReplyExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyModerationEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyModerationSignalsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyRevisionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyVotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyConnection = {
  __typename?: "ReviewReplyConnection";
  edges: Array<ApiReviewReplyEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewReplyCreateOperationInput = {
  /** Client-provided correlation key returned in the operation result. */
  clientMutationId?: InputMaybe<Scalars["String"]["input"]>;
  content: ApiReviewContentCreateInput;
  isOfficial?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyDeleteOperationInput = {
  expectedRevision: Scalars["Int"]["input"];
  /** Hard deletion is reserved for explicit privacy or retention workflows. */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
  replyId: Scalars["ID"]["input"];
};

export type ApiReviewReplyEdge = {
  __typename?: "ReviewReplyEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewReply;
};

/** Ordering configuration for ReviewReply */
export type ApiReviewReplyOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewReplyOrderField;
};

/** Fields available for sorting ReviewReply */
export enum ReviewReplyOrderField {
  /** Sort by authorType */
  AuthorType = "authorType",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by deletedAt */
  DeletedAt = "deletedAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isOfficial */
  IsOfficial = "isOfficial",
  /** Sort by likeCount */
  LikeCount = "likeCount",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by reviewId */
  ReviewId = "reviewId",
  /** Sort by revision */
  Revision = "revision",
  /** Sort by sortIndex */
  SortIndex = "sortIndex",
  /** Sort by status */
  Status = "status",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

export type ApiReviewReplyPropertiesUpdateInput = {
  isOfficial?: InputMaybe<Scalars["Boolean"]["input"]>;
  sortIndex?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewReplyUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  properties?: InputMaybe<ApiReviewReplyPropertiesUpdateInput>;
};

export type ApiReviewReplyUpdateOperationInput = {
  expectedRevision: Scalars["Int"]["input"];
  operations: ApiReviewReplyUpdateInput;
  replyId: Scalars["ID"]["input"];
};

/** Filter conditions for ReviewReply */
export type ApiReviewReplyWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewReplyWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewReplyWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewReplyWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isOfficial */
  isOfficial?: InputMaybe<ApiBooleanFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiStringFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<ApiIdFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sortIndex */
  sortIndex?: InputMaybe<ApiIntFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiReviewRequest = ApiNode & {
  __typename?: "ReviewRequest";
  attemptCount: Scalars["Int"]["output"];
  channel: ReviewNotificationChannel;
  createdAt: Scalars["DateTime"]["output"];
  customer: ApiCustomer;
  deliveredAt?: Maybe<Scalars["DateTime"]["output"]>;
  events: ApiReviewRequestEventConnection;
  expiresAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  lastError?: Maybe<Scalars["String"]["output"]>;
  locale: LocaleCode;
  openedAt?: Maybe<Scalars["DateTime"]["output"]>;
  orderId: Scalars["ID"]["output"];
  orderLineId: Scalars["ID"]["output"];
  product: ApiProduct;
  providerMessageId?: Maybe<Scalars["String"]["output"]>;
  review?: Maybe<ApiReview>;
  scheduledAt: Scalars["DateTime"]["output"];
  sentAt?: Maybe<Scalars["DateTime"]["output"]>;
  sourceChannel: Scalars["String"]["output"];
  status: ReviewRequestStatus;
  submittedAt?: Maybe<Scalars["DateTime"]["output"]>;
  updatedAt: Scalars["DateTime"]["output"];
  variant?: Maybe<ApiVariant>;
};

export type ApiReviewRequestEventsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

export type ApiReviewRequestConnection = {
  __typename?: "ReviewRequestConnection";
  edges: Array<ApiReviewRequestEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewRequestCreateInput = {
  channel: ReviewNotificationChannel;
  customerId: Scalars["ID"]["input"];
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  idempotencyKey: Scalars["String"]["input"];
  locale: LocaleCode;
  orderId: Scalars["ID"]["input"];
  orderLineId: Scalars["ID"]["input"];
  productId: Scalars["ID"]["input"];
  scheduledAt: Scalars["DateTime"]["input"];
  sourceChannel?: InputMaybe<Scalars["String"]["input"]>;
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiReviewRequestCreatePayload = {
  __typename?: "ReviewRequestCreatePayload";
  reviewRequest?: Maybe<ApiReviewRequest>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewRequestDeliveryUpdateInput = {
  channel?: InputMaybe<ReviewNotificationChannel>;
  locale?: InputMaybe<LocaleCode>;
};

export type ApiReviewRequestEdge = {
  __typename?: "ReviewRequestEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewRequest;
};

export type ApiReviewRequestEvent = ApiNode & {
  __typename?: "ReviewRequestEvent";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  metadata: Scalars["JSON"]["output"];
  occurredAt: Scalars["DateTime"]["output"];
  providerEventId?: Maybe<Scalars["String"]["output"]>;
  reviewRequest: ApiReviewRequest;
  type: ReviewRequestEventType;
};

export type ApiReviewRequestEventConnection = {
  __typename?: "ReviewRequestEventConnection";
  edges: Array<ApiReviewRequestEventEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiReviewRequestEventEdge = {
  __typename?: "ReviewRequestEventEdge";
  cursor: Scalars["String"]["output"];
  node: ApiReviewRequestEvent;
};

export enum ReviewRequestEventType {
  Bounced = "BOUNCED",
  Cancelled = "CANCELLED",
  Clicked = "CLICKED",
  Complained = "COMPLAINED",
  Delivered = "DELIVERED",
  Expired = "EXPIRED",
  Failed = "FAILED",
  Opened = "OPENED",
  Scheduled = "SCHEDULED",
  Sent = "SENT",
  Submitted = "SUBMITTED",
}

/** Ordering configuration for ReviewRequest */
export type ApiReviewRequestOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: ReviewRequestOrderField;
};

/** Fields available for sorting ReviewRequest */
export enum ReviewRequestOrderField {
  /** Sort by attemptCount */
  AttemptCount = "attemptCount",
  /** Sort by channel */
  Channel = "channel",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by customerId */
  CustomerId = "customerId",
  /** Sort by deliveredAt */
  DeliveredAt = "deliveredAt",
  /** Sort by expiresAt */
  ExpiresAt = "expiresAt",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by openedAt */
  OpenedAt = "openedAt",
  /** Sort by orderId */
  OrderId = "orderId",
  /** Sort by orderLineId */
  OrderLineId = "orderLineId",
  /** Sort by productId */
  ProductId = "productId",
  /** Sort by providerMessageId */
  ProviderMessageId = "providerMessageId",
  /** Sort by reviewId */
  ReviewId = "reviewId",
  /** Sort by scheduledAt */
  ScheduledAt = "scheduledAt",
  /** Sort by sentAt */
  SentAt = "sentAt",
  /** Sort by sourceChannel */
  SourceChannel = "sourceChannel",
  /** Sort by status */
  Status = "status",
  /** Sort by submittedAt */
  SubmittedAt = "submittedAt",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by variantId */
  VariantId = "variantId",
}

export type ApiReviewRequestScheduleUpdateInput = {
  expiresAt?: InputMaybe<Scalars["DateTime"]["input"]>;
  scheduledAt: Scalars["DateTime"]["input"];
};

export enum ReviewRequestStatus {
  Cancelled = "CANCELLED",
  Delivered = "DELIVERED",
  Expired = "EXPIRED",
  Failed = "FAILED",
  Opened = "OPENED",
  Scheduled = "SCHEDULED",
  Sent = "SENT",
  Submitted = "SUBMITTED",
}

export enum ReviewRequestTransitionAction {
  Cancel = "CANCEL",
  Expire = "EXPIRE",
  Reschedule = "RESCHEDULE",
  Retry = "RETRY",
}

export type ApiReviewRequestTransitionInput = {
  action: ReviewRequestTransitionAction;
  reason?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiReviewRequestUpdateInput = {
  delivery?: InputMaybe<ApiReviewRequestDeliveryUpdateInput>;
  schedule?: InputMaybe<ApiReviewRequestScheduleUpdateInput>;
  transition?: InputMaybe<ApiReviewRequestTransitionInput>;
};

export type ApiReviewRequestUpdatePayload = {
  __typename?: "ReviewRequestUpdatePayload";
  operationResults: Array<ApiReviewsOperationResult>;
  reviewRequest?: Maybe<ApiReviewRequest>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for ReviewRequest */
export type ApiReviewRequestWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewRequestWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewRequestWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewRequestWhereInput>>;
  /** Filter by attemptCount */
  attemptCount?: InputMaybe<ApiIntFilter>;
  /** Filter by channel */
  channel?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by customerId */
  customerId?: InputMaybe<ApiIdFilter>;
  /** Filter by deliveredAt */
  deliveredAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by expiresAt */
  expiresAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by openedAt */
  openedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<ApiIdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<ApiIdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by providerMessageId */
  providerMessageId?: InputMaybe<ApiStringFilter>;
  /** Filter by reviewId */
  reviewId?: InputMaybe<ApiIdFilter>;
  /** Filter by scheduledAt */
  scheduledAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by sentAt */
  sentAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by submittedAt */
  submittedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
};

export type ApiReviewStoreConfiguration = ApiNode & {
  __typename?: "ReviewStoreConfiguration";
  answerEditWindowHours: Scalars["Int"]["output"];
  answerModerationMode: ReviewModerationMode;
  createdAt: Scalars["DateTime"]["output"];
  customerAnswersEnabled: Scalars["Boolean"]["output"];
  guestQuestionsEnabled: Scalars["Boolean"]["output"];
  guestReviewsEnabled: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  maxAnswersPerQuestion: Scalars["Int"]["output"];
  maxReviewMediaCount: Scalars["Int"]["output"];
  questionEditWindowHours: Scalars["Int"]["output"];
  questionModerationMode: ReviewModerationMode;
  questionsEnabled: Scalars["Boolean"]["output"];
  reviewDuplicatePolicy: ReviewDuplicatePolicy;
  reviewEditWindowHours: Scalars["Int"]["output"];
  reviewModerationMode: ReviewModerationMode;
  reviewRequestDelayDays: Scalars["Int"]["output"];
  reviewRequestExpiryDays: Scalars["Int"]["output"];
  reviewRequestsEnabled: Scalars["Boolean"]["output"];
  reviewsEnabled: Scalars["Boolean"]["output"];
  revision: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  verifiedPurchaseRequired: Scalars["Boolean"]["output"];
};

export type ApiReviewStoreConfigurationUpdateInput = {
  answerEditWindowHours?: InputMaybe<Scalars["Int"]["input"]>;
  answerModerationMode?: InputMaybe<ReviewModerationMode>;
  customerAnswersEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  guestQuestionsEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  guestReviewsEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxAnswersPerQuestion?: InputMaybe<Scalars["Int"]["input"]>;
  maxReviewMediaCount?: InputMaybe<Scalars["Int"]["input"]>;
  questionEditWindowHours?: InputMaybe<Scalars["Int"]["input"]>;
  questionModerationMode?: InputMaybe<ReviewModerationMode>;
  questionsEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  reviewDuplicatePolicy?: InputMaybe<ReviewDuplicatePolicy>;
  reviewEditWindowHours?: InputMaybe<Scalars["Int"]["input"]>;
  reviewModerationMode?: InputMaybe<ReviewModerationMode>;
  reviewRequestDelayDays?: InputMaybe<Scalars["Int"]["input"]>;
  reviewRequestExpiryDays?: InputMaybe<Scalars["Int"]["input"]>;
  reviewRequestsEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  reviewsEnabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  verifiedPurchaseRequired?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ApiReviewStoreConfigurationUpdatePayload = {
  __typename?: "ReviewStoreConfigurationUpdatePayload";
  configuration?: Maybe<ApiReviewStoreConfiguration>;
  operationResults: Array<ApiReviewsOperationResult>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiReviewSubjectUpdateInput = {
  orderId?: InputMaybe<Scalars["ID"]["input"]>;
  orderLineId?: InputMaybe<Scalars["ID"]["input"]>;
  productId?: InputMaybe<Scalars["ID"]["input"]>;
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
};

export enum ReviewTranslationSource {
  Human = "HUMAN",
  Import = "IMPORT",
  Machine = "MACHINE",
}

/** Section-based aggregate update following Catalog productUpdate semantics. */
export type ApiReviewUpdateInput = {
  /** Text, author, source, moderation, translations, and publications. */
  content?: InputMaybe<ApiReviewContentUpdateInput>;
  incentive?: InputMaybe<ApiReviewIncentiveUpdateInput>;
  /** Complete media replacement when supplied. Empty removes every attachment. */
  media?: InputMaybe<Array<ApiReviewMediaSyncItemInput>>;
  rating?: InputMaybe<ApiReviewRatingUpdateInput>;
  /** Create, update, or delete replies owned by this review. */
  replies?: InputMaybe<ApiReviewRepliesUpdateInput>;
  subject?: InputMaybe<ApiReviewSubjectUpdateInput>;
  verification?: InputMaybe<ApiReviewVerificationUpdateInput>;
};

export type ApiReviewUpdatePayload = {
  __typename?: "ReviewUpdatePayload";
  operationResults: Array<ApiReviewsOperationResult>;
  review?: Maybe<ApiReview>;
  userErrors: Array<ApiGenericUserError>;
};

export enum ReviewVerificationStatus {
  Revoked = "REVOKED",
  Unverified = "UNVERIFIED",
  Verified = "VERIFIED",
}

export type ApiReviewVerificationUpdateInput = {
  method?: InputMaybe<Scalars["String"]["input"]>;
  status: ReviewVerificationStatus;
  verifiedAt?: InputMaybe<Scalars["DateTime"]["input"]>;
};

/** Filter conditions for Review */
export type ApiReviewWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiReviewWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiReviewWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiReviewWhereInput>>;
  /** Filter by authorCustomerId */
  authorCustomerId?: InputMaybe<ApiIdFilter>;
  /** Filter by authorDisplayName */
  authorDisplayName?: InputMaybe<ApiStringFilter>;
  /** Filter by authorType */
  authorType?: InputMaybe<ApiStringFilter>;
  /** Filter by body */
  body?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by deletedAt */
  deletedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by dislikeCount */
  dislikeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isIncentivized */
  isIncentivized?: InputMaybe<ApiBooleanFilter>;
  /** Filter by likeCount */
  likeCount?: InputMaybe<ApiIntFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by mediaCount */
  mediaCount?: InputMaybe<ApiIntFilter>;
  /** Filter by openReportCount */
  openReportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by orderId */
  orderId?: InputMaybe<ApiIdFilter>;
  /** Filter by orderLineId */
  orderLineId?: InputMaybe<ApiIdFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by publishedAt */
  publishedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by rating */
  rating?: InputMaybe<ApiIntFilter>;
  /** Filter by reportCount */
  reportCount?: InputMaybe<ApiIntFilter>;
  /** Filter by revision */
  revision?: InputMaybe<ApiIntFilter>;
  /** Filter by sourceChannel */
  sourceChannel?: InputMaybe<ApiStringFilter>;
  /** Filter by status */
  status?: InputMaybe<ApiStringFilter>;
  /** Filter by title */
  title?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
  /** Filter by verificationStatus */
  verificationStatus?: InputMaybe<ApiStringFilter>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutation = {
  __typename?: "ReviewsMutation";
  contentExternalReferenceCreate: ApiReviewContentExternalReferenceCreatePayload;
  contentExternalReferenceDelete: ApiReviewContentExternalReferenceDeletePayload;
  contentExternalReferenceUpdate: ApiReviewContentExternalReferenceUpdatePayload;
  contentRedact: ApiReviewContentUpdatePayload;
  contentReportUpdate: ApiReviewContentReportUpdatePayload;
  contentRevisionRestore: ApiReviewContentUpdatePayload;
  moderationCaseCreate: ApiReviewModerationCaseCreatePayload;
  moderationCaseUpdate: ApiReviewModerationCaseUpdatePayload;
  productQuestionCreate: ApiProductQuestionCreatePayload;
  productQuestionDelete: ApiProductQuestionDeletePayload;
  productQuestionSubscriptionUpdate: ApiProductQuestionSubscriptionUpdatePayload;
  productQuestionUpdate: ApiProductQuestionUpdatePayload;
  ratingCriterionCreate: ApiReviewRatingCriterionCreatePayload;
  ratingCriterionDelete: ApiReviewRatingCriterionDeletePayload;
  ratingCriterionUpdate: ApiReviewRatingCriterionUpdatePayload;
  reviewCreate: ApiReviewCreatePayload;
  reviewDelete: ApiReviewDeletePayload;
  reviewRequestCreate: ApiReviewRequestCreatePayload;
  reviewRequestUpdate: ApiReviewRequestUpdatePayload;
  reviewUpdate: ApiReviewUpdatePayload;
  storeConfigurationUpdate: ApiReviewStoreConfigurationUpdatePayload;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceCreateArgs = {
  input: ApiReviewContentExternalReferenceCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceDeleteArgs = {
  input: ApiReviewContentExternalReferenceDeleteInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentExternalReferenceUpdateArgs = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  externalReferenceId: Scalars["ID"]["input"];
  operations?: InputMaybe<ApiReviewContentExternalReferenceUpdateInput>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentRedactArgs = {
  contentId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentReportUpdateArgs = {
  contentReportId: Scalars["ID"]["input"];
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  operations?: InputMaybe<ApiReviewContentReportUpdateInput>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationContentRevisionRestoreArgs = {
  contentId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  revision: Scalars["Int"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationModerationCaseCreateArgs = {
  input: ApiReviewModerationCaseCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationModerationCaseUpdateArgs = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  moderationCaseId: Scalars["ID"]["input"];
  operations?: InputMaybe<ApiReviewModerationCaseUpdateInput>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionCreateArgs = {
  input: ApiProductQuestionCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionSubscriptionUpdateArgs = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  operations?: InputMaybe<ApiProductQuestionSubscriptionUpdateInput>;
  subscriptionId: Scalars["ID"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationProductQuestionUpdateArgs = {
  expectedRevision: Scalars["Int"]["input"];
  operations?: InputMaybe<ApiProductQuestionUpdateInput>;
  productQuestionId: Scalars["ID"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionCreateArgs = {
  input: ApiReviewRatingCriterionCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionDeleteArgs = {
  input: ApiReviewRatingCriterionDeleteInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationRatingCriterionUpdateArgs = {
  criterionId: Scalars["ID"]["input"];
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  operations?: InputMaybe<ApiReviewRatingCriterionUpdateInput>;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewCreateArgs = {
  input: ApiReviewCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewDeleteArgs = {
  input: ApiReviewContentDeleteInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewRequestCreateArgs = {
  input: ApiReviewRequestCreateInput;
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewRequestUpdateArgs = {
  expectedUpdatedAt: Scalars["DateTime"]["input"];
  operations?: InputMaybe<ApiReviewRequestUpdateInput>;
  reviewRequestId: Scalars["ID"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationReviewUpdateArgs = {
  expectedRevision: Scalars["Int"]["input"];
  operations?: InputMaybe<ApiReviewUpdateInput>;
  reviewId: Scalars["ID"]["input"];
};

/** Administrative commands. Storefront submission and engagement commands live elsewhere. */
export type ApiReviewsMutationStoreConfigurationUpdateArgs = {
  configurationId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  operations?: InputMaybe<ApiReviewStoreConfigurationUpdateInput>;
};

/** Result for one section of a unified update. */
export type ApiReviewsOperationResult = {
  __typename?: "ReviewsOperationResult";
  applied: Scalars["Boolean"]["output"];
  clientMutationId?: Maybe<Scalars["String"]["output"]>;
  entityId?: Maybe<Scalars["ID"]["output"]>;
  errors: Array<ApiGenericUserError>;
  type: ReviewsOperationType;
};

/** Logical sections executed by unified admin update workflows. */
export enum ReviewsOperationType {
  ContentAuthorUpdate = "CONTENT_AUTHOR_UPDATE",
  ContentExternalReferenceUpdate = "CONTENT_EXTERNAL_REFERENCE_UPDATE",
  ContentModerationUpdate = "CONTENT_MODERATION_UPDATE",
  ContentPublicationsSync = "CONTENT_PUBLICATIONS_SYNC",
  ContentRedact = "CONTENT_REDACT",
  ContentReportUpdate = "CONTENT_REPORT_UPDATE",
  ContentRevisionRestore = "CONTENT_REVISION_RESTORE",
  ContentSourceUpdate = "CONTENT_SOURCE_UPDATE",
  ContentTranslationsSync = "CONTENT_TRANSLATIONS_SYNC",
  ContentUpdate = "CONTENT_UPDATE",
  ModerationCaseUpdate = "MODERATION_CASE_UPDATE",
  ProductQuestionAnswerCreate = "PRODUCT_QUESTION_ANSWER_CREATE",
  ProductQuestionAnswerDelete = "PRODUCT_QUESTION_ANSWER_DELETE",
  ProductQuestionAnswerUpdate = "PRODUCT_QUESTION_ANSWER_UPDATE",
  ProductQuestionSubscriptionUpdate = "PRODUCT_QUESTION_SUBSCRIPTION_UPDATE",
  ProductQuestionUpdate = "PRODUCT_QUESTION_UPDATE",
  RatingCriterionApplicabilityUpdate = "RATING_CRITERION_APPLICABILITY_UPDATE",
  RatingCriterionAssignmentsSync = "RATING_CRITERION_ASSIGNMENTS_SYNC",
  RatingCriterionDefinitionUpdate = "RATING_CRITERION_DEFINITION_UPDATE",
  RatingCriterionTranslationsSync = "RATING_CRITERION_TRANSLATIONS_SYNC",
  ReviewIncentiveUpdate = "REVIEW_INCENTIVE_UPDATE",
  ReviewMediaSync = "REVIEW_MEDIA_SYNC",
  ReviewRatingUpdate = "REVIEW_RATING_UPDATE",
  ReviewReplyCreate = "REVIEW_REPLY_CREATE",
  ReviewReplyDelete = "REVIEW_REPLY_DELETE",
  ReviewReplyUpdate = "REVIEW_REPLY_UPDATE",
  ReviewRequestUpdate = "REVIEW_REQUEST_UPDATE",
  ReviewSubjectUpdate = "REVIEW_SUBJECT_UPDATE",
  ReviewVerificationUpdate = "REVIEW_VERIFICATION_UPDATE",
  StoreConfigurationUpdate = "STORE_CONFIGURATION_UPDATE",
}

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQuery = {
  __typename?: "ReviewsQuery";
  /** Any moderated content aggregate owned by Reviews. */
  content?: Maybe<ApiReviewContent>;
  contentExternalReference?: Maybe<ApiReviewContentExternalReference>;
  contentExternalReferences: ApiReviewContentExternalReferenceConnection;
  contentReport?: Maybe<ApiReviewContentReport>;
  contentReports: ApiReviewContentReportConnection;
  contents: ApiReviewContentConnection;
  moderationCase?: Maybe<ApiReviewModerationCase>;
  moderationCases: ApiReviewModerationCaseConnection;
  /** Resolve a Reviews-owned node by global ID. */
  node?: Maybe<ApiNode>;
  /** Resolve multiple Reviews-owned nodes while preserving input order. */
  nodes: Array<Maybe<ApiNode>>;
  productQuestion?: Maybe<ApiProductQuestion>;
  productQuestionAnswer?: Maybe<ApiProductQuestionAnswer>;
  productQuestionAnswers: ApiProductQuestionAnswerConnection;
  productQuestions: ApiProductQuestionConnection;
  ratingCriteria: ApiReviewRatingCriterionConnection;
  ratingCriterion?: Maybe<ApiReviewRatingCriterion>;
  review?: Maybe<ApiReview>;
  reviewReplies: ApiReviewReplyConnection;
  reviewReply?: Maybe<ApiReviewReply>;
  reviewRequest?: Maybe<ApiReviewRequest>;
  reviewRequests: ApiReviewRequestConnection;
  reviews: ApiReviewConnection;
  /** Current store review and Q&A configuration. */
  storeConfiguration?: Maybe<ApiReviewStoreConfiguration>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentExternalReferenceArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentExternalReferencesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiReviewContentExternalReferenceOrderByInput>>;
  where?: InputMaybe<ApiReviewContentExternalReferenceWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentReportArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentReportsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiReviewContentReportOrderByInput>>;
  where?: InputMaybe<ApiReviewContentReportWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryContentsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewContentOrderByInput>>;
  where?: InputMaybe<ApiReviewContentWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryModerationCaseArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryModerationCasesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiReviewModerationCaseOrderByInput>>;
  where?: InputMaybe<ApiReviewModerationCaseWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryNodeArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionAnswerArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionAnswersArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionAnswerOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionAnswerWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryProductQuestionsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiProductQuestionOrderByInput>>;
  where?: InputMaybe<ApiProductQuestionWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryRatingCriteriaArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiReviewRatingCriterionOrderByInput>>;
  where?: InputMaybe<ApiReviewRatingCriterionWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryRatingCriterionArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRepliesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewReplyOrderByInput>>;
  where?: InputMaybe<ApiReviewReplyWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewReplyArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRequestArgs = {
  id: Scalars["ID"]["input"];
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewRequestsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiReviewRequestOrderByInput>>;
  where?: InputMaybe<ApiReviewRequestWhereInput>;
};

/** Administrative reads for review, Q&A, moderation, and configuration data. */
export type ApiReviewsQueryReviewsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  meta?: InputMaybe<ApiReviewContentConnectionMetaInput>;
  orderBy?: InputMaybe<Array<ApiReviewOrderByInput>>;
  where?: InputMaybe<ApiReviewWhereInput>;
};

/** Rich text content in multiple formats. */
export type ApiRichText = {
  __typename?: "RichText";
  /** HTML content. */
  html: Scalars["String"]["output"];
  /** EditorJS JSON content. */
  json: Scalars["JSON"]["output"];
  /** Plain text content. */
  text: Scalars["String"]["output"];
};

/** Input for rich text content. */
export type ApiRichTextInput = {
  /** HTML content. */
  html: Scalars["String"]["input"];
  /** EditorJS JSON content. */
  json: Scalars["JSON"]["input"];
  /** Plain text content. */
  text: Scalars["String"]["input"];
};

/** Role with permissions - universal, can be assigned at any level. */
export type ApiRole = {
  __typename?: "Role";
  /** Role creation date. */
  createdAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Role description. */
  description?: Maybe<Scalars["String"]["output"]>;
  /** Human-readable display name. */
  displayName: Scalars["String"]["output"];
  /**
   * Domain scope for this role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars["String"]["output"];
  /** Unique identifier. */
  id: Scalars["ID"]["output"];
  /** System role cannot be deleted or modified. */
  isSystem: Scalars["Boolean"]["output"];
  /** Unique role name within organization (e.g.: admin, manager, viewer). */
  name: Scalars["String"]["output"];
  /** Role permissions. */
  permissions: Array<ApiRolePermission>;
  /** Role last update date. */
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
};

/** Role assignment - assigns role to user in specific domain. */
export type ApiRoleAssignment = {
  /** Domain ID ("org" for organization, or "store:{uuid}"). */
  domain: Scalars["String"]["input"];
  /** Role name. */
  role: Scalars["String"]["input"];
};

/** Input for creating a role. */
export type ApiRoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** Display name. */
  displayName: Scalars["String"]["input"];
  /**
   * Domain scope for role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars["String"]["input"];
  /** Unique role name (slug). */
  name: Scalars["String"]["input"];
  /** Organization ID where the role will be created. */
  organizationId: Scalars["ID"]["input"];
  /** Role permissions. */
  permissions: Array<ApiRolePermissionInput>;
};

export type ApiRoleCreatePayload = {
  __typename?: "RoleCreatePayload";
  role?: Maybe<ApiRole>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a role. */
export type ApiRoleDeleteInput = {
  /** Role ID to delete. */
  id: Scalars["ID"]["input"];
  /** Organization ID where the role exists. */
  organizationId: Scalars["ID"]["input"];
};

export type ApiRoleDeletePayload = {
  __typename?: "RoleDeletePayload";
  deletedRoleName?: Maybe<Scalars["String"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** Role mutations. */
export type ApiRoleMutation = {
  __typename?: "RoleMutation";
  /**
   * Create custom role.
   * Requires: project:admin permission.
   */
  roleCreate: ApiRoleCreatePayload;
  /**
   * Delete custom role.
   * Requires: project:admin permission.
   * System roles cannot be deleted.
   * Roles with assigned users cannot be deleted.
   */
  roleDelete: ApiRoleDeletePayload;
  /**
   * Update role.
   * Requires: project:admin permission.
   * System roles cannot be modified.
   */
  roleUpdate: ApiRoleUpdatePayload;
};

/** Role mutations. */
export type ApiRoleMutationRoleCreateArgs = {
  input: ApiRoleCreateInput;
};

/** Role mutations. */
export type ApiRoleMutationRoleDeleteArgs = {
  input: ApiRoleDeleteInput;
};

/** Role mutations. */
export type ApiRoleMutationRoleUpdateArgs = {
  input: ApiRoleUpdateInput;
};

/** Role permission - access to resource with specific actions. */
export type ApiRolePermission = {
  __typename?: "RolePermission";
  /** Allowed actions (e.g.: create, read, update, delete). */
  actions: Array<Scalars["String"]["output"]>;
  /** Resource name (e.g.: org.profile, store.members). */
  resource: Scalars["String"]["output"];
};

/** Input for role permission. */
export type ApiRolePermissionInput = {
  /** Action level (read, write, admin). Higher levels include lower ones. */
  action: Action;
  /** Resource (e.g.: org.profile, store.members). */
  resource: Scalars["String"]["input"];
};

/** Input for updating a role. */
export type ApiRoleUpdateInput = {
  /** New description. */
  description?: InputMaybe<Scalars["String"]["input"]>;
  /** New display name. */
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  /** Role ID to update. */
  id: Scalars["ID"]["input"];
  /** Organization ID where the role exists. */
  organizationId: Scalars["ID"]["input"];
  /** New permissions (completely replaces existing). */
  permissions?: InputMaybe<Array<ApiRolePermissionInput>>;
};

export type ApiRoleUpdatePayload = {
  __typename?: "RoleUpdatePayload";
  role?: Maybe<ApiRole>;
  userErrors: Array<ApiGenericUserError>;
};

/** S3-specific file data. */
export type ApiS3ObjectData = {
  __typename?: "S3ObjectData";
  /** The bucket ID where this file is stored. */
  bucketId: Scalars["ID"]["output"];
  /** ETag from S3. */
  etag?: Maybe<Scalars["String"]["output"]>;
  /** S3 object key (path within bucket). */
  objectKey: Scalars["String"]["output"];
  /** Storage class (STANDARD, GLACIER, etc). */
  storageClass: Scalars["String"]["output"];
};

export type ApiSearchConfigurationDeleteInput = {
  expectedVersion: Scalars["Int"]["input"];
  id: Scalars["ID"]["input"];
};

export enum SearchExecutionMode {
  Fuzzy = "FUZZY",
  Primary = "PRIMARY",
}

export type ApiSearchExplain = {
  __typename?: "SearchExplain";
  applicableProductBoostIds: Array<Scalars["ID"]["output"]>;
  boostOnlyCandidateCount: Scalars["Int"]["output"];
  candidateCount: Scalars["Int"]["output"];
  locale: LocaleCode;
  matchedSynonymGroupIds: Array<Scalars["ID"]["output"]>;
  membershipSerializedBytes: Scalars["Int"]["output"];
  mode: SearchExecutionMode;
  normalizationContractVersion: Scalars["String"]["output"];
  normalizationProfileRevision: Scalars["String"]["output"];
  normalizedQuery: Scalars["String"]["output"];
  originalQuery: Scalars["String"]["output"];
  planFingerprint: Scalars["String"]["output"];
  reasons: Array<SearchExplainReason>;
  settings: ApiSearchExplainSettings;
  units: Array<ApiSearchExplainUnit>;
  wholeQueryClauses: Array<ApiSearchExplainClause>;
};

export type ApiSearchExplainClause = {
  __typename?: "SearchExplainClause";
  alternatives: Array<ApiSearchExplainClause>;
  fields: Array<SearchField>;
  kind: SearchExplainClauseKind;
  lexemes: Array<Scalars["String"]["output"]>;
  requireSameElement: Scalars["Boolean"]["output"];
  synonymGroupId?: Maybe<Scalars["ID"]["output"]>;
  value?: Maybe<Scalars["String"]["output"]>;
};

export enum SearchExplainClauseKind {
  FtsPhrase = "FTS_PHRASE",
  FtsTerms = "FTS_TERMS",
  IdentifierExact = "IDENTIFIER_EXACT",
  IdentifierPrefix = "IDENTIFIER_PREFIX",
  Synonym = "SYNONYM",
}

export type ApiSearchExplainFieldWeight = {
  __typename?: "SearchExplainFieldWeight";
  field: SearchField;
  weight: Scalars["Float"]["output"];
};

export enum SearchExplainReason {
  BoostOnlyCandidate = "BOOST_ONLY_CANDIDATE",
  FuzzyFallback = "FUZZY_FALLBACK",
  IdentifierExpansion = "IDENTIFIER_EXPANSION",
  ProductBoost = "PRODUCT_BOOST",
  StopwordRemoval = "STOPWORD_REMOVAL",
  SynonymExpansion = "SYNONYM_EXPANSION",
  TypoExpansion = "TYPO_EXPANSION",
}

export type ApiSearchExplainSettings = {
  __typename?: "SearchExplainSettings";
  enabledFields: Array<SearchField>;
  fieldWeights: Array<ApiSearchExplainFieldWeight>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars["Boolean"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiSearchExplainTypoAlternative = {
  __typename?: "SearchExplainTypoAlternative";
  editDistance: Scalars["Int"]["output"];
  lexemes: Array<Scalars["String"]["output"]>;
  trigramSimilarity: Scalars["Float"]["output"];
  value: Scalars["String"]["output"];
};

export type ApiSearchExplainUnit = {
  __typename?: "SearchExplainUnit";
  /** Executed clauses; emitted once on the first token of a grouped plan unit. */
  clauses: Array<ApiSearchExplainClause>;
  kind: SearchLexicalUnitKind;
  lexemes: Array<Scalars["String"]["output"]>;
  normalized: Scalars["String"]["output"];
  /** Required plan unit containing this token, or null for a removed stopword. */
  planUnitIndex?: Maybe<Scalars["Int"]["output"]>;
  removedAsStopword: Scalars["Boolean"]["output"];
  source: Scalars["String"]["output"];
  typoAlternatives: Array<ApiSearchExplainTypoAlternative>;
};

export enum SearchField {
  CategoryName = "CATEGORY_NAME",
  ProductTitle = "PRODUCT_TITLE",
  VariantTitle = "VARIANT_TITLE",
  VendorName = "VENDOR_NAME",
}

export type ApiSearchFieldConfiguration = {
  __typename?: "SearchFieldConfiguration";
  field: SearchField;
  weight: Scalars["Float"]["output"];
};

export type ApiSearchFieldConfigurationInput = {
  field: SearchField;
  weight: Scalars["Float"]["input"];
};

export enum SearchLexicalUnitKind {
  Code = "CODE",
  Foreign = "FOREIGN",
  MixedScript = "MIXED_SCRIPT",
  Number = "NUMBER",
  Stopword = "STOPWORD",
  Text = "TEXT",
}

export enum SearchOutOfStockPolicy {
  Hide = "HIDE",
  PlaceLast = "PLACE_LAST",
  Show = "SHOW",
}

export type ApiSearchProductBoost = {
  __typename?: "SearchProductBoost";
  createdAt: Scalars["DateTime"]["output"];
  enabled: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  locale: LocaleCode;
  name: Scalars["String"]["output"];
  phrases: Array<ApiSearchProductBoostPhrase>;
  phrasesCount: Scalars["Int"]["output"];
  products: Array<ApiProduct>;
  productsCount: Scalars["Int"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiSearchProductBoostConnection = {
  __typename?: "SearchProductBoostConnection";
  edges: Array<ApiSearchProductBoostEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiSearchProductBoostCreateInput = {
  clientMutationId: Scalars["String"]["input"];
  enabled: Scalars["Boolean"]["input"];
  locale: LocaleCode;
  name: Scalars["String"]["input"];
  phrases: Array<Scalars["String"]["input"]>;
  productIds: Array<Scalars["ID"]["input"]>;
};

export type ApiSearchProductBoostEdge = {
  __typename?: "SearchProductBoostEdge";
  cursor: Scalars["String"]["output"];
  node: ApiSearchProductBoost;
};

/** Ordering configuration for SearchProductBoost */
export type ApiSearchProductBoostOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchProductBoostOrderField;
};

/** Fields available for sorting SearchProductBoost */
export enum SearchProductBoostOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by enabled */
  Enabled = "enabled",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by name */
  Name = "name",
  /** Sort by phrasesCount */
  PhrasesCount = "phrasesCount",
  /** Sort by productsCount */
  ProductsCount = "productsCount",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by version */
  Version = "version",
}

export type ApiSearchProductBoostPayload = {
  __typename?: "SearchProductBoostPayload";
  productBoost?: Maybe<ApiSearchProductBoost>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchProductBoostPhrase = {
  __typename?: "SearchProductBoostPhrase";
  phrase: Scalars["String"]["output"];
  position: Scalars["Int"]["output"];
};

export type ApiSearchProductBoostUpdateInput = {
  enabled: Scalars["Boolean"]["input"];
  expectedVersion: Scalars["Int"]["input"];
  id: Scalars["ID"]["input"];
  locale: LocaleCode;
  name: Scalars["String"]["input"];
  phrases: Array<Scalars["String"]["input"]>;
  productIds: Array<Scalars["ID"]["input"]>;
};

/** Filter conditions for SearchProductBoost */
export type ApiSearchProductBoostWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiSearchProductBoostWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiSearchProductBoostWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiSearchProductBoostWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<ApiBooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by phrases */
  phrases?: InputMaybe<ApiStringFilter>;
  /** Filter by phrasesCount */
  phrasesCount?: InputMaybe<ApiIntFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by version */
  version?: InputMaybe<ApiIntFilter>;
};

export type ApiSearchProductBoostsMetaInput = {
  /** Match boosts containing any selected Product global ID. */
  productIds: Array<Scalars["ID"]["input"]>;
};

export type ApiSearchSettings = {
  __typename?: "SearchSettings";
  fields: Array<ApiSearchFieldConfiguration>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars["Boolean"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiSearchSettingsOperationResult = {
  __typename?: "SearchSettingsOperationResult";
  applied: Scalars["Boolean"]["output"];
  clientMutationId?: Maybe<Scalars["String"]["output"]>;
  entityId?: Maybe<Scalars["ID"]["output"]>;
  errors: Array<ApiGenericUserError>;
  type: SearchSettingsOperationType;
};

export enum SearchSettingsOperationType {
  SettingsUpdate = "SETTINGS_UPDATE",
}

export type ApiSearchSettingsOperationsInput = {
  /** Main search settings replacement. */
  settings: ApiSearchSettingsValuesInput;
};

export type ApiSearchSettingsUpdatePayload = {
  __typename?: "SearchSettingsUpdatePayload";
  operationResults: Array<ApiSearchSettingsOperationResult>;
  settings?: Maybe<ApiSearchSettings>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchSettingsValuesInput = {
  fields: Array<ApiSearchFieldConfigurationInput>;
  outOfStockPolicy: SearchOutOfStockPolicy;
  typoToleranceEnabled: Scalars["Boolean"]["input"];
};

export type ApiSearchSynonymGroup = {
  __typename?: "SearchSynonymGroup";
  createdAt: Scalars["DateTime"]["output"];
  enabled: Scalars["Boolean"]["output"];
  id: Scalars["ID"]["output"];
  locale: LocaleCode;
  name: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  values: Array<ApiSearchSynonymValue>;
  valuesCount: Scalars["Int"]["output"];
  version: Scalars["Int"]["output"];
};

export type ApiSearchSynonymGroupConnection = {
  __typename?: "SearchSynonymGroupConnection";
  edges: Array<ApiSearchSynonymGroupEdge>;
  pageInfo: ApiPageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ApiSearchSynonymGroupCreateInput = {
  clientMutationId: Scalars["String"]["input"];
  enabled: Scalars["Boolean"]["input"];
  locale: LocaleCode;
  name: Scalars["String"]["input"];
  values: Array<Scalars["String"]["input"]>;
};

export type ApiSearchSynonymGroupEdge = {
  __typename?: "SearchSynonymGroupEdge";
  cursor: Scalars["String"]["output"];
  node: ApiSearchSynonymGroup;
};

/** Ordering configuration for SearchSynonymGroup */
export type ApiSearchSynonymGroupOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: SearchSynonymGroupOrderField;
};

/** Fields available for sorting SearchSynonymGroup */
export enum SearchSynonymGroupOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by enabled */
  Enabled = "enabled",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by name */
  Name = "name",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by valuesCount */
  ValuesCount = "valuesCount",
  /** Sort by version */
  Version = "version",
}

export type ApiSearchSynonymGroupPayload = {
  __typename?: "SearchSynonymGroupPayload";
  synonymGroup?: Maybe<ApiSearchSynonymGroup>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSearchSynonymGroupUpdateInput = {
  enabled: Scalars["Boolean"]["input"];
  expectedVersion: Scalars["Int"]["input"];
  id: Scalars["ID"]["input"];
  locale: LocaleCode;
  name: Scalars["String"]["input"];
  values: Array<Scalars["String"]["input"]>;
};

/** Filter conditions for SearchSynonymGroup */
export type ApiSearchSynonymGroupWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiSearchSynonymGroupWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiSearchSynonymGroupWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiSearchSynonymGroupWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by enabled */
  enabled?: InputMaybe<ApiBooleanFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by terms */
  terms?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by valuesCount */
  valuesCount?: InputMaybe<ApiIntFilter>;
  /** Filter by version */
  version?: InputMaybe<ApiIntFilter>;
};

export type ApiSearchSynonymValue = {
  __typename?: "SearchSynonymValue";
  position: Scalars["Int"]["output"];
  value: Scalars["String"]["output"];
};

/** Represents a selected option for a variant. */
export type ApiSelectedOption = {
  __typename?: "SelectedOption";
  /** The option ID. */
  optionId: Scalars["ID"]["output"];
  /** The selected value ID. */
  optionValueId: Scalars["ID"]["output"];
};

/** Input for selecting an option value for a variant. */
export type ApiSelectedOptionInput = {
  /** The ID of the option. */
  optionId: Scalars["ID"]["input"];
  /** The ID of the option value. */
  optionValueId: Scalars["ID"]["input"];
};

/** SEO and Open Graph metadata. */
export type ApiSeo = {
  __typename?: "Seo";
  /** Open Graph description for social media sharing. */
  ogDescription?: Maybe<Scalars["String"]["output"]>;
  /** Open Graph image for social media sharing. */
  ogImage?: Maybe<ApiFile>;
  /** Open Graph title for social media sharing (max 95 chars). */
  ogTitle?: Maybe<Scalars["String"]["output"]>;
  /** SEO description for search engines (max 160 chars). */
  seoDescription?: Maybe<Scalars["String"]["output"]>;
  /** SEO title for search engines (max 70 chars). */
  seoTitle?: Maybe<Scalars["String"]["output"]>;
};

/** Input for SEO and Open Graph metadata. */
export type ApiSeoInput = {
  /** Open Graph description. */
  ogDescription?: InputMaybe<Scalars["String"]["input"]>;
  /** Open Graph image file ID. */
  ogImageId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Open Graph title (max 95 chars). */
  ogTitle?: InputMaybe<Scalars["String"]["input"]>;
  /** SEO description (max 160 chars). */
  seoDescription?: InputMaybe<Scalars["String"]["input"]>;
  /** SEO title (max 70 chars). */
  seoTitle?: InputMaybe<Scalars["String"]["input"]>;
};

/** User session representing an active login. */
export type ApiSession = {
  __typename?: "Session";
  /** The date and time when the session was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** When the session expires. */
  expiresAt: Scalars["DateTime"]["output"];
  /** The globally unique ID of the session. */
  id: Scalars["ID"]["output"];
  /** IP address from which the session was created. */
  ipAddress?: Maybe<Scalars["String"]["output"]>;
  /** Whether this is the current session making the request. */
  isCurrent: Scalars["Boolean"]["output"];
  /** The date and time when the session was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** User agent string (browser/device info). */
  userAgent?: Maybe<Scalars["String"]["output"]>;
};

/** Payload for revoking all sessions. */
export type ApiSessionRevokeAllPayload = {
  __typename?: "SessionRevokeAllPayload";
  /** Number of sessions revoked. */
  revokedCount: Scalars["Int"]["output"];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for revoking a specific session. */
export type ApiSessionRevokeInput = {
  /** The ID of the session to revoke. */
  sessionId: Scalars["ID"]["input"];
};

/** Payload for session revoke operation. */
export type ApiSessionRevokePayload = {
  __typename?: "SessionRevokePayload";
  /** Whether the session was successfully revoked. */
  success: Scalars["Boolean"]["output"];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiSkuStatusMetric = {
  __typename?: "SkuStatusMetric";
  averageDays?: Maybe<Scalars["Float"]["output"]>;
  count: Scalars["Int"]["output"];
};

export type ApiSmtpAppMutation = {
  __typename?: "SmtpAppMutation";
  smtpConnectionActivate: ApiSmtpConnectionPayload;
  smtpConnectionCreate: ApiSmtpConnectionPayload;
  smtpConnectionDisconnect: ApiSmtpConnectionPayload;
  smtpConnectionUpdate: ApiSmtpConnectionPayload;
};

export type ApiSmtpAppMutationSmtpConnectionActivateArgs = {
  input: ApiSmtpConnectionActionInput;
};

export type ApiSmtpAppMutationSmtpConnectionCreateArgs = {
  input: ApiSmtpConnectionCreateInput;
};

export type ApiSmtpAppMutationSmtpConnectionDisconnectArgs = {
  input: ApiSmtpConnectionActionInput;
};

export type ApiSmtpAppMutationSmtpConnectionUpdateArgs = {
  input: ApiSmtpConnectionUpdateInput;
};

export type ApiSmtpAppQuery = {
  __typename?: "SmtpAppQuery";
  smtpConnection?: Maybe<ApiSmtpConnection>;
  smtpConnections: Array<ApiSmtpConnection>;
  smtpProviderPresets: Array<ApiSmtpProviderPreset>;
};

export type ApiSmtpAppQuerySmtpConnectionArgs = {
  id: Scalars["ID"]["input"];
};

export type ApiSmtpConnection = ApiNode & {
  __typename?: "SmtpConnection";
  createdAt: Scalars["DateTime"]["output"];
  displayName: Scalars["String"]["output"];
  hasPassword: Scalars["Boolean"]["output"];
  host: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  port: Scalars["Int"]["output"];
  provider: SmtpConnectionProvider;
  security: SmtpConnectionSecurity;
  status: SmtpConnectionStatus;
  updatedAt: Scalars["DateTime"]["output"];
  username?: Maybe<Scalars["String"]["output"]>;
};

export type ApiSmtpConnectionActionInput = {
  connectionId: Scalars["ID"]["input"];
};

export type ApiSmtpConnectionCreateInput = {
  displayName: Scalars["String"]["input"];
  host: Scalars["String"]["input"];
  password?: InputMaybe<Scalars["String"]["input"]>;
  port: Scalars["Int"]["input"];
  provider: SmtpConnectionProvider;
  security: SmtpConnectionSecurity;
  username?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiSmtpConnectionPayload = {
  __typename?: "SmtpConnectionPayload";
  connection?: Maybe<ApiSmtpConnection>;
  userErrors: Array<ApiGenericUserError>;
};

export enum SmtpConnectionProvider {
  Custom = "CUSTOM",
  GoogleWorkspace = "GOOGLE_WORKSPACE",
  MailchimpTransactional = "MAILCHIMP_TRANSACTIONAL",
  Sendgrid = "SENDGRID",
}

export enum SmtpConnectionSecurity {
  None = "NONE",
  Starttls = "STARTTLS",
  Tls = "TLS",
}

export enum SmtpConnectionStatus {
  Active = "ACTIVE",
  Disconnected = "DISCONNECTED",
  Inactive = "INACTIVE",
}

export type ApiSmtpConnectionUpdateInput = {
  connectionId: Scalars["ID"]["input"];
  displayName: Scalars["String"]["input"];
  host: Scalars["String"]["input"];
  /**
   * Omit to retain the current password or provide a value to replace it.
   * Clear the username to remove credentials from the connection.
   */
  password?: InputMaybe<Scalars["String"]["input"]>;
  port: Scalars["Int"]["input"];
  provider: SmtpConnectionProvider;
  security: SmtpConnectionSecurity;
  username?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiSmtpProviderPreset = {
  __typename?: "SmtpProviderPreset";
  host?: Maybe<Scalars["String"]["output"]>;
  label: Scalars["String"]["output"];
  port: Scalars["Int"]["output"];
  provider: SmtpConnectionProvider;
  security: SmtpConnectionSecurity;
  username?: Maybe<Scalars["String"]["output"]>;
};

/** Sort direction */
export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export type ApiStaffNotificationRecipient = {
  __typename?: "StaffNotificationRecipient";
  createdAt: Scalars["DateTime"]["output"];
  email: Scalars["String"]["output"];
  enabled: Scalars["Boolean"]["output"];
  eventKeys: Array<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  locale: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
  scope: Scalars["String"]["output"];
  timezone: Scalars["String"]["output"];
  updatedAt: Scalars["DateTime"]["output"];
  userId?: Maybe<Scalars["ID"]["output"]>;
};

export type ApiStaffNotificationRecipientInput = {
  email: Scalars["String"]["input"];
  enabled: Scalars["Boolean"]["input"];
  eventKeys: Array<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["ID"]["input"]>;
  locale: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  timezone: Scalars["String"]["input"];
  userId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiStaffRecipientDeleteInput = {
  id: Scalars["ID"]["input"];
};

export type ApiStaffRecipientDeletePayload = {
  __typename?: "StaffRecipientDeletePayload";
  deletedStaffRecipientId?: Maybe<Scalars["ID"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

export type ApiStaffRecipientUpsertPayload = {
  __typename?: "StaffRecipientUpsertPayload";
  recipient?: Maybe<ApiStaffNotificationRecipient>;
  userErrors: Array<ApiGenericUserError>;
};

/** A store */
export type ApiStore = {
  __typename?: "Store";
  /** Customer-visible store address */
  address?: Maybe<ApiStoreAddress>;
  /** Store brand assets, colors, copy, and social links */
  brand: ApiStoreBrand;
  /** Store contact details and ordered phone numbers */
  contactDetails: ApiStoreContactDetails;
  /** Timestamp when the store was created */
  createdAt: Scalars["DateTime"]["output"];
  /** Currency used by the store */
  currencyCode: CurrencyCode;
  /** Currency and number-formatting settings */
  currencySettings: ApiStoreCurrencySettings;
  /** Default unit for product dimensions */
  defaultDimensionUnit: DimensionUnit;
  /** Default locale for new content */
  defaultLocale: LocaleCode;
  /** Default unit for product weights */
  defaultWeightUnit: WeightUnit;
  /** Regional and measurement defaults */
  defaults: ApiStoreDefaults;
  /** Display name of the store */
  displayName: Scalars["String"]["output"];
  /** Contact email address for the store */
  email?: Maybe<Scalars["String"]["output"]>;
  /** Unique identifier of the store */
  id: Scalars["ID"]["output"];
  /** All configured languages, including inactive drafts */
  languageSettings: Array<ApiLocale>;
  /** List of enabled locale codes for the store */
  locales: Array<LocaleCode>;
  /** Membership info (resolved from IAM by domain) */
  membership: ApiMembership;
  /** URL-friendly unique identifier */
  name: Scalars["String"]["output"];
  /** Order numbering and processing behavior */
  orderProcessing: ApiStoreOrderProcessing;
  /** Organization that owns this store (federation reference) */
  organization?: Maybe<ApiOrganization>;
  /** Optimistic locking revision incremented by each unified update */
  revision: Scalars["Int"]["output"];
  /** Current operational status of the store */
  status: StoreStatus;
  /** IANA timezone identifier for the store */
  timezone: Scalars["String"]["output"];
  /** Timestamp when the store was last updated */
  updatedAt: Scalars["DateTime"]["output"];
};

export type ApiStoreAddress = {
  __typename?: "StoreAddress";
  addressLine1?: Maybe<Scalars["String"]["output"]>;
  addressLine2?: Maybe<Scalars["String"]["output"]>;
  administrativeArea?: Maybe<Scalars["String"]["output"]>;
  city?: Maybe<Scalars["String"]["output"]>;
  companyName?: Maybe<Scalars["String"]["output"]>;
  countryCode: Scalars["String"]["output"];
  postalCode?: Maybe<Scalars["String"]["output"]>;
};

export type ApiStoreAddressUpdateInput = {
  addressLine1?: InputMaybe<Scalars["String"]["input"]>;
  addressLine2?: InputMaybe<Scalars["String"]["input"]>;
  administrativeArea?: InputMaybe<Scalars["String"]["input"]>;
  city?: InputMaybe<Scalars["String"]["input"]>;
  companyName?: InputMaybe<Scalars["String"]["input"]>;
  countryCode: Scalars["String"]["input"];
  postalCode?: InputMaybe<Scalars["String"]["input"]>;
};

export type ApiStoreBrand = {
  __typename?: "StoreBrand";
  coverImage?: Maybe<ApiFile>;
  defaultLogo?: Maybe<ApiFile>;
  primaryColor: Scalars["String"]["output"];
  secondaryColor: Scalars["String"]["output"];
  shortDescription?: Maybe<Scalars["String"]["output"]>;
  slogan?: Maybe<Scalars["String"]["output"]>;
  socialLinks: Array<ApiStoreSocialLink>;
  squareLogo?: Maybe<ApiFile>;
};

export type ApiStoreBrandUpdateInput = {
  coverImageId?: InputMaybe<Scalars["ID"]["input"]>;
  defaultLogoId?: InputMaybe<Scalars["ID"]["input"]>;
  primaryColor: Scalars["String"]["input"];
  secondaryColor: Scalars["String"]["input"];
  shortDescription?: InputMaybe<Scalars["String"]["input"]>;
  slogan?: InputMaybe<Scalars["String"]["input"]>;
  socialLinks: Array<ApiStoreSocialLinkInput>;
  squareLogoId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ApiStoreContactDetails = {
  __typename?: "StoreContactDetails";
  email?: Maybe<Scalars["Email"]["output"]>;
  name: Scalars["String"]["output"];
  phoneNumbers: Array<Scalars["String"]["output"]>;
  slug: Scalars["String"]["output"];
};

export type ApiStoreContactDetailsUpdateInput = {
  email?: InputMaybe<Scalars["Email"]["input"]>;
  name: Scalars["String"]["input"];
  phoneNumbers: Array<Scalars["String"]["input"]>;
  slug: Scalars["String"]["input"];
};

/** Input for creating a new store */
export type ApiStoreCreateInput = {
  /** Currency used by the store */
  currencyCode: CurrencyCode;
  /** Display name of the store */
  displayName: Scalars["String"]["input"];
  /** Contact email address */
  email?: InputMaybe<Scalars["String"]["input"]>;
  /** Initial list of locale codes to enable */
  locales: Array<LocaleCode>;
  /** URL-friendly unique identifier */
  name: Scalars["String"]["input"];
  /** ID of the organization where the store will be created */
  organizationId: Scalars["ID"]["input"];
  /** Initial status of the store */
  status?: InputMaybe<StoreStatus>;
  /** IANA timezone identifier */
  timezone?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload returned after creating a store */
export type ApiStoreCreatePayload = {
  __typename?: "StoreCreatePayload";
  /** The newly created store, null if creation failed */
  store?: Maybe<ApiStore>;
  /** List of errors that occurred during creation */
  userErrors: Array<ApiUserError>;
};

export type ApiStoreCurrencySettings = {
  __typename?: "StoreCurrencySettings";
  currencyCode: CurrencyCode;
  currencyDisplay: CurrencyDisplay;
  currencySign: CurrencySign;
  grouping: CurrencyGrouping;
  maximumFractionDigits: Scalars["Int"]["output"];
  minimumFractionDigits: Scalars["Int"]["output"];
  roundingMode: CurrencyRoundingMode;
  signDisplay: CurrencySignDisplay;
  trailingZeroDisplay: CurrencyTrailingZeroDisplay;
};

export type ApiStoreCurrencySettingsUpdateInput = {
  currencyDisplay: CurrencyDisplay;
  currencySign: CurrencySign;
  grouping: CurrencyGrouping;
  maximumFractionDigits: Scalars["Int"]["input"];
  minimumFractionDigits: Scalars["Int"]["input"];
  roundingMode: CurrencyRoundingMode;
  signDisplay: CurrencySignDisplay;
  trailingZeroDisplay: CurrencyTrailingZeroDisplay;
};

export type ApiStoreDefaults = {
  __typename?: "StoreDefaults";
  defaultDimensionUnit: DimensionUnit;
  defaultWeightUnit: WeightUnit;
  timezone: Scalars["String"]["output"];
  unitSystem: UnitSystem;
};

export type ApiStoreDefaultsUpdateInput = {
  defaultDimensionUnit: DimensionUnit;
  defaultWeightUnit: WeightUnit;
  timezone: Scalars["String"]["input"];
  unitSystem: UnitSystem;
};

/** Input for deleting a store */
export type ApiStoreDeleteInput = {
  /** ID of the store to delete */
  id: Scalars["ID"]["input"];
  /** Organization name for authorization context */
  organizationId: Scalars["ID"]["input"];
};

/** Payload returned after deleting a store */
export type ApiStoreDeletePayload = {
  __typename?: "StoreDeletePayload";
  /** ID of the deleted store, null if deletion failed */
  deletedStoreId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during deletion */
  userErrors: Array<ApiUserError>;
};

/** Mutations for store management */
export type ApiStoreMutation = {
  __typename?: "StoreMutation";
  /** Add a new locale to the store */
  localeCreate: ApiLocaleCreatePayload;
  /** Remove a locale from the store */
  localeDelete: ApiLocaleDeletePayload;
  /** Set the default locale for the store */
  localeSetDefault: ApiLocaleUpdatePayload;
  /** Create a new store */
  storeCreate: ApiStoreCreatePayload;
  /** Delete a store */
  storeDelete: ApiStoreDeletePayload;
  /** Unified store update composed from independent settings operations */
  storeUpdate: ApiStoreUpdatePayload;
};

/** Mutations for store management */
export type ApiStoreMutationLocaleCreateArgs = {
  input: ApiLocaleCreateInput;
};

/** Mutations for store management */
export type ApiStoreMutationLocaleDeleteArgs = {
  input: ApiLocaleDeleteInput;
};

/** Mutations for store management */
export type ApiStoreMutationLocaleSetDefaultArgs = {
  input: ApiLocaleSetDefaultInput;
};

/** Mutations for store management */
export type ApiStoreMutationStoreCreateArgs = {
  input: ApiStoreCreateInput;
};

/** Mutations for store management */
export type ApiStoreMutationStoreDeleteArgs = {
  input: ApiStoreDeleteInput;
};

/** Mutations for store management */
export type ApiStoreMutationStoreUpdateArgs = {
  clientMutationId: Scalars["String"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  operations?: InputMaybe<ApiStoreUpdateInput>;
  storeId: Scalars["ID"]["input"];
};

export type ApiStoreOrderProcessing = {
  __typename?: "StoreOrderProcessing";
  automaticFulfillmentMode: AutomaticFulfillmentMode;
  automaticallyArchiveOrders: Scalars["Boolean"]["output"];
  orderNumberPrefix: Scalars["String"]["output"];
  orderNumberSuffix?: Maybe<Scalars["String"]["output"]>;
  requireCheckoutConfirmation: Scalars["Boolean"]["output"];
};

export type ApiStoreOrderProcessingUpdateInput = {
  automaticFulfillmentMode: AutomaticFulfillmentMode;
  automaticallyArchiveOrders: Scalars["Boolean"]["input"];
  orderNumberPrefix: Scalars["String"]["input"];
  orderNumberSuffix?: InputMaybe<Scalars["String"]["input"]>;
  requireCheckoutConfirmation: Scalars["Boolean"]["input"];
};

/** Queries for store management */
export type ApiStoreQuery = {
  __typename?: "StoreQuery";
  /** Get the current store from context */
  currentStore?: Maybe<ApiStore>;
  /** Get all stores accessible to the current user in the organization */
  stores: Array<ApiStore>;
};

/** Queries for store management */
export type ApiStoreQueryStoresArgs = {
  organizationId: Scalars["ID"]["input"];
};

export type ApiStoreSocialLink = {
  __typename?: "StoreSocialLink";
  platform: Scalars["String"]["output"];
  url: Scalars["String"]["output"];
};

export type ApiStoreSocialLinkInput = {
  platform: Scalars["String"]["input"];
  url: Scalars["String"]["input"];
};

/** Status of a store */
export enum StoreStatus {
  /** Store is active and operational */
  Active = "ACTIVE",
  /** Store is inactive and not processing requests */
  Inactive = "INACTIVE",
}

/** Independent sections accepted by the unified store update mutation. */
export type ApiStoreUpdateInput = {
  address?: InputMaybe<ApiStoreAddressUpdateInput>;
  brand?: InputMaybe<ApiStoreBrandUpdateInput>;
  contactDetails?: InputMaybe<ApiStoreContactDetailsUpdateInput>;
  currencySettings?: InputMaybe<ApiStoreCurrencySettingsUpdateInput>;
  defaults?: InputMaybe<ApiStoreDefaultsUpdateInput>;
  orderProcessing?: InputMaybe<ApiStoreOrderProcessingUpdateInput>;
};

export type ApiStoreUpdateOperationResult = {
  __typename?: "StoreUpdateOperationResult";
  applied: Scalars["Boolean"]["output"];
  errors: Array<ApiUserError>;
  type: StoreUpdateOperationType;
};

export enum StoreUpdateOperationType {
  AddressUpdate = "ADDRESS_UPDATE",
  BrandUpdate = "BRAND_UPDATE",
  ContactDetailsUpdate = "CONTACT_DETAILS_UPDATE",
  CurrencySettingsUpdate = "CURRENCY_SETTINGS_UPDATE",
  DefaultsUpdate = "DEFAULTS_UPDATE",
  OrderProcessingUpdate = "ORDER_PROCESSING_UPDATE",
}

/** Payload returned after updating a store */
export type ApiStoreUpdatePayload = {
  __typename?: "StoreUpdatePayload";
  /** Result of every requested operation in deterministic input order */
  operationResults: Array<ApiStoreUpdateOperationResult>;
  /** The updated store, null if update failed */
  store?: Maybe<ApiStore>;
  /** Aggregated errors from all operations */
  userErrors: Array<ApiUserError>;
};

/** The Storefront API permissions granted to a Headless storefront. */
export type ApiStorefrontAccessPolicy = {
  __typename?: "StorefrontAccessPolicy";
  /** Immutable, sorted Storefront permission handles. */
  permissions: Array<Scalars["String"]["output"]>;
  /** Optimistic concurrency revision. */
  revision: Scalars["Int"]["output"];
  /** When the policy or its grants were last changed. */
  updatedAt: Scalars["DateTime"]["output"];
};

/** Payload returned after updating a storefront access policy. */
export type ApiStorefrontAccessPolicyPayload = {
  __typename?: "StorefrontAccessPolicyPayload";
  policy?: Maybe<ApiStorefrontAccessPolicy>;
  userErrors: Array<ApiGenericUserError>;
};

/** Input for replacing the complete Storefront permission grant set. */
export type ApiStorefrontAccessPolicyUpdateInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  connectionId: Scalars["ID"]["input"];
  expectedRevision: Scalars["Int"]["input"];
  permissions: Array<Scalars["String"]["input"]>;
};

/** Credential metadata. Private plaintext is never exposed by this type. */
export type ApiStorefrontCredential = ApiNode & {
  __typename?: "StorefrontCredential";
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  kind: StorefrontCredentialKind;
  label?: Maybe<Scalars["String"]["output"]>;
  lastUsedAt?: Maybe<Scalars["DateTime"]["output"]>;
  revokedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: StorefrontCredentialStatus;
  /** A redacted suffix suitable for identifying the credential. */
  tokenHint: Scalars["String"]["output"];
};

/** Whether a credential is safe for public clients or restricted to servers. */
export enum StorefrontCredentialKind {
  Private = "PRIVATE",
  Public = "PUBLIC",
}

/** Payload returned after revoking a private storefront credential. */
export type ApiStorefrontCredentialPayload = {
  __typename?: "StorefrontCredentialPayload";
  credential?: Maybe<ApiStorefrontCredential>;
  /** Whether an earlier request with the same client mutation ID was reused. */
  duplicate: Scalars["Boolean"]["output"];
  userErrors: Array<ApiGenericUserError>;
};

/** Input for revoking an existing private storefront credential. */
export type ApiStorefrontCredentialRevokeInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  credentialId: Scalars["ID"]["input"];
};

/** Lifecycle state of a storefront credential. */
export enum StorefrontCredentialStatus {
  Active = "ACTIVE",
  Revoked = "REVOKED",
}

/** Plaintext credentials returned only by the initial create mutation. */
export type ApiStorefrontInitialCredentials = {
  __typename?: "StorefrontInitialCredentials";
  privateAccessToken: Scalars["String"]["output"];
  publicAccessToken: Scalars["String"]["output"];
};

/** Input for creating a private credential for an existing storefront. */
export type ApiStorefrontPrivateCredentialCreateInput = {
  /** A unique client-generated ID, reused only when retrying this request. */
  clientMutationId: Scalars["String"]["input"];
  connectionId: Scalars["ID"]["input"];
  label: Scalars["String"]["input"];
};

/** Payload returned after creating a private storefront credential. */
export type ApiStorefrontPrivateCredentialCreatePayload = {
  __typename?: "StorefrontPrivateCredentialCreatePayload";
  credential?: Maybe<ApiStorefrontCredential>;
  /** Plaintext returned only for the first successful execution. */
  privateAccessToken?: Maybe<Scalars["String"]["output"]>;
  userErrors: Array<ApiGenericUserError>;
};

/** Filter operators for String fields */
export type ApiStringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars["String"]["input"]>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars["String"]["input"]>;
  /** Equals */
  _eq?: InputMaybe<Scalars["String"]["input"]>;
  /** In array */
  _in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** Is null */
  _is?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Not equals */
  _neq?: InputMaybe<Scalars["String"]["input"]>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars["String"]["input"]>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars["String"]["input"]>;
};

/** Type of visual swatch for option values. */
export enum SwatchType {
  Color = "COLOR",
  Gradient = "GRADIENT",
  Image = "IMAGE",
}

/** A tag represents a simple label for organizing and filtering products. */
export type ApiTag = ApiNode & {
  __typename?: "Tag";
  /** The date and time when the tag was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The URL-friendly handle for the tag. */
  handle: Scalars["String"]["output"];
  /** The globally unique ID of the tag. */
  id: Scalars["ID"]["output"];
  /** The display name of the tag. */
  name: Scalars["String"]["output"];
  /** The total number of products with this tag. */
  productsCount: Scalars["Int"]["output"];
};

/** A connection to a list of Tag items. */
export type ApiTagConnection = {
  __typename?: "TagConnection";
  /** A list of edges. */
  edges: Array<ApiTagEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of tags. */
  totalCount: Scalars["Int"]["output"];
};

/** Input for creating a tag. */
export type ApiTagCreateInput = {
  /** The URL-friendly handle for the tag. */
  handle: Scalars["String"]["input"];
  /** The display name of the tag (optional, defaults to handle). */
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for tag creation. */
export type ApiTagCreatePayload = {
  __typename?: "TagCreatePayload";
  /** The created tag. */
  tag?: Maybe<ApiTag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a tag. */
export type ApiTagDeleteInput = {
  /** The ID of the tag to delete. */
  id: Scalars["ID"]["input"];
};

/** Payload for tag deletion. */
export type ApiTagDeletePayload = {
  __typename?: "TagDeletePayload";
  /** The ID of the deleted tag. */
  deletedTagId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Tag connection. */
export type ApiTagEdge = {
  __typename?: "TagEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiTag;
};

/** Ordering configuration for Tag */
export type ApiTagOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: TagOrderField;
};

/** Fields available for sorting Tag */
export enum TagOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by locale */
  Locale = "locale",
  /** Sort by name */
  Name = "name",
  /** Sort by productsCount */
  ProductsCount = "productsCount",
  /** Sort by storeId */
  StoreId = "storeId",
}

/** Input for updating a tag. */
export type ApiTagUpdateInput = {
  /** The URL-friendly handle for the tag. */
  handle?: InputMaybe<Scalars["String"]["input"]>;
  /** The ID of the tag to update. */
  id: Scalars["ID"]["input"];
  /** The display name of the tag. */
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for tag update. */
export type ApiTagUpdatePayload = {
  __typename?: "TagUpdatePayload";
  /** The updated tag. */
  tag?: Maybe<ApiTag>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter conditions for Tag */
export type ApiTagWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiTagWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiTagWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiTagWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by locale */
  locale?: InputMaybe<ApiStringFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by productsCount */
  productsCount?: InputMaybe<ApiIntFilter>;
  /** Filter by storeId */
  storeId?: InputMaybe<ApiIdFilter>;
};

export enum ThresholdMethod {
  ReorderPoint = "REORDER_POINT",
  SafetyStock = "SAFETY_STOCK",
}

export enum UnitSystem {
  Imperial = "IMPERIAL",
  Metric = "METRIC",
}

/** User type representing admin users (CMS/backoffice). */
export type ApiUser = {
  __typename?: "User";
  /** User's avatar image (from Media service). */
  avatar?: Maybe<ApiFile>;
  /** The date and time when the user was created. */
  createdAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** User's email address. */
  email: Scalars["Email"]["output"];
  /** Whether the email has been verified. */
  emailVerified?: Maybe<Scalars["Boolean"]["output"]>;
  /** User's first name. */
  firstName?: Maybe<Scalars["String"]["output"]>;
  /** The globally unique ID of the user. */
  id: Scalars["ID"]["output"];
  /** Whether the user has admin privileges. */
  isAdmin?: Maybe<Scalars["Boolean"]["output"]>;
  /** Whether the user account is deleted. */
  isDeleted?: Maybe<Scalars["Boolean"]["output"]>;
  /** Whether the user account is forbidden/banned. */
  isForbidden?: Maybe<Scalars["Boolean"]["output"]>;
  /**
   * Whether the user has completed their profile (firstName and lastName are filled).
   * Used for onboarding flow to ensure required fields are present.
   */
  isProfileComplete: Scalars["Boolean"]["output"];
  /** User's last name. */
  lastName?: Maybe<Scalars["String"]["output"]>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /** The date and time when the user was last updated. */
  updatedAt?: Maybe<Scalars["DateTime"]["output"]>;
};

/** A user-facing mutation error. */
export type ApiUserError = {
  /** A stable machine-readable error code. */
  code?: Maybe<Scalars["String"]["output"]>;
  /** The input path associated with the error. */
  field?: Maybe<Array<Scalars["String"]["output"]>>;
  /** A human-readable error message. */
  message: Scalars["String"]["output"];
};

export type ApiUserMutation = {
  __typename?: "UserMutation";
  /** Revoke a specific session by ID. */
  sessionRevoke: ApiSessionRevokePayload;
  /** Revoke all sessions except the current one. */
  sessionRevokeAll: ApiSessionRevokeAllPayload;
  userUpdateEmail: ApiUserUpdateEmailPayload;
  userUpdatePassword: ApiUserUpdatePasswordPayload;
  userUpdateProfile: ApiUserUpdateProfilePayload;
};

export type ApiUserMutationSessionRevokeArgs = {
  input: ApiSessionRevokeInput;
};

export type ApiUserMutationUserUpdateEmailArgs = {
  input: ApiUserUpdateEmailInput;
};

export type ApiUserMutationUserUpdatePasswordArgs = {
  input: ApiUserUpdatePasswordInput;
};

export type ApiUserMutationUserUpdateProfileArgs = {
  input: ApiUserUpdateProfileInput;
};

export type ApiUserQuery = {
  __typename?: "UserQuery";
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: ApiAuthorizePayload;
  /** Get current authenticated admin user */
  current?: Maybe<ApiUser>;
  /** Get all active sessions for the current user. */
  mySessions: Array<ApiSession>;
};

export type ApiUserQueryAuthorizeArgs = {
  input: ApiAuthorizeInput;
};

/** Input for admin user authentication. */
export type ApiUserSignInInput = {
  /** Email address. */
  email: Scalars["Email"]["input"];
  /** Password. */
  password: Scalars["String"]["input"];
};

/** Payload for admin user sign in. */
export type ApiUserSignInPayload = {
  __typename?: "UserSignInPayload";
  /** Authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** The authenticated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for admin user sign out. */
export type ApiUserSignOutInput = {
  /** Sign out from all sessions. */
  allSessions?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Payload for admin user sign out. */
export type ApiUserSignOutPayload = {
  __typename?: "UserSignOutPayload";
  /** Whether sign out was successful. */
  success: Scalars["Boolean"]["output"];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for admin user sign up. */
export type ApiUserSignUpInput = {
  /** Email address. */
  email: Scalars["Email"]["input"];
  /** Password. */
  password: Scalars["String"]["input"];
};

/** Payload for admin user sign up. */
export type ApiUserSignUpPayload = {
  __typename?: "UserSignUpPayload";
  /** Authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** The created user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for refreshing admin user access token. */
export type ApiUserTokenRefreshInput = {
  /** Refresh token to use for obtaining new access token. */
  refreshToken: Scalars["String"]["input"];
};

/** Payload for admin user token refresh. */
export type ApiUserTokenRefreshPayload = {
  __typename?: "UserTokenRefreshPayload";
  /** New authentication tokens. */
  token?: Maybe<ApiAuthTokenPayload>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user email. */
export type ApiUserUpdateEmailInput = {
  /** New email address. */
  newEmail: Scalars["Email"]["input"];
};

/** Payload for user email update. */
export type ApiUserUpdateEmailPayload = {
  __typename?: "UserUpdateEmailPayload";
  /** The updated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user password. */
export type ApiUserUpdatePasswordInput = {
  /** Current password. */
  currentPassword: Scalars["String"]["input"];
  /** New password. */
  newPassword: Scalars["String"]["input"];
};

/** Payload for user password update. */
export type ApiUserUpdatePasswordPayload = {
  __typename?: "UserUpdatePasswordPayload";
  /** Whether the password was changed successfully. */
  success: Scalars["Boolean"]["output"];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating user profile. */
export type ApiUserUpdateProfileInput = {
  /** Media file ID for the avatar. Pass null to remove avatar. */
  avatarId?: InputMaybe<Scalars["ID"]["input"]>;
  /** User's first name. */
  firstName?: InputMaybe<Scalars["String"]["input"]>;
  /** User's last name. */
  lastName?: InputMaybe<Scalars["String"]["input"]>;
  /** User's locale/language preference. */
  locale?: InputMaybe<LocaleCode>;
};

/** Payload for user profile update. */
export type ApiUserUpdateProfilePayload = {
  __typename?: "UserUpdateProfilePayload";
  /** The updated user. */
  user?: Maybe<ApiUser>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type ApiVariant = ApiNode & {
  __typename?: "Variant";
  /** The date and time when the variant was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt?: Maybe<Scalars["DateTime"]["output"]>;
  /** Physical dimensions (stored in millimeters). */
  dimensions?: Maybe<ApiVariantDimensions>;
  /** The external ID in the external system. */
  externalId?: Maybe<Scalars["String"]["output"]>;
  /** The external system identifier for integration purposes. */
  externalSystem?: Maybe<Scalars["String"]["output"]>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars["String"]["output"];
  /** The globally unique ID of the variant. */
  id: Scalars["ID"]["output"];
  /** Inventory item associated with this variant. */
  inventoryItem?: Maybe<ApiInventoryItem>;
  /** Whether this is the default variant for the product. */
  isDefault: Scalars["Boolean"]["output"];
  /** Media attached to this variant (images, videos). */
  media: Array<ApiVariantMediaItem>;
  /** Current price for this variant. */
  price?: Maybe<ApiVariantPrice>;
  /** Price history for this variant. */
  priceHistory: ApiVariantPriceConnection;
  /** The product this variant belongs to. */
  product: ApiProduct;
  /** Product component configuration assigned to this variant. */
  productComponentConfiguration?: Maybe<ApiProductComponentConfiguration>;
  /** The selected option values for this variant. */
  selectedOptions: Array<ApiSelectedOption>;
  /** Variant title. */
  title?: Maybe<Scalars["String"]["output"]>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Physical weight (stored in grams). */
  weight?: Maybe<ApiVariantWeight>;
};

/**
 * A variant represents a specific version of a product, such as a size or color.
 * Catalog Service owns this type.
 * Inventory fields (sku, dimensions, weight, cost, stock) are resolved by Catalog.
 */
export type ApiVariantPriceHistoryArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
};

/** A connection to a list of Variant items. */
export type ApiVariantConnection = {
  __typename?: "VariantConnection";
  /** A list of edges. */
  edges: Array<ApiVariantEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of variants. */
  totalCount: Scalars["Int"]["output"];
};

/** Represents the cost of a variant. */
export type ApiVariantCost = ApiNode & {
  __typename?: "VariantCost";
  /** The currency code. */
  currency: CurrencyCode;
  /** When this cost became effective. */
  effectiveFrom: Scalars["DateTime"]["output"];
  /** When this cost stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars["DateTime"]["output"]>;
  /** The globally unique ID of the cost record. */
  id: Scalars["ID"]["output"];
  /** Whether this is the current active cost. */
  isCurrent: Scalars["Boolean"]["output"];
  /** When this cost record was created. */
  recordedAt: Scalars["DateTime"]["output"];
  /** The unit cost in minor units. */
  unitCostMinor: Scalars["BigInt"]["output"];
};

/** A connection to a list of VariantCost items. */
export type ApiVariantCostConnection = {
  __typename?: "VariantCostConnection";
  /** A list of edges. */
  edges: Array<ApiVariantCostEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of cost records. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a VariantCost connection. */
export type ApiVariantCostEdge = {
  __typename?: "VariantCostEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiVariantCost;
};

/** Input for creating a variant with a product ID. */
export type ApiVariantCreateInput = {
  /** The ID of the product to add the variant to. */
  productId: Scalars["ID"]["input"];
  /** The variant data. */
  variant: ApiVariantInput;
};

/** Payload for variant creation. */
export type ApiVariantCreatePayload = {
  __typename?: "VariantCreatePayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for deleting a variant. */
export type ApiVariantDeleteInput = {
  /** The ID of the variant to delete. */
  id: Scalars["ID"]["input"];
  /** Whether to permanently delete the variant (hard delete). */
  permanent?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** Payload for variant deletion. */
export type ApiVariantDeletePayload = {
  __typename?: "VariantDeletePayload";
  /** The ID of the deleted variant. */
  deletedVariantId?: Maybe<Scalars["ID"]["output"]>;
  /** The product the variant belonged to. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type ApiVariantDimensions = {
  __typename?: "VariantDimensions";
  /** Height in millimeters. */
  height: Scalars["Int"]["output"];
  /** Length in millimeters. */
  length: Scalars["Int"]["output"];
  /** Width in millimeters. */
  width: Scalars["Int"]["output"];
};

/** Input for variant dimensions in the unified update. */
export type ApiVariantDimensionsOpInput = {
  /** Height in millimeters. */
  height: Scalars["Int"]["input"];
  /** Length in millimeters. */
  length: Scalars["Int"]["input"];
  /** Width in millimeters. */
  width: Scalars["Int"]["input"];
};

/** An edge in a Variant connection. */
export type ApiVariantEdge = {
  __typename?: "VariantEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiVariant;
};

/** Input for creating a variant. */
export type ApiVariantInput = {
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars["String"]["input"]>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars["String"]["input"]>;
  /** Selected option values for the variant (required). */
  options: Array<ApiSelectedOptionInput>;
  /** Variant title. */
  title?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for variant inventory in the unified update. */
export type ApiVariantInventoryOpInput = {
  /** Whether the variant remains sellable without stock. */
  continueSellingWhenOutOfStock?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Currency code for unit cost. */
  costCurrency?: InputMaybe<CurrencyCode>;
  /** Quantity on hand. Required together with warehouseId for a stock update. */
  onHand?: InputMaybe<Scalars["Int"]["input"]>;
  /** Whether this variant requires physical delivery. */
  requiresShipping?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** SKU code. */
  sku?: InputMaybe<Scalars["String"]["input"]>;
  /** Whether inventory quantities control availability. */
  trackInventory?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Unavailable quantity (reserved, damaged, etc.). */
  unavailable?: InputMaybe<Scalars["Int"]["input"]>;
  /** Unit cost in minor units (cents). */
  unitCostMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** The warehouse ID. Required together with onHand for a stock update. */
  warehouseId?: InputMaybe<Scalars["ID"]["input"]>;
};

/** Media attached to a variant with sort order. */
export type ApiVariantMediaItem = {
  __typename?: "VariantMediaItem";
  /** The file from the Media service. */
  file: ApiFile;
  /** Sort order index (lower = first). */
  sortIndex: Scalars["Int"]["output"];
};

/** Input for variant media in the unified update. */
export type ApiVariantMediaOpInput = {
  /** File IDs for variant media. */
  fileIds: Array<Scalars["ID"]["input"]>;
};

/** Variant operation action in the unified product update. */
export enum VariantOperationAction {
  Create = "CREATE",
  Delete = "DELETE",
  Update = "UPDATE",
}

/** Input for a single variant operation. */
export type ApiVariantOperationInput = {
  /** The operation to apply. */
  action: VariantOperationAction;
  /** Per-request client correlation key for create operations. */
  clientMutationId?: InputMaybe<Scalars["String"]["input"]>;
  /** Variant dimensions. */
  dimensions?: InputMaybe<ApiVariantDimensionsOpInput>;
  /** Variant inventory item data (stock, SKU, cost). */
  inventory?: InputMaybe<ApiVariantInventoryOpInput>;
  /** Variant media. */
  media?: InputMaybe<ApiVariantMediaOpInput>;
  /** Variant options. */
  options?: InputMaybe<ApiVariantOptionsOpInput>;
  /** Variant pricing. */
  pricing?: InputMaybe<ApiVariantPricingOpInput>;
  /** The variant ID for update/delete operations. */
  variantId?: InputMaybe<Scalars["ID"]["input"]>;
  /** Variant weight in grams. */
  weight?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Input for linking a variant to an option value. */
export type ApiVariantOptionLinkInput = {
  /** The option ID. */
  optionId: Scalars["ID"]["input"];
  /** The option value ID. */
  optionValueId: Scalars["ID"]["input"];
};

/** Input for variant options in the unified update. */
export type ApiVariantOptionsOpInput = {
  /** Option value links to set (replaces existing). */
  set: Array<ApiVariantOptionLinkInput>;
};

/** Ordering configuration for Variant */
export type ApiVariantOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: VariantOrderField;
};

/** Fields available for sorting Variant */
export enum VariantOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by externalId */
  ExternalId = "externalId",
  /** Sort by externalSystem */
  ExternalSystem = "externalSystem",
  /** Sort by handle */
  Handle = "handle",
  /** Sort by id */
  Id = "id",
  /** Sort by isDefault */
  IsDefault = "isDefault",
  /** Sort by productId */
  ProductId = "productId",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

/** Represents a price for a variant. */
export type ApiVariantPrice = ApiNode & {
  __typename?: "VariantPrice";
  /** The price amount in minor units (cents, kopecks, etc.). */
  amountMinor: Scalars["BigInt"]["output"];
  /** The compare-at price in minor units (strikethrough price). */
  compareAtMinor?: Maybe<Scalars["BigInt"]["output"]>;
  /** The currency code. */
  currency: CurrencyCode;
  /** When this price became effective. */
  effectiveFrom: Scalars["DateTime"]["output"];
  /** When this price stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars["DateTime"]["output"]>;
  /** The globally unique ID of the price record. */
  id: Scalars["ID"]["output"];
  /** Whether this is the current active price. */
  isCurrent: Scalars["Boolean"]["output"];
  /** When this price record was created. */
  recordedAt: Scalars["DateTime"]["output"];
};

/** A connection to a list of VariantPrice items. */
export type ApiVariantPriceConnection = {
  __typename?: "VariantPriceConnection";
  /** A list of edges. */
  edges: Array<ApiVariantPriceEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of price records. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a VariantPrice connection. */
export type ApiVariantPriceEdge = {
  __typename?: "VariantPriceEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiVariantPrice;
};

/** Statistics for variant price history over a period. */
export type ApiVariantPriceHistoryStatistics = {
  __typename?: "VariantPriceHistoryStatistics";
  /** Average price over the period (minor units). */
  avgPriceMinor: Scalars["BigInt"]["output"];
  /** Currency code. */
  currency: CurrencyCode;
  /** Maximum price over the period (minor units). */
  maxPriceMinor: Scalars["BigInt"]["output"];
  /** Minimum price over the period (minor units). */
  minPriceMinor: Scalars["BigInt"]["output"];
};

/** Input for variant pricing in the unified update. */
export type ApiVariantPricingOpInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars["BigInt"]["input"];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** The currency code. */
  currency: CurrencyCode;
};

/** Input for updating variant media (replaces all existing media). */
export type ApiVariantUpdateMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars["ID"]["input"]>;
  /** The variant ID. */
  variantId: Scalars["ID"]["input"];
};

/** Payload for variant update media. */
export type ApiVariantUpdateMediaPayload = {
  __typename?: "VariantUpdateMediaPayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for updating variant options (option value links). */
export type ApiVariantUpdateOptionsInput = {
  /** The option value links to set (replaces existing links). */
  links: Array<ApiVariantOptionLinkInput>;
  /** The ID of the variant. */
  variantId: Scalars["ID"]["input"];
};

/** Payload for variant options update. */
export type ApiVariantUpdateOptionsPayload = {
  __typename?: "VariantUpdateOptionsPayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for updating a price on a variant. */
export type ApiVariantUpdatePricingInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars["BigInt"]["input"];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars["BigInt"]["input"]>;
  /** The currency code. */
  currency: CurrencyCode;
  /** The ID of the variant. */
  variantId: Scalars["ID"]["input"];
};

/** Payload for variant pricing update. */
export type ApiVariantUpdatePricingPayload = {
  __typename?: "VariantUpdatePricingPayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Physical weight of a variant (stored in grams). */
export type ApiVariantWeight = {
  __typename?: "VariantWeight";
  /** Weight in grams. */
  value: Scalars["Int"]["output"];
};

/** Filter conditions for Variant */
export type ApiVariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiVariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiVariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiVariantWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by externalId */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by externalSystem */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by productId */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** A vendor represents the supplier or brand owner associated with a product. */
export type ApiVendor = ApiNode & {
  __typename?: "Vendor";
  /** The globally unique ID of the vendor. */
  id: Scalars["ID"]["output"];
  /** The display name of the vendor. */
  name: Scalars["String"]["output"];
};

/** A connection to a list of Vendor items. */
export type ApiVendorConnection = {
  __typename?: "VendorConnection";
  /** A list of edges. */
  edges: Array<ApiVendorEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of vendors. */
  totalCount: Scalars["Int"]["output"];
};

/** Input for creating a vendor. */
export type ApiVendorCreateInput = {
  /** The display name of the vendor. */
  name: Scalars["String"]["input"];
};

/** Payload for vendor creation. */
export type ApiVendorCreatePayload = {
  __typename?: "VendorCreatePayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created vendor. */
  vendor?: Maybe<ApiVendor>;
};

/** An edge in a Vendor connection. */
export type ApiVendorEdge = {
  __typename?: "VendorEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiVendor;
};

/** Ordering configuration for Vendor */
export type ApiVendorOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: VendorOrderField;
};

/** Fields available for sorting Vendor */
export enum VendorOrderField {
  /** Sort by id */
  Id = "id",
  /** Sort by name */
  Name = "name",
}

/** Filter conditions for Vendor */
export type ApiVendorWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiVendorWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiVendorWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiVendorWhereInput>>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
};

/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouse = ApiNode & {
  __typename?: "Warehouse";
  /** The unique code identifying this warehouse. */
  code: Scalars["String"]["output"];
  /** The date and time when the warehouse was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The globally unique ID of the warehouse. */
  id: Scalars["ID"]["output"];
  /** Whether this is the default warehouse for the project. */
  isDefault: Scalars["Boolean"]["output"];
  /** The display name of the warehouse. */
  name: Scalars["String"]["output"];
  /** Stock levels for all variants in this warehouse. */
  stock: ApiWarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars["Int"]["output"];
};

/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouseStockArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ApiWarehouseStockOrderByInput>>;
  where?: InputMaybe<ApiWarehouseStockWhereInput>;
};

export type ApiWarehouseAssignableVariantOrderByInput = {
  direction: SortDirection;
  field: WarehouseAssignableVariantOrderField;
};

export enum WarehouseAssignableVariantOrderField {
  CreatedAt = "createdAt",
  ExternalId = "externalId",
  ExternalSystem = "externalSystem",
  Handle = "handle",
  Id = "id",
  IsDefault = "isDefault",
  ProductId = "productId",
  ProductName = "productName",
  Sku = "sku",
  UpdatedAt = "updatedAt",
}

export type ApiWarehouseAssignableVariantWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseAssignableVariantWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseAssignableVariantWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseAssignableVariantWhereInput>>;
  /** Filter by creation date */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by external ID */
  externalId?: InputMaybe<ApiStringFilter>;
  /** Filter by external system */
  externalSystem?: InputMaybe<ApiStringFilter>;
  /** Filter by variant handle */
  handle?: InputMaybe<ApiStringFilter>;
  /** Filter by variant ID */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by default variant flag */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by product ID */
  productId?: InputMaybe<ApiIdFilter>;
  /** Filter by product name in the current locale */
  productName?: InputMaybe<ApiStringFilter>;
  /** Filter by variant SKU */
  sku?: InputMaybe<ApiStringFilter>;
  /** Filter by update date */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** A connection to a list of Warehouse items. */
export type ApiWarehouseConnection = {
  __typename?: "WarehouseConnection";
  /** A list of edges. */
  edges: Array<ApiWarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars["Int"]["output"];
};

/** Relay-style pagination input for Warehouse */
export type ApiWarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars["Int"]["input"]>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars["Int"]["input"]>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type ApiWarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars["String"]["input"];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The display name for the warehouse. */
  name: Scalars["String"]["input"];
};

/** Payload for warehouse creation. */
export type ApiWarehouseCreatePayload = {
  __typename?: "WarehouseCreatePayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created warehouse. */
  warehouse?: Maybe<ApiWarehouse>;
};

/** Input for deleting a warehouse. */
export type ApiWarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars["ID"]["input"];
};

/** Payload for warehouse deletion. */
export type ApiWarehouseDeletePayload = {
  __typename?: "WarehouseDeletePayload";
  /** The ID of the deleted warehouse. */
  deletedWarehouseId?: Maybe<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Warehouse connection. */
export type ApiWarehouseEdge = {
  __typename?: "WarehouseEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiWarehouse;
};

/** Ordering configuration for Warehouse */
export type ApiWarehouseOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseOrderField;
};

/** Fields available for sorting Warehouse */
export enum WarehouseOrderField {
  /** Sort by addressLine1 */
  AddressLine1 = "addressLine1",
  /** Sort by addressLine2 */
  AddressLine2 = "addressLine2",
  /** Sort by city */
  City = "city",
  /** Sort by code */
  Code = "code",
  /** Sort by countryCode */
  CountryCode = "countryCode",
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by isDefault */
  IsDefault = "isDefault",
  /** Sort by name */
  Name = "name",
  /** Sort by postalCode */
  PostalCode = "postalCode",
  /** Sort by provinceCode */
  ProvinceCode = "provinceCode",
  /** Sort by provinceName */
  ProvinceName = "provinceName",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
}

/** Represents stock level for a variant in a specific warehouse. */
export type ApiWarehouseStock = ApiNode & {
  __typename?: "WarehouseStock";
  /** The quantity available for sale. */
  availableForSale: Scalars["Int"]["output"];
  /** The date and time when the stock was created. */
  createdAt: Scalars["DateTime"]["output"];
  /** The globally unique ID of the stock record. */
  id: Scalars["ID"]["output"];
  /** The quantity currently on hand. */
  quantityOnHand: Scalars["Int"]["output"];
  /** The quantity currently reserved. */
  reservedQuantity: Scalars["Int"]["output"];
  /** The quantity currently unavailable. */
  unavailableQuantity: Scalars["Int"]["output"];
  /** The date and time when the stock was last updated. */
  updatedAt: Scalars["DateTime"]["output"];
  /** The variant this stock record is for. */
  variant: ApiVariant;
  /** The globally unique ID of the variant this stock belongs to. */
  variantId: Scalars["ID"]["output"];
  /** The warehouse where this stock is located. */
  warehouse: ApiWarehouse;
  /** The globally unique ID of the warehouse this stock belongs to. */
  warehouseId: Scalars["ID"]["output"];
};

/** A connection to a list of WarehouseStock items. */
export type ApiWarehouseStockConnection = {
  __typename?: "WarehouseStockConnection";
  /** A list of edges. */
  edges: Array<ApiWarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of stock records. */
  totalCount: Scalars["Int"]["output"];
};

/** Relay-style pagination input for WarehouseStock */
export type ApiWarehouseStockConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars["String"]["input"]>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars["Int"]["input"]>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars["Int"]["input"]>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiWarehouseStockOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiWarehouseStockWhereInput>;
};

/** Input for creating variant stock in warehouses. */
export type ApiWarehouseStockCreateInput = {
  /** Stock records to create. */
  items: Array<ApiWarehouseStockCreateItemInput>;
};

/** Item input for creating variant stock in a warehouse. */
export type ApiWarehouseStockCreateItemInput = {
  /** The variant whose stock should be added. */
  variantId: Scalars["ID"]["input"];
  /** The warehouse to add stock to. */
  warehouseId: Scalars["ID"]["input"];
};

/** Payload for warehouse stock creation. */
export type ApiWarehouseStockCreatePayload = {
  __typename?: "WarehouseStockCreatePayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created warehouse stock records. */
  warehouseStocks: Array<ApiWarehouseStock>;
};

/** Input for deleting variant stock from warehouses. */
export type ApiWarehouseStockDeleteInput = {
  /** Stock records to delete. */
  items: Array<ApiWarehouseStockDeleteItemInput>;
};

/** Item input for deleting variant stock from a warehouse. */
export type ApiWarehouseStockDeleteItemInput = {
  /** The variant whose stock should be removed. */
  variantId: Scalars["ID"]["input"];
  /** The warehouse to remove stock from. */
  warehouseId: Scalars["ID"]["input"];
};

/** Payload for warehouse stock deletion. */
export type ApiWarehouseStockDeletePayload = {
  __typename?: "WarehouseStockDeletePayload";
  /** The IDs of the deleted warehouse stock records. */
  deletedWarehouseStockIds: Array<Scalars["ID"]["output"]>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a WarehouseStock connection. */
export type ApiWarehouseStockEdge = {
  __typename?: "WarehouseStockEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ApiWarehouseStock;
};

/** Ordering configuration for WarehouseStock */
export type ApiWarehouseStockOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: WarehouseStockOrderField;
};

/** Fields available for sorting WarehouseStock */
export enum WarehouseStockOrderField {
  /** Sort by createdAt */
  CreatedAt = "createdAt",
  /** Sort by id */
  Id = "id",
  /** Sort by quantityOnHand */
  QuantityOnHand = "quantityOnHand",
  /** Sort by updatedAt */
  UpdatedAt = "updatedAt",
  /** Sort by variantId */
  VariantId = "variantId",
  /** Sort by warehouseId */
  WarehouseId = "warehouseId",
}

/** Filter conditions for WarehouseStock */
export type ApiWarehouseStockWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseStockWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseStockWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseStockWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by quantityOnHand */
  quantityOnHand?: InputMaybe<ApiIntFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by variantId */
  variantId?: InputMaybe<ApiIdFilter>;
  /** Filter by warehouseId */
  warehouseId?: InputMaybe<ApiIdFilter>;
};

/** Input for updating a warehouse. */
export type ApiWarehouseUpdateInput = {
  /** The new code for the warehouse. */
  code?: InputMaybe<Scalars["String"]["input"]>;
  /** The ID of the warehouse to update. */
  id: Scalars["ID"]["input"];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The new name for the warehouse. */
  name?: InputMaybe<Scalars["String"]["input"]>;
};

/** Payload for warehouse update. */
export type ApiWarehouseUpdatePayload = {
  __typename?: "WarehouseUpdatePayload";
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated warehouse. */
  warehouse?: Maybe<ApiWarehouse>;
};

/** Filter conditions for Warehouse */
export type ApiWarehouseWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<ApiWarehouseWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<ApiWarehouseWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<ApiWarehouseWhereInput>>;
  /** Filter by addressLine1 */
  addressLine1?: InputMaybe<ApiStringFilter>;
  /** Filter by addressLine2 */
  addressLine2?: InputMaybe<ApiStringFilter>;
  /** Filter by city */
  city?: InputMaybe<ApiStringFilter>;
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by countryCode */
  countryCode?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by postalCode */
  postalCode?: InputMaybe<ApiStringFilter>;
  /** Filter by provinceCode */
  provinceCode?: InputMaybe<ApiStringFilter>;
  /** Filter by provinceName */
  provinceName?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

export type ApiWeight = {
  __typename?: "Weight";
  unit: WeightUnit;
  weight: Scalars["Float"]["output"];
};

/** Input for setting weight (in grams). */
export type ApiWeightInput = {
  /** Weight in grams. */
  value: Scalars["Int"]["input"];
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = "g",
  /** Kilogram */
  Kg = "kg",
  /** Pound */
  Lb = "lb",
  /** Ounce */
  Oz = "oz",
}

/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQuery = {
  __typename?: "WidgetQuery";
  /**
   * Get inventory widget data for a product.
   * Returns aggregated inventory metrics across all variants.
   */
  inventory?: Maybe<ApiProductInventoryWidget>;
  /** Get pricing widget data for a variant. */
  pricing: ApiPricingWidgetPayload;
  /** Aggregated reviews and Q&A data for a product. */
  reviews: ApiProductReviewsWidget;
};

/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQueryInventoryArgs = {
  productId: Scalars["ID"]["input"];
};

/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQueryPricingArgs = {
  input: ApiPricingWidgetInput;
};

/** Widget query namespace for dashboard widgets. */
export type ApiWidgetQueryReviewsArgs = {
  productId: Scalars["ID"]["input"];
};

export enum Join__Graph {
  AppsAdmin = "APPS_ADMIN",
  AppsHeadlessAdmin = "APPS_HEADLESS_ADMIN",
  AppsHelloWorldAdmin = "APPS_HELLO_WORLD_ADMIN",
  AppsOnlineStoreAdmin = "APPS_ONLINE_STORE_ADMIN",
  AppsSmtpAdmin = "APPS_SMTP_ADMIN",
  CatalogAdmin = "CATALOG_ADMIN",
  CustomersAdmin = "CUSTOMERS_ADMIN",
  IamAdmin = "IAM_ADMIN",
  ListingAdmin = "LISTING_ADMIN",
  LoyaltyAdmin = "LOYALTY_ADMIN",
  MediaAdmin = "MEDIA_ADMIN",
  NotificationsAdmin = "NOTIFICATIONS_ADMIN",
  OrdersAdmin = "ORDERS_ADMIN",
  PricingAdmin = "PRICING_ADMIN",
  ProjectAdmin = "PROJECT_ADMIN",
  ReviewsAdmin = "REVIEWS_ADMIN",
}

export enum Link__Purpose {
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  Execution = "EXECUTION",
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  Security = "SECURITY",
}
