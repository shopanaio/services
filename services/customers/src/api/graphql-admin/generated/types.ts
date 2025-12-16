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
  customersMutation: CustomersMutation;
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
  customersQuery: CustomersQuery;
};

export type Customer = Node & {
  __typename?: 'Customer';
  createdAt: Scalars['DateTime']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CustomerConnection = {
  __typename?: 'CustomerConnection';
  edges: Array<CustomerEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CustomerCreateInput = {
  email: Scalars['String']['input'];
};

export type CustomerCreatePayload = {
  __typename?: 'CustomerCreatePayload';
  customer?: Maybe<Customer>;
  userErrors: Array<GenericUserError>;
};

export type CustomerDeleteInput = {
  id: Scalars['ID']['input'];
  permanent?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CustomerDeletePayload = {
  __typename?: 'CustomerDeletePayload';
  deletedCustomerId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

export type CustomerEdge = {
  __typename?: 'CustomerEdge';
  cursor: Scalars['String']['output'];
  node: Customer;
};

export type UserError = {
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

export type CustomerUpdateInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};

export type CustomerUpdatePayload = {
  __typename?: 'CustomerUpdatePayload';
  customer?: Maybe<Customer>;
  userErrors: Array<GenericUserError>;
};

export type CustomersMutation = {
  __typename?: 'CustomersMutation';
  customerCreate: CustomerCreatePayload;
  customerDelete: CustomerDeletePayload;
  customerUpdate: CustomerUpdatePayload;
};


export type CustomersMutationCustomerCreateArgs = {
  input: CustomerCreateInput;
};


export type CustomersMutationCustomerDeleteArgs = {
  input: CustomerDeleteInput;
};


export type CustomersMutationCustomerUpdateArgs = {
  input: CustomerUpdateInput;
};

export type CustomersQuery = {
  __typename?: 'CustomersQuery';
  node?: Maybe<Node>;
  nodes: Array<Maybe<Node>>;
  customer?: Maybe<Customer>;
  customers: CustomerConnection;
};


export type CustomersQueryNodeArgs = {
  id: Scalars['ID']['input'];
};


export type CustomersQueryNodesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type CustomersQueryCustomerArgs = {
  id: Scalars['ID']['input'];
};


export type CustomersQueryCustomersArgs = {
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
  Node: ResolversTypes['Customer'];
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Customer: ResolverTypeWrapper<Customer>;
  CustomerConnection: ResolverTypeWrapper<CustomerConnection>;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: ResolverTypeWrapper<CustomerCreatePayload>;
  CustomerDeleteInput: CustomerDeleteInput;
  CustomerDeletePayload: ResolverTypeWrapper<CustomerDeletePayload>;
  CustomerEdge: ResolverTypeWrapper<CustomerEdge>;
  UserError: ResolversTypes['GenericUserError'];
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: ResolverTypeWrapper<CustomerUpdatePayload>;
  CustomersMutation: ResolverTypeWrapper<{}>;
  CustomersQuery: ResolverTypeWrapper<{}>;
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
  Node: ResolversParentTypes['Customer'];
  PageInfo: PageInfo;
  Query: {};
  String: Scalars['String']['output'];
  Customer: Customer;
  CustomerConnection: CustomerConnection;
  CustomerCreateInput: CustomerCreateInput;
  CustomerCreatePayload: CustomerCreatePayload;
  CustomerDeleteInput: CustomerDeleteInput;
  CustomerDeletePayload: CustomerDeletePayload;
  CustomerEdge: CustomerEdge;
  UserError: ResolversParentTypes['GenericUserError'];
  CustomerUpdateInput: CustomerUpdateInput;
  CustomerUpdatePayload: CustomerUpdatePayload;
  CustomersMutation: {};
  CustomersQuery: {};
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
  customersMutation?: Resolver<ResolversTypes['CustomersMutation'], ParentType, ContextType>;
}>;

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Customer', ParentType, ContextType>;
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
  customersQuery?: Resolver<ResolversTypes['CustomersQuery'], ParentType, ContextType>;
}>;

export type CustomerResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Customer'] = ResolversParentTypes['Customer']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  deletedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerConnection'] = ResolversParentTypes['CustomerConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['CustomerEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerCreatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerCreatePayload'] = ResolversParentTypes['CustomerCreatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerDeletePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerDeletePayload'] = ResolversParentTypes['CustomerDeletePayload']> = ResolversObject<{
  deletedCustomerId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomerEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerEdge'] = ResolversParentTypes['CustomerEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Customer'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserError'] = ResolversParentTypes['UserError']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GenericUserError', ParentType, ContextType>;
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CustomerUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomerUpdatePayload'] = ResolversParentTypes['CustomerUpdatePayload']> = ResolversObject<{
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersMutation'] = ResolversParentTypes['CustomersMutation']> = ResolversObject<{
  customerCreate?: Resolver<ResolversTypes['CustomerCreatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerCreateArgs, 'input'>>;
  customerDelete?: Resolver<ResolversTypes['CustomerDeletePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerDeleteArgs, 'input'>>;
  customerUpdate?: Resolver<ResolversTypes['CustomerUpdatePayload'], ParentType, ContextType, RequireFields<CustomersMutationCustomerUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CustomersQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CustomersQuery'] = ResolversParentTypes['CustomersQuery']> = ResolversObject<{
  node?: Resolver<Maybe<ResolversTypes['Node']>, ParentType, ContextType, RequireFields<CustomersQueryNodeArgs, 'id'>>;
  nodes?: Resolver<Array<Maybe<ResolversTypes['Node']>>, ParentType, ContextType, RequireFields<CustomersQueryNodesArgs, 'ids'>>;
  customer?: Resolver<Maybe<ResolversTypes['Customer']>, ParentType, ContextType, RequireFields<CustomersQueryCustomerArgs, 'id'>>;
  customers?: Resolver<ResolversTypes['CustomerConnection'], ParentType, ContextType, Partial<CustomersQueryCustomersArgs>>;
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
  Customer?: CustomerResolvers<ContextType>;
  CustomerConnection?: CustomerConnectionResolvers<ContextType>;
  CustomerCreatePayload?: CustomerCreatePayloadResolvers<ContextType>;
  CustomerDeletePayload?: CustomerDeletePayloadResolvers<ContextType>;
  CustomerEdge?: CustomerEdgeResolvers<ContextType>;
  UserError?: UserErrorResolvers<ContextType>;
  CustomerUpdatePayload?: CustomerUpdatePayloadResolvers<ContextType>;
  CustomersMutation?: CustomersMutationResolvers<ContextType>;
  CustomersQuery?: CustomersQueryResolvers<ContextType>;
}>;
