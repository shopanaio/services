# IAM: organization roster и store-scoped access

## Статус документа

- Статус: proposed implementation plan.
- Область: IAM backend, Project federation contract, Admin UI и граница с storefront customers.
- Терминология: текущая сущность `Store` сервиса `project` является project-level scope. В документе используется `store`, а в UI допустимо отображать `Project` или `Store` в зависимости от продуктовой терминологии.
- Ограничение проекта: stage/production данных и пользователей нет, поэтому разрешен breaking cutover без длительного compatibility-периода.

## 1. Цель

Реализовать двухуровневую модель доступа сотрудников:

```text
Organization
├── organization roster
│   ├── owner
│   ├── organization admins/members
│   └── store-only employees
│
├── Store A
│   ├── Alice: admin через organization inheritance
│   ├── Bob: manager напрямую
│   └── Carol: viewer напрямую
│
└── Store B
    ├── Alice: admin через organization inheritance
    ├── Bob: no access
    └── Carol: admin напрямую
```

Требуемый результат:

- один `User` может входить в несколько organizations;
- `OrganizationMember` описывает принадлежность к команде, но не является разрешением на все stores;
- права задаются отдельно для domain `org` и каждого domain `store:<storeId>`;
- organization owner и роли с organization-level `store.*` permissions получают наследуемый доступ к stores;
- пользователь может иметь разные роли в разных stores;
- store admin может управлять участниками только своего store;
- приглашение работает до регистрации пользователя;
- удаление из organization отзывает все org/store permissions;
- customers не попадают в staff membership и не используют staff RBAC.

## 2. Архитектурные решения

### 2.1. Organization остается tenant верхнего уровня

Не превращать каждый store в отдельную organization. Organization продолжает владеть:

- stores;
- billing и ownership;
- organization settings;
- общим roster сотрудников;
- organization-level roles.

Store остается изолированным data tenant для catalog, orders, checkout, pricing, media и других commerce-сервисов.

### 2.2. Roster не равен access

`organization_member` отвечает на вопрос:

> Человек относится к команде этой организации?

`member_access` отвечает на вопрос:

> В каком scope и с какой ролью человек может работать?

Наличие строки `organization_member` само по себе не дает permissions. Единственное исключение — owner, для которого действует явный owner bypass.

### 2.3. Один прямой role на один scope

В первой версии сохранить текущую семантику:

```text
UNIQUE(member, domain)
```

Пользователь имеет не более одной прямой роли в `org` и не более одной прямой роли в каждом store. Несколько ролей на scope не вводить: текущие role definitions уже позволяют собирать необходимые permissions в custom role.

### 2.4. Relational model является source of truth

Источником membership/access состояния являются таблицы IAM:

- `organization_member`;
- `member_access`;
- `role`;
- `organization_invitation`;
- `invitation_access`.

`casbin_rule` — enforcement projection. Его можно детерминированно перестроить из relational model и role policies. Нельзя использовать наличие Casbin grouping как единственное доказательство membership.

### 2.5. Public API не принимает raw domain string

GraphQL client не должен собирать строки `store:<uuid>`. Public inputs используют typed scope:

```graphql
enum MemberAccessScopeType {
  ORGANIZATION
  STORE
}

input MemberAccessScopeInput {
  type: MemberAccessScopeType!
  storeId: ID
}
```

На resolver boundary typed scope декодируется и преобразуется во внутренний `Domain`:

- `ORGANIZATION` требует `storeId = null` и дает `org`;
- `STORE` требует `storeId` типа `GlobalIdEntity.Store` и дает `store:<uuid>`.

Raw `domain` остается внутренним Casbin/repository contract.

### 2.6. Customers — другой actor type

`iam.user` в этом плане означает пользователя Admin API. Покупатель магазина:

- не является `organization_member`;
- не получает staff roles;
- не управляется через `org.*`/`store.*` Casbin policies;
- аутентифицируется через storefront actor/session contract;
- всегда разрешается вместе со `storeId`.

Customer bounded context описан отдельным workstream в разделе 14 и не блокирует staff membership cutover.

## 3. Текущее состояние и разрывы

### 3.1. Что уже можно переиспользовать

- `role` уже содержит `organizationId` и `domain`.
- `user_role` уже уникален по `organizationId + userId + domain`.
- Casbin model уже поддерживает domain-scoped grouping.
- `StoreCreateSaga` создает `viewer`, `manager`, `admin` для `store:<id>` и назначает creator роль `admin`.
- `Store.membership` уже возвращает federation reference в IAM.
- RBAC definitions уже разделены на `Resources.org` и `Resources.store`.
- Есть событие `storeDeleted` с `storeId` и `organizationId`.

### 3.2. Что необходимо исправить

1. `MemberInviteScript` запрещает выдавать новый store access существующему organization member.
2. Приглашение требует заранее созданного `user`.
3. Store-level member mutations проверяют `org.members`, а не `store.members` целевого store.
4. `MemberRemoveScript` отзывает только domain `org` и может оставить store roles.
5. Organization role содержит `store.*` permissions, но обычный authorize выполняется только в запрошенном domain; inheritance явно не реализован.
6. `organization_member.isOwner` документирован как единственный owner, но database-level partial unique constraint отсутствует.
7. `user_role` и Casbin grouping обновляются двумя механизмами и могут разойтись.
8. `Membership.members` читается из Casbin, поэтому это список access assignments, а не полный organization roster.
9. Public GraphQL contract раскрывает внутренний `domain` и смешивает organization membership со store membership.
10. Store ownership для входного `storeId` не подтверждается Project service перед изменением IAM access.

## 4. Целевые инварианты

После реализации должны всегда выполняться следующие правила.

### 4.1. Tenant invariants

- Каждый `organization_member` принадлежит ровно одной organization.
- Каждый `member_access` принадлежит member той же organization.
- Роль access принадлежит той же organization и тому же domain.
- Domain `store:<id>` разрешен только если Store существует и принадлежит указанной organization.
- Удаленный store не имеет roles, access assignments, invitations и Casbin policies.

### 4.2. Authorization invariants

- Organization membership без role не дает доступ к organization resources.
- Direct store role действует только в одном store.
- Organization permissions не наследуются автоматически все; наследуются только явно объявленные `store.*` permissions organization role.
- Owner имеет доступ ко всем валидным resources organization и ее stores.
- Suspended member всегда получает deny, включая случай устаревшего Casbin cache.
- Store admin не может менять organization role, owner или доступ к другому store.
- Нельзя назначить role из другого domain или другой organization.
- В первой версии нет explicit deny: direct store role не может ограничить право, унаследованное от organization role.

### 4.3. Lifecycle invariants

- Pending invitation не создает active member/access.
- Invitation token хранится только в виде hash.
- Accept возможен только для email приглашения и валидного неистекшего token.
- Повторный accept идемпотентен.
- Удаление member отзывает все direct roles и все Casbin groupings этой organization.
- Suspension сохраняет configured access в relational model, но исключает его из enforcement projection до resume.

## 5. Database model

### 5.1. `organization_member`

Обновить `services/iam/src/repositories/models/authorization.ts`.

Целевая форма:

```ts
organizationMember {
  id: uuid
  organizationId: uuid
  userId: string
  status: "active" | "suspended"
  isOwner: boolean
  invitedBy: string | null
  joinedAt: timestamp
  suspendedAt: timestamp | null
  suspendedBy: string | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

Constraints/indexes:

- unique `(organization_id, user_id)`;
- unique `(id, organization_id)` для composite references;
- partial unique `(organization_id) WHERE is_owner = true`;
- check: owner не может быть suspended;
- index `(user_id, status)` для organizations/current workspace;
- index `(organization_id, status)` для roster.

`invitedBy` отражает происхождение membership после acceptance, но не заменяет invitation audit.

### 5.2. `member_access`

Создать новую таблицу вместо `user_role`:

```ts
memberAccess {
  id: uuid
  organizationId: uuid
  organizationMemberId: uuid
  domain: string
  roleId: uuid
  grantedBy: string | null
  grantedAt: timestamp
  updatedAt: timestamp
}
```

Constraints/indexes:

- unique `(organization_member_id, domain)`;
- index `(organization_id, domain)` для store team list;
- index `(organization_member_id)` для access matrix;
- composite FK `(organization_member_id, organization_id)` → `organization_member(id, organization_id)`;
- composite FK `(role_id, organization_id, domain)` → `role(id, organization_id, domain)`;
- check `domain = 'org' OR domain matches internal store UUID format`.

Для composite FK на role добавить unique key `(id, organization_id, domain)`. Это устраняет возможность привязать store access к org-role или роли другого store даже при ошибке application layer.

### 5.3. `organization_invitation`

Создать таблицу:

```ts
organizationInvitation {
  id: uuid
  organizationId: uuid
  emailNormalized: string
  status: "pending" | "accepted" | "expired" | "revoked"
  tokenHash: string
  expiresAt: timestamp
  invitedBy: string
  acceptedByUserId: string | null
  acceptedAt: timestamp | null
  revokedBy: string | null
  revokedAt: timestamp | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

Constraints/indexes:

- unique `token_hash`;
- index `(organization_id, status, created_at)`;
- index `(email_normalized, status)`;
- не допускать две эквивалентные pending invitations для одной organization/email и одинакового набора access assignments;
- status/timestamp check constraints: accepted требует `acceptedAt` и `acceptedByUserId`, revoked требует `revokedAt` и `revokedBy`.

Если PostgreSQL constraint для эквивалентного набора assignments получается чрезмерно сложным, ввести `accessSetHash` и unique partial index:

```text
UNIQUE(organization_id, email_normalized, access_set_hash)
WHERE status = 'pending'
```

### 5.4. `invitation_access`

Нормализованная таблица requested access:

```ts
invitationAccess {
  id: uuid
  invitationId: uuid
  organizationId: uuid
  domain: string
  roleId: uuid
}
```

Constraints:

- unique `(invitation_id, domain)`;
- composite role/domain/org FK, аналогичный `member_access`;
- cascade delete при удалении invitation.

Role удалять нельзя, если она используется pending invitation. Альтернативное поведение — транзакционно revoke такие invitations; для первой версии выбрать запрет с понятным `ROLE_IN_USE_BY_INVITATION`.

### 5.5. `role` и `casbin_rule`

`role` остается scope-specific:

- system org roles создаются при создании organization;
- system store roles создаются при создании store;
- custom roles принадлежат конкретному domain;
- одна role не переиспользуется между stores.

В `casbin_rule` сохранить `organizationId` и domain. Добавить repository-level операции для удаления всех rules по:

- organization + user;
- organization + domain;
- organization + role + domain.

### 5.6. Миграционная стратегия

Несмотря на отсутствие production данных, выполнять cutover проверяемыми шагами:

1. Создать новые columns/tables и constraints.
2. Backfill `member_access` из `user_role` через `(organizationId, userId)`.
3. Для orphan `user_role`, у которого нет `organization_member`, создать roster row со статусом `active` и зафиксировать anomaly count в migration notes.
4. Сравнить counts по domain и organization.
5. Перестроить Casbin grouping projection из `member_access`.
6. Переключить repositories/resolvers на `member_access`.
7. Удалить `user_role` и legacy indexes в финальной migration этого cutover.

Migration генерировать штатным npm workflow через `shopana-cli` MCP. Migration и generated schema не создавать вручную. Changeset-файл вручную не редактировать; если changeset потребуется, использовать только npm generation flow.

## 6. Internal scope model

### 6.1. Typed value object

Добавить рядом с Casbin model, но не смешивать parsing с enforcement:

```ts
type AccessScope =
  | { type: "organization"; organizationId: string; domain: "org" }
  | {
      type: "store";
      organizationId: string;
      storeId: string;
      domain: `store:${string}`;
    };
```

Функции:

- `createOrganizationScope(organizationId)`;
- `createStoreScope(organizationId, storeId)`;
- `parseDomain(domain)`;
- `toDomain(scope)`;
- `decodeGraphqlAccessScope(input)` на resolver boundary.

Не разбирать domain через `split(":")` в scripts, resolvers и repositories.

### 6.2. Проверка Store parentage

IAM не должен читать таблицы Project service напрямую. Добавить internal broker action в Project:

```ts
GetStoreAccessContextParams {
  storeId: string;
}

GetStoreAccessContextResult {
  store: {
    id: string;
    organizationId: string;
    status: string;
  } | null;
}
```

Файлы:

- `packages/broker-types/src/actions/project.ts`;
- `services/project/src/actions/index.ts`;
- IAM scope validation service.

Каждая mutation с store scope обязана проверить:

```text
store exists
AND store.organizationId == input.organizationId
AND store is not deleted
```

Результат можно request-scope batch/cache, но не кешировать без bounded TTL между запросами.

## 7. Authorization algorithm

### 7.1. Effective permission

Для organization domain:

```text
allow = siteAdmin
     OR organizationOwner
     OR directCasbin(org, resource, action)
```

Для store domain:

```text
allow = siteAdmin
     OR organizationOwner
     OR directCasbin(store:<id>, resource, action)
     OR inheritedCasbin(org, same resource, same action)
```

Перед Casbin enforcement проверить:

- member существует;
- member.status = active;
- store принадлежит organization для store-domain запроса.

Organization member lookup можно кешировать на request; cross-request cache обязан инвалидироваться при suspend/remove.

### 7.2. Почему inheritance проверяется через `org`

Organization role definitions уже могут содержать `store.*` resources. Поэтому для store request достаточно выполнить второй Casbin check в domain `org` с теми же `resource/action`.

Не назначать organization admin в synthetic `store:*` grouping: это усложнит revoke, появление новых stores и объяснение источника доступа.

### 7.3. Effective access source

API для store team должен различать:

```graphql
enum StoreAccessSource {
  DIRECT
  ORGANIZATION
  OWNER
}
```

- `DIRECT` можно изменить на уровне store;
- `ORGANIZATION` редактируется только через organization role;
- `OWNER` редактируется только ownership transfer;
- один пользователь может одновременно иметь direct и inherited access; effective permissions являются union, но UI показывает оба источника.

### 7.4. Member-management authorization

Операции должны авторизоваться по target scope, а не только по namespace mutation:

| Операция | Требование |
|---|---|
| Invite с organization role | `org.members:write` |
| Invite только в один store | `store.members:write` в этом store или inherited equivalent |
| Назначить/change store role | `store.members:write` и существующая role в target store |
| Remove store access | `store.members:admin` в target store |
| Suspend organization member | `org.members:admin` |
| Remove from organization | `org.members:admin` |
| Transfer ownership | текущий owner |
| Create/update store role | `store.roles:admin` в target store |

Если один invite содержит assignments нескольких scopes, actor должен пройти authorization для каждого assignment. Частичный success запрещен: mutation выполняется атомарно либо возвращает deny.

### 7.5. Privilege escalation

В первой версии actor с `*.members:write/admin` может назначать любую существующую role соответствующего domain. Создание и изменение role требует отдельного `*.roles:admin`.

Защитные правила:

- нельзя назначать `isOwner` через role mutation;
- нельзя менять owner role через access operation;
- store admin не может создать organization assignment;
- нельзя назначить role из другого scope;
- self-removal разрешать только как отдельную операцию `leave`, чтобы не обходить правила owner/last-admin.

## 8. Repository и projection layer

### 8.1. Разделить repositories

Текущий `OrganizationRepository` перегружен. Выделить:

```text
services/iam/src/repositories/organization/OrganizationRepository.ts
services/iam/src/repositories/membership/OrganizationMemberRepository.ts
services/iam/src/repositories/membership/MemberAccessRepository.ts
services/iam/src/repositories/invitation/InvitationRepository.ts
services/iam/src/repositories/role/RoleRepository.ts
```

`Repository.ts` остается агрегатором.

### 8.2. Основные методы

`OrganizationMemberRepository`:

- `findById(id, organizationId)`;
- `findByUser(organizationId, userId)`;
- `upsertActiveRosterMember(...)`;
- `getConnection(...)`;
- `getUserOrganizations(userId)`;
- `suspend(...)`;
- `resume(...)`;
- `remove(...)`;
- `findOwner(...)`;
- `transferOwnership(...)`.

`MemberAccessRepository`:

- `findByMemberAndDomain(...)`;
- `getByMember(...)`;
- `getByDomain(...)`;
- `upsertRole(...)`;
- `removeByDomain(...)`;
- `removeAllByMember(...)`;
- `removeAllByDomain(...)`;
- `getAccessMatrix(organizationId, memberIds)`.

`InvitationRepository`:

- `createWithAccess(...)`;
- `findPendingByTokenHash(...)`;
- `getConnection(...)`;
- `acceptCompareAndSet(...)`;
- `revokeCompareAndSet(...)`;
- `markExpired(...)`.

### 8.3. Casbin projection service

Добавить единый component, например `AccessProjectionService`:

- `applyMemberAccess(access)`;
- `removeMemberAccess(access)`;
- `removeMember(organizationId, userId)`;
- `removeDomain(organizationId, domain)`;
- `rebuildOrganization(organizationId)`;
- `rebuildMember(organizationId, memberId)`.

Все scripts вызывают projection service, а не `CasbinService.assignRole/removeRole` напрямую.

Требования:

- database writes `member_access + casbin_rule` проходят через тот же transaction manager/connection;
- in-memory enforcer обновляется только после успешного commit либо инвалидируется и лениво загружается снова;
- при ошибке обновления memory cache database остается canonical, enforcer organization удаляется из cache;
- rebuild является идемпотентным.

## 9. Scripts и lifecycle operations

Scripts остаются единственным mutation business layer и используют `@Transactional`, Zod schema и authorization provider.

### 9.1. Новые scripts

```text
scripts/membership/MemberInviteCreateScript.ts
scripts/membership/MemberInvitationAcceptScript.ts
scripts/membership/MemberInvitationRevokeScript.ts
scripts/membership/MemberOrganizationRoleSetScript.ts
scripts/membership/MemberStoreRoleSetScript.ts
scripts/membership/MemberStoreAccessRemoveScript.ts
scripts/membership/MemberSuspendScript.ts
scripts/membership/MemberResumeScript.ts
scripts/membership/MemberRemoveScript.ts
scripts/membership/MemberLeaveScript.ts
```

Legacy `MemberInviteScript`, `MemberRoleChangeScript` и `MemberAccessRemoveScript` удалить после GraphQL cutover, а не сохранять как второй путь записи.

### 9.2. Invite create flow

1. Normalize email.
2. Decode typed access inputs.
3. Verify every store through Project broker action.
4. Load roles and verify exact organization/domain match.
5. Authorize actor against every target scope.
6. Reject owner assignment.
7. Generate cryptographically secure token.
8. Store only token hash, invitation и requested access atomically.
9. Emit invitation-created event without raw token.
10. Передать raw token только notification delivery boundary; не писать его в logs, DBOS input, event payload или error.

До появления email delivery integration mutation может вернуть development-only delivery status, но не raw token в production GraphQL contract.

### 9.3. Invite accept flow

1. Hash presented token.
2. Lock pending invitation row.
3. Verify status/expiry.
4. Require authenticated user and exact normalized email match.
5. Повторно проверить stores и roles: invitation могла устареть.
6. Upsert roster member.
7. Upsert requested `member_access` records.
8. Обновить Casbin projection.
9. Compare-and-set invitation status to `accepted`.
10. Return member и effective access.

Если пользователь уже находится в roster, acceptance добавляет отсутствующие scope assignments и не возвращает `USER_ALREADY_MEMBER`.

### 9.4. Store role set flow

1. Decode member/store/role IDs.
2. Verify active roster member.
3. Verify store parentage.
4. Authorize against target store.
5. Verify role domain.
6. Upsert access, чтобы операция работала и для первого назначения, и для change.
7. Sync projection и invalidate caches.

### 9.5. Remove store access flow

- Удаляет только direct `member_access` target store.
- Не удаляет roster member.
- Не пытается убрать inherited organization permission.
- Если direct access отсутствует, возвращает idempotent success либо стабильный `ACCESS_NOT_FOUND`; выбрать idempotent success для UI retries.

### 9.6. Remove organization member flow

В одной транзакционной операции:

1. Запретить удаление owner.
2. Lock member row.
3. Удалить все `member_access` во всех domains.
4. Удалить все user groupings Casbin для organization.
5. Revoke pending invitations того же normalized email в этой organization.
6. Удалить roster member.
7. Invalidate authorization/member caches.

Возвращать global ID `OrganizationMember`, а не `Member` ID, собранный из user ID.

### 9.7. Suspend/resume

Suspend:

- сохраняет configured access;
- устанавливает status/timestamps;
- удаляет member groupings из Casbin projection;
- запрещает owner suspension.

Resume:

- переводит status в active;
- перестраивает groupings из `member_access`;
- не восстанавливает удаленные/невалидные roles.

## 10. Broker actions, events и store lifecycle

### 10.1. Broker contracts

Обновить `packages/broker-types`:

- typed `AccessScope` contracts для IAM internal actions;
- `project.getStoreAccessContext`;
- заменить generic `AssignRoleParams.domain` в store-create integration на typed `{ storeId, organizationId }` либо оставить action строго internal и валидировать domain внутри IAM;
- добавить cleanup action только если event consumer не покрывает store deletion.

### 10.2. Store creation

Сохранить orchestration в `StoreCreateSaga`, но изменить IAM API на одну идемпотентную операцию:

```text
iam.provisionStoreAccessModel({
  organizationId,
  storeId,
  creatorUserId
})
```

Операция атомарно:

- создает store system roles и policies;
- проверяет/создает creator roster membership;
- назначает creator direct store admin, если это требуется продуктовой семантикой;
- безопасно повторяется при DBOS retry.

Это заменяет отдельные `createRoles` и `assignRole`, между которыми сейчас возможен partial state.

### 10.3. Store deletion

IAM должен подписаться на существующий `storeDeleted` event.

Cleanup по `organizationId + storeId`:

- удалить `member_access` domain `store:<id>`;
- revoke pending invitations, содержащие этот domain; если invitation содержит и другие scopes, удалить только invalid assignment и revoke invitation целиком с причиной `SCOPE_DELETED`, чтобы acceptance не стал частичным;
- удалить store roles;
- удалить policies/groupings domain;
- invalidate organization enforcer/cache.

Consumer должен быть идемпотентным и не читать Project DB напрямую.

## 11. GraphQL Federation contract

### 11.1. Не использовать один `Membership` для разных понятий

Текущий `Membership` одновременно означает roles collection, assignment list и federation bridge. Заменить его типизированными API types.

Предлагаемый contract:

```graphql
type Organization {
  team: OrganizationTeam!
}

type OrganizationTeam {
  members(
    first: Int
    after: String
    where: OrganizationMemberWhereInput
  ): OrganizationMemberConnection!
  invitations(
    first: Int
    after: String
    status: InvitationStatus
  ): OrganizationInvitationConnection!
  roles: [Role!]!
}

type OrganizationMember implements Node {
  id: ID!
  user: User!
  status: OrganizationMemberStatus!
  isOwner: Boolean!
  organizationAccess: MemberAccess
  storeAccess: [MemberStoreAccess!]!
  joinedAt: DateTime!
}

type MemberAccess {
  id: ID!
  role: Role!
  grantedAt: DateTime!
  grantedBy: User
}

type MemberStoreAccess {
  store: Store!
  direct: MemberAccess
  effectiveSources: [StoreAccessSource!]!
}

type StoreTeam @key(fields: "organizationId storeId") {
  organizationId: ID!
  storeId: ID!
  members(includeInherited: Boolean = true): [StoreTeamMember!]!
  roles: [Role!]!
}

type StoreTeamMember {
  member: OrganizationMember!
  directAccess: MemberAccess
  effectiveSources: [StoreAccessSource!]!
}
```

### 11.2. Federation ownership

- IAM владеет `Organization`, `OrganizationTeam`, `OrganizationMember`, invitations и access types.
- Project владеет `Store`.
- Project добавляет `Store.team: StoreTeam!` и возвращает federation reference `{ organizationId, storeId }`.
- IAM резолвит `StoreTeam` и возвращает federation references на `Store`.
- Raw internal domain не использовать как federation key.

Файлы:

- `services/iam/src/api/graphql-admin/schema/organization.graphql`;
- новый `team.graphql`/`invitation.graphql`;
- `services/project/src/api/graphql-admin/schema/project.graphql`;
- IAM/Project resolvers и interfaces;
- generated artifacts только через codegen.

### 11.3. Mutation contract

Сделать имена операций явными:

```graphql
type OrganizationMutation {
  memberInviteCreate(input: MemberInviteCreateInput!): MemberInviteCreatePayload!
  memberInvitationRevoke(input: MemberInvitationRevokeInput!): MemberInvitationRevokePayload!
  memberOrganizationRoleSet(input: MemberOrganizationRoleSetInput!): MemberAccessPayload!
  memberStoreRoleSet(input: MemberStoreRoleSetInput!): MemberAccessPayload!
  memberStoreAccessRemove(input: MemberStoreAccessRemoveInput!): MemberAccessRemovePayload!
  memberSuspend(input: OrganizationMemberActionInput!): OrganizationMemberPayload!
  memberResume(input: OrganizationMemberActionInput!): OrganizationMemberPayload!
  memberRemove(input: OrganizationMemberActionInput!): MemberRemovePayload!
}
```

Invitation acceptance относится к auth flow и не требует organization admin namespace:

```graphql
type AuthMutation {
  invitationAccept(input: InvitationAcceptInput!): InvitationAcceptPayload!
}
```

Input rules:

- принимать `OrganizationMember.id`, а не `userId`, для member-management operations;
- store и organization IDs всегда global IDs соответствующего type;
- role принимать role global ID, а не name, чтобы custom roles и rename не создавали ambiguity;
- все payloads возвращают `userErrors`;
- успешные mutations возвращают обновленный API object, достаточный для Apollo cache/refetch.

### 11.4. Connections и pagination

Organization roster и invitations должны быть connections, а не unbounded arrays. Минимальные filters:

- member status;
- email/name search;
- owner flag;
- has direct access to store;
- organization role;
- invitation status/email.

Store team для MVP может быть connection сразу, чтобы не делать второй breaking change при росте команды.

### 11.5. Global IDs

Добавить/уточнить entities в `@shopana/shared-graphql-guid`:

- `OrganizationMember`;
- `MemberAccess`;
- `OrganizationInvitation`;
- при необходимости `StoreTeam` не обязан иметь public node ID, так как имеет federation composite key.

Не использовать `GlobalIdEntity.Member` для разных физических сущностей.

## 12. Admin implementation

### 12.1. Target UX: Organization → Team

Organization page показывает roster, а не только org-domain Casbin members.

Таблица:

| Member | Status | Organization role | Store access | Actions |
|---|---|---|---|---|
| Alice | Active | Owner | All stores (inherited) | Transfer ownership |
| Bob | Active | None | Fashion: Manager | Edit access, suspend, remove |
| Carol | Active | Member | Fashion: Viewer; Tech: Admin | Edit access, suspend, remove |

Требования:

- отдельные tabs `Members` и `Invitations`;
- organization role может быть `None`;
- store access editor показывает все доступные stores и role select для каждого;
- `No access` удаляет direct assignment;
- inherited access маркируется badge `Inherited` и не удаляется из store editor;
- owner controls недоступны обычному admin;
- destructive remove показывает, что будут отозваны все store permissions.

### 12.2. Target UX: Store → Team

Добавить store team screen/section:

- direct и inherited members;
- filter `All / Direct / Inherited`;
- store admin может invite в текущий store;
- change/remove доступны только для direct access;
- organization/owner access содержит ссылку `Manage at organization level` при наличии permission;
- пользователь без `store.members:read` не видит roster/email.

### 12.3. Invite modal

Переработать текущий modal:

1. Email.
2. Optional organization role.
3. Store access rows: Store + Role.
4. Review summary.
5. Submit invitation.

Если modal открыт из Store page:

- текущий store уже выбран;
- organization role скрыт;
- нельзя добавить другой store без соответствующих permissions;
- copy объясняет, что приглашенный появится в organization roster после acceptance.

### 12.4. Admin module structure

При cutover разнести workspace membership по module folders в соответствии с Admin GraphQL pattern:

```text
admin/src/domains/workspace/team/
  graphql/
    fragments.ts
    queries.ts
    mutations.ts
    operation-types.ts
  hooks/
  mappers/
  components/
  modals/
  page/
```

Обновить/заменить:

- `admin/src/domains/workspace/graphql/fragments.ts`;
- legacy member mutations/hooks;
- `organization/page/components/members-section`;
- `invite-member-modal`;
- `use-workspace.ts`, который сейчас ищет current user только в `organization.membership.members`;
- organization page types и modal payloads.

Generated API types импортировать напрямую из `@/graphql/types`; не создавать отдельные output view models.

### 12.5. Apollo freshness

Для первой интеграции использовать явный `refetchQueries`/page refetch после:

- invitation create/revoke;
- role set/remove;
- suspend/resume;
- member remove.

Переходить на `cache.modify` только после стабилизации connection keys и pagination policies.

## 13. Customers boundary

### 13.1. Что не делать

- Не добавлять customers в `organization_member`.
- Не выдавать customers roles `viewer/manager/admin`.
- Не использовать Admin access token в storefront.
- Не делать email покупателя глобально уникальным между независимыми stores без отдельного продуктового решения о global Shopana account.
- Не раскрывать customer profile одного store другому store той же organization автоматически.

### 13.2. Предпочтительная модель

Customer profile является store-scoped:

```text
Customer
- id
- storeId
- emailNormalized
- firstName/lastName/phone
- status: active | blocked
- verifiedAt
- createdAt/updatedAt

UNIQUE(storeId, emailNormalized)
```

Если позднее нужен единый login человека между stores, добавить отдельный `CustomerIdentity` и связи `StoreCustomer`, не объединяя store profiles:

```text
CustomerIdentity 1 ── N StoreCustomer
```

Это отдельное решение, не prerequisite текущего IAM plan.

### 13.3. Storefront context

Текущий `request.customer = null` должен быть заменен storefront authentication middleware, который устанавливает:

```ts
customer: {
  id: string;
  storeId: string;
  actorType: "customer";
}
```

Обязательные проверки:

- token audience = storefront;
- token/store context match;
- customer belongs to resolved store;
- customer not blocked;
- guest request остается допустимым там, где операция это разрешает.

Orders/checkouts продолжают хранить nullable `customerId` и immutable checkout/order PII snapshot.

### 13.4. Ownership customer domain

До реализации customer accounts принять отдельный ADR:

- какой service владеет `Customer` GraphQL entity;
- где живут customer credentials/session;
- нужен ли новый `customers` service;
- нужен ли global identity между stores.

Предпочтение: отдельный customer bounded context для profiles и отдельная storefront auth surface; IAM staff tables не расширять customer columns.

## 14. Реализация по фазам

### Phase 0. Contract freeze

- [ ] Зафиксировать `OrganizationMember = roster`, `MemberAccess = permission assignment`.
- [ ] Зафиксировать одну role на scope.
- [ ] Зафиксировать inheritance как union без explicit deny.
- [ ] Утвердить typed GraphQL scope и отказ от public raw domain.
- [ ] Утвердить, что customer workstream не входит в staff cutover.

### Phase 1. Database integrity

- [ ] Обновить `organization_member` status/owner constraints.
- [ ] Создать `member_access`.
- [ ] Создать invitation tables.
- [ ] Добавить composite keys/FKs/indexes.
- [ ] Сгенерировать migration через `shopana-cli` MCP.
- [ ] Backfill и reconciliation queries включить в migration notes.

Acceptance:

- невозможно создать access с role другого domain/org;
- невозможно иметь двух owners;
- невозможно иметь две direct roles member в одном domain.

### Phase 2. Repositories и scope validation

- [ ] Выделить membership/access/invitation/role repositories.
- [ ] Добавить typed `AccessScope`.
- [ ] Добавить Project broker action для store parentage.
- [ ] Реализовать access matrix batch reads.
- [ ] Перевести loaders с `user_role` на `member_access`.

Acceptance:

- repository API не принимает непроверенный GraphQL ID;
- store scope невозможно создать для store другой organization.

### Phase 3. Casbin projection и authorize inheritance

- [ ] Реализовать `AccessProjectionService`.
- [ ] Сделать relational tables canonical.
- [ ] Добавить org fallback для `store.*` authorization.
- [ ] Добавить active member gate.
- [ ] Реализовать cache/enforcer invalidation.
- [ ] Добавить rebuild organization/member operations.

Acceptance:

- direct store role работает только в target store;
- org admin с `store.*` permission работает во всех stores organization;
- org member без `store.*` не получает store access;
- suspended member всегда получает deny.

### Phase 4. Membership scripts

- [ ] Реализовать role set/remove для org/store.
- [ ] Реализовать full member remove.
- [ ] Реализовать suspend/resume.
- [ ] Реализовать invitation create/accept/revoke.
- [ ] Заменить store provisioning на одну идемпотентную IAM action.
- [ ] Подключить storeDeleted cleanup.

Acceptance:

- существующему roster member можно выдать доступ еще к одному store;
- store admin управляет только своим store;
- member remove не оставляет Casbin/store access;
- retries не создают duplicate access/invitations.

### Phase 5. GraphQL cutover

- [ ] Добавить team/member/access/invitation types.
- [ ] Добавить connections и filters.
- [ ] Добавить typed mutations.
- [ ] Добавить `Store.team` federation bridge.
- [ ] Обновить global ID entities.
- [ ] Удалить legacy `Membership` contract после перевода consumers.
- [ ] Выполнить schema/codegen через `shopana-cli` MCP.

Acceptance:

- Admin client не формирует `store:<uuid>`;
- roster возвращает store-only users;
- store team отличает direct и inherited access.

### Phase 6. Admin UI

- [ ] Создать workspace/team module structure.
- [ ] Перевести organization Team на roster connection.
- [ ] Реализовать access matrix/editor.
- [ ] Реализовать Invitations tab.
- [ ] Добавить Store Team screen.
- [ ] Перевести hooks/mutations на новые contracts.
- [ ] Удалить legacy member hooks и mocks после cutover.

Acceptance:

- из organization UI можно назначить разные roles по stores;
- из store UI нельзя изменить другой store/org role;
- inherited access явно обозначен;
- pending invitation не отображается как active member.

### Phase 7. Cleanup и observability

- [ ] Удалить `user_role` model/repository code.
- [ ] Удалить legacy scripts/resolvers/schema.
- [ ] Добавить structured audit logs без tokens/PII leakage.
- [ ] Добавить metrics для invitation lifecycle и projection rebuild failures.
- [ ] Обновить knowledge base multi-tenancy после стабилизации реализации.

### Phase 8. Customer identity follow-up

- [ ] Принять customer ownership ADR.
- [ ] Реализовать store-scoped Customer entity/profile.
- [ ] Реализовать storefront token/session audience.
- [ ] Заполнять storefront context customer.
- [ ] Подключить customer ownership checks в orders/checkout.

Эту фазу выполнять отдельным implementation plan после staff IAM cutover.

## 15. Security и audit requirements

### 15.1. Audit events

Фиксировать:

- invitation created/accepted/revoked/expired;
- organization/store role assigned/changed/removed;
- member suspended/resumed/removed;
- ownership transferred;
- store access model provisioned/cleaned up;
- projection rebuild started/completed/failed.

Audit payload содержит IDs, scope, old/new role и actor ID. Не содержит raw invitation token, password, access token или лишний customer PII.

### 15.2. Concurrency

- role set использует upsert по unique member/domain;
- accept блокирует invitation row и выполняет compare-and-set status;
- ownership transfer блокирует current owner/member rows и опирается на partial unique index;
- member remove и role set сериализуются через row lock member;
- store deletion cleanup допускает повторное выполнение;
- cache invalidation выполняется после успешной transaction.

### 15.3. Fail-closed behavior

Возвращать deny/error, если:

- Project service не подтвердил store parentage;
- role/domain mismatch;
- member suspended/not found;
- invitation scope устарел;
- Casbin enforcer не может надежно загрузить projection.

Нельзя при ошибке scope validation продолжать с organization-only проверкой.

## 16. Verification strategy

Согласно правилам проекта не запускать `test` и `tsc` для проверки.

Для каждой фазы:

1. Выполнить schema/migration/codegen/build только через `shopana-cli` MCP.
2. Запускать `build`, когда требуется новая собранная версия кода.
3. Выполнить ограниченный manual smoke через dev/API operations:
   - создать organization и два stores;
   - пригласить нового email в Store A;
   - принять invitation;
   - назначить тому же member другую role в Store B;
   - проверить отсутствие доступа к Store B до назначения;
   - проверить inherited org admin access;
   - удалить direct access Store A;
   - suspend/resume;
   - удалить member и убедиться в отсутствии effective access;
   - удалить Store B и убедиться в cleanup IAM domain.
4. Проверить composed Admin schema и generated Admin API types.
5. Проверить отсутствие ручных изменений generated files и changeset files.

## 17. Definition of done

Модель считается реализованной, когда:

- organization roster содержит org-level и store-only сотрудников;
- membership без access не предоставляет permissions;
- один user имеет независимые roles в разных stores;
- organization-level `store.*` permissions наследуются предсказуемо;
- store admin может управлять только direct members своего store;
- invitation не требует предварительной регистрации;
- all-scope member removal и store deletion не оставляют stale access;
- relational access и Casbin projection имеют один контролируемый write path и rebuild;
- GraphQL не раскрывает raw domain как client input;
- Admin показывает organization role, direct store roles и inherited sources;
- customers остаются store-scoped storefront actors вне staff RBAC;
- schema/codegen/build успешно выполнены штатными `shopana-cli` MCP workflows без `test` и `tsc`.

## 18. Рекомендуемый порядок pull requests

Чтобы изменения оставались reviewable:

1. **IAM schema and migration** — tables, constraints, repositories, без public API cutover.
2. **Scope validation and authorization** — Project broker contract, projection service, inheritance.
3. **Membership lifecycle** — scripts, invitations, provisioning, store deletion cleanup.
4. **GraphQL federation cutover** — team/access/invitation contracts и generated artifacts.
5. **Admin organization team** — roster, access matrix, invitations.
6. **Admin store team** — direct/inherited management.
7. **Legacy cleanup and documentation** — удалить `Membership/user_role` paths, обновить knowledge base.
8. **Customer identity ADR/plan** — отдельная серия после staff IAM.

Каждый PR должен иметь один canonical write path. Нельзя оставлять legacy и new mutations одновременно записывающими разные membership models.
