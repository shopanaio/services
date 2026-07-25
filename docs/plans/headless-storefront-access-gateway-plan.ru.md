# План реализации Headless App, Storefront credentials и Gateway authentication

## 1. Статус и контекст

- Дата: 2026-07-25.
- Тип: архитектурный и implementation plan.
- Стратегия: clean cutover без backward compatibility, backfill и dual write.
- Целевая модель:

```text
Store
  -> Headless AppInstallation
    -> 0..N SalesChannelConnection
      -> StorefrontAccessPolicy
      -> 1 public credential
      -> 0..N private credentials
```

- Source of truth для installation и channel: Apps Service.
- Source of truth для storefront access policy и credentials: bundled
  Headless App.
- Публичная точка входа: Storefront Hive Gateway.
- Проверка credential: один раз до GraphQL query planning.
- Доверенный storefront context: короткоживущий подписанный JWS, создаваемый
  Gateway и проверяемый каждым subgraph.
- Customer authentication не входит в storefront credential и остаётся
  отдельным протоколом IAM.

Этот документ продолжает решения из:

- `docs/plans/sales-channels-as-app-extensions-plan.md`;
- `knowledge/vault/architecture/multi-tenancy.md`;
- `knowledge/vault/configuration/federation-config.md`;
- `knowledge/vault/patterns/federation.md`;
- `knowledge/vault/patterns/repository.md`.

## 2. Цель

Реализовать first-party Headless sales-channel App по модели Shopify Headless:

1. Одна установка Headless App на store.
2. Несколько независимых custom storefront connections внутри installation.
3. Автоматический public access token для каждого connection.
4. Один initial private access token с одноразовым возвратом.
5. Несколько одновременно активных private tokens для безопасной ротации.
6. Общая permission policy для public и private access.
7. Проверка credential на Storefront Gateway до federation.
8. Доверенная передача `storeId`, `organizationId`, `connectionId`, access mode
   и permissions в subgraphs.
9. Channel attribution для cart, checkout, order и storefront events.
10. Немедленная блокировка доступа при revoke, suspend, disconnect или
    деактивации App installation.

## 3. Не входит в scope

- Shopana-hosted theme engine.
- Liquid или другой server-side template runtime.
- Theme editor.
- Managed storefront deployments.
- Customer OAuth/OIDC runtime.
- Customer access token lifecycle.
- Tokenless Storefront API.
- API key для Admin API.
- OAuth client credentials для third-party Apps.
- Product publication implementation.
- Analytics warehouse и отчёты по каналам.
- CDN authentication.
- Поддержка legacy `x-api-key`.
- Изменение manifest, runtime, lifecycle или UI существующей
  `shopana-online-store`.

Product publication, cart/order attribution и customer auth упоминаются только
в объёме контрактов, которые Headless access должен предоставить последующим
этапам.

## 4. Терминология

| Термин | Значение |
| --- | --- |
| `Headless App` | First-party App, объявляющая custom storefront sales-channel specification |
| `Headless storefront` | Один `SalesChannelConnection` Headless App |
| `Storefront credential` | Opaque bearer token, идентифицирующий connection и access mode |
| `Public credential` | Токен, который разрешено использовать в browser/mobile client |
| `Private credential` | Секретный токен для BFF, SSR, build worker или другого backend |
| `Access policy` | Версионированный набор Storefront API permissions connection |
| `Storefront context` | Доверенные claims, полученные после проверки credential |
| `Customer principal` | Отдельно аутентифицированный покупатель |

Public/private credentials не являются асимметричной криптографической парой.
Это независимые opaque bearer tokens с разным местом использования.

## 5. Архитектурные решения

### 5.1. Online Store и Headless являются независимыми Apps

Существующая bundled App `apps/online-store` остаётся без изменений:

```text
apps/online-store
  code: shopana-online-store
  specification: online-store
```

Headless реализуется новой bundled App:

```text
apps/headless
  code: shopana-headless
  specification: headless-storefront
```

Обе Apps могут быть установлены в одном store одновременно. Они имеют разные
installations, specification snapshots, connections и lifecycle:

```text
Store
  ├── Online Store AppInstallation
  │     └── Online Store SalesChannelConnection
  └── Headless AppInstallation
        ├── Website EU SalesChannelConnection
        └── Mobile App SalesChannelConnection
```

Storefront credentials этого плана создаются только для specification с
`storefrontApi.enabled == true`. Существующая Online Store specification не
получает этот блок автоматически и не затрагивается credential provisioning.

### 5.2. Один connection равен одному storefront/channel

Примеры:

```text
Headless AppInstallation
  -> Website EU
  -> Website US
  -> Mobile App
```

Каждый connection имеет:

- собственный `connectionId`;
- display name;
- собственную permission policy;
- собственные public/private credentials;
- собственную cart/order attribution;
- независимый lifecycle.

`allowMultipleConnections` для Headless specification равен `true`.

### 5.3. Credentials принадлежат connection

Credential нельзя привязывать только к store или installation:

- один store может иметь несколько storefronts;
- одна installation может иметь несколько connections;
- permissions и attribution должны различаться по storefront;
- revoke одного storefront не должен отключать остальные.

Canonical owner:

```text
StorefrontCredential.connectionId
  -> SalesChannelConnection.id
```

### 5.4. Headless App — storefront access authority

Граница владения разделяется явно.

Apps Service владеет только platform-generic entities:

- Headless App installation;
- sales-channel specification snapshot;
- sales-channel connection;
- installation и connection lifecycle.

Bundled Headless App владеет всем, что относится к Storefront API access:

- access policy;
- credential persistence;
- create/rotate/revoke;
- credential resolution;
- security audit events;
- Admin GraphQL для credentials и permissions;
- internal resolution endpoint.

Storefront-access модели, repositories, migrations, resolvers и internal server
не добавляются в `services/apps`. Headless использует предоставленные App
runtime `databaseClient`, broker, execution context и secrets. Если runtime
недостаёт generic hosting primitive, расширяется `packages/app-sdk` или
`packages/app-runtime`, но Headless-specific domain code остаётся в
`apps/headless`.

Gateway не читает таблицы Headless App напрямую.

### 5.5. Gateway — authentication boundary

Gateway:

1. Принимает public или private token.
2. Вызывает внутренний resolution endpoint Headless App.
3. Получает проверенный storefront context.
4. Выпускает короткоживущий internal JWS.
5. Передаёт только internal JWS в subgraphs.

Credential не проверяется повторно каждым subgraph. Subgraphs проверяют подпись
internal context и выполняют domain/permission authorization.

### 5.6. Admin и Storefront Gateway получают разные configs

Текущий `infra/federation/gateway.config.ts` используется обеими surfaces и
безусловно форвардит клиентские заголовки. Его нужно разделить:

```text
infra/federation/gateway-admin.config.ts
infra/federation/gateway-storefront.config.ts
```

Admin config сохраняет admin authentication contract. Storefront config:

- подключает storefront access plugin;
- не форвардит `x-api-key`;
- не доверяет клиентским `x-shopana-*` заголовкам;
- передаёт subgraphs только подписанный internal context, customer
  `authorization`, request metadata и разрешённые transport headers.

### 5.7. Private token не получает дополнительные permissions

Public и private credentials одного connection используют одну access policy.
Private mode отличается:

- секретностью;
- server-side usage;
- rate-limit identity;
- поддержкой buyer IP;
- audit metadata.

Private token не открывает Admin API и не обходит storefront permissions.

### 5.8. Customer identity отделена от channel identity

```text
Storefront credential
  -> store + sales channel + permissions

Authorization: Bearer <customer token>
  -> customer principal
```

Storefront request может быть:

- channel-authenticated без customer;
- channel-authenticated и customer-authenticated.

Customer token никогда не заменяет storefront credential.

## 6. Итоговый request flow

```text
Browser / Mobile / BFF
  |
  | X-Shopana-Storefront-Access-Token
  | или Shopana-Storefront-Private-Token
  v
Storefront Hive Gateway
  |
  | POST /internal/storefront-access/resolve
  | internal service authentication
  v
Headless App internal resolver
  |
  | parse kid
  | lookup credential
  | HMAC verify
  | resolve requested store
  | verify connection + installation
  | load access policy
  v
Resolved StorefrontAccessContext
  |
  v
Gateway signs short-lived internal JWS
  |
  | X-Shopana-Storefront-Context: <JWS>
  v
Catalog / Listing / Pricing / Checkout / Orders / App subgraphs
  |
  | verify JWS
  | build ServiceContext
  | enforce permission
  v
GraphQL result
```

## 7. Headless App manifest

### 7.1. Target manifest

```ts
export const headlessManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-headless",
  version: "1.0.0",
  displayName: "Headless",
  description: "Custom storefronts using the Shopana Storefront API.",
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [],
  capabilities: [],
  extensions: {
    salesChannels: {
      specifications: [
        {
          handle: "headless-storefront",
          label: "Custom storefront",
          connection: {
            allowMultipleConnections: true,
            requiresExternalAccount: false,
          },
          storefrontApi: {
            enabled: true,
            availablePermissions: [
              "storefront.catalog.read",
              "storefront.inventory.read",
              "storefront.content.read",
              "storefront.metaobjects.read",
              "storefront.cart.read",
              "storefront.cart.write",
              "storefront.customer.write",
            ],
            defaultPermissions: [
              "storefront.catalog.read",
              "storefront.inventory.read",
              "storefront.cart.read",
              "storefront.cart.write",
            ],
          },
          operations: {
            connect: "channelConnect",
            update: "channelUpdate",
            suspend: "channelSuspend",
            resume: "channelResume",
            disconnect: "channelDisconnect",
            health: "channelHealth",
          },
        },
      ],
    },
  },
  graphql: {
    admin: true,
    storefront: true,
  },
});
```

### 7.2. App SDK contract

Расширить `SalesChannelSpecification` optional-блоком:

```ts
interface StorefrontApiSpecification {
  readonly enabled: true;
  readonly availablePermissions: readonly string[];
  readonly defaultPermissions: readonly string[];
}
```

Validation:

1. Permission handles соответствуют
   `^[a-z][a-z0-9]*(?:[.:_-][a-z0-9]+)*$`.
2. `defaultPermissions` являются подмножеством `availablePermissions`.
3. Все permissions существуют в Headless-owned Storefront Permission Catalog.
4. Дубликаты запрещены.
5. `storefrontApi` нельзя объявить без sales-channel specification.
6. Manifest не содержит token values, hashes, pepper или signing keys.

Permission Catalog принадлежит `apps/headless`, а не core Apps Service.
`packages/app-sdk` проверяет только форму, subset и дубликаты generic manifest
contract; Headless App при registration/start семантически проверяет handles
против собственного catalog. Manifest только выбирает допустимое подмножество.

### 7.3. Runtime lifecycle

Credential lifecycle является responsibility самой Headless App.

`channelConnect` валидирует Headless configuration и возвращает безопасную
нормализованную конфигурацию. Он не передаёт plaintext credentials через DBOS
workflow input/result.

После активации connection Headless Admin mutation идемпотентно создаёт policy
и initial credentials. `channelDisconnect` и uninstall handlers отзывают
credentials в Headless-owned storage.

Core Apps Service не знает о token format, policy grants или credential
lifecycle. Effective access появляется только после успешных activation и
Headless provisioning.

## 8. Token format и cryptography

### 8.1. Формат

```text
shpna_sfpub_v1_<kid>_<secret>
shpna_sfprv_v1_<kid>_<secret>
```

Где:

- `kid`: 16 random bytes, base64url без padding;
- `secret`: 32 random bytes, base64url без padding;
- `sfpub`/`sfprv`: явный тип credential;
- `v1`: версия token parser и digest scheme.

Нельзя использовать UUID как secret. Все случайные значения создаются через
`node:crypto.randomBytes`.

### 8.2. Digest

В БД сохраняется:

```text
HMAC-SHA-256(pepper[pepperVersion], fullToken)
```

Причины использовать HMAC, а не password hashing:

- token имеет не менее 256 бит случайной entropy;
- dictionary attack неприменим;
- проверка находится в hot path;
- server-side pepper защищает digest при отдельной утечке БД.

Сравнение выполняется через `timingSafeEqual`.

### 8.3. Pepper

Configuration:

```text
STOREFRONT_TOKEN_ACTIVE_PEPPER_VERSION=1
STOREFRONT_TOKEN_PEPPER_V1=<secret>
```

Production startup прекращается, если active pepper отсутствует или слишком
короткий. Development fallback не добавляется.

`pepper_version` хранится на credential, поэтому можно:

1. Добавить `V2`.
2. Начать выпуск новых credentials с `V2`.
3. Оставить resolver способным проверять `V1`.
4. Отозвать или перевыпустить старые credentials.
5. Удалить `V1` только когда активных credentials этой версии нет.

### 8.4. Public token persistence

Public token не является секретом, но Admin UI должен позволять копировать его
повторно. Поэтому сохраняются:

- digest для request authentication;
- encrypted token value для Admin read path.

Encryption:

- AES-256-GCM;
- отдельный `STOREFRONT_PUBLIC_TOKEN_MASTER_KEY`;
- random 12-byte IV;
- versioned ciphertext envelope;
- authenticated additional data:
  `storeId:connectionId:credentialId:PUBLIC`.

Нельзя использовать `APPS_SECRET_MASTER_KEY`: разные security domains должны
иметь разные master keys.

### 8.5. Private token persistence

Private plaintext:

- возвращается только в create/rotate mutation payload;
- не сохраняется зашифрованным;
- не пишется в logs, events, traces, errors или workflow inputs;
- не возвращается через query;
- не может быть восстановлен.

При потере private token создаётся новый, после deployment старый отзывается.

## 9. Persistence model

### 9.1. Enums

```text
app_storefront_credential_kind:
  PUBLIC
  PRIVATE

app_storefront_credential_status:
  ACTIVE
  REVOKED
```

Отдельный `PENDING` не нужен. Effective access всегда вычисляется как:

```text
credential.status == ACTIVE
AND connection.status == ACTIVE
AND installation.status == ACTIVE
```

Provisioning для `CONNECTING` connection отклоняется. Credential создаётся
только после `ACTIVE`, а resolver повторно проверяет status на каждом request.

### 9.2. Access policy

```text
app_shopana_headless.storefront_access_policies
───────────────────────────────────────────────
connection_id       uuid PK/FK app_sales_channel_connections
organization_id     uuid not null
store_id            uuid not null
revision            integer not null default 1
created_at          timestamptz not null
updated_at          timestamptz not null
```

```text
app_shopana_headless.storefront_access_policy_grants
────────────────────────────────────────────────────
connection_id       uuid FK app_storefront_access_policies
permission          varchar(128)
created_at          timestamptz not null

PK (connection_id, permission)
```

`organization_id` и `store_id` дублируются намеренно для tenant-safe indexes и
defense-in-depth ownership checks.

### 9.3. Credentials

```text
app_shopana_headless.storefront_credentials
────────────────────────────────────────────
id                         uuidv7 PK
organization_id            uuid not null
store_id                   uuid not null
connection_id              uuid not null FK app_sales_channel_connections
kind                       enum not null
status                     enum not null
kid                        varchar(64) not null
token_version              smallint not null
pepper_version             smallint not null
token_digest               bytea not null
public_token_ciphertext    text nullable
label                      varchar(255) nullable
token_hint                 varchar(16) not null
created_by_type            varchar(16) not null
created_by_id              varchar(255) nullable
revoked_by_type            varchar(16) nullable
revoked_by_id              varchar(255) nullable
last_used_at               timestamptz nullable
created_at                 timestamptz not null
revoked_at                 timestamptz nullable
```

Constraints:

```text
unique (kid)
unique (token_digest)

check (
  (kind = 'PUBLIC'  and public_token_ciphertext is not null)
  or
  (kind = 'PRIVATE' and public_token_ciphertext is null)
)

check (
  (status = 'ACTIVE'  and revoked_at is null)
  or
  (status = 'REVOKED' and revoked_at is not null)
)
```

Partial index:

```text
unique (connection_id)
where kind = 'PUBLIC' and status = 'ACTIVE'
```

Private credentials intentionally do not have one-active-token constraint.

Indexes:

```text
index (connection_id, kind, status, created_at)
index (store_id, status)
index (organization_id, status)
```

### 9.4. Migration layout

Добавить migrations в package Headless App:

```text
apps/headless/migrations/
  001_storefront_access_policy.*
  002_storefront_credentials.*
```

Migrations используют отдельную App-owned schema `app_shopana_headless` и
настройки `apps/headless/build.config.json`. Они не добавляются в
`services/apps/migrations` и не используют core `platform` schema.

Changeset вручную не редактируется. Если package release требует changeset, он
создаётся только штатной npm-командой генерации.

## 10. Domain services и repositories

### 10.1. Target folders

```text
apps/headless/
  migrations/
  src/
    storefront-access/
      control-plane/
        StorefrontAccessPolicyService.ts
        StorefrontCredentialService.ts
        StorefrontCredentialCrypto.ts
        StorefrontCredentialTypes.ts
      data-plane/
        StorefrontCredentialResolver.ts
        StorefrontAccessInternalServer.ts
        StorefrontAccessRateLimitIdentity.ts
      repositories/
        StorefrontAccessPolicyRepository.ts
        StorefrontCredentialRepository.ts
        models/
    api/
      graphql-admin/
      internal/
```

Headless repositories создаются внутри App из `host.databaseClient` и не
подключаются к `services/apps/src/repositories/Repository.ts`.

### 10.2. `StorefrontCredentialCrypto`

Responsibilities:

- token generation;
- strict token parsing;
- HMAC digest;
- constant-time comparison;
- public token encryption/decryption;
- pepper version selection;
- redacted token hint.

Класс не обращается к БД и не знает GraphQL.

### 10.3. `StorefrontAccessPolicyService`

Responsibilities:

- создать default policy для connection;
- получить policy;
- заменить полный grant set;
- проверить optimistic `revision`;
- проверить grant по platform catalog и specification snapshot;
- не принимать permissions вне текущего Headless specification;
- выдавать immutable sorted permission list.

Update является полной заменой. Пустой список разрешён, но такой storefront
получает только schema-level поля, явно помеченные как без permission, если они
существуют.

### 10.4. `StorefrontCredentialService`

Control-plane methods:

```ts
provisionInitialCredentials(input): Promise<{
  publicAccessToken: string;
  privateAccessToken: string;
  publicCredential: StorefrontCredentialRecord;
  privateCredential: StorefrontCredentialRecord;
}>;

createPrivateCredential(input): Promise<{
  credential: StorefrontCredentialRecord;
  privateAccessToken: string;
}>;

revokeCredential(input): Promise<StorefrontCredentialRecord>;

getPublicAccessToken(connectionId): Promise<string>;

listCredentials(connectionId): Promise<StorefrontCredentialRecord[]>;
```

Invariants:

1. Connection принадлежит current trusted store.
2. Specification имеет `storefrontApi.enabled`.
3. Initial provisioning идемпотентно создаёт ровно один public credential.
4. Повторный provision request не создаёт новый public token.
5. Private plaintext не возвращается при duplicate idempotency request.
6. Public credential нельзя revoke обычной revoke mutation.
7. Private credential можно revoke независимо.
8. Revoke уже revoked credential с тем же idempotency key возвращает duplicate
   success.
9. Credential другого store выглядит как not found.
10. Token values не попадают в operation/audit payload.

### 10.5. Initial provisioning transaction

Core `salesChannelConnectionCreate` не расширяется credential-specific
поведением. Он создаёт connection и запускает существующий lifecycle workflow.

После успешного `channelConnect` Admin flow вызывает Headless-owned mutation
`headlessStorefrontAccessProvision`. В одной App-owned transaction она:

1. Через generic `apps.salesChannels.resolveConnection` проверяет connection,
   installation, app ownership и статус `ACTIVE`.
2. Создаёт default access policy.
3. Создаёт public credential.
4. Создаёт initial private credential.
5. Commit.
6. Возвращает оба plaintext только из текущего mutation result.

В UI это один create-storefront flow: activation завершается автоматическим
provision request. Core Apps GraphQL payload при этом не знает о credentials.

До успешного provisioning credential отсутствует. После provisioning resolver
всё равно проверяет `connection.status == ACTIVE`.

Если клиент потерял response:

- public token доступен через query;
- initial private token восстановить нельзя;
- после активации connection пользователь создаёт новый private token;
- потерянный initial private credential затем отзывается по ID/hint.

Если connect завершился ошибкой, provisioning не запускается. После successful
retry UI вызывает ту же idempotent Headless mutation; новый public token
создаётся только если provisioning ещё не был committed.

### 10.6. Disconnect и uninstall

Physical delete credentials запрещён.

Effective access прекращается автоматически, когда:

```text
connection.status != ACTIVE
or installation.status != ACTIVE
```

После terminal `DISCONNECTED` Headless App при lifecycle callback дополнительно
переводит все active credentials connection в `REVOKED`, чтобы audit state явно
отражал закрытие.

App uninstall:

1. Останавливает новые credential mutations.
2. Controlled-disconnect connections.
3. После terminal disconnect отзывает credentials.
4. Не удаляет audit records.

## 11. Headless Admin GraphQL subgraph

### 11.1. Types

```graphql
enum StorefrontCredentialKind {
  PUBLIC
  PRIVATE
}

enum StorefrontCredentialStatus {
  ACTIVE
  REVOKED
}

type StorefrontAccessPolicy {
  permissions: [String!]!
  revision: Int!
  updatedAt: DateTime!
}

type StorefrontCredential implements Node @key(fields: "id") {
  id: ID!
  kind: StorefrontCredentialKind!
  status: StorefrontCredentialStatus!
  label: String
  tokenHint: String!
  createdAt: DateTime!
  lastUsedAt: DateTime
  revokedAt: DateTime
}

type StorefrontInitialCredentials {
  publicAccessToken: String!
  privateAccessToken: String!
}

extend type SalesChannelConnection {
  storefrontAccessPolicy: StorefrontAccessPolicy
  publicAccessToken: String
  storefrontCredentials: [StorefrontCredential!]!
}
```

`publicAccessToken` возвращается только если specification поддерживает
Storefront API и caller имеет соответствующее Admin permission.

### 11.2. Initial provisioning payload

Core `SalesChannelLifecyclePayload` не изменяется. Headless App публикует
собственный payload:

```graphql
type HeadlessStorefrontAccessProvisionPayload {
  connection: SalesChannelConnection
  duplicate: Boolean!
  initialStorefrontCredentials: StorefrontInitialCredentials
  userErrors: [GenericUserError!]!
}
```

`initialStorefrontCredentials`:

- заполнен только при первом успешном provision request;
- `null` при duplicate replay;
- не сохраняется в GraphQL cache автоматически;
- Admin UI сразу показывает private-token warning.

### 11.3. Mutations

```graphql
input StorefrontPrivateCredentialCreateInput {
  connectionId: ID!
  label: String!
  clientMutationId: String!
}

input HeadlessStorefrontAccessProvisionInput {
  connectionId: ID!
  clientMutationId: String!
}

input StorefrontCredentialRevokeInput {
  credentialId: ID!
  clientMutationId: String!
}

input StorefrontAccessPolicyUpdateInput {
  connectionId: ID!
  permissions: [String!]!
  expectedRevision: Int!
  clientMutationId: String!
}

type StorefrontPrivateCredentialCreatePayload {
  credential: StorefrontCredential
  privateAccessToken: String
  userErrors: [GenericUserError!]!
}

type StorefrontCredentialPayload {
  credential: StorefrontCredential
  duplicate: Boolean!
  userErrors: [GenericUserError!]!
}

type StorefrontAccessPolicyPayload {
  policy: StorefrontAccessPolicy
  userErrors: [GenericUserError!]!
}

extend type AppsMutation {
  headlessStorefrontAccessProvision(
    input: HeadlessStorefrontAccessProvisionInput!
  ): HeadlessStorefrontAccessProvisionPayload!

  storefrontPrivateCredentialCreate(
    input: StorefrontPrivateCredentialCreateInput!
  ): StorefrontPrivateCredentialCreatePayload!

  storefrontCredentialRevoke(
    input: StorefrontCredentialRevokeInput!
  ): StorefrontCredentialPayload!

  storefrontAccessPolicyUpdate(
    input: StorefrontAccessPolicyUpdateInput!
  ): StorefrontAccessPolicyPayload!
}
```

### 11.4. Admin authorization

Headless App объявляет и проверяет собственные Admin resources/actions:

```text
headless.storefront-access.read
headless.storefront-access.permissions.update
headless.storefront-access.private-token.create
headless.storefront-access.private-token.revoke
```

Resolvers:

1. Выполняются в Headless Admin GraphQL subgraph.
2. Берут trusted installation/store из App execution context.
3. Декодируют Global ID.
4. Проверяют Admin action.
5. Разрешают connection через generic Apps broker contract.
6. Повторно проверяют ownership в Headless repository.
7. Вызывают Headless domain service.
8. Возвращают `userErrors` для ожидаемых domain failures.

Secret values не помещаются в exception text.

## 12. Internal credential resolution API

### 12.1. Зачем отдельный internal API

Gateway является standalone Hive process и не должен:

- импортировать Headless repositories;
- подключаться напрямую к Headless App schema;
- знать Drizzle models;
- обходить Headless domain invariants.

Headless App публикует узкий data-plane endpoint на отдельном internal port.
Server создаётся и останавливается в `HeadlessApp.start/stop`; core
`AppsNestService` не содержит storefront-access endpoint.

### 12.2. Configuration

```yaml
apps:
  shopana-headless:
    internal:
      port: 10093

gateway:
  storefront:
    port: 4000
    access_resolver_url: http://127.0.0.1:10093
```

Environment:

```text
STOREFRONT_RESOLVER_INTERNAL_TOKEN=<random service credential>
```

Production:

- endpoint доступен только из private network;
- security group/network policy разрешает только Storefront Gateway;
- transport использует TLS/mTLS;
- static internal token остаётся дополнительной проверкой, не заменяя network
  isolation.

### 12.3. Endpoint

```http
POST /internal/storefront-access/resolve
Authorization: Bearer <internal-service-token>
Content-Type: application/json
```

Request:

```json
{
  "token": "shpna_sfpub_v1_...",
  "accessMode": "PUBLIC",
  "storeSelector": {
    "kind": "NAME",
    "value": "acme-fashion"
  },
  "buyerIp": "203.0.113.42",
  "requestId": "..."
}
```

Response:

```json
{
  "store": {
    "id": "...",
    "name": "acme-fashion",
    "displayName": "Acme Fashion",
    "organizationId": "...",
    "timezone": "Europe/Kyiv",
    "defaultLocale": "uk",
    "locales": ["uk", "en"],
    "currencyCode": "UAH"
  },
  "access": {
    "connectionId": "...",
    "installationId": "...",
    "credentialId": "...",
    "mode": "PUBLIC",
    "permissions": [
      "storefront.catalog.read",
      "storefront.cart.read",
      "storefront.cart.write"
    ],
    "policyRevision": 1
  }
}
```

Endpoint не возвращает token, digest, ciphertext или token hint.

### 12.4. Resolution algorithm

1. Проверить internal service authentication constant-time.
2. Проверить request body через Zod.
3. Проверить максимальную длину token до parsing.
4. Проверить, что `accessMode` соответствует token prefix.
5. Извлечь `kid`.
6. Загрузить credential по `kid`.
7. Для отсутствующего и неверного credential выполнить одинаковый внешний
   failure contract.
8. Вычислить HMAC с `credential.pepperVersion`.
9. Сравнить digest constant-time.
10. Проверить `credential.status == ACTIVE`.
11. Восстановить trusted App execution context по сохранённому
    `installationId`.
12. Через generic Apps broker contract разрешить connection и проверить
    effective active installation/connection.
13. Разрешить store selector через Project Service broker contract.
14. Проверить `resolvedStore.id == credential.storeId == connection.storeId`.
15. Загрузить policy grants.
16. Вернуть immutable context.
17. Best-effort зарегистрировать credential usage без блокировки response.

Store selector поддерживает:

- production hostname/custom domain;
- `x-store-name` только как явно разрешённый development/API selector.

Клиентское значение selector никогда не становится trusted `storeId` без
resolution и cross-check.

### 12.5. Error contract

Внешний Gateway contract:

| Ситуация | HTTP | Code |
| --- | ---: | --- |
| Нет credential | 401 | `STOREFRONT_CREDENTIAL_REQUIRED` |
| Переданы оба headers | 400 | `STOREFRONT_CREDENTIAL_AMBIGUOUS` |
| Неверный/revoked/wrong-store token | 401 | `STOREFRONT_CREDENTIAL_INVALID` |
| Connection/installation не active | 401 | `STOREFRONT_CREDENTIAL_INVALID` |
| Internal resolver unavailable | 503 | `STOREFRONT_ACCESS_UNAVAILABLE` |
| Permission отсутствует | GraphQL error | `FORBIDDEN` |

Нельзя различать наружу:

- unknown `kid`;
- wrong secret;
- revoked credential;
- wrong store;
- disconnected channel.

Это предотвращает credential/store enumeration.

## 13. Storefront Gateway

### 13.1. Target files

```text
infra/federation/
  gateway-admin.config.ts
  gateway-storefront.config.ts
  plugins/
    storefront-access/
      index.ts
      StorefrontAccessClient.ts
      StorefrontContextSigner.ts
      StorefrontRequestHeaders.ts
      types.ts
```

`packages/cli/src/scripts/gateway.ts` выбирает config по surface:

```text
admin       -> gateway-admin.config.ts
storefront  -> gateway-storefront.config.ts
```

### 13.2. Accepted client headers

Public:

```http
X-Shopana-Storefront-Access-Token: shpna_sfpub_v1_...
```

Private:

```http
Shopana-Storefront-Private-Token: shpna_sfprv_v1_...
```

Buyer IP для private access:

```http
Shopana-Storefront-Buyer-IP: 203.0.113.42
```

Rules:

1. Ровно один credential header.
2. Header не может содержать comma-separated multiple values.
3. Максимальная длина ограничена.
4. Token никогда не логируется.
5. Public mode использует network-derived buyer IP.
6. Private buyer IP валидируется как IPv4/IPv6.
7. Если private buyer IP отсутствует, request считается server/static traffic.
8. `x-forwarded-for` принимается только от configured trusted proxy.

### 13.3. Gateway plugin lifecycle

Storefront plugin выполняется в раннем HTTP request hook до parse/validation и
query planning:

1. Стереть все входящие internal headers.
2. Извлечь store selector.
3. Извлечь credential и mode.
4. Разрешить безопасный buyer IP.
5. Вызвать Headless App internal resolver с timeout.
6. Получить verified context.
7. Применить rate-limit identity.
8. Выпустить internal JWS.
9. Сохранить context в request-scoped plugin state.
10. Передать JWS subgraphs через controlled `propagateHeaders`.

Во время реализации точный hook выбирается из API установленной версии
`@graphql-hive/gateway`; contract этого раздела важнее конкретного имени hook.

### 13.4. Никаких spoofable bypass

Storefront authentication нельзя обходить по:

- `user-agent: rover`;
- `x-interpolation`;
- произвольному introspection query;
- клиентскому `x-shopana-internal-*`;
- source IP без trusted proxy configuration.

Production introspection требует обычный storefront credential. Health endpoint
остаётся отдельным и credential не требует. Schema composition обращается
непосредственно к internal subgraph endpoints, а не использует публичный
Storefront Gateway bypass.

### 13.5. Timeout и availability

Initial implementation не кэширует positive credential resolution. Каждый
external GraphQL request выполняет один authoritative resolve.

Причины:

- revoke должен действовать немедленно;
- connection suspend/disconnect должен действовать немедленно;
- App installation suspend должен действовать немедленно;
- преждевременный cache создаст security inconsistency.

Timeout:

```text
connect timeout: 250 ms
total resolve timeout: 1000 ms
```

Конкретные значения конфигурируются и уточняются нагрузочным профилем.

При timeout/failure Gateway fail-closed возвращает `503`, не продолжает request
без context и не использует stale credential.

Оптимизация Redis/read model допускается отдельным планом после измерений. Она
должна иметь transactional outbox/invalidation и не вводить небезопасный TTL
revocation window.

## 14. Internal Storefront Context JWS

### 14.1. Почему JWS

Subgraph ports могут быть ошибочно доступны шире Gateway. Простые headers:

```http
X-Shopana-Store-Id: ...
X-Shopana-Channel-Id: ...
```

можно подделать. Gateway выпускает подписанный compact JWS.

### 14.2. Signing

Алгоритм:

```text
Ed25519 / EdDSA
```

Gateway хранит private signing key. Subgraphs получают только public keys.

Configuration:

```text
STOREFRONT_CONTEXT_ACTIVE_KID=ctx-2026-01
STOREFRONT_CONTEXT_PRIVATE_KEY=<PKCS8/base64 or secret reference>
STOREFRONT_CONTEXT_PUBLIC_KEYS=<versioned public key configuration>
```

Для production keys загружаются из secret manager/KMS. Private signing key
никогда не передаётся Headless App или subgraphs.

### 14.3. Claims

```json
{
  "iss": "shopana-storefront-gateway",
  "aud": "shopana-storefront-subgraphs",
  "sub": "credential:<credentialId>",
  "jti": "<requestId>",
  "iat": 1784991000,
  "exp": 1784991060,
  "organizationId": "...",
  "store": {
    "id": "...",
    "name": "acme-fashion",
    "displayName": "Acme Fashion",
    "timezone": "Europe/Kyiv",
    "defaultLocale": "uk",
    "locales": ["uk", "en"],
    "currencyCode": "UAH"
  },
  "storefront": {
    "connectionId": "...",
    "installationId": "...",
    "credentialId": "...",
    "accessMode": "PUBLIC",
    "permissions": ["storefront.catalog.read"],
    "policyRevision": 1
  }
}
```

TTL: 60 секунд. Token применяется только внутри текущего federated request и не
возвращается клиенту.

### 14.4. Header

```http
X-Shopana-Storefront-Context: <compact JWS>
```

Gateway не форвардит исходные public/private credential headers в subgraphs.

### 14.5. Key rotation

1. Опубликовать новый public key subgraphs.
2. Развернуть verifier с old + new keys.
3. Переключить Gateway active signing `kid`.
4. Подождать больше максимального JWS TTL.
5. Удалить old public key.

## 15. Shared storefront context в subgraphs

### 15.1. Replace legacy middleware

Текущий `packages/shared-context/src/storefrontContextMiddleware.ts`:

- требует `x-store-name`;
- требует legacy `x-api-key`;
- делает broker lookup store в каждом subgraph;
- не создаёт channel identity.

Его нужно заменить на middleware, которое:

1. Читает только `X-Shopana-Storefront-Context`.
2. Проверяет JWS signature, `kid`, `iss`, `aud`, `iat`, `exp`.
3. Валидирует claims через Zod.
4. Создаёт `request.store`.
5. Создаёт `request.storefrontAccess`.
6. Оставляет `request.customer = null` до отдельной IAM authentication.
7. Не вызывает `project.getCurrentStore` в обычном subgraph request.

### 15.2. Types

```ts
interface ContextStorefrontAccess {
  readonly connectionId: string;
  readonly installationId: string;
  readonly credentialId: string;
  readonly accessMode: "PUBLIC" | "PRIVATE";
  readonly permissions: readonly string[];
  readonly policyRevision: number;
}
```

Fastify augmentation:

```ts
interface FastifyRequest {
  store?: ContextStore;
  storefrontAccess?: ContextStorefrontAccess;
  customer: ContextCustomer | null;
}
```

### 15.3. Permission helper

Добавить общий helper:

```ts
requireStorefrontPermission(
  context: ContextStorefrontAccess,
  permission: StorefrontPermission,
): void;
```

Rules:

- default deny;
- exact permission matching;
- wildcard permissions в v1 запрещены;
- permission failure не раскрывает скрытые entity values;
- repository tenant scope всегда использует trusted `store.id`.

### 15.4. App storefront ingress

`packages/app-runtime/src/AppsGraphQLIngress.ts` сейчас копирует почти все
request headers. Изменить allowlist:

- разрешить internal storefront context;
- разрешить customer authorization только если он нужен App subgraph;
- разрешить request ID, trace headers, locale/user-agent по явному списку;
- не копировать public/private credentials;
- не копировать клиентские `x-shopana-*`;
- не копировать `x-api-key`.

App subgraph также проверяет JWS через shared middleware.

## 16. Permissions mapping

### 16.1. Initial catalog

```text
storefront.catalog.read
storefront.inventory.read
storefront.content.read
storefront.metaobjects.read
storefront.cart.read
storefront.cart.write
storefront.customer.write
```

Catalog должен содержать:

```ts
interface StorefrontPermissionDefinition {
  readonly handle: string;
  readonly label: string;
  readonly description: string;
  readonly risk: "LOW" | "MEDIUM" | "HIGH";
}
```

### 16.2. Domain ownership

| Permission | Первичный enforcement owner |
| --- | --- |
| `storefront.catalog.read` | Catalog/Listing |
| `storefront.inventory.read` | Catalog/Listing inventory projection |
| `storefront.content.read` | Content/Project owner после появления API |
| `storefront.metaobjects.read` | Будущий metaobjects owner |
| `storefront.cart.read` | Checkout |
| `storefront.cart.write` | Checkout |
| `storefront.customer.write` | IAM/customer boundary |

Gateway не должен поддерживать вручную список GraphQL fields. Permission
проверяется domain owner resolver/script, потому что один field может зависеть
от нескольких domain invariants.

## 17. Rate limiting и abuse protection

### 17.1. Public

Rate-limit key:

```text
public:<connectionId>:<credentialId>:<normalizedBuyerIp>
```

Public token предполагается доступным злоумышленнику. Origin allowlist/CORS:

- может использоваться как browser policy;
- не является security boundary;
- не заменяет rate limiting;
- не делает public token секретом.

### 17.2. Private

Buyer-triggered:

```text
private:<connectionId>:<credentialId>:<declaredBuyerIp>
```

Static/build/server traffic без buyer IP:

```text
private-server:<credentialId>
```

Для server bucket задаётся отдельный limit. Private holder считается доверенным
передавать buyer IP, но значение всё равно синтаксически валидируется.

### 17.3. GraphQL cost

Credential rate limit не заменяет:

- query depth limit;
- alias limit;
- body size limit;
- persisted query policy;
- GraphQL cost/complexity limit.

Эти protections конфигурируются на Storefront Gateway отдельно от Admin.

## 18. Audit, logging и observability

### 18.1. Audit events

```text
headless.storefront-credential.created.v1
headless.storefront-credential.revoked.v1
headless.storefront-access-policy.updated.v1
headless.storefront-credential.authentication-failed.v1
```

Payload не содержит:

- full token;
- digest;
- ciphertext;
- pepper version secret;
- private token fragment длиннее безопасного hint.

Допустимые identifiers:

```text
organizationId
storeId
connectionId
installationId
credentialId
credentialKind
actorType
actorId
requestId
reasonCode
```

### 18.2. Logs

Redaction keys:

```text
x-shopana-storefront-access-token
shopana-storefront-private-token
authorization
request.body.token
privateAccessToken
publicAccessToken
tokenDigest
publicTokenCiphertext
```

Ошибки не включают raw request body.

### 18.3. Metrics

```text
storefront_access_resolve_duration_ms
storefront_access_resolve_total{result,mode}
storefront_access_internal_errors_total{reason}
storefront_gateway_requests_total{mode}
storefront_gateway_rate_limited_total{mode}
storefront_permission_denied_total{permission}
```

Не использовать `credentialId`, `storeId`, IP или token hint как metric label
из-за cardinality и privacy.

### 18.4. `lastUsedAt`

Не обновлять строку credential синхронно на каждый request.

Initial implementation:

- authentication не блокируется на usage write;
- Headless internal resolver агрегирует credential IDs в памяти;
- flush не чаще одного раза в минуту;
- потеря telemetry при process crash допустима;
- security decisions не зависят от `lastUsedAt`.

## 19. Channel attribution contracts

После появления storefront context:

```text
cart.sales_channel_connection_id
checkout.sales_channel_connection_id
order.sales_channel_connection_id
```

Rules:

1. Cart creation берёт connection ID только из trusted context.
2. Client input не содержит channel ID.
3. Existing cart сохраняет исходный channel.
4. Доступ к cart проверяет store и channel policy.
5. Checkout наследует channel из cart.
6. Order наследует channel из checkout.
7. Повторный request не может заменить attribution.
8. Disconnect не меняет historical attribution.

Физические колонки и миграции commerce services реализуются отдельным
подпланом после завершения access context. В этом плане обязательны shared types
и возможность получить `connectionId` из request context.

## 20. Admin UI

Headless App screen:

```text
Headless
  -> Storefronts
    -> Website EU
      -> Storefront API permissions
      -> Public access token
      -> Private access tokens
      -> Connection status/health
```

### 20.1. Create storefront

Flow:

1. User задаёт display name.
2. Admin вызывает `salesChannelConnectionCreate`.
3. UI показывает lifecycle progress.
4. После `ACTIVE` UI автоматически вызывает
   `headlessStorefrontAccessProvision`.
5. Если `initialStorefrontCredentials` присутствует:
   - public token можно скопировать;
   - private token показывается в warning panel;
   - UI сообщает, что private token нельзя будет получить повторно.
6. Если response потерян, public token остаётся доступен, а для private token
   используется rotation.

### 20.2. Token card

Public:

- visible/copyable;
- маркировка «safe for browser/mobile»;
- обычная rotate/revoke action отсутствует в v1.

Private:

- список metadata без secret;
- label;
- hint;
- createdAt;
- lastUsedAt;
- status;
- create new token;
- revoke token;
- confirmation перед revoke.

После create private token UI не кладёт значение в persistent Apollo cache,
localStorage или URL.

### 20.3. Permissions

- checkbox list из specification/catalog;
- risk description;
- полная замена набора;
- optimistic `revision`;
- conflict вызывает refetch и повторное подтверждение;
- изменение permissions применяется ко всем credentials connection.

## 21. Security invariants

1. Raw private token существует только в памяти create request/response.
2. Raw credentials не попадают в subgraphs.
3. Gateway не доверяет client-provided internal headers.
4. Subgraphs не доверяют unsigned store/channel headers.
5. Store из hostname/selector проверяется против credential store.
6. Credential другого store возвращает generic invalid error.
7. Connection и installation должны быть `ACTIVE`.
8. Public и private credentials имеют одинаковую permission policy.
9. Private credential не авторизует Admin API.
10. Customer token не заменяет storefront credential.
11. Revoke действует без stale cache window.
12. Disconnect и App suspension блокируют access без массового delete.
13. Secret values не входят в DBOS workflow/event payloads.
14. Permission enforcement default-deny.
15. Token parsing имеет version и строгие length limits.
16. Production не стартует без cryptographic configuration.
17. Internal resolver fail-closed.
18. Introspection не имеет spoofable production bypass.
19. Direct subgraph request без valid internal JWS отклоняется.
20. Tenant scope repositories всегда берут из verified context.

## 22. Failure scenarios

### 22.1. Connection create workflow failed

- Credentials persisted.
- Effective access отсутствует.
- Admin видит `CONNECT_FAILED`.
- Retry connection operation не создаёт новый public token.
- После successful activation credentials начинают работать.

### 22.2. Initial private token response потерян

- Token не восстанавливается.
- User создаёт новый private token.
- Потерянный credential отзывается по metadata/hint.

### 22.3. Gateway не может вызвать resolver

- Request возвращает `503 STOREFRONT_ACCESS_UNAVAILABLE`.
- Gateway не использует unsigned или stale context.
- Subgraphs не вызываются.

### 22.4. Credential revoked во время federated request

- Уже начавшийся request может завершиться с выданным JWS.
- Новые requests сразу отклоняются.
- Максимальная жизнь уже созданного context ограничена 60 секундами.

### 22.5. Connection suspended

- Resolver join перестаёт считать connection effective active.
- Все credentials connection перестают работать без изменения их строк.
- После resume active credentials снова работают, кроме явно revoked.

### 22.6. Permission изменён во время request

- Текущий request использует policy snapshot, подписанный Gateway.
- Следующий request получает новую revision.
- JWS TTL ограничивает окно текущего request.

### 22.7. Signing key rotation mismatch

- Subgraphs должны получить new public key до переключения Gateway.
- Unknown `kid` отклоняется.
- Deployment sequence описан в разделе key rotation.

## 23. Этапы реализации

### Phase 0. Зафиксировать contracts

- Утвердить этот план.
- Утвердить имя `Headless` и code `shopana-headless`.
- Утвердить initial permission catalog.
- Утвердить обязательность storefront credential для всех GraphQL requests.
- Утвердить client header names.
- Утвердить Ed25519 internal context.

Exit criteria:

- нет открытых решений, меняющих persistence или public API;
- Online Store явно остаётся отдельной неизменяемой App вне scope.

### Phase 1. Добавить отдельную Headless App

- Создать новый package `apps/headless`.
- Добавить новый manifest `shopana-headless`.
- Добавить package в существующий bundled App discovery/registration.
- Установить `allowMultipleConnections: true`.
- Добавить `storefrontApi` manifest contract.
- Добавить Headless-owned permission catalog и semantic validation.
- Добавить Headless-owned Admin/storefront GraphQL modules и internal HTTP
  lifecycle declaration.
- Не менять `apps/online-store`, её package code, manifest или registration.
- Не добавлять Headless-specific providers, repositories или schema в
  `services/apps`.

Exit criteria:

- Headless App обнаруживается как sales-channel App;
- installation поддерживает несколько connections;
- Online Store продолжает обнаруживаться и работать независимо;
- Headless и Online Store могут быть установлены одновременно.

### Phase 2. Persistence и crypto

- Добавить `apps/headless/migrations` для schema `app_shopana_headless`.
- Добавить Headless-owned models и records/types.
- Реализовать repositories поверх `host.databaseClient`.
- Реализовать credential crypto внутри Headless App.
- Реализовать access policy service внутри Headless App.
- Реализовать credential service внутри Headless App.
- Собрать зависимости в `HeadlessApp`, не в `AppsModule`.

Exit criteria:

- default policy и initial credentials создаются одной Headless-owned
  transaction;
- public token можно расшифровать только Admin read path;
- private plaintext не сохраняется;
- revoke сохраняет audit metadata.

### Phase 3. Headless Admin GraphQL

- Добавить SDL в Headless Admin GraphQL subgraph.
- Реализовать Headless resolvers и payloads.
- Добавить Headless Admin actions.
- Добавить idempotent `headlessStorefrontAccessProvision`.
- Добавить optimistic policy update.
- Добавить private create/revoke.
- Обновить composed/generated GraphQL types через штатный codegen.

Exit criteria:

- provision возвращает initial credentials только один раз;
- public token доступен повторно;
- private metadata доступна без secret;
- permissions обновляются по revision.

### Phase 4. Internal resolution API

- Добавить internal Fastify server в `HeadlessApp.start/stop`.
- Добавить Headless config/port validation.
- Добавить internal service authentication.
- Реализовать authoritative credential resolver.
- Добавить Project store resolution/cross-check.
- Добавить redaction и metrics.
- Добавить buffered `lastUsedAt`.
- Не изменять `AppsNestService`.

Exit criteria:

- valid token возвращает verified context;
- invalid/revoked/wrong-store дают одинаковый внешний failure;
- inactive connection/installation блокирует access;
- endpoint недоступен с public network profile.

### Phase 5. Storefront Gateway

- Разделить admin/storefront gateway configs.
- Обновить CLI выбор config.
- Реализовать StorefrontAccessClient.
- Реализовать early request plugin.
- Добавить strict header parsing.
- Добавить buyer IP handling.
- Добавить fail-closed timeout.
- Реализовать Ed25519 JWS signer.
- Удалить `x-api-key` propagation.
- Удалить spoofable bypass.

Exit criteria:

- Gateway вызывает resolver ровно один раз на GraphQL request;
- raw credentials не достигают subgraphs;
- admin gateway поведение не изменено;
- Storefront Gateway передаёт только signed context.

### Phase 6. Shared context и subgraphs

- Заменить legacy storefront context middleware.
- Добавить JWS verifier.
- Добавить `ContextStorefrontAccess`.
- Добавить permission helper.
- Подключить middleware ко всем storefront subgraphs.
- Ужесточить AppsGraphQLIngress allowlist.
- Удалить legacy `requireApiKey` option и `x-api-key` code path.

Exit criteria:

- direct subgraph request без JWS отклоняется;
- verified claims создают store/channel context;
- repositories получают tenant только из verified context.

### Phase 7. Domain permission enforcement

- Разметить storefront resolvers/scripts required permissions.
- Catalog/Listing проверяют catalog/inventory read.
- Checkout проверяет cart read/write.
- Customer mutations проверяют customer write.
- Добавить default-deny behavior для новых protected operations.

Exit criteria:

- изменение policy реально меняет доступ;
- private token не обходит permissions;
- forbidden fields возвращают единый GraphQL authorization error.

### Phase 8. Rate limiting и protections

- Добавить public/private rate-limit identities.
- Настроить trusted proxy IP extraction.
- Добавить private server bucket.
- Добавить body/depth/alias/complexity limits.
- Добавить security metrics.

Exit criteria:

- public traffic разделяется по buyer IP;
- private server traffic не маскируется под unlimited buyer traffic;
- token value отсутствует в limiter key/logs.

### Phase 9. Admin UI

- Добавить отдельный Headless UI, не переименовывая Online Store UI.
- Добавить storefront connections list.
- Добавить create storefront flow.
- Добавить initial secret warning.
- Добавить public token copy.
- Добавить private create/revoke list.
- Добавить permissions editor с revision conflicts.

Exit criteria:

- private secret не сохраняется клиентом;
- rotation выполняется без downtime;
- UI корректно обрабатывает потерянный initial secret.

### Phase 10. Attribution integration

- Добавить channel context contract в Checkout/Orders.
- Создать отдельные migration/API подпланы для cart, checkout и order.
- Запретить client-supplied attribution.
- Сохранить historical attribution после disconnect.

Exit criteria:

- новый cart получает connection ID из trusted context;
- order наследует исходную attribution.

## 24. Проверочные сценарии

### Credentials

- Public и private token имеют правильный versioned format.
- Два создаваемых токена никогда не совпадают.
- Wrong secret с valid `kid` отклоняется.
- Unknown `kid` отклоняется тем же внешним кодом.
- Public token нельзя отправить в private header и наоборот.
- Revoke private token не влияет на другие private token.
- Нельзя получить private plaintext query-операцией.
- Duplicate create не раскрывает private plaintext повторно.
- Public ciphertext нельзя перенести между connections из-за authenticated
  additional data.

### Tenancy

- Credential Store A нельзя использовать с hostname Store B.
- Connection другого store не читается Admin resolver.
- Поддельный `storeId` header игнорируется/удаляется.
- Поддельный internal JWS отклоняется subgraph.

### Lifecycle

- Provisioning для `CONNECTING` connection отклоняется.
- `ACTIVE` работает.
- `SUSPENDED` не работает.
- После `RESUME` снова работает.
- `DISCONNECTED` не работает.
- Suspended installation блокирует все её connections.
- Failed connection не ломает installation.

### Permissions

- Public и private видят одинаковый permission set.
- Policy update действует со следующего request.
- Stale policy revision отклоняется.
- Unknown permission отклоняется.
- Отсутствующий permission возвращает `FORBIDDEN`.

### Gateway

- Оба credential headers дают `400`.
- Нет credential даёт `401`.
- Resolver timeout даёт `503`.
- Raw credential header не форвардится.
- Client internal header заменяется Gateway-generated value.
- Introspection не обходит authentication.
- Admin Gateway не требует storefront credential.

### Secret hygiene

- Tokens отсутствуют в logs.
- Tokens отсутствуют в emitted events.
- Tokens отсутствуют в DBOS operation inputs.
- Tokens отсутствуют в GraphQL error messages.
- Private token отсутствует в БД plaintext/ciphertext.

## 25. Build и verification policy

Все schema, codegen, migration и build операции выполняются через
`shopana-cli` MCP согласно правилам проекта.

Во время реализации:

- не запускать `test`;
- не запускать `tsc` напрямую;
- для проверки новой версии кода запускать build;
- generated schema/types обновлять штатными CLI actions;
- изменения migration создавать штатной генерацией;
- changeset файл вручную не редактировать.

Для ручного smoke после build подготовить:

1. Установку Headless App.
2. Создание двух storefront connections.
3. Public request для каждого connection.
4. Private request с buyer IP.
5. Permission denial.
6. Private rotation с overlap.
7. Revoke старого private token.
8. Suspend/resume connection.
9. Wrong-store request.
10. Direct subgraph request без JWS.

## 26. Deliverables по файлам

Ожидаемые области изменений:

```text
apps/headless/app.manifest.ts
apps/headless/build.config.json
apps/headless/migrations/**
apps/headless/src/storefront-access/**
apps/headless/src/api/graphql-admin/**
apps/headless/src/api/internal/**
apps/headless/src/HeadlessApp.ts
apps/headless/src/index.ts
packages/app-sdk/**
packages/shared-context/**
packages/broker-types/**
packages/cli/src/scripts/gateway.ts
infra/federation/gateway-admin.config.ts
infra/federation/gateway-storefront.config.ts
infra/federation/plugins/storefront-access/**
packages/app-runtime/src/AppsGraphQLIngress.ts
admin/src/domains/apps/**
config.yml
```

`services/apps` сохраняет generic installation/connection platform и не
получает Headless-specific persistence, crypto, GraphQL или internal endpoint.
Допустимы только отдельно обоснованные generic App runtime contracts, если они
одинаково применимы к любой bundled App.

Generated outputs изменяются только соответствующим codegen/build workflow.

## 27. Definition of Done

Реализация завершена, когда:

1. `shopana-headless` добавлена как отдельная first-party custom storefront
   App, а `shopana-online-store` не изменена.
2. Core `services/apps` не содержит Headless-specific access domain.
3. Одна installation создаёт несколько storefront connections.
4. Каждый connection через Headless provisioning получает один public и
   initial private credential.
5. Public token повторно доступен Admin UI.
6. Private secret возвращается только один раз.
7. Private rotation поддерживает overlap без downtime.
8. Revoke действует на следующий request без stale cache.
9. Storefront Gateway проверяет credential до federation.
10. Raw credential не передаётся subgraphs.
11. Subgraphs принимают только signed internal context.
12. Store/channel tenancy невозможно подделать клиентскими headers.
13. Public/private используют одну access policy.
14. Domain services применяют permissions.
15. Suspend/disconnect/uninstall блокируют credentials.
16. Admin Gateway не затронут storefront authentication.
17. Legacy `x-api-key` storefront contract удалён.
18. Logs/events/traces не содержат secret values.
19. Build и schema composition проходят штатным Shopana CLI workflow.
