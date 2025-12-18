export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: object; output: object; }
  Timestamp: { input: string; output: string; }
  Upload: { input: File; output: File; }
};

export type ApiApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['Timestamp']['output'];
  createdBy: ApiUser;
  dueDate?: Maybe<Scalars['Timestamp']['output']>;
  id: Scalars['ID']['output'];
  isBanned: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['Timestamp']['output']>;
  name: Scalars['String']['output'];
};

export type ApiApp = {
  __typename?: 'App';
  code: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
};

export type ApiAppsMutation = {
  __typename?: 'AppsMutation';
  /** Install app */
  install: Scalars['Boolean']['output'];
  /** Uninstall app */
  uninstall: Scalars['Boolean']['output'];
};


export type ApiAppsMutationInstallArgs = {
  code: Scalars['String']['input'];
};


export type ApiAppsMutationUninstallArgs = {
  code: Scalars['String']['input'];
};

export type ApiAppsQuery = {
  __typename?: 'AppsQuery';
  /** Get list of available apps for installation */
  apps: Array<ApiApp>;
  /** Get list of installed apps */
  installedApps: Array<ApiInstalledApp>;
};

/** Filter operators for Boolean fields */
export type ApiBooleanFilter = {
  /** Equals */
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is null */
  _is?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is not null */
  _isNot?: InputMaybe<Scalars['Boolean']['input']>;
  /** Not equals */
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A bucket represents an S3 storage bucket for a project. */
export type ApiBucket = {
  __typename?: 'Bucket';
  /** S3 bucket name. */
  bucketName: Scalars['String']['output'];
  /** The date and time when the bucket was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the bucket. */
  id: Scalars['ID']['output'];
  /** Priority for bucket selection. */
  priority: Scalars['Int']['output'];
  /** AWS region. */
  region: Scalars['String']['output'];
  /** Bucket status (active, archived, etc). */
  status: Scalars['String']['output'];
  /** The date and time when the bucket was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Input for creating a bucket. */
export type ApiBucketCreateInput = {
  /** S3 bucket name (must be unique). */
  bucketName: Scalars['String']['input'];
  /** Custom endpoint URL (for S3-compatible storage). */
  endpointUrl?: InputMaybe<Scalars['String']['input']>;
  /** Priority for bucket selection (default: 0). */
  priority?: InputMaybe<Scalars['Int']['input']>;
  /** AWS region (default: us-east-1). */
  region?: InputMaybe<Scalars['String']['input']>;
  /** Bucket status (default: active). */
  status?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for bucket creation. */
export type ApiBucketCreatePayload = {
  __typename?: 'BucketCreatePayload';
  /** The created bucket. */
  bucket?: Maybe<ApiBucket>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiCollectionMeta = {
  __typename?: 'CollectionMeta';
  count: Scalars['Int']['output'];
  page: Scalars['Int']['output'];
  pageCount: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ApiCreateApiKeyInput = {
  dueDate?: InputMaybe<Scalars['Timestamp']['input']>;
  name: Scalars['String']['input'];
};

export type ApiCreateCustomerInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  isVerified: Scalars['Boolean']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCreateLocaleInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type ApiCreateProfileInput = {
  firstName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

export type ApiCreateProjectInput = {
  country: Scalars['String']['input'];
  currency: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  locales: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  status: ProjectStatus;
  timezone: Scalars['String']['input'];
};

export type ApiCurrency = {
  __typename?: 'Currency';
  code: Scalars['String']['output'];
  decimalPlaces: Scalars['Int']['output'];
  decimalSeparator: Scalars['String']['output'];
  exchangeRate: Scalars['Float']['output'];
  isActive: Scalars['Boolean']['output'];
  symbolLeft: Scalars['String']['output'];
  symbolRight: Scalars['String']['output'];
  thousandsSeparator: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

/** Supported currency codes. */
export enum CurrencyCode {
  Eur = 'EUR',
  Uah = 'UAH',
  Usd = 'USD'
}

export type ApiCustomer = {
  __typename?: 'Customer';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isBlocked?: Maybe<Scalars['Boolean']['output']>;
  isVerified: Scalars['Boolean']['output'];
  language?: Maybe<Scalars['String']['output']>;
  lastName: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Timestamp']['output'];
};

export type ApiCustomerMutation = {
  __typename?: 'CustomerMutation';
  archive: Scalars['Boolean']['output'];
  archiveMany: Array<Scalars['Boolean']['output']>;
  create: Scalars['ID']['output'];
  delete: Scalars['Boolean']['output'];
  deleteMany: Array<Scalars['Boolean']['output']>;
  update: Scalars['Boolean']['output'];
};


export type ApiCustomerMutationArchiveArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCustomerMutationArchiveManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCustomerMutationCreateArgs = {
  input: ApiCreateCustomerInput;
};


export type ApiCustomerMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiCustomerMutationDeleteManyArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiCustomerMutationUpdateArgs = {
  input: ApiUpdateCustomerInput;
};

export type ApiCustomerQuery = {
  __typename?: 'CustomerQuery';
  findMany: ApiCustomersOutput;
  findOne?: Maybe<ApiCustomer>;
};


export type ApiCustomerQueryFindManyArgs = {
  input?: InputMaybe<ApiCustomersInput>;
};


export type ApiCustomerQueryFindOneArgs = {
  id: Scalars['ID']['input'];
};

export type ApiCustomersInput = {
  page: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  sortField?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};

export type ApiCustomersOutput = {
  __typename?: 'CustomersOutput';
  data: Array<ApiCustomer>;
  meta: ApiCollectionMeta;
};

/** Filter operators for DateTime fields */
export type ApiDateTimeFilter = {
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

/** Product description in multiple formats. */
export type ApiDescription = {
  __typename?: 'Description';
  /** HTML description. */
  html: Scalars['String']['output'];
  /** EditorJS JSON description. */
  json: Scalars['JSON']['output'];
  /** Plain text description. */
  text: Scalars['String']['output'];
};

/** Input for product description (all fields required). */
export type ApiDescriptionInput = {
  /** HTML description. */
  html: Scalars['String']['input'];
  /** EditorJS JSON description. */
  json: Scalars['JSON']['input'];
  /** Plain text description. */
  text: Scalars['String']['input'];
};

/** Input for setting dimensions (in millimeters). */
export type ApiDimensionsInput = {
  /** Height in millimeters. */
  height: Scalars['Int']['input'];
  /** Length in millimeters. */
  length: Scalars['Int']['input'];
  /** Width in millimeters. */
  width: Scalars['Int']['input'];
};

/** External media data (YouTube, Vimeo, etc). */
export type ApiExternalMediaData = {
  __typename?: 'ExternalMediaData';
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars['String']['output'];
  /** Provider-specific metadata. */
  providerMeta?: Maybe<Scalars['JSON']['output']>;
};

/** A file represents a stored media asset. */
export type ApiFile = ApiNode & {
  __typename?: 'File';
  /** Alt text for accessibility. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the file was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Image/video dimensions (null if not applicable). */
  dimensions?: Maybe<ApiMediaDimensions>;
  /** Duration in milliseconds (for video/audio). */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** File extension. */
  ext?: Maybe<Scalars['String']['output']>;
  /** External media data (for YouTube, Vimeo, etc). */
  externalData?: Maybe<ApiExternalMediaData>;
  /** The globally unique ID of the file. */
  id: Scalars['ID']['output'];
  /** Whether the file has been processed. */
  isProcessed: Scalars['Boolean']['output'];
  /** Additional metadata. */
  meta?: Maybe<Scalars['JSON']['output']>;
  /** MIME type. */
  mimeType?: Maybe<Scalars['String']['output']>;
  /** Original filename from upload. */
  originalName?: Maybe<Scalars['String']['output']>;
  /** Provider type (s3, youtube, vimeo, url, local). */
  provider: FileProvider;
  /** S3-specific data (only for S3 provider). */
  s3Data?: Maybe<ApiS3ObjectData>;
  /** Size in bytes (0 for external providers). */
  sizeBytes: Scalars['BigInt']['output'];
  /** Source URL (for files uploaded from URL). */
  sourceUrl?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Public URL to access file. */
  url: Scalars['String']['output'];
};

/** Input for creating an external media file (YouTube, Vimeo, etc). */
export type ApiFileCreateExternalInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Duration in milliseconds. */
  durationMs?: InputMaybe<Scalars['Int']['input']>;
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars['String']['input'];
  /** Image height in pixels. */
  height?: InputMaybe<Scalars['Int']['input']>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** Title/name of the media. */
  originalName?: InputMaybe<Scalars['String']['input']>;
  /** Provider type. */
  provider: FileProvider;
  /** Provider-specific metadata. */
  providerMeta?: InputMaybe<Scalars['JSON']['input']>;
  /** Thumbnail URL. */
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  /** Public URL to access the media. */
  url: Scalars['String']['input'];
  /** Image width in pixels. */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Payload for external file creation. */
export type ApiFileCreateExternalPayload = {
  __typename?: 'FileCreateExternalPayload';
  /** The created file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a file. */
export type ApiFileDeleteInput = {
  /** The ID of the file to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the file (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for file deletion. */
export type ApiFileDeletePayload = {
  __typename?: 'FileDeletePayload';
  /** The ID of the deleted file. */
  deletedFileId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Provider type for files. */
export enum FileProvider {
  /** Local file storage */
  Local = 'LOCAL',
  /** File stored in S3 */
  S3 = 'S3',
  /** External URL */
  Url = 'URL',
  /** Vimeo video */
  Vimeo = 'VIMEO',
  /** YouTube video */
  Youtube = 'YOUTUBE'
}

/** Input for updating a file. */
export type ApiFileUpdateInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** The file ID. */
  id: Scalars['ID']['input'];
  /** Additional metadata. */
  meta?: InputMaybe<Scalars['JSON']['input']>;
  /** Original name. */
  originalName?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for file update. */
export type ApiFileUpdatePayload = {
  __typename?: 'FileUpdatePayload';
  /** The updated file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for uploading a file from URL. */
export type ApiFileUploadFromUrlInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** URL to fetch the file from. */
  sourceUrl: Scalars['String']['input'];
};

/** Input for uploading a file via multipart form data. */
export type ApiFileUploadMultipartInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** The file to upload. */
  file: Scalars['Upload']['input'];
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for file upload. */
export type ApiFileUploadPayload = {
  __typename?: 'FileUploadPayload';
  /** The uploaded file. */
  file?: Maybe<ApiFile>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Filter operators for Float fields */
export type ApiFloatFilter = {
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

export type ApiForgotPasswordInput = {
  email: Scalars['String']['input'];
};

/** A generic user error type for mutation responses. */
export type ApiGenericUserError = ApiUserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Filter operators for ID fields */
export type ApiIdFilter = {
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

export type ApiInstalledApp = {
  __typename?: 'InstalledApp';
  appCode: Scalars['String']['output'];
  baseURL: Scalars['String']['output'];
  domain: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  projectID: Scalars['String']['output'];
};

/** Filter operators for Int fields */
export type ApiIntFilter = {
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

export type ApiInventoryMutation = {
  __typename?: 'InventoryMutation';
  productCreate: ApiProductCreatePayload;
  productDelete: ApiProductDeletePayload;
  productFeatureCreate: ApiProductFeatureCreatePayload;
  productFeatureDelete: ApiProductFeatureDeletePayload;
  productFeatureUpdate: ApiProductFeatureUpdatePayload;
  productOptionCreate: ApiProductOptionCreatePayload;
  productOptionDelete: ApiProductOptionDeletePayload;
  productOptionUpdate: ApiProductOptionUpdatePayload;
  productPublish: ApiProductPublishPayload;
  productUnpublish: ApiProductUnpublishPayload;
  productUpdate: ApiProductUpdatePayload;
  variantCreate: ApiVariantCreatePayload;
  variantDelete: ApiVariantDeletePayload;
  variantSetCost: ApiVariantSetCostPayload;
  variantSetDimensions: ApiVariantSetDimensionsPayload;
  variantSetMedia: ApiVariantSetMediaPayload;
  variantSetPricing: ApiVariantSetPricingPayload;
  variantSetSku: ApiVariantSetSkuPayload;
  variantSetStock: ApiVariantSetStockPayload;
  variantSetWeight: ApiVariantSetWeightPayload;
  warehouseCreate: ApiWarehouseCreatePayload;
  warehouseDelete: ApiWarehouseDeletePayload;
  warehouseUpdate: ApiWarehouseUpdatePayload;
};


export type ApiInventoryMutationProductDeleteArgs = {
  input: ApiProductDeleteInput;
};


export type ApiInventoryMutationProductFeatureCreateArgs = {
  input: ApiProductFeatureCreateInput;
};


export type ApiInventoryMutationProductFeatureDeleteArgs = {
  input: ApiProductFeatureDeleteInput;
};


export type ApiInventoryMutationProductFeatureUpdateArgs = {
  input: ApiProductFeatureUpdateInput;
};


export type ApiInventoryMutationProductOptionCreateArgs = {
  input: ApiProductOptionCreateInput;
};


export type ApiInventoryMutationProductOptionDeleteArgs = {
  input: ApiProductOptionDeleteInput;
};


export type ApiInventoryMutationProductOptionUpdateArgs = {
  input: ApiProductOptionUpdateInput;
};


export type ApiInventoryMutationProductPublishArgs = {
  input: ApiProductPublishInput;
};


export type ApiInventoryMutationProductUnpublishArgs = {
  input: ApiProductUnpublishInput;
};


export type ApiInventoryMutationProductUpdateArgs = {
  input: ApiProductUpdateInput;
};


export type ApiInventoryMutationVariantCreateArgs = {
  input: ApiVariantCreateInput;
};


export type ApiInventoryMutationVariantDeleteArgs = {
  input: ApiVariantDeleteInput;
};


export type ApiInventoryMutationVariantSetCostArgs = {
  input: ApiVariantSetCostInput;
};


export type ApiInventoryMutationVariantSetDimensionsArgs = {
  input: ApiVariantSetDimensionsInput;
};


export type ApiInventoryMutationVariantSetMediaArgs = {
  input: ApiVariantSetMediaInput;
};


export type ApiInventoryMutationVariantSetPricingArgs = {
  input: ApiVariantSetPricingInput;
};


export type ApiInventoryMutationVariantSetSkuArgs = {
  input: ApiVariantSetSkuInput;
};


export type ApiInventoryMutationVariantSetStockArgs = {
  input: ApiVariantSetStockInput;
};


export type ApiInventoryMutationVariantSetWeightArgs = {
  input: ApiVariantSetWeightInput;
};


export type ApiInventoryMutationWarehouseCreateArgs = {
  input: ApiWarehouseCreateInput;
};


export type ApiInventoryMutationWarehouseDeleteArgs = {
  input: ApiWarehouseDeleteInput;
};


export type ApiInventoryMutationWarehouseUpdateArgs = {
  input: ApiWarehouseUpdateInput;
};

export type ApiInventoryQuery = {
  __typename?: 'InventoryQuery';
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
  /** Get a product by ID */
  product?: Maybe<ApiProduct>;
  /** Get products with Relay-style pagination */
  products: ApiProductConnection;
  /** Get a variant by ID */
  variant?: Maybe<ApiVariant>;
  /** Get variants with Relay-style pagination */
  variants: ApiVariantConnection;
  /** Get a warehouse by ID */
  warehouse?: Maybe<ApiWarehouse>;
  /** Get all warehouses */
  warehouses: ApiWarehouseConnection;
};


export type ApiInventoryQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type ApiInventoryQueryProductArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryProductsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiInventoryQueryVariantArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type ApiInventoryQueryWarehouseArgs = {
  id: Scalars['ID']['input'];
};


export type ApiInventoryQueryWarehousesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

export type ApiInviteInput = {
  email: Scalars['String']['input'];
};

export type ApiLocale = {
  __typename?: 'Locale';
  code: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

/** Image/video dimensions. */
export type ApiMediaDimensions = {
  __typename?: 'MediaDimensions';
  /** Height in pixels. */
  height: Scalars['Int']['output'];
  /** Width in pixels. */
  width: Scalars['Int']['output'];
};

export type ApiMediaMutation = {
  __typename?: 'MediaMutation';
  bucketCreate: ApiBucketCreatePayload;
  fileCreateExternal: ApiFileCreateExternalPayload;
  fileDelete: ApiFileDeletePayload;
  fileUpdate: ApiFileUpdatePayload;
  fileUpload: ApiFileUploadPayload;
  fileUploadFromUrl: ApiFileUploadPayload;
};


export type ApiMediaMutationBucketCreateArgs = {
  input: ApiBucketCreateInput;
};


export type ApiMediaMutationFileCreateExternalArgs = {
  input: ApiFileCreateExternalInput;
};


export type ApiMediaMutationFileDeleteArgs = {
  input: ApiFileDeleteInput;
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

export type ApiMediaQuery = {
  __typename?: 'MediaQuery';
  /** Get a file by ID */
  file?: Maybe<ApiFile>;
  /** Get a node by its global ID */
  node?: Maybe<ApiNode>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<ApiNode>>;
};


export type ApiMediaQueryFileArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMediaQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type ApiMediaQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type ApiMutation = {
  __typename?: 'Mutation';
  appsMutation: ApiAppsMutation;
  customerMutation: ApiCustomerMutation;
  inventoryMutation: ApiInventoryMutation;
  mediaMutation: ApiMediaMutation;
  projectMutation: ApiProjectMutation;
  userMutation: ApiUserMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type ApiNode = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
};

/** Display type for product options in the UI. */
export enum OptionDisplayType {
  Buttons = 'BUTTONS',
  Dropdown = 'DROPDOWN',
  Swatch = 'SWATCH'
}

/** Information about pagination in a connection. */
export type ApiPageInfo = {
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

/** A product represents an item that can be sold. */
export type ApiProduct = ApiNode & {
  __typename?: 'Product';
  /** The date and time when the product was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the product was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Product description. */
  description?: Maybe<ApiDescription>;
  /** Short excerpt. */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The features of this product. */
  features: Array<ApiProductFeature>;
  /** The URL-friendly handle for the product. */
  handle?: Maybe<Scalars['String']['output']>;
  /** The globally unique ID of the product. */
  id: Scalars['ID']['output'];
  /** Whether the product is currently published. */
  isPublished: Scalars['Boolean']['output'];
  /** The options available for this product. */
  options: Array<ApiProductOption>;
  /** The date and time when the product was published, or null if unpublished. */
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  /** SEO description. */
  seoDescription?: Maybe<Scalars['String']['output']>;
  /** SEO title. */
  seoTitle?: Maybe<Scalars['String']['output']>;
  /** Product title. */
  title: Scalars['String']['output'];
  /** The date and time when the product was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variants of this product. */
  variants: ApiVariantConnection;
  /** The total number of variants for this product. */
  variantsCount: Scalars['Int']['output'];
};


/** A product represents an item that can be sold. */
export type ApiProductVariantsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Product items. */
export type ApiProductConnection = {
  __typename?: 'ProductConnection';
  /** A list of edges. */
  edges: Array<ApiProductEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of products. */
  totalCount: Scalars['Int']['output'];
};

/** Payload for product creation. */
export type ApiProductCreatePayload = {
  __typename?: 'ProductCreatePayload';
  /** The created product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for deleting a product. */
export type ApiProductDeleteInput = {
  /** The ID of the product to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the product (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for product deletion. */
export type ApiProductDeletePayload = {
  __typename?: 'ProductDeletePayload';
  /** The ID of the deleted product. */
  deletedProductId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Product connection. */
export type ApiProductEdge = {
  __typename?: 'ProductEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiProduct;
};

/** A product feature represents a searchable attribute of a product (e.g., Material, Brand). */
export type ApiProductFeature = ApiNode & {
  __typename?: 'ProductFeature';
  /** The globally unique ID of the feature. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this feature. */
  slug: Scalars['String']['output'];
  /** The available values for this feature. */
  values: Array<ApiProductFeatureValue>;
};

/** Input for creating a feature on a product. */
export type ApiProductFeatureCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product. */
  productId: Scalars['ID']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

/** Payload for feature create. */
export type ApiProductFeatureCreatePayload = {
  __typename?: 'ProductFeatureCreatePayload';
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
  id: Scalars['ID']['input'];
};

/** Payload for feature delete. */
export type ApiProductFeatureDeletePayload = {
  __typename?: 'ProductFeatureDeletePayload';
  /** The ID of the deleted feature. */
  deletedFeatureId?: Maybe<Scalars['ID']['output']>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for creating a feature during product creation. */
export type ApiProductFeatureInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the feature. */
  slug: Scalars['String']['input'];
  /** The values for this feature. */
  values: Array<ApiProductFeatureValueCreateInput>;
};

/** Input for updating a feature. */
export type ApiProductFeatureUpdateInput = {
  /** The ID of the feature to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the feature. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductFeatureValuesInput>;
};

/** Payload for feature update. */
export type ApiProductFeatureUpdatePayload = {
  __typename?: 'ProductFeatureUpdatePayload';
  /** The updated feature. */
  feature?: Maybe<ApiProductFeature>;
  /** The product with updated features. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product feature. */
export type ApiProductFeatureValue = ApiNode & {
  __typename?: 'ProductFeatureValue';
  /** The globally unique ID of the feature value. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this value. */
  slug: Scalars['String']['output'];
};

/** Input for creating a feature value. */
export type ApiProductFeatureValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
};

/** Input for updating an existing feature value. */
export type ApiProductFeatureValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for nested value operations in feature update. */
export type ApiProductFeatureValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductFeatureValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductFeatureValueUpdateInput>>;
};

/** A product option defines a configurable aspect of a product, such as Size or Color. */
export type ApiProductOption = ApiNode & {
  __typename?: 'ProductOption';
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** The globally unique ID of the option. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this option. */
  slug: Scalars['String']['output'];
  /** The available values for this option. */
  values: Array<ApiProductOptionValue>;
};

/** Input for creating an option on a product. */
export type ApiProductOptionCreateInput = {
  /** The display type for UI rendering. */
  displayType: OptionDisplayType;
  /** Display name. */
  name: Scalars['String']['input'];
  /** The ID of the product (optional when creating with product). */
  productId?: InputMaybe<Scalars['ID']['input']>;
  /** The URL-friendly slug for the option. */
  slug: Scalars['String']['input'];
  /** The values for this option. */
  values: Array<ApiProductOptionValueCreateInput>;
};

/** Payload for option create. Returns the product with new variants. */
export type ApiProductOptionCreatePayload = {
  __typename?: 'ProductOptionCreatePayload';
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
  id: Scalars['ID']['input'];
};

/** Payload for option delete. */
export type ApiProductOptionDeletePayload = {
  __typename?: 'ProductOptionDeletePayload';
  /** The ID of the deleted option. */
  deletedOptionId?: Maybe<Scalars['ID']['output']>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A visual swatch for representing an option value. */
export type ApiProductOptionSwatch = ApiNode & {
  __typename?: 'ProductOptionSwatch';
  /** The primary color (hex code or color name). */
  colorOne?: Maybe<Scalars['String']['output']>;
  /** The secondary color for gradients. */
  colorTwo?: Maybe<Scalars['String']['output']>;
  /** The file for image-based swatches. */
  file?: Maybe<ApiFile>;
  /** The globally unique ID of the swatch. */
  id: Scalars['ID']['output'];
  /** Additional metadata for the swatch. */
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for creating/updating a swatch. */
export type ApiProductOptionSwatchInput = {
  /** The primary color (hex code or color name). */
  colorOne?: InputMaybe<Scalars['String']['input']>;
  /** The secondary color for gradients. */
  colorTwo?: InputMaybe<Scalars['String']['input']>;
  /** The file ID for image-based swatches. */
  fileId?: InputMaybe<Scalars['ID']['input']>;
  /** Additional metadata. */
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  /** The type of swatch. */
  swatchType: SwatchType;
};

/** Input for updating an option. */
export type ApiProductOptionUpdateInput = {
  /** The new display type. */
  displayType?: InputMaybe<OptionDisplayType>;
  /** The ID of the option to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the option. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Nested value operations. */
  values?: InputMaybe<ApiProductOptionValuesInput>;
};

/** Payload for option update. */
export type ApiProductOptionUpdatePayload = {
  __typename?: 'ProductOptionUpdatePayload';
  /** The updated option. */
  option?: Maybe<ApiProductOption>;
  /** The product with updated options and variants. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** A value for a product option, such as "Red" for Color or "Large" for Size. */
export type ApiProductOptionValue = ApiNode & {
  __typename?: 'ProductOptionValue';
  /** The globally unique ID of the option value. */
  id: Scalars['ID']['output'];
  /** Display name. */
  name: Scalars['String']['output'];
  /** The URL-friendly identifier for this value. */
  slug: Scalars['String']['output'];
  /** The visual swatch for this value (if applicable). */
  swatch?: Maybe<ApiProductOptionSwatch>;
};

/** Input for creating an option value. */
export type ApiProductOptionValueCreateInput = {
  /** Display name. */
  name: Scalars['String']['input'];
  /** The URL-friendly slug for the value. */
  slug: Scalars['String']['input'];
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for updating an existing option value. */
export type ApiProductOptionValueUpdateInput = {
  /** The ID of the value to update. */
  id: Scalars['ID']['input'];
  /** Display name. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new slug for the value. */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** The swatch for this value. */
  swatch?: InputMaybe<ApiProductOptionSwatchInput>;
};

/** Input for nested value operations in option update. */
export type ApiProductOptionValuesInput = {
  /** Values to create. */
  create?: InputMaybe<Array<ApiProductOptionValueCreateInput>>;
  /** IDs of values to delete. */
  delete?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Values to update. */
  update?: InputMaybe<Array<ApiProductOptionValueUpdateInput>>;
};

/** Input for publishing a product. */
export type ApiProductPublishInput = {
  /** The ID of the product to publish. */
  id: Scalars['ID']['input'];
};

/** Payload for product publish. */
export type ApiProductPublishPayload = {
  __typename?: 'ProductPublishPayload';
  /** The published product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for unpublishing a product. */
export type ApiProductUnpublishInput = {
  /** The ID of the product to unpublish. */
  id: Scalars['ID']['input'];
};

/** Payload for product unpublish. */
export type ApiProductUnpublishPayload = {
  __typename?: 'ProductUnpublishPayload';
  /** The unpublished product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Input for updating a product. */
export type ApiProductUpdateInput = {
  /** Product description. */
  description?: InputMaybe<ApiDescriptionInput>;
  /** Short excerpt. */
  excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The URL-friendly handle for the product. */
  handle?: InputMaybe<Scalars['String']['input']>;
  /** The product ID. */
  id: Scalars['ID']['input'];
  /** SEO description. */
  seoDescription?: InputMaybe<Scalars['String']['input']>;
  /** SEO title. */
  seoTitle?: InputMaybe<Scalars['String']['input']>;
  /** Product title. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for product update. */
export type ApiProductUpdatePayload = {
  __typename?: 'ProductUpdatePayload';
  /** The updated product. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

export type ApiProject = {
  __typename?: 'Project';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
  status: ProjectStatus;
};

export type ApiProjectInfo = {
  __typename?: 'ProjectInfo';
  country: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  email: Scalars['String']['output'];
  locale: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Scalars['String']['output'];
  timezone: Scalars['String']['output'];
};

export type ApiProjectMutation = {
  __typename?: 'ProjectMutation';
  create: ApiProject;
  createApiKey: Scalars['String']['output'];
  delete: Scalars['Boolean']['output'];
  deleteApiKey: Scalars['Boolean']['output'];
  revokeApiKey: Scalars['Boolean']['output'];
  update: Scalars['Boolean']['output'];
  updateCurrencyFormat: Scalars['Boolean']['output'];
  updateDefaultCurrency: Scalars['Boolean']['output'];
  updateDefaultLocale: Scalars['Boolean']['output'];
  updateLocales: Scalars['Boolean']['output'];
};


export type ApiProjectMutationCreateArgs = {
  input: ApiCreateProjectInput;
};


export type ApiProjectMutationCreateApiKeyArgs = {
  input: ApiCreateApiKeyInput;
};


export type ApiProjectMutationDeleteArgs = {
  id: Scalars['ID']['input'];
};


export type ApiProjectMutationDeleteApiKeyArgs = {
  input: Scalars['ID']['input'];
};


export type ApiProjectMutationRevokeApiKeyArgs = {
  input: Scalars['ID']['input'];
};


export type ApiProjectMutationUpdateArgs = {
  input: ApiUpdateProjectInput;
};


export type ApiProjectMutationUpdateCurrencyFormatArgs = {
  input: ApiUpdateCurrencyFormatInput;
};


export type ApiProjectMutationUpdateDefaultCurrencyArgs = {
  input: Scalars['String']['input'];
};


export type ApiProjectMutationUpdateDefaultLocaleArgs = {
  input: Scalars['String']['input'];
};


export type ApiProjectMutationUpdateLocalesArgs = {
  input: ApiUpdateLocalesInput;
};

export type ApiProjectQuery = {
  __typename?: 'ProjectQuery';
  apiKeys: Array<ApiApiKey>;
  currencies: Array<ApiCurrency>;
  current: ApiProjectInfo;
  findMany: Array<Maybe<ApiProject>>;
  findOne?: Maybe<ApiProject>;
  locales: Array<ApiLocale>;
};


export type ApiProjectQueryFindOneArgs = {
  slug: Scalars['String']['input'];
};

export enum ProjectStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type ApiQuery = {
  __typename?: 'Query';
  appsQuery: ApiAppsQuery;
  customerQuery: ApiCustomerQuery;
  inventoryQuery: ApiInventoryQuery;
  mediaQuery: ApiMediaQuery;
  projectQuery: ApiProjectQuery;
  userQuery: ApiUserQuery;
};

export type ApiResetPasswordInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

/** S3-specific file data. */
export type ApiS3ObjectData = {
  __typename?: 'S3ObjectData';
  /** The bucket ID where this file is stored. */
  bucketId: Scalars['ID']['output'];
  /** Content hash (SHA-256) for deduplication. */
  contentHash?: Maybe<Scalars['String']['output']>;
  /** ETag from S3. */
  etag?: Maybe<Scalars['String']['output']>;
  /** S3 object key (path within bucket). */
  objectKey: Scalars['String']['output'];
  /** Storage class (STANDARD, GLACIER, etc). */
  storageClass: Scalars['String']['output'];
};

/** Represents a selected option for a variant. */
export type ApiSelectedOption = {
  __typename?: 'SelectedOption';
  /** The option ID. */
  optionId: Scalars['ID']['output'];
  /** The selected value ID. */
  optionValueId: Scalars['ID']['output'];
};

/** Input for selecting an option value for a variant. */
export type ApiSelectedOptionInput = {
  /** The ID of the option. */
  optionId: Scalars['ID']['input'];
  /** The ID of the option value. */
  optionValueId: Scalars['ID']['input'];
};

export type ApiSession = {
  __typename?: 'Session';
  jwt: Scalars['String']['output'];
  user: ApiUser;
};

export type ApiSignInInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ApiSignUpInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  language: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

/** Sort direction */
export enum SortDirection {
  Asc = 'asc',
  Desc = 'desc'
}

/** Filter operators for String fields */
export type ApiStringFilter = {
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

/** Type of visual swatch for option values. */
export enum SwatchType {
  Color = 'COLOR',
  Gradient = 'GRADIENT',
  Image = 'IMAGE'
}

export type ApiUpdateCurrencyFormatInput = {
  code: Scalars['String']['input'];
  decimalPlaces?: InputMaybe<Scalars['Int']['input']>;
  decimalSeparator?: InputMaybe<Scalars['String']['input']>;
  symbolLeft?: InputMaybe<Scalars['String']['input']>;
  symbolRight?: InputMaybe<Scalars['String']['input']>;
  thousandSeparator?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateCustomerInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isVerified?: InputMaybe<Scalars['Boolean']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateEmailInput = {
  email: Scalars['String']['input'];
};

export type ApiUpdateImageInput = {
  image: Scalars['ID']['input'];
};

export type ApiUpdateLocaleInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type ApiUpdateLocalesInput = {
  create: Array<ApiCreateLocaleInput>;
  delete: Array<Scalars['String']['input']>;
  update: Array<ApiUpdateLocaleInput>;
};

export type ApiUpdatePasswordInput = {
  password: Scalars['String']['input'];
};

export type ApiUpdatePhoneNumberInput = {
  phoneNumber: Scalars['String']['input'];
};

export type ApiUpdateProfileInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUpdateProjectInput = {
  country?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ApiUser = {
  __typename?: 'User';
  createdAt: Scalars['Timestamp']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isReady: Scalars['Boolean']['output'];
  isVerified: Scalars['Boolean']['output'];
  language: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  phoneNumber?: Maybe<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['Timestamp']['output'];
};

/** A generic user error interface for mutation responses. */
export type ApiUserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

export type ApiUserMutation = {
  __typename?: 'UserMutation';
  createProfile: Scalars['Boolean']['output'];
  delete: Scalars['Boolean']['output'];
  forgotPassword: Scalars['Boolean']['output'];
  googleSignIn: ApiSession;
  invite?: Maybe<Scalars['Boolean']['output']>;
  resetPassword: Scalars['Boolean']['output'];
  signIn: ApiSession;
  signUp: ApiSession;
  updateEmail: Scalars['Boolean']['output'];
  updateImage: Scalars['Boolean']['output'];
  updatePassword: Scalars['Boolean']['output'];
  updatePhoneNumber: Scalars['Boolean']['output'];
  updateProfile: Scalars['Boolean']['output'];
  verifyEmail: Scalars['Boolean']['output'];
};


export type ApiUserMutationCreateProfileArgs = {
  input: ApiCreateProfileInput;
};


export type ApiUserMutationForgotPasswordArgs = {
  input: ApiForgotPasswordInput;
};


export type ApiUserMutationGoogleSignInArgs = {
  token: Scalars['String']['input'];
};


export type ApiUserMutationInviteArgs = {
  input: ApiInviteInput;
};


export type ApiUserMutationResetPasswordArgs = {
  input: ApiResetPasswordInput;
};


export type ApiUserMutationSignInArgs = {
  input: ApiSignInInput;
};


export type ApiUserMutationSignUpArgs = {
  input: ApiSignUpInput;
};


export type ApiUserMutationUpdateEmailArgs = {
  input: ApiUpdateEmailInput;
};


export type ApiUserMutationUpdateImageArgs = {
  input: ApiUpdateImageInput;
};


export type ApiUserMutationUpdatePasswordArgs = {
  input: ApiUpdatePasswordInput;
};


export type ApiUserMutationUpdatePhoneNumberArgs = {
  input: ApiUpdatePhoneNumberInput;
};


export type ApiUserMutationUpdateProfileArgs = {
  input: ApiUpdateProfileInput;
};


export type ApiUserMutationVerifyEmailArgs = {
  input: ApiVerifyEmailInput;
};

export type ApiUserQuery = {
  __typename?: 'UserQuery';
  me: ApiUser;
};

/** A variant represents a specific version of a product, such as a size or color. */
export type ApiVariant = ApiNode & {
  __typename?: 'Variant';
  /** Current cost for this variant. */
  cost?: Maybe<ApiVariantCost>;
  /** Cost history for this variant. */
  costHistory: ApiVariantCostConnection;
  /** The date and time when the variant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the variant was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Physical dimensions of this variant. */
  dimensions?: Maybe<ApiVariantDimensions>;
  /** The external ID in the external system. */
  externalId?: Maybe<Scalars['String']['output']>;
  /** The external system identifier for integration purposes. */
  externalSystem?: Maybe<Scalars['String']['output']>;
  /** The URL-friendly handle for the variant (generated from options). */
  handle: Scalars['String']['output'];
  /** The globally unique ID of the variant. */
  id: Scalars['ID']['output'];
  /** Whether the variant is in stock (has quantity > 0 in any warehouse). */
  inStock: Scalars['Boolean']['output'];
  /** Whether this is the default variant for the product. */
  isDefault: Scalars['Boolean']['output'];
  /** Media attached to this variant (images, videos). */
  media: Array<ApiVariantMediaItem>;
  /** Current price for this variant. */
  price?: Maybe<ApiVariantPrice>;
  /** Price history for this variant. */
  priceHistory: ApiVariantPriceConnection;
  /** The product this variant belongs to. */
  product: ApiProduct;
  /** The selected option values for this variant. */
  selectedOptions: Array<ApiSelectedOption>;
  /** The SKU (Stock Keeping Unit) of the variant. */
  sku?: Maybe<Scalars['String']['output']>;
  /** Stock levels for this variant across warehouses. */
  stock: Array<ApiWarehouseStock>;
  /** Variant title. */
  title?: Maybe<Scalars['String']['output']>;
  /** The date and time when the variant was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Physical weight of this variant. */
  weight?: Maybe<ApiVariantWeight>;
};


/** A variant represents a specific version of a product, such as a size or color. */
export type ApiVariantCostHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A variant represents a specific version of a product, such as a size or color. */
export type ApiVariantPriceHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Variant items. */
export type ApiVariantConnection = {
  __typename?: 'VariantConnection';
  /** A list of edges. */
  edges: Array<ApiVariantEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of variants. */
  totalCount: Scalars['Int']['output'];
};

/** Represents the cost of a variant. */
export type ApiVariantCost = ApiNode & {
  __typename?: 'VariantCost';
  /** The currency code. */
  currency: CurrencyCode;
  /** When this cost became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this cost stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the cost record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active cost. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this cost record was created. */
  recordedAt: Scalars['DateTime']['output'];
  /** The unit cost in minor units. */
  unitCostMinor: Scalars['BigInt']['output'];
};

/** A connection to a list of VariantCost items. */
export type ApiVariantCostConnection = {
  __typename?: 'VariantCostConnection';
  /** A list of edges. */
  edges: Array<ApiVariantCostEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of cost records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantCost connection. */
export type ApiVariantCostEdge = {
  __typename?: 'VariantCostEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariantCost;
};

/** Input for creating a variant with a product ID. */
export type ApiVariantCreateInput = {
  /** The ID of the product to add the variant to. */
  productId: Scalars['ID']['input'];
  /** The variant data. */
  variant: ApiVariantInput;
};

/** Payload for variant creation. */
export type ApiVariantCreatePayload = {
  __typename?: 'VariantCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for deleting a variant. */
export type ApiVariantDeleteInput = {
  /** The ID of the variant to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the variant (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for variant deletion. */
export type ApiVariantDeletePayload = {
  __typename?: 'VariantDeletePayload';
  /** The ID of the deleted variant. */
  deletedVariantId?: Maybe<Scalars['ID']['output']>;
  /** The product the variant belonged to. */
  product?: Maybe<ApiProduct>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** Physical dimensions of a variant (stored in millimeters). */
export type ApiVariantDimensions = {
  __typename?: 'VariantDimensions';
  /** Height in millimeters. */
  height: Scalars['Int']['output'];
  /** Length in millimeters. */
  length: Scalars['Int']['output'];
  /** Width in millimeters. */
  width: Scalars['Int']['output'];
};

/** An edge in a Variant connection. */
export type ApiVariantEdge = {
  __typename?: 'VariantEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariant;
};

/** Input for creating a variant. */
export type ApiVariantInput = {
  /** Physical dimensions. */
  dimensions?: InputMaybe<ApiDimensionsInput>;
  /** External ID in the external system. */
  externalId?: InputMaybe<Scalars['String']['input']>;
  /** External system identifier. */
  externalSystem?: InputMaybe<Scalars['String']['input']>;
  /** Selected option values for the variant (required). */
  options: Array<ApiSelectedOptionInput>;
  /** The SKU for the variant. */
  sku?: InputMaybe<Scalars['String']['input']>;
  /** Variant title. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Physical weight. */
  weight?: InputMaybe<ApiWeightInput>;
};

/** Media attached to a variant with sort order. */
export type ApiVariantMediaItem = {
  __typename?: 'VariantMediaItem';
  /** The file from the Media service. */
  file: ApiFile;
  /** Sort order index (lower = first). */
  sortIndex: Scalars['Int']['output'];
};

/** Represents a price for a variant. */
export type ApiVariantPrice = ApiNode & {
  __typename?: 'VariantPrice';
  /** The price amount in minor units (cents, kopecks, etc.). */
  amountMinor: Scalars['BigInt']['output'];
  /** The compare-at price in minor units (strikethrough price). */
  compareAtMinor?: Maybe<Scalars['BigInt']['output']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** When this price became effective. */
  effectiveFrom: Scalars['DateTime']['output'];
  /** When this price stopped being effective (null if current). */
  effectiveTo?: Maybe<Scalars['DateTime']['output']>;
  /** The globally unique ID of the price record. */
  id: Scalars['ID']['output'];
  /** Whether this is the current active price. */
  isCurrent: Scalars['Boolean']['output'];
  /** When this price record was created. */
  recordedAt: Scalars['DateTime']['output'];
};

/** A connection to a list of VariantPrice items. */
export type ApiVariantPriceConnection = {
  __typename?: 'VariantPriceConnection';
  /** A list of edges. */
  edges: Array<ApiVariantPriceEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of price records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a VariantPrice connection. */
export type ApiVariantPriceEdge = {
  __typename?: 'VariantPriceEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiVariantPrice;
};

/** Input for setting a cost on a variant. */
export type ApiVariantSetCostInput = {
  /** The currency code. */
  currency: CurrencyCode;
  /** The unit cost in minor units. */
  unitCostMinor: Scalars['BigInt']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant cost set. */
export type ApiVariantSetCostPayload = {
  __typename?: 'VariantSetCostPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting variant dimensions. */
export type ApiVariantSetDimensionsInput = {
  /** The dimensions to set. */
  dimensions: ApiDimensionsInput;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant dimensions set. */
export type ApiVariantSetDimensionsPayload = {
  __typename?: 'VariantSetDimensionsPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting variant media (replaces all existing media). */
export type ApiVariantSetMediaInput = {
  /** File IDs in desired order (first = primary). Empty array clears all media. */
  fileIds: Array<Scalars['ID']['input']>;
  /** The variant ID. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant set media. */
export type ApiVariantSetMediaPayload = {
  __typename?: 'VariantSetMediaPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting a price on a variant. */
export type ApiVariantSetPricingInput = {
  /** The price amount in minor units. */
  amountMinor: Scalars['BigInt']['input'];
  /** The compare-at price in minor units (optional). */
  compareAtMinor?: InputMaybe<Scalars['BigInt']['input']>;
  /** The currency code. */
  currency: CurrencyCode;
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant pricing set. */
export type ApiVariantSetPricingPayload = {
  __typename?: 'VariantSetPricingPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting variant SKU. */
export type ApiVariantSetSkuInput = {
  /** The new SKU value. */
  sku: Scalars['String']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
};

/** Payload for variant SKU set. */
export type ApiVariantSetSkuPayload = {
  __typename?: 'VariantSetSkuPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting stock on a variant. */
export type ApiVariantSetStockInput = {
  /** The quantity to set. */
  quantity: Scalars['Int']['input'];
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
  /** The warehouse ID. */
  warehouseId: Scalars['ID']['input'];
};

/** Payload for variant stock set. */
export type ApiVariantSetStockPayload = {
  __typename?: 'VariantSetStockPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Input for setting variant weight. */
export type ApiVariantSetWeightInput = {
  /** The ID of the variant. */
  variantId: Scalars['ID']['input'];
  /** The weight to set. */
  weight: ApiWeightInput;
};

/** Payload for variant weight set. */
export type ApiVariantSetWeightPayload = {
  __typename?: 'VariantSetWeightPayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The updated variant. */
  variant?: Maybe<ApiVariant>;
};

/** Physical weight of a variant (stored in grams). */
export type ApiVariantWeight = {
  __typename?: 'VariantWeight';
  /** Weight in grams. */
  value: Scalars['Int']['output'];
};

export type ApiVerifyEmailInput = {
  email: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouse = ApiNode & {
  __typename?: 'Warehouse';
  /** The unique code identifying this warehouse. */
  code: Scalars['String']['output'];
  /** The date and time when the warehouse was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the warehouse. */
  id: Scalars['ID']['output'];
  /** Whether this is the default warehouse for the project. */
  isDefault: Scalars['Boolean']['output'];
  /** The display name of the warehouse. */
  name: Scalars['String']['output'];
  /** Stock levels for all variants in this warehouse. */
  stock: ApiWarehouseStockConnection;
  /** The date and time when the warehouse was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Total number of variants stocked in this warehouse. */
  variantsCount: Scalars['Int']['output'];
};


/** A warehouse represents a physical location where inventory is stored. */
export type ApiWarehouseStockArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** A connection to a list of Warehouse items. */
export type ApiWarehouseConnection = {
  __typename?: 'WarehouseConnection';
  /** A list of edges. */
  edges: Array<ApiWarehouseEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of warehouses. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for Warehouse */
export type ApiWarehouseConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<ApiWarehouseOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<ApiWarehouseWhereInput>;
};

/** Input for creating a warehouse. */
export type ApiWarehouseCreateInput = {
  /** The unique code for the warehouse. */
  code: Scalars['String']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The display name for the warehouse. */
  name: Scalars['String']['input'];
};

/** Payload for warehouse creation. */
export type ApiWarehouseCreatePayload = {
  __typename?: 'WarehouseCreatePayload';
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
  /** The created warehouse. */
  warehouse?: Maybe<ApiWarehouse>;
};

/** Input for deleting a warehouse. */
export type ApiWarehouseDeleteInput = {
  /** The ID of the warehouse to delete. */
  id: Scalars['ID']['input'];
};

/** Payload for warehouse deletion. */
export type ApiWarehouseDeletePayload = {
  __typename?: 'WarehouseDeletePayload';
  /** The ID of the deleted warehouse. */
  deletedWarehouseId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<ApiGenericUserError>;
};

/** An edge in a Warehouse connection. */
export type ApiWarehouseEdge = {
  __typename?: 'WarehouseEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
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
  /** Sort by code */
  Code = 'code',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by id */
  Id = 'id',
  /** Sort by isDefault */
  IsDefault = 'isDefault',
  /** Sort by name */
  Name = 'name',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt'
}

/** Represents stock level for a variant in a specific warehouse. */
export type ApiWarehouseStock = ApiNode & {
  __typename?: 'WarehouseStock';
  /** The date and time when the stock was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The globally unique ID of the stock record. */
  id: Scalars['ID']['output'];
  /** The quantity currently on hand. */
  quantityOnHand: Scalars['Int']['output'];
  /** The date and time when the stock was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The variant this stock record is for. */
  variant: ApiVariant;
  /** The warehouse where this stock is located. */
  warehouse: ApiWarehouse;
};

/** A connection to a list of WarehouseStock items. */
export type ApiWarehouseStockConnection = {
  __typename?: 'WarehouseStockConnection';
  /** A list of edges. */
  edges: Array<ApiWarehouseStockEdge>;
  /** Information to aid in pagination. */
  pageInfo: ApiPageInfo;
  /** The total number of stock records. */
  totalCount: Scalars['Int']['output'];
};

/** An edge in a WarehouseStock connection. */
export type ApiWarehouseStockEdge = {
  __typename?: 'WarehouseStockEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: ApiWarehouseStock;
};

/** Input for updating a warehouse. */
export type ApiWarehouseUpdateInput = {
  /** The new code for the warehouse. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the warehouse to update. */
  id: Scalars['ID']['input'];
  /** Whether this should be the default warehouse. */
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** The new name for the warehouse. */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for warehouse update. */
export type ApiWarehouseUpdatePayload = {
  __typename?: 'WarehouseUpdatePayload';
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
  /** Filter by code */
  code?: InputMaybe<ApiStringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<ApiDateTimeFilter>;
  /** Filter by id */
  id?: InputMaybe<ApiIdFilter>;
  /** Filter by isDefault */
  isDefault?: InputMaybe<ApiBooleanFilter>;
  /** Filter by name */
  name?: InputMaybe<ApiStringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<ApiDateTimeFilter>;
};

/** Input for setting weight (in grams). */
export type ApiWeightInput = {
  /** Weight in grams. */
  value: Scalars['Int']['input'];
};
