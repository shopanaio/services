import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../server.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
  Upload: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
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

/** A bucket represents an S3 storage bucket for a project. */
export type Bucket = {
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
export type BucketCreateInput = {
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
export type BucketCreatePayload = {
  __typename?: 'BucketCreatePayload';
  /** The created bucket. */
  bucket?: Maybe<Bucket>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

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

/** External media data (YouTube, Vimeo, etc). */
export type ExternalMediaData = {
  __typename?: 'ExternalMediaData';
  /** External ID (YouTube video ID, Vimeo ID, etc). */
  externalId: Scalars['String']['output'];
  /** Provider-specific metadata. */
  providerMeta?: Maybe<Scalars['JSON']['output']>;
};

/** A file represents a stored media asset. */
export type File = Node & {
  __typename?: 'File';
  /** Alt text for accessibility. */
  altText?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was created. */
  createdAt: Scalars['DateTime']['output'];
  /** The date and time when the file was deleted (soft delete). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Image/video dimensions (null if not applicable). */
  dimensions?: Maybe<MediaDimensions>;
  /** Duration in milliseconds (for video/audio). */
  durationMs?: Maybe<Scalars['Int']['output']>;
  /** File extension. */
  ext?: Maybe<Scalars['String']['output']>;
  /** External media data (for YouTube, Vimeo, etc). */
  externalData?: Maybe<ExternalMediaData>;
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
  s3Data?: Maybe<S3ObjectData>;
  /** Size in bytes (0 for external providers). */
  sizeBytes: Scalars['BigInt']['output'];
  /** Source URL (for files uploaded from URL). */
  sourceUrl?: Maybe<Scalars['String']['output']>;
  /** The date and time when the file was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** Public URL to access file. */
  url: Scalars['String']['output'];
};

/** A connection to a list of File items. */
export type FileConnection = {
  __typename?: 'FileConnection';
  /** A list of edges. */
  edges: Array<FileEdge>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** The total number of files. */
  totalCount: Scalars['Int']['output'];
};

/** Relay-style pagination input for File */
export type FileConnectionInput = {
  /** Returns items after this cursor */
  after?: InputMaybe<Scalars['String']['input']>;
  /** Returns items before this cursor */
  before?: InputMaybe<Scalars['String']['input']>;
  /** Returns the first n items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** Returns the last n items */
  last?: InputMaybe<Scalars['Int']['input']>;
  /** Sort order */
  orderBy?: InputMaybe<Array<FileOrderByInput>>;
  /** Filter conditions */
  where?: InputMaybe<FileWhereInput>;
};

/** Input for creating an external media file (YouTube, Vimeo, etc). */
export type FileCreateExternalInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Media bucket ID (MediaAssetGroup GID) to associate this file with. */
  bucketId?: InputMaybe<Scalars['ID']['input']>;
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
export type FileCreateExternalPayload = {
  __typename?: 'FileCreateExternalPayload';
  /** The created file. */
  file?: Maybe<File>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for deleting a file. */
export type FileDeleteInput = {
  /** The ID of the file to delete. */
  id: Scalars['ID']['input'];
  /** Whether to permanently delete the file (hard delete). */
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Payload for file deletion. */
export type FileDeletePayload = {
  __typename?: 'FileDeletePayload';
  /** The ID of the deleted file. */
  deletedFileId?: Maybe<Scalars['ID']['output']>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** An edge in a File connection. */
export type FileEdge = {
  __typename?: 'FileEdge';
  /** A cursor for use in pagination. */
  cursor: Scalars['String']['output'];
  /** The item at the end of the edge. */
  node: File;
};

/** Ordering configuration for File */
export type FileOrderByInput = {
  /** Sort direction */
  direction: SortDirection;
  /** Field to order by */
  field: FileOrderField;
};

/** Fields available for sorting File */
export enum FileOrderField {
  /** Sort by altText */
  AltText = 'altText',
  /** Sort by createdAt */
  CreatedAt = 'createdAt',
  /** Sort by durationMs */
  DurationMs = 'durationMs',
  /** Sort by ext */
  Ext = 'ext',
  /** Sort by height */
  Height = 'height',
  /** Sort by id */
  Id = 'id',
  /** Sort by idempotencyKey */
  IdempotencyKey = 'idempotencyKey',
  /** Sort by isProcessed */
  IsProcessed = 'isProcessed',
  /** Sort by meta */
  Meta = 'meta',
  /** Sort by mimeType */
  MimeType = 'mimeType',
  /** Sort by originalName */
  OriginalName = 'originalName',
  /** Sort by provider */
  Provider = 'provider',
  /** Sort by sizeBytes */
  SizeBytes = 'sizeBytes',
  /** Sort by sourceUrl */
  SourceUrl = 'sourceUrl',
  /** Sort by updatedAt */
  UpdatedAt = 'updatedAt',
  /** Sort by url */
  Url = 'url',
  /** Sort by width */
  Width = 'width'
}

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
export type FileUpdateInput = {
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
export type FileUpdatePayload = {
  __typename?: 'FileUpdatePayload';
  /** The updated file. */
  file?: Maybe<File>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Input for uploading a file from URL. */
export type FileUploadFromUrlInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Media bucket ID (MediaAssetGroup GID) to associate this file with. */
  bucketId?: InputMaybe<Scalars['ID']['input']>;
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
  /** URL to fetch the file from. */
  sourceUrl: Scalars['String']['input'];
};

/** Input for uploading a file via multipart form data. */
export type FileUploadMultipartInput = {
  /** Alt text for accessibility. */
  altText?: InputMaybe<Scalars['String']['input']>;
  /** Media bucket ID (MediaAssetGroup GID) to associate this file with. */
  bucketId?: InputMaybe<Scalars['ID']['input']>;
  /** The file to upload. */
  file: Scalars['Upload']['input'];
  /** Idempotency key for deduplication. */
  idempotencyKey?: InputMaybe<Scalars['String']['input']>;
};

/** Payload for file upload. */
export type FileUploadPayload = {
  __typename?: 'FileUploadPayload';
  /** The uploaded file. */
  file?: Maybe<File>;
  /** List of errors that occurred during the mutation. */
  userErrors: Array<GenericUserError>;
};

/** Filter conditions for File */
export type FileWhereInput = {
  /** Logical AND of multiple conditions */
  _and?: InputMaybe<Array<FileWhereInput>>;
  /** Negate the condition */
  _not?: InputMaybe<FileWhereInput>;
  /** Logical OR of multiple conditions */
  _or?: InputMaybe<Array<FileWhereInput>>;
  /** Filter by altText */
  altText?: InputMaybe<StringFilter>;
  /** Filter by createdAt */
  createdAt?: InputMaybe<DateTimeFilter>;
  /** Filter by durationMs */
  durationMs?: InputMaybe<IntFilter>;
  /** Filter by ext */
  ext?: InputMaybe<StringFilter>;
  /** Filter by height */
  height?: InputMaybe<IntFilter>;
  /** Filter by id */
  id?: InputMaybe<IdFilter>;
  /** Filter by idempotencyKey */
  idempotencyKey?: InputMaybe<StringFilter>;
  /** Filter by isProcessed */
  isProcessed?: InputMaybe<BooleanFilter>;
  /** Filter by meta */
  meta?: InputMaybe<StringFilter>;
  /** Filter by mimeType */
  mimeType?: InputMaybe<StringFilter>;
  /** Filter by originalName */
  originalName?: InputMaybe<StringFilter>;
  /** Filter by provider */
  provider?: InputMaybe<StringFilter>;
  /** Filter by sizeBytes */
  sizeBytes?: InputMaybe<IntFilter>;
  /** Filter by sourceUrl */
  sourceUrl?: InputMaybe<StringFilter>;
  /** Filter by updatedAt */
  updatedAt?: InputMaybe<DateTimeFilter>;
  /** Filter by url */
  url?: InputMaybe<StringFilter>;
  /** Filter by width */
  width?: InputMaybe<IntFilter>;
};

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

/** Image/video dimensions. */
export type MediaDimensions = {
  __typename?: 'MediaDimensions';
  /** Height in pixels. */
  height: Scalars['Int']['output'];
  /** Width in pixels. */
  width: Scalars['Int']['output'];
};

export type MediaMutation = {
  __typename?: 'MediaMutation';
  bucketCreate: BucketCreatePayload;
  fileCreateExternal: FileCreateExternalPayload;
  fileDelete: FileDeletePayload;
  fileUpdate: FileUpdatePayload;
  fileUpload: FileUploadPayload;
  fileUploadFromUrl: FileUploadPayload;
};


export type MediaMutationBucketCreateArgs = {
  input: BucketCreateInput;
};


export type MediaMutationFileCreateExternalArgs = {
  input: FileCreateExternalInput;
};


export type MediaMutationFileDeleteArgs = {
  input: FileDeleteInput;
};


export type MediaMutationFileUpdateArgs = {
  input: FileUpdateInput;
};


export type MediaMutationFileUploadArgs = {
  input: FileUploadMultipartInput;
};


export type MediaMutationFileUploadFromUrlArgs = {
  input: FileUploadFromUrlInput;
};

export type MediaQuery = {
  __typename?: 'MediaQuery';
  /** Get a file by ID */
  file?: Maybe<File>;
  /** Get files with Relay-style pagination */
  files: FileConnection;
  /** Get a node by its global ID */
  node?: Maybe<Node>;
  /** Get multiple nodes by their global IDs */
  nodes: Array<Maybe<Node>>;
};


export type MediaQueryFileArgs = {
  bucketId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
};


export type MediaQueryFilesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  bucketId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<FileOrderByInput>>;
  where?: InputMaybe<FileWhereInput>;
};


export type MediaQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type MediaQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  mediaMutation: MediaMutation;
};

/** The Node interface is implemented by all types that have a globally unique ID. */
export type Node = {
  /** The globally unique ID of the object. */
  id: Scalars['ID']['output'];
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
  mediaQuery: MediaQuery;
};

/** S3-specific file data. */
export type S3ObjectData = {
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

/** A generic user error interface for mutation responses. */
export type UserError = {
  /** An error code for programmatic handling. */
  code?: Maybe<Scalars['String']['output']>;
  /** The path to the input field that caused the error. */
  field?: Maybe<Array<Scalars['String']['output']>>;
  /** The error message. */
  message: Scalars['String']['output'];
};

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
  Node: ( File );
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  BooleanFilter: BooleanFilter;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Bucket: ResolverTypeWrapper<Bucket>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  BucketCreateInput: BucketCreateInput;
  BucketCreatePayload: ResolverTypeWrapper<BucketCreatePayload>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DateTimeFilter: DateTimeFilter;
  ExternalMediaData: ResolverTypeWrapper<ExternalMediaData>;
  File: ResolverTypeWrapper<File>;
  FileConnection: ResolverTypeWrapper<FileConnection>;
  FileConnectionInput: FileConnectionInput;
  FileCreateExternalInput: FileCreateExternalInput;
  FileCreateExternalPayload: ResolverTypeWrapper<FileCreateExternalPayload>;
  FileDeleteInput: FileDeleteInput;
  FileDeletePayload: ResolverTypeWrapper<FileDeletePayload>;
  FileEdge: ResolverTypeWrapper<FileEdge>;
  FileOrderByInput: FileOrderByInput;
  FileOrderField: FileOrderField;
  FileProvider: FileProvider;
  FileUpdateInput: FileUpdateInput;
  FileUpdatePayload: ResolverTypeWrapper<FileUpdatePayload>;
  FileUploadFromUrlInput: FileUploadFromUrlInput;
  FileUploadMultipartInput: FileUploadMultipartInput;
  FileUploadPayload: ResolverTypeWrapper<FileUploadPayload>;
  FileWhereInput: FileWhereInput;
  FloatFilter: FloatFilter;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  MediaDimensions: ResolverTypeWrapper<MediaDimensions>;
  MediaMutation: ResolverTypeWrapper<MediaMutation>;
  MediaQuery: ResolverTypeWrapper<Omit<MediaQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversTypes['Node']>, nodes: Array<Maybe<ResolversTypes['Node']>> }>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  S3ObjectData: ResolverTypeWrapper<S3ObjectData>;
  SortDirection: SortDirection;
  StringFilter: StringFilter;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  UserError: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['UserError']>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigInt: Scalars['BigInt']['output'];
  BooleanFilter: BooleanFilter;
  Boolean: Scalars['Boolean']['output'];
  Bucket: Bucket;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  BucketCreateInput: BucketCreateInput;
  BucketCreatePayload: BucketCreatePayload;
  DateTime: Scalars['DateTime']['output'];
  DateTimeFilter: DateTimeFilter;
  ExternalMediaData: ExternalMediaData;
  File: File;
  FileConnection: FileConnection;
  FileConnectionInput: FileConnectionInput;
  FileCreateExternalInput: FileCreateExternalInput;
  FileCreateExternalPayload: FileCreateExternalPayload;
  FileDeleteInput: FileDeleteInput;
  FileDeletePayload: FileDeletePayload;
  FileEdge: FileEdge;
  FileOrderByInput: FileOrderByInput;
  FileUpdateInput: FileUpdateInput;
  FileUpdatePayload: FileUpdatePayload;
  FileUploadFromUrlInput: FileUploadFromUrlInput;
  FileUploadMultipartInput: FileUploadMultipartInput;
  FileUploadPayload: FileUploadPayload;
  FileWhereInput: FileWhereInput;
  FloatFilter: FloatFilter;
  Float: Scalars['Float']['output'];
  GenericUserError: GenericUserError;
  IDFilter: IdFilter;
  IntFilter: IntFilter;
  JSON: Scalars['JSON']['output'];
  MediaDimensions: MediaDimensions;
  MediaMutation: MediaMutation;
  MediaQuery: Omit<MediaQuery, 'node' | 'nodes'> & { node?: Maybe<ResolversParentTypes['Node']>, nodes: Array<Maybe<ResolversParentTypes['Node']>> };
  Mutation: {};
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Query: {};
  S3ObjectData: S3ObjectData;
  StringFilter: StringFilter;
  Upload: Scalars['Upload']['output'];
  UserError: ResolversInterfaceTypes<ResolversParentTypes>['UserError'];
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type BucketResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Bucket'] = ResolversParentTypes['Bucket']> = ResolversObject<{
  bucketName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  endpointUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  region?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BucketCreatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BucketCreatePayload'] = ResolversParentTypes['BucketCreatePayload']> = ResolversObject<{
  bucket?: Resolver<Maybe<ResolversTypes['Bucket']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type ExternalMediaDataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ExternalMediaData'] = ResolversParentTypes['ExternalMediaData']> = ResolversObject<{
  externalId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerMeta?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['File'] = ResolversParentTypes['File']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['File']>, { __typename: 'File' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  altText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  dimensions?: Resolver<Maybe<ResolversTypes['MediaDimensions']>, ParentType, ContextType>;
  durationMs?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  ext?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  externalData?: Resolver<Maybe<ResolversTypes['ExternalMediaData']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isProcessed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  meta?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  mimeType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  originalName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['FileProvider'], ParentType, ContextType>;
  s3Data?: Resolver<Maybe<ResolversTypes['S3ObjectData']>, ParentType, ContextType>;
  sizeBytes?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  sourceUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileConnection'] = ResolversParentTypes['FileConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['FileEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileCreateExternalPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileCreateExternalPayload'] = ResolversParentTypes['FileCreateExternalPayload']> = ResolversObject<{
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileDeletePayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileDeletePayload'] = ResolversParentTypes['FileDeletePayload']> = ResolversObject<{
  deletedFileId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileEdge'] = ResolversParentTypes['FileEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['File'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileUpdatePayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileUpdatePayload'] = ResolversParentTypes['FileUpdatePayload']> = ResolversObject<{
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileUploadPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileUploadPayload'] = ResolversParentTypes['FileUploadPayload']> = ResolversObject<{
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type GenericUserErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MediaDimensionsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MediaDimensions'] = ResolversParentTypes['MediaDimensions']> = ResolversObject<{
  height?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MediaMutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MediaMutation'] = ResolversParentTypes['MediaMutation']> = ResolversObject<{
  bucketCreate?: Resolver<ResolversTypes['BucketCreatePayload'], ParentType, ContextType, RequireFields<MediaMutationBucketCreateArgs, 'input'>>;
  fileCreateExternal?: Resolver<ResolversTypes['FileCreateExternalPayload'], ParentType, ContextType, RequireFields<MediaMutationFileCreateExternalArgs, 'input'>>;
  fileDelete?: Resolver<ResolversTypes['FileDeletePayload'], ParentType, ContextType, RequireFields<MediaMutationFileDeleteArgs, 'input'>>;
  fileUpdate?: Resolver<ResolversTypes['FileUpdatePayload'], ParentType, ContextType, RequireFields<MediaMutationFileUpdateArgs, 'input'>>;
  fileUpload?: Resolver<ResolversTypes['FileUploadPayload'], ParentType, ContextType, RequireFields<MediaMutationFileUploadArgs, 'input'>>;
  fileUploadFromUrl?: Resolver<ResolversTypes['FileUploadPayload'], ParentType, ContextType, RequireFields<MediaMutationFileUploadFromUrlArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MediaQueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MediaQuery'] = ResolversParentTypes['MediaQuery']> = ResolversObject<{
  file?: Resolver<Maybe<ResolversTypes['File']>, ParentType, ContextType, RequireFields<MediaQueryFileArgs, 'bucketId' | 'id'>>;
  files?: Resolver<ResolversTypes['FileConnection'], ParentType, ContextType, RequireFields<MediaQueryFilesArgs, 'bucketId'>>;
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<MediaQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<MediaQueryNodesArgs, 'ids'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  mediaMutation?: Resolver<ResolversTypes['MediaMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'File', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  mediaQuery?: Resolver<ResolversTypes['MediaQuery'], ParentType, ContextType>;
}>;

export type S3ObjectDataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['S3ObjectData'] = ResolversParentTypes['S3ObjectData']> = ResolversObject<{
  bucketId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  contentHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  etag?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  objectKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  storageClass?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  BigInt?: GraphQLScalarType;
  Bucket?: BucketResolvers<ContextType>;
  BucketCreatePayload?: BucketCreatePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  ExternalMediaData?: ExternalMediaDataResolvers<ContextType>;
  File?: FileResolvers<ContextType>;
  FileConnection?: FileConnectionResolvers<ContextType>;
  FileCreateExternalPayload?: FileCreateExternalPayloadResolvers<ContextType>;
  FileDeletePayload?: FileDeletePayloadResolvers<ContextType>;
  FileEdge?: FileEdgeResolvers<ContextType>;
  FileUpdatePayload?: FileUpdatePayloadResolvers<ContextType>;
  FileUploadPayload?: FileUploadPayloadResolvers<ContextType>;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  MediaDimensions?: MediaDimensionsResolvers<ContextType>;
  MediaMutation?: MediaMutationResolvers<ContextType>;
  MediaQuery?: MediaQueryResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  S3ObjectData?: S3ObjectDataResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
}>;

