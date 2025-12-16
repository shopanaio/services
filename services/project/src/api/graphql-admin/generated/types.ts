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
  DateTime: { input: any; output: any; }
  Email: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export type ApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['DateTime']['output'];
  createdById: Scalars['ID']['output'];
  dueDate: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isBanned: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  lastUsedAt: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  revokedAt: Maybe<Scalars['DateTime']['output']>;
};

export type ApiKeyActionPayload = {
  __typename?: 'ApiKeyActionPayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<UserError>;
};

export type ApiKeyCreateInput = {
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
};

export type ApiKeyCreatePayload = {
  __typename?: 'ApiKeyCreatePayload';
  apiKey: Maybe<ApiKey>;
  userErrors: Array<UserError>;
};

export type ApiKeyDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ApiKeyDeletePayload = {
  __typename?: 'ApiKeyDeletePayload';
  deletedApiKeyId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<UserError>;
};

export type ApiKeyRevokeInput = {
  id: Scalars['ID']['input'];
};

export type Currency = {
  __typename?: 'Currency';
  code: Scalars['String']['output'];
  exchangeRate: Scalars['Float']['output'];
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type CurrencySetDefaultInput = {
  currency: Scalars['String']['input'];
};

export type CurrencyUpdatePayload = {
  __typename?: 'CurrencyUpdatePayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<UserError>;
};

export enum DimensionUnit {
  Cm = 'cm',
  Ft = 'ft',
  In = 'in',
  M = 'm',
  Mm = 'mm'
}

export type Locale = {
  __typename?: 'Locale';
  code: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type LocaleCreateInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type LocaleSetDefaultInput = {
  locale: Scalars['String']['input'];
};

export type LocaleUpdateInput = {
  code: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
};

export type LocaleUpdatePayload = {
  __typename?: 'LocaleUpdatePayload';
  success: Scalars['Boolean']['output'];
  userErrors: Array<UserError>;
};

export type LocalesUpdateInput = {
  create: Array<LocaleCreateInput>;
  delete: Array<Scalars['String']['input']>;
  update: Array<LocaleUpdateInput>;
};

export type Mutation = {
  __typename?: 'Mutation';
  projectMutation: ProjectMutation;
};

export type Project = {
  __typename?: 'Project';
  country: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  defaultCurrency: Scalars['String']['output'];
  defaultLocale: Scalars['String']['output'];
  dimensionUnit: DimensionUnit;
  email: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  status: ProjectStatus;
  timezone: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  weightUnit: WeightUnit;
};

export type ProjectCreateInput = {
  country: Scalars['String']['input'];
  currency: Scalars['String']['input'];
  email?: InputMaybe<Scalars['String']['input']>;
  locales: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  status?: InputMaybe<ProjectStatus>;
  timezone?: InputMaybe<Scalars['String']['input']>;
};

export type ProjectCreatePayload = {
  __typename?: 'ProjectCreatePayload';
  project: Maybe<Project>;
  userErrors: Array<UserError>;
};

export type ProjectDeleteInput = {
  id: Scalars['ID']['input'];
};

export type ProjectDeletePayload = {
  __typename?: 'ProjectDeletePayload';
  deletedProjectId: Maybe<Scalars['ID']['output']>;
  userErrors: Array<UserError>;
};

export type ProjectInfo = {
  __typename?: 'ProjectInfo';
  country: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  dimensionUnit: DimensionUnit;
  email: Maybe<Scalars['String']['output']>;
  locale: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  timezone: Scalars['String']['output'];
  weightUnit: WeightUnit;
};

export type ProjectMutation = {
  __typename?: 'ProjectMutation';
  apiKeyCreate: ApiKeyCreatePayload;
  apiKeyDelete: ApiKeyDeletePayload;
  apiKeyRevoke: ApiKeyActionPayload;
  currencySetDefault: CurrencyUpdatePayload;
  localeSetDefault: LocaleUpdatePayload;
  localesUpdate: LocaleUpdatePayload;
  projectCreate: ProjectCreatePayload;
  projectDelete: ProjectDeletePayload;
  projectUpdate: ProjectUpdatePayload;
};


export type ProjectMutationApiKeyCreateArgs = {
  input: ApiKeyCreateInput;
};


export type ProjectMutationApiKeyDeleteArgs = {
  input: ApiKeyDeleteInput;
};


export type ProjectMutationApiKeyRevokeArgs = {
  input: ApiKeyRevokeInput;
};


export type ProjectMutationCurrencySetDefaultArgs = {
  input: CurrencySetDefaultInput;
};


export type ProjectMutationLocaleSetDefaultArgs = {
  input: LocaleSetDefaultInput;
};


export type ProjectMutationLocalesUpdateArgs = {
  input: LocalesUpdateInput;
};


export type ProjectMutationProjectCreateArgs = {
  input: ProjectCreateInput;
};


export type ProjectMutationProjectDeleteArgs = {
  input: ProjectDeleteInput;
};


export type ProjectMutationProjectUpdateArgs = {
  input: ProjectUpdateInput;
};

export type ProjectQuery = {
  __typename?: 'ProjectQuery';
  /** Get API keys for current project */
  apiKeys: Array<ApiKey>;
  /** Get currencies for current project */
  currencies: Array<Currency>;
  /** Get locales for current project */
  locales: Array<Locale>;
  /** Get a project by slug */
  project: Maybe<Project>;
  /** Get current project info */
  projectInfo: ProjectInfo;
  /** Get all projects */
  projects: Array<Project>;
};


export type ProjectQueryProjectArgs = {
  slug: Scalars['String']['input'];
};

export enum ProjectStatus {
  Active = 'active',
  Inactive = 'inactive'
}

export type ProjectUpdateInput = {
  country?: InputMaybe<Scalars['String']['input']>;
  dimensionUnit?: InputMaybe<DimensionUnit>;
  email?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  weightUnit?: InputMaybe<WeightUnit>;
};

export type ProjectUpdatePayload = {
  __typename?: 'ProjectUpdatePayload';
  project: Maybe<Project>;
  userErrors: Array<UserError>;
};

export type Query = {
  __typename?: 'Query';
  projectQuery: ProjectQuery;
};

export type UserError = {
  __typename?: 'UserError';
  code: Maybe<Scalars['String']['output']>;
  field: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export enum WeightUnit {
  G = 'g',
  Kg = 'kg',
  Lb = 'lb',
  Oz = 'oz'
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


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



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApiKey: ResolverTypeWrapper<ApiKey>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ApiKeyActionPayload: ResolverTypeWrapper<ApiKeyActionPayload>;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ResolverTypeWrapper<ApiKeyCreatePayload>;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ResolverTypeWrapper<ApiKeyDeletePayload>;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: ResolverTypeWrapper<Currency>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: ResolverTypeWrapper<CurrencyUpdatePayload>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DimensionUnit: DimensionUnit;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  Locale: ResolverTypeWrapper<Locale>;
  LocaleCreateInput: LocaleCreateInput;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdateInput: LocaleUpdateInput;
  LocaleUpdatePayload: ResolverTypeWrapper<LocaleUpdatePayload>;
  LocalesUpdateInput: LocalesUpdateInput;
  Mutation: ResolverTypeWrapper<{}>;
  Project: ResolverTypeWrapper<Project>;
  ProjectCreateInput: ProjectCreateInput;
  ProjectCreatePayload: ResolverTypeWrapper<ProjectCreatePayload>;
  ProjectDeleteInput: ProjectDeleteInput;
  ProjectDeletePayload: ResolverTypeWrapper<ProjectDeletePayload>;
  ProjectInfo: ResolverTypeWrapper<ProjectInfo>;
  ProjectMutation: ResolverTypeWrapper<ProjectMutation>;
  ProjectQuery: ResolverTypeWrapper<ProjectQuery>;
  ProjectStatus: ProjectStatus;
  ProjectUpdateInput: ProjectUpdateInput;
  ProjectUpdatePayload: ResolverTypeWrapper<ProjectUpdatePayload>;
  Query: ResolverTypeWrapper<{}>;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  UserError: ResolverTypeWrapper<UserError>;
  WeightUnit: WeightUnit;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiKey: ApiKey;
  ID: Scalars['ID']['output'];
  Boolean: Scalars['Boolean']['output'];
  String: Scalars['String']['output'];
  ApiKeyActionPayload: ApiKeyActionPayload;
  ApiKeyCreateInput: ApiKeyCreateInput;
  ApiKeyCreatePayload: ApiKeyCreatePayload;
  ApiKeyDeleteInput: ApiKeyDeleteInput;
  ApiKeyDeletePayload: ApiKeyDeletePayload;
  ApiKeyRevokeInput: ApiKeyRevokeInput;
  Currency: Currency;
  Float: Scalars['Float']['output'];
  CurrencySetDefaultInput: CurrencySetDefaultInput;
  CurrencyUpdatePayload: CurrencyUpdatePayload;
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  Locale: Locale;
  LocaleCreateInput: LocaleCreateInput;
  LocaleSetDefaultInput: LocaleSetDefaultInput;
  LocaleUpdateInput: LocaleUpdateInput;
  LocaleUpdatePayload: LocaleUpdatePayload;
  LocalesUpdateInput: LocalesUpdateInput;
  Mutation: {};
  Project: Project;
  ProjectCreateInput: ProjectCreateInput;
  ProjectCreatePayload: ProjectCreatePayload;
  ProjectDeleteInput: ProjectDeleteInput;
  ProjectDeletePayload: ProjectDeletePayload;
  ProjectInfo: ProjectInfo;
  ProjectMutation: ProjectMutation;
  ProjectQuery: ProjectQuery;
  ProjectUpdateInput: ProjectUpdateInput;
  ProjectUpdatePayload: ProjectUpdatePayload;
  Query: {};
  Timestamp: Scalars['Timestamp']['output'];
  UserError: UserError;
}>;

export type ApiKeyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdById?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isBanned?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  revokedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyActionPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyActionPayload'] = ResolversParentTypes['ApiKeyActionPayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyCreatePayload'] = ResolversParentTypes['ApiKeyCreatePayload']> = ResolversObject<{
  apiKey?: Resolver<Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ApiKeyDeletePayload'] = ResolversParentTypes['ApiKeyDeletePayload']> = ResolversObject<{
  deletedApiKeyId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Currency'] = ResolversParentTypes['Currency']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  exchangeRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CurrencyUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CurrencyUpdatePayload'] = ResolversParentTypes['CurrencyUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type LocaleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Locale'] = ResolversParentTypes['Locale']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LocaleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['LocaleUpdatePayload'] = ResolversParentTypes['LocaleUpdatePayload']> = ResolversObject<{
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  projectMutation?: Resolver<ResolversTypes['ProjectMutation'], ParentType, ContextType>;
}>;

export type ProjectResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Project'] = ResolversParentTypes['Project']> = ResolversObject<{
  country?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  defaultCurrency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  defaultLocale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProjectStatus'], ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  weightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectCreatePayload'] = ResolversParentTypes['ProjectCreatePayload']> = ResolversObject<{
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectDeletePayload'] = ResolversParentTypes['ProjectDeletePayload']> = ResolversObject<{
  deletedProjectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectInfoResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectInfo'] = ResolversParentTypes['ProjectInfo']> = ResolversObject<{
  country?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currency?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dimensionUnit?: Resolver<ResolversTypes['DimensionUnit'], ParentType, ContextType>;
  email?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phoneNumber?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timezone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  weightUnit?: Resolver<ResolversTypes['WeightUnit'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMutation'] = ResolversParentTypes['ProjectMutation']> = ResolversObject<{
  apiKeyCreate?: Resolver<ResolversTypes['ApiKeyCreatePayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyCreateArgs, 'input'>>;
  apiKeyDelete?: Resolver<ResolversTypes['ApiKeyDeletePayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyDeleteArgs, 'input'>>;
  apiKeyRevoke?: Resolver<ResolversTypes['ApiKeyActionPayload'], ParentType, ContextType, RequireFields<ProjectMutationApiKeyRevokeArgs, 'input'>>;
  currencySetDefault?: Resolver<ResolversTypes['CurrencyUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationCurrencySetDefaultArgs, 'input'>>;
  localeSetDefault?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationLocaleSetDefaultArgs, 'input'>>;
  localesUpdate?: Resolver<ResolversTypes['LocaleUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationLocalesUpdateArgs, 'input'>>;
  projectCreate?: Resolver<ResolversTypes['ProjectCreatePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectCreateArgs, 'input'>>;
  projectDelete?: Resolver<ResolversTypes['ProjectDeletePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectDeleteArgs, 'input'>>;
  projectUpdate?: Resolver<ResolversTypes['ProjectUpdatePayload'], ParentType, ContextType, RequireFields<ProjectMutationProjectUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectQuery'] = ResolversParentTypes['ProjectQuery']> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  currencies?: Resolver<Array<ResolversTypes['Currency']>, ParentType, ContextType>;
  locales?: Resolver<Array<ResolversTypes['Locale']>, ParentType, ContextType>;
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType, RequireFields<ProjectQueryProjectArgs, 'slug'>>;
  projectInfo?: Resolver<ResolversTypes['ProjectInfo'], ParentType, ContextType>;
  projects?: Resolver<Array<ResolversTypes['Project']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectUpdatePayload'] = ResolversParentTypes['ProjectUpdatePayload']> = ResolversObject<{
  project?: Resolver<Maybe<ResolversTypes['Project']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['UserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  projectQuery?: Resolver<ResolversTypes['ProjectQuery'], ParentType, ContextType>;
}>;

export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  ApiKey?: ApiKeyResolvers<ContextType>;
  ApiKeyActionPayload?: ApiKeyActionPayloadResolvers<ContextType>;
  ApiKeyCreatePayload?: ApiKeyCreatePayloadResolvers<ContextType>;
  ApiKeyDeletePayload?: ApiKeyDeletePayloadResolvers<ContextType>;
  Currency?: CurrencyResolvers<ContextType>;
  CurrencyUpdatePayload?: CurrencyUpdatePayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  Locale?: LocaleResolvers<ContextType>;
  LocaleUpdatePayload?: LocaleUpdatePayloadResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectCreatePayload?: ProjectCreatePayloadResolvers<ContextType>;
  ProjectDeletePayload?: ProjectDeletePayloadResolvers<ContextType>;
  ProjectInfo?: ProjectInfoResolvers<ContextType>;
  ProjectMutation?: ProjectMutationResolvers<ContextType>;
  ProjectQuery?: ProjectQueryResolvers<ContextType>;
  ProjectUpdatePayload?: ProjectUpdatePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Timestamp?: GraphQLScalarType;
  UserError?: UserErrorResolvers<ContextType>;
}>;

