
# План создания `shopana-platform-mcp`

## 1. Цель

Создать MCP-сервер `shopana-platform-mcp`, через который AI-агент сможет читать данные и управлять интернет-магазином Shopana.

Основные требования:

- MCP использует существующий Admin GraphQL API наравне с Admin frontend;
- Admin создает MCP API key в Settings UI, будучи авторизованным своим аккаунтом;
- ключ всегда принадлежит конкретным organization, store и Admin user;
- ключ получает только явно выбранные RBAC-разрешения и никогда не может иметь больше прав, чем его владелец;
- актуальные права владельца проверяются при каждом запросе, а не только при создании ключа;
- read- и write-операции проходят через те же GraphQL resolvers, workflows, tenant checks и `@Policy`/`@TypePolicy`, что и действия Admin UI;
- в audit log действие отображается как действие Admin profile с дополнительной отметкой о конкретном MCP API key;
- секрет ключа показывается только один раз, в базе хранится только его verifier;
- ключ можно немедленно отозвать, удалить и перевыпустить.

## 2. Границы первой версии

### Входит в v1

- store-scoped MCP API keys;
- создание, просмотр метаданных, изменение политик, ротация, отзыв и удаление ключа в Admin Settings;
- аутентификация ключа на Admin Gateway;
- делегированный Admin Context с владельцем ключа и credential metadata;
- MCP server с discovery-, read- и write-инструментами;
- stdio transport для локальных MCP clients;
- вызовы только через Admin GraphQL Gateway;
- аудит MCP-операций, correlation ID и идентификатор ключа;
- идемпотентность write-инструментов;
- rate limits, лимиты payload и безопасная обработка ошибок;
- документация подключения для MCP-клиентов.

### Не входит в v1

- Storefront GraphQL API;
- ключи, не привязанные к Admin user;
- organization-wide ключ, переключающийся между магазинами;
- передача owner/site-admin bypass в MCP-контекст;
- произвольные raw GraphQL mutations;
- управление ролями, участниками, RBAC, MCP-ключами и другими credentials через MCP;
- выполнение операций, отсутствующих в Admin GraphQL schema;
- автономное выполнение без входящего MCP-вызова;
- публичный или multi-tenant Streamable HTTP transport;
- OAuth authorization server для удаленных MCP-клиентов.

Streamable HTTP не входит в v1. Его нельзя включать простым переносом
`SHOPANA_MCP_API_KEY` в deployment secret: входящая аутентификация MCP-клиента и исходящий
credential Admin Gateway являются разными security boundaries. Remote mode допускается только в
отдельной версии после реализации MCP OAuth 2.1 Protected Resource, audience-bound access tokens,
Protected Resource Metadata и запрета token passthrough согласно
[MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

## 3. Архитектура

```text
AI agent / MCP client (local stdio)
        |
        | MCP tools/resources
        v
shopana-platform-mcp
        |
        | POST /graphql
        | X-Api-Key: shp_mcp_...
        | X-Store-Name: store-name
        | X-Request-Id / Idempotency-Key
        v
Shopana Admin Gateway
        |
        | verify key through IAM
        | build signed Admin Context
        v
Federated Admin GraphQL subgraphs
        |
        | existing resolvers, @TypePolicy, workflows, @Policy
        v
Domain services + events + audit projection
```

Новый MCP package не обращается напрямую к databases, broker actions или отдельным микросервисам. Единственный бизнес-интерфейс MCP — скомпонованный Admin GraphQL API.

### Размещение кода

- `packages/shopana-platform-mcp/` — MCP server, GraphQL client, tool registry, schemas, transports и CLI entrypoint;
- `services/iam/` — lifecycle ключей, verifier, вычисление делегированных прав и Admin GraphQL contract;
- `infra/federation/plugins/admin-context/` — выбор способа аутентификации и выпуск Admin Context;
- `packages/shared-context/` — тип делегированного Admin Context и credential metadata;
- `packages/rbac/` — ресурс управления MCP-ключами и helpers пересечения разрешений;
- `services/audit/` и `packages/events/` — credential attribution в audit trail;
- `admin/src/domains/system/mcp/` — Settings UI;
- `e2e/tests/mcp-api/` и `e2e/queries/iam-api/` — точечные API и MCP сценарии.

API key является credential IAM, а не сущностью Project service. Старый скомпонованный контракт `ApiKey` из `PROJECT_ADMIN`, который виден в generated Admin schema, но не имеет актуальной реализации и RBAC grants в `services/project`, заменить новым IAM-контрактом. Backfill и compatibility layer не создавать.

## 4. Модель безопасности

### 4.1. Делегированная идентичность

Ключ не становится самостоятельным пользователем. Контекст разделяет:

- `actor user` — Admin, создавший ключ;
- `credential` — MCP API key, которым аутентифицирован запрос.

```ts
type AdminAuthentication =
  | { kind: "SESSION"; sessionId: string }
  | { kind: "MCP_API_KEY"; apiKeyId: string; apiKeyName: string };

interface ResolvedAdminAccessContext {
  user: ContextUser;
  authentication: AdminAuthentication;
  organizationId: string;
  store: ContextStore;
  permissions: readonly AdminPermission[];
  isSiteAdmin: boolean;
  isOrganizationOwner: boolean;
}
```

Для `MCP_API_KEY` оба bypass-флага всегда `false`, даже если владелец является site admin или organization owner. Его разрешения материализуются в явный список.

`current owner permissions` для delegation вычисляются отдельным IAM-алгоритмом:

- обычный Admin получает expanded permissions своей актуальной organization/store role;
- organization owner с активным membership получает полный `delegable permission catalog` только
  для bound store;
- site admin обязан иметь активный membership в organization ключа и также получает только
  `delegable permission catalog` bound store;
- owner/site-admin-only возможности и неделегируемые resources в этот список не попадают;
- при потере membership, owner/site-admin статуса или при деактивации пользователя права немедленно
  пересчитываются по оставшейся обычной роли либо становятся пустыми.

Таким образом, пустой `permissions` текущего session context для owner/site admin нельзя напрямую
использовать при вычислении grants: session bypass сначала преобразуется в ограниченный code-owned
delegable catalog.

Подписанный gateway context обновить атомарно во всех subgraphs. Так как проект запрещает backward compatibility, использовать одну новую версию claims без dual-read форматов.

### 4.2. Эффективные права

```text
effective permissions =
  stored API-key grants
  INTERSECT current owner permissions
  INTERSECT delegable permissions
```

При создании и обновлении grants IAM проверяет, что каждое разрешение входит в актуальный expanded permission set Admin. При каждом использовании ключа IAM повторно получает актуальные права владельца и снова строит пересечение.

Следствия:

- понижение роли Admin действует на следующий запрос ключа и на DBOS recovery;
- удаление Admin из organization/store блокирует следующий запрос ключа и DBOS recovery;
- деактивация или бан пользователя блокирует ключ;
- просроченный, отозванный или удаленный ключ не аутентифицируется;
- расширение прав Admin само по себе не расширяет ключ;
- ключ одного store нельзя использовать с другим `X-Store-Name`;
- отсутствие store header или несовпадение tenant binding завершается fail-closed.

### 4.3. Делегируемые права

В v1 grants хранят существующие тройки:

```text
domain + resource + action
store:{storeId} + store.data + read|write|admin
store:{storeId} + store.profile + read|write|admin
store:{storeId} + store.apps + read|write|admin
store:{storeId} + store.audit + read
```

Перед реализацией привести `@shopana/rbac` resource catalog в соответствие с реально используемыми `@Policy`/`@TypePolicy`. Например, `services/audit` требует `store.audit`, но текущий центральный каталог его не содержит.

Не делегировать в MCP v1:

- `org.roles`, `org.access`, `org.members`;
- `store.roles`, `store.access`, `store.members`;
- `store.mcp-keys`;
- создание или изменение других secrets/credentials;
- owner-only и site-admin-only операции.

Для destructive и чувствительных операций нужен `admin`, а не только `write`. Иерархия Casbin остается текущей: `admin` включает `write` и `read`, `write` включает `read`.

### 4.4. Защита секрета

Формат ключа:

```text
shp_mcp_<public-id>_<32-byte-random-secret>
```

- `public-id` используется только для поиска записи;
- секрет генерируется CSPRNG;
- в базе хранится verifier `HMAC-SHA-256(key = server pepper, data = secret)`, версия verifier и
  последние 4 символа;
- сравнение выполняется constant-time;
- plaintext возвращается только в успешном create/rotate payload и больше нигде;
- секрет не попадает в Pino logs, GraphQL errors, audit payload, traces и MCP output;
- pepper хранится как versioned key ring в secret manager/environment;
- новые ключи всегда используют current verifier version; старые версии остаются доступными только
  для проверки и после успешной проверки лениво перевычисляются current pepper;
- gateway применяет rate limit по IP и public-id, блокировку повторных ошибок и ограничение размера header.

## 5. Данные IAM

Создать таблицы в schema IAM через штатную генерацию migration.

### `mcp_api_keys`

| Поле | Назначение |
| --- | --- |
| `id` | UUID/UUIDv7 credential |
| `organization_id` | жесткая tenant binding |
| `store_id` | жесткая store binding |
| `owner_user_id` | Admin profile, от имени которого работает агент |
| `name` | понятное имя ключа |
| `public_id` | уникальная lookup-часть |
| `secret_verifier` | verifier секрета |
| `verifier_version` | версия pepper/verifier для controlled rotation |
| `secret_last_four` | безопасная подсказка в UI |
| `created_at` | время создания |
| `expires_at` | срок действия |
| `last_used_at` | последнее успешное использование |
| `revoked_at` | мгновенный soft revoke |
| `revoked_by_user_id` | кто отозвал ключ |

### `mcp_api_key_grants`

| Поле | Назначение |
| --- | --- |
| `api_key_id` | FK на ключ |
| `resource` | валидированный ресурс `@shopana/rbac` |
| `action` | максимальное действие: `read`, `write` или `admin` |

Ограничения:

- primary key `(api_key_id, resource)`;
- `domain` в v1 не хранится: он всегда выводится как `store:{mcp_api_keys.store_id}`;
- одна строка хранит только максимальное действие; implied actions разворачиваются при чтении;
- такая форма не допускает одновременно эквивалентные `read`/`write`/`admin` строки и исключает
  cross-store grant по построению;
- каскадное удаление grants только при окончательном удалении ключа;
- grants не хранятся в Casbin как user role: это ограничивающий delegation layer поверх Casbin владельца;
- `last_used_at` обновляется throttled/batched, а не при каждом GraphQL field resolution.

## 6. IAM и Gateway authentication flow

### 6.1. Создание ключа

1. Session-authenticated Admin открывает store Settings.
2. UI загружает только разрешения, которые Admin может делегировать.
3. Admin задает имя, срок действия и grants.
4. IAM проверяет `store.mcp-keys:admin`.
5. IAM разворачивает action hierarchy и проверяет grants как подмножество прав Admin.
6. IAM создает ключ и grants в одной transaction.
7. Plaintext secret возвращается один раз.
8. UI показывает copy/download step и требует подтверждения сохранения.

Для owner/site admin шаг 5 использует ограниченный delegable catalog из раздела 4.1, а не пустой
список session permissions и не bypass-флаг. Site admin без активного organization membership не
может создать ключ.

### 6.2. GraphQL запрос с ключом

1. Gateway принимает ровно один auth mechanism: session Bearer или `X-Api-Key`.
2. Одновременное наличие обоих механизмов отклоняется.
3. Для API key Gateway вызывает internal IAM resolver `resolveMcpApiKeyContext`.
4. IAM валидирует verifier, status, expiry, owner, membership и store binding.
5. IAM вычисляет актуальное пересечение permissions.
6. Gateway подписывает краткоживущий Admin Context с `authentication.kind = MCP_API_KEY` и отдельный
   request metadata envelope с нормализованными correlation/idempotency полями.
7. Subgraphs доверяют только подписанному context, а не входящему ключу.
8. `@TypePolicy`, workflow preflight и recovery проверяют effective permissions.

Internal IAM endpoint не возвращает и не логирует secret. Начальная реализация — без positive cache;
если он понадобится, revoke должен инвалидировать его до подтверждения mutation.

Семантика «немедленного revoke» в v1 означает: после commit revoke ни один новый GraphQL request и
ни один DBOS recovery не проходят авторизацию. Уже запущенный и прошедший root preflight workflow
продолжает выполнение по сохраненному snapshot; принудительная отмена in-flight workflow не входит
в v1 и не должна обещаться UI или документацией.

### 6.3. Durable workflows

- сохранять `subject = ownerUserId`, `organizationId`, `storeId` и `credentialId`, но не secret и не grants;
- на recovery IAM повторно проверяет актуальные права владельца и активность credential;
- revoke запрещает новые workflow и recovery, требующий повторной авторизации;
- recovery authorization принимает `credentialId` и повторяет именно delegation intersection;
  проверка только по `subject = ownerUserId` запрещена;
- каждый write MCP tool требует переданный клиентом стабильный `idempotencyKey`; сервер не генерирует
  замену, которую клиент не сможет повторить после ambiguous timeout;
- допустимый формат ключа: 16–128 ASCII-символов из `[A-Za-z0-9._:-]`; trim, case folding и другая
  нормализация запрещены;
- Gateway валидирует и передает `Idempotency-Key` в подписанном request metadata; subgraph не доверяет
  одноименному header, пришедшему в обход Gateway;
- для `authentication.kind = MCP_API_KEY` root Admin resolver запускает существующий workflow с
  `source: "client"`, `tenantId`, `credentialId`, operation name и client key;
- session-authenticated Admin UI продолжает использовать обязательный `source: "time-window"`;
- registry атомарно связывает client identity с hash нормализованного semantic payload: повтор с тем
  же hash возвращает прежний результат, а повтор ключа с другим hash возвращает
  `IDEMPOTENCY_KEY_REUSED` до запуска workflow;
- устранить места, где `admin.user.id` используется как `apiKeyId`: там должен быть настоящий credential id.

Это является осознанным расширением текущего правила Admin aggregate mutations, которое сейчас
разрешает только `time-window`. До реализации требуется принять ADR и обновить knowledge-base
contract: UI и MCP продолжают вызывать одинаковые GraphQL documents/resolvers/workflows, но resolver
выбирает idempotency strategy по проверенному `authentication.kind`.

## 7. Admin GraphQL contract

Разместить контракт в IAM Admin subgraph и использовать payload + `userErrors`.

```graphql
type McpApiKey implements Node {
  id: ID!
  name: String!
  owner: User!
  store: Store!
  secretLastFour: String!
  grants: [McpApiKeyGrant!]!
  createdAt: DateTime!
  expiresAt: DateTime
  lastUsedAt: DateTime
  revokedAt: DateTime
  status: McpApiKeyStatus!
}

type McpApiKeySecret {
  value: String!
}

type McpApiKeyGrant {
  domain: String!
  resource: String!
  action: RbacAction!
}

extend type IAMQuery {
  mcpApiKeys(first: Int, after: String): McpApiKeyConnection!
  mcpApiKeyDelegablePermissions: [DelegablePermission!]!
}

extend type IAMMutation {
  mcpApiKeyCreate(input: McpApiKeyCreateInput!): McpApiKeyCreatePayload!
  mcpApiKeyUpdate(input: McpApiKeyUpdateInput!): McpApiKeyUpdatePayload!
  mcpApiKeyRotate(input: McpApiKeyRotateInput!): McpApiKeyRotatePayload!
  mcpApiKeyRevoke(input: McpApiKeyRevokeInput!): McpApiKeyRevokePayload!
  mcpApiKeyDelete(input: McpApiKeyDeleteInput!): McpApiKeyDeletePayload!
}
```

Правила:

- `secret.value` существует только в успешных create/rotate payload;
- list/detail не возвращают повторно читаемое поле `key`;
- изменение имени, expiry и grants выполняется одной aggregate mutation `mcpApiKeyUpdate(operations: ...)` без CAS/revision;
- revoke — отдельная семантическая команда с немедленным security effect;
- rotate сначала повторно валидирует все grants старого ключа; если хотя бы один grant больше не
  принадлежит владельцу или не делегируется, mutation возвращает `userErrors` без изменений;
- после успешной проверки rotate атомарно создает replacement с теми же grants, возвращает новый
  secret один раз и отзывает старый ключ;
- delete — отдельная root delete mutation;
- mutation payload содержит `userErrors`;
- нет `expectedRevision`, `version` или optimistic locking.

Основные error codes: `MCP_API_KEY_INVALID`, `MCP_API_KEY_EXPIRED`, `MCP_API_KEY_REVOKED`, `MCP_API_KEY_SCOPE_MISMATCH`, `MCP_API_KEY_GRANT_NOT_DELEGABLE`, `MCP_API_KEY_GRANT_EXCEEDS_OWNER`, `MCP_API_KEY_OWNER_INACTIVE`.

## 8. `shopana-platform-mcp`

### 8.1. Runtime и конфигурация

Package предоставляет:

- executable `shopana-platform-mcp`;
- stdio transport для локальных MCP clients;
- Zod/JSON Schema validation для tool inputs и outputs;
- Admin GraphQL client с operation registry;
- structured logs только в `stderr`, без secrets и customer PII;
- graceful cancellation/timeouts.

```text
SHOPANA_ADMIN_GRAPHQL_URL=https://admin-api.example.com/graphql
SHOPANA_STORE_NAME=my-store
SHOPANA_MCP_API_KEY=shp_mcp_...
SHOPANA_MCP_TIMEOUT_MS=15000
```

Для stdio mode secret передает MCP client через environment; secret не указывается в command
arguments или git-tracked config. Package pin-ит поддерживаемую MCP protocol version
`2025-11-25` и отклоняет несовместимую negotiation. Transport abstraction сохраняется, но HTTP
implementation и deployment entrypoint в v1 отсутствуют.

### 8.2. Tool registry

Каждый tool — тонкий адаптер над именованной GraphQL operation:

```ts
interface ToolDefinition {
  name: string;
  mode: "read" | "write";
  requiredPermissions: readonly Permission[];
  risk: "low" | "medium" | "high";
  document: TypedDocumentNode;
  mapInput(input: unknown): GraphQLVariables;
  mapOutput(data: unknown): ToolResult;
}
```

Не предоставлять generic `graphql_mutation(query: String!)`. Protocol `initialize` не вызывает
tools. После negotiation сервер внутренним GraphQL context query проверяет credential, а каждый
`tools/list` заново получает effective permissions и возвращает детерминированно отсортированный
доступный список tools. `shopana_context` остается обычным явным discovery tool.

Server объявляет capability `tools.listChanged`. Если при очередном backend context resolution
обнаружено изменение permission fingerprint, он отправляет `notifications/tools/list_changed`.
Кэшированный клиентом список является только UX: любой вызов отсутствующего/отозванного права
все равно отклоняется Admin GraphQL.

### 8.3. Базовые tools v1

Discovery/read:

- `shopana_context`;
- `shopana_store_get`;
- `shopana_products_list`, `shopana_product_get`;
- `shopana_collections_list`, `shopana_collection_get`;
- `shopana_inventory_get`;
- `shopana_orders_list`, `shopana_order_get`;
- `shopana_customers_list`, `shopana_customer_get`;
- `shopana_discounts_list`, `shopana_discount_get`;
- `shopana_audit_entries` при `store.audit:read`.

Write:

- `shopana_product_create`, `shopana_product_update`, `shopana_product_delete`;
- `shopana_collection_create`, `shopana_collection_update`, `shopana_collection_delete`;
- `shopana_inventory_adjust`;
- `shopana_order_update` и отдельные чувствительные order commands;
- `shopana_customer_create`, `shopana_customer_update`;
- `shopana_discount_create`, `shopana_discount_update`, `shopana_discount_delete`;
- `shopana_store_settings_update`.

Финальный список документов формируется после инвентаризации актуальной Admin schema. Tool не добавляется, пока операция не существует в Admin GraphQL и не защищена корректным policy.

### 8.4. Правила write tools

- input валидируется до GraphQL вызова;
- каждый write tool требует `idempotencyKey` длиной 16–128 символов из `[A-Za-z0-9._:-]`;
- update owned relations использует aggregate `operations` inputs;
- destructive tool имеет отдельное имя, `risk: high` и описание последствий;
- bulk tools ограничивают количество items;
- GraphQL `userErrors` возвращаются как structured MCP error data;
- mutation не повторяется после неоднозначного timeout без того же idempotency key;
- чувствительные поля маскируются;
- pagination обязательна для list tools.

## 9. Admin Settings UI

Добавить раздел:

```text
Settings
  General
  Notifications
  Apps
  AI & MCP
```

Route: `/:orgName/:storeName/system/settings/mcp`.

### Список ключей

Показывать name, owner Admin, masked identifier, status, created/expiry/last-used timestamps, grants
summary и действия Edit permissions, Rotate, Revoke, Delete.

### Создание

Форма содержит:

- name;
- expiration;
- presets `Read only`, `Content editor`, `Store operator`, `Custom`;
- permission matrix из `mcpApiKeyDelegablePermissions`;
- предупреждение для `write`/`admin` grants;
- one-time secret screen с copy action и примером MCP config.

Успешная ротация использует тот же one-time secret screen. До подтверждения rotate UI явно
показывает, что старый ключ будет отозван атомарно и после закрытия экрана новый secret восстановить
невозможно.

UI не является security boundary. Backend повторяет все проверки. При потере `store.mcp-keys:admin` запросы завершаются forbidden.

Frontend структура следует `knowledge/vault/patterns/admin-graphql-layer.md`:

```text
admin/src/domains/system/mcp/
  graphql/{fragments,queries,mutations,operation-types}.ts
  hooks/
  mappers/
  page/
  modals/
  components/
```

Generated API types импортируются напрямую из `@/graphql/types`; hooks возвращают `userErrors`; cache/refetch стратегия живет в hooks.

## 10. Аудит и наблюдаемость

### 10.1. Attribution

Расширить attribution:

```ts
actor: { type: "user"; id: ownerUserId };
credential: { type: "mcp_api_key"; id: apiKeyId; nameSnapshot: apiKeyName };
```

В UI:

```text
Changed by Anna Smith via MCP key “Catalog assistant”
```

Не заменять actor на `API_KEY`: действие должно оставаться связано с Admin profile. `nameSnapshot` сохраняет читаемость истории после переименования или удаления ключа.

Расширить audit projection и GraphQL credential-полями. Старые записи не backfill-ить: production data отсутствуют.

### 10.2. Correlation

Один tool call имеет единый MCP call id, correlation ID, GraphQL operation name, workflow/idempotency key, owner user id и API key id.

Secret, Authorization header, полный customer payload и чувствительные before/after значения не записываются.

### 10.3. Метрики

- authentication success/failure по причине;
- вызовы и latency по tool/GraphQL operation;
- forbidden rate;
- mutation success/user-error/ambiguous-timeout;
- revoke-to-deny latency;
- workflow retries и idempotency conflicts.

## 11. Этапы реализации

### Этап -1. Security и protocol decisions

- принять ADR для MCP `source: "client"` idempotency и payload-hash conflict semantics;
- зафиксировать точную revoke boundary: new requests и recovery, но не in-flight cancellation;
- зафиксировать owner/site-admin materialization и обязательный active membership;
- зафиксировать MCP protocol version `2025-11-25` и stdio-only scope v1;
- зафиксировать, что будущий Streamable HTTP требует отдельной OAuth security boundary и не может
  переиспользовать/проксировать Admin API key клиента.

### Этап 0. Contract inventory

- собрать актуальную Admin supergraph schema;
- сопоставить tools с query/mutation documents;
- составить `tool -> GraphQL operation -> @Policy -> risk`;
- исправить расхождения RBAC catalog и policies;
- заменить устаревший `PROJECT_ADMIN ApiKey` contract.

### Этап 1. IAM credential domain

- добавить tables/repositories ключей и grants;
- реализовать generation, verification, expiry, revoke и delete;
- реализовать atomic rotate и versioned verifier key ring;
- реализовать delegable permission catalog;
- реализовать subset validation и runtime intersection;
- добавить IAM Admin GraphQL operations и workflows;
- добавить security events lifecycle ключа.

### Этап 2. Gateway и shared context

- добавить mutually exclusive session/API-key auth;
- добавить internal IAM key-context resolver;
- обновить context, signer, verifier и broker context;
- передавать credential id в workflow/idempotency/audit metadata;
- расширить recovery authorization проверкой credential status и delegation intersection;
- обеспечить revoke-to-deny для новых запросов и recovery после commit.

### Этап 3. Audit attribution

- расширить DomainEvent metadata;
- расширить audit tables, parser, repository, GraphQL и resolver;
- добавить `Admin via MCP key`;
- добавить фильтры по owner и credential id.

### Этап 4. MCP read-only slice

- scaffold `packages/shopana-platform-mcp`;
- реализовать stdio transport/config/GraphQL client/tool registry;
- добавить `shopana_context` и read tools;
- добавить capability filtering, pagination, error mapping и redaction;
- подготовить примеры конфигурации.

### Этап 5. MCP write slice

- добавлять typed tools по одной domain-группе;
- начать с catalog, затем inventory, orders, customers, pricing и settings;
- подключить обязательную client idempotency, payload-hash conflict и high-risk metadata;
- проверить aggregate mutation pattern и отсутствие raw mutation escape hatch.

### Этап 6. Admin Settings UI

- зарегистрировать `AI & MCP` route;
- реализовать list/create/edit/rotate/revoke/delete;
- реализовать one-time secret screen и config snippet;
- использовать generated types и стандартные hooks/mappers;
- добавить permission-aware и error states.

### Этап 7. Hardening и release

- rate limits, payload limits, timeouts и redaction;
- key pepper rotation runbook;
- threat-model review tenant escape, confused deputy, privilege escalation и replay;
- документация, metrics и alerts;
- codegen, schema composition и build штатными `shopana-cli` командами.

## 12. Проверки

### Authorization matrix

- read-only ключ читает, но не выполняет mutation;
- write включает read, но не чувствительные `admin` operations;
- Admin не может выдать отсутствующий у него grant;
- owner/site-admin bypass не попадает в key context;
- снижение прав владельца снижает права на следующем запросе ключа и на DBOS recovery;
- удаление владельца блокирует ключ;
- повышение владельца автоматически не расширяет grants;
- ключ Store A не работает с Store B;
- revoked/expired/deleted key отклоняется;
- session token и API key вместе отклоняются.

### GraphQL/MCP behavior

- MCP и Admin UI вызывают одинаковые GraphQL operations;
- `userErrors` сохраняют code/field/message;
- list tools корректно пагинируются;
- retry с тем же idempotency key не создает дубль;
- retry того же idempotency key с другим semantic payload возвращает
  `IDEMPOTENCY_KEY_REUSED` без запуска workflow;
- high-risk tools требуют `admin` grant;
- raw arbitrary mutation отсутствует.

### Audit

- запись содержит owner Admin и credential id/name snapshot;
- audit доступен только в своем store;
- correlation связывает tool call, GraphQL request, workflow и event;
- secret и PII не появляются в logs/audit/errors;
- после удаления ключа audit остается читаемым.

### Protocol и lifecycle

- v1 поднимается только через stdio и согласует MCP protocol version `2025-11-25`;
- `initialize` не выполняет скрытый tool call;
- `tools/list` детерминирован и отражает актуальный effective permission set;
- изменение permission fingerprint приводит к `notifications/tools/list_changed` после того, как
  сервер обнаружил изменение;
- revoke после commit блокирует новый request и DBOS recovery;
- тест не требует отмены workflow, уже прошедшего root preflight до revoke;
- owner и site admin получают только materialized delegable catalog, причем site admin без active
  organization membership не аутентифицируется ключом;
- verifier старой поддерживаемой версии успешно проверяется и лениво обновляется current pepper.

### Verification workflow

- migration генерировать штатной командой, changeset вручную не редактировать;
- GraphQL codegen и schema composition выполнять через `shopana-cli`;
- запускать только необходимые build-команды;
- API/e2e проверки оформлять отдельными Playwright specs и запускать точечно по `e2e/AGENTS.md`;
- dev/start server, browser, `tsc` и полный test suite не использовать.

## 13. Критерии готовности

- Admin создает ключ в `Settings -> AI & MCP` и видит secret только один раз;
- grants являются строгим подмножеством текущих и делегируемых прав Admin;
- MCP client подключается ключом и видит только доступные tools;
- работают read и write операции минимум для catalog, orders и store settings;
- все вызовы идут только через Admin GraphQL Gateway;
- cross-store request, privilege escalation и revoked key блокируются;
- изменение роли владельца отражается на следующем запросе или recovery ключа;
- write action отображается под Admin profile с указанием MCP key;
- secrets отсутствуют в database plaintext, logs, traces и audit;
- schema/codegen/build проходят для затронутых компонентов;
- точечные e2e покрывают lifecycle, RBAC intersection, tenant isolation, read/write и audit.

## 14. Рекомендуемые решения

- Ключи только store-scoped: один ключ — один магазин.
- Expiration по умолчанию 90 дней.
- Read-only preset выбран по умолчанию.
- Изменение grants не меняет secret; `rotate` атомарно создает replacement и отзывает старый ключ.
- V1 поддерживает только stdio; remote Streamable HTTP откладывается до отдельного OAuth-дизайна.
- Lifecycle требует `store.mcp-keys:admin`.
- MCP публикует typed tools без произвольного GraphQL mutation tool.
- Runtime intersection backend — единственный источник истины.
- Actor всегда Admin user, credential — отдельная attribution dimension.
