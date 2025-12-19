# Architecture: Identity Service (IAM)

## AWS Analogy

```
AWS                              Shopana
───────────────────────────      ───────────────────────────────
IAM                        =     Identity Service
├── User                         ├── User
├── Group                        ├── Project (as a group)
├── Role                         ├── Role
├── Policy                       ├── Permission
└── (internal impl)              └── Casdoor (hidden inside)

EC2, S3, Lambda...         =     Project, Orders, Checkout...
- Don't know how IAM works       - Don't know about Casdoor
- Check permissions via IAM      - Get User via Federation
- React to IAM events            - React to identity events
```

**Principle:** Just as AWS services don't manage users (IAM does that), your services shouldn't know about Casdoor.

---

## Goal

Fully abstract Casdoor behind the Identity service. Other services:
- Don't know Casdoor exists
- Work with User/Role/Permission abstraction
- Get data via GraphQL Federation
- React to events for business logic (not for data synchronization)

---

## Current Problem

```
┌─────────────┐     ┌─────────────┐
│   Users     │     │   Project   │
│   Service   │     │   Service   │
│             │     │             │
│  Casdoor ◄──┼─────┼── Casdoor ◄─┤
│  SDK        │     │  SDK        │
└─────────────┘     └─────────────┘
      ▲                   ▲
      │                   │
      └─── Duplication ───┘
```

**Problems:**
- Multiple services work directly with Casdoor
- Difficult to replace Casdoor with another IdP
- Organization in Casdoor = Project, but the relationship is implicit

---

## Target Architecture

```
                              ┌──────────────────┐
                              │     Casdoor      │
                              │                  │
                              │  Organization    │
                              │  User            │
                              │  Role            │
                              └────────┬─────────┘
                                       │
                                       │ Only Identity
                                       │ knows about Casdoor
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                      Identity Service                         │
│                                                              │
│  - Abstraction over Casdoor                                  │
│  - GraphQL: User, Member, Role                               │
│  - Listens: project.created → creates Org in Casdoor         │
│  - Publishes: member.invited, member.removed, ...            │
└──────────────────────────────────────────────────────────────┘
        │                              ▲
        │ GraphQL Federation           │ Events
        │ (User resolves here)         │
        ▼                              │
┌───────────────┐              ┌───────────────┐
│    Project    │   events     │    Orders     │
│    Service    │◄────────────►│    Service    │
│               │              │               │
│ Project       │              │ Order.user    │
│ Project.owner │              │ (via          │
│ (via          │              │  Federation)  │
│  Federation)  │              │               │
└───────────────┘              └───────────────┘
```

---

## Key Principles

### 1. No Local Copies

Services **do not store** copies of users. Data is fetched via ServiceBroker.

### 2. Communication via ServiceBroker

Using the existing `ServiceBroker` from `@shopana/shared-kernel`:

```typescript
// Actions (synchronous calls)
broker.call("identity.getUser", { userId })
broker.call("identity.checkPermission", { userId, action, resource })

// Events (asynchronous, RabbitMQ)
broker.emit("identity.member.invited", { projectId, userId })
broker.emit("project.created", { projectId, name, ownerId })
```

### 3. Client for Identity Service

```typescript
// packages/shared-service-api/src/identity/client.ts
export class IdentityClient implements IdentityApiClient {
  constructor(private readonly broker: BrokerLike) {}

  async getUser(userId: string): Promise<User | null> {
    return this.broker.call("identity.getUser", { userId });
  }

  async getUsersByIds(userIds: string[]): Promise<User[]> {
    return this.broker.call("identity.getUsersByIds", { userIds });
  }

  async checkPermission(input: CheckPermissionInput): Promise<PermissionCheck> {
    return this.broker.call("identity.checkPermission", input);
  }

  async getProjectMembers(projectId: string): Promise<Membership[]> {
    return this.broker.call("identity.getProjectMembers", { projectId });
  }
}
```

### 4. Services Store Only IDs

```typescript
// Project Service
interface Project {
  id: string;
  name: string;
  ownerId: string;  // Only ID
}

// When owner data is needed:
const owner = await identityClient.getUser(project.ownerId);

// Orders Service
interface Order {
  id: string;
  userId: string;   // Only ID
  items: OrderItem[];
}
```

### 5. Events for Business Logic

Events for **reactions**, not for synchronization:

```typescript
// Project created → Identity creates Organization in Casdoor
broker.emit("project.created", { projectId, name, ownerId })

// Member removed → Checkout cancels carts
broker.emit("identity.member.removed", { projectId, userId })
```

---

## GraphQL Federation (client requests only)

Federation is used **only** for client requests through Gateway.
Services communicate with each other via **ServiceBroker**.

```
Client → Gateway → Federation → Services (GraphQL)
Service → ServiceBroker → Another service (Actions)
```

### Identity Service — IAM for the Platform

```graphql
# services/identity/schema.graphql

# ═══════════════════════════════════════════════════════════
# User (like AWS IAM User)
# ═══════════════════════════════════════════════════════════
type User @key(fields: "id") {
  id: ID!
  email: String!
  firstName: String
  lastName: String
  avatar: String
  isActive: Boolean!

  # User's memberships in projects
  memberships: [Membership!]!
}

# ═══════════════════════════════════════════════════════════
# Membership (like AWS IAM Group membership)
# User ↔ Project relationship with a specific role
# ═══════════════════════════════════════════════════════════
type Membership @key(fields: "id") {
  id: ID!
  user: User!
  project: Project!
  role: Role!
  invitedAt: DateTime!
  joinedAt: DateTime
}

# ═══════════════════════════════════════════════════════════
# Role (like AWS IAM Role)
# ═══════════════════════════════════════════════════════════
type Role @key(fields: "id") {
  id: ID!
  name: String!              # "owner", "admin", "editor", "viewer"
  description: String
  policies: [Policy!]!       # Permissions granted by the role
  isSystem: Boolean!         # System role (cannot be deleted)
}

# ═══════════════════════════════════════════════════════════
# Policy (like AWS IAM Policy)
# Set of permissions
# ═══════════════════════════════════════════════════════════
type Policy @key(fields: "id") {
  id: ID!
  name: String!              # "ProductFullAccess", "OrderReadOnly"
  description: String
  statements: [Statement!]!
}

# ═══════════════════════════════════════════════════════════
# Statement (like AWS IAM Policy Statement)
# Specific permission
# ═══════════════════════════════════════════════════════════
type Statement {
  effect: Effect!            # ALLOW / DENY
  actions: [String!]!        # ["product:create", "product:update"]
  resources: [String!]!      # ["*"] or ["project:123/*"]
}

enum Effect {
  ALLOW
  DENY
}

# ═══════════════════════════════════════════════════════════
# Project extension (owned by Project Service)
# ═══════════════════════════════════════════════════════════
extend type Project @key(fields: "id") {
  id: ID! @external

  # Project IAM data
  memberships: [Membership!]!
  roles: [Role!]!            # Roles available in the project
  owner: User!
}

# ═══════════════════════════════════════════════════════════
# Queries
# ═══════════════════════════════════════════════════════════
type Query {
  # Current user
  me: User

  # Users
  user(id: ID!): User
  users(filter: UserFilter, pagination: Pagination): UserConnection!

  # Permission check (like AWS IAM policy evaluation)
  checkPermission(
    userId: ID!
    projectId: ID!
    action: String!
    resource: String
  ): PermissionCheck!
}

type PermissionCheck {
  allowed: Boolean!
  reason: String             # Why allowed/denied
  matchedPolicy: Policy      # Which policy matched
}

# ═══════════════════════════════════════════════════════════
# Mutations
# ═══════════════════════════════════════════════════════════
type Mutation {
  # Membership management
  inviteMember(input: InviteMemberInput!): Membership!
  updateMemberRole(membershipId: ID!, roleId: ID!): Membership!
  removeMember(membershipId: ID!): Boolean!

  # Role management (for project)
  createRole(projectId: ID!, input: CreateRoleInput!): Role!
  updateRole(roleId: ID!, input: UpdateRoleInput!): Role!
  deleteRole(roleId: ID!): Boolean!

  # Policy management
  createPolicy(input: CreatePolicyInput!): Policy!
  attachPolicyToRole(roleId: ID!, policyId: ID!): Role!
  detachPolicyFromRole(roleId: ID!, policyId: ID!): Role!
}
```

### Project Service — extends User

```graphql
# services/project/schema.graphql

type Project @key(fields: "id") {
  id: ID!
  name: String!
  ownerId: ID!
  createdAt: DateTime!
}

extend type User @key(fields: "id") {
  id: ID! @external
  projects: [Project!]!  # Projects where user is owner
}
```

### Orders Service — uses User

```graphql
# services/orders/schema.graphql

type Order @key(fields: "id") {
  id: ID!
  userId: ID!
  user: User!  # Resolves via Federation → Identity
  items: [OrderItem!]!
  total: Money!
}

extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!
}
```

### How It Works

```
Client requests:

query {
  order(id: "order-1") {
    id
    user {        # ← Federation goes to Identity
      email
      firstName
    }
    items { ... }
  }
}

Gateway:
1. Orders Service → { id, userId: "user-1", items }
2. Identity Service → user(id: "user-1") { email, firstName }
3. Merge → complete response
```

---

## ServiceBroker: Actions & Events

### Actions (registered in Identity Service)

```typescript
// services/identity/src/identity.nest-service.ts

@Injectable()
export class IdentityNestService implements OnModuleInit {
  constructor(private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    // User actions
    this.broker.register("getUser", this.getUser.bind(this));
    this.broker.register("getUsersByIds", this.getUsersByIds.bind(this));

    // Permission actions
    this.broker.register("checkPermission", this.checkPermission.bind(this));

    // Membership actions
    this.broker.register("getProjectMembers", this.getProjectMembers.bind(this));
    this.broker.register("getMembership", this.getMembership.bind(this));
  }

  private async getUser(params: { userId: string }): Promise<User | null> {
    return this.userService.findById(params.userId);
  }

  private async checkPermission(params: CheckPermissionInput): Promise<PermissionCheck> {
    return this.policyEvaluator.evaluate(params);
  }
}
```

### Events

**Project → Identity:**

```typescript
// services/project/src/scripts/createProject.ts
async function createProject(input: CreateProjectInput) {
  const project = await projectRepo.create(input);

  // Identity will create Organization in Casdoor
  await broker.emit("project.created", {
    projectId: project.id,
    name: project.name,
    ownerId: input.ownerId,
  });

  return project;
}
```

**Identity listens:**

```typescript
// services/identity/src/events/ProjectSubscriber.ts
@RabbitSubscribe({
  exchange: 'shopana.events',
  routingKey: 'project.created',
  queue: 'identity-project-events',
})
async handleProjectCreated(payload: ProjectCreatedPayload) {
  // 1. Create Organization in Casdoor
  await this.casdoorAdapter.createOrganization({
    name: `project-${payload.projectId}`,
    displayName: payload.name,
  });

  // 2. Save mapping
  await this.orgMappingRepo.create({
    projectId: payload.projectId,
    casdoorOrg: `project-${payload.projectId}`,
  });

  // 3. Add owner as first member
  await this.membershipService.create({
    projectId: payload.projectId,
    userId: payload.ownerId,
    role: "owner",
  });

  // 4. Notify others
  await this.broker.emit("identity.member.added", {
    projectId: payload.projectId,
    userId: payload.ownerId,
    role: "owner",
  });
}
```

**Identity → other services:**

```typescript
// Events published by Identity
await broker.emit("identity.member.invited", { projectId, userId, role, invitedBy });
await broker.emit("identity.member.removed", { projectId, userId, reason });
await broker.emit("identity.member.role.changed", { projectId, userId, oldRole, newRole });
await broker.emit("identity.user.blocked", { userId, reason });
```

**Other services listen:**

```typescript
// services/checkout/src/events/IdentitySubscriber.ts
@RabbitSubscribe({
  exchange: 'shopana.events',
  routingKey: 'identity.member.removed',
  queue: 'checkout-identity-events',
})
async handleMemberRemoved(payload: MemberRemovedPayload) {
  // Cancel user's carts in this project
  await this.checkoutService.abandonByUser({
    projectId: payload.projectId,
    userId: payload.userId,
  });
}
```

---

## Identity Service Structure

```
services/identity/
├── src/
│   ├── identity.module.ts
│   ├── identity.nest-service.ts     # Broker actions registration
│   │
│   ├── api/
│   │   └── graphql/                 # For Gateway (client requests)
│   │       ├── schema/
│   │       │   ├── user.graphql
│   │       │   ├── membership.graphql
│   │       │   ├── role.graphql
│   │       │   └── policy.graphql
│   │       └── resolvers/
│   │           ├── user.ts
│   │           ├── membership.ts
│   │           └── role.ts
│   │
│   ├── adapters/
│   │   └── casdoor/                 # Casdoor encapsulation
│   │       ├── CasdoorClient.ts     # SDK wrapper
│   │       ├── UserAdapter.ts       # User ↔ Casdoor User
│   │       ├── RoleAdapter.ts       # Role ↔ Casdoor Role
│   │       ├── OrgAdapter.ts        # Project ↔ Casdoor Org
│   │       └── mappers.ts
│   │
│   ├── domain/
│   │   ├── user/
│   │   │   ├── UserService.ts
│   │   │   └── UserRepository.ts
│   │   │
│   │   ├── membership/
│   │   │   ├── MembershipService.ts
│   │   │   └── MembershipRepository.ts
│   │   │
│   │   ├── role/
│   │   │   ├── RoleService.ts
│   │   │   └── RoleRepository.ts
│   │   │
│   │   ├── policy/
│   │   │   ├── PolicyService.ts
│   │   │   ├── PolicyRepository.ts
│   │   │   └── PolicyEvaluator.ts   # checkPermission logic
│   │   │
│   │   └── organization/
│   │       └── OrgMappingService.ts # projectId ↔ casdoorOrg
│   │
│   └── events/
│       └── subscribers/
│           ├── ProjectSubscriber.ts # project.created → create org
│           └── ProjectDeletedSubscriber.ts
│
├── package.json
└── tsconfig.json

packages/shared-service-api/
└── src/
    └── identity/                    # Client for other services
        ├── client.ts                # IdentityClient
        └── types.ts                 # User, Membership, PermissionCheck
```

### Comparison with AWS IAM

```
AWS IAM Component          Identity Service Component
─────────────────────      ────────────────────────────
IAM User                   domain/user/
IAM Group                  (Project via OrgMapping)
IAM Role                   domain/role/
IAM Policy                 domain/policy/
Policy Evaluation          PolicyEvaluator.ts
Identity Provider (IdP)    adapters/casdoor/
```

### Broker Actions

```
identity.getUser           → UserService.findById
identity.getUsersByIds     → UserService.findByIds
identity.checkPermission   → PolicyEvaluator.evaluate
identity.getProjectMembers → MembershipService.getByProject
identity.getMembership     → MembershipService.getById
```

### Events

```
Subscribes to:
  project.created          → Create Org in Casdoor
  project.deleted          → Delete Org in Casdoor

Publishes:
  identity.member.invited
  identity.member.removed
  identity.member.role.changed
  identity.user.blocked
  identity.user.unblocked
```

---

## Project ↔ Casdoor Organization Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                    Identity Service                          │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              org_mapping table                       │   │
│   │                                                     │   │
│   │   project_id  │  casdoor_org                        │   │
│   │   ────────────┼─────────────────────                │   │
│   │   proj_001    │  project-proj_001                   │   │
│   │   proj_002    │  project-proj_002                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   External world doesn't know about casdoor_org,            │
│   works only with projectId                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Flows

### Project Creation

```
1. Client → Project Service: createProject(name: "My Shop")
2. Project Service: creates Project { id: "proj_001", name, ownerId }
3. Project Service → EventBus: project.created
4. Identity Service (subscriber):
   - Creates Organization in Casdoor
   - Saves mapping
   - Adds owner as Member with "owner" role
5. Identity Service → EventBus: member.added
```

### Inviting User to Project

```
1. Client → Identity Service: inviteMember(projectId, email, role)
2. Identity Service:
   - Finds or creates User in Casdoor
   - Adds to Organization
   - Creates Member
3. Identity Service → EventBus: member.invited
4. Notification Service (subscriber): sends email
```

### User Data Request

```
1. Client → Gateway: query { order(id: "...") { user { name } } }
2. Gateway → Orders Service: order resolver
3. Gateway → Identity Service: User resolver (Federation)
4. Gateway: merge and return
```

---

## Configuration

```yaml
# config.yml
services:
  identity:
    ports:
      graphql: 10020
    casdoor:
      endpoint: http://localhost:9011
      client_id: app-shopana
      client_secret: xxx
      certificate: cert-shopana
    events:
      publish:
        - member.invited
        - member.removed
        - user.blocked
      subscribe:
        - project.created
        - project.deleted

  project:
    ports:
      graphql: 10030
    events:
      publish:
        - project.created
        - project.deleted
      # Does not subscribe to user events — not needed

  orders:
    ports:
      graphql: 10040
    events:
      subscribe:
        - member.removed    # Cancel orders
        - user.blocked      # Cancel orders
```

---

## Implementation Order

```
1. Create packages/events
   ├── EventBus interface
   ├── Event types
   └── Redis/RabbitMQ implementation

2. Create services/identity
   ├── Move Casdoor from users/project
   ├── GraphQL schema (User, Member, Role)
   ├── Subscribe to project.created
   └── Publish member.* events

3. Update Project Service
   ├── Remove Casdoor SDK
   ├── Publish project.created
   └── extend type User (Federation)

4. Update other services
   ├── Remove any Casdoor dependencies
   ├── Use Federation for User
   └── Subscribe to needed events

5. Delete services/users
   └── Replaced by Identity
```
