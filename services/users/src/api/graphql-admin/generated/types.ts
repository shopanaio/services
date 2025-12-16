import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { ServiceContext } from '../../../context/index.js';

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
  DateTime: { input: Date; output: Date; }
  Email: { input: string; output: string; }
};

export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  usersMutation: UsersMutation;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  usersQuery: UsersQuery;
};

export type User = Node & {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserCreateInput = {
  email: Scalars['String']['input'];
};

export type UserCreatePayload = {
  __typename?: 'UserCreatePayload';
  user?: Maybe<User>;
  userErrors: Array<GenericUserError>;
};

export type UserDeleteInput = {
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UserDeletePayload = {
  __typename?: 'UserDeletePayload';
  deletedUserId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type UserError = {
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type UserUpdateInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};

export type UserUpdatePayload = {
  __typename?: 'UserUpdatePayload';
  user?: Maybe<User>;
  userErrors: Array<GenericUserError>;
};

export type UsersMutation = {
  __typename?: 'UsersMutation';
  userCreate: UserCreatePayload;
  userDelete: UserDeletePayload;
  userUpdate: UserUpdatePayload;
};


export type UsersMutationUserCreateArgs = {
  input: UserCreateInput;
};


export type UsersMutationUserDeleteArgs = {
  input: UserDeleteInput;
};


export type UsersMutationUserUpdateArgs = {
  input: UserUpdateInput;
};

export type UsersQuery = {
  __typename?: 'UsersQuery';
  node?: Maybe<Node>;
  nodes: Array<Maybe<Node>>;
  user?: Maybe<User>;
  users: UserConnection;
};


export type UsersQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type UsersQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type UsersQueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type UsersQueryUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
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
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolversTypes['User'];
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
  UserConnection: ResolverTypeWrapper<UserConnection>;
  UserCreateInput: UserCreateInput;
  UserCreatePayload: ResolverTypeWrapper<UserCreatePayload>;
  UserDeleteInput: UserDeleteInput;
  UserDeletePayload: ResolverTypeWrapper<UserDeletePayload>;
  UserEdge: ResolverTypeWrapper<UserEdge>;
  UserError: ResolversTypes['GenericUserError'];
  UserUpdateInput: UserUpdateInput;
  UserUpdatePayload: ResolverTypeWrapper<UserUpdatePayload>;
  UsersMutation: ResolverTypeWrapper<{}>;
  UsersQuery: ResolverTypeWrapper<{}>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  Email: Scalars['Email']['output'];
  GenericUserError: GenericUserError;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: {};
  Node: ResolversParentTypes['User'];
  PageInfo: PageInfo;
  Query: {};
  String: Scalars['String']['output'];
  User: User;
  UserConnection: UserConnection;
  UserCreateInput: UserCreateInput;
  UserCreatePayload: UserCreatePayload;
  UserDeleteInput: UserDeleteInput;
  UserDeletePayload: UserDeletePayload;
  UserEdge: UserEdge;
  UserError: ResolversParentTypes['GenericUserError'];
  UserUpdateInput: UserUpdateInput;
  UserUpdatePayload: UserUpdatePayload;
  UsersMutation: {};
  UsersQuery: {};
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  usersMutation?: Resolver<ResolversTypes['UsersMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'User', ParentType, ContextType>;
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
  usersQuery?: Resolver<ResolversTypes['UsersQuery'], ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserConnection'] = ResolversParentTypes['UserConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['UserEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserCreatePayload'] = ResolversParentTypes['UserCreatePayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserDeletePayload'] = ResolversParentTypes['UserDeletePayload']> = ResolversObject<{
  deletedUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserEdge'] = ResolversParentTypes['UserEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UserUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserUpdatePayload'] = ResolversParentTypes['UserUpdatePayload']> = ResolversObject<{
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UsersMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UsersMutation'] = ResolversParentTypes['UsersMutation']> = ResolversObject<{
  userCreate?: Resolver<ResolversTypes['UserCreatePayload'], ParentType, ContextType, RequireFields<UsersMutationUserCreateArgs, 'input'>>;
  userDelete?: Resolver<ResolversTypes['UserDeletePayload'], ParentType, ContextType, RequireFields<UsersMutationUserDeleteArgs, 'input'>>;
  userUpdate?: Resolver<ResolversTypes['UserUpdatePayload'], ParentType, ContextType, RequireFields<UsersMutationUserUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UsersQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UsersQuery'] = ResolversParentTypes['UsersQuery']> = ResolversObject<{
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<UsersQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<UsersQueryNodesArgs, 'ids'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<UsersQueryUserArgs, 'id'>>;
  users?: Resolver<ResolversTypes['UserConnection'], ParentType, ContextType, Partial<UsersQueryUsersArgs>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserConnection?: UserConnectionResolvers<ContextType>;
  UserCreatePayload?: UserCreatePayloadResolvers<ContextType>;
  UserDeletePayload?: UserDeletePayloadResolvers<ContextType>;
  UserEdge?: UserEdgeResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  UserUpdatePayload?: UserUpdatePayloadResolvers<ContextType>;
  UsersMutation?: UsersMutationResolvers<ContextType>;
  UsersQuery?: UsersQueryResolvers<ContextType>;
}>;
