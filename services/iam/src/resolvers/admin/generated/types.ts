import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/index.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Stable identifier of a catalog-owned authentication method. */
  ApplicationAuthMethodId: { input: any; output: any; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/**
 * Action level for permissions.
 * Hierarchy: read < write < admin
 * - admin includes write and read
 * - write includes read
 */
export enum Action {
  Admin = 'admin',
  Read = 'read',
  Write = 'write'
}

/** An organization-owned application authentication realm. */
export type Application = Node & {
  __typename?: 'Application';
  /** Timestamp when the application was archived. */
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Authentication configuration for this application. */
  auth: ApplicationAuthConfiguration;
  /** Timestamp when the application was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Optional application description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable application name. */
  displayName: Scalars['String']['output'];
  /** Globally unique application identifier. */
  id: Scalars['ID']['output'];
  /** URL-friendly application name. */
  name: Scalars['String']['output'];
  /** Find an OAuth client by its public client identifier. */
  oauthClient?: Maybe<ApplicationOAuthClient>;
  /** OAuth clients registered for this application. */
  oauthClients: ApplicationOAuthClientConnection;
  /** Organization that owns the application. */
  organization: Organization;
  /** Identifier of the organization that owns the application. */
  organizationId: Scalars['ID']['output'];
  /** Immutable OAuth resource audience assigned by IAM. */
  resource: Scalars['String']['output'];
  /** Current revision used for optimistic concurrency. */
  revision: Scalars['Int']['output'];
  /** Current application lifecycle status. */
  status: ApplicationLifecycleStatus;
  /** Timestamp when the application was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Find a user within this application realm. */
  user?: Maybe<ApplicationUser>;
  /** Users registered within this application realm. */
  users: ApplicationUserConnection;
};


/** An organization-owned application authentication realm. */
export type ApplicationOauthClientArgs = {
  clientId: Scalars['String']['input'];
};


/** An organization-owned application authentication realm. */
export type ApplicationOauthClientsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApplicationOAuthClientOrderByInput>>;
  where?: InputMaybe<ApplicationOAuthClientWhereInput>;
};


/** An organization-owned application authentication realm. */
export type ApplicationUserArgs = {
  id: Scalars['ID']['input'];
};


/** An organization-owned application authentication realm. */
export type ApplicationUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApplicationUserOrderByInput>>;
  where?: InputMaybe<ApplicationUserWhereInput>;
};

/** Input for archiving an application. */
export type ApplicationArchiveInput = {
  /** Application to archive. */
  applicationId: Scalars['ID']['input'];
  /** Revision expected by the caller. */
  expectedRevision: Scalars['Int']['input'];
  /** Organization that owns the application. */
  organizationId: Scalars['ID']['input'];
};

/** Result of archiving an application. */
export type ApplicationArchivePayload = {
  __typename?: 'ApplicationArchivePayload';
  application?: Maybe<Application>;
  userErrors: Array<GenericUserError>;
};

/** Allowed background colors for hosted authentication UI. */
export enum ApplicationAuthBackgroundColor {
  Slate = 'SLATE',
  White = 'WHITE'
}

/** Branding values used by the hosted authentication UI. */
export type ApplicationAuthBranding = {
  __typename?: 'ApplicationAuthBranding';
  backgroundColor?: Maybe<ApplicationAuthBackgroundColor>;
  displayName?: Maybe<Scalars['String']['output']>;
  headline?: Maybe<Scalars['String']['output']>;
  logoUrl?: Maybe<Scalars['String']['output']>;
  primaryColor?: Maybe<ApplicationAuthPrimaryColor>;
};

/** Branding values for the hosted authentication UI. */
export type ApplicationAuthBrandingInput = {
  backgroundColor?: InputMaybe<ApplicationAuthBackgroundColor>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  headline?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  primaryColor?: InputMaybe<ApplicationAuthPrimaryColor>;
};

/** Administrative authentication configuration of an application realm. */
export type ApplicationAuthConfiguration = {
  __typename?: 'ApplicationAuthConfiguration';
  /** Access token lifetime in seconds. */
  accessTokenTtlSeconds: Scalars['Int']['output'];
  /** Application that owns this configuration. */
  applicationId: Scalars['ID']['output'];
  /** Find an authentication method by its catalog identifier. */
  authMethod: ApplicationAuthMethod;
  /** Authentication methods supported by the realm. */
  authMethods: Array<ApplicationAuthMethod>;
  /** Hosted authentication UI branding. */
  branding: ApplicationAuthBranding;
  /** Read-only consent policy enforced by the protocol version. */
  consentMode: ApplicationConsentMode;
  /** Timestamp when the configuration was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Default locale for hosted authentication UI and messages. */
  defaultLocale: LocaleCode;
  /** Email delivery configuration without credential values. */
  emailDelivery: ApplicationAuthEmailDeliveryConfiguration;
  /** Whether a verified email is required by the realm. */
  emailVerificationRequired: Scalars['Boolean']['output'];
  /** ID token lifetime in seconds. */
  idTokenTtlSeconds: Scalars['Int']['output'];
  /** Canonical OAuth 2.1 and OpenID Connect endpoint URLs. */
  protocolUrls: ApplicationAuthProtocolUrls;
  /** Find a social provider by its catalog name. */
  provider: ApplicationAuthProvider;
  /** Social providers supported by the realm. */
  providers: Array<ApplicationAuthProvider>;
  /** Whether the application realm accepts authentication traffic. */
  realmEnabled: Scalars['Boolean']['output'];
  /** Refresh token lifetime in seconds. */
  refreshTokenTtlSeconds: Scalars['Int']['output'];
  /** Registration policy for new application users. */
  registrationMode: ApplicationRegistrationMode;
  /** Current revision used for optimistic concurrency. */
  revision: Scalars['Int']['output'];
  /** Application session lifetime in seconds. */
  sessionTtlSeconds: Scalars['Int']['output'];
  /** Locales supported by the application realm. */
  supportedLocales: Array<LocaleCode>;
  /** Origins trusted by the application realm. */
  trustedOrigins: Array<ApplicationAuthTrustedOrigin>;
  /** Timestamp when the configuration was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** Administrative authentication configuration of an application realm. */
export type ApplicationAuthConfigurationAuthMethodArgs = {
  id: Scalars['ApplicationAuthMethodId']['input'];
};


/** Administrative authentication configuration of an application realm. */
export type ApplicationAuthConfigurationProviderArgs = {
  name: ApplicationAuthProviderName;
};

/** Non-secret email delivery configuration for an application realm. */
export type ApplicationAuthEmailDeliveryConfiguration = {
  __typename?: 'ApplicationAuthEmailDeliveryConfiguration';
  configured: Scalars['Boolean']['output'];
  emailOtpSignInTemplateId?: Maybe<Scalars['String']['output']>;
  emailVerificationTemplateId?: Maybe<Scalars['String']['output']>;
  passwordResetTemplateId?: Maybe<Scalars['String']['output']>;
  senderIdentity?: Maybe<Scalars['String']['output']>;
  transportProfile?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedBy?: Maybe<Scalars['ID']['output']>;
};

/** References to a preconfigured email transport and message templates. */
export type ApplicationAuthEmailDeliveryInput = {
  emailOtpSignInTemplateId: Scalars['String']['input'];
  emailVerificationTemplateId: Scalars['String']['input'];
  passwordResetTemplateId: Scalars['String']['input'];
  senderIdentity: Scalars['String']['input'];
  transportProfile: Scalars['String']['input'];
};

/** Status and enabled capabilities of a catalog-owned authentication method. */
export type ApplicationAuthMethod = {
  __typename?: 'ApplicationAuthMethod';
  availableCapabilities: Array<ApplicationAuthMethodCapability>;
  configured: Scalars['Boolean']['output'];
  enabledCapabilities: Array<ApplicationAuthMethodCapability>;
  id: Scalars['ApplicationAuthMethodId']['output'];
  revision: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedBy?: Maybe<Scalars['ID']['output']>;
};

/** Capability exposed by an authentication method. */
export enum ApplicationAuthMethodCapability {
  PasswordReset = 'PASSWORD_RESET',
  SignIn = 'SIGN_IN',
  SignUp = 'SIGN_UP'
}

/** Result of updating an application authentication method. */
export type ApplicationAuthMethodPayload = {
  __typename?: 'ApplicationAuthMethodPayload';
  authMethod?: Maybe<ApplicationAuthMethod>;
  userErrors: Array<GenericUserError>;
};

/** Input for updating enabled capabilities of an authentication method. */
export type ApplicationAuthMethodUpdateInput = {
  applicationId: Scalars['ID']['input'];
  enabledCapabilities: Array<ApplicationAuthMethodCapability>;
  expectedRevision: Scalars['Int']['input'];
  methodId: Scalars['ApplicationAuthMethodId']['input'];
  organizationId: Scalars['ID']['input'];
};

/** Allowed primary colors for hosted authentication UI. */
export enum ApplicationAuthPrimaryColor {
  Blue = 'BLUE',
  Emerald = 'EMERALD',
  Indigo = 'INDIGO',
  Violet = 'VIOLET'
}

/** Canonical OAuth 2.1 and OpenID Connect URLs for an application realm. */
export type ApplicationAuthProtocolUrls = {
  __typename?: 'ApplicationAuthProtocolUrls';
  authorizationUrl: Scalars['String']['output'];
  endSessionUrl: Scalars['String']['output'];
  issuer: Scalars['String']['output'];
  jwksUrl: Scalars['String']['output'];
  oauthAuthorizationServerMetadataUrl: Scalars['String']['output'];
  oidcDiscoveryUrl: Scalars['String']['output'];
  providerCallbackUrls: Array<ApplicationAuthProviderCallbackUrl>;
  revocationUrl: Scalars['String']['output'];
  tokenUrl: Scalars['String']['output'];
};

/** Non-secret status of a social authentication provider. */
export type ApplicationAuthProvider = {
  __typename?: 'ApplicationAuthProvider';
  applicationId: Scalars['ID']['output'];
  /** Exact callback URL computed by IAM. */
  callbackUrl: Scalars['String']['output'];
  configured: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  /** Masked client identifier safe for administrative display. */
  maskedClientId?: Maybe<Scalars['String']['output']>;
  provider: ApplicationAuthProviderName;
  revision: Scalars['Int']['output'];
  scopes: Array<Scalars['String']['output']>;
  supported: Scalars['Boolean']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
  updatedBy?: Maybe<Scalars['ID']['output']>;
};

/** Computed callback URL for a catalog-owned social provider. */
export type ApplicationAuthProviderCallbackUrl = {
  __typename?: 'ApplicationAuthProviderCallbackUrl';
  provider: ApplicationAuthProviderName;
  url: Scalars['String']['output'];
};

/** Input for configuring credentials and scopes of a social provider. */
export type ApplicationAuthProviderConfigureInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  provider: ApplicationAuthProviderName;
  scopes: Array<Scalars['String']['input']>;
};

/** Input for deleting credentials from a disabled social provider. */
export type ApplicationAuthProviderCredentialsDeleteInput = {
  applicationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  provider: ApplicationAuthProviderName;
};

/** Input for replacing social provider credentials. */
export type ApplicationAuthProviderCredentialsRotateInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  provider: ApplicationAuthProviderName;
};

/** Social authentication providers supported by the code-owned catalog. */
export enum ApplicationAuthProviderName {
  Facebook = 'FACEBOOK',
  Google = 'GOOGLE'
}

/** Result of changing a social provider configuration. */
export type ApplicationAuthProviderPayload = {
  __typename?: 'ApplicationAuthProviderPayload';
  provider?: Maybe<ApplicationAuthProvider>;
  userErrors: Array<GenericUserError>;
};

/** Input for updating non-secret social provider settings. */
export type ApplicationAuthProviderUpdateInput = {
  applicationId: Scalars['ID']['input'];
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  provider: ApplicationAuthProviderName;
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Input for safely validating a social provider configuration. */
export type ApplicationAuthProviderValidateInput = {
  applicationId: Scalars['ID']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  provider: ApplicationAuthProviderName;
};

/** Safe validation result for a social provider configuration. */
export type ApplicationAuthProviderValidation = {
  __typename?: 'ApplicationAuthProviderValidation';
  checkedAt: Scalars['DateTime']['output'];
  provider: ApplicationAuthProviderName;
  /** Stable non-secret reason code when validation did not succeed. */
  reasonCode?: Maybe<Scalars['String']['output']>;
  revision: Scalars['Int']['output'];
  status: ApplicationAuthProviderValidationStatus;
};

/** Result of validating a social provider configuration. */
export type ApplicationAuthProviderValidationPayload = {
  __typename?: 'ApplicationAuthProviderValidationPayload';
  userErrors: Array<GenericUserError>;
  validation?: Maybe<ApplicationAuthProviderValidation>;
};

/** Result status of a safe provider configuration validation. */
export enum ApplicationAuthProviderValidationStatus {
  Invalid = 'INVALID',
  Unavailable = 'UNAVAILABLE',
  Valid = 'VALID'
}

/** Input for enabling or disabling an application realm. */
export type ApplicationAuthRealmEnabledSetInput = {
  applicationId: Scalars['ID']['input'];
  enabled: Scalars['Boolean']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
};

/** An exact origin trusted by an application realm. */
export type ApplicationAuthTrustedOrigin = {
  __typename?: 'ApplicationAuthTrustedOrigin';
  createdAt: Scalars['DateTime']['output'];
  origin: Scalars['String']['output'];
};

/** Input for updating application authentication policy and presentation. */
export type ApplicationAuthUpdateInput = {
  accessTokenTtlSeconds?: InputMaybe<Scalars['Int']['input']>;
  applicationId: Scalars['ID']['input'];
  branding?: InputMaybe<ApplicationAuthBrandingInput>;
  defaultLocale?: InputMaybe<LocaleCode>;
  emailDelivery?: InputMaybe<ApplicationAuthEmailDeliveryInput>;
  emailVerificationRequired?: InputMaybe<Scalars['Boolean']['input']>;
  expectedRevision: Scalars['Int']['input'];
  idTokenTtlSeconds?: InputMaybe<Scalars['Int']['input']>;
  organizationId: Scalars['ID']['input'];
  refreshTokenTtlSeconds?: InputMaybe<Scalars['Int']['input']>;
  registrationMode?: InputMaybe<ApplicationRegistrationMode>;
  sessionTtlSeconds?: InputMaybe<Scalars['Int']['input']>;
  trustedOrigins?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Result of updating application authentication configuration. */
export type ApplicationAuthUpdatePayload = {
  __typename?: 'ApplicationAuthUpdatePayload';
  configuration?: Maybe<ApplicationAuthConfiguration>;
  userErrors: Array<GenericUserError>;
};

/** A paginated connection of applications. */
export type ApplicationConnection = {
  __typename?: 'ApplicationConnection';
  /** Application edges in the current page. */
  edges: Array<ApplicationEdge>;
  /** Information needed to continue pagination. */
  pageInfo: PageInfo;
  /** Total number of applications matching the filter. */
  totalCount: Scalars['Int']['output'];
};

/** Consent policy supported by the current protocol version. */
export enum ApplicationConsentMode {
  /** Authorization requires explicit user consent when consent is applicable. */
  Explicit = 'EXPLICIT'
}

/** Input for creating an application. */
export type ApplicationCreateInput = {
  /** Optional application description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Human-readable application name. */
  displayName: Scalars['String']['input'];
  /** URL-friendly application name. */
  name: Scalars['String']['input'];
  /** Organization that will own the application. */
  organizationId: Scalars['ID']['input'];
};

/** Result of creating an application. */
export type ApplicationCreatePayload = {
  __typename?: 'ApplicationCreatePayload';
  application?: Maybe<Application>;
  userErrors: Array<GenericUserError>;
};

/** An application and its pagination cursor. */
export type ApplicationEdge = {
  __typename?: 'ApplicationEdge';
  /** Opaque pagination cursor. */
  cursor: Scalars['String']['output'];
  /** Application at the end of the edge. */
  node: Application;
};

/** Lifecycle status of an application realm. */
export enum ApplicationLifecycleStatus {
  /** The application is active. */
  Active = 'ACTIVE',
  /** The application is archived and cannot be used for new authentication. */
  Archived = 'ARCHIVED'
}

/** Application realm management mutations. */
export type ApplicationMutation = {
  __typename?: 'ApplicationMutation';
  /** Archive an application realm. */
  applicationArchive: ApplicationArchivePayload;
  /** Update enabled capabilities of an authentication method. */
  applicationAuthMethodUpdate: ApplicationAuthMethodPayload;
  /** Configure credentials and scopes of a social provider. */
  applicationAuthProviderConfigure: ApplicationAuthProviderPayload;
  /** Delete credentials from a disabled social provider. */
  applicationAuthProviderCredentialsDelete: ApplicationAuthProviderPayload;
  /** Replace social provider credentials. */
  applicationAuthProviderCredentialsRotate: ApplicationAuthProviderPayload;
  /** Update non-secret social provider settings. */
  applicationAuthProviderUpdate: ApplicationAuthProviderPayload;
  /** Safely validate a social provider configuration. */
  applicationAuthProviderValidate: ApplicationAuthProviderValidationPayload;
  /** Enable or disable an application authentication realm. */
  applicationAuthRealmEnabledSet: ApplicationAuthUpdatePayload;
  /** Update application authentication policy and presentation. */
  applicationAuthUpdate: ApplicationAuthUpdatePayload;
  /** Create an application realm. */
  applicationCreate: ApplicationCreatePayload;
  /** Archive an OAuth client. */
  applicationOAuthClientArchive: ApplicationOAuthClientPayload;
  /** Create an OAuth client with fixed protocol policy. */
  applicationOAuthClientCreate: ApplicationOAuthClientCreatePayload;
  /** Enable or disable an OAuth client. */
  applicationOAuthClientEnabledSet: ApplicationOAuthClientPayload;
  /** Rotate a confidential OAuth client secret. */
  applicationOAuthClientSecretRotate: ApplicationOAuthClientSecretRotatePayload;
  /** Change first-party consent bypass policy for an OAuth client. */
  applicationOAuthClientSkipConsentSet: ApplicationOAuthClientPayload;
  /** Update mutable OAuth client metadata. */
  applicationOAuthClientUpdate: ApplicationOAuthClientPayload;
  /** Update application metadata. */
  applicationUpdate: ApplicationUpdatePayload;
  /** Unlink a login account from an application user. */
  applicationUserAccountUnlink: ApplicationUserAccountUnlinkPayload;
  /** Block an application user. */
  applicationUserBlock: ApplicationUserPayload;
  /** Revoke every active session of an application user. */
  applicationUserSessionsRevokeAll: ApplicationUserSessionsRevokeAllPayload;
  /** Unblock an application user. */
  applicationUserUnblock: ApplicationUserPayload;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationArchiveArgs = {
  input: ApplicationArchiveInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthMethodUpdateArgs = {
  input: ApplicationAuthMethodUpdateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthProviderConfigureArgs = {
  input: ApplicationAuthProviderConfigureInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthProviderCredentialsDeleteArgs = {
  input: ApplicationAuthProviderCredentialsDeleteInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthProviderCredentialsRotateArgs = {
  input: ApplicationAuthProviderCredentialsRotateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthProviderUpdateArgs = {
  input: ApplicationAuthProviderUpdateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthProviderValidateArgs = {
  input: ApplicationAuthProviderValidateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthRealmEnabledSetArgs = {
  input: ApplicationAuthRealmEnabledSetInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationAuthUpdateArgs = {
  input: ApplicationAuthUpdateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationCreateArgs = {
  input: ApplicationCreateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientArchiveArgs = {
  input: ApplicationOAuthClientArchiveInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientCreateArgs = {
  input: ApplicationOAuthClientCreateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientEnabledSetArgs = {
  input: ApplicationOAuthClientEnabledSetInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientSecretRotateArgs = {
  input: ApplicationOAuthClientSecretRotateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientSkipConsentSetArgs = {
  input: ApplicationOAuthClientSkipConsentSetInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationOAuthClientUpdateArgs = {
  input: ApplicationOAuthClientUpdateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationUpdateArgs = {
  input: ApplicationUpdateInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationUserAccountUnlinkArgs = {
  input: ApplicationUserAccountUnlinkInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationUserBlockArgs = {
  input: ApplicationUserStatusSetInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationUserSessionsRevokeAllArgs = {
  input: ApplicationUserSessionsRevokeAllInput;
};


/** Application realm management mutations. */
export type ApplicationMutationApplicationUserUnblockArgs = {
  input: ApplicationUserStatusSetInput;
};

/** An OAuth 2.1 client registered within an application realm. */
export type ApplicationOAuthClient = Node & {
  __typename?: 'ApplicationOAuthClient';
  applicationId: Scalars['ID']['output'];
  archived: Scalars['Boolean']['output'];
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Public, globally unique OAuth client identifier. */
  clientId: Scalars['String']['output'];
  clientType: ApplicationOAuthClientType;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['ID']['output'];
  disabled: Scalars['Boolean']['output'];
  enableEndSession: Scalars['Boolean']['output'];
  environment: ApplicationOAuthClientEnvironment;
  /** Read-only grant types enforced by the protocol policy. */
  grantTypes: Array<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  organizationId: Scalars['ID']['output'];
  postLogoutRedirectUris: Array<Scalars['String']['output']>;
  protocolPolicyVersion: Scalars['Int']['output'];
  redirectUris: Array<Scalars['String']['output']>;
  /** Whether Proof Key for Code Exchange is required. */
  requirePkce: Scalars['Boolean']['output'];
  /** Read-only resource audience inherited from the application. */
  resources: Array<Scalars['String']['output']>;
  /** Read-only response types enforced by the protocol policy. */
  responseTypes: Array<Scalars['String']['output']>;
  revision: Scalars['Int']['output'];
  skipConsent: Scalars['Boolean']['output'];
  tokenEndpointAuthMethod: ApplicationOAuthTokenEndpointAuthMethod;
  updatedAt: Scalars['DateTime']['output'];
  updatedBy: Scalars['ID']['output'];
};

/** Input for archiving an OAuth client. */
export type ApplicationOAuthClientArchiveInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
};

/** A paginated connection of OAuth clients. */
export type ApplicationOAuthClientConnection = {
  __typename?: 'ApplicationOAuthClientConnection';
  edges: Array<ApplicationOAuthClientEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** Input for creating an OAuth client with fixed protocol policy. */
export type ApplicationOAuthClientCreateInput = {
  applicationId: Scalars['ID']['input'];
  clientType: ApplicationOAuthClientType;
  enableEndSession?: InputMaybe<Scalars['Boolean']['input']>;
  environment: ApplicationOAuthClientEnvironment;
  name: Scalars['String']['input'];
  organizationId: Scalars['ID']['input'];
  postLogoutRedirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
  redirectUris: Array<Scalars['String']['input']>;
  skipConsent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Result of creating an OAuth client. */
export type ApplicationOAuthClientCreatePayload = {
  __typename?: 'ApplicationOAuthClientCreatePayload';
  client?: Maybe<ApplicationOAuthClient>;
  /** One-time plaintext secret for a confidential client; otherwise null. */
  clientSecret?: Maybe<Scalars['String']['output']>;
  userErrors: Array<GenericUserError>;
};

/** An OAuth client and its pagination cursor. */
export type ApplicationOAuthClientEdge = {
  __typename?: 'ApplicationOAuthClientEdge';
  cursor: Scalars['String']['output'];
  node: ApplicationOAuthClient;
};

/** Input for enabling or disabling an OAuth client. */
export type ApplicationOAuthClientEnabledSetInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  enabled: Scalars['Boolean']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
};

/** Environment used to enforce redirect URI policy. */
export enum ApplicationOAuthClientEnvironment {
  Development = 'DEVELOPMENT',
  Production = 'PRODUCTION'
}

/** Ordering configuration for application OAuth clients. */
export type ApplicationOAuthClientOrderByInput = {
  direction: SortDirection;
  field: ApplicationOAuthClientOrderField;
};

/** Fields available for ordering application OAuth clients. */
export enum ApplicationOAuthClientOrderField {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT'
}

/** Result of changing an OAuth client. */
export type ApplicationOAuthClientPayload = {
  __typename?: 'ApplicationOAuthClientPayload';
  client?: Maybe<ApplicationOAuthClient>;
  userErrors: Array<GenericUserError>;
};

/** Input for rotating a confidential OAuth client secret. */
export type ApplicationOAuthClientSecretRotateInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
};

/** Result of rotating a confidential OAuth client secret. */
export type ApplicationOAuthClientSecretRotatePayload = {
  __typename?: 'ApplicationOAuthClientSecretRotatePayload';
  client?: Maybe<ApplicationOAuthClient>;
  /** One-time plaintext replacement secret. */
  clientSecret?: Maybe<Scalars['String']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Input for changing first-party consent bypass policy. */
export type ApplicationOAuthClientSkipConsentSetInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  expectedRevision: Scalars['Int']['input'];
  organizationId: Scalars['ID']['input'];
  skipConsent: Scalars['Boolean']['input'];
};

/** OAuth client confidentiality classification. */
export enum ApplicationOAuthClientType {
  Confidential = 'CONFIDENTIAL',
  Public = 'PUBLIC'
}

/** Input for updating mutable OAuth client metadata. */
export type ApplicationOAuthClientUpdateInput = {
  applicationId: Scalars['ID']['input'];
  clientId: Scalars['String']['input'];
  enableEndSession?: InputMaybe<Scalars['Boolean']['input']>;
  environment?: InputMaybe<ApplicationOAuthClientEnvironment>;
  expectedRevision: Scalars['Int']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['ID']['input'];
  postLogoutRedirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
  redirectUris?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Filter conditions for application OAuth clients. */
export type ApplicationOAuthClientWhereInput = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  clientType?: InputMaybe<Array<ApplicationOAuthClientType>>;
  disabled?: InputMaybe<Scalars['Boolean']['input']>;
  environment?: InputMaybe<Array<ApplicationOAuthClientEnvironment>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Token endpoint authentication method enforced by IAM. */
export enum ApplicationOAuthTokenEndpointAuthMethod {
  ClientSecretBasic = 'CLIENT_SECRET_BASIC',
  None = 'NONE'
}

/** Ordering configuration for applications. */
export type ApplicationOrderByInput = {
  /** Sort direction. */
  direction: SortDirection;
  /** Field to order by. */
  field: ApplicationOrderField;
};

/** Fields available for ordering applications. */
export enum ApplicationOrderField {
  CreatedAt = 'CREATED_AT',
  DisplayName = 'DISPLAY_NAME',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT'
}

/** Application realm management queries. */
export type ApplicationQuery = {
  __typename?: 'ApplicationQuery';
  /** Get an application owned by the selected organization. */
  application?: Maybe<Application>;
  /** List applications owned by the selected organization. */
  applications: ApplicationConnection;
};


/** Application realm management queries. */
export type ApplicationQueryApplicationArgs = {
  id: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
};


/** Application realm management queries. */
export type ApplicationQueryApplicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApplicationOrderByInput>>;
  organizationId: Scalars['ID']['input'];
  where?: InputMaybe<ApplicationWhereInput>;
};

/** Registration policy for new application users. */
export enum ApplicationRegistrationMode {
  /** New user registration is disabled. */
  Disabled = 'DISABLED',
  /** New users may register through enabled sign-up methods. */
  Open = 'OPEN'
}

/** Input for updating application metadata. */
export type ApplicationUpdateInput = {
  /** Application to update. */
  applicationId: Scalars['ID']['input'];
  /** New application description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New human-readable application name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Revision expected by the caller. */
  expectedRevision: Scalars['Int']['input'];
  /** New URL-friendly application name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Organization that owns the application. */
  organizationId: Scalars['ID']['input'];
};

/** Result of updating application metadata. */
export type ApplicationUpdatePayload = {
  __typename?: 'ApplicationUpdatePayload';
  application?: Maybe<Application>;
  userErrors: Array<GenericUserError>;
};

/** A user scoped to a single application authentication realm. */
export type ApplicationUser = Node & {
  __typename?: 'ApplicationUser';
  applicationId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['Email']['output'];
  emailVerified: Scalars['Boolean']['output'];
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  /** Linked login accounts without provider credentials or tokens. */
  linkedAccounts: Array<ApplicationUserLinkedAccount>;
  name: Scalars['String']['output'];
  /** Safe security metadata without credentials or token values. */
  security: ApplicationUserSecurityMetadata;
  status: ApplicationUserStatus;
  updatedAt: Scalars['DateTime']['output'];
};

/** Input for unlinking a login account from an application user. */
export type ApplicationUserAccountUnlinkInput = {
  accountId: Scalars['ID']['input'];
  applicationId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

/** Result of unlinking an application user login account. */
export type ApplicationUserAccountUnlinkPayload = {
  __typename?: 'ApplicationUserAccountUnlinkPayload';
  unlinkedAccountId?: Maybe<Scalars['ID']['output']>;
  user?: Maybe<ApplicationUser>;
  userErrors: Array<GenericUserError>;
};

/** A paginated connection of application users. */
export type ApplicationUserConnection = {
  __typename?: 'ApplicationUserConnection';
  edges: Array<ApplicationUserEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An application user and its pagination cursor. */
export type ApplicationUserEdge = {
  __typename?: 'ApplicationUserEdge';
  cursor: Scalars['String']['output'];
  node: ApplicationUser;
};

/** A login account linked to an application user. */
export type ApplicationUserLinkedAccount = Node & {
  __typename?: 'ApplicationUserLinkedAccount';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Whether unlinking this account would remove the user's last login method. */
  isOnlyLoginMethod: Scalars['Boolean']['output'];
  provider: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/** Ordering configuration for application users. */
export type ApplicationUserOrderByInput = {
  direction: SortDirection;
  field: ApplicationUserOrderField;
};

/** Fields available for ordering application users. */
export enum ApplicationUserOrderField {
  CreatedAt = 'CREATED_AT',
  Email = 'EMAIL',
  Name = 'NAME',
  UpdatedAt = 'UPDATED_AT'
}

/** Result of changing an application user's security status. */
export type ApplicationUserPayload = {
  __typename?: 'ApplicationUserPayload';
  user?: Maybe<ApplicationUser>;
  userErrors: Array<GenericUserError>;
};

/** Safe aggregate security metadata for an application user. */
export type ApplicationUserSecurityMetadata = {
  __typename?: 'ApplicationUserSecurityMetadata';
  activeSessionCount: Scalars['Int']['output'];
  hasPasswordLogin: Scalars['Boolean']['output'];
  linkedAccountCount: Scalars['Int']['output'];
};

/** Input for revoking every session of an application user. */
export type ApplicationUserSessionsRevokeAllInput = {
  applicationId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

/** Result of revoking every session of an application user. */
export type ApplicationUserSessionsRevokeAllPayload = {
  __typename?: 'ApplicationUserSessionsRevokeAllPayload';
  revokedCount: Scalars['Int']['output'];
  user?: Maybe<ApplicationUser>;
  userErrors: Array<GenericUserError>;
};

/** Administrative security status of an application user. */
export enum ApplicationUserStatus {
  Active = 'ACTIVE',
  Blocked = 'BLOCKED'
}

/** Input for blocking or unblocking an application user. */
export type ApplicationUserStatusSetInput = {
  applicationId: Scalars['ID']['input'];
  organizationId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

/** Filter conditions for application users. */
export type ApplicationUserWhereInput = {
  emailVerified?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Array<ApplicationUserStatus>>;
};

/** Filter conditions for applications. */
export type ApplicationWhereInput = {
  /** Search by application name or display name. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Limit results to the selected lifecycle statuses. */
  status?: InputMaybe<Array<ApplicationLifecycleStatus>>;
};

export type AuthMutation = {
  __typename?: 'AuthMutation';
  signIn: UserSignInPayload;
  signOut: UserSignOutPayload;
  signUp: UserSignUpPayload;
  tokenRefresh: UserTokenRefreshPayload;
};


export type AuthMutationSignInArgs = {
  input: UserSignInInput;
};


export type AuthMutationSignOutArgs = {
  input: UserSignOutInput;
};


export type AuthMutationSignUpArgs = {
  input: UserSignUpInput;
};


export type AuthMutationTokenRefreshArgs = {
  input: UserTokenRefreshInput;
};

/** Authentication tokens. */
export type AuthTokenPayload = {
  __typename?: 'AuthTokenPayload';
  /** Access token for API requests. */
  accessToken: Scalars['String']['output'];
  /** Expiration time in seconds. */
  expiresIn: Scalars['Int']['output'];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars['String']['output'];
};

/** Input for authorize check. */
export type AuthorizeInput = {
  /** Action to check. */
  action: Scalars['String']['input'];
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
  /** Resource to check. */
  resource: Scalars['String']['input'];
};

export type AuthorizePayload = {
  __typename?: 'AuthorizePayload';
  /** Whether access is allowed. */
  allowed: Scalars['Boolean']['output'];
  /** Reason for denial (if denied). */
  deniedReason?: Maybe<Scalars['String']['output']>;
};

/** Currency codes according to ISO 4217 */
export enum CurrencyCode {
  /** UAE Dirham (United Arab Emirates) - 2 decimals */
  Aed = 'AED',
  /** Afghan Afghani (Afghanistan) - 0 decimals */
  Afn = 'AFN',
  /** Albanian Lek (Albania) - 0 decimals */
  All = 'ALL',
  /** Armenian Dram (Armenia) - 2 decimals */
  Amd = 'AMD',
  /** Netherlands Antillean Guilder - 2 decimals */
  Ang = 'ANG',
  /** Angolan Kwanza (Angola) - 2 decimals */
  Aoa = 'AOA',
  /** Argentine Peso (Argentina) - 2 decimals */
  Ars = 'ARS',
  /** Australian Dollar (Australia) - 2 decimals */
  Aud = 'AUD',
  /** Aruban Florin (Aruba) - 2 decimals */
  Awg = 'AWG',
  /** Azerbaijani Manat (Azerbaijan) - 2 decimals */
  Azn = 'AZN',
  /** Bosnia-Herzegovina Convertible Mark - 2 decimals */
  Bam = 'BAM',
  /** Barbadian Dollar (Barbados) - 2 decimals */
  Bbd = 'BBD',
  /** Bangladeshi Taka (Bangladesh) - 2 decimals */
  Bdt = 'BDT',
  /** Bulgarian Lev (Bulgaria) - 2 decimals */
  Bgn = 'BGN',
  /** Bahraini Dinar (Bahrain) - 3 decimals */
  Bhd = 'BHD',
  /** Burundian Franc (Burundi) - 0 decimals */
  Bif = 'BIF',
  /** Bermudian Dollar (Bermuda) - 2 decimals */
  Bmd = 'BMD',
  /** Brunei Dollar (Brunei) - 2 decimals */
  Bnd = 'BND',
  /** Bolivian Boliviano (Bolivia) - 2 decimals */
  Bob = 'BOB',
  /** Brazilian Real (Brazil) - 2 decimals */
  Brl = 'BRL',
  /** Bahamian Dollar (Bahamas) - 2 decimals */
  Bsd = 'BSD',
  /** Bhutanese Ngultrum (Bhutan) - 2 decimals */
  Btn = 'BTN',
  /** Botswana Pula (Botswana) - 2 decimals */
  Bwp = 'BWP',
  /** Belarusian Ruble (Belarus) - 2 decimals */
  Byn = 'BYN',
  /** Belize Dollar (Belize) - 2 decimals */
  Bzd = 'BZD',
  /** Canadian Dollar (Canada) - 2 decimals */
  Cad = 'CAD',
  /** Congolese Franc (DR Congo) - 2 decimals */
  Cdf = 'CDF',
  /** Swiss Franc (Switzerland) - 2 decimals */
  Chf = 'CHF',
  /** Chilean Peso (Chile) - 0 decimals */
  Clp = 'CLP',
  /** Chinese Yuan (China) - 2 decimals */
  Cny = 'CNY',
  /** Colombian Peso (Colombia) - 2 decimals */
  Cop = 'COP',
  /** Costa Rican Colon (Costa Rica) - 2 decimals */
  Crc = 'CRC',
  /** Cuban Peso (Cuba) - 2 decimals */
  Cup = 'CUP',
  /** Cape Verdean Escudo (Cape Verde) - 2 decimals */
  Cve = 'CVE',
  /** Czech Koruna (Czech Republic) - 2 decimals */
  Czk = 'CZK',
  /** Djiboutian Franc (Djibouti) - 0 decimals */
  Djf = 'DJF',
  /** Danish Krone (Denmark) - 2 decimals */
  Dkk = 'DKK',
  /** Dominican Peso (Dominican Republic) - 2 decimals */
  Dop = 'DOP',
  /** Algerian Dinar (Algeria) - 2 decimals */
  Dzd = 'DZD',
  /** Egyptian Pound (Egypt) - 2 decimals */
  Egp = 'EGP',
  /** Eritrean Nakfa (Eritrea) - 2 decimals */
  Ern = 'ERN',
  /** Ethiopian Birr (Ethiopia) - 2 decimals */
  Etb = 'ETB',
  /** Euro (European Union) - 2 decimals */
  Eur = 'EUR',
  /** Fijian Dollar (Fiji) - 2 decimals */
  Fjd = 'FJD',
  /** Falkland Islands Pound - 2 decimals */
  Fkp = 'FKP',
  /** Faroese Króna (Faroe Islands) - 2 decimals */
  Fok = 'FOK',
  /** Pound Sterling (United Kingdom) - 2 decimals */
  Gbp = 'GBP',
  /** Georgian Lari (Georgia) - 2 decimals */
  Gel = 'GEL',
  /** Guernsey Pound (Guernsey) - 2 decimals */
  Ggp = 'GGP',
  /** Ghanaian Cedi (Ghana) - 2 decimals */
  Ghs = 'GHS',
  /** Gibraltar Pound (Gibraltar) - 2 decimals */
  Gip = 'GIP',
  /** Gambian Dalasi (Gambia) - 2 decimals */
  Gmd = 'GMD',
  /** Guinean Franc (Guinea) - 0 decimals */
  Gnf = 'GNF',
  /** Guatemalan Quetzal (Guatemala) - 2 decimals */
  Gtq = 'GTQ',
  /** Guyanese Dollar (Guyana) - 2 decimals */
  Gyd = 'GYD',
  /** Hong Kong Dollar (Hong Kong) - 2 decimals */
  Hkd = 'HKD',
  /** Honduran Lempira (Honduras) - 2 decimals */
  Hnl = 'HNL',
  /** Croatian Kuna (Croatia) - 2 decimals */
  Hrk = 'HRK',
  /** Haitian Gourde (Haiti) - 2 decimals */
  Htg = 'HTG',
  /** Hungarian Forint (Hungary) - 2 decimals */
  Huf = 'HUF',
  /** Indonesian Rupiah (Indonesia) - 0 decimals */
  Idr = 'IDR',
  /** Israeli New Shekel (Israel) - 2 decimals */
  Ils = 'ILS',
  /** Isle of Man Pound - 2 decimals */
  Imp = 'IMP',
  /** Indian Rupee (India) - 2 decimals */
  Inr = 'INR',
  /** Iraqi Dinar (Iraq) - 3 decimals */
  Iqd = 'IQD',
  /** Iranian Rial (Iran) - 2 decimals */
  Irr = 'IRR',
  /** Icelandic Króna (Iceland) - 0 decimals */
  Isk = 'ISK',
  /** Jersey Pound (Jersey) - 2 decimals */
  Jep = 'JEP',
  /** Jamaican Dollar (Jamaica) - 2 decimals */
  Jmd = 'JMD',
  /** Jordanian Dinar (Jordan) - 3 decimals */
  Jod = 'JOD',
  /** Japanese Yen (Japan) - 0 decimals */
  Jpy = 'JPY',
  /** Kenyan Shilling (Kenya) - 2 decimals */
  Kes = 'KES',
  /** Kyrgyzstani Som (Kyrgyzstan) - 2 decimals */
  Kgs = 'KGS',
  /** Cambodian Riel (Cambodia) - 2 decimals */
  Khr = 'KHR',
  /** Comorian Franc (Comoros) - 2 decimals */
  Kmf = 'KMF',
  /** North Korean Won (North Korea) - 2 decimals */
  Kpw = 'KPW',
  /** South Korean Won (South Korea) - 0 decimals */
  Krw = 'KRW',
  /** Kuwaiti Dinar (Kuwait) - 3 decimals */
  Kwd = 'KWD',
  /** Cayman Islands Dollar - 2 decimals */
  Kyd = 'KYD',
  /** Kazakhstani Tenge (Kazakhstan) - 2 decimals */
  Kzt = 'KZT',
  /** Lao Kip (Laos) - 2 decimals */
  Lak = 'LAK',
  /** Lebanese Pound (Lebanon) - 2 decimals */
  Lbp = 'LBP',
  /** Sri Lankan Rupee (Sri Lanka) - 2 decimals */
  Lkr = 'LKR',
  /** Liberian Dollar (Liberia) - 2 decimals */
  Lrd = 'LRD',
  /** Lesotho Loti (Lesotho) - 2 decimals */
  Lsl = 'LSL',
  /** Libyan Dinar (Libya) - 3 decimals */
  Lyd = 'LYD',
  /** Moroccan Dirham (Morocco) - 2 decimals */
  Mad = 'MAD',
  /** Moldovan Leu (Moldova) - 2 decimals */
  Mdl = 'MDL',
  /** Malagasy Ariary (Madagascar) - 2 decimals */
  Mga = 'MGA',
  /** Macedonian Denar (North Macedonia) - 2 decimals */
  Mkd = 'MKD',
  /** Burmese Kyat (Myanmar) - 2 decimals */
  Mmk = 'MMK',
  /** Mongolian Tögrög (Mongolia) - 2 decimals */
  Mnt = 'MNT',
  /** Macanese Pataca (Macau) - 2 decimals */
  Mop = 'MOP',
  /** Mauritanian Ouguiya (Mauritania) - 2 decimals */
  Mru = 'MRU',
  /** Mauritian Rupee (Mauritius) - 2 decimals */
  Mur = 'MUR',
  /** Maldivian Rufiyaa (Maldives) - 2 decimals */
  Mvr = 'MVR',
  /** Malawian Kwacha (Malawi) - 2 decimals */
  Mwk = 'MWK',
  /** Mexican Peso (Mexico) - 2 decimals */
  Mxn = 'MXN',
  /** Malaysian Ringgit (Malaysia) - 2 decimals */
  Myr = 'MYR',
  /** Mozambican Metical (Mozambique) - 2 decimals */
  Mzn = 'MZN',
  /** Namibian Dollar (Namibia) - 2 decimals */
  Nad = 'NAD',
  /** Nigerian Naira (Nigeria) - 2 decimals */
  Ngn = 'NGN',
  /** Nicaraguan Córdoba (Nicaragua) - 2 decimals */
  Nio = 'NIO',
  /** Norwegian Krone (Norway) - 2 decimals */
  Nok = 'NOK',
  /** Nepalese Rupee (Nepal) - 2 decimals */
  Npr = 'NPR',
  /** New Zealand Dollar (New Zealand) - 2 decimals */
  Nzd = 'NZD',
  /** Omani Rial (Oman) - 3 decimals */
  Omr = 'OMR',
  /** Panamanian Balboa (Panama) - 2 decimals */
  Pab = 'PAB',
  /** Peruvian Sol (Peru) - 2 decimals */
  Pen = 'PEN',
  /** Papua New Guinean Kina - 2 decimals */
  Pgk = 'PGK',
  /** Philippine Peso (Philippines) - 2 decimals */
  Php = 'PHP',
  /** Pakistani Rupee (Pakistan) - 2 decimals */
  Pkr = 'PKR',
  /** Polish Zloty (Poland) - 2 decimals */
  Pln = 'PLN',
  /** Paraguayan Guaraní (Paraguay) - 0 decimals */
  Pyg = 'PYG',
  /** Qatari Riyal (Qatar) - 2 decimals */
  Qar = 'QAR',
  /** Romanian Leu (Romania) - 2 decimals */
  Ron = 'RON',
  /** Serbian Dinar (Serbia) - 2 decimals */
  Rsd = 'RSD',
  /** Russian Ruble (Russia) - 2 decimals */
  Rub = 'RUB',
  /** Rwandan Franc (Rwanda) - 0 decimals */
  Rwf = 'RWF',
  /** Saudi Riyal (Saudi Arabia) - 2 decimals */
  Sar = 'SAR',
  /** Solomon Islands Dollar - 2 decimals */
  Sbd = 'SBD',
  /** Seychelles Rupee (Seychelles) - 2 decimals */
  Scr = 'SCR',
  /** Sudanese Pound (Sudan) - 2 decimals */
  Sdg = 'SDG',
  /** Swedish Krona (Sweden) - 2 decimals */
  Sek = 'SEK',
  /** Singapore Dollar (Singapore) - 2 decimals */
  Sgd = 'SGD',
  /** Saint Helena Pound - 2 decimals */
  Shp = 'SHP',
  /** Sierra Leonean Leone - 2 decimals */
  Sle = 'SLE',
  /** Somali Shilling (Somalia) - 2 decimals */
  Sos = 'SOS',
  /** Surinamese Dollar (Suriname) - 2 decimals */
  Srd = 'SRD',
  /** South Sudanese Pound - 2 decimals */
  Ssp = 'SSP',
  /** São Tomé and Príncipe Dobra - 2 decimals */
  Stn = 'STN',
  /** Salvadoran Colón (El Salvador) - 2 decimals */
  Svc = 'SVC',
  /** Syrian Pound (Syria) - 2 decimals */
  Syp = 'SYP',
  /** Eswatini Lilangeni (Eswatini) - 2 decimals */
  Szl = 'SZL',
  /** Thai Baht (Thailand) - 2 decimals */
  Thb = 'THB',
  /** Tajikistani Somoni (Tajikistan) - 2 decimals */
  Tjs = 'TJS',
  /** Turkmenistani Manat (Turkmenistan) - 2 decimals */
  Tmt = 'TMT',
  /** Tunisian Dinar (Tunisia) - 3 decimals */
  Tnd = 'TND',
  /** Tongan Paʻanga (Tonga) - 2 decimals */
  Top = 'TOP',
  /** Turkish Lira (Turkey) - 2 decimals */
  Try = 'TRY',
  /** Trinidad and Tobago Dollar - 2 decimals */
  Ttd = 'TTD',
  /** New Taiwan Dollar (Taiwan) - 2 decimals */
  Twd = 'TWD',
  /** Tanzanian Shilling (Tanzania) - 2 decimals */
  Tzs = 'TZS',
  /** Ukrainian Hryvnia (Ukraine) - 2 decimals */
  Uah = 'UAH',
  /** Ugandan Shilling (Uganda) - 0 decimals */
  Ugx = 'UGX',
  /** United States Dollar (USA) - 2 decimals */
  Usd = 'USD',
  /** Uruguayan Peso (Uruguay) - 2 decimals */
  Uyu = 'UYU',
  /** Uzbekistani Som (Uzbekistan) - 2 decimals */
  Uzs = 'UZS',
  /** Venezuelan Bolívar (Venezuela) - 2 decimals */
  Ves = 'VES',
  /** Vietnamese Dong (Vietnam) - 0 decimals */
  Vnd = 'VND',
  /** Vanuatu Vatu (Vanuatu) - 0 decimals */
  Vuv = 'VUV',
  /** Samoan Tala (Samoa) - 2 decimals */
  Wst = 'WST',
  /** Central African CFA Franc - 0 decimals */
  Xaf = 'XAF',
  /** East Caribbean Dollar - 2 decimals */
  Xcd = 'XCD',
  /** Special Drawing Rights (IMF) - 0 decimals */
  Xdr = 'XDR',
  /** West African CFA Franc - 0 decimals */
  Xof = 'XOF',
  /** CFP Franc - 0 decimals */
  Xpf = 'XPF',
  /** Yemeni Rial (Yemen) - 2 decimals */
  Yer = 'YER',
  /** South African Rand (South Africa) - 2 decimals */
  Zar = 'ZAR',
  /** Zambian Kwacha (Zambia) - 2 decimals */
  Zmw = 'ZMW',
  /** Zimbabwean Dollar (Zimbabwe) - 2 decimals */
  Zwl = 'ZWL'
}

/** Filter operators for DateTime fields */
export type DateTimeFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than (before) */
  _lt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Less than or equal (on or before) */
  _lte?: InputMaybe<Scalars['DateTime']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Dimension (length) measurement units */
export enum DimensionUnit {
  /** Centimeter */
  Cm = 'cm',
  /** Foot */
  Ft = 'ft',
  /** Inch */
  In = 'in',
  /** Meter */
  M = 'm',
  /** Millimeter */
  Mm = 'mm'
}

export type File = {
  __typename?: 'File';
  id: Scalars['ID']['output'];
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type IdFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['ID']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['ID']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Language/Locale codes based on ISO 639-1 and BCP 47 */
export enum LocaleCode {
  /** Akan */
  Ak = 'ak',
  /** Amharic */
  Am = 'am',
  /** Arabic */
  Ar = 'ar',
  /** Assamese */
  As = 'as',
  /** Azerbaijani */
  Az = 'az',
  /** Belarusian */
  Be = 'be',
  /** Bulgarian */
  Bg = 'bg',
  /** Bambara */
  Bm = 'bm',
  /** Bangla */
  Bn = 'bn',
  /** Tibetan */
  Bo = 'bo',
  /** Breton */
  Br = 'br',
  /** Bosnian */
  Bs = 'bs',
  /** Catalan */
  Ca = 'ca',
  /** Chechen */
  Ce = 'ce',
  /** Central Kurdish */
  Ckb = 'ckb',
  /** Czech */
  Cs = 'cs',
  /** Welsh */
  Cy = 'cy',
  /** Danish */
  Da = 'da',
  /** German */
  De = 'de',
  /** Dzongkha */
  Dz = 'dz',
  /** Ewe */
  Ee = 'ee',
  /** Greek */
  El = 'el',
  /** English */
  En = 'en',
  /** Esperanto */
  Eo = 'eo',
  /** Spanish */
  Es = 'es',
  /** Estonian */
  Et = 'et',
  /** Basque */
  Eu = 'eu',
  /** Persian */
  Fa = 'fa',
  /** Fulah */
  Ff = 'ff',
  /** Finnish */
  Fi = 'fi',
  /** Filipino */
  Fil = 'fil',
  /** Faroese */
  Fo = 'fo',
  /** French */
  Fr = 'fr',
  /** Western Frisian */
  Fy = 'fy',
  /** Irish */
  Ga = 'ga',
  /** Scottish Gaelic */
  Gd = 'gd',
  /** Galician */
  Gl = 'gl',
  /** Gujarati */
  Gu = 'gu',
  /** Manx */
  Gv = 'gv',
  /** Hausa */
  Ha = 'ha',
  /** Hebrew */
  He = 'he',
  /** Hindi */
  Hi = 'hi',
  /** Croatian */
  Hr = 'hr',
  /** Hungarian */
  Hu = 'hu',
  /** Armenian */
  Hy = 'hy',
  /** Interlingua */
  Ia = 'ia',
  /** Indonesian */
  Id = 'id',
  /** Igbo */
  Ig = 'ig',
  /** Sichuan Yi */
  Ii = 'ii',
  /** Icelandic */
  Is = 'is',
  /** Italian */
  It = 'it',
  /** Japanese */
  Ja = 'ja',
  /** Javanese */
  Jv = 'jv',
  /** Georgian */
  Ka = 'ka',
  /** Kikuyu */
  Ki = 'ki',
  /** Kazakh */
  Kk = 'kk',
  /** Kalaallisut */
  Kl = 'kl',
  /** Khmer */
  Km = 'km',
  /** Kannada */
  Kn = 'kn',
  /** Korean */
  Ko = 'ko',
  /** Kashmiri */
  Ks = 'ks',
  /** Kurdish */
  Ku = 'ku',
  /** Cornish */
  Kw = 'kw',
  /** Kyrgyz */
  Ky = 'ky',
  /** Luxembourgish */
  Lb = 'lb',
  /** Ganda */
  Lg = 'lg',
  /** Lingala */
  Ln = 'ln',
  /** Lao */
  Lo = 'lo',
  /** Lithuanian */
  Lt = 'lt',
  /** Luba-Katanga */
  Lu = 'lu',
  /** Latvian */
  Lv = 'lv',
  /** Malagasy */
  Mg = 'mg',
  /** Māori */
  Mi = 'mi',
  /** Macedonian */
  Mk = 'mk',
  /** Malayalam */
  Ml = 'ml',
  /** Mongolian */
  Mn = 'mn',
  /** Marathi */
  Mr = 'mr',
  /** Malay */
  Ms = 'ms',
  /** Maltese */
  Mt = 'mt',
  /** Burmese */
  My = 'my',
  /** Norwegian Bokmål */
  Nb = 'nb',
  /** North Ndebele */
  Nd = 'nd',
  /** Nepali */
  Ne = 'ne',
  /** Dutch */
  Nl = 'nl',
  /** Norwegian Nynorsk */
  Nn = 'nn',
  /** Norwegian */
  No = 'no',
  /** Oromo */
  Om = 'om',
  /** Odia */
  Or = 'or',
  /** Ossetic */
  Os = 'os',
  /** Punjabi */
  Pa = 'pa',
  /** Polish */
  Pl = 'pl',
  /** Pashto */
  Ps = 'ps',
  /** Portuguese (Brazil) */
  PtBr = 'pt_BR',
  /** Portuguese (Portugal) */
  PtPt = 'pt_PT',
  /** Quechua */
  Qu = 'qu',
  /** Romansh */
  Rm = 'rm',
  /** Rundi */
  Rn = 'rn',
  /** Romanian */
  Ro = 'ro',
  /** Russian */
  Ru = 'ru',
  /** Kinyarwanda */
  Rw = 'rw',
  /** Sanskrit */
  Sa = 'sa',
  /** Sardinian */
  Sc = 'sc',
  /** Sindhi */
  Sd = 'sd',
  /** Northern Sami */
  Se = 'se',
  /** Sango */
  Sg = 'sg',
  /** Sinhala */
  Si = 'si',
  /** Slovak */
  Sk = 'sk',
  /** Slovenian */
  Sl = 'sl',
  /** Shona */
  Sn = 'sn',
  /** Somali */
  So = 'so',
  /** Albanian */
  Sq = 'sq',
  /** Serbian */
  Sr = 'sr',
  /** Sundanese */
  Su = 'su',
  /** Swedish */
  Sv = 'sv',
  /** Swahili */
  Sw = 'sw',
  /** Tamil */
  Ta = 'ta',
  /** Telugu */
  Te = 'te',
  /** Tajik */
  Tg = 'tg',
  /** Thai */
  Th = 'th',
  /** Tigrinya */
  Ti = 'ti',
  /** Turkmen */
  Tk = 'tk',
  /** Tongan */
  To = 'to',
  /** Turkish */
  Tr = 'tr',
  /** Tatar */
  Tt = 'tt',
  /** Uyghur */
  Ug = 'ug',
  /** Ukrainian */
  Uk = 'uk',
  /** Urdu */
  Ur = 'ur',
  /** Uzbek */
  Uz = 'uz',
  /** Vietnamese */
  Vi = 'vi',
  /** Wolof */
  Wo = 'wo',
  /** Xhosa */
  Xh = 'xh',
  /** Yiddish */
  Yi = 'yi',
  /** Yoruba */
  Yo = 'yo',
  /** Chinese (Simplified) */
  ZhCn = 'zh_CN',
  /** Chinese (Traditional) */
  ZhTw = 'zh_TW',
  /** Zulu */
  Zu = 'zu'
}

/**
 * Member with role assignment.
 * Used for both org-level (domain = "org") and store-level (domain = "store:uuid").
 */
export type Member = {
  __typename?: 'Member';
  /** When access was granted. */
  grantedAt: Scalars['DateTime']['output'];
  /** User who granted access. */
  grantedBy?: Maybe<User>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /**
   * Whether this member is the organization owner.
   * Owner bypasses all authorization checks within the organization.
   * Only applicable for org-level membership (domain = "org").
   */
  isOwner: Scalars['Boolean']['output'];
  /** Role name. */
  role: Scalars['String']['output'];
  /** User reference. */
  user: User;
};

/** Input for removing member's access. */
export type MemberAccessRemoveInput = {
  /** Domain to remove access from. */
  domain: Scalars['String']['input'];
  /** Organization ID where the member belongs. */
  organizationId: Scalars['ID']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type MemberAccessRemovePayload = {
  __typename?: 'MemberAccessRemovePayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<GenericUserError>;
};

/** Input for inviting a member to organization. */
export type MemberInviteInput = {
  /** Email address of the user to invite. */
  email: Scalars['Email']['input'];
  /** Organization ID to invite the member to. */
  organizationId: Scalars['ID']['input'];
  /** Role assignments (at least one required). */
  roles: Array<RoleAssignment>;
};

export type MemberInvitePayload = {
  __typename?: 'MemberInvitePayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

/** Input for removing a member from organization. */
export type MemberRemoveInput = {
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
  /** User ID of the member to remove. */
  userId: Scalars['ID']['input'];
};

export type MemberRemovePayload = {
  __typename?: 'MemberRemovePayload';
  removedMemberId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Input for changing member's role. */
export type MemberRoleChangeInput = {
  /** Domain ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Organization ID where the member belongs. */
  organizationId: Scalars['ID']['input'];
  /** New role name. */
  role: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type MemberRoleChangePayload = {
  __typename?: 'MemberRoleChangePayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

/**
 * Membership — universal container for members and roles.
 * Used for both Organization and Store.
 * Domain determines context: orgId for org-level, storeId for store-level.
 */
export type Membership = {
  __typename?: 'Membership';
  /** Available resources for role editor (org-level only). */
  availableResources?: Maybe<Array<ResourceDefinition>>;
  /** Domain identifier ("org" for organization, or "store:uuid"). */
  domain: Scalars['String']['output'];
  /** All members with access to this domain. */
  members: Array<Member>;
  /** Organization ID (required for casbin queries). */
  organizationId: Scalars['ID']['output'];
  /** All roles available in this organization. */
  roles: Array<Role>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Application realm management mutations. */
  applicationMutation: ApplicationMutation;
  /** Authentication mutations. */
  authMutation: AuthMutation;
  /** Organization management mutations. */
  organizationMutation: OrganizationMutation;
  /** Role management mutations. */
  roleMutation: RoleMutation;
  /** User management mutations. */
  userMutation: UserMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type Organization = Node & {
  __typename?: 'Organization';
  /** Applications owned by this organization. */
  applications: ApplicationConnection;
  /** Timestamp when the organization was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Display name (e.g., "Acme Corp"). */
  displayName: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Organization logo (from Media service). */
  logo?: Maybe<File>;
  /** Membership info (members + roles). Domain = orgId. */
  membership: Membership;
  /** URL-friendly unique identifier. */
  name: Scalars['String']['output'];
  /** Timestamp when the organization was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};


/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain stores.
 */
export type OrganizationApplicationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApplicationOrderByInput>>;
  where?: InputMaybe<ApplicationWhereInput>;
};

/** A connection to a list of Organization items. */
export type OrganizationConnection = {
  __typename?: 'OrganizationConnection';
  /** A list of edges. */
  edges: Array<OrganizationEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of organizations. */
  totalCount: Scalars['Int']['output'];
};

/** Input for creating an organization. */
export type OrganizationCreateInput = {
  /** Display name. */
  displayName: Scalars['String']['input'];
  /** URL-friendly unique identifier. */
  name: Scalars['String']['input'];
};

export type OrganizationCreatePayload = {
  __typename?: 'OrganizationCreatePayload';
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
};

export type OrganizationDeletePayload = {
  __typename?: 'OrganizationDeletePayload';
  deletedOrganizationId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/** An edge in an Organization connection. */
export type OrganizationEdge = {
  __typename?: 'OrganizationEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: Organization;
};

/** Organization mutations. */
export type OrganizationMutation = {
  __typename?: 'OrganizationMutation';
  /** Remove member's access from domain. */
  memberAccessRemove: MemberAccessRemovePayload;
  /** Invite member to organization with role assignments. */
  memberInvite: MemberInvitePayload;
  /**
   * Remove member from organization.
   * Requires: org admin or owner.
   * Cannot remove owner (transfer ownership first).
   */
  memberRemove: MemberRemovePayload;
  /**
   * Change role for a member in specific domain.
   * Owner cannot be demoted.
   */
  memberRoleChange: MemberRoleChangePayload;
  /**
   * Create a new organization.
   * Current user becomes the owner.
   */
  organizationCreate: OrganizationCreatePayload;
  /** Delete organization. Requires: org owner only. */
  organizationDelete: OrganizationDeletePayload;
  /**
   * Update organization.
   * Requires: org admin or owner.
   */
  organizationUpdate: OrganizationUpdatePayload;
  /**
   * Transfer organization ownership to another admin.
   * Only the current owner can transfer ownership.
   * New owner must have admin role in the organization.
   * Previous owner retains admin role.
   */
  ownershipTransfer: OwnershipTransferPayload;
};


/** Organization mutations. */
export type OrganizationMutationMemberAccessRemoveArgs = {
  input: MemberAccessRemoveInput;
};


/** Organization mutations. */
export type OrganizationMutationMemberInviteArgs = {
  input: MemberInviteInput;
};


/** Organization mutations. */
export type OrganizationMutationMemberRemoveArgs = {
  input: MemberRemoveInput;
};


/** Organization mutations. */
export type OrganizationMutationMemberRoleChangeArgs = {
  input: MemberRoleChangeInput;
};


/** Organization mutations. */
export type OrganizationMutationOrganizationCreateArgs = {
  input: OrganizationCreateInput;
};


/** Organization mutations. */
export type OrganizationMutationOrganizationDeleteArgs = {
  id: Scalars['ID']['input'];
};


/** Organization mutations. */
export type OrganizationMutationOrganizationUpdateArgs = {
  input: OrganizationUpdateInput;
};


/** Organization mutations. */
export type OrganizationMutationOwnershipTransferArgs = {
  input: OwnershipTransferInput;
};

/** Ordering configuration for Organization */
export type OrganizationOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: OrganizationOrderField;
};

/** Fields available for sorting Organization */
export enum OrganizationOrderField {
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by displayName */
  DisplayName = 'displayName',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Organization queries. */
export type OrganizationQuery = {
  __typename?: 'OrganizationQuery';
  /**
   * Get organization by ID or name (if user has access).
   * Provide either id or name, not both.
   */
  organization?: Maybe<Organization>;
  /**
   * Get all organizations the current user has access to with cursor pagination.
   * Returns empty connection if not authenticated.
   */
  organizations: OrganizationConnection;
};


/** Organization queries. */
export type OrganizationQueryOrganizationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


/** Organization queries. */
export type OrganizationQueryOrganizationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<OrganizationOrderByInput>>;
  where?: InputMaybe<OrganizationWhereInput>;
};

/** Input for updating organization. */
export type OrganizationUpdateInput = {
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Organization ID. */
  id: Scalars['ID']['input'];
  /** Media file ID for the logo. Pass null to remove logo. */
  logoId?: InputMaybe<Scalars['ID']['input']>;
  /** New name (URL-friendly identifier). */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type OrganizationUpdatePayload = {
  __typename?: 'OrganizationUpdatePayload';
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for Organization */
export type OrganizationWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<OrganizationWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<OrganizationWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<OrganizationWhereInput>>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<StringFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by name */
  name?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
};

/** Input for transferring organization ownership. */
export type OwnershipTransferInput = {
  /** User ID of the new owner. Must be an admin of the organization. */
  newOwnerId: Scalars['ID']['input'];
  /** Organization ID. */
  organizationId: Scalars['ID']['input'];
};

export type OwnershipTransferPayload = {
  __typename?: 'OwnershipTransferPayload';
  /** Whether the transfer was successful. */
  success: Scalars['Boolean']['output'];
  userErrors: Array<GenericUserError>;
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars['Boolean']['output'];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Application realm management queries. */
  applicationQuery: ApplicationQuery;
  /** Organization queries namespace. */
  organizationQuery: OrganizationQuery;
  /** User management queries. */
  userQuery: UserQuery;
};

/** Resource definition for role editor UI. */
export type ResourceDefinition = {
  __typename?: 'ResourceDefinition';
  /** Available actions for resource. */
  actions: Array<Scalars['String']['output']>;
  /** Resource description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Display name. */
  displayName?: Maybe<Scalars['String']['output']>;
  /** Resource name (product, order, etc.). */
  name: Scalars['String']['output'];
};

/** Role with permissions - universal, can be assigned at any level. */
export type Role = {
  __typename?: 'Role';
  /** Role creation date. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName: Scalars['String']['output'];
  /**
   * Domain scope for this role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars['String']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** System role cannot be deleted or modified. */
  isSystem: Scalars['Boolean']['output'];
  /** Unique role name within organization (e.g.: admin, manager, viewer). */
  name: Scalars['String']['output'];
  /** Role permissions. */
  permissions: Array<RolePermission>;
  /** Role last update date. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Role assignment - assigns role to user in specific domain. */
export type RoleAssignment = {
  /** Domain ID ("org" for organization, or "store:{uuid}"). */
  domain: Scalars['String']['input'];
  /** Role name. */
  role: Scalars['String']['input'];
};

/** Input for creating a role. */
export type RoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  displayName: Scalars['String']['input'];
  /**
   * Domain scope for role.
   * - "org" = organization-level role
   * - "store:{uuid}" = store-specific role
   */
  domain: Scalars['String']['input'];
  /** Unique role name (slug). */
  name: Scalars['String']['input'];
  /** Organization ID where the role will be created. */
  organizationId: Scalars['ID']['input'];
  /** Role permissions. */
  permissions: Array<RolePermissionInput>;
};

export type RoleCreatePayload = {
  __typename?: 'RoleCreatePayload';
  role?: Maybe<Role>;
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a role. */
export type RoleDeleteInput = {
  /** Role ID to delete. */
  id: Scalars['ID']['input'];
  /** Organization ID where the role exists. */
  organizationId: Scalars['ID']['input'];
};

export type RoleDeletePayload = {
  __typename?: 'RoleDeletePayload';
  deletedRoleName?: Maybe<Scalars['String']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Role mutations. */
export type RoleMutation = {
  __typename?: 'RoleMutation';
  /**
   * Create custom role.
   * Requires: project:admin permission.
   */
  roleCreate: RoleCreatePayload;
  /**
   * Delete custom role.
   * Requires: project:admin permission.
   * System roles cannot be deleted.
   * Roles with assigned users cannot be deleted.
   */
  roleDelete: RoleDeletePayload;
  /**
   * Update role.
   * Requires: project:admin permission.
   * System roles cannot be modified.
   */
  roleUpdate: RoleUpdatePayload;
};


/** Role mutations. */
export type RoleMutationRoleCreateArgs = {
  input: RoleCreateInput;
};


/** Role mutations. */
export type RoleMutationRoleDeleteArgs = {
  input: RoleDeleteInput;
};


/** Role mutations. */
export type RoleMutationRoleUpdateArgs = {
  input: RoleUpdateInput;
};

/** Role permission - access to resource with specific actions. */
export type RolePermission = {
  __typename?: 'RolePermission';
  /** Allowed actions (e.g.: create, read, update, delete). */
  actions: Array<Scalars['String']['output']>;
  /** Resource name (e.g.: org.profile, store.members). */
  resource: Scalars['String']['output'];
};

/** Input for role permission. */
export type RolePermissionInput = {
  /** Action level (read, write, admin). Higher levels include lower ones. */
  action: Action;
  /** Resource (e.g.: org.profile, store.members). */
  resource: Scalars['String']['input'];
};

/** Input for updating a role. */
export type RoleUpdateInput = {
  /** New description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Role ID to update. */
  id: Scalars['ID']['input'];
  /** Organization ID where the role exists. */
  organizationId: Scalars['ID']['input'];
  /** New permissions (completely replaces existing). */
  permissions?: InputMaybe<Array<RolePermissionInput>>;
};

export type RoleUpdatePayload = {
  __typename?: 'RoleUpdatePayload';
  role?: Maybe<Role>;
  userErrors: Array<GenericUserError>;
};

/** User session representing an active login. */
export type Session = {
  __typename?: 'Session';
  /** The date and time when the session was created. */
  createdAt: Scalars['DateTime']['output'];
  /** When the session expires. */
  expiresAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the session. */
  id: Scalars['ID']['output'];
  /** IP address from which the session was created. */
  ipAddress?: Maybe<Scalars['String']['output']>;
  /** Whether this is the current session making the request. */
  isCurrent: Scalars['Boolean']['output'];
  /** The date and time when the session was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** User agent string (browser/device info). */
  userAgent?: Maybe<Scalars['String']['output']>;
};

/** Payload for revoking all sessions. */
export type SessionRevokeAllPayload = {
  __typename?: 'SessionRevokeAllPayload';
  /** Number of sessions revoked. */
  revokedCount: Scalars['Int']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for revoking a specific session. */
export type SessionRevokeInput = {
  /** The ID of the session to revoke. */
  sessionId: Scalars['ID']['input'];
};

/** Payload for session revoke operation. */
export type SessionRevokePayload = {
  __typename?: 'SessionRevokePayload';
  /** Whether the session was successfully revoked. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type StringFilter = {
  /** Contains substring (case-sensitive) */
  _contains?: InputMaybe<Scalars['String']['input']>;
  /** Contains substring (case-insensitive) */
  _containsi?: InputMaybe<Scalars['String']['input']>;
  /** Equals */
  _eq?: InputMaybe<Scalars['String']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** User type representing admin users (CMS/backoffice). */
export type User = {
  __typename?: 'User';
  /** User's avatar image (from Media service). */
  avatar?: Maybe<File>;
  /** The date and time when the user was created. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** User's email address. */
  email: Scalars['Email']['output'];
  /** Whether the email has been verified. */
  emailVerified?: Maybe<Scalars['Boolean']['output']>;
  /** User's first name. */
  firstName?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the user. */
  id: Scalars['ID']['output'];
  /** Whether the user has admin privileges. */
  isAdmin?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is deleted. */
  isDeleted?: Maybe<Scalars['Boolean']['output']>;
  /** Whether the user account is forbidden/banned. */
  isForbidden?: Maybe<Scalars['Boolean']['output']>;
  /**
   * Whether the user has completed their profile (firstName and lastName are filled).
   * Used for onboarding flow to ensure required fields are present.
   */
  isProfileComplete: Scalars['Boolean']['output'];
  /** User's last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /** The date and time when the user was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type UserMutation = {
  __typename?: 'UserMutation';
  /** Revoke a specific session by ID. */
  sessionRevoke: SessionRevokePayload;
  /** Revoke all sessions except the current one. */
  sessionRevokeAll: SessionRevokeAllPayload;
  userUpdateEmail: UserUpdateEmailPayload;
  userUpdatePassword: UserUpdatePasswordPayload;
  userUpdateProfile: UserUpdateProfilePayload;
};


export type UserMutationSessionRevokeArgs = {
  input: SessionRevokeInput;
};


export type UserMutationUserUpdateEmailArgs = {
  input: UserUpdateEmailInput;
};


export type UserMutationUserUpdatePasswordArgs = {
  input: UserUpdatePasswordInput;
};


export type UserMutationUserUpdateProfileArgs = {
  input: UserUpdateProfileInput;
};

export type UserQuery = {
  __typename?: 'UserQuery';
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: AuthorizePayload;
  /** Get current authenticated admin user */
  current?: Maybe<User>;
  /** Get all active sessions for the current user. */
  mySessions: Array<Session>;
};


export type UserQueryAuthorizeArgs = {
  input: AuthorizeInput;
};

/** Input for admin user authentication. */
export type UserSignInInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign in. */
export type UserSignInPayload = {
  __typename?: 'UserSignInPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthTokenPayload>;
  /** The authenticated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign out. */
export type UserSignOutInput = {
  /** Sign out from all sessions. */
  allSessions?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for admin user sign out. */
export type UserSignOutPayload = {
  __typename?: 'UserSignOutPayload';
  /** Whether sign out was successful. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for admin user sign up. */
export type UserSignUpInput = {
  /** Email address. */
  email: Scalars['Email']['input'];
  /** Password. */
  password: Scalars['String']['input'];
};

/** Payload for admin user sign up. */
export type UserSignUpPayload = {
  __typename?: 'UserSignUpPayload';
  /** Authentication tokens. */
  token?: Maybe<AuthTokenPayload>;
  /** The created user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for refreshing admin user access token. */
export type UserTokenRefreshInput = {
  /** Refresh token to use for obtaining new access token. */
  refreshToken: Scalars['String']['input'];
};

/** Payload for admin user token refresh. */
export type UserTokenRefreshPayload = {
  __typename?: 'UserTokenRefreshPayload';
  /** New authentication tokens. */
  token?: Maybe<AuthTokenPayload>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user email. */
export type UserUpdateEmailInput = {
  /** New email address. */
  newEmail: Scalars['Email']['input'];
};

/** Payload for user email update. */
export type UserUpdateEmailPayload = {
  __typename?: 'UserUpdateEmailPayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user password. */
export type UserUpdatePasswordInput = {
  /** Current password. */
  currentPassword: Scalars['String']['input'];
  /** New password. */
  newPassword: Scalars['String']['input'];
};

/** Payload for user password update. */
export type UserUpdatePasswordPayload = {
  __typename?: 'UserUpdatePasswordPayload';
  /** Whether the password was changed successfully. */
  success: Scalars['Boolean']['output'];
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for updating user profile. */
export type UserUpdateProfileInput = {
  /** Media file ID for the avatar. Pass null to remove avatar. */
  avatarId?: InputMaybe<Scalars['ID']['input']>;
  /** User's first name. */
  firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's last name. */
  lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale/language preference. */
  locale?: InputMaybe<LocaleCode>;
};

/** Payload for user profile update. */
export type UserUpdateProfilePayload = {
  __typename?: 'UserUpdateProfilePayload';
  /** The updated user. */
  user?: Maybe<User>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Weight measurement units */
export enum WeightUnit {
  /** Gram */
  G = 'g',
  /** Kilogram */
  Kg = 'kg',
  /** Pound */
  Lb = 'lb',
  /** Ounce */
  Oz = 'oz'
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Node: ( Application ) | ( ApplicationOAuthClient ) | ( ApplicationUser ) | ( ApplicationUserLinkedAccount ) | ( Organization );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Action: Action;
  Application: ResolverTypeWrapper<Application>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  ApplicationArchiveInput: ApplicationArchiveInput;
  ApplicationArchivePayload: ResolverTypeWrapper<ApplicationArchivePayload>;
  ApplicationAuthBackgroundColor: ApplicationAuthBackgroundColor;
  ApplicationAuthBranding: ResolverTypeWrapper<ApplicationAuthBranding>;
  ApplicationAuthBrandingInput: ApplicationAuthBrandingInput;
  ApplicationAuthConfiguration: ResolverTypeWrapper<ApplicationAuthConfiguration>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ApplicationAuthEmailDeliveryConfiguration: ResolverTypeWrapper<ApplicationAuthEmailDeliveryConfiguration>;
  ApplicationAuthEmailDeliveryInput: ApplicationAuthEmailDeliveryInput;
  ApplicationAuthMethod: ResolverTypeWrapper<ApplicationAuthMethod>;
  ApplicationAuthMethodCapability: ApplicationAuthMethodCapability;
  ApplicationAuthMethodId: ResolverTypeWrapper<Scalars['ApplicationAuthMethodId']['output']>;
  ApplicationAuthMethodPayload: ResolverTypeWrapper<ApplicationAuthMethodPayload>;
  ApplicationAuthMethodUpdateInput: ApplicationAuthMethodUpdateInput;
  ApplicationAuthPrimaryColor: ApplicationAuthPrimaryColor;
  ApplicationAuthProtocolUrls: ResolverTypeWrapper<ApplicationAuthProtocolUrls>;
  ApplicationAuthProvider: ResolverTypeWrapper<ApplicationAuthProvider>;
  ApplicationAuthProviderCallbackUrl: ResolverTypeWrapper<ApplicationAuthProviderCallbackUrl>;
  ApplicationAuthProviderConfigureInput: ApplicationAuthProviderConfigureInput;
  ApplicationAuthProviderCredentialsDeleteInput: ApplicationAuthProviderCredentialsDeleteInput;
  ApplicationAuthProviderCredentialsRotateInput: ApplicationAuthProviderCredentialsRotateInput;
  ApplicationAuthProviderName: ApplicationAuthProviderName;
  ApplicationAuthProviderPayload: ResolverTypeWrapper<ApplicationAuthProviderPayload>;
  ApplicationAuthProviderUpdateInput: ApplicationAuthProviderUpdateInput;
  ApplicationAuthProviderValidateInput: ApplicationAuthProviderValidateInput;
  ApplicationAuthProviderValidation: ResolverTypeWrapper<ApplicationAuthProviderValidation>;
  ApplicationAuthProviderValidationPayload: ResolverTypeWrapper<ApplicationAuthProviderValidationPayload>;
  ApplicationAuthProviderValidationStatus: ApplicationAuthProviderValidationStatus;
  ApplicationAuthRealmEnabledSetInput: ApplicationAuthRealmEnabledSetInput;
  ApplicationAuthTrustedOrigin: ResolverTypeWrapper<ApplicationAuthTrustedOrigin>;
  ApplicationAuthUpdateInput: ApplicationAuthUpdateInput;
  ApplicationAuthUpdatePayload: ResolverTypeWrapper<ApplicationAuthUpdatePayload>;
  ApplicationConnection: ResolverTypeWrapper<ApplicationConnection>;
  ApplicationConsentMode: ApplicationConsentMode;
  ApplicationCreateInput: ApplicationCreateInput;
  ApplicationCreatePayload: ResolverTypeWrapper<ApplicationCreatePayload>;
  ApplicationEdge: ResolverTypeWrapper<ApplicationEdge>;
  ApplicationLifecycleStatus: ApplicationLifecycleStatus;
  ApplicationMutation: ResolverTypeWrapper<ApplicationMutation>;
  ApplicationOAuthClient: ResolverTypeWrapper<ApplicationOAuthClient>;
  ApplicationOAuthClientArchiveInput: ApplicationOAuthClientArchiveInput;
  ApplicationOAuthClientConnection: ResolverTypeWrapper<ApplicationOAuthClientConnection>;
  ApplicationOAuthClientCreateInput: ApplicationOAuthClientCreateInput;
  ApplicationOAuthClientCreatePayload: ResolverTypeWrapper<ApplicationOAuthClientCreatePayload>;
  ApplicationOAuthClientEdge: ResolverTypeWrapper<ApplicationOAuthClientEdge>;
  ApplicationOAuthClientEnabledSetInput: ApplicationOAuthClientEnabledSetInput;
  ApplicationOAuthClientEnvironment: ApplicationOAuthClientEnvironment;
  ApplicationOAuthClientOrderByInput: ApplicationOAuthClientOrderByInput;
  ApplicationOAuthClientOrderField: ApplicationOAuthClientOrderField;
  ApplicationOAuthClientPayload: ResolverTypeWrapper<ApplicationOAuthClientPayload>;
  ApplicationOAuthClientSecretRotateInput: ApplicationOAuthClientSecretRotateInput;
  ApplicationOAuthClientSecretRotatePayload: ResolverTypeWrapper<ApplicationOAuthClientSecretRotatePayload>;
  ApplicationOAuthClientSkipConsentSetInput: ApplicationOAuthClientSkipConsentSetInput;
  ApplicationOAuthClientType: ApplicationOAuthClientType;
  ApplicationOAuthClientUpdateInput: ApplicationOAuthClientUpdateInput;
  ApplicationOAuthClientWhereInput: ApplicationOAuthClientWhereInput;
  ApplicationOAuthTokenEndpointAuthMethod: ApplicationOAuthTokenEndpointAuthMethod;
  ApplicationOrderByInput: ApplicationOrderByInput;
  ApplicationOrderField: ApplicationOrderField;
  ApplicationQuery: ResolverTypeWrapper<ApplicationQuery>;
  ApplicationRegistrationMode: ApplicationRegistrationMode;
  ApplicationUpdateInput: ApplicationUpdateInput;
  ApplicationUpdatePayload: ResolverTypeWrapper<ApplicationUpdatePayload>;
  ApplicationUser: ResolverTypeWrapper<ApplicationUser>;
  ApplicationUserAccountUnlinkInput: ApplicationUserAccountUnlinkInput;
  ApplicationUserAccountUnlinkPayload: ResolverTypeWrapper<ApplicationUserAccountUnlinkPayload>;
  ApplicationUserConnection: ResolverTypeWrapper<ApplicationUserConnection>;
  ApplicationUserEdge: ResolverTypeWrapper<ApplicationUserEdge>;
  ApplicationUserLinkedAccount: ResolverTypeWrapper<ApplicationUserLinkedAccount>;
  ApplicationUserOrderByInput: ApplicationUserOrderByInput;
  ApplicationUserOrderField: ApplicationUserOrderField;
  ApplicationUserPayload: ResolverTypeWrapper<ApplicationUserPayload>;
  ApplicationUserSecurityMetadata: ResolverTypeWrapper<ApplicationUserSecurityMetadata>;
  ApplicationUserSessionsRevokeAllInput: ApplicationUserSessionsRevokeAllInput;
  ApplicationUserSessionsRevokeAllPayload: ResolverTypeWrapper<ApplicationUserSessionsRevokeAllPayload>;
  ApplicationUserStatus: ApplicationUserStatus;
  ApplicationUserStatusSetInput: ApplicationUserStatusSetInput;
  ApplicationUserWhereInput: ApplicationUserWhereInput;
  ApplicationWhereInput: ApplicationWhereInput;
  AuthMutation: ResolverTypeWrapper<AuthMutation>;
  AuthTokenPayload: ResolverTypeWrapper<AuthTokenPayload>;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: ResolverTypeWrapper<AuthorizePayload>;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  File: ResolverTypeWrapper<File>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Member: ResolverTypeWrapper<Member>;
  MemberAccessRemoveInput: MemberAccessRemoveInput;
  MemberAccessRemovePayload: ResolverTypeWrapper<MemberAccessRemovePayload>;
  MemberInviteInput: MemberInviteInput;
  MemberInvitePayload: ResolverTypeWrapper<MemberInvitePayload>;
  MemberRemoveInput: MemberRemoveInput;
  MemberRemovePayload: ResolverTypeWrapper<MemberRemovePayload>;
  MemberRoleChangeInput: MemberRoleChangeInput;
  MemberRoleChangePayload: ResolverTypeWrapper<MemberRoleChangePayload>;
  Membership: ResolverTypeWrapper<Membership>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationConnection: ResolverTypeWrapper<OrganizationConnection>;
  OrganizationCreateInput: OrganizationCreateInput;
  OrganizationCreatePayload: ResolverTypeWrapper<OrganizationCreatePayload>;
  OrganizationDeletePayload: ResolverTypeWrapper<OrganizationDeletePayload>;
  OrganizationEdge: ResolverTypeWrapper<OrganizationEdge>;
  OrganizationMutation: ResolverTypeWrapper<OrganizationMutation>;
  OrganizationOrderByInput: OrganizationOrderByInput;
  OrganizationOrderField: OrganizationOrderField;
  OrganizationQuery: ResolverTypeWrapper<OrganizationQuery>;
  OrganizationUpdateInput: OrganizationUpdateInput;
  OrganizationUpdatePayload: ResolverTypeWrapper<OrganizationUpdatePayload>;
  OrganizationWhereInput: OrganizationWhereInput;
  OwnershipTransferInput: OwnershipTransferInput;
  OwnershipTransferPayload: ResolverTypeWrapper<OwnershipTransferPayload>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  ResourceDefinition: ResolverTypeWrapper<ResourceDefinition>;
  Role: ResolverTypeWrapper<Role>;
  RoleAssignment: RoleAssignment;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: ResolverTypeWrapper<RoleCreatePayload>;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: ResolverTypeWrapper<RoleDeletePayload>;
  RoleMutation: ResolverTypeWrapper<RoleMutation>;
  RolePermission: ResolverTypeWrapper<RolePermission>;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: ResolverTypeWrapper<RoleUpdatePayload>;
  Session: ResolverTypeWrapper<Session>;
  SessionRevokeAllPayload: ResolverTypeWrapper<SessionRevokeAllPayload>;
  SessionRevokeInput: SessionRevokeInput;
  SessionRevokePayload: ResolverTypeWrapper<SessionRevokePayload>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  User: ResolverTypeWrapper<User>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  UserMutation: ResolverTypeWrapper<UserMutation>;
  UserQuery: ResolverTypeWrapper<UserQuery>;
  UserSignInInput: UserSignInInput;
  UserSignInPayload: ResolverTypeWrapper<UserSignInPayload>;
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: ResolverTypeWrapper<UserSignOutPayload>;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: ResolverTypeWrapper<UserSignUpPayload>;
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: ResolverTypeWrapper<UserTokenRefreshPayload>;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: ResolverTypeWrapper<UserUpdateEmailPayload>;
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: ResolverTypeWrapper<UserUpdatePasswordPayload>;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: ResolverTypeWrapper<UserUpdateProfilePayload>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Application: Application;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  ApplicationArchiveInput: ApplicationArchiveInput;
  ApplicationArchivePayload: ApplicationArchivePayload;
  ApplicationAuthBranding: ApplicationAuthBranding;
  ApplicationAuthBrandingInput: ApplicationAuthBrandingInput;
  ApplicationAuthConfiguration: ApplicationAuthConfiguration;
  Boolean: Scalars['Boolean']['output'];
  ApplicationAuthEmailDeliveryConfiguration: ApplicationAuthEmailDeliveryConfiguration;
  ApplicationAuthEmailDeliveryInput: ApplicationAuthEmailDeliveryInput;
  ApplicationAuthMethod: ApplicationAuthMethod;
  ApplicationAuthMethodId: Scalars['ApplicationAuthMethodId']['output'];
  ApplicationAuthMethodPayload: ApplicationAuthMethodPayload;
  ApplicationAuthMethodUpdateInput: ApplicationAuthMethodUpdateInput;
  ApplicationAuthProtocolUrls: ApplicationAuthProtocolUrls;
  ApplicationAuthProvider: ApplicationAuthProvider;
  ApplicationAuthProviderCallbackUrl: ApplicationAuthProviderCallbackUrl;
  ApplicationAuthProviderConfigureInput: ApplicationAuthProviderConfigureInput;
  ApplicationAuthProviderCredentialsDeleteInput: ApplicationAuthProviderCredentialsDeleteInput;
  ApplicationAuthProviderCredentialsRotateInput: ApplicationAuthProviderCredentialsRotateInput;
  ApplicationAuthProviderPayload: ApplicationAuthProviderPayload;
  ApplicationAuthProviderUpdateInput: ApplicationAuthProviderUpdateInput;
  ApplicationAuthProviderValidateInput: ApplicationAuthProviderValidateInput;
  ApplicationAuthProviderValidation: ApplicationAuthProviderValidation;
  ApplicationAuthProviderValidationPayload: ApplicationAuthProviderValidationPayload;
  ApplicationAuthRealmEnabledSetInput: ApplicationAuthRealmEnabledSetInput;
  ApplicationAuthTrustedOrigin: ApplicationAuthTrustedOrigin;
  ApplicationAuthUpdateInput: ApplicationAuthUpdateInput;
  ApplicationAuthUpdatePayload: ApplicationAuthUpdatePayload;
  ApplicationConnection: ApplicationConnection;
  ApplicationCreateInput: ApplicationCreateInput;
  ApplicationCreatePayload: ApplicationCreatePayload;
  ApplicationEdge: ApplicationEdge;
  ApplicationMutation: ApplicationMutation;
  ApplicationOAuthClient: ApplicationOAuthClient;
  ApplicationOAuthClientArchiveInput: ApplicationOAuthClientArchiveInput;
  ApplicationOAuthClientConnection: ApplicationOAuthClientConnection;
  ApplicationOAuthClientCreateInput: ApplicationOAuthClientCreateInput;
  ApplicationOAuthClientCreatePayload: ApplicationOAuthClientCreatePayload;
  ApplicationOAuthClientEdge: ApplicationOAuthClientEdge;
  ApplicationOAuthClientEnabledSetInput: ApplicationOAuthClientEnabledSetInput;
  ApplicationOAuthClientOrderByInput: ApplicationOAuthClientOrderByInput;
  ApplicationOAuthClientPayload: ApplicationOAuthClientPayload;
  ApplicationOAuthClientSecretRotateInput: ApplicationOAuthClientSecretRotateInput;
  ApplicationOAuthClientSecretRotatePayload: ApplicationOAuthClientSecretRotatePayload;
  ApplicationOAuthClientSkipConsentSetInput: ApplicationOAuthClientSkipConsentSetInput;
  ApplicationOAuthClientUpdateInput: ApplicationOAuthClientUpdateInput;
  ApplicationOAuthClientWhereInput: ApplicationOAuthClientWhereInput;
  ApplicationOrderByInput: ApplicationOrderByInput;
  ApplicationQuery: ApplicationQuery;
  ApplicationUpdateInput: ApplicationUpdateInput;
  ApplicationUpdatePayload: ApplicationUpdatePayload;
  ApplicationUser: ApplicationUser;
  ApplicationUserAccountUnlinkInput: ApplicationUserAccountUnlinkInput;
  ApplicationUserAccountUnlinkPayload: ApplicationUserAccountUnlinkPayload;
  ApplicationUserConnection: ApplicationUserConnection;
  ApplicationUserEdge: ApplicationUserEdge;
  ApplicationUserLinkedAccount: ApplicationUserLinkedAccount;
  ApplicationUserOrderByInput: ApplicationUserOrderByInput;
  ApplicationUserPayload: ApplicationUserPayload;
  ApplicationUserSecurityMetadata: ApplicationUserSecurityMetadata;
  ApplicationUserSessionsRevokeAllInput: ApplicationUserSessionsRevokeAllInput;
  ApplicationUserSessionsRevokeAllPayload: ApplicationUserSessionsRevokeAllPayload;
  ApplicationUserStatusSetInput: ApplicationUserStatusSetInput;
  ApplicationUserWhereInput: ApplicationUserWhereInput;
  ApplicationWhereInput: ApplicationWhereInput;
  AuthMutation: AuthMutation;
  AuthTokenPayload: AuthTokenPayload;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: AuthorizePayload;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  Email: Scalars['Email']['output'];
  File: File;
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  JSON: Scalars['JSON']['output'];
  Member: Member;
  MemberAccessRemoveInput: MemberAccessRemoveInput;
  MemberAccessRemovePayload: MemberAccessRemovePayload;
  MemberInviteInput: MemberInviteInput;
  MemberInvitePayload: MemberInvitePayload;
  MemberRemoveInput: MemberRemoveInput;
  MemberRemovePayload: MemberRemovePayload;
  MemberRoleChangeInput: MemberRoleChangeInput;
  MemberRoleChangePayload: MemberRoleChangePayload;
  Membership: Membership;
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  Organization: Organization;
  OrganizationConnection: OrganizationConnection;
  OrganizationCreateInput: OrganizationCreateInput;
  OrganizationCreatePayload: OrganizationCreatePayload;
  OrganizationDeletePayload: OrganizationDeletePayload;
  OrganizationEdge: OrganizationEdge;
  OrganizationMutation: OrganizationMutation;
  OrganizationOrderByInput: OrganizationOrderByInput;
  OrganizationQuery: OrganizationQuery;
  OrganizationUpdateInput: OrganizationUpdateInput;
  OrganizationUpdatePayload: OrganizationUpdatePayload;
  OrganizationWhereInput: OrganizationWhereInput;
  OwnershipTransferInput: OwnershipTransferInput;
  OwnershipTransferPayload: OwnershipTransferPayload;
  PageInfo: PageInfo;
  Query: {};
  ResourceDefinition: ResourceDefinition;
  Role: Role;
  RoleAssignment: RoleAssignment;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: RoleCreatePayload;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: RoleDeletePayload;
  RoleMutation: RoleMutation;
  RolePermission: RolePermission;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: RoleUpdatePayload;
  Session: Session;
  SessionRevokeAllPayload: SessionRevokeAllPayload;
  SessionRevokeInput: SessionRevokeInput;
  SessionRevokePayload: SessionRevokePayload;
  StringFilter: StringFilter;
  User: User;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
  UserMutation: UserMutation;
  UserQuery: UserQuery;
  UserSignInInput: UserSignInInput;
  UserSignInPayload: UserSignInPayload;
  UserSignOutInput: UserSignOutInput;
  UserSignOutPayload: UserSignOutPayload;
  UserSignUpInput: UserSignUpInput;
  UserSignUpPayload: UserSignUpPayload;
  UserTokenRefreshInput: UserTokenRefreshInput;
  UserTokenRefreshPayload: UserTokenRefreshPayload;
  UserUpdateEmailInput: UserUpdateEmailInput;
  UserUpdateEmailPayload: UserUpdateEmailPayload;
  UserUpdatePasswordInput: UserUpdatePasswordInput;
  UserUpdatePasswordPayload: UserUpdatePasswordPayload;
  UserUpdateProfileInput: UserUpdateProfileInput;
  UserUpdateProfilePayload: UserUpdateProfilePayload;
}>;

export type ApplicationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Application'] = ResolversParentTypes['Application']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Application']>, { __typename: 'Application' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  auth?: Resolver<ResolversTypes['ApplicationAuthConfiguration'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  oauthClient?: Resolver<Maybe<ResolversTypes['ApplicationOAuthClient']>, ParentType, ContextType, RequireFields<ApplicationOauthClientArgs, 'clientId'>>;
  oauthClients?: Resolver<ResolversTypes['ApplicationOAuthClientConnection'], ParentType, ContextType, Partial<ApplicationOauthClientsArgs>>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ApplicationLifecycleStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['ApplicationUser']>, ParentType, ContextType, RequireFields<ApplicationUserArgs, 'id'>>;
  users?: Resolver<ResolversTypes['ApplicationUserConnection'], ParentType, ContextType, Partial<ApplicationUsersArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationArchivePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationArchivePayload'] = ResolversParentTypes['ApplicationArchivePayload']> = ResolversObject<{
  application?: Resolver<Maybe<ResolversTypes['Application']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthBrandingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthBranding'] = ResolversParentTypes['ApplicationAuthBranding']> = ResolversObject<{
  backgroundColor?: Resolver<Maybe<ResolversTypes['ApplicationAuthBackgroundColor']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  headline?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  logoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  primaryColor?: Resolver<Maybe<ResolversTypes['ApplicationAuthPrimaryColor']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthConfiguration'] = ResolversParentTypes['ApplicationAuthConfiguration']> = ResolversObject<{
  accessTokenTtlSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  applicationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  authMethod?: Resolver<ResolversTypes['ApplicationAuthMethod'], ParentType, ContextType, RequireFields<ApplicationAuthConfigurationAuthMethodArgs, 'id'>>;
  authMethods?: Resolver<Array<ResolversTypes['ApplicationAuthMethod']>, ParentType, ContextType>;
  branding?: Resolver<ResolversTypes['ApplicationAuthBranding'], ParentType, ContextType>;
  consentMode?: Resolver<ResolversTypes['ApplicationConsentMode'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['LocaleCode'], ParentType, ContextType>;
  emailDelivery?: Resolver<ResolversTypes['ApplicationAuthEmailDeliveryConfiguration'], ParentType, ContextType>;
  emailVerificationRequired?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  idTokenTtlSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  protocolUrls?: Resolver<ResolversTypes['ApplicationAuthProtocolUrls'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['ApplicationAuthProvider'], ParentType, ContextType, RequireFields<ApplicationAuthConfigurationProviderArgs, 'name'>>;
  providers?: Resolver<Array<ResolversTypes['ApplicationAuthProvider']>, ParentType, ContextType>;
  realmEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refreshTokenTtlSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  registrationMode?: Resolver<ResolversTypes['ApplicationRegistrationMode'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sessionTtlSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  supportedLocales?: Resolver<Array<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  trustedOrigins?: Resolver<Array<ResolversTypes['ApplicationAuthTrustedOrigin']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthEmailDeliveryConfigurationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthEmailDeliveryConfiguration'] = ResolversParentTypes['ApplicationAuthEmailDeliveryConfiguration']> = ResolversObject<{
  configured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  emailOtpSignInTemplateId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailVerificationTemplateId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  passwordResetTemplateId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  senderIdentity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  transportProfile?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthMethodResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthMethod'] = ResolversParentTypes['ApplicationAuthMethod']> = ResolversObject<{
  availableCapabilities?: Resolver<Array<ResolversTypes['ApplicationAuthMethodCapability']>, ParentType, ContextType>;
  configured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enabledCapabilities?: Resolver<Array<ResolversTypes['ApplicationAuthMethodCapability']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ApplicationAuthMethodId'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ApplicationAuthMethodIdScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['ApplicationAuthMethodId'], any> {
  name: 'ApplicationAuthMethodId';
}

export type ApplicationAuthMethodPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthMethodPayload'] = ResolversParentTypes['ApplicationAuthMethodPayload']> = ResolversObject<{
  authMethod?: Resolver<Maybe<ResolversTypes['ApplicationAuthMethod']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProtocolUrlsResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProtocolUrls'] = ResolversParentTypes['ApplicationAuthProtocolUrls']> = ResolversObject<{
  authorizationUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  endSessionUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  issuer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  jwksUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  oauthAuthorizationServerMetadataUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  oidcDiscoveryUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerCallbackUrls?: Resolver<Array<ResolversTypes['ApplicationAuthProviderCallbackUrl']>, ParentType, ContextType>;
  revocationUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tokenUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProviderResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProvider'] = ResolversParentTypes['ApplicationAuthProvider']> = ResolversObject<{
  applicationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  callbackUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  configured?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maskedClientId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['ApplicationAuthProviderName'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scopes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  supported?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedBy?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProviderCallbackUrlResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProviderCallbackUrl'] = ResolversParentTypes['ApplicationAuthProviderCallbackUrl']> = ResolversObject<{
  provider?: Resolver<ResolversTypes['ApplicationAuthProviderName'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProviderPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProviderPayload'] = ResolversParentTypes['ApplicationAuthProviderPayload']> = ResolversObject<{
  provider?: Resolver<Maybe<ResolversTypes['ApplicationAuthProvider']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProviderValidationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProviderValidation'] = ResolversParentTypes['ApplicationAuthProviderValidation']> = ResolversObject<{
  checkedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['ApplicationAuthProviderName'], ParentType, ContextType>;
  reasonCode?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ApplicationAuthProviderValidationStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthProviderValidationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthProviderValidationPayload'] = ResolversParentTypes['ApplicationAuthProviderValidationPayload']> = ResolversObject<{
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  validation?: Resolver<Maybe<ResolversTypes['ApplicationAuthProviderValidation']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthTrustedOriginResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthTrustedOrigin'] = ResolversParentTypes['ApplicationAuthTrustedOrigin']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationAuthUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationAuthUpdatePayload'] = ResolversParentTypes['ApplicationAuthUpdatePayload']> = ResolversObject<{
  configuration?: Resolver<Maybe<ResolversTypes['ApplicationAuthConfiguration']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationConnection'] = ResolversParentTypes['ApplicationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ApplicationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationCreatePayload'] = ResolversParentTypes['ApplicationCreatePayload']> = ResolversObject<{
  application?: Resolver<Maybe<ResolversTypes['Application']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationEdge'] = ResolversParentTypes['ApplicationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Application'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationMutation'] = ResolversParentTypes['ApplicationMutation']> = ResolversObject<{
  applicationArchive?: Resolver<ResolversTypes['ApplicationArchivePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationArchiveArgs, 'input'>>;
  applicationAuthMethodUpdate?: Resolver<ResolversTypes['ApplicationAuthMethodPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthMethodUpdateArgs, 'input'>>;
  applicationAuthProviderConfigure?: Resolver<ResolversTypes['ApplicationAuthProviderPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthProviderConfigureArgs, 'input'>>;
  applicationAuthProviderCredentialsDelete?: Resolver<ResolversTypes['ApplicationAuthProviderPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthProviderCredentialsDeleteArgs, 'input'>>;
  applicationAuthProviderCredentialsRotate?: Resolver<ResolversTypes['ApplicationAuthProviderPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthProviderCredentialsRotateArgs, 'input'>>;
  applicationAuthProviderUpdate?: Resolver<ResolversTypes['ApplicationAuthProviderPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthProviderUpdateArgs, 'input'>>;
  applicationAuthProviderValidate?: Resolver<ResolversTypes['ApplicationAuthProviderValidationPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthProviderValidateArgs, 'input'>>;
  applicationAuthRealmEnabledSet?: Resolver<ResolversTypes['ApplicationAuthUpdatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthRealmEnabledSetArgs, 'input'>>;
  applicationAuthUpdate?: Resolver<ResolversTypes['ApplicationAuthUpdatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationAuthUpdateArgs, 'input'>>;
  applicationCreate?: Resolver<ResolversTypes['ApplicationCreatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationCreateArgs, 'input'>>;
  applicationOAuthClientArchive?: Resolver<ResolversTypes['ApplicationOAuthClientPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientArchiveArgs, 'input'>>;
  applicationOAuthClientCreate?: Resolver<ResolversTypes['ApplicationOAuthClientCreatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientCreateArgs, 'input'>>;
  applicationOAuthClientEnabledSet?: Resolver<ResolversTypes['ApplicationOAuthClientPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientEnabledSetArgs, 'input'>>;
  applicationOAuthClientSecretRotate?: Resolver<ResolversTypes['ApplicationOAuthClientSecretRotatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientSecretRotateArgs, 'input'>>;
  applicationOAuthClientSkipConsentSet?: Resolver<ResolversTypes['ApplicationOAuthClientPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientSkipConsentSetArgs, 'input'>>;
  applicationOAuthClientUpdate?: Resolver<ResolversTypes['ApplicationOAuthClientPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationOAuthClientUpdateArgs, 'input'>>;
  applicationUpdate?: Resolver<ResolversTypes['ApplicationUpdatePayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationUpdateArgs, 'input'>>;
  applicationUserAccountUnlink?: Resolver<ResolversTypes['ApplicationUserAccountUnlinkPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationUserAccountUnlinkArgs, 'input'>>;
  applicationUserBlock?: Resolver<ResolversTypes['ApplicationUserPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationUserBlockArgs, 'input'>>;
  applicationUserSessionsRevokeAll?: Resolver<ResolversTypes['ApplicationUserSessionsRevokeAllPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationUserSessionsRevokeAllArgs, 'input'>>;
  applicationUserUnblock?: Resolver<ResolversTypes['ApplicationUserPayload'], ParentType, ContextType, RequireFields<ApplicationMutationApplicationUserUnblockArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClient'] = ResolversParentTypes['ApplicationOAuthClient']> = ResolversObject<{
  applicationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  archived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  clientType?: Resolver<ResolversTypes['ApplicationOAuthClientType'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  disabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableEndSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  environment?: Resolver<ResolversTypes['ApplicationOAuthClientEnvironment'], ParentType, ContextType>;
  grantTypes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  postLogoutRedirectUris?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  protocolPolicyVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  redirectUris?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  requirePkce?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  resources?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  responseTypes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skipConsent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  tokenEndpointAuthMethod?: Resolver<ResolversTypes['ApplicationOAuthTokenEndpointAuthMethod'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  updatedBy?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClientConnection'] = ResolversParentTypes['ApplicationOAuthClientConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ApplicationOAuthClientEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClientCreatePayload'] = ResolversParentTypes['ApplicationOAuthClientCreatePayload']> = ResolversObject<{
  client?: Resolver<Maybe<ResolversTypes['ApplicationOAuthClient']>, ParentType, ContextType>;
  clientSecret?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClientEdge'] = ResolversParentTypes['ApplicationOAuthClientEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ApplicationOAuthClient'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClientPayload'] = ResolversParentTypes['ApplicationOAuthClientPayload']> = ResolversObject<{
  client?: Resolver<Maybe<ResolversTypes['ApplicationOAuthClient']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationOAuthClientSecretRotatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationOAuthClientSecretRotatePayload'] = ResolversParentTypes['ApplicationOAuthClientSecretRotatePayload']> = ResolversObject<{
  client?: Resolver<Maybe<ResolversTypes['ApplicationOAuthClient']>, ParentType, ContextType>;
  clientSecret?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationQuery'] = ResolversParentTypes['ApplicationQuery']> = ResolversObject<{
  application?: Resolver<Maybe<ResolversTypes['Application']>, ParentType, ContextType, RequireFields<ApplicationQueryApplicationArgs, 'id' | 'organizationId'>>;
  applications?: Resolver<ResolversTypes['ApplicationConnection'], ParentType, ContextType, RequireFields<ApplicationQueryApplicationsArgs, 'organizationId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUpdatePayload'] = ResolversParentTypes['ApplicationUpdatePayload']> = ResolversObject<{
  application?: Resolver<Maybe<ResolversTypes['Application']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUser'] = ResolversParentTypes['ApplicationUser']> = ResolversObject<{
  applicationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  linkedAccounts?: Resolver<Array<ResolversTypes['ApplicationUserLinkedAccount']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  security?: Resolver<ResolversTypes['ApplicationUserSecurityMetadata'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ApplicationUserStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserAccountUnlinkPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserAccountUnlinkPayload'] = ResolversParentTypes['ApplicationUserAccountUnlinkPayload']> = ResolversObject<{
  unlinkedAccountId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['ApplicationUser']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserConnection'] = ResolversParentTypes['ApplicationUserConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['ApplicationUserEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserEdge'] = ResolversParentTypes['ApplicationUserEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['ApplicationUser'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserLinkedAccountResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserLinkedAccount'] = ResolversParentTypes['ApplicationUserLinkedAccount']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isOnlyLoginMethod?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserPayload'] = ResolversParentTypes['ApplicationUserPayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['ApplicationUser']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserSecurityMetadataResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserSecurityMetadata'] = ResolversParentTypes['ApplicationUserSecurityMetadata']> = ResolversObject<{
  activeSessionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  hasPasswordLogin?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  linkedAccountCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApplicationUserSessionsRevokeAllPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApplicationUserSessionsRevokeAllPayload'] = ResolversParentTypes['ApplicationUserSessionsRevokeAllPayload']> = ResolversObject<{
  revokedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['ApplicationUser']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthMutation'] = ResolversParentTypes['AuthMutation']> = ResolversObject<{
  signIn?: Resolver<ResolversTypes['UserSignInPayload'], ParentType, ContextType, RequireFields<AuthMutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['UserSignOutPayload'], ParentType, ContextType, RequireFields<AuthMutationSignOutArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['UserSignUpPayload'], ParentType, ContextType, RequireFields<AuthMutationSignUpArgs, 'input'>>;
  tokenRefresh?: Resolver<ResolversTypes['UserTokenRefreshPayload'], ParentType, ContextType, RequireFields<AuthMutationTokenRefreshArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthTokenPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthTokenPayload'] = ResolversParentTypes['AuthTokenPayload']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthorizePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthorizePayload'] = ResolversParentTypes['AuthorizePayload']> = ResolversObject<{
  allowed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  deniedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type FileResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;

  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Member'] = ResolversParentTypes['Member']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Member']>, { __typename: 'Member' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  grantedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  grantedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isOwner?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MemberAccessRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MemberAccessRemovePayload'] = ResolversParentTypes['MemberAccessRemovePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MemberInvitePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MemberInvitePayload'] = ResolversParentTypes['MemberInvitePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MemberRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MemberRemovePayload'] = ResolversParentTypes['MemberRemovePayload']> = ResolversObject<{
  removedMemberId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MemberRoleChangePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['MemberRoleChangePayload'] = ResolversParentTypes['MemberRoleChangePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MembershipResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Membership'] = ResolversParentTypes['Membership']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Membership']>, { __typename: 'Membership' } & GraphQLRecursivePick<ParentType, {"domain":true,"organizationId":true}>, ContextType>;
  availableResources?: Resolver<Maybe<Array<ResolversTypes['ResourceDefinition']>>, ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['Member']>, ParentType, ContextType>;
  organizationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  applicationMutation?: Resolver<ResolversTypes['ApplicationMutation'], ParentType, ContextType>;
  authMutation?: Resolver<ResolversTypes['AuthMutation'], ParentType, ContextType>;
  organizationMutation?: Resolver<ResolversTypes['OrganizationMutation'], ParentType, ContextType>;
  roleMutation?: Resolver<ResolversTypes['RoleMutation'], ParentType, ContextType>;
  userMutation?: Resolver<ResolversTypes['UserMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Application' | 'ApplicationOAuthClient' | 'ApplicationUser' | 'ApplicationUserLinkedAccount' | 'Organization', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Organization']>, { __typename: 'Organization' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  applications?: Resolver<ResolversTypes['ApplicationConnection'], ParentType, ContextType, Partial<OrganizationApplicationsArgs>>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  logo?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  membership?: Resolver<ResolversTypes['Membership'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationConnection'] = ResolversParentTypes['OrganizationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['OrganizationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationCreatePayload'] = ResolversParentTypes['OrganizationCreatePayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationDeletePayload'] = ResolversParentTypes['OrganizationDeletePayload']> = ResolversObject<{
  deletedOrganizationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationEdge'] = ResolversParentTypes['OrganizationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationMutation'] = ResolversParentTypes['OrganizationMutation']> = ResolversObject<{
  memberAccessRemove?: Resolver<ResolversTypes['MemberAccessRemovePayload'], ParentType, ContextType, RequireFields<OrganizationMutationMemberAccessRemoveArgs, 'input'>>;
  memberInvite?: Resolver<ResolversTypes['MemberInvitePayload'], ParentType, ContextType, RequireFields<OrganizationMutationMemberInviteArgs, 'input'>>;
  memberRemove?: Resolver<ResolversTypes['MemberRemovePayload'], ParentType, ContextType, RequireFields<OrganizationMutationMemberRemoveArgs, 'input'>>;
  memberRoleChange?: Resolver<ResolversTypes['MemberRoleChangePayload'], ParentType, ContextType, RequireFields<OrganizationMutationMemberRoleChangeArgs, 'input'>>;
  organizationCreate?: Resolver<ResolversTypes['OrganizationCreatePayload'], ParentType, ContextType, RequireFields<OrganizationMutationOrganizationCreateArgs, 'input'>>;
  organizationDelete?: Resolver<ResolversTypes['OrganizationDeletePayload'], ParentType, ContextType, RequireFields<OrganizationMutationOrganizationDeleteArgs, 'id'>>;
  organizationUpdate?: Resolver<ResolversTypes['OrganizationUpdatePayload'], ParentType, ContextType, RequireFields<OrganizationMutationOrganizationUpdateArgs, 'input'>>;
  ownershipTransfer?: Resolver<ResolversTypes['OwnershipTransferPayload'], ParentType, ContextType, RequireFields<OrganizationMutationOwnershipTransferArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationQuery'] = ResolversParentTypes['OrganizationQuery']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, Partial<OrganizationQueryOrganizationArgs>>;
  organizations?: Resolver<ResolversTypes['OrganizationConnection'], ParentType, ContextType, Partial<OrganizationQueryOrganizationsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationUpdatePayload'] = ResolversParentTypes['OrganizationUpdatePayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OwnershipTransferPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OwnershipTransferPayload'] = ResolversParentTypes['OwnershipTransferPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  applicationQuery?: Resolver<ResolversTypes['ApplicationQuery'], ParentType, ContextType>;
  organizationQuery?: Resolver<ResolversTypes['OrganizationQuery'], ParentType, ContextType>;
  userQuery?: Resolver<ResolversTypes['UserQuery'], ParentType, ContextType>;
}>;

export type ResourceDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ResourceDefinition'] = ResolversParentTypes['ResourceDefinition']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Role']>, { __typename: 'Role' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['RolePermission']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleCreatePayload'] = ResolversParentTypes['RoleCreatePayload']> = ResolversObject<{
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleDeletePayload'] = ResolversParentTypes['RoleDeletePayload']> = ResolversObject<{
  deletedRoleName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleMutation'] = ResolversParentTypes['RoleMutation']> = ResolversObject<{
  roleCreate?: Resolver<ResolversTypes['RoleCreatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleCreateArgs, 'input'>>;
  roleDelete?: Resolver<ResolversTypes['RoleDeletePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleDeleteArgs, 'input'>>;
  roleUpdate?: Resolver<ResolversTypes['RoleUpdatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RolePermission'] = ResolversParentTypes['RolePermission']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleUpdatePayload'] = ResolversParentTypes['RoleUpdatePayload']> = ResolversObject<{
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SessionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ipAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isCurrent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SessionRevokeAllPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SessionRevokeAllPayload'] = ResolversParentTypes['SessionRevokeAllPayload']> = ResolversObject<{
  revokedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SessionRevokePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SessionRevokePayload'] = ResolversParentTypes['SessionRevokePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['User']>, { __typename: 'User' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  avatar?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAdmin?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isDeleted?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isForbidden?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isProfileComplete?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserMutation'] = ResolversParentTypes['UserMutation']> = ResolversObject<{
  sessionRevoke?: Resolver<ResolversTypes['SessionRevokePayload'], ParentType, ContextType, RequireFields<UserMutationSessionRevokeArgs, 'input'>>;
  sessionRevokeAll?: Resolver<ResolversTypes['SessionRevokeAllPayload'], ParentType, ContextType>;
  userUpdateEmail?: Resolver<ResolversTypes['UserUpdateEmailPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateEmailArgs, 'input'>>;
  userUpdatePassword?: Resolver<ResolversTypes['UserUpdatePasswordPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdatePasswordArgs, 'input'>>;
  userUpdateProfile?: Resolver<ResolversTypes['UserUpdateProfilePayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateProfileArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserQuery'] = ResolversParentTypes['UserQuery']> = ResolversObject<{
  authorize?: Resolver<ResolversTypes['AuthorizePayload'], ParentType, ContextType, RequireFields<UserQueryAuthorizeArgs, 'input'>>;
  current?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  mySessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignInPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignInPayload'] = ResolversParentTypes['UserSignInPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignOutPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignOutPayload'] = ResolversParentTypes['UserSignOutPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignUpPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignUpPayload'] = ResolversParentTypes['UserSignUpPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTokenRefreshPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserTokenRefreshPayload'] = ResolversParentTypes['UserTokenRefreshPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthTokenPayload']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateEmailPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateEmailPayload'] = ResolversParentTypes['UserUpdateEmailPayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdatePasswordPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdatePasswordPayload'] = ResolversParentTypes['UserUpdatePasswordPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserUpdateProfilePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdateProfilePayload'] = ResolversParentTypes['UserUpdateProfilePayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  Application?: ApplicationResolvers<ContextType>;
  ApplicationArchivePayload?: ApplicationArchivePayloadResolvers<ContextType>;
  ApplicationAuthBranding?: ApplicationAuthBrandingResolvers<ContextType>;
  ApplicationAuthConfiguration?: ApplicationAuthConfigurationResolvers<ContextType>;
  ApplicationAuthEmailDeliveryConfiguration?: ApplicationAuthEmailDeliveryConfigurationResolvers<ContextType>;
  ApplicationAuthMethod?: ApplicationAuthMethodResolvers<ContextType>;
  ApplicationAuthMethodId?: GraphQLScalarType;
  ApplicationAuthMethodPayload?: ApplicationAuthMethodPayloadResolvers<ContextType>;
  ApplicationAuthProtocolUrls?: ApplicationAuthProtocolUrlsResolvers<ContextType>;
  ApplicationAuthProvider?: ApplicationAuthProviderResolvers<ContextType>;
  ApplicationAuthProviderCallbackUrl?: ApplicationAuthProviderCallbackUrlResolvers<ContextType>;
  ApplicationAuthProviderPayload?: ApplicationAuthProviderPayloadResolvers<ContextType>;
  ApplicationAuthProviderValidation?: ApplicationAuthProviderValidationResolvers<ContextType>;
  ApplicationAuthProviderValidationPayload?: ApplicationAuthProviderValidationPayloadResolvers<ContextType>;
  ApplicationAuthTrustedOrigin?: ApplicationAuthTrustedOriginResolvers<ContextType>;
  ApplicationAuthUpdatePayload?: ApplicationAuthUpdatePayloadResolvers<ContextType>;
  ApplicationConnection?: ApplicationConnectionResolvers<ContextType>;
  ApplicationCreatePayload?: ApplicationCreatePayloadResolvers<ContextType>;
  ApplicationEdge?: ApplicationEdgeResolvers<ContextType>;
  ApplicationMutation?: ApplicationMutationResolvers<ContextType>;
  ApplicationOAuthClient?: ApplicationOAuthClientResolvers<ContextType>;
  ApplicationOAuthClientConnection?: ApplicationOAuthClientConnectionResolvers<ContextType>;
  ApplicationOAuthClientCreatePayload?: ApplicationOAuthClientCreatePayloadResolvers<ContextType>;
  ApplicationOAuthClientEdge?: ApplicationOAuthClientEdgeResolvers<ContextType>;
  ApplicationOAuthClientPayload?: ApplicationOAuthClientPayloadResolvers<ContextType>;
  ApplicationOAuthClientSecretRotatePayload?: ApplicationOAuthClientSecretRotatePayloadResolvers<ContextType>;
  ApplicationQuery?: ApplicationQueryResolvers<ContextType>;
  ApplicationUpdatePayload?: ApplicationUpdatePayloadResolvers<ContextType>;
  ApplicationUser?: ApplicationUserResolvers<ContextType>;
  ApplicationUserAccountUnlinkPayload?: ApplicationUserAccountUnlinkPayloadResolvers<ContextType>;
  ApplicationUserConnection?: ApplicationUserConnectionResolvers<ContextType>;
  ApplicationUserEdge?: ApplicationUserEdgeResolvers<ContextType>;
  ApplicationUserLinkedAccount?: ApplicationUserLinkedAccountResolvers<ContextType>;
  ApplicationUserPayload?: ApplicationUserPayloadResolvers<ContextType>;
  ApplicationUserSecurityMetadata?: ApplicationUserSecurityMetadataResolvers<ContextType>;
  ApplicationUserSessionsRevokeAllPayload?: ApplicationUserSessionsRevokeAllPayloadResolvers<ContextType>;
  AuthMutation?: AuthMutationResolvers<ContextType>;
  AuthTokenPayload?: AuthTokenPayloadResolvers<ContextType>;
  AuthorizePayload?: AuthorizePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  File?: FileResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Member?: MemberResolvers<ContextType>;
  MemberAccessRemovePayload?: MemberAccessRemovePayloadResolvers<ContextType>;
  MemberInvitePayload?: MemberInvitePayloadResolvers<ContextType>;
  MemberRemovePayload?: MemberRemovePayloadResolvers<ContextType>;
  MemberRoleChangePayload?: MemberRoleChangePayloadResolvers<ContextType>;
  Membership?: MembershipResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationConnection?: OrganizationConnectionResolvers<ContextType>;
  OrganizationCreatePayload?: OrganizationCreatePayloadResolvers<ContextType>;
  OrganizationDeletePayload?: OrganizationDeletePayloadResolvers<ContextType>;
  OrganizationEdge?: OrganizationEdgeResolvers<ContextType>;
  OrganizationMutation?: OrganizationMutationResolvers<ContextType>;
  OrganizationQuery?: OrganizationQueryResolvers<ContextType>;
  OrganizationUpdatePayload?: OrganizationUpdatePayloadResolvers<ContextType>;
  OwnershipTransferPayload?: OwnershipTransferPayloadResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  ResourceDefinition?: ResourceDefinitionResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleCreatePayload?: RoleCreatePayloadResolvers<ContextType>;
  RoleDeletePayload?: RoleDeletePayloadResolvers<ContextType>;
  RoleMutation?: RoleMutationResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  RoleUpdatePayload?: RoleUpdatePayloadResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  SessionRevokeAllPayload?: SessionRevokeAllPayloadResolvers<ContextType>;
  SessionRevokePayload?: SessionRevokePayloadResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  UserMutation?: UserMutationResolvers<ContextType>;
  UserQuery?: UserQueryResolvers<ContextType>;
  UserSignInPayload?: UserSignInPayloadResolvers<ContextType>;
  UserSignOutPayload?: UserSignOutPayloadResolvers<ContextType>;
  UserSignUpPayload?: UserSignUpPayloadResolvers<ContextType>;
  UserTokenRefreshPayload?: UserTokenRefreshPayloadResolvers<ContextType>;
  UserUpdateEmailPayload?: UserUpdateEmailPayloadResolvers<ContextType>;
  UserUpdatePasswordPayload?: UserUpdatePasswordPayloadResolvers<ContextType>;
  UserUpdateProfilePayload?: UserUpdateProfilePayloadResolvers<ContextType>;
}>;

