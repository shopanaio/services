# План service-linked resources для IAM

Статус: проектный план  
Дата: 2026-07-20  
Сервисы: `services/iam`  
Целевая область: защита IAM-owned resources от generic organization mutations

Связанные документы:

- [План реализации Admin API для application auth в IAM](./application-auth-admin-api-implementation-plan.ru.md);
- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md);
- [Multi-Tenancy](../../../knowledge/vault/architecture/multi-tenancy.md).

## 1. Контекст

Часть IAM resources может быть создана или зарезервирована самим IAM сервисом
для внутренних auth realms, системных flows или future managed capabilities.
Такие объекты могут быть видимы в organization Admin API, но их lifecycle и
mutability не должны управляться обычными generic organization mutations.

Пример текущей проблемы для application: Admin Application API повторно
загружает application по `applicationId + organizationId`. Этого достаточно для
cross-organization isolation, но недостаточно для ownership boundary внутри
organization: IAM-managed application выглядит как обычный organization
application и может попасть под generic organization-level mutations.

План вводит общую IAM-механику **service-linked resource**. Она не является
частью таблицы `iam.application` и не должна менять схему `iam.application`.
Application становится только первым resource type, который может использовать
эту механику.

## 2. Аналог AWS

Целевой паттерн соответствует AWS IAM service-linked role:

- объект виден в IAM/Admin;
- объект связан с конкретным internal owner;
- owner определяет создание, изменение и удаление;
- обычные IAM/Admin API операции не должны свободно менять service-linked object;
- lifecycle и mutability защищены на backend, а не только UI.

В Shopana эквивалентом является **service-linked resource**:

```text
IAM resource
  linked to IAM internal owner
  visible through normal read models when product needs it
  mutable only through explicit IAM internal management path
```

## 3. Цели

1. Не перестраивать существующий RBAC и Casbin domains.
2. Не менять таблицу `iam.application`.
3. Сделать service-linked binding общей моделью для разных IAM resource types.
4. Разрешить показывать service-linked resources в organization views.
5. Запретить generic organization mutations для service-linked resources.
6. Разрешить изменение service-linked resources только через доверенный IAM
   internal management path.
7. Усилить write predicates за счет binding lookup:
   `organizationId + resourceType + resourceId + linkedService +
   linkedResourceType + linkedResourceId`.
8. Не использовать resource id как secret или capability token.
9. Аудировать rejected generic mutations и successful internal mutations без
   секретов.

## 4. Не входит в план

- Глубокая переработка RBAC roles, resources или Casbin domains.
- Скрытие service-linked resources из всех organization views.
- Dynamic Client Registration.
- Изменение OAuth/OIDC runtime contract.
- Выдача внешних management tokens для third-party integrations.
- Перенос ownership service-linked объектов в IAM RBAC.

## 5. Термины

**Admin-managed resource** — обычный IAM resource, созданный и изменяемый через
organization Admin API.

**Service-linked resource** — IAM resource, связанный с internal owner и
управляемый только доверенным IAM internal path.

**Protected resource** — конкретный IAM object, на который указывает binding:
например `application`, OAuth client, provider config или future IAM resource.

**Linked owner** — internal owner binding: `linkedService +
linkedResourceType + linkedResourceId`.

**Generic admin mutation** — существующие mutations в organization Admin API,
которые работают с organization-level resources.

**Internal management path** — broker/domain API внутри IAM, который вызывается
только доверенным backend кодом и проверяет service-linked binding.

## 6. Target model

Не добавлять management metadata в `iam.application`.

Добавить отдельную IAM-owned таблицу bindings:

```ts
type ServiceLinkedResourceKind =
  | "application"
  | "application_auth_configuration"
  | "application_auth_provider"
  | "oauth_client";

type ServiceLinkedService = "iam";
type ServiceLinkedOwnerType = "application_realm";

serviceLinkedResource.id: uuid
serviceLinkedResource.organizationId: uuid
serviceLinkedResource.resourceKind: ServiceLinkedResourceKind
serviceLinkedResource.resourceId: uuid
serviceLinkedResource.linkedService: ServiceLinkedService
serviceLinkedResource.linkedOwnerType: ServiceLinkedOwnerType
serviceLinkedResource.linkedOwnerId: uuid
serviceLinkedResource.createdAt: timestamp
serviceLinkedResource.createdBy: uuid | null
serviceLinkedResource.deletedAt: timestamp | null
```

Инварианты:

```text
resourceKind + resourceId identify the protected IAM resource
linkedService + linkedOwnerType + linkedOwnerId identify the internal owner

active binding:
  deletedAt IS NULL

admin-managed resource:
  no active binding exists for organizationId + resourceKind + resourceId

service-linked resource:
  active binding exists for organizationId + resourceKind + resourceId
```

Уникальность active binding:

```sql
UNIQUE (organization_id, resource_kind, resource_id)
WHERE deleted_at IS NULL
```

Для IAM-managed application:

```text
resourceKind = application
resourceId = application.id
linkedService = iam
linkedOwnerType = application_realm
linkedOwnerId = internal realm id
```

## 7. GraphQL/Admin поведение

### 7.1. Read operations

Organization Admin API может возвращать both admin-managed и service-linked
resources.

Для application GraphQL type можно добавить read-only management projection,
который собирается отдельным field resolver / loader через
`ServiceLinkedResourceRepository`, а не через колонки в `iam.application`, не
через изменение `ApplicationRepository` и не через organization repository:

```graphql
enum ResourceManagementMode {
  ADMIN
  SERVICE_LINKED
}

enum ServiceLinkedService {
  IAM
}

enum ServiceLinkedOwnerType {
  APPLICATION_REALM
}

type ResourceManagement {
  mode: ResourceManagementMode!
  linkedService: ServiceLinkedService
  linkedOwnerType: ServiceLinkedOwnerType
  linkedOwnerId: ID
  mutableFromOrganizationAdmin: Boolean!
}

type Application {
  ...
  management: ResourceManagement!
}
```

Для `SERVICE_LINKED` UI может показывать read-only badge:

```text
Managed by IAM
```

Это только presentation. Security boundary находится в IAM Policy/AuthProvider
layer.

### 7.2. Generic organization mutations

Generic mutations должны reject resource через Policy/AuthProvider, если для
protected resource существует active service-linked binding.

Для application surface это включает:

- application metadata update;
- application archive;
- auth configuration update;
- auth method update;
- provider configure/update/rotate/delete;
- OAuth client create/update/archive/secret rotation;
- application user admin mutations, если они меняют state managed realm;
- любые будущие mutations, если они не opt-in internal.

Ошибка:

```text
code: RESOURCE_SERVICE_LINKED
message: Resource is managed by linked service
```

Application-specific resolver может маппить это в legacy code
`APPLICATION_SERVICE_LINKED`, если UI уже ожидает такой код. Базовый domain error
должен быть resource-level.

### 7.3. Internal IAM mutations

IAM internal code не должен вызывать generic organization mutations для
service-linked updates.

Нужен общий internal backend path, который авторизуется через Policy/AuthProvider
как linked owner и затем вызывает существующую business mutation implementation:

```ts
iam.updateServiceLinkedResource({
  organizationId,
  resourceKind,
  resourceId,
  linkedService: "iam",
  linkedOwnerType: "application_realm",
  linkedOwnerId,
  expectedRevision,
  patch,
})
```

Для application auth можно иметь thin wrapper только как adapter входного
контракта. Он не должен копировать validation, patch building, revision, audit
или repository write logic:

```ts
iam.updateServiceLinkedApplicationAuth({
  organizationId,
  applicationId,
  linkedService: "iam",
  linkedOwnerType: "application_realm",
  linkedOwnerId,
  expectedRevision,
  patch,
})
```

В IAM этот path передает `linkedOwner` context в Policy/AuthProvider. Именно
Policy/AuthProvider обязан проверить binding с полным predicate:

```sql
WHERE service_linked_resource.organization_id = :organizationId
  AND service_linked_resource.resource_kind = :resourceKind
  AND service_linked_resource.resource_id = :resourceId
  AND service_linked_resource.linked_service = 'iam'
  AND service_linked_resource.linked_owner_type = 'application_realm'
  AND service_linked_resource.linked_owner_id = :linkedOwnerId
  AND service_linked_resource.deleted_at IS NULL
```

После успешной Policy decision path переиспользует существующую business
mutation implementation для конкретного resource type. Revision, validation,
audit и invalidation не должны обходиться.

## 8. Backend enforcement

### 8.1. Граница изменений в коде

Service-linked модель должна быть внедрена как часть **Policy authorization
boundary**, а не как часть бизнес-логики application auth, providers, OAuth
clients, application users, application repositories или organization
repositories.

Все generic organization operations должны становиться linked-service aware
только через Policy/AuthProvider decision. Business services и repositories не
должны самостоятельно знать, что resource является service-linked.

Это жесткое архитектурное ограничение плана:

```text
service-linked enforcement belongs to Policy/AuthProvider only
business service layer remains service-linked unaware
application/organization repository layer remains service-linked unaware
```

Под "business service layer" здесь понимаются сервисы, которые реализуют
application auth, provider, OAuth client, application user и organization
business rules. Они не должны получать новые branches, guards, DTO fields или
отдельные service-linked methods.

Разрешенные места, где код может знать поля:

```text
linkedService
linkedOwnerType
linkedOwnerId
resourceKind
resourceId
```

1. Drizzle model и migration для `iam.service_linked_resource`.
2. `ServiceLinkedResourceRepository` / dedicated lookup helpers, используемые
   только Policy/AuthProvider layer и internal provisioning orchestration.
3. `Policy` / `AuthProvider` extension, который отвечает за organization admin
   mutability и trusted owner predicate.
4. Internal IAM provisioning/orchestration path, который создает resource +
   binding в одной transaction.
5. GraphQL read-only field resolver `Application.management`, который читает
   projection через service-linked lookup, не меняя `ApplicationRepository`.
6. Audit safe diff allowlist для rejected generic writes.

Запрещено:

1. Добавлять `linkedService`, `linkedOwnerType`, `linkedOwnerId` в обычные
   business input DTO для generic Admin mutations.
2. Передавать `serviceLinkedBinding` в application auth/provider/OAuth client
   бизнес-методы как часть основной mutation logic.
3. Дублировать существующие mutations в отдельных методах вроде
   `updateServiceLinkedApplicationAuth`, если они копируют validation, patch
   building, revision handling или audit из generic path.
4. Разветвлять business validation по признаку service-linked. Правила auth
   configuration, provider credentials, OAuth clients и users остаются общими.
5. Расширять generic provisioning input так, чтобы обычный create path знал о
   service-linked ownership. Binding создается external orchestrator-ом внутри
   trusted IAM internal transaction.
6. Менять application repository или organization repository для service-linked
   enforcement. Они остаются обычными persistence/read repositories.
7. Добавлять service-linked joins/lookups в `ApplicationRepository`,
   `ApplicationAuthAdminMutationRepository.findScope()`,
   `ApplicationOAuthClientRepository.findManagementScope()` или organization
   repositories.
8. Добавлять `assertServiceLinked*`, `assertAdminMutable`,
   `executeServiceLinked*` или аналогичные service-linked методы в business
   services.
9. Менять существующую business validation, patch construction, revision
   handling, audit или invalidation logic ради service-linked enforcement.
10. Проверять service-linked binding после входа в business mutation body. Если
    mutation начала выполнять business logic, Policy decision уже должна быть
    принята.

Обязательно:

1. Generic Admin write path обязан передавать `protectedResource` в
   Policy/AuthProvider до выполнения business mutation.
2. Trusted IAM internal write path обязан передавать `linkedOwner` в
   Policy/AuthProvider до выполнения business mutation.
3. Policy/AuthProvider является единственным backend enforcement point для
   service-linked mutability.
4. Business services продолжают видеть только существующие authorization result
   и существующие business inputs.
5. Любой новый write surface для protected IAM resource должен добавлять
   `protectedResource` / `linkedOwner` в Policy call, а не service-linked guard в
   service/repository method.

Практическое правило:

```text
generic Admin write:
  authorize through Policy/AuthProvider with concrete protectedResource
  load existing business scope
  execute existing business mutation unchanged

trusted IAM internal write:
  authorize through Policy/AuthProvider with linkedOwner
  execute the same existing business mutation implementation unchanged
```

Отличаться должны только authorization/management predicate wrappers. Revision,
Zod validation, domain invariants, patch building, repository writes, audit и
invalidation должны переиспользоваться из существующих implementation paths.

### 8.2. Policy resource context

Policy/AuthProvider должен получать не только RBAC resource/action, но и
конкретный protected resource reference. Это позволяет Policy layer проверить
service-linked binding до выполнения business mutation.

```ts
type ProtectedResourceKind =
  | "application"
  | "application_auth_configuration"
  | "application_auth_provider"
  | "oauth_client";

interface ProtectedResourceRef {
  organizationId: string;
  resourceKind: ProtectedResourceKind;
  resourceId: string;
}

interface LinkedOwnerRef extends ProtectedResourceRef {
  linkedService: "iam";
  linkedOwnerType: "application_realm";
  linkedOwnerId: string;
}

interface AuthorizeParams {
  subject?: string;
  organizationId?: string;
  domain?: string;
  resource: string;
  action: string;
  protectedResource?: ProtectedResourceRef;
  linkedOwner?: LinkedOwnerRef;
}
```

`protectedResource` используется generic Admin writes. `linkedOwner` используется
только trusted IAM internal paths.

`Policy` decorator / manual `authorizer.authorize()` calls должны передавать
`protectedResource` для mutations, которые меняют protected IAM resources:

```ts
await authorizer.authorize({
  subject: actor.id,
  organizationId,
  domain: "org",
  resource: "org.application-auth",
  action: "write",
  protectedResource: {
    organizationId,
    resourceKind: "application",
    resourceId: applicationId,
  },
});
```

Если API использует `@Policy`, resource reference должен задаваться resolver-ом
из params, аналогично `organizationId`:

```ts
@Policy<UpdateApplicationAuthInput>({
  resource: "org.application-auth",
  action: "write",
  organizationId: (_, params) => params.organizationId,
  protectedResource: (_, params) => ({
    organizationId: params.organizationId,
    resourceKind: "application",
    resourceId: params.applicationId,
  }),
})
```

Если текущий `@Policy` contract не поддерживает `protectedResource`, план
требует расширить Policy/AuthorizeParams contract. Не подменять это repository
guard-ом.

### 8.3. Policy decision rules

Policy/AuthProvider после обычной RBAC проверки выполняет service-linked
enforcement только когда передан `protectedResource`.

Generic Admin write:

```text
1. Validate domain/resource/action against @shopana/rbac.
2. Check platform admin / organization owner / Casbin as before.
3. If RBAC denies, deny as before.
4. If RBAC allows and protectedResource is absent, allow as before.
5. If RBAC allows and protectedResource is present, lookup active binding:
   organizationId + resourceKind + resourceId + deletedAt IS NULL.
6. If binding does not exist, allow.
7. If binding exists, deny with RESOURCE_SERVICE_LINKED.
```

Trusted linked-owner write:

```text
1. Skip organization-admin mutability check only when linkedOwner is present.
2. Lookup active binding by full predicate:
   organizationId + resourceKind + resourceId +
   linkedService + linkedOwnerType + linkedOwnerId + deletedAt IS NULL.
3. If binding matches, allow the same business mutation implementation to run.
4. If binding does not match, deny as not found/forbidden according to boundary
   mapping.
```

Active binding lookup for generic Admin write uses:

```text
organizationId
resourceKind = application
resourceId = applicationId
deletedAt IS NULL
```

Если binding найден, Policy/AuthProvider возвращает denial that is mapped to:

```text
code: RESOURCE_SERVICE_LINKED
message: Resource is managed by linked service
```

Safe details для audit можно сформировать внутри Policy denial metadata или
error mapper, но эти details не должны становиться частью business scope.

### 8.4. Admin write integration

В generic organization mutations service-linked enforcement должен происходить
через существующий authorization call, до `requireScope()` или до write
execution. Локальный `assertAuthorized()` может остаться wrapper-ом, но он должен
передавать `protectedResource` в Policy/AuthProvider:

```ts
executeExisting({
  ...
  protectedResource: {
    organizationId,
    resourceKind: "application",
    resourceId: applicationId,
  },
})
```

Read-only queries не вызывают этот guard.

### 8.5. Internal management policy

Добавить отдельный internal management wrapper / broker action, который вызывает
Policy/AuthProvider as linked owner, но не отдельную копию бизнес-операции:

```ts
async executeAsLinkedOwner(input, actorOrServiceContext) {
  await authorizer.authorize({
    subject: actorOrServiceContext.subject,
    organizationId: input.organizationId,
    domain: "org",
    resource: input.rbacResource,
    action: "write",
    linkedOwner: {
      organizationId: input.organizationId,
      resourceKind: input.resourceKind,
      resourceId: input.resourceId,
      linkedService: input.linkedService,
      linkedOwnerType: input.linkedOwnerType,
      linkedOwnerId: input.linkedOwnerId,
    },
  });

  return executeExistingBusinessMutation(input.patch, actorOrServiceContext);
}
```

Internal wrapper не должен обходить revision, validation, audit и invalidation.
Он не должен копировать patch construction из generic mutation. Отличие только в
Policy authorization source.

### 8.6. Code evidence for required changes

Каждое требуемое изменение должно иметь code evidence: текущую точку в коде,
наблюдаемый gap и целевое изменение. Без такой привязки изменение не считается
готовым к реализации.

| Требование | Code evidence в текущем коде | Gap | Целевое изменение |
| --- | --- | --- | --- |
| Service-linked enforcement должен идти через Policy/AuthProvider | `services/iam/src/kernel/Authorizable.ts`: `authorize(params)` уже является IAM authorization boundary: subject resolution, site admin bypass, organization owner bypass, Casbin check | `AuthorizeParams` сейчас содержит только RBAC `resource/action/domain/organizationId`; нет `protectedResource`/`linkedOwner` context | Расширить `AuthorizeParams` и IAM `AuthProvider.authorize()` service-linked decision logic |
| `@Policy` должен уметь передавать protected resource reference | `knowledge/vault/packages/shared-kernel/decorators.md` описывает `PolicyOptions`: `resource`, `action`, `organizationId`, optional `domain` | `PolicyOptions` не содержит resolver для concrete protected resource | Расширить Policy contract: `protectedResource?: (self, params) => ProtectedResourceRef`, `linkedOwner?: ...` для internal paths |
| Generic Admin application/auth writes должны стать linked-service aware до business logic | `services/iam/src/services/ApplicationAuthAdminManagementService.ts`: `assertAuthorized()` вызывает `authorizer.authorize()` до `requireScope()` / write execution | `assertAuthorized()` передает только `subject`, `organizationId`, `domain`, `resource`, `action`; нет concrete resource id | Расширить local authorization wrapper параметром `protectedResource` и передавать его в `authorizer.authorize()` |
| Generic OAuth client writes должны стать linked-service aware до business logic | `services/iam/src/services/ApplicationOAuthClientManagementService.ts`: `executeWrite()` вызывает `assertAuthorized()` до `requireScope()` и `input.execute()` | OAuth write authorization не передает `applicationId` как protected resource context | Расширить OAuth authorization wrapper параметром `protectedResource` без добавления service-linked checks в OAuth business logic |
| Business scopes не должны содержать service-linked details | `services/iam/src/repositories/ApplicationAuthAdminMutationRepository.ts`: `ApplicationAuthAdminMutationScope` содержит только `organizationId`, `applicationId`, `archived`, `configuration`, `deliveryConfigured` | Это правильная граница, которую нельзя ломать | Не добавлять `serviceLinkedBinding` в scope; любые active binding lookups выполняются только Policy/AuthProvider layer |
| OAuth management scope не должен содержать service-linked details | `services/iam/src/repositories/ApplicationOAuthClientRepository.ts`: `ApplicationOAuthClientManagementScope` содержит `organizationId`, `applicationId`, `resource`, `realmEnabled` | Это правильная business scope форма | Не добавлять `serviceLinkedBinding`; enforcement идет через Policy/AuthProvider перед `requireScope()` |
| Application/organization repositories не должны получать service-linked joins | `services/iam/src/repositories/ApplicationRepository.ts`: read model выбирает application/auth/organization данные без service-linked ownership | Добавление `Application.management` не должно менять этот repository | Реализовать management read projection отдельным field resolver / loader через `ServiceLinkedResourceRepository` |
| Generic provisioning DTO не должен знать `serviceLinked` | `services/iam/src/repositories/ApplicationAuthConfigurationRepository.ts`: `ProvisionApplicationInput` содержит `organizationId`, `name`, `displayName`, `description`, `configuration` | Это правильная generic create boundary | Не добавлять `serviceLinked` в `ProvisionApplicationInput`; internal orchestrator создает binding отдельно в той же transaction |
| Нужен dedicated binding repository для Policy layer | `services/iam/src/repositories/Repository.ts` агрегирует существующие repositories; dedicated `ServiceLinkedResourceRepository` отсутствует в current tree | Policy/AuthProvider не имеет allowed lookup helper для binding | Добавить `ServiceLinkedResourceRepository` и подключить его к repository aggregator только как dependency для Policy/AuthProvider/internal orchestration |
| Denial metadata должен маппиться в audit без протекания в business scope | `ApplicationAuthAdminManagementService.appendFailureAudit()` и OAuth audit wrappers уже централизуют failure audit вокруг authorization/write wrappers | Сейчас authorization возвращает boolean, поэтому нет typed denial reason/details | Расширить Policy/AuthProvider result/error mapping так, чтобы `RESOURCE_SERVICE_LINKED` и safe diff формировались у boundary/error mapper, не в business mutation |

Implementation PR must keep this evidence table true. Если код меняется так, что
evidence устаревает, план нужно обновить до реализации.

## 9. Provisioning changes

### 9.1. Create resource path

Не расширять `iam.application` columns.

Generic create path для protected resource остается обычным business create path
и не принимает service-linked ownership input.

Trusted IAM internal provisioning orchestrator должен уметь в одной transaction:

1. создать сам resource обычным способом;
2. если resource должен быть service-linked, создать запись binding в
   `iam.service_linked_resource`.

Admin GraphQL create path не создает binding. Такой resource остается
admin-managed.

Trusted IAM internal provisioning path обязан передавать полный service-linked
binding только в orchestration layer, не в generic business DTO:

```ts
await provisionServiceLinkedApplication({
  application: existingProvisionApplicationInput,
  binding: {
    linkedService: "iam",
    linkedOwnerType: "application_realm",
    linkedOwnerId,
  },
});
```

### 9.2. Internal provisioning

IAM internal provisioning для application должен создавать:

```text
iam.application row
iam.service_linked_resource row:
  resourceKind = application
  resourceId = application.id
  linkedService = iam
  linkedOwnerType = application_realm
  linkedOwnerId = internal realm id
```

Если создание binding не удалось, transaction должна откатить создание resource.
Обычный `provisionApplication()` / Admin create API не должен знать о
`serviceLinked` и не должен создавать binding.

## 10. Database migration

Не менять `iam.application`.

Добавить новую таблицу:

```sql
CREATE TABLE iam.service_linked_resource (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  resource_kind varchar(64) NOT NULL,
  resource_id uuid NOT NULL,
  linked_service varchar(64) NOT NULL,
  linked_owner_type varchar(64) NOT NULL,
  linked_owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL,
  created_by uuid,
  deleted_at timestamp with time zone
);
```

Добавить constraints:

```sql
resource_kind IN (
  'application',
  'application_auth_configuration',
  'application_auth_provider',
  'oauth_client'
)

linked_service IN ('iam')
linked_owner_type IN ('application_realm')
```

Добавить indexes:

```sql
CREATE UNIQUE INDEX uq_service_linked_resource_active
  ON iam.service_linked_resource (
    organization_id,
    resource_kind,
    resource_id
  )
  WHERE deleted_at IS NULL;

CREATE INDEX idx_service_linked_owner_active
  ON iam.service_linked_resource (
    organization_id,
    linked_service,
    linked_owner_type,
    linked_owner_id
  )
  WHERE deleted_at IS NULL;
```

Так как проект pre-production, план исходит из чистого schema transition.
Existing resources остаются admin-managed, пока для них нет active binding.

## 11. Audit

Generic admin mutation against service-linked resource:

```text
category = iam_resource_admin
action = attempted action
outcome = failure
reasonCategory = authorization
safeDiff = {
  blockedByServiceLinkedBinding: true,
  resourceKind,
  linkedService: "iam",
  linkedOwnerType: "application_realm"
}
```

Successful internal IAM mutation:

```text
category = iam_resource_admin
actorType = platform_admin | internal_service
organizationId
resourceKind
resourceId
targetType
targetId
safeDiff allowlist only
```

Секреты provider/client/session/token values не попадают в audit.

## 12. Contract tests

Добавить pending/real contract scenarios:

1. Organization application created through Admin API has no active
   service-linked binding.
2. IAM internal provisioning creates application and active binding in one
   transaction.
3. Organization application list returns service-linked application with read-only
   management metadata from binding lookup.
4. Generic `applicationUpdate` rejects application with active binding.
5. Generic `authConfigurationUpdate` rejects application with active binding.
6. Generic provider credential rotation rejects provider/resource with active
   binding.
7. Generic OAuth client mutation rejects OAuth client/resource with active
   binding.
8. IAM internal mutation succeeds for matching
   `organizationId + resourceKind + resourceId + linked binding`.
9. IAM internal mutation fails for mismatched linked owner id.
10. IAM internal mutation fails for foreign organization.
11. Removing or soft-deleting binding makes resource admin-managed only if the
    lifecycle explicitly allows unlinking.
12. Audit contains safe failure record for rejected generic write.
13. Service-linked internal path reuses the same business mutation
    implementation as generic Admin path; no duplicated
    `updateServiceLinked*` business method exists.
14. Generic business scopes and create/update DTOs do not contain
    `serviceLinkedBinding`, `linkedService`, `linkedOwnerType` or
    `linkedOwnerId`.
15. Generic Admin mutation denial is produced by Policy/AuthProvider when
    `protectedResource` has active binding, not by application/OAuth/organization
    repository logic.
16. Application and organization repositories have no service-linked imports,
    joins or ownership predicates.
17. Business service layer has no `assertServiceLinked*`, `assertAdminMutable`,
    `executeServiceLinked*` or similar linked-service enforcement methods.

## 13. Rollout sequence

1. Add `iam.service_linked_resource` table, constraints and indexes.
2. Add Drizzle model and generated types for binding table.
3. Add dedicated `ServiceLinkedResourceRepository` methods for active binding
   lookup.
4. Extend GraphQL `Application.management` with a dedicated read-only field
   resolver/loader from binding lookup; do not change application or
   organization repositories.
5. Extend `Policy` / `AuthorizeParams` to accept `protectedResource` and
   `linkedOwner` context.
6. Keep existing business scopes free of `linkedService`, `linkedOwnerType`,
   `linkedOwnerId` and `serviceLinkedBinding`.
7. Add service-linked binding checks inside IAM `AuthProvider` / Policy decision
   flow, using `ServiceLinkedResourceRepository`.
8. Add internal IAM broker/orchestrator action that authorizes as linked owner
   through Policy and then reuses existing business mutation implementation.
9. Update IAM internal provisioning orchestrator to create resource + binding
   transactionally without changing generic create DTOs.
10. Add contract tests.
11. Run build when code implementation is complete.

## 14. Open decisions

1. Error mapping: expose generic `RESOURCE_SERVICE_LINKED` to Admin UI or map to
   resource-specific codes like `APPLICATION_SERVICE_LINKED`?
2. Which initial resource kinds must be protected in v1 besides `application`?
3. Should service-linked binding be soft-deleted only through owner lifecycle?
4. Should `resource_id` and `linked_owner_id` stay UUID columns or become text to
   support future non-UUID resources?
5. Should Admin UI display service-linked resources in the same list or a
   separate read-only section?

## 15. Recommended decisions

1. Use generic `RESOURCE_SERVICE_LINKED` in domain code and optionally map to
   resource-specific codes at GraphQL boundary.
2. Start v1 with `application`; keep schema generic so OAuth clients/providers can
   opt in without another table change.
3. Allow unlink/archive/delete only from IAM internal lifecycle workflow.
4. Use UUID for both ids now because identifier conventions require UUID values.
5. Show in organization settings with read-only badge.

## 16. Acceptance criteria

- `iam.application` schema remains unchanged.
- Service-linked state is stored in separate IAM binding table.
- The binding model supports more than application resources.
- IAM-managed service-linked application is visible but read-only in organization
  application management.
- Generic Admin GraphQL mutations cannot update resources with active
  service-linked binding because Policy/AuthProvider denies the write.
- IAM internal path can update its own linked resource through a full management
  predicate evaluated by Policy/AuthProvider.
- Existing business mutation implementations are not duplicated for
  service-linked paths.
- Existing business scopes and generic mutation DTOs do not expose
  `linkedService`, `linkedOwnerType`, `linkedOwnerId` or
  `serviceLinkedBinding`.
- Existing business services do not contain service-linked enforcement methods,
  branches, guards or duplicated mutation implementations.
- Application repositories and organization repositories do not contain
  service-linked joins, lookups, guards or ownership-specific DTO fields.
- Service-linked write enforcement is implemented through Policy/AuthProvider
  using `protectedResource` / `linkedOwner`.
- Every protected write path checks more than resource id: at minimum
  `organizationId + resourceKind + resourceId + linkedService + linkedOwnerType +
  linkedOwnerId`.
- Admin-created resources have no active service-linked binding by default.
- RBAC resources/domains remain unchanged.
