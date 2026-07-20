# План service-linked resources для IAM

Статус: проектный план  
Дата: 2026-07-20  
Сервисы: `services/iam`  
Целевая область: защита IAM-owned resources от generic organization mutations

> Актуальный authorization contract: caller service не передается в action
> payload или `Policy` params. Broker создает trusted
> `BrokerCallContext.caller` для action/event вызовов и передает его вместе с
> action invocation. Target service инжектит context во внутренний request
> context; вложенный broker call получает identity непосредственно вызывающего
> service. Независимый `@ProtectedResource` boundary передает concrete
> `protectedResource`; для service-aware owner claim поля `ownerType` и
> `ownerId` обязательны вместе. IAM
> сопоставляет `binding.linkedService` с `context.caller.service`, а
> `binding.linkedOwnerType + binding.linkedOwnerId` с
> `protectedResource.ownerType + protectedResource.ownerId`. Поля `linkedOwner` ниже относятся к persisted owner
> metadata при создании binding, но `linkedService` в них больше не принимается
> от вызывающего сервиса.

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
- объект связан с конкретным external service owner;
- owner определяет создание, изменение и удаление;
- обычные IAM/Admin API операции не должны свободно менять service-linked object;
- lifecycle и mutability защищены на backend, а не только UI.

В Shopana эквивалентом является **service-linked resource**:

```text
IAM resource
  linked to external service owner
  visible through normal read models when product needs it
  mutable only through explicit service-aware backend path
```

## 3. Цели

1. Не перестраивать существующий RBAC и Casbin domains.
2. Не менять таблицу `iam.application`.
3. Сделать service-linked binding общей моделью для разных IAM resource types.
4. Разрешить показывать service-linked resources в organization views.
5. Запретить generic organization mutations для service-linked resources.
6. Разрешить изменение service-linked resources только через доверенный
   service-aware backend path, который внешний сервис-владелец вызывает через
   IAM actions.
7. Усилить write predicates за счет binding lookup:
   `organizationId + resourceType + resourceId + linkedService +
   linkedResourceType + linkedResourceId`.
8. Не использовать resource id как secret или capability token.
9. Аудировать rejected generic mutations и successful service-aware external
   mutations без секретов.

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

**Service-linked resource** — IAM resource, связанный с external service owner и
управляемый только доверенным service-aware backend path.

**Protected resource** — конкретный IAM object, на который указывает binding:
например `application`, OAuth client, provider config или future IAM resource.

**Linked owner** — owner binding внешнего сервиса: `linkedService +
linkedResourceType + linkedResourceId`.

**Generic admin mutation** — существующие mutations в organization Admin API,
которые работают с organization-level resources.

**Service-aware external path** — broker/API вызов из внешнего backend service в
IAM. Внешний сервис явно передает IAM action контекст service-linked ownership и
знает, какую service-linked сущность он создает или меняет.

## 6. Target model

Не добавлять management metadata в `iam.application`.

Добавить отдельную IAM-owned таблицу bindings:

```ts
type ServiceLinkedResourceKind = string;
type ServiceLinkedService = string;
type ServiceLinkedOwnerType = string;

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

Examples, not a closed list:

```text
resourceKind = application | store | media_asset_group | ...
resourceId = resource primary id
linkedService = project | iam | media | ...
linkedOwnerType = store | application_realm | ...
linkedOwnerId = owner primary id
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

Это только presentation. Security boundary находится в независимом IAM
protected-resource authorization layer.

### 7.2. Generic organization mutations

Generic mutations должны reject resource через `@ProtectedResource`, если для
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

### 7.3. External service mutations

Внешние сервисы не должны вызывать generic organization mutations для
service-linked updates.

Нужен service-aware backend path через existing IAM actions. Внешний сервис
передает `managementMode` / owner claim, IAM action boundary комбинирует RBAC и
protected-resource authorization, затем вызывает существующую business
mutation implementation:

```ts
iam.updateResource({
  organizationId,
  resourceKind,
  resourceId,
  managementMode: "service_linked",
  linkedOwner: {
    linkedService,
    linkedOwnerType,
    linkedOwnerId,
  },
  expectedRevision,
  patch,
})
```

Для application auth existing IAM action может иметь service-aware input
contract. Он не должен копировать validation, patch building, revision, audit или
repository write logic:

```ts
iam.updateApplicationAuth({
  organizationId,
  applicationId,
  managementMode: "service_linked",
  linkedOwner: {
    linkedService,
    linkedOwnerType,
    linkedOwnerId,
  },
  expectedRevision,
  patch,
})
```

IAM action boundary передает owner claim в `authorizeProtectedResource`.
Именно dedicated provider проверяет binding с полным predicate:

```sql
WHERE service_linked_resource.organization_id = :organizationId
  AND service_linked_resource.resource_kind = :resourceKind
  AND service_linked_resource.resource_id = :resourceId
  AND service_linked_resource.linked_service = 'iam'
  AND service_linked_resource.linked_owner_type = 'application_realm'
  AND service_linked_resource.linked_owner_id = :linkedOwnerId
  AND service_linked_resource.deleted_at IS NULL
```

После успешных RBAC и protected-resource decisions action boundary переиспользует существующую
business mutation implementation для конкретного resource type. Revision,
validation, audit и invalidation не должны обходиться.

## 8. Backend enforcement

### 8.1. Граница изменений в коде

Service-linked модель должна быть внедрена как отдельный **protected-resource
authorization boundary**, а не как часть RBAC Policy или бизнес-логики application auth, providers, OAuth
clients, application users, application repositories или organization
repositories.

Все generic organization operations должны становиться linked-service aware
только через `@ProtectedResource` decision. Business services и repositories не
должны самостоятельно знать, что resource является service-linked.

Это жесткое архитектурное ограничение плана:

```text
RBAC belongs to Policy only
service-linked enforcement belongs to ProtectedResource only
IAM business service layer remains service-linked unaware
external service callers are service-linked aware
application/organization repository layer remains service-linked unaware
```

Под "IAM business service layer" здесь понимаются сервисы, которые реализуют
application auth, provider, OAuth client, application user и organization
business rules. Они не должны получать новые branches, guards или отдельные
service-linked methods.

Внешние сервисы, которые создают или владеют service-linked IAM resources
например `project`, обязаны быть service-linked aware. Они передают ownership
context в IAM actions и выбирают, какие IAM resources создаются как
service-linked. Обратная совместимость старых external-service вызовов не
сохраняется.

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
   только protected-resource provider layer и IAM action boundary orchestration.
3. `Policy` / `AuthProvider` extension, который отвечает за organization admin
   mutability и trusted owner predicate.
4. IAM action boundary, который принимает service-linked context от внешнего
   service owner и создает resource + binding в одной transaction.
5. GraphQL read-only field resolver `Application.management`, который читает
   projection через service-linked lookup, не меняя `ApplicationRepository`.
6. Audit safe diff allowlist для rejected generic writes.

Запрещено:

1. Добавлять `linkedService`, `linkedOwnerType`, `linkedOwnerId` во внутренние
   IAM business input DTO для generic Admin mutations.
2. Передавать `serviceLinkedBinding` в application auth/provider/OAuth client
   бизнес-методы как часть основной mutation logic.
3. Дублировать существующие mutations в отдельных методах вроде
   `updateServiceLinkedApplicationAuth`, если они копируют validation, patch
   building, revision handling или audit из generic path.
4. Разветвлять business validation по признаку service-linked. Правила auth
   configuration, provider credentials, OAuth clients и users остаются общими.
5. Скрывать service-linked ownership от внешних сервисов-владельцев. Внешний
   сервис, который создает IAM-owned resource для своей lifecycle-модели, обязан
   передать ownership context в IAM action.
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
    mutation начала выполнять business logic, authorization decisions уже должны быть
    принята.

Обязательно:

1. Generic Admin write path обязан передавать `protectedResource` через
   `@ProtectedResource` / `authorizeProtectedResource` до business mutation.
2. Service-aware external write path обязан передавать `linkedOwner` в IAM
   action, а IAM action boundary обязан передавать его в protected-resource
   authorization до выполнения business mutation.
3. `@Policy` является только RBAC boundary. `@ProtectedResource` / dedicated
   provider method является единственным enforcement point для service-linked
   mutability. На write boundary они комбинируются.
4. IAM business services продолжают видеть только существующие authorization
   result и business inputs; service-linked context остается на IAM action
   boundary.
5. Любой новый write surface для protected IAM resource должен добавлять
   `@ProtectedResource`, а не service-linked guard в service/repository method.

Практическое правило:

```text
generic Admin write:
  authorize RBAC through @Policy
  authorize mutability through @ProtectedResource
  load existing business scope
  execute existing business mutation unchanged

service-aware external write:
  authorize RBAC through @Policy
  authorize ownership through @ProtectedResource
  compare the trusted broker caller with binding.linkedService
  execute the same existing business mutation implementation unchanged
```

Отличаться должны только authorization/management predicate wrappers. Revision,
Zod validation, domain invariants, patch building, repository writes, audit и
invalidation должны переиспользоваться из существующих implementation paths.

### 8.2. Protected resource context

RBAC и service-linked mutability имеют отдельные contracts. `AuthorizeParams`
не содержит protected-resource полей. Dedicated contract передает только
конкретный resource reference и не содержит RBAC `resource/action/domain`.

```ts
type ProtectedResourceKind = string;

interface ProtectedResourceRef {
  organizationId: string;
  resourceKind: ProtectedResourceKind;
  resourceId: string;
  ownerType?: string;
  ownerId?: string;
}

interface LinkedOwnerRef extends ProtectedResourceRef {
  linkedService: string;
  linkedOwnerType: string;
  linkedOwnerId: string;
}

interface AuthorizeParams {
  subject?: string;
  organizationId?: string;
  domain?: string;
  resource: string;
  action: string;
}

interface ProtectedResourceAuthorizeParams {
  protectedResource: ProtectedResourceRef;
}
```

`ServiceLinkedResourceKind`, `ServiceLinkedService` и `ServiceLinkedOwnerType`
являются registry значениями binding model, а не зависимостью от конкретной
domain model. Registry открыт для всех сервисов и resource kinds. RBAC и
protected-resource contracts не меняются при добавлении новых resource kinds
или новых owner services.

`protectedResource` используется generic Admin writes и service-aware external
paths. Owner claim определяется optional парой `ownerType + ownerId`; caller
service берется только из trusted broker context.

`@ProtectedResource` или manual `authorizeProtectedResource()` используется для
mutations protected IAM resources. Contract generic и не зависит от application:

```ts
await authorizer.authorizeProtectedResource({
  protectedResource: {
    organizationId: input.organizationId,
    resourceKind: input.resourceKind,
    resourceId: input.resourceId,
  },
});
```

Если boundary использует decorators, RBAC и protected-resource checks
комбинируются, а concrete reference вычисляется из method params:

```ts
@Policy<UpdateProtectedResourceInput>({
  resource: "org.some-protected-resource",
  action: "write",
  organizationId: (_, params) => params.organizationId,
})
@ProtectedResource<[UpdateProtectedResourceInput], Actions>((params) => ({
  organizationId: params.organizationId,
  resourceKind: params.resourceKind,
  resourceId: params.resourceId,
}))
```

`@Policy` и `AuthorizeParams` запрещено расширять protected-resource fields.
Не подменять `@ProtectedResource` repository guard-ом.

### 8.3. Decision rules

Boundary сначала выполняет обычный RBAC через `@Policy`, затем независимый
service-linked check через `@ProtectedResource`.

Generic Admin write:

```text
1. Validate domain/resource/action against @shopana/rbac.
2. Check platform admin / organization owner / Casbin as before.
3. If RBAC denies, deny as before.
4. `@ProtectedResource` lookup active binding:
   organizationId + resourceKind + resourceId + deletedAt IS NULL.
5. If binding does not exist, allow.
6. If binding exists, deny with RESOURCE_SERVICE_LINKED.
```

Service-aware external linked-owner write:

```text
1. Skip organization-admin mutability check only when linkedOwner is present.
2. Lookup active binding by full predicate:
   organizationId + resourceKind + resourceId +
   linkedService + linkedOwnerType + linkedOwnerId + deletedAt IS NULL.
3. If binding matches, allow the same business mutation implementation to run.
4. If binding does not match, deny as not found/forbidden according to boundary
   mapping.
```

Active binding lookup for generic Admin write uses the generic protected
resource identity:

```text
organizationId
resourceKind
resourceId
deletedAt IS NULL
```

Если binding найден, protected-resource provider возвращает denial mapped to:

```text
code: RESOURCE_SERVICE_LINKED
message: Resource is managed by linked service
```

Safe details для audit можно сформировать внутри Policy denial metadata или
error mapper, но эти details не должны становиться частью business scope.

### 8.4. Admin write integration

В generic organization mutations service-linked enforcement должен происходить
через `@ProtectedResource` boundary до входа в business service method. Boundary
adapter resolver/action передает identity в dedicated provider method.
Business service methods и их local authorization helpers не изменяются ради
service-linked:

```ts
executeExisting({
  ...
  protectedResource: {
    organizationId,
    resourceKind,
    resourceId,
  },
})
```

Read-only queries не вызывают этот guard.

### 8.5. Authorization hookup points

Decorators подключаются не в `services/iam/src/services`, а в authorization
infrastructure и boundary adapters.

Обязательные точки подключения:

1. `packages/shared-kernel/src/decorators/Authorize.ts` остается чистым RBAC.
   `packages/shared-kernel/src/decorators/ProtectedResource.ts` вычисляет
   concrete identity из method args и вызывает dedicated provider method.

2. `packages/type-resolver/src/middleware/authorization/*`
   - `@TypePolicy` остается read-only RBAC authorization и не содержит
     protected-resource callbacks.

3. `services/iam/src/kernel/Authorizable.ts`
   - IAM `AuthProvider.authorize()` выполняет только RBAC;
   - `authorizeProtectedResource()` выполняет generic binding lookup;
   - lookup идет через `ServiceLinkedResourceRepository`, не через resource
     repositories.

4. GraphQL Admin mutation boundary adapters, e.g.
   `services/iam/src/resolvers/admin/ApplicationMutationResolver.ts`
   - сейчас mutations имеют `@ZodResolver` и затем вызывают business services;
   - write boundary комбинирует RBAC check и `@ProtectedResource` до business
     service;
   - это boundary-level изменение. Нельзя переносить check внутрь
     `applicationAuthAdminManagement` или `applicationOAuthClientManagement`.

5. IAM broker action boundary adapters
   - все actions, которые создают или меняют protected IAM resource для внешних
     сервисов, должны принимать explicit service-linked context от внешнего
     сервиса-владельца;
   - для admin-managed создания caller передает `managementMode: "admin"`;
   - для service-linked создания caller передает
     `managementMode: "service_linked"` и полный `linkedOwner`;
   - отдельные `createServiceLinked*` actions не добавляются как параллельный
     backward-compatible path. Existing create actions меняют contract без
     обратной совместимости.

GraphQL Admin mapping examples:

```text
generic resource update:
  protectedResource = {
    organizationId,
    resourceKind,
    resourceId
  }

nested resource update:
  protectedResource = {
    organizationId,
    resourceKind,
    resourceId
  }

resource with public external id:
  protectedResource = {
    organizationId,
    resourceKind,
    resourceId: resolvedStableResourceId
  }
```

Если mutation input не содержит stable `resourceId` нужного protected kind
например mutation использует public/external identifier, boundary adapter обязан
резолвить generic protected resource id до `@ProtectedResource` call через dedicated lookup
port/loader. Этот lookup не должен жить в business service и не должен менять
resource repository scopes.

Implementation checklist для подключения protected-resource boundary:

```text
1. Keep Policy/AuthorizeParams RBAC-only.
2. Add independent ProtectedResource/authorizeProtectedResource contract.
3. Add ServiceLinkedResourceRepository generic lookup methods.
4. Add boundary adapter mapping from mutation params to protectedResource.
5. Keep service methods and resource repositories unchanged.
```

### 8.6. External service-aware management policy

Existing IAM actions, вызываемые внешними сервисами, должны стать
service-linked aware на уровне action contract. Не добавлять параллельные
`createServiceLinked*` / `updateServiceLinked*` actions для обратной
совместимости.

Action boundary комбинирует RBAC и protected-resource authorization, но не копирует
бизнес-операцию:

```ts
async updateResourceFromExternalService(input, actorOrServiceContext) {
  await authorizer.authorize({
    subject: actorOrServiceContext.subject,
    organizationId: input.organizationId,
    domain: "org",
    resource: input.rbacResource,
    action: "write",
  });
  await authorizer.authorizeProtectedResource({
    protectedResource: {
      organizationId: input.organizationId,
      resourceKind: input.resourceKind,
      resourceId: input.resourceId,
      ownerType: input.linkedOwnerType,
      ownerId: input.linkedOwnerId,
    },
  });

  return executeExistingBusinessMutation(input.patch, actorOrServiceContext);
}
```

Create actions create resource and binding atomically:

```ts
async createResourceFromExternalService(input, actorOrServiceContext) {
  const created = await executeExistingBusinessCreate(input.resource);

  if (input.managementMode === "service_linked") {
    await serviceLinkedResource.createBinding({
      organizationId: input.organizationId,
      resourceKind: input.resourceKind,
      resourceId: created.resourceId,
      linkedService: input.linkedOwner.linkedService,
      linkedOwnerType: input.linkedOwner.linkedOwnerType,
      linkedOwnerId: input.linkedOwner.linkedOwnerId,
      createdBy: actorOrServiceContext.subject,
    });
  }

  return created;
}
```

Action boundary не должен обходить revision, validation, audit и invalidation.
Он не должен копировать patch construction из generic mutation. Отличие только в
том, что внешний сервис явно передает service-linked ownership context.

### 8.7. Code evidence for required changes

Каждое требуемое изменение должно иметь code evidence: текущую точку в коде,
наблюдаемый gap и целевое изменение. Без такой привязки изменение не считается
готовым к реализации.

| Требование | Code evidence в текущем коде | Gap | Целевое изменение |
| --- | --- | --- | --- |
| RBAC и service-linked enforcement должны быть разделены | `services/iam/src/kernel/Authorizable.ts` содержит RBAC `authorize(params)` | Protected identity не относится к Casbin input | Оставить `AuthorizeParams` чистым RBAC и использовать отдельный `authorizeProtectedResource()` |
| Boundary должен вычислять generic protected resource reference | `@ProtectedResource` принимает resolver concrete identity из method args | Static resource ID неизвестен до invocation | Использовать independent `@ProtectedResource((params) => ref)` рядом с `@Policy` |
| GraphQL mutation boundary должен проверить оба predicates до service call | `ApplicationMutationResolver` выполняет validation и вызывает business services | Нельзя переносить binding lookup в business service | Сначала RBAC, затем decorated protected-resource helper внутри существующего error/audit boundary |
| Boundary adapters передают identity до входа в business service | Decorators исполняются до target method | Business DTO не должен получать ownership metadata | Использовать `@ProtectedResource` на GraphQL/broker boundary; business services остаются без изменений |
| Business scopes любых protected resources не должны содержать service-linked details | `ApplicationAuthAdminMutationScope` и `ApplicationOAuthClientManagementScope` содержат только business state, нужный соответствующим mutations | Это правильная граница, которую нельзя ломать для любых будущих resource kinds | Не добавлять `serviceLinkedBinding` в business scopes; active binding lookups выполняются только protected-resource provider layer |
| Resource-specific repositories не должны получать service-linked joins | `ApplicationRepository` выбирает application/auth/organization данные без service-linked ownership; organization repositories не участвуют в binding lookup | Read/write repositories конкретных моделей не должны становиться ownership-aware | Любые management projections строить dedicated field resolver / loader; enforcement lookup только через `ServiceLinkedResourceRepository` в protected-resource layer |
| External service action contracts должны быть service-linked aware без обратной совместимости | `services/project/src/sagas/StoreCreateSaga.ts` вызывает `iam.createApplication` как обычный create action | Внешний service owner не передает ownership context, поэтому binding не создается | Изменить existing IAM actions, вызываемые внешними сервисами, чтобы они принимали `managementMode` и `linkedOwner`; обновить callers вроде `project` без сохранения старого контракта |
| Нужен dedicated binding repository для protected-resource layer | `Repository` агрегирует repositories | Dedicated provider требует generic lookup helper | Использовать `ServiceLinkedResourceRepository` methods `findActiveByResource`, `findActiveLinkedOwner`, `createBinding` |
| Denial metadata должен маппиться в audit без протекания в business scope | Existing audit ports support safe failure records around Admin writes | Boolean недостаточен для linked denial details | `authorizeProtectedResource` возвращает typed `RESOURCE_SERVICE_LINKED`, mapping остается у boundary/error mapper |

Implementation PR must keep this evidence table true. Если код меняется так, что
evidence устаревает, план нужно обновить до реализации.

## 9. Provisioning changes

### 9.1. Create resource path

Не расширять `iam.application` columns.

Generic create path для protected resource остается обычным business create path
на уровне IAM business service. IAM action contract, который вызывают внешние
сервисы, становится service-linked aware.

Внешний сервис-владелец обязан передать в IAM action:

```ts
type ResourceManagementInput =
  | { managementMode: "admin" }
  | {
      managementMode: "service_linked";
      linkedOwner: {
        linkedService: string;
        linkedOwnerType: string;
        linkedOwnerId: string;
      };
    };
```

IAM action boundary должен уметь в одной transaction:

1. создать сам resource обычным способом;
2. если `managementMode = "service_linked"`, создать запись binding в
   `iam.service_linked_resource`;
3. вернуть identity созданного resource внешнему сервису.

Admin GraphQL create path явно проходит через admin-managed branch и не создает
binding. Такой resource остается admin-managed.

External service provisioning path обязан передавать полный service-linked
binding в IAM action contract:

```ts
await iam.createApplication({
  ...existingCreateApplicationInput,
  managementMode: "service_linked",
  linkedOwner: {
    linkedService: "project",
    linkedOwnerType: "store",
    linkedOwnerId,
  },
});
```

### 9.2. Resource kinds

Это правило применяется ко всем service-linked сущностям. Любой external-service
caller, который создает protected resource в другом сервисе, должен знать, какой
service-linked object создается, и передать ownership context в соответствующий
action.

Generic create action должен создавать:

```text
target service resource row
target service service_linked_resource row:
  resourceKind = registry value for created resource
  resourceId = created resource id
  linkedService = external owner service registry value
  linkedOwnerType = external owner type registry value
  linkedOwnerId = external owner id
```

Examples only:

- `project.storeCreate` creates IAM application with
  `resourceKind = "application"` and `linkedService = "project"`.
- A media service can create a protected asset group with
  `resourceKind = "asset_group"` and `linkedService = "project"`.
- Any future service can add its own registry values without changing the
  protected-resource authorization contract.

Если создание binding не удалось, transaction должна откатить создание resource.
Старые внешние вызовы без `managementMode` не поддерживаются.

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
resource_kind <> ''
linked_service <> ''
linked_owner_type <> ''
```

Не добавлять DB-level `IN (...)` constraints для `resource_kind`,
`linked_service` или `linked_owner_type`. Валидные значения контролируются
service-owned registry/config/codegen слоем, чтобы механизм работал для любых
service-linked сущностей без новой миграции на каждый resource kind.

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
  linkedService,
  linkedOwnerType
}
```

Successful service-aware external mutation:

```text
category = iam_resource_admin
actorType = platform_admin | external_service
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

1. Admin-created protected resource has no active service-linked binding by
   default.
2. External service provisioning creates protected resource and active binding in
   one transaction when it passes `managementMode: "service_linked"`.
3. Read API can expose service-linked management metadata through a read-only
   projection without changing the resource repository.
4. Generic Admin mutation rejects any protected resource with active binding via
   `@ProtectedResource`.
5. Generic Admin mutation allows the same resource kind when active binding does
   not exist.
6. Generic Admin mutation denial works for any registered protected
   `resourceKind`; tests must cover at least two unrelated services/resource
   kinds to prove the mechanism is generic.
7. Service-aware external mutation succeeds for matching
   `organizationId + resourceKind + resourceId + linked binding`.
8. Service-aware external mutation fails for mismatched linked owner id.
9. Service-aware external mutation fails for foreign organization.
10. Adding a new resource kind requires only registry/config + call-site
    `protectedResource` mapping, not database migration or protected-resource
    contract changes.
11. Removing or soft-deleting binding makes resource admin-managed only if the
    lifecycle explicitly allows unlinking.
12. Audit contains safe failure record for rejected generic write.
13. Service-linked external path reuses the same business mutation
    implementation as generic Admin path; no duplicated
    `updateServiceLinked*` business method exists.
14. IAM business scopes and internal business DTOs do not contain
    `serviceLinkedBinding`, `linkedService`, `linkedOwnerType` or
    `linkedOwnerId`.
15. Generic Admin mutation denial is produced by `@ProtectedResource` when
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
5. Keep `Policy` / `AuthorizeParams` RBAC-only and add independent
   `@ProtectedResource` plus `authorizeProtectedResource` contract.
6. Combine RBAC and protected-resource decorators/checks in GraphQL/broker
   boundary adapters before business service calls.
7. Keep existing business scopes free of `linkedService`, `linkedOwnerType`,
   `linkedOwnerId` and `serviceLinkedBinding`.
8. Add service-linked binding checks inside IAM dedicated protected-resource
   provider flow, using `ServiceLinkedResourceRepository`.
9. Change existing IAM broker action contracts used by external services to
   accept `managementMode` and `linkedOwner`; do not add parallel
   `createServiceLinked*` actions for backward compatibility.
10. Update external services, starting with `project`, to pass service-linked
   ownership context when they create IAM-owned protected resources.
11. IAM action boundary creates resource + binding transactionally for any
   registered protected resource kind created by external services.
12. Add contract tests.
13. Run build when code implementation is complete.

## 14. Open decisions

1. Error mapping: expose generic `RESOURCE_SERVICE_LINKED` to Admin UI or map to
   resource-specific codes like `APPLICATION_SERVICE_LINKED`?
2. Where should the cross-service registry for `resourceKind`, `linkedService`
   and `linkedOwnerType` live?
3. Should service-linked binding be soft-deleted only through owner lifecycle?
4. Should `resource_id` and `linked_owner_id` stay UUID columns or become text to
   support future non-UUID resources?
5. Should Admin UI display service-linked resources in the same list or a
   separate read-only section?

## 15. Recommended decisions

1. Use generic `RESOURCE_SERVICE_LINKED` in domain code and optionally map to
   resource-specific codes at GraphQL boundary.
2. Start with an open registry contract. External services must pass explicit
   ownership context for every service-linked create surface they use; adding a
   new resource kind must not require a DB migration.
3. Allow unlink/archive/delete only from the external service owner's lifecycle
   workflow through IAM action boundary.
4. Use UUID for both ids now because identifier conventions require UUID values.
5. Show in organization settings with read-only badge.

## 16. Acceptance criteria

- `iam.application` schema remains unchanged.
- Service-linked state is stored in separate IAM binding table.
- The binding model is generic and is not limited to a fixed resource-kind list.
- Service-linked resources can be visible through resource-specific read APIs as
  read-only managed resources.
- IAM-managed service-linked application is only an example, not a boundary of
  the mechanism.
- Generic Admin GraphQL mutations cannot update resources with active
  service-linked binding because `@ProtectedResource` denies the write.
- Service-aware external path can update its own linked resource through
  combined RBAC and protected-resource predicates.
- Existing business mutation implementations are not duplicated for
  service-linked paths.
- IAM business scopes and internal business DTOs do not expose
  `linkedService`, `linkedOwnerType`, `linkedOwnerId` or
  `serviceLinkedBinding`.
- Existing business services do not contain service-linked enforcement methods,
  branches, guards or duplicated mutation implementations.
- Application repositories and organization repositories do not contain
  service-linked joins, lookups, guards or ownership-specific DTO fields.
- Service-linked write enforcement is implemented through the independent
  `@ProtectedResource` / `authorizeProtectedResource` contract.
- Adding a new protected resource kind does not require changing database
  constraints, protected-resource contract, application repositories,
  organization repositories, or existing business service logic.
- Every protected write path checks more than resource id: at minimum
  `organizationId + resourceKind + resourceId + linkedService + linkedOwnerType +
  linkedOwnerId`.
- External service actions are service-linked aware and old calls without the new
  management contract are not preserved for backward compatibility.
- Admin-created resources have no active service-linked binding by default.
- RBAC resources/domains remain unchanged.
