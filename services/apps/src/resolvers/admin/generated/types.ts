import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ServiceContext } from '../../../context/types.js';
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
  /** An ISO 8601 date-time string. */
  DateTime: { input: string; output: string; }
  /** An arbitrary JSON value. */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** How a capability is selected for execution. */
export enum AppCapabilityAssignmentMode {
  Resource = 'RESOURCE',
  Store = 'STORE'
}

/** State of the route assignment used to resolve a capability. */
export enum AppCapabilityAssignmentStatus {
  Active = 'ACTIVE',
  Disabled = 'DISABLED'
}

/** A concrete capability route contributed by an installed App. */
export type AppCapabilityBinding = Node & {
  __typename?: 'AppCapabilityBinding';
  assignmentMode: AppCapabilityAssignmentMode;
  assignmentStatus: Maybe<AppCapabilityAssignmentStatus>;
  capability: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  operation: Scalars['String']['output'];
  precedence: Maybe<Scalars['Int']['output']>;
  status: AppCapabilityBindingStatus;
  targetAction: Scalars['String']['output'];
  targetAppCode: Scalars['String']['output'];
};

/** State of a capability route owned by an installation. */
export enum AppCapabilityBindingStatus {
  Active = 'ACTIVE',
  Deprecated = 'DEPRECATED',
  Inactive = 'INACTIVE',
  Maintenance = 'MAINTENANCE'
}

/** A capability declared by an App manifest. */
export type AppCapabilityDefinition = {
  __typename?: 'AppCapabilityDefinition';
  assignmentMode: AppCapabilityAssignmentMode;
  key: Scalars['String']['output'];
  operations: Array<AppCapabilityOperation>;
};

/** One operation exposed by an App capability. */
export type AppCapabilityOperation = {
  __typename?: 'AppCapabilityOperation';
  /** The App action that implements the operation. */
  action: Scalars['String']['output'];
  /** The operation name used by platform callers. */
  name: Scalars['String']['output'];
};

/** Input for changing installation configuration without a lifecycle update. */
export type AppConfigureInput = {
  configuration: Scalars['JSON']['input'];
  /** Replaces the granted scopes when provided. */
  grantedScopes?: InputMaybe<Array<Scalars['String']['input']>>;
  installationId: Scalars['ID']['input'];
};

/** Payload returned after changing installation configuration. */
export type AppConfigurePayload = {
  __typename?: 'AppConfigurePayload';
  installation: Maybe<AppInstallation>;
  userErrors: Array<GenericUserError>;
};

/** A Relay connection of bundled Apps. */
export type AppConnection = {
  __typename?: 'AppConnection';
  edges: Array<AppEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** A bundled App that can be installed in a store. */
export type AppDefinition = {
  __typename?: 'AppDefinition';
  /** Capabilities declared by the bundled manifest. */
  capabilities: Array<AppCapabilityDefinition>;
  /** Stable manifest code used to identify the App. */
  code: Scalars['String']['output'];
  /** Human-readable App description. */
  description: Scalars['String']['output'];
  /** Human-readable App name. */
  displayName: Scalars['String']['output'];
  /** GraphQL surfaces declared by the bundled manifest. */
  graphql: AppGraphQlSurfaces;
  /** App icon or logo used by Admin surfaces. */
  icon: AppIcon;
  /** The current store installation, when one exists. */
  installation: Maybe<AppInstallation>;
  /** Whether this App has a non-terminal installation in the current store. */
  installed: Scalars['Boolean']['output'];
  /** Permissions requested by the bundled manifest. */
  permissions: Array<AppPermission>;
  /** Current runtime health, when the runtime can be checked. */
  runtimeHealth: AppRuntimeHealth;
  /** Current process-local runtime state. */
  runtimeStatus: AppRuntimeStatus;
  /** Bundled semantic version. */
  version: Scalars['String']['output'];
};

/** An edge in a bundled App connection. */
export type AppEdge = {
  __typename?: 'AppEdge';
  cursor: Scalars['String']['output'];
  node: AppDefinition;
};

/** GraphQL surfaces contributed by an App. */
export type AppGraphQlSurfaces = {
  __typename?: 'AppGraphQLSurfaces';
  admin: Scalars['Boolean']['output'];
  storefront: Scalars['Boolean']['output'];
};

/** Visual identity declared by an App manifest. */
export type AppIcon = {
  __typename?: 'AppIcon';
  /** Accessible alternative text. */
  alt: Scalars['String']['output'];
  /** Same-origin or trusted image URL. */
  url: Scalars['String']['output'];
};

/** Input for installing a bundled App in the current store. */
export type AppInstallInput = {
  appCode: Scalars['String']['input'];
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  grantedScopes?: InputMaybe<Array<Scalars['String']['input']>>;
  secrets?: InputMaybe<Array<AppSecretInput>>;
};

/** A bundled App installed in the current store. */
export type AppInstallation = Node & {
  __typename?: 'AppInstallation';
  appCode: Scalars['String']['output'];
  capabilities: Array<AppCapabilityBinding>;
  configuration: Scalars['JSON']['output'];
  configurationVersion: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  healthStatus: AppInstallationHealthStatus;
  id: Scalars['ID']['output'];
  installedAt: Maybe<Scalars['DateTime']['output']>;
  installedByUserId: Maybe<Scalars['ID']['output']>;
  installedVersion: Maybe<Scalars['String']['output']>;
  lastError: Maybe<AppInstallationError>;
  lifecycleOperations: AppLifecycleOperationConnection;
  manifestHash: Maybe<Scalars['String']['output']>;
  manifestSnapshots: AppManifestSnapshotConnection;
  scopes: Array<AppInstallationScope>;
  status: AppInstallationStatus;
  suspendedAt: Maybe<Scalars['DateTime']['output']>;
  targetVersion: Maybe<Scalars['String']['output']>;
  uninstalledAt: Maybe<Scalars['DateTime']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};


/** A bundled App installed in the current store. */
export type AppInstallationLifecycleOperationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A bundled App installed in the current store. */
export type AppInstallationManifestSnapshotsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for a lifecycle action on an existing installation. */
export type AppInstallationActionInput = {
  installationId: Scalars['ID']['input'];
};

/** The latest persisted App installation failure. */
export type AppInstallationError = {
  __typename?: 'AppInstallationError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

/** Persisted health state of an App installation. */
export enum AppInstallationHealthStatus {
  Degraded = 'DEGRADED',
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY',
  Unknown = 'UNKNOWN'
}

/** A permission grant recorded for an App installation. */
export type AppInstallationScope = {
  __typename?: 'AppInstallationScope';
  granted: Scalars['Boolean']['output'];
  grantedAt: Scalars['DateTime']['output'];
  revokedAt: Maybe<Scalars['DateTime']['output']>;
  scope: Scalars['String']['output'];
};

/** Lifecycle state of an App installation. */
export enum AppInstallationStatus {
  Active = 'ACTIVE',
  Installing = 'INSTALLING',
  InstallFailed = 'INSTALL_FAILED',
  PendingConsent = 'PENDING_CONSENT',
  Resuming = 'RESUMING',
  Suspended = 'SUSPENDED',
  Suspending = 'SUSPENDING',
  Uninstalled = 'UNINSTALLED',
  Uninstalling = 'UNINSTALLING',
  UninstallFailed = 'UNINSTALL_FAILED',
  UpdateFailed = 'UPDATE_FAILED',
  Updating = 'UPDATING'
}

/** Actor that initiated an App lifecycle operation. */
export enum AppLifecycleActorType {
  Service = 'SERVICE',
  System = 'SYSTEM',
  User = 'USER'
}

/** A durable App lifecycle operation. */
export type AppLifecycleOperation = Node & {
  __typename?: 'AppLifecycleOperation';
  actorId: Maybe<Scalars['String']['output']>;
  actorType: AppLifecycleActorType;
  completedAt: Maybe<Scalars['DateTime']['output']>;
  correlationId: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  error: Maybe<AppLifecycleOperationError>;
  id: Scalars['ID']['output'];
  installation: AppInstallation;
  previousInstallationStatus: Maybe<AppInstallationStatus>;
  startedAt: Maybe<Scalars['DateTime']['output']>;
  status: AppLifecycleOperationStatus;
  targetVersion: Scalars['String']['output'];
  type: AppLifecycleOperationType;
  updatedAt: Scalars['DateTime']['output'];
  workflowId: Scalars['String']['output'];
};

/** A Relay connection of lifecycle operations. */
export type AppLifecycleOperationConnection = {
  __typename?: 'AppLifecycleOperationConnection';
  edges: Array<AppLifecycleOperationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An edge in an App lifecycle operation connection. */
export type AppLifecycleOperationEdge = {
  __typename?: 'AppLifecycleOperationEdge';
  cursor: Scalars['String']['output'];
  node: AppLifecycleOperation;
};

/** Failure recorded for an App lifecycle operation. */
export type AppLifecycleOperationError = {
  __typename?: 'AppLifecycleOperationError';
  code: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

/** Execution state of an App lifecycle operation. */
export enum AppLifecycleOperationStatus {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Succeeded = 'SUCCEEDED'
}

/** Type of an App lifecycle operation. */
export enum AppLifecycleOperationType {
  Install = 'INSTALL',
  Resume = 'RESUME',
  Suspend = 'SUSPEND',
  Uninstall = 'UNINSTALL',
  Update = 'UPDATE'
}

/** Payload returned after accepting a lifecycle operation. */
export type AppLifecyclePayload = {
  __typename?: 'AppLifecyclePayload';
  /** Whether an earlier request with the same client mutation ID was reused. */
  duplicate: Scalars['Boolean']['output'];
  installation: Maybe<AppInstallation>;
  operation: Maybe<AppLifecycleOperation>;
  userErrors: Array<GenericUserError>;
};

/** An immutable manifest snapshot used by a lifecycle operation. */
export type AppManifestSnapshot = Node & {
  __typename?: 'AppManifestSnapshot';
  appCode: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  manifest: Scalars['JSON']['output'];
  manifestHash: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

/** A Relay connection of App manifest snapshots. */
export type AppManifestSnapshotConnection = {
  __typename?: 'AppManifestSnapshotConnection';
  edges: Array<AppManifestSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

/** An edge in an App manifest snapshot connection. */
export type AppManifestSnapshotEdge = {
  __typename?: 'AppManifestSnapshotEdge';
  cursor: Scalars['String']['output'];
  node: AppManifestSnapshot;
};

/** Ordering configuration for App */
export type AppOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: AppOrderField;
};

/** Fields available for sorting App */
export enum AppOrderField {
  /** Sort by capabilities */
  Capabilities = 'capabilities',
  /** Sort by code */
  Code = 'code',
  /** Sort by displayName */
  DisplayName = 'displayName',
  /** Sort by installed */
  Installed = 'installed',
  /** Sort by status */
  Status = 'status',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by version */
  Version = 'version'
}

/** A permission requested by an App manifest. */
export type AppPermission = {
  __typename?: 'AppPermission';
  /** Whether the permission is granted to the current installation. */
  granted: Scalars['Boolean']['output'];
  scope: Scalars['String']['output'];
};

/** The health check result for a bundled App runtime. */
export type AppRuntimeHealth = {
  __typename?: 'AppRuntimeHealth';
  message: Maybe<Scalars['String']['output']>;
  status: AppRuntimeHealthStatus;
};

/** Health reported by a ready App runtime. */
export enum AppRuntimeHealthStatus {
  Degraded = 'DEGRADED',
  Healthy = 'HEALTHY',
  Unhealthy = 'UNHEALTHY'
}

/** Runtime state of a bundled App. */
export enum AppRuntimeStatus {
  Failed = 'FAILED',
  Ready = 'READY',
  Registered = 'REGISTERED',
  Starting = 'STARTING',
  Stopped = 'STOPPED'
}

/** A write-only secret supplied during install or update. */
export type AppSecretInput = {
  name: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

/** Input for updating an App installation. */
export type AppUpdateInput = {
  configuration?: InputMaybe<Scalars['JSON']['input']>;
  /** Replaces the granted scopes when provided. */
  grantedScopes?: InputMaybe<Array<Scalars['String']['input']>>;
  installationId: Scalars['ID']['input'];
  /** Sets or rotates the named secrets without returning their values. */
  secrets?: InputMaybe<Array<AppSecretInput>>;
};

/** Filter conditions for App */
export type AppWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<AppWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<AppWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<AppWhereInput>>;
  /** Filter by capabilities */
  capabilities?: InputMaybe<StringFilter>;
  /** Filter by code */
  code?: InputMaybe<StringFilter>;
  /** Filter by displayName */
  displayName?: InputMaybe<StringFilter>;
  /** Filter by installed */
  installed?: InputMaybe<BooleanFilter>;
  /** Filter by status */
  status?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by version */
  version?: InputMaybe<StringFilter>;
};

export type AppsMutation = {
  __typename?: 'AppsMutation';
  /** Update installation configuration and granted scopes. */
  appConfigure: AppConfigurePayload;
  /** Install a bundled App in the current store. */
  appInstall: AppLifecyclePayload;
  /** Resume a suspended App installation. */
  appResume: AppLifecyclePayload;
  /** Temporarily disable an active App installation. */
  appSuspend: AppLifecyclePayload;
  /** Uninstall an App from the current store. */
  appUninstall: AppLifecyclePayload;
  /** Update an installed App to the bundled target version. */
  appUpdate: AppLifecyclePayload;
};


export type AppsMutationAppConfigureArgs = {
  input: AppConfigureInput;
};


export type AppsMutationAppInstallArgs = {
  input: AppInstallInput;
};


export type AppsMutationAppResumeArgs = {
  input: AppInstallationActionInput;
};


export type AppsMutationAppSuspendArgs = {
  input: AppInstallationActionInput;
};


export type AppsMutationAppUninstallArgs = {
  input: AppInstallationActionInput;
};


export type AppsMutationAppUpdateArgs = {
  input: AppUpdateInput;
};

export type AppsQuery = {
  __typename?: 'AppsQuery';
  /** Get a bundled App definition by its stable code. */
  appDefinition: Maybe<AppDefinition>;
  /** Get an App installation by its global ID. */
  appInstallation: Maybe<AppInstallation>;
  /** Get a lifecycle operation by its global ID. */
  appLifecycleOperation: Maybe<AppLifecycleOperation>;
  /** List bundled Apps and their installation state for the current store. */
  apps: AppConnection;
};


export type AppsQueryAppDefinitionArgs = {
  code: Scalars['String']['input'];
};


export type AppsQueryAppInstallationArgs = {
  id: Scalars['ID']['input'];
};


export type AppsQueryAppLifecycleOperationArgs = {
  id: Scalars['ID']['input'];
};


export type AppsQueryAppsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<AppOrderByInput>>;
  where?: InputMaybe<AppWhereInput>;
};

/** Filter operators for Boolean fields */
export type BooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
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
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['DateTime']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than (after) */
  _gt?: InputMaybe<Scalars['DateTime']['input']>;
  /** Greater than or equal (on or after) */
  _gte?: InputMaybe<Scalars['DateTime']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['DateTime']['input']>>;
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
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['DateTime']['input']>>;
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

/** Filter operators for Float fields */
export type FloatFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Float']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Float']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Float']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Float']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Float']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A generic user-facing mutation error. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
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

/** Filter operators for Int fields */
export type IntFilter = {
  /** Between range (inclusive) */
  _between?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Equals */
  _eq?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than */
  _gt?: InputMaybe<Scalars['Int']['input']>;
  /** Greater than or equal */
  _gte?: InputMaybe<Scalars['Int']['input']>;
  /** In array */
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Less than */
  _lt?: InputMaybe<Scalars['Int']['input']>;
  /** Less than or equal */
  _lte?: InputMaybe<Scalars['Int']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Int']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['Int']['input']>>;
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

export type Mutation = {
  __typename?: 'Mutation';
  /** Apps control-plane mutations for the current store. */
  appsMutation: AppsMutation;
};

/** An object with a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Pagination metadata for a Relay connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** The cursor of the last edge in the current page. */
  endCursor: Maybe<Scalars['String']['output']>;
  /** Whether more items exist after the current page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether more items exist before the current page. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** The cursor of the first edge in the current page. */
  startCursor: Maybe<Scalars['String']['output']>;
};

/** Direction in which a price adjustment changes the base price. */
export enum PriceAdjustmentOperation {
  /** Subtract the calculated value from the base price. */
  Decrease = 'DECREASE',
  /** Add the calculated value to the base price. */
  Increase = 'INCREASE'
}

/** Representation used to calculate a price adjustment. */
export enum PriceAdjustmentValueType {
  /** Use a monetary value expressed in minor currency units. */
  FixedAmount = 'FIXED_AMOUNT',
  /** Calculate the value from basis points where 10000 equals 100%. */
  Percentage = 'PERCENTAGE'
}

export type Query = {
  __typename?: 'Query';
  /** Apps control-plane queries for the current store. */
  appsQuery: AppsQuery;
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
  /** Ends with (case-sensitive) */
  _endsWith?: InputMaybe<Scalars['String']['input']>;
  /** Ends with (case-insensitive) */
  _endsWithi?: InputMaybe<Scalars['String']['input']>;
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
  /** Does not contain substring (case-sensitive) */
  _notContains?: InputMaybe<Scalars['String']['input']>;
  /** Does not contain substring (case-insensitive) */
  _notContainsi?: InputMaybe<Scalars['String']['input']>;
  /** Not in array */
  _notIn?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Starts with (case-sensitive) */
  _startsWith?: InputMaybe<Scalars['String']['input']>;
  /** Starts with (case-insensitive) */
  _startsWithi?: InputMaybe<Scalars['String']['input']>;
};

/** A user-facing mutation error. */
export type UserError = {
  /** A stable machine-readable error code. */
  code: Maybe<Scalars['String']['output']>;
  /** The input path associated with the error. */
  field: Maybe<Array<Scalars['String']['output']>>;
  /** A human-readable error message. */
  message: Scalars['String']['output'];
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
  Node: ( AppCapabilityBinding ) | ( AppInstallation ) | ( AppLifecycleOperation ) | ( AppManifestSnapshot );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AppCapabilityAssignmentMode: AppCapabilityAssignmentMode;
  AppCapabilityAssignmentStatus: AppCapabilityAssignmentStatus;
  AppCapabilityBinding: ResolverTypeWrapper<AppCapabilityBinding>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AppCapabilityBindingStatus: AppCapabilityBindingStatus;
  AppCapabilityDefinition: ResolverTypeWrapper<AppCapabilityDefinition>;
  AppCapabilityOperation: ResolverTypeWrapper<AppCapabilityOperation>;
  AppConfigureInput: AppConfigureInput;
  AppConfigurePayload: ResolverTypeWrapper<AppConfigurePayload>;
  AppConnection: ResolverTypeWrapper<AppConnection>;
  AppDefinition: ResolverTypeWrapper<AppDefinition>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  AppEdge: ResolverTypeWrapper<AppEdge>;
  AppGraphQLSurfaces: ResolverTypeWrapper<AppGraphQlSurfaces>;
  AppIcon: ResolverTypeWrapper<AppIcon>;
  AppInstallInput: AppInstallInput;
  AppInstallation: ResolverTypeWrapper<AppInstallation>;
  AppInstallationActionInput: AppInstallationActionInput;
  AppInstallationError: ResolverTypeWrapper<AppInstallationError>;
  AppInstallationHealthStatus: AppInstallationHealthStatus;
  AppInstallationScope: ResolverTypeWrapper<AppInstallationScope>;
  AppInstallationStatus: AppInstallationStatus;
  AppLifecycleActorType: AppLifecycleActorType;
  AppLifecycleOperation: ResolverTypeWrapper<AppLifecycleOperation>;
  AppLifecycleOperationConnection: ResolverTypeWrapper<AppLifecycleOperationConnection>;
  AppLifecycleOperationEdge: ResolverTypeWrapper<AppLifecycleOperationEdge>;
  AppLifecycleOperationError: ResolverTypeWrapper<AppLifecycleOperationError>;
  AppLifecycleOperationStatus: AppLifecycleOperationStatus;
  AppLifecycleOperationType: AppLifecycleOperationType;
  AppLifecyclePayload: ResolverTypeWrapper<AppLifecyclePayload>;
  AppManifestSnapshot: ResolverTypeWrapper<AppManifestSnapshot>;
  AppManifestSnapshotConnection: ResolverTypeWrapper<AppManifestSnapshotConnection>;
  AppManifestSnapshotEdge: ResolverTypeWrapper<AppManifestSnapshotEdge>;
  AppOrderByInput: AppOrderByInput;
  AppOrderField: AppOrderField;
  AppPermission: ResolverTypeWrapper<AppPermission>;
  AppRuntimeHealth: ResolverTypeWrapper<AppRuntimeHealth>;
  AppRuntimeHealthStatus: AppRuntimeHealthStatus;
  AppRuntimeStatus: AppRuntimeStatus;
  AppSecretInput: AppSecretInput;
  AppUpdateInput: AppUpdateInput;
  AppWhereInput: AppWhereInput;
  AppsMutation: ResolverTypeWrapper<AppsMutation>;
  AppsQuery: ResolverTypeWrapper<AppsQuery>;
  BooleanFilter: BooleanFilter;
  CurrencyCode: CurrencyCode;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  DimensionUnit: DimensionUnit;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PriceAdjustmentOperation: PriceAdjustmentOperation;
  PriceAdjustmentValueType: PriceAdjustmentValueType;
  Query: ResolverTypeWrapper<{}>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AppCapabilityBinding: AppCapabilityBinding;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  AppCapabilityDefinition: AppCapabilityDefinition;
  AppCapabilityOperation: AppCapabilityOperation;
  AppConfigureInput: AppConfigureInput;
  AppConfigurePayload: AppConfigurePayload;
  AppConnection: AppConnection;
  AppDefinition: AppDefinition;
  Boolean: Scalars['Boolean']['output'];
  AppEdge: AppEdge;
  AppGraphQLSurfaces: AppGraphQlSurfaces;
  AppIcon: AppIcon;
  AppInstallInput: AppInstallInput;
  AppInstallation: AppInstallation;
  AppInstallationActionInput: AppInstallationActionInput;
  AppInstallationError: AppInstallationError;
  AppInstallationScope: AppInstallationScope;
  AppLifecycleOperation: AppLifecycleOperation;
  AppLifecycleOperationConnection: AppLifecycleOperationConnection;
  AppLifecycleOperationEdge: AppLifecycleOperationEdge;
  AppLifecycleOperationError: AppLifecycleOperationError;
  AppLifecyclePayload: AppLifecyclePayload;
  AppManifestSnapshot: AppManifestSnapshot;
  AppManifestSnapshotConnection: AppManifestSnapshotConnection;
  AppManifestSnapshotEdge: AppManifestSnapshotEdge;
  AppOrderByInput: AppOrderByInput;
  AppPermission: AppPermission;
  AppRuntimeHealth: AppRuntimeHealth;
  AppSecretInput: AppSecretInput;
  AppUpdateInput: AppUpdateInput;
  AppWhereInput: AppWhereInput;
  AppsMutation: AppsMutation;
  AppsQuery: AppsQuery;
  BooleanFilter: BooleanFilter;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  StringFilter: StringFilter;
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export type AppCapabilityBindingResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppCapabilityBinding'] = ResolversParentTypes['AppCapabilityBinding']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['AppCapabilityBinding']>, { __typename: 'AppCapabilityBinding' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  assignmentMode?: Resolver<ResolversTypes['AppCapabilityAssignmentMode'], ParentType, ContextType>;
  assignmentStatus?: Resolver<Maybe<ResolversTypes['AppCapabilityAssignmentStatus']>, ParentType, ContextType>;
  capability?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operation?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  precedence?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AppCapabilityBindingStatus'], ParentType, ContextType>;
  targetAction?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetAppCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppCapabilityDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppCapabilityDefinition'] = ResolversParentTypes['AppCapabilityDefinition']> = ResolversObject<{
  assignmentMode?: Resolver<ResolversTypes['AppCapabilityAssignmentMode'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  operations?: Resolver<Array<ResolversTypes['AppCapabilityOperation']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppCapabilityOperationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppCapabilityOperation'] = ResolversParentTypes['AppCapabilityOperation']> = ResolversObject<{
  action?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppConfigurePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppConfigurePayload'] = ResolversParentTypes['AppConfigurePayload']> = ResolversObject<{
  installation?: Resolver<Maybe<ResolversTypes['AppInstallation']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppConnection'] = ResolversParentTypes['AppConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AppEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppDefinition'] = ResolversParentTypes['AppDefinition']> = ResolversObject<{
  capabilities?: Resolver<Array<ResolversTypes['AppCapabilityDefinition']>, ParentType, ContextType>;
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  graphql?: Resolver<ResolversTypes['AppGraphQLSurfaces'], ParentType, ContextType>;
  icon?: Resolver<ResolversTypes['AppIcon'], ParentType, ContextType>;
  installation?: Resolver<Maybe<ResolversTypes['AppInstallation']>, ParentType, ContextType>;
  installed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['AppPermission']>, ParentType, ContextType>;
  runtimeHealth?: Resolver<ResolversTypes['AppRuntimeHealth'], ParentType, ContextType>;
  runtimeStatus?: Resolver<ResolversTypes['AppRuntimeStatus'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppEdge'] = ResolversParentTypes['AppEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['AppDefinition'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppGraphQlSurfacesResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppGraphQLSurfaces'] = ResolversParentTypes['AppGraphQLSurfaces']> = ResolversObject<{
  admin?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  storefront?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppIconResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppIcon'] = ResolversParentTypes['AppIcon']> = ResolversObject<{
  alt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppInstallationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppInstallation'] = ResolversParentTypes['AppInstallation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['AppInstallation']>, { __typename: 'AppInstallation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  appCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  capabilities?: Resolver<Array<ResolversTypes['AppCapabilityBinding']>, ParentType, ContextType>;
  configuration?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  configurationVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  healthStatus?: Resolver<ResolversTypes['AppInstallationHealthStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  installedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  installedByUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  installedVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['AppInstallationError']>, ParentType, ContextType>;
  lifecycleOperations?: Resolver<ResolversTypes['AppLifecycleOperationConnection'], ParentType, ContextType, Partial<AppInstallationLifecycleOperationsArgs>>;
  manifestHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  manifestSnapshots?: Resolver<ResolversTypes['AppManifestSnapshotConnection'], ParentType, ContextType, Partial<AppInstallationManifestSnapshotsArgs>>;
  scopes?: Resolver<Array<ResolversTypes['AppInstallationScope']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AppInstallationStatus'], ParentType, ContextType>;
  suspendedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  targetVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  uninstalledAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppInstallationErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppInstallationError'] = ResolversParentTypes['AppInstallationError']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppInstallationScopeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppInstallationScope'] = ResolversParentTypes['AppInstallationScope']> = ResolversObject<{
  granted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  grantedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  scope?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppLifecycleOperationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppLifecycleOperation'] = ResolversParentTypes['AppLifecycleOperation']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['AppLifecycleOperation']>, { __typename: 'AppLifecycleOperation' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  actorId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  actorType?: Resolver<ResolversTypes['AppLifecycleActorType'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  correlationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['AppLifecycleOperationError']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  installation?: Resolver<ResolversTypes['AppInstallation'], ParentType, ContextType>;
  previousInstallationStatus?: Resolver<Maybe<ResolversTypes['AppInstallationStatus']>, ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AppLifecycleOperationStatus'], ParentType, ContextType>;
  targetVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AppLifecycleOperationType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workflowId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppLifecycleOperationConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppLifecycleOperationConnection'] = ResolversParentTypes['AppLifecycleOperationConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AppLifecycleOperationEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppLifecycleOperationEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppLifecycleOperationEdge'] = ResolversParentTypes['AppLifecycleOperationEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['AppLifecycleOperation'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppLifecycleOperationErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppLifecycleOperationError'] = ResolversParentTypes['AppLifecycleOperationError']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppLifecyclePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppLifecyclePayload'] = ResolversParentTypes['AppLifecyclePayload']> = ResolversObject<{
  duplicate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  installation?: Resolver<Maybe<ResolversTypes['AppInstallation']>, ParentType, ContextType>;
  operation?: Resolver<Maybe<ResolversTypes['AppLifecycleOperation']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppManifestSnapshotResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppManifestSnapshot'] = ResolversParentTypes['AppManifestSnapshot']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['AppManifestSnapshot']>, { __typename: 'AppManifestSnapshot' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  appCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  manifest?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  manifestHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppManifestSnapshotConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppManifestSnapshotConnection'] = ResolversParentTypes['AppManifestSnapshotConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AppManifestSnapshotEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppManifestSnapshotEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppManifestSnapshotEdge'] = ResolversParentTypes['AppManifestSnapshotEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['AppManifestSnapshot'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppPermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppPermission'] = ResolversParentTypes['AppPermission']> = ResolversObject<{
  granted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  scope?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppRuntimeHealthResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppRuntimeHealth'] = ResolversParentTypes['AppRuntimeHealth']> = ResolversObject<{
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AppRuntimeHealthStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppsMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppsMutation'] = ResolversParentTypes['AppsMutation']> = ResolversObject<{
  appConfigure?: Resolver<ResolversTypes['AppConfigurePayload'], ParentType, ContextType, RequireFields<AppsMutationAppConfigureArgs, 'input'>>;
  appInstall?: Resolver<ResolversTypes['AppLifecyclePayload'], ParentType, ContextType, RequireFields<AppsMutationAppInstallArgs, 'input'>>;
  appResume?: Resolver<ResolversTypes['AppLifecyclePayload'], ParentType, ContextType, RequireFields<AppsMutationAppResumeArgs, 'input'>>;
  appSuspend?: Resolver<ResolversTypes['AppLifecyclePayload'], ParentType, ContextType, RequireFields<AppsMutationAppSuspendArgs, 'input'>>;
  appUninstall?: Resolver<ResolversTypes['AppLifecyclePayload'], ParentType, ContextType, RequireFields<AppsMutationAppUninstallArgs, 'input'>>;
  appUpdate?: Resolver<ResolversTypes['AppLifecyclePayload'], ParentType, ContextType, RequireFields<AppsMutationAppUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppsQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AppsQuery'] = ResolversParentTypes['AppsQuery']> = ResolversObject<{
  appDefinition?: Resolver<Maybe<ResolversTypes['AppDefinition']>, ParentType, ContextType, RequireFields<AppsQueryAppDefinitionArgs, 'code'>>;
  appInstallation?: Resolver<Maybe<ResolversTypes['AppInstallation']>, ParentType, ContextType, RequireFields<AppsQueryAppInstallationArgs, 'id'>>;
  appLifecycleOperation?: Resolver<Maybe<ResolversTypes['AppLifecycleOperation']>, ParentType, ContextType, RequireFields<AppsQueryAppLifecycleOperationArgs, 'id'>>;
  apps?: Resolver<ResolversTypes['AppConnection'], ParentType, ContextType, Partial<AppsQueryAppsArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  appsMutation?: Resolver<ResolversTypes['AppsMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AppCapabilityBinding' | 'AppInstallation' | 'AppLifecycleOperation' | 'AppManifestSnapshot', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  appsQuery?: Resolver<ResolversTypes['AppsQuery'], ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  AppCapabilityBinding?: AppCapabilityBindingResolvers<ContextType>;
  AppCapabilityDefinition?: AppCapabilityDefinitionResolvers<ContextType>;
  AppCapabilityOperation?: AppCapabilityOperationResolvers<ContextType>;
  AppConfigurePayload?: AppConfigurePayloadResolvers<ContextType>;
  AppConnection?: AppConnectionResolvers<ContextType>;
  AppDefinition?: AppDefinitionResolvers<ContextType>;
  AppEdge?: AppEdgeResolvers<ContextType>;
  AppGraphQLSurfaces?: AppGraphQlSurfacesResolvers<ContextType>;
  AppIcon?: AppIconResolvers<ContextType>;
  AppInstallation?: AppInstallationResolvers<ContextType>;
  AppInstallationError?: AppInstallationErrorResolvers<ContextType>;
  AppInstallationScope?: AppInstallationScopeResolvers<ContextType>;
  AppLifecycleOperation?: AppLifecycleOperationResolvers<ContextType>;
  AppLifecycleOperationConnection?: AppLifecycleOperationConnectionResolvers<ContextType>;
  AppLifecycleOperationEdge?: AppLifecycleOperationEdgeResolvers<ContextType>;
  AppLifecycleOperationError?: AppLifecycleOperationErrorResolvers<ContextType>;
  AppLifecyclePayload?: AppLifecyclePayloadResolvers<ContextType>;
  AppManifestSnapshot?: AppManifestSnapshotResolvers<ContextType>;
  AppManifestSnapshotConnection?: AppManifestSnapshotConnectionResolvers<ContextType>;
  AppManifestSnapshotEdge?: AppManifestSnapshotEdgeResolvers<ContextType>;
  AppPermission?: AppPermissionResolvers<ContextType>;
  AppRuntimeHealth?: AppRuntimeHealthResolvers<ContextType>;
  AppsMutation?: AppsMutationResolvers<ContextType>;
  AppsQuery?: AppsQueryResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
}>;

