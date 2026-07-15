---
tags:
  - architecture
  - iam
  - identity
  - customer
  - multi-tenancy
  - better-auth
related:
  - architecture/multi-tenancy
  - architecture/decisions
  - architecture/service-structure
---

# Tech Spec: project-scoped Customer Identity в универсальном IAM

## Статус

- Статус: `Proposed`
- Язык: русский
- Дата: 2026-07-15
- Затронутые bounded contexts: `iam`, `project`, будущий `customers`, storefront gateway/context
- Базовая версия Better Auth: `1.4.7`

## Резюме решения

IAM получает универсальную сущность `Application`. Она является границей
аутентификационной уникальности, сессий и credentials. Shopana не добавляет
`store_id` или `project_id` непосредственно в универсальные контракты IAM:
каждый Store создает отдельный IAM Application и хранит его `applicationId`.

Customer одного Store представлен отдельным IAM user/principal внутри
Application этого Store. Один и тот же нормализованный email разрешен в разных
Applications, но запрещен дважды внутри одного Application:

```text
(application_id, normalized_email) UNIQUE
```

```text
Store A -> Application A -> user@example.com -> principal A
Store B -> Application B -> user@example.com -> principal B
```

`principal A` и `principal B` являются независимыми аккаунтами: у них могут быть
разные пароли, OAuth accounts, verification state, блокировки и сессии.

Better Auth 1.4.7 не поддерживает такую область уникальности одной настройкой.
Его стандартные email/password endpoints ищут пользователя через
`findUserByEmail(email)` без `applicationId`. Поэтому удаление глобального
`UNIQUE(email)` без изменения adapter behavior запрещено. IAM должен добавить
обязательный application-scoped adapter поверх Better Auth DB adapter.

Бизнес-сущность `Customer` не переносится в IAM. IAM владеет authentication
principal, а Shopana customer domain владеет профилем покупателя, addresses,
consents, tags, segments и статистикой.

## Контекст

### Текущая Shopana tenancy model

Архитектура Shopana определяет Store как основную границу изоляции данных.
Customers относятся к store-scoped entities. Organization владеет несколькими
Stores, а административный User может иметь доступ к нескольким Stores через
RBAC domain `store:{id}`.

В этом документе термин **Project** из продуктового контекста соответствует
текущей сущности **Store** сервиса `project`.

### Текущее состояние IAM

На момент подготовки спецификации:

- `iam.user.email` имеет глобальный `UNIQUE`;
- `organization_member` связывает глобального User с Organization;
- `role` и `user_role` поддерживают organization scope и domain
  `org | store:{id}`;
- `UserRepository.signIn()` вызывает стандартный
  `auth.api.signInEmail({ email, password })`;
- `UserRepository.signUp()` вызывает стандартный
  `auth.api.signUpEmail({ email, password, name })`;
- JWT содержит `sub`, `email`, `name`, опциональные `sid` и `org`, но не содержит
  обязательный application claim;
- storefront context уже определяет Store, однако customer lookup пока оставлен
  как `TODO`.

Основные исходные файлы:

- `services/iam/src/repositories/models/auth.ts`;
- `services/iam/src/repositories/models/authorization.ts`;
- `services/iam/src/auth/auth.ts`;
- `services/iam/src/repositories/user/UserRepository.ts`;
- `packages/shared-context/src/storefrontContextMiddleware.ts`;
- `services/project/src/sagas/StoreCreateSaga.ts`.

### Ограничение Better Auth 1.4.7

В установленной версии Better Auth регистрация сначала выполняет:

```ts
internalAdapter.findUserByEmail(email)
```

Вход выполняет тот же поиск с `includeAccounts: true`. Реализация внутреннего
adapter передает DB adapter условие только по email:

```ts
where: [{ field: "email", value: email.toLowerCase() }]
```

Следовательно, следующие изменения сами по себе некорректны:

```sql
ALTER TABLE iam.user DROP CONSTRAINT user_email_unique;
CREATE UNIQUE INDEX ON iam.user (application_id, email);
```

После такого изменения стандартный Better Auth lookup не сможет однозначно
выбрать пользователя при совпадающих email в разных Applications.

## Цели

1. Обеспечить независимую identity namespace для каждого Store/Project.
2. Разрешить одинаковый email в разных Applications.
3. Запретить повторный email внутри одного Application.
4. Сохранить IAM универсальным и не связывать его schema с Shopana Store FK.
5. Сохранить Better Auth как механизм credentials, sessions, password hashing и
   token issuance.
6. Обеспечить fail-closed isolation во всех Better Auth DB operations.
7. Отделить authentication principal от бизнес-сущности Customer.
8. Сохранить существующую organization membership/RBAC модель для admin users.
9. Подготовить модель к другим продуктам, которые смогут создавать собственные
   Applications в том же IAM.

## Не цели

- Глобально объединять аккаунты одного человека между Applications.
- Автоматически связывать principals только по совпадению email.
- Переносить customer addresses, orders, tags, segments или marketing consent в
  IAM.
- Использовать Organization как границу уникальности storefront customers.
- Добавлять cross-service foreign key из IAM в таблицу `store.store`.
- Реализовывать OAuth/magic-link в первом этапе. Для них требуется отдельная
  безопасная передача application context через redirect/callback state.
- Менять существующую Casbin domain модель административного RBAC.

## Термины

| Термин | Значение |
| --- | --- |
| Organization | Владелец команды и набора Applications; текущая IAM Organization |
| Application | Универсальная изолированная область authentication users |
| Project/Store | Shopana tenant; внешний владелец одного storefront Application |
| Principal/User | Authentication account внутри одного Application |
| Identifier | Нормализованный email/phone/username, используемый для входа |
| Account | Credential или внешний identity provider Better Auth |
| Customer | Shopana business profile, опционально связанный с IAM principal |
| Application scope | Проверенный `applicationId`, обязательный для auth operation |

## Архитектурные решения

### AD-1. Application является authentication boundary

Application вводится как отдельная универсальная IAM entity. IAM не использует
имя `Store`, потому что его consumers могут иметь другие tenant entities.

```text
IAM Organization
├── control-plane Application
├── storefront Application A
└── storefront Application B
```

Organization отвечает на вопрос «кто владеет приложением». Application отвечает
на вопрос «в какой области уникален пользователь и действуют его credentials».

### AD-2. User принадлежит ровно одному Application

Каждая запись `iam.user` обязана иметь `application_id`. User ID остается
глобально уникальным во всем IAM, поэтому `sub` однозначен даже без составного
primary key.

```text
user.id                    globally unique
(application_id, email)    unique inside application
```

Один user не может быть перемещен между Applications обычным update. Такой
переезд является созданием нового principal с отдельной процедурой linking или
migration.

### AD-3. Admin users и storefront customers используют разные Applications

Существующие административные users мигрируют в системный control-plane
Application. Их organization memberships и роли продолжают работать как сейчас.

Каждый Store получает собственный storefront Application. Storefront principal
не становится `organization_member` и не получает admin RBAC автоматически.

```text
control-plane app -> admin user -> organization membership -> store RBAC
storefront app     -> customer principal -> Shopana Customer profile
```

### AD-4. Better Auth работает только внутри обязательного ApplicationScope

Перед каждым вызовом Better Auth IAM устанавливает проверенный scope:

```ts
await applicationScope.run(applicationId, () =>
  auth.api.signInEmail({
    body: { email, password },
    headers,
  }),
);
```

Scoped adapter читает scope и:

- добавляет `applicationId` во все create operations tenant-scoped моделей;
- добавляет `applicationId` во все where conditions tenant-scoped моделей;
- запрещает переданный payload с другим `applicationId`;
- бросает `MissingApplicationScopeError`, если scope отсутствует;
- сохраняет scope внутри adapter transaction callback;
- не применяет scope к явно системным моделям, например global JWKS.

Tenant-scoped модели первого этапа:

- `user`;
- `account`;
- `session`;
- `verification`.

Application scope нельзя получать из произвольного request body. Он должен быть
вычислен доверенным IAM ingress/application resolver.

### AD-5. ApplicationScope реализуется fail-closed

Используется отдельный `AsyncLocalStorage`, не связанный с transaction storage.
API предоставляет только два безопасных действия:

```ts
applicationScope.run(applicationId, callback)
applicationScope.requireId()
```

Fallback application запрещен. Отсутствующий scope является programming/security
error, а не причиной выполнить глобальный запрос.

Любой direct repository lookup tenant-scoped Better Auth таблицы также обязан
получать `applicationId` явно либо выполняться внутри `ApplicationScope`.

### AD-6. Customer остается Shopana entity

IAM возвращает `principalId`. Customer domain хранит связь:

```text
(store_id, iam_principal_id) -> customer
```

`iam_principal_id` допускает `NULL`, потому что guest customer может существовать
без authentication account. IAM не хранит:

- delivery/billing addresses;
- order statistics;
- customer tags/segments;
- marketing consent;
- store-specific notes;
- loyalty state.

### AD-7. Первый этап поддерживает email/password

Realm-aware email/password flow входит в MVP. Следующие flows блокируются до
отдельного решения по callback context:

- OAuth/social sign-in;
- magic link;
- one-tap;
- cross-application account linking.

Password reset и email verification разрешаются только после добавления
`applicationId` в verification storage/token context и проверки полного flow.

### AD-8. JWT всегда содержит Application claim

Access token содержит минимум:

```json
{
  "sub": "principal-id",
  "app": "application-id",
  "sid": "session-id",
  "aud": "shopana-storefront",
  "iss": "shopana-iam"
}
```

Для admin token дополнительно допустим active organization claim. `app` нельзя
заменять `org`: это разные security boundaries.

Storefront middleware сравнивает token `app` с `store.iamApplicationId`. Token
другого Store отклоняется, даже если подпись, issuer и audience валидны.

## Модель данных IAM

### Application

Предлагаемая таблица:

```sql
CREATE TABLE iam.application (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES iam.organization(id) ON DELETE RESTRICT,
  name VARCHAR(128) NOT NULL,
  display_name VARCHAR(256) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  external_system VARCHAR(64),
  external_type VARCHAR(64),
  external_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT application_kind_check
    CHECK (kind IN ('control_plane', 'storefront', 'generic')),
  CONSTRAINT application_status_check
    CHECK (status IN ('active', 'disabled', 'deleted'))
);

CREATE UNIQUE INDEX application_external_ref_unique
  ON iam.application (external_system, external_type, external_id)
  WHERE external_system IS NOT NULL
    AND external_type IS NOT NULL
    AND external_id IS NOT NULL
    AND deleted_at IS NULL;

CREATE INDEX application_organization_idx
  ON iam.application (organization_id)
  WHERE deleted_at IS NULL;
```

Для Shopana значения имеют вид:

```text
external_system = "shopana"
external_type   = "store"
external_id     = Store UUID
kind            = "storefront"
```

`organization_id` допускается nullable для system-owned или внешних Applications,
но storefront Application Shopana обязан иметь владельца.

### User

```sql
ALTER TABLE iam.user
  ADD COLUMN application_id UUID;

-- После backfill:
ALTER TABLE iam.user
  ALTER COLUMN application_id SET NOT NULL,
  ADD CONSTRAINT user_application_fk
    FOREIGN KEY (application_id)
    REFERENCES iam.application(id)
    ON DELETE RESTRICT;

-- Имя существующего constraint уточняется по migration snapshot.
ALTER TABLE iam.user
  DROP CONSTRAINT user_email_unique;

CREATE UNIQUE INDEX user_application_email_unique
  ON iam.user (application_id, lower(email));

CREATE INDEX user_application_created_at_idx
  ON iam.user (application_id, created_at, id);
```

Drizzle schema не должна оставлять `.unique()` на поле `email`. Уникальность
задается только составным `uniqueIndex(applicationId, normalized email)`. Если
выражение `lower(email)` неудобно для Drizzle migrations, добавляется отдельная
колонка `normalized_email`, заполняемая IAM до Better Auth call:

```sql
UNIQUE (application_id, normalized_email)
```

Предпочтительно хранить `normalized_email`, потому что она делает алгоритм
нормализации явным, доступным для audit и одинаковым во всех adapter paths.

Минимальная нормализация MVP:

```text
trim -> Unicode normalization -> lowercase
```

IAM не удаляет точки Gmail и не применяет provider-specific alias rules.

### Account

`account` также получает `application_id`. Иначе одинаковый OAuth provider
subject в двух Applications столкнется с текущим глобальным constraint.

```sql
ALTER TABLE iam.account
  ADD COLUMN application_id UUID NOT NULL;

DROP INDEX iam.idx_account_provider;

CREATE UNIQUE INDEX account_application_provider_unique
  ON iam.account (application_id, provider_id, account_id);

CREATE INDEX account_application_user_idx
  ON iam.account (application_id, user_id);
```

DB constraint или application logic должны гарантировать, что
`account.application_id` совпадает с `user.application_id`.

### Session

```sql
ALTER TABLE iam.session
  ADD COLUMN application_id UUID NOT NULL;

CREATE INDEX session_application_user_idx
  ON iam.session (application_id, user_id);

CREATE INDEX session_application_expires_idx
  ON iam.session (application_id, expires_at);
```

Session token остается глобально уникальным и криптографически случайным.
Application scope требуется дополнительно для defense in depth и проверки, что
refresh/session token используется в правильном Store.

### Verification

```sql
ALTER TABLE iam.verification
  ADD COLUMN application_id UUID NOT NULL;

CREATE INDEX verification_application_identifier_idx
  ON iam.verification (application_id, identifier);
```

Verification token обязан быть связан с Application. Проверка токена из
Application A в Application B должна возвращать generic invalid/expired result.

### JWKS

JWKS остается system-global в первом этапе. Все Applications используют общий
issuer/key set, а isolation обеспечивается обязательным `app` claim и проверкой
expected Application.

Per-Application issuer/JWKS может быть добавлен позднее без изменения principal
identity model.

## Scoped Better Auth adapter

### Контракт

Scoped adapter оборачивает установленный Drizzle Better Auth adapter. Он не
дублирует password hashing или endpoint logic.

Псевдокод:

```ts
const SCOPED_MODELS = new Set([
  "user",
  "account",
  "session",
  "verification",
]);

function scopeWhere(model: string, where: Where[]): Where[] {
  if (!SCOPED_MODELS.has(model)) return where;

  return [
    ...where,
    {
      field: "applicationId",
      operator: "eq",
      value: applicationScope.requireId(),
    },
  ];
}
```

Обязательное поведение операций:

| Adapter operation | Требование |
| --- | --- |
| `create` | Вставить current `applicationId`; отклонить mismatch |
| `findOne` | Добавить application predicate |
| `findMany` | Добавить application predicate |
| `count` | Добавить application predicate |
| `update` | Добавить application predicate; запретить смену application |
| `updateMany` | Добавить application predicate; запретить смену application |
| `delete` | Добавить application predicate |
| `deleteMany` | Добавить application predicate |
| `transaction` | Сохранить тот же scope для wrapped transaction adapter |

Если исходный where уже содержит `applicationId`, wrapper проверяет равенство с
current scope и не допускает противоречивого условия.

### Better Auth additional fields

`applicationId` объявляется server-managed additional field для `user`,
`session` и `account`:

```ts
applicationId: {
  type: "string",
  required: true,
  input: false,
  returned: false,
}
```

Поле не принимается от public Better Auth request body. Источником значения
является только scoped adapter/application context.

Additional fields не заменяют adapter wrapper: они описывают schema и parsing,
но не добавляют `applicationId` в `findUserByEmail()`.

### Direct Drizzle access

Direct запросы к `iam.user`, `iam.account`, `iam.session` и `iam.verification`
разрешены только в scoped repositories с обязательным параметром
`applicationId`. Методы вида `findByEmail(email)` запрещены и заменяются на:

```ts
findByEmail(applicationId, normalizedEmail)
```

Application provisioning repository является system-level и не требует
ApplicationScope, но требует service/admin authorization.

## Интеграция Shopana Project/Store

### Store schema

Сервис `project` хранит внешнюю ссылку без cross-service FK:

```sql
ALTER TABLE store.store
  ADD COLUMN iam_application_id UUID;

CREATE UNIQUE INDEX store_iam_application_unique
  ON store.store (iam_application_id)
  WHERE iam_application_id IS NOT NULL;
```

После миграции и backfill поле становится обязательным для active Store.

### Store creation saga

Целевой порядок:

```text
1. Generate Store ID
2. Create Store in provisioning state
3. iam.createApplication(externalRef = shopana/store/{storeId})
4. Save iamApplicationId in Store
5. Create store admin roles
6. Assign creator admin role
7. Create media asset group
8. Activate Store
9. Emit storeCreated
```

`iam.createApplication` является идемпотентным по
`(externalSystem, externalType, externalId)`. Retry возвращает существующий
Application, если immutable owner/kind совпадают.

Compensation не выполняет hard delete Application. Она переводит его в
`disabled`, отзывает sessions и ставит retention marker. Это исключает
небезопасное повторное использование старой identity namespace.

### Store deletion

При удалении Store:

1. Store переходит в deleting/disabled state.
2. IAM Application блокируется.
3. Новые sign-in/sign-up запрещаются.
4. Активные sessions отзываются.
5. Customer data удаляется/анонимизируется по отдельной retention policy.
6. IAM principals удаляются или анонимизируются асинхронно по IAM policy.

Удаленный `external_id` не переиспользуется для нового active Application без
явной recovery procedure.

## Public и internal API

### Application provisioning

Internal broker contracts:

```ts
interface ApplicationCreateParams {
  organizationId?: string;
  name: string;
  displayName: string;
  kind: "control_plane" | "storefront" | "generic";
  externalRef?: {
    system: string;
    type: string;
    id: string;
  };
}

interface ApplicationCreateResult {
  applicationId: string | null;
  created: boolean;
  userErrors: UserError[];
}
```

Дополнительные operations:

- `iam.applicationDisable`;
- `iam.applicationEnable`;
- `iam.applicationGetByExternalRef`;
- `iam.applicationRevokeSessions`.

Они являются service/admin APIs и не публикуются storefront client напрямую.

### Customer authentication

Storefront GraphQL принимает только пользовательские credentials. Client не
передает доверенный `applicationId`:

```graphql
input CustomerSignInInput {
  email: Email!
  password: String!
}
```

Server-side flow:

```text
request host / x-store-name
  -> trusted StoreResolver
  -> Store.iamApplicationId
  -> IAM customerSignIn(applicationId, email, password)
  -> ApplicationScope.run(...)
  -> Better Auth
```

Если broker contract содержит `applicationId`, он считается internal trusted
field и никогда не копируется из GraphQL input.

### Current customer

```text
Storefront access token
  -> verify signature/issuer/audience
  -> compare token.app with resolved Store.iamApplicationId
  -> obtain token.sub
  -> customer.findByPrincipal(store.id, token.sub)
  -> request.customer
```

Если валидный IAM principal существует, но Customer profile еще не создан,
customer domain выполняет идемпотентный lazy create либо завершает registration
workflow. Выбор должен быть единым для всех storefront services.

## Authentication flows

### Sign-up

```text
1. Resolve Store.
2. Read Store.iamApplicationId.
3. Verify Application is active and kind=storefront.
4. Normalize email.
5. Enter ApplicationScope.
6. Better Auth checks email inside scoped adapter.
7. Insert user/account/session with applicationId.
8. Issue JWT with sub + app + sid.
9. Create/link Shopana Customer for (storeId, principalId).
10. Return token and Customer.
```

Concurrent registration одинакового email внутри Application разрешается на
application layer только одной операции. Источником истины является DB unique
constraint. Unique violation маппится в стабильный `EMAIL_ALREADY_EXISTS`, без
раскрытия данных другого Application.

### Sign-in

```text
1. Resolve expected Application from Store.
2. Enter ApplicationScope.
3. Better Auth findUserByEmail(email) проходит через scoped adapter.
4. Adapter добавляет applicationId predicate.
5. Better Auth проверяет credential account/password.
6. Session создается в той же Application.
7. JWT получает app claim.
```

Ошибки «email отсутствует» и «пароль неверный» возвращают одинаковый public
result `INVALID_CREDENTIALS`.

### Refresh/session validation

Expected Application всегда приходит из trusted route/store context. Найденная
session и связанный user обязаны принадлежать expected Application. Несовпадение
логируется как security event и возвращает generic unauthorized response.

### Email verification/password reset

Verification storage и подписанный token должны нести Application identity.
Callback должен восстановить expected Application из подписанного token/state,
а не из query parameter без подписи.

Token одноразовый, имеет expiry и не может быть использован в другом
Application. Public responses не подтверждают наличие email.

## Customer data model

Customer schema находится вне IAM. Минимальная связь:

```sql
CREATE TABLE customers.customer (
  id UUID PRIMARY KEY,
  store_id UUID NOT NULL,
  iam_principal_id TEXT,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX customer_store_principal_unique
  ON customers.customer (store_id, iam_principal_id)
  WHERE iam_principal_id IS NOT NULL;
```

Email может быть проекцией verified identifier для admin/search, но IAM остается
источником истины для login identifier. Изменение email выполняется через
identity workflow, после чего customer projection обновляется событием.

Guest Customer не получает фиктивный IAM user. При последующей регистрации
guest merge выполняется customer domain по отдельным deterministic rules.

## Security invariants

1. Ни одна tenant-scoped Better Auth операция не выполняется без
   `ApplicationScope`.
2. `applicationId` никогда не принимается как доверенное значение из storefront
   request body/header.
3. User, account, session и verification принадлежат одному Application.
4. JWT `app` совпадает с Application текущего Store.
5. Application другого Store не может использовать token/session текущего Store.
6. Disabled Application не создает users/sessions и не refresh-ит sessions.
7. User не может сменить `applicationId` через update.
8. Email uniqueness проверяется DB constraint, а не только preflight query.
9. Logs и metrics не содержат raw password/token; raw email не используется как
   metric label.
10. Cache/rate-limit keys включают `applicationId`.

Примеры ключей:

```text
auth:rate:{applicationId}:{normalizedEmailHash}:{ipPrefix}
auth:user:{applicationId}:{normalizedEmailHash}
auth:session:{applicationId}:{sessionTokenHash}
```

## Observability и аудит

Structured logs содержат:

- `applicationId`;
- `organizationId`, если применимо;
- `principalId`, если уже известен;
- `sessionId` или его безопасный hash;
- `requestId`;
- operation/result/error code.

Audit events:

- `iam.application.created`;
- `iam.application.disabled`;
- `iam.principal.created`;
- `iam.principal.email_verified`;
- `iam.session.created`;
- `iam.session.revoked`;
- `iam.cross_application_token_rejected`.

Metrics агрегируются по Application kind/status и service operation. Нельзя
использовать `email`, token или неограниченный external ID как metric label.

## Миграция

Production/stage users сейчас отсутствуют, поэтому допускается прямолинейная
миграция без сложного account reconciliation. Тем не менее порядок должен
сохранять валидную schema на каждом шаге.

### Phase 0. Adapter compatibility spike

До изменения production code подтвердить на установленном Better Auth 1.4.7:

- wrapper перехватывает все CRUD operations четырех scoped моделей;
- `findUserByEmail()` получает application predicate;
- adapter transactions не теряют ApplicationScope;
- session creation получает applicationId;
- additional fields не принимаются из public input;
- Better Auth upgrades можно проверять contract-level compatibility suite.

Если полное покрытие wrapper невозможно, решение о scoped adapter отменяется в
пользу отдельного auth engine/adapter implementation. Частично scoped adapter
запрещен.

### Phase 1. Application schema

1. Создать `iam.application`.
2. Создать system control-plane Application.
3. Добавить nullable `application_id` в Better Auth tables.
4. Backfill существующих admin users/accounts/sessions/verifications в
   control-plane Application.
5. Добавить FK/indexes.

### Phase 2. Enforce scope

1. Внедрить `ApplicationScope`.
2. Внедрить scoped adapter.
3. Добавить server-managed Better Auth additional fields.
4. Перевести IAM repositories/scripts на обязательный `applicationId`.
5. Добавить `app` claim в JWT.
6. Запретить auth calls вне scope.

### Phase 3. Replace uniqueness

Только после Phase 2:

1. Backfill/verify `normalized_email`.
2. Удалить глобальную уникальность email.
3. Добавить `UNIQUE(application_id, normalized_email)`.
4. Заменить provider uniqueness на application-scoped constraint.
5. Сделать `application_id NOT NULL`.

Порядок критичен: сначала lookup isolation, затем разрешение дубликатов email.

### Phase 4. Store provisioning

1. Добавить `store.store.iam_application_id`.
2. Расширить Store creation/deletion saga.
3. Backfill Applications для существующих Stores.
4. Сделать связь обязательной для active Stores.
5. Добавить idempotent provisioning/recovery tooling.

### Phase 5. Customer authentication

1. Добавить storefront customer sign-up/sign-in contracts.
2. Добавить JWT/store Application validation.
3. Реализовать Customer link/profile lifecycle.
4. Заполнить `request.customer` в storefront context.
5. Добавить verification/reset flows после realm-aware token проверки.

### Phase 6. OAuth и advanced auth

Отдельный tech spec должен определить:

- signed application identity в OAuth state;
- allowlisted callback URLs per Application;
- application-scoped provider config;
- account linking policy;
- protection от cross-application callback replay;
- per-Application branding/email templates.

## Acceptance criteria

### Data isolation

- В Application A можно создать `user@example.com`.
- В Application B можно создать `user@example.com`.
- Повторное создание `user@example.com` в Application A возвращает
  `EMAIL_ALREADY_EXISTS`.
- Sign-in в Application A никогда не проверяет password hash principal из
  Application B.
- Direct scoped lookup без ApplicationScope завершается ошибкой.
- Попытка передать чужой `applicationId` в public input не влияет на scope.

### Sessions и tokens

- Token содержит корректный `app` claim.
- Token Application A отклоняется в Store/Application B.
- Refresh token Application A отклоняется в Application B.
- Disable Application отзывает либо делает недействительными все ее sessions.
- Admin control-plane token не принимается как storefront customer token.

### Provisioning

- Retry Store creation не создает второй IAM Application.
- Store не становится active без сохраненного `iamApplicationId`.
- Compensation отключает созданный Application.
- Удаление Store не позволяет переиспользовать старые sessions.

### Customer boundary

- Один IAM principal связан максимум с одним Customer внутри Store.
- Principals одинакового email из разных Stores имеют разные Customer IDs.
- Guest Customer существует без IAM principal.
- Customer business fields отсутствуют в IAM schema.

## Риски и меры

| Риск | Последствие | Мера |
| --- | --- | --- |
| Better Auth добавит новый adapter path | Нескоупированный доступ | Contract suite на все adapter operations перед upgrade |
| Scope потерян в async flow | Cross-application lookup | ALS fail-closed, обязательный `requireId()` |
| Убран global email index раньше adapter | Неоднозначный sign-in | Строгий migration ordering |
| OAuth callback потеряет app | Linking в неправильный realm | OAuth вне MVP, signed state в отдельном spec |
| Client подменит applicationId | Account takeover/cross-tenant access | Scope только из trusted Store resolver |
| Store creation частично завершится | Store без auth realm | Idempotent saga + provisioning state |
| Token используется в другом Store | Cross-store impersonation | Сравнение JWT `app` с expected Application |
| IAM знает Shopana domain | Потеря универсальности | Generic Application + external reference, без Store FK |

## Отклоненные альтернативы

### Глобальный Better Auth User + разные Customer profiles

```text
global auth user
├── Store A customer
└── Store B customer
```

Эта модель проще и полностью совместима со стандартным Better Auth, но дает один
общий пароль, verification state и account lifecycle для всех Stores. Она не
выполняет требование независимых project-level identities.

### Добавить только `applicationId` и composite unique index

Отклонено: стандартный Better Auth продолжит искать только по email.

### Кодировать Application в email

Пример: `store-id:user@example.com@internal.invalid`.

Отклонено, потому что ломает email verification, password reset, OAuth linking,
audit и provider interoperability, а также смешивает login identifier с
техническим routing key.

### Отдельная database/schema для каждого Application

Обеспечивает изоляцию стандартным `UNIQUE(email)`, но создает операционную
стоимость на миграции, connection pools, backups и dynamic Store provisioning.
Может использоваться только как отдельная deployment topology для крупных
enterprise tenants, но не как базовая модель.

### Использовать Organization как Application

Отклонено: одна Organization владеет несколькими Stores, а customers должны быть
независимы между Stores. Organization остается ownership/team boundary.

## Definition of Done

- Architecture decision и schema migrations реализованы согласованно.
- Ни одна tenant-scoped Better Auth operation не выполняется без scope.
- Global `UNIQUE(email)` удален только после включения scoped lookup.
- Store lifecycle управляет IAM Application идемпотентно.
- JWT и storefront context проверяют expected Application.
- Customer business profile отделен от IAM principal.
- OAuth и magic-link остаются выключенными до realm-aware callback design.
- Build затронутых пакетов/сервисов проходит через `shopana-cli` workflow.
