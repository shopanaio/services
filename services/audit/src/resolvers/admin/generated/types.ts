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
  DateTime: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

export enum AuditAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type AuditActor = {
  __typename?: 'AuditActor';
  id: Maybe<Scalars['ID']['output']>;
  type: AuditActorType;
};

export enum AuditActorType {
  Service = 'SERVICE',
  System = 'SYSTEM',
  User = 'USER'
}

export type AuditChange = {
  __typename?: 'AuditChange';
  after: Maybe<AuditValue>;
  before: Maybe<AuditValue>;
  kind: AuditChangeKind;
  path: Scalars['String']['output'];
};

export enum AuditChangeKind {
  Add = 'ADD',
  Move = 'MOVE',
  Remove = 'REMOVE',
  Set = 'SET'
}

export type AuditEntry = Node & {
  __typename?: 'AuditEntry';
  action: AuditAction;
  actor: AuditActor;
  aggregate: AuditTarget;
  command: Scalars['String']['output'];
  eventId: Scalars['String']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  occurredAt: Scalars['DateTime']['output'];
  operations: Array<AuditOperation>;
  recordedAt: Scalars['DateTime']['output'];
  sequence: Scalars['Int']['output'];
  source: AuditSource;
};

export type AuditEntryConnection = {
  __typename?: 'AuditEntryConnection';
  edges: Array<AuditEntryEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type AuditEntryEdge = {
  __typename?: 'AuditEntryEdge';
  cursor: Scalars['String']['output'];
  node: AuditEntry;
};

export type AuditEntryWhereInput = {
  actions?: InputMaybe<Array<AuditAction>>;
  actorId?: InputMaybe<Scalars['ID']['input']>;
  aggregateId?: InputMaybe<Scalars['ID']['input']>;
  commands?: InputMaybe<Array<Scalars['String']['input']>>;
  occurredFrom?: InputMaybe<Scalars['DateTime']['input']>;
  occurredTo?: InputMaybe<Scalars['DateTime']['input']>;
  targetId?: InputMaybe<Scalars['ID']['input']>;
};

export type AuditOperation = {
  __typename?: 'AuditOperation';
  action: AuditOperationAction;
  changes: Array<AuditChange>;
  position: Scalars['Int']['output'];
  target: Maybe<AuditTarget>;
  type: Scalars['String']['output'];
};

export enum AuditOperationAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Link = 'LINK',
  Move = 'MOVE',
  Unlink = 'UNLINK',
  Update = 'UPDATE'
}

/** Store-scoped, read-only access to the aggregate mutation audit trail. */
export type AuditQuery = {
  __typename?: 'AuditQuery';
  entries: AuditEntryConnection;
  entry: Maybe<AuditEntry>;
  timeline: AuditEntryConnection;
};


/** Store-scoped, read-only access to the aggregate mutation audit trail. */
export type AuditQueryEntriesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<AuditEntryWhereInput>;
};


/** Store-scoped, read-only access to the aggregate mutation audit trail. */
export type AuditQueryEntryArgs = {
  id: Scalars['ID']['input'];
};


/** Store-scoped, read-only access to the aggregate mutation audit trail. */
export type AuditQueryTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  targetId: Scalars['ID']['input'];
};

export type AuditSource = {
  __typename?: 'AuditSource';
  correlationId: Scalars['String']['output'];
  service: Scalars['String']['output'];
  workflowId: Maybe<Scalars['String']['output']>;
};

export type AuditTarget = {
  __typename?: 'AuditTarget';
  id: Scalars['ID']['output'];
  type: Scalars['String']['output'];
};

export type AuditValue = {
  __typename?: 'AuditValue';
  state: AuditValueState;
  value: Maybe<Scalars['JSON']['output']>;
};

export enum AuditValueState {
  Masked = 'MASKED',
  Omitted = 'OMITTED',
  Visible = 'VISIBLE'
}

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  auditQuery: AuditQuery;
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
  Node: ( AuditEntry );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AuditAction: AuditAction;
  AuditActor: ResolverTypeWrapper<AuditActor>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  AuditActorType: AuditActorType;
  AuditChange: ResolverTypeWrapper<AuditChange>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  AuditChangeKind: AuditChangeKind;
  AuditEntry: ResolverTypeWrapper<AuditEntry>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AuditEntryConnection: ResolverTypeWrapper<AuditEntryConnection>;
  AuditEntryEdge: ResolverTypeWrapper<AuditEntryEdge>;
  AuditEntryWhereInput: AuditEntryWhereInput;
  AuditOperation: ResolverTypeWrapper<AuditOperation>;
  AuditOperationAction: AuditOperationAction;
  AuditQuery: ResolverTypeWrapper<AuditQuery>;
  AuditSource: ResolverTypeWrapper<AuditSource>;
  AuditTarget: ResolverTypeWrapper<AuditTarget>;
  AuditValue: ResolverTypeWrapper<AuditValue>;
  AuditValueState: AuditValueState;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Query: ResolverTypeWrapper<{}>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AuditActor: AuditActor;
  ID: Scalars['ID']['output'];
  AuditChange: AuditChange;
  String: Scalars['String']['output'];
  AuditEntry: AuditEntry;
  Int: Scalars['Int']['output'];
  AuditEntryConnection: AuditEntryConnection;
  AuditEntryEdge: AuditEntryEdge;
  AuditEntryWhereInput: AuditEntryWhereInput;
  AuditOperation: AuditOperation;
  AuditQuery: AuditQuery;
  AuditSource: AuditSource;
  AuditTarget: AuditTarget;
  AuditValue: AuditValue;
  DateTime: Scalars['DateTime']['output'];
  JSON: Scalars['JSON']['output'];
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  Boolean: Scalars['Boolean']['output'];
  Query: {};
}>;

export type AuditActorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditActor'] = ResolversParentTypes['AuditActor']> = ResolversObject<{
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['AuditActorType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditChangeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditChange'] = ResolversParentTypes['AuditChange']> = ResolversObject<{
  after?: Resolver<Maybe<ResolversTypes['AuditValue']>, ParentType, ContextType>;
  before?: Resolver<Maybe<ResolversTypes['AuditValue']>, ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['AuditChangeKind'], ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditEntryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditEntry'] = ResolversParentTypes['AuditEntry']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['AuditEntry']>, { __typename: 'AuditEntry' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  action?: Resolver<ResolversTypes['AuditAction'], ParentType, ContextType>;
  actor?: Resolver<ResolversTypes['AuditActor'], ParentType, ContextType>;
  aggregate?: Resolver<ResolversTypes['AuditTarget'], ParentType, ContextType>;
  command?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  eventId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  eventType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  occurredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  operations?: Resolver<Array<ResolversTypes['AuditOperation']>, ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  sequence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['AuditSource'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditEntryConnectionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditEntryConnection'] = ResolversParentTypes['AuditEntryConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['AuditEntryEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditEntryEdgeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditEntryEdge'] = ResolversParentTypes['AuditEntryEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['AuditEntry'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditOperationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditOperation'] = ResolversParentTypes['AuditOperation']> = ResolversObject<{
  action?: Resolver<ResolversTypes['AuditOperationAction'], ParentType, ContextType>;
  changes?: Resolver<Array<ResolversTypes['AuditChange']>, ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  target?: Resolver<Maybe<ResolversTypes['AuditTarget']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditQuery'] = ResolversParentTypes['AuditQuery']> = ResolversObject<{
  entries?: Resolver<ResolversTypes['AuditEntryConnection'], ParentType, ContextType, RequireFields<AuditQueryEntriesArgs, 'first'>>;
  entry?: Resolver<Maybe<ResolversTypes['AuditEntry']>, ParentType, ContextType, RequireFields<AuditQueryEntryArgs, 'id'>>;
  timeline?: Resolver<ResolversTypes['AuditEntryConnection'], ParentType, ContextType, RequireFields<AuditQueryTimelineArgs, 'first' | 'targetId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditSourceResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditSource'] = ResolversParentTypes['AuditSource']> = ResolversObject<{
  correlationId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  service?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workflowId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditTargetResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditTarget'] = ResolversParentTypes['AuditTarget']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuditValueResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuditValue'] = ResolversParentTypes['AuditValue']> = ResolversObject<{
  state?: Resolver<ResolversTypes['AuditValueState'], ParentType, ContextType>;
  value?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type NodeResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AuditEntry', ParentType, ContextType>;
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
  auditQuery?: Resolver<ResolversTypes['AuditQuery'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ServiceContext> = ResolversObject<{
  AuditActor?: AuditActorResolvers<ContextType>;
  AuditChange?: AuditChangeResolvers<ContextType>;
  AuditEntry?: AuditEntryResolvers<ContextType>;
  AuditEntryConnection?: AuditEntryConnectionResolvers<ContextType>;
  AuditEntryEdge?: AuditEntryEdgeResolvers<ContextType>;
  AuditOperation?: AuditOperationResolvers<ContextType>;
  AuditQuery?: AuditQueryResolvers<ContextType>;
  AuditSource?: AuditSourceResolvers<ContextType>;
  AuditTarget?: AuditTargetResolvers<ContextType>;
  AuditValue?: AuditValueResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
}>;

