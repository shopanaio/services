import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '@src/kernel/types';
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
  JSON: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export type App = {
  __typename?: 'App';
  code: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
};

export type AppsMutation = {
  __typename?: 'AppsMutation';
  /** Install application */
  install: Scalars['Boolean']['output'];
  /** Publish event (for testing) */
  publishEvent: Scalars['Boolean']['output'];
  /** Uninstall application */
  uninstall: Scalars['Boolean']['output'];
};


export type AppsMutationInstallArgs = {
  code: Scalars['String']['input'];
};


export type AppsMutationUninstallArgs = {
  code: Scalars['String']['input'];
};

export type AppsQuery = {
  __typename?: 'AppsQuery';
  /** Get list of available applications for installation */
  apps: Array<App>;
  /** Get list of installed applications */
  installedApps: Array<InstalledApp>;
};

export type InstalledApp = {
  __typename?: 'InstalledApp';
  appCode: Scalars['String']['output'];
  baseURL: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  meta?: Maybe<Scalars['JSON']['output']>;
  projectID: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  appsMutation: AppsMutation;
};

export type Query = {
  __typename?: 'Query';
  appsQuery: AppsQuery;
};

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
  App: ResolverTypeWrapper<App>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  AppsMutation: ResolverTypeWrapper<AppsMutation>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  AppsQuery: ResolverTypeWrapper<AppsQuery>;
  InstalledApp: ResolverTypeWrapper<InstalledApp>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  App: App;
  String: Scalars['String']['output'];
  AppsMutation: AppsMutation;
  Boolean: Scalars['Boolean']['output'];
  AppsQuery: AppsQuery;
  InstalledApp: InstalledApp;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Query: {};
}>;

export type AppResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['App'] = ResolversParentTypes['App']> = ResolversObject<{
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  meta?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppsMutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AppsMutation'] = ResolversParentTypes['AppsMutation']> = ResolversObject<{
  install?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<AppsMutationInstallArgs, 'code'>>;
  publishEvent?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  uninstall?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<AppsMutationUninstallArgs, 'code'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AppsQueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AppsQuery'] = ResolversParentTypes['AppsQuery']> = ResolversObject<{
  apps?: Resolver<Array<ResolversTypes['App']>, ParentType, ContextType>;
  installedApps?: Resolver<Array<ResolversTypes['InstalledApp']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InstalledAppResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InstalledApp'] = ResolversParentTypes['InstalledApp']> = ResolversObject<{
  appCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  baseURL?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  enabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  meta?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  projectID?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  appsMutation?: Resolver<ResolversTypes['AppsMutation'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  appsQuery?: Resolver<ResolversTypes['AppsQuery'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  App?: AppResolvers<ContextType>;
  AppsMutation?: AppsMutationResolvers<ContextType>;
  AppsQuery?: AppsQueryResolvers<ContextType>;
  InstalledApp?: InstalledAppResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
}>;
