# План service-linked application для store-managed IAM realms

Статус: проектный план  
Дата: 2026-07-20  
Сервисы: `services/iam`, `services/project`  
Целевая область: защита store-created IAM application от generic organization mutations

Связанные документы:

- [План реализации Admin API для application auth в IAM](./application-auth-admin-api-implementation-plan.ru.md);
- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md);
- [Multi-Tenancy](../../../knowledge/vault/architecture/multi-tenancy.md);
- [RBAC System Specification](../../../docs/store-roles-design.md).

## 1. Контекст

При создании store `StoreCreateSaga` создает IAM application через broker action
`iam.createApplication`, сохраняет полученный `applicationId` в store и использует
этот application как auth realm магазина.

Текущая IAM модель считает `application` organization-owned ресурсом:

```text
application.id
application.organization_id
application.name
application.display_name
application.description
application.deleted_at
```

Admin Application API уже применяет coarse-grained RBAC через Casbin и повторно
загружает application по `applicationId + organizationId`. Этого достаточно для
cross-organization isolation, но недостаточно для ownership boundary внутри
organization: store-created application выглядит как обычный organization
application и может попасть под generic organization-level mutations.

## 2. Аналог AWS

Целевой паттерн соответствует AWS IAM service-linked role:

- объект виден в IAM/Admin;
- объект связан с конкретным сервисом;
- сервис-владелец определяет создание, изменение и удаление;
- обычные IAM/API операции не должны свободно менять service-linked объект;
- lifecycle и mutability защищены на backend, а не только UI.

В Shopana эквивалентом является **service-linked application**:

```text
IAM application
  linked to service: project
  linked resource: store:{storeId}
  visible in organization application list
  mutable only through store/project-owned API path
```

## 3. Цели

1. Не перестраивать существующий RBAC и Casbin domains.
2. Разрешить показывать store-created application в organization settings.
3. Запретить generic organization application mutations для store-managed apps.
4. Разрешить изменение store application auth settings только через доверенный
   store/project API path.
5. Сохранить текущий predicate `applicationId + organizationId` и усилить его
   management binding: `linkedService + linkedResourceType + linkedResourceId`.
6. Не использовать `applicationId` как secret или capability token.
7. Аудировать rejected generic mutations и successful internal mutations без
   секретов.

## 4. Не входит в план

- Глубокая переработка RBAC roles, resources или Casbin domains.
- Скрытие store-managed application из всех organization views.
- Dynamic Client Registration.
- Изменение OAuth/OIDC runtime contract.
- Выдача внешних management tokens для third-party integrations.
- Перенос store ownership в IAM RBAC.

## 5. Термины

**Admin-managed application** — обычный application, созданный и изменяемый
через organization Application Admin API.

**Service-linked application** — application, созданный для внутреннего ресурса
Shopana и управляемый сервисом-владельцем.

**Store-managed application** — первый вид service-linked application:
application связан с `project` service и конкретным `storeId`.

**Generic admin mutation** — существующие mutations в `applicationMutation`,
которые работают с organization-level resources вроде `org.applications` и
`org.application-auth`.

**Internal management path** — broker/domain API, который вызывается backend
кодом после store-context checks и проверяет service-linked binding.

## 6. Target model

Добавить к `iam.application` management metadata:

```ts
type ApplicationManagementMode = "admin" | "service_linked";
type ApplicationLinkedService = "project";
type ApplicationLinkedResourceType = "store";

application.managementMode: "admin" | "service_linked"
application.linkedService: "project" | null
application.linkedResourceType: "store" | null
application.linkedResourceId: uuid | null
```

Инварианты:

```text
managementMode = admin
  linkedService IS NULL
  linkedResourceType IS NULL
  linkedResourceId IS NULL

managementMode = service_linked
  linkedService IS NOT NULL
  linkedResourceType IS NOT NULL
  linkedResourceId IS NOT NULL
```

Для store-created application:

```text
managementMode = service_linked
linkedService = project
linkedResourceType = store
linkedResourceId = store.id
```

Для applications, созданных через organization Admin API:

```text
managementMode = admin
linkedService = null
linkedResourceType = null
linkedResourceId = null
```

## 7. GraphQL/Admin поведение

### 7.1. Read operations

Organization Application Admin API может возвращать both admin-managed и
service-linked applications.

`Application` GraphQL type должен получить read-only management metadata:

```graphql
enum ApplicationManagementMode {
  ADMIN
  SERVICE_LINKED
}

enum ApplicationLinkedService {
  PROJECT
}

enum ApplicationLinkedResourceType {
  STORE
}

type ApplicationManagement {
  mode: ApplicationManagementMode!
  linkedService: ApplicationLinkedService
  linkedResourceType: ApplicationLinkedResourceType
  linkedResourceId: ID
  mutableFromOrganizationAdmin: Boolean!
}

type Application {
  ...
  management: ApplicationManagement!
}
```

Для `SERVICE_LINKED` UI может показывать read-only badge:

```text
Managed by Store
```

Это только presentation. Security boundary находится в IAM backend.

### 7.2. Generic organization mutations

Следующие generic mutations должны reject `SERVICE_LINKED` application:

- application metadata update;
- application archive;
- auth configuration update;
- auth method update;
- provider configure/update/rotate/delete;
- OAuth client create/update/archive/secret rotation;
- application user admin mutations, если они меняют state managed realm;
- любые будущие mutations под `applicationMutation`, если они не opt-in internal.

Ошибка:

```text
code: APPLICATION_SERVICE_LINKED
message: Application is managed by linked service
```

Если нужно минимизировать enumeration surface, resolver может маппить это в
safe `APPLICATION_NOT_FOUND` для некоторых external-facing operations. Для
внутреннего Admin UI полезнее иметь явный code, чтобы показывать read-only state.

### 7.3. Internal store/project mutations

Store settings не должны вызывать generic `applicationMutation.*`.

Нужен отдельный backend path:

```ts
iam.updateServiceLinkedApplicationAuth({
  organizationId,
  applicationId,
  linkedService: "project",
  linkedResourceType: "store",
  linkedResourceId: storeId,
  expectedRevision,
  patch,
})
```

Этот path вызывается из project/store API после проверки:

```text
trusted store context
actor has store permission
store.applicationId == input/application scope
store.organizationId == organizationId
```

В IAM этот path обязан повторно загрузить application с полным predicate:

```sql
WHERE application.id = :applicationId
  AND application.organization_id = :organizationId
  AND application.management_mode = 'service_linked'
  AND application.linked_service = 'project'
  AND application.linked_resource_type = 'store'
  AND application.linked_resource_id = :storeId
```

После этого можно переиспользовать существующие repository методы изменения
auth configuration, providers и OAuth clients.

## 8. Backend enforcement

### 8.1. Repository scope

Расширить `ApplicationAuthAdminMutationScope`:

```ts
interface ApplicationAuthAdminMutationScope {
  organizationId: string;
  applicationId: string;
  archived: boolean;
  configuration: ApplicationAuthConfigurationRecord;
  deliveryConfigured: boolean;
  managementMode: "admin" | "service_linked";
  linkedService: "project" | null;
  linkedResourceType: "store" | null;
  linkedResourceId: string | null;
}
```

`ApplicationAuthAdminMutationRepository.findScope()` должен выбирать эти поля.

### 8.2. Admin management guard

В `ApplicationAuthAdminManagementService` добавить guard:

```ts
private assertAdminMutable(scope: ApplicationAuthAdminMutationScope): void {
  if (scope.managementMode !== "admin") {
    throw new ApplicationAuthAdminManagementError(
      "Application is managed by linked service",
      "APPLICATION_SERVICE_LINKED",
      {
        managementMode: scope.managementMode,
        linkedService: scope.linkedService,
        linkedResourceType: scope.linkedResourceType,
        linkedResourceId: scope.linkedResourceId,
      }
    );
  }
}
```

Вызвать guard для всех generic organization mutations после `requireScope()` и
до write execution. Лучше централизовать в `executeExisting()` через option:

```ts
executeExisting({
  ...
  requireAdminMutable: true,
})
```

Read-only queries не вызывают этот guard.

### 8.3. Internal management guard

Добавить отдельный service method:

```ts
async executeServiceLinkedStoreMutation(input, actorOrServiceContext) {
  const scope = await repository.findServiceLinkedStoreScope({
    organizationId: input.organizationId,
    applicationId: input.applicationId,
    storeId: input.storeId,
  });

  if (!scope) throw APPLICATION_NOT_FOUND;
  ...
}
```

Он не должен обходить revision, validation, audit и invalidation. Отличие только
в management predicate и authorization source.

## 9. Provisioning changes

### 9.1. IAM broker action

Расширить `CreateApplicationParams` для trusted provisioning:

```ts
interface CreateApplicationParams {
  applicationId: string;
  userId: string;
  organizationId: string;
  name: string;
  displayName: string;
  description?: string;
  management: {
    mode: "admin" | "service_linked";
    linkedService?: "project";
    linkedResourceType?: "store";
    linkedResourceId?: string;
  };
}
```

`management` является обязательным. IAM должен отклонять create request без
явного management mode, потому что отсутствие этой информации делает security
boundary непроверяемым на call site.

Admin GraphQL create path обязан передавать `management.mode = "admin"`.
Trusted store provisioning path обязан передавать полный service-linked binding.

### 9.2. StoreCreateSaga

`StoreCreateSaga.createIamApplication()` должен передавать:

```ts
management: {
  mode: "service_linked",
  linkedService: "project",
  linkedResourceType: "store",
  linkedResourceId: storeId,
}
```

Для этого порядок saga нужно слегка изменить: `storeId` уже есть до
`createIamApplication`, поэтому binding можно передать без дополнительных шагов.

### 9.3. Compensation

`deleteApplicationForStoreCreateCompensation` должен удалять только application с
ожидаемым service-linked binding:

```sql
WHERE id = :applicationId
  AND organization_id = :organizationId
  AND management_mode = 'service_linked'
  AND linked_service = 'project'
  AND linked_resource_type = 'store'
  AND linked_resource_id = :storeId
```

Это предотвращает случайное удаление обычного organization application при
ошибочном `applicationId`.

## 10. Database migration

Добавить обязательные management columns:

```sql
ALTER TABLE iam.application
  ADD COLUMN management_mode varchar(32) NOT NULL,
  ADD COLUMN linked_service varchar(64),
  ADD COLUMN linked_resource_type varchar(64),
  ADD COLUMN linked_resource_id uuid;
```

Добавить check constraints:

```sql
management_mode IN ('admin', 'service_linked')

(
  management_mode = 'admin'
  AND linked_service IS NULL
  AND linked_resource_type IS NULL
  AND linked_resource_id IS NULL
)
OR
(
  management_mode = 'service_linked'
  AND linked_service IS NOT NULL
  AND linked_resource_type IS NOT NULL
  AND linked_resource_id IS NOT NULL
)
```

Добавить индекс:

```sql
CREATE INDEX idx_application_service_linked_resource
  ON iam.application (
    organization_id,
    linked_service,
    linked_resource_type,
    linked_resource_id
  )
  WHERE management_mode = 'service_linked';
```

Так как проект pre-production, план исходит из чистого schema transition:
после migration каждая строка `iam.application` обязана иметь явный
`management_mode`. Если локальная dev database уже содержит applications, ее
нужно привести к новому invariant отдельным maintenance script вне этого плана.

Все runtime create paths после migration обязаны писать `management_mode`
явно. Запись application без management metadata является ошибкой.

## 11. Audit

Generic admin mutation against service-linked application:

```text
category = application_auth_admin
action = attempted action
outcome = failure
reasonCategory = authorization
safeDiff = {
  blockedByManagementMode: "service_linked",
  linkedService: "project",
  linkedResourceType: "store"
}
```

Successful internal store/project mutation:

```text
category = application_auth_admin
actorType = platform_admin | internal_service
organizationId
applicationId
targetType
targetId
safeDiff allowlist only
```

Секреты provider/client/session/token values не попадают в audit.

## 12. Contract tests

Добавить pending/real contract scenarios:

1. Organization application created through Admin API has `management.mode=ADMIN`.
2. Store create provisions IAM application with `management.mode=SERVICE_LINKED`.
3. Organization application list returns service-linked application with read-only
   management metadata.
4. Generic `applicationUpdate` rejects service-linked application.
5. Generic `authConfigurationUpdate` rejects service-linked application.
6. Generic provider credential rotation rejects service-linked application.
7. Generic OAuth client mutation rejects service-linked application.
8. Store/project internal mutation succeeds for matching
   `organizationId + storeId + applicationId`.
9. Store/project internal mutation fails for foreign store with same
   organization.
10. Store/project internal mutation fails for foreign organization.
11. Compensation delete cannot delete admin-managed application.
12. Audit contains safe failure record for rejected generic write.

## 13. Rollout sequence

1. Add database columns, constraints and indexes.
2. Extend Drizzle model and generated types.
3. Extend repository selection and `ApplicationAuthAdminMutationScope`.
4. Add management metadata to Application GraphQL read model.
5. Add `assertAdminMutable` guard to all generic mutations.
6. Add trusted service-linked store scope lookup.
7. Add internal service method/broker action for store-managed updates.
8. Update `CreateApplicationParams` so `management` is required.
9. Update `StoreCreateSaga` to create service-linked application.
10. Harden store-create compensation predicate.
11. Add contract tests.
12. Run build when code implementation is complete.

## 14. Open decisions

1. Error mapping: expose `APPLICATION_SERVICE_LINKED` to Admin UI or map to
   `APPLICATION_NOT_FOUND` for all generic mutations?
2. Should application users under store-managed realms be mutable from org
   settings, or only from store settings?
3. Should service-linked application archive be allowed only through store
   delete/archive workflow?
4. Should linked resource id be a plain UUID column or generic text to support
   future non-UUID linked resources?
5. Should Admin UI display service-linked applications in the same list or a
   separate read-only section?

## 15. Recommended decisions

1. Use explicit `APPLICATION_SERVICE_LINKED` for authenticated Admin UI because
   the application is already visible by design.
2. Make all write mutations for store-managed realms go through store/project
   path in v1.
3. Allow archive/delete only from store archive/delete workflow.
4. Use UUID for `linkedResourceId` now because store IDs are UUIDv7 and current
   project rules require UUID values for identifiers.
5. Show in organization settings with read-only badge and link to Store Settings.

## 16. Acceptance criteria

- Store-created IAM application is visible but read-only in organization
  application management.
- Generic Admin GraphQL mutations cannot update service-linked applications.
- Store settings can update its own linked application through a store-scoped
  backend path.
- Every write path checks more than `applicationId`: at minimum
  `organizationId + managementMode + linkedService + linkedResourceType +
  linkedResourceId`.
- Admin-created applications must explicitly set `managementMode=admin` at
  creation time.
- RBAC resources/domains remain unchanged except for optional new store-scoped
  permission labels if product UI needs them later.
