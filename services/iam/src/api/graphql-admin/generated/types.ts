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
  DateTime: { input: string; output: string; }
  Email: { input: string; output: string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

/** Input for assigning domain role. */
export type AssignDomainRoleInput = {
  /** Domain path (e.g., "project:abc-123" or "*" for all). */
  domain: Scalars['String']['input'];
  /** Member ID. */
  memberId: Scalars['ID']['input'];
  /** Role to assign. */
  role: Scalars['String']['input'];
};

export type AssignDomainRolePayload = {
  __typename?: 'AssignDomainRolePayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

/** Authentication tokens returned after organization switch. */
export type AuthPayload = {
  __typename?: 'AuthPayload';
  /** JWT access token with organizationId claim. */
  accessToken: Scalars['String']['output'];
  /** Token expiration time in seconds. */
  expiresIn: Scalars['Int']['output'];
  /** Refresh token for obtaining new access tokens. */
  refreshToken: Scalars['String']['output'];
};

/** Authentication tokens. */
export type AuthToken = {
  __typename?: 'AuthToken';
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

/** Input for creating an organization. */
export type CreateOrganizationInput = {
  /** Organization name. */
  name: Scalars['String']['input'];
  /** URL-friendly unique identifier. */
  slug: Scalars['String']['input'];
};

export type CreateOrganizationPayload = {
  __typename?: 'CreateOrganizationPayload';
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
};

export type DeleteOrganizationPayload = {
  __typename?: 'DeleteOrganizationPayload';
  deletedOrganizationId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/**
 * Domain-scoped role assignment.
 * Represents user's role in a specific domain (e.g., project).
 */
export type DomainAccess = {
  __typename?: 'DomainAccess';
  /** Domain path (e.g., "project:abc-123" or "*" for all). */
  domain: Scalars['String']['output'];
  /** Role in this domain. */
  role: Scalars['String']['output'];
};

/** A generic user error type for mutation responses. */
export type GenericUserError = UserError & {
  __typename?: 'GenericUserError';
  code?: Maybe<Scalars['String']['output']>;
  field?: Maybe<Array<Scalars['String']['output']>>;
  message: Scalars['String']['output'];
};

/** Input for inviting a member to organization. */
export type InviteMemberInput = {
  /** Email address of the user to invite. */
  email: Scalars['Email']['input'];
  /** Organization-level role. */
  orgRole: OrgRole;
  /** Optional role IDs to assign. */
  roleIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type InviteMemberPayload = {
  __typename?: 'InviteMemberPayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

/** Locale/language code. */
export enum LocaleCode {
  De = 'de',
  En = 'en',
  Es = 'es',
  Fr = 'fr',
  Pl = 'pl',
  Ru = 'ru',
  Uk = 'uk'
}

/** Member of an organization with org-level role and project access. */
export type Member = {
  __typename?: 'Member';
  /** Timestamp when the member joined. */
  createdAt: Scalars['DateTime']['output'];
  /** Domain-scoped role assignments (e.g., per-project roles). */
  domainAccess: Array<DomainAccess>;
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** Organization-level role (owner, admin, member). */
  orgRole: OrgRole;
  /** User reference. */
  user: User;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Organization management mutations. */
  organizationMutation: OrganizationMutation;
  /** Role management mutations. */
  roleMutation: RoleMutation;
  /** User management mutations. */
  userMutation: UserMutation;
};

/** Organization-level role. */
export enum OrgRole {
  /** Manage org settings and members. */
  Admin = 'ADMIN',
  /** Basic org access, needs project roles for resource access. */
  Member = 'MEMBER',
  /** Full org control - billing, delete org, transfer ownership. */
  Owner = 'OWNER'
}

/**
 * Organization - top level entity for multi-tenancy.
 * Users belong to organizations, organizations contain projects.
 */
export type Organization = {
  __typename?: 'Organization';
  /**
   * Available resources for role editor.
   * Aggregated from all registered services.
   */
  availableResources: Array<ResourceDefinition>;
  /** Timestamp when the organization was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Unique identifier. */
  id: Scalars['ID']['output'];
  /** All members of this organization. */
  members: Array<Member>;
  /** Organization name (e.g., "Acme Corp"). */
  name: Scalars['String']['output'];
  /** All roles defined in this organization. */
  roles: Array<Role>;
  /** URL-friendly unique identifier. */
  slug: Scalars['String']['output'];
  /** Timestamp when the organization was last updated. */
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

/** Organization mutations. */
export type OrganizationMutation = {
  __typename?: 'OrganizationMutation';
  /**
   * Assign domain role to member.
   * Requires: org admin.
   */
  assignDomainRole: AssignDomainRolePayload;
  /**
   * Create a new organization.
   * Current user becomes the owner.
   */
  createOrganization: CreateOrganizationPayload;
  /**
   * Delete organization.
   * Requires: org owner.
   */
  deleteOrganization: DeleteOrganizationPayload;
  /**
   * Invite member to organization.
   * Requires: org admin or owner.
   */
  inviteMember: InviteMemberPayload;
  /**
   * Remove domain access from member.
   * Requires: org admin.
   */
  removeDomainAccess: RemoveDomainAccessPayload;
  /**
   * Remove member from organization.
   * Requires: org admin or owner.
   * Cannot remove self or owner.
   */
  removeMember: RemoveMemberPayload;
  /**
   * Switch organization context.
   * Returns new JWT tokens with organizationId claim.
   */
  switchOrganization: SwitchOrganizationPayload;
  /**
   * Update organization.
   * Requires: org admin or owner.
   */
  updateOrganization: UpdateOrganizationPayload;
};


/** Organization mutations. */
export type OrganizationMutationAssignDomainRoleArgs = {
  input: AssignDomainRoleInput;
};


/** Organization mutations. */
export type OrganizationMutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


/** Organization mutations. */
export type OrganizationMutationInviteMemberArgs = {
  input: InviteMemberInput;
};


/** Organization mutations. */
export type OrganizationMutationRemoveDomainAccessArgs = {
  input: RemoveDomainAccessInput;
};


/** Organization mutations. */
export type OrganizationMutationRemoveMemberArgs = {
  memberId: Scalars['ID']['input'];
};


/** Organization mutations. */
export type OrganizationMutationSwitchOrganizationArgs = {
  organizationId: Scalars['ID']['input'];
};


/** Organization mutations. */
export type OrganizationMutationUpdateOrganizationArgs = {
  input: UpdateOrganizationInput;
};

/** Permission effect. */
export enum PermissionEffect {
  /** Allow the action. */
  Allow = 'ALLOW',
  /** Deny the action (takes priority over ALLOW). */
  Deny = 'DENY'
}

/** Project team member with assigned role. */
export type ProjectMember = {
  __typename?: 'ProjectMember';
  /** Date when role was assigned. */
  grantedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who assigned the role. */
  grantedBy?: Maybe<User>;
  /** User ID. */
  id: Scalars['ID']['output'];
  /** Assigned role. */
  role: Role;
  /** User. */
  user: User;
};

/** Input for removing a member. */
export type ProjectMemberRemoveInput = {
  /** User ID to remove. */
  userId: Scalars['ID']['input'];
};

export type ProjectMemberRemovePayload = {
  __typename?: 'ProjectMemberRemovePayload';
  removedUserId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Input for changing member role. */
export type ProjectMemberRoleChangeInput = {
  /** New role name. */
  newRole: Scalars['String']['input'];
  /** User ID. */
  userId: Scalars['ID']['input'];
};

export type ProjectMemberRoleChangePayload = {
  __typename?: 'ProjectMemberRoleChangePayload';
  member?: Maybe<ProjectMember>;
  userErrors: Array<GenericUserError>;
};

export type Query = {
  __typename?: 'Query';
  /**
   * Check authorization for current user.
   * Used for server-side permission checks.
   * For client-side checks, use project.roles + user.role.
   */
  authorize: AuthorizePayload;
  /** Get current organization context (from JWT). */
  currentOrganization?: Maybe<Organization>;
  /** Get current user's organizations. */
  myOrganizations: Array<Organization>;
  /** Get organization by ID (if user has access). */
  organization?: Maybe<Organization>;
  /** Get current authenticated user. */
  userQuery: UserQuery;
};


export type QueryAuthorizeArgs = {
  input: AuthorizeInput;
};


export type QueryOrganizationArgs = {
  id: Scalars['ID']['input'];
};

/** Input for removing domain access. */
export type RemoveDomainAccessInput = {
  /** Domain path to remove access from. */
  domain: Scalars['String']['input'];
  /** Member ID. */
  memberId: Scalars['ID']['input'];
};

export type RemoveDomainAccessPayload = {
  __typename?: 'RemoveDomainAccessPayload';
  member?: Maybe<Member>;
  userErrors: Array<GenericUserError>;
};

export type RemoveMemberPayload = {
  __typename?: 'RemoveMemberPayload';
  removedMemberId?: Maybe<Scalars['ID']['output']>;
  userErrors: Array<GenericUserError>;
};

/** Resource definition for role editor UI. */
export type ResourceDefinition = {
  __typename?: 'ResourceDefinition';
  /** Available actions for resource. */
  actions: Array<Scalars['String']['output']>;
  /** Display name. */
  displayName?: Maybe<Scalars['String']['output']>;
  /** Resource name (product, order, etc.). */
  name: Scalars['String']['output'];
  /** Service name (inventory, orders, etc.). */
  service: Scalars['String']['output'];
};

/** Project role with permissions. */
export type Role = {
  __typename?: 'Role';
  /** Role creation date. */
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  /** Role description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name. */
  displayName: Scalars['String']['output'];
  /** System role (owner, admin, manager, support, viewer) cannot be deleted. */
  isSystem: Scalars['Boolean']['output'];
  /** Unique role name (e.g.: owner, admin, content-editor). */
  name: Scalars['String']['output'];
  /** Role permissions. */
  permissions: Array<RolePermission>;
};

/** Input for creating a role. */
export type RoleCreateInput = {
  /** Description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Display name. */
  displayName: Scalars['String']['input'];
  /** Unique role name (slug). */
  name: Scalars['String']['input'];
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
  /** Role name to delete. */
  name: Scalars['String']['input'];
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
   * Remove member from team.
   * Requires: project.team:remove permission.
   * Cannot remove self (use leaveProject).
   * Cannot remove project owner.
   */
  projectMemberRemove: ProjectMemberRemovePayload;
  /**
   * Change member's role.
   * Requires: project.team:write permission.
   * Cannot change own role.
   * Cannot assign role higher than own.
   */
  projectMemberRoleChange: ProjectMemberRoleChangePayload;
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
export type RoleMutationProjectMemberRemoveArgs = {
  input: ProjectMemberRemoveInput;
};


/** Role mutations. */
export type RoleMutationProjectMemberRoleChangeArgs = {
  input: ProjectMemberRoleChangeInput;
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
  /**
   * Allowed actions (e.g.: create, read, update, delete).
   * Supports wildcard: *.
   */
  actions: Array<Scalars['String']['output']>;
  /**
   * Effect: ALLOW or DENY.
   * DENY takes priority over ALLOW.
   */
  effect: PermissionEffect;
  /**
   * Resource name (e.g.: product, order, project/settings).
   * Supports wildcards: *, product/*, order/*.
   */
  resource: Scalars['String']['output'];
};

/** Input for role permission. */
export type RolePermissionInput = {
  /** Actions (create, read, update, delete, *). */
  actions: Array<Scalars['String']['input']>;
  /** Effect: ALLOW or DENY. */
  effect: PermissionEffect;
  /** Resource (product, order, *, product/*). */
  resource: Scalars['String']['input'];
};

/** Input for updating a role. */
export type RoleUpdateInput = {
  /** New description. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** New display name. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** Role name to update. */
  name: Scalars['String']['input'];
  /** New permissions (completely replaces existing). */
  permissions?: InputMaybe<Array<RolePermissionInput>>;
};

export type RoleUpdatePayload = {
  __typename?: 'RoleUpdatePayload';
  role?: Maybe<Role>;
  userErrors: Array<GenericUserError>;
};

export type SwitchOrganizationPayload = {
  __typename?: 'SwitchOrganizationPayload';
  /** New tokens with organizationId claim. */
  auth?: Maybe<AuthPayload>;
  /** The organization switched to. */
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
};

/** Input for updating organization. */
export type UpdateOrganizationInput = {
  /** New name. */
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOrganizationPayload = {
  __typename?: 'UpdateOrganizationPayload';
  organization?: Maybe<Organization>;
  userErrors: Array<GenericUserError>;
};

/** User type representing admin users (CMS/backoffice). */
export type User = {
  __typename?: 'User';
  /** URL to user's avatar image. */
  avatar?: Maybe<Scalars['String']['output']>;
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
  /** User's last name. */
  lastName?: Maybe<Scalars['String']['output']>;
  /** User's locale/language preference. */
  locale?: Maybe<LocaleCode>;
  /**
   * User's role name in current project context.
   * Returns null if no project context.
   */
  role?: Maybe<Scalars['String']['output']>;
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
  signIn: UserSignInPayload;
  signOut: UserSignOutPayload;
  signUp: UserSignUpPayload;
  tokenRefresh: UserTokenRefreshPayload;
  userUpdateEmail: UserUpdateEmailPayload;
  userUpdatePassword: UserUpdatePasswordPayload;
  userUpdateProfile: UserUpdateProfilePayload;
};


export type UserMutationSignInArgs = {
  input: UserSignInInput;
};


export type UserMutationSignOutArgs = {
  input: UserSignOutInput;
};


export type UserMutationSignUpArgs = {
  input: UserSignUpInput;
};


export type UserMutationTokenRefreshArgs = {
  input: UserTokenRefreshInput;
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
  /** Get current authenticated admin user */
  current?: Maybe<User>;
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
  token?: Maybe<AuthToken>;
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
  token?: Maybe<AuthToken>;
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
  token?: Maybe<AuthToken>;
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
  UserError: ( GenericUserError );
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AssignDomainRoleInput: AssignDomainRoleInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  AssignDomainRolePayload: ResolverTypeWrapper<AssignDomainRolePayload>;
  AuthPayload: ResolverTypeWrapper<AuthPayload>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  AuthToken: ResolverTypeWrapper<AuthToken>;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: ResolverTypeWrapper<AuthorizePayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationPayload: ResolverTypeWrapper<CreateOrganizationPayload>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteOrganizationPayload: ResolverTypeWrapper<DeleteOrganizationPayload>;
  DomainAccess: ResolverTypeWrapper<DomainAccess>;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  GenericUserError: ResolverTypeWrapper<GenericUserError>;
  InviteMemberInput: InviteMemberInput;
  InviteMemberPayload: ResolverTypeWrapper<InviteMemberPayload>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LocaleCode: LocaleCode;
  Member: ResolverTypeWrapper<Member>;
  Mutation: ResolverTypeWrapper<{}>;
  OrgRole: OrgRole;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationMutation: ResolverTypeWrapper<OrganizationMutation>;
  PermissionEffect: PermissionEffect;
  ProjectMember: ResolverTypeWrapper<ProjectMember>;
  ProjectMemberRemoveInput: ProjectMemberRemoveInput;
  ProjectMemberRemovePayload: ResolverTypeWrapper<ProjectMemberRemovePayload>;
  ProjectMemberRoleChangeInput: ProjectMemberRoleChangeInput;
  ProjectMemberRoleChangePayload: ResolverTypeWrapper<ProjectMemberRoleChangePayload>;
  Query: ResolverTypeWrapper<{}>;
  RemoveDomainAccessInput: RemoveDomainAccessInput;
  RemoveDomainAccessPayload: ResolverTypeWrapper<RemoveDomainAccessPayload>;
  RemoveMemberPayload: ResolverTypeWrapper<RemoveMemberPayload>;
  ResourceDefinition: ResolverTypeWrapper<ResourceDefinition>;
  Role: ResolverTypeWrapper<Role>;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: ResolverTypeWrapper<RoleCreatePayload>;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: ResolverTypeWrapper<RoleDeletePayload>;
  RoleMutation: ResolverTypeWrapper<RoleMutation>;
  RolePermission: ResolverTypeWrapper<RolePermission>;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: ResolverTypeWrapper<RoleUpdatePayload>;
  SwitchOrganizationPayload: ResolverTypeWrapper<SwitchOrganizationPayload>;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPayload: ResolverTypeWrapper<UpdateOrganizationPayload>;
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
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AssignDomainRoleInput: AssignDomainRoleInput;
  String: Scalars['String']['output'];
  ID: Scalars['ID']['output'];
  AssignDomainRolePayload: AssignDomainRolePayload;
  AuthPayload: AuthPayload;
  Int: Scalars['Int']['output'];
  AuthToken: AuthToken;
  AuthorizeInput: AuthorizeInput;
  AuthorizePayload: AuthorizePayload;
  Boolean: Scalars['Boolean']['output'];
  CreateOrganizationInput: CreateOrganizationInput;
  CreateOrganizationPayload: CreateOrganizationPayload;
  DateTime: Scalars['DateTime']['output'];
  DeleteOrganizationPayload: DeleteOrganizationPayload;
  DomainAccess: DomainAccess;
  Email: Scalars['Email']['output'];
  GenericUserError: GenericUserError;
  InviteMemberInput: InviteMemberInput;
  InviteMemberPayload: InviteMemberPayload;
  JSON: Scalars['JSON']['output'];
  Member: Member;
  Mutation: {};
  Organization: Organization;
  OrganizationMutation: OrganizationMutation;
  ProjectMember: ProjectMember;
  ProjectMemberRemoveInput: ProjectMemberRemoveInput;
  ProjectMemberRemovePayload: ProjectMemberRemovePayload;
  ProjectMemberRoleChangeInput: ProjectMemberRoleChangeInput;
  ProjectMemberRoleChangePayload: ProjectMemberRoleChangePayload;
  Query: {};
  RemoveDomainAccessInput: RemoveDomainAccessInput;
  RemoveDomainAccessPayload: RemoveDomainAccessPayload;
  RemoveMemberPayload: RemoveMemberPayload;
  ResourceDefinition: ResourceDefinition;
  Role: Role;
  RoleCreateInput: RoleCreateInput;
  RoleCreatePayload: RoleCreatePayload;
  RoleDeleteInput: RoleDeleteInput;
  RoleDeletePayload: RoleDeletePayload;
  RoleMutation: RoleMutation;
  RolePermission: RolePermission;
  RolePermissionInput: RolePermissionInput;
  RoleUpdateInput: RoleUpdateInput;
  RoleUpdatePayload: RoleUpdatePayload;
  SwitchOrganizationPayload: SwitchOrganizationPayload;
  UpdateOrganizationInput: UpdateOrganizationInput;
  UpdateOrganizationPayload: UpdateOrganizationPayload;
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

export type AssignDomainRolePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AssignDomainRolePayload'] = ResolversParentTypes['AssignDomainRolePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  expiresIn?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  refreshToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthTokenResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['AuthToken'] = ResolversParentTypes['AuthToken']> = ResolversObject<{
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

export type CreateOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['CreateOrganizationPayload'] = ResolversParentTypes['CreateOrganizationPayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DeleteOrganizationPayload'] = ResolversParentTypes['DeleteOrganizationPayload']> = ResolversObject<{
  deletedOrganizationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DomainAccessResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['DomainAccess'] = ResolversParentTypes['DomainAccess']> = ResolversObject<{
  domain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type GenericUserErrorResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['GenericUserError'] = ResolversParentTypes['GenericUserError']> = ResolversObject<{
  code?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  field?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type InviteMemberPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['InviteMemberPayload'] = ResolversParentTypes['InviteMemberPayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Member'] = ResolversParentTypes['Member']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Member']>, { __typename: 'Member' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  domainAccess?: Resolver<Array<ResolversTypes['DomainAccess']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orgRole?: Resolver<ResolversTypes['OrgRole'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  organizationMutation?: Resolver<ResolversTypes['OrganizationMutation'], ParentType, ContextType>;
  roleMutation?: Resolver<ResolversTypes['RoleMutation'], ParentType, ContextType>;
  userMutation?: Resolver<ResolversTypes['UserMutation'], ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Organization']>, { __typename: 'Organization' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  availableResources?: Resolver<Array<ResolversTypes['ResourceDefinition']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['Member']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['Role']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationMutationResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['OrganizationMutation'] = ResolversParentTypes['OrganizationMutation']> = ResolversObject<{
  assignDomainRole?: Resolver<ResolversTypes['AssignDomainRolePayload'], ParentType, ContextType, RequireFields<OrganizationMutationAssignDomainRoleArgs, 'input'>>;
  createOrganization?: Resolver<ResolversTypes['CreateOrganizationPayload'], ParentType, ContextType, RequireFields<OrganizationMutationCreateOrganizationArgs, 'input'>>;
  deleteOrganization?: Resolver<ResolversTypes['DeleteOrganizationPayload'], ParentType, ContextType>;
  inviteMember?: Resolver<ResolversTypes['InviteMemberPayload'], ParentType, ContextType, RequireFields<OrganizationMutationInviteMemberArgs, 'input'>>;
  removeDomainAccess?: Resolver<ResolversTypes['RemoveDomainAccessPayload'], ParentType, ContextType, RequireFields<OrganizationMutationRemoveDomainAccessArgs, 'input'>>;
  removeMember?: Resolver<ResolversTypes['RemoveMemberPayload'], ParentType, ContextType, RequireFields<OrganizationMutationRemoveMemberArgs, 'memberId'>>;
  switchOrganization?: Resolver<ResolversTypes['SwitchOrganizationPayload'], ParentType, ContextType, RequireFields<OrganizationMutationSwitchOrganizationArgs, 'organizationId'>>;
  updateOrganization?: Resolver<ResolversTypes['UpdateOrganizationPayload'], ParentType, ContextType, RequireFields<OrganizationMutationUpdateOrganizationArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMember'] = ResolversParentTypes['ProjectMember']> = ResolversObject<{
  grantedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  grantedBy?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberRemovePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMemberRemovePayload'] = ResolversParentTypes['ProjectMemberRemovePayload']> = ResolversObject<{
  removedUserId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectMemberRoleChangePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ProjectMemberRoleChangePayload'] = ResolversParentTypes['ProjectMemberRoleChangePayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['ProjectMember']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  authorize?: Resolver<ResolversTypes['AuthorizePayload'], ParentType, ContextType, RequireFields<QueryAuthorizeArgs, 'input'>>;
  currentOrganization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  myOrganizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, RequireFields<QueryOrganizationArgs, 'id'>>;
  userQuery?: Resolver<ResolversTypes['UserQuery'], ParentType, ContextType>;
}>;

export type RemoveDomainAccessPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveDomainAccessPayload'] = ResolversParentTypes['RemoveDomainAccessPayload']> = ResolversObject<{
  member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RemoveMemberPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RemoveMemberPayload'] = ResolversParentTypes['RemoveMemberPayload']> = ResolversObject<{
  removedMemberId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResourceDefinitionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['ResourceDefinition'] = ResolversParentTypes['ResourceDefinition']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  service?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['Role'] = ResolversParentTypes['Role']> = ResolversObject<{
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isSystem?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['RolePermission']>, ParentType, ContextType>;
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
  projectMemberRemove?: Resolver<ResolversTypes['ProjectMemberRemovePayload'], ParentType, ContextType, RequireFields<RoleMutationProjectMemberRemoveArgs, 'input'>>;
  projectMemberRoleChange?: Resolver<ResolversTypes['ProjectMemberRoleChangePayload'], ParentType, ContextType, RequireFields<RoleMutationProjectMemberRoleChangeArgs, 'input'>>;
  roleCreate?: Resolver<ResolversTypes['RoleCreatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleCreateArgs, 'input'>>;
  roleDelete?: Resolver<ResolversTypes['RoleDeletePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleDeleteArgs, 'input'>>;
  roleUpdate?: Resolver<ResolversTypes['RoleUpdatePayload'], ParentType, ContextType, RequireFields<RoleMutationRoleUpdateArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RolePermissionResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RolePermission'] = ResolversParentTypes['RolePermission']> = ResolversObject<{
  actions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['PermissionEffect'], ParentType, ContextType>;
  resource?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type RoleUpdatePayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['RoleUpdatePayload'] = ResolversParentTypes['RoleUpdatePayload']> = ResolversObject<{
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SwitchOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['SwitchOrganizationPayload'] = ResolversParentTypes['SwitchOrganizationPayload']> = ResolversObject<{
  auth?: Resolver<Maybe<ResolversTypes['AuthPayload']>, ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UpdateOrganizationPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UpdateOrganizationPayload'] = ResolversParentTypes['UpdateOrganizationPayload']> = ResolversObject<{
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['User']>, { __typename: 'User' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  emailVerified?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isAdmin?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isDeleted?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  isForbidden?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  locale?: Resolver<Maybe<ResolversTypes['LocaleCode']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
  signIn?: Resolver<ResolversTypes['UserSignInPayload'], ParentType, ContextType, RequireFields<UserMutationSignInArgs, 'input'>>;
  signOut?: Resolver<ResolversTypes['UserSignOutPayload'], ParentType, ContextType, RequireFields<UserMutationSignOutArgs, 'input'>>;
  signUp?: Resolver<ResolversTypes['UserSignUpPayload'], ParentType, ContextType, RequireFields<UserMutationSignUpArgs, 'input'>>;
  tokenRefresh?: Resolver<ResolversTypes['UserTokenRefreshPayload'], ParentType, ContextType, RequireFields<UserMutationTokenRefreshArgs, 'input'>>;
  userUpdateEmail?: Resolver<ResolversTypes['UserUpdateEmailPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateEmailArgs, 'input'>>;
  userUpdatePassword?: Resolver<ResolversTypes['UserUpdatePasswordPayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdatePasswordArgs, 'input'>>;
  userUpdateProfile?: Resolver<ResolversTypes['UserUpdateProfilePayload'], ParentType, ContextType, RequireFields<UserMutationUserUpdateProfileArgs, 'input'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserQueryResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserQuery'] = ResolversParentTypes['UserQuery']> = ResolversObject<{
  current?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSignInPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserSignInPayload'] = ResolversParentTypes['UserSignInPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
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
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userErrors?: Resolver<Array<ResolversTypes['GenericUserError']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserTokenRefreshPayloadResolvers<ContextType = ServiceContext, ParentType extends ResolversParentTypes['UserTokenRefreshPayload'] = ResolversParentTypes['UserTokenRefreshPayload']> = ResolversObject<{
  token?: Resolver<Maybe<ResolversTypes['AuthToken']>, ParentType, ContextType>;
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
  AssignDomainRolePayload?: AssignDomainRolePayloadResolvers<ContextType>;
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  AuthToken?: AuthTokenResolvers<ContextType>;
  AuthorizePayload?: AuthorizePayloadResolvers<ContextType>;
  CreateOrganizationPayload?: CreateOrganizationPayloadResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteOrganizationPayload?: DeleteOrganizationPayloadResolvers<ContextType>;
  DomainAccess?: DomainAccessResolvers<ContextType>;
  Email?: GraphQLScalarType;
  GenericUserError?: GenericUserErrorResolvers<ContextType>;
  InviteMemberPayload?: InviteMemberPayloadResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Member?: MemberResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationMutation?: OrganizationMutationResolvers<ContextType>;
  ProjectMember?: ProjectMemberResolvers<ContextType>;
  ProjectMemberRemovePayload?: ProjectMemberRemovePayloadResolvers<ContextType>;
  ProjectMemberRoleChangePayload?: ProjectMemberRoleChangePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  RemoveDomainAccessPayload?: RemoveDomainAccessPayloadResolvers<ContextType>;
  RemoveMemberPayload?: RemoveMemberPayloadResolvers<ContextType>;
  ResourceDefinition?: ResourceDefinitionResolvers<ContextType>;
  Role?: RoleResolvers<ContextType>;
  RoleCreatePayload?: RoleCreatePayloadResolvers<ContextType>;
  RoleDeletePayload?: RoleDeletePayloadResolvers<ContextType>;
  RoleMutation?: RoleMutationResolvers<ContextType>;
  RolePermission?: RolePermissionResolvers<ContextType>;
  RoleUpdatePayload?: RoleUpdatePayloadResolvers<ContextType>;
  SwitchOrganizationPayload?: SwitchOrganizationPayloadResolvers<ContextType>;
  UpdateOrganizationPayload?: UpdateOrganizationPayloadResolvers<ContextType>;
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

