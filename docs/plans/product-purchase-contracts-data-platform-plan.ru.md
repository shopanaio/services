---
tags:
  - implementation-plan
  - catalog
  - apps
  - checkout
  - pricing
  - orders
  - graphql
  - database
  - contracts
related:
  - ../product-types-and-purchase-contracts.ru.md
  - commerce-functions-platform-plan.md
---

# План реализации контрактов и data platform для расширяемых типов продуктов

## Статус и источник требований

Этот документ является реализационным планом для нормативной архитектуры из
`docs/product-types-and-purchase-contracts.ru.md`.

План намеренно ограничен тремя слоями:

1. versioned TypeScript/Zod и broker-контракты;
2. PostgreSQL/Drizzle/Knex/event-store модель данных;
3. статически компонуемые Admin и Storefront GraphQL-схемы.

Документ не планирует реализацию runtime-поведения. В частности, вне scope
остаются:

- purchase compiler для standard, bundle, gift card или любого другого типа;
- provider actions и их бизнес-реализации;
- validation, canonicalization, hashing и sealing algorithms;
- execution extension pipeline;
- Pricing calculations, discounts, allocation и rounding;
- inventory availability и reservation;
- publication, upgrade, suspend, uninstall и finalization workflows;
- DBOS saga и compensation;
- fulfillment executors;
- Admin/Storefront UI;
- provider-specific product aggregates;
- migration или backfill существующих данных.

Проект greenfield. Целевые контракты заменяют старые формы напрямую. Legacy
adapters, dual-read, dual-write, compatibility fields и backfill запрещены.

## Результат реализации этого плана

После выполнения плана кодовая база должна иметь:

- единый package с неизменяемыми versioned purchase-контрактами и Zod codecs;
- разделенные по владельцам broker action envelopes;
- immutable schema registries без единой межсервисной таблицы;
- Catalog data model для manifest snapshots, definition revisions, Product
  revisions, provider refs, publication proofs и finalization permits;
- Apps data model для immutable product type contributions, capability route
  revisions и runtime retention;
- Checkout event/data contracts для selection, compilation и sealed contract;
- Pricing result contract с authoritative merchandise pricing snapshot;
- Orders event/read models для автономной копии contract и obligations;
- стабильную GraphQL-модель product types, Products, selection, checkout lines,
  Order snapshots и platform diagnostics;
- отсутствие расширяемого `ProductKind` enum и provider-specific полей в core
  purchase API;
- отсутствие клиентских price/title/SKU/snapshot/children данных во входе
  Checkout.

## Нормативные принципы реализации

### Владение

Каждый persisted fact имеет одного владельца.

| Fact | Владелец | Другие сервисы |
|---|---|---|
| Product shell и Product revision | Catalog | получают snapshot/action result |
| Product type definition revision/state | Catalog | pin-ят exact revision |
| Product provider resource | конкретный provider | хранят opaque immutable ref |
| App contribution/route/runtime revision | Apps | pin-ят immutable identity |
| Purchase selection/compilation/contract | Checkout | Pricing предлагает snapshot, Orders копирует финальный contract |
| Pricing snapshot | Pricing | Checkout включает результат в contract |
| Inventory requirement policy | Catalog Inventory | Checkout хранит validated requirement |
| Order contract event | Orders | является автономной копией |
| Obligation execution state | Orders | не меняет исходный contract |

Между схемами сервисов запрещены foreign keys и joins. Даже при одном
PostgreSQL instance внешние ссылки являются строковыми/UUID facts, проверяемыми
через broker contract владельца.

### Versioned envelope для JSON

Произвольный `jsonb` не считается доменным контрактом. Любой динамический JSON
на границе или в persisted snapshot должен находиться в envelope:

```ts
type SchemaIdentity = Readonly<{
  schemaKey: string;
  schemaVersion: number;
  schemaHash: string;
}>;

type SchemaBoundValue = Readonly<{
  schema: SchemaIdentity;
  data: JsonValue;
  digest: string;
}>;
```

Исключения:

- core snapshots, полностью декодируемые versioned Zod codec;
- presentation-only поля, явно помеченные как не влияющие на purchase;
- внутренние read projections, восстанавливаемые из authoritative snapshot.

Для `schemaKey` используется namespaced строка. `schemaVersion` — положительный
integer. `schemaHash` и digest хранят lowercase SHA-256 hex длиной 64 символа.

### Immutable revisions

Content и operational state не смешиваются:

- изменение content создает новую immutable revision;
- state имеет собственную монотонную revision и transition history;
- current/published — только указатели;
- старые revisions физически не обновляются;
- purge выполняется отдельным будущим процессом retention и не входит в этот
  план.

### Tenant scope и идентификаторы

- Все Store facts содержат `store_id`.
- `store_id` не входит в PK/FK по правилу проекта.
- Store isolation обеспечивается обязательным filter/index и tenant-scoped
  unique constraints.
- Persisted UUID — только UUIDv7.
- Global GraphQL ID не является authorization proof и не хранится в БД.
- Технические digest/revision IDs остаются строками, если они не являются
  entity UUID.

### Статический GraphQL

GraphQL schema общая для всех Stores и installations:

- `typeKey` — `String!`, не расширяемый enum;
- platform lifecycle/status/role enums допустимы, так как принадлежат платформе;
- provider data доступна только через schema-bound JSON;
- installation secrets, raw actions, database locators и runtime payloads не
  публикуются;
- динамическая App не добавляет GraphQL type в runtime;
- native/bundled functionality может добавить Federation type только как
  статически собранный subgraph, не меняя core contracts.

## 1. Общий package versioned contracts

### 1.1. Package и публичные entrypoints

Создать workspace package, например `packages/purchase-contracts`, без
зависимости от NestJS, Drizzle, GraphQL или конкретного сервиса.

Публичные entrypoints:

```text
@shopana/purchase-contracts/json
@shopana/purchase-contracts/schema-registry
@shopana/purchase-contracts/product-types
@shopana/purchase-contracts/providers
@shopana/purchase-contracts/selection
@shopana/purchase-contracts/compilation
@shopana/purchase-contracts/pricing
@shopana/purchase-contracts/contract
@shopana/purchase-contracts/fulfillment
@shopana/purchase-contracts/errors
```

Каждый entrypoint экспортирует:

- readonly TypeScript types;
- Zod codec конкретной версии;
- version literal;
- limit policy type, но не runtime policy instance;
- discriminated unions;
- функции decode/parse только как structural codecs.

Package не должен экспортировать:

- repository;
- network client;
- service action implementation;
- current Store configuration;
- mutable singleton registry;
- hash/seal orchestration.

### 1.2. JSON и schema registry contracts

Определить:

```ts
type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

type RegisteredSchemaKind =
  | "PRODUCT_TYPE_MANIFEST"
  | "PRODUCT_SELECTION"
  | "PROVIDER_PRODUCT_RESOURCE"
  | "PROVIDER_PUBLICATION_PROJECTION"
  | "PURCHASE_LINE_PROVIDER_DATA"
  | "EXTENSION_INPUT"
  | "EXTENSION_OUTPUT"
  | "FULFILLMENT_OBLIGATION";

type RegisteredSchemaSnapshotV1 = Readonly<{
  registryVersion: 1;
  kind: RegisteredSchemaKind;
  identity: SchemaIdentity;
  owner: SchemaOwnerRef;
  canonicalSchema: JsonValue;
  limits: SchemaLimitsV1;
  createdAt: string;
}>;
```

`SchemaLimitsV1` фиксирует не алгоритм, а данные limits:

- `maxInputBytes`;
- `maxOutputBytes`;
- `maxDepth`;
- `maxArrayItems`;
- `maxObjectProperties`;
- `maxStringBytes`.

Повторная регистрация другого canonical content под тем же
`(schemaKey, schemaVersion)` запрещена владельцем registry. В database schema
это подкрепляется unique constraint и отдельным `schema_hash`.

### 1.3. Product type contracts

Перенести из нормативного документа в versioned codecs:

- `ProductTypeKey`;
- `ProductTypeProviderRefV1`;
- `FeaturePolicyV1`;
- специализированные media/variants/pricing/inventory policies;
- `ProductFeatureManifestV1`;
- `ProductPurchaseManifestV1`;
- `ProductTypeManifestV1`;
- `ProductTypeContributionV1`;
- `AppProductTypeContributionV1`;
- `ProductTypeDefinitionRevisionV1`;
- `ProductTypeDefinitionStateV1`;
- `ProductTypeRefV1`;
- `ProviderProductResourceRefV1`;
- `ProviderProductPublicationProjectionV1`.

Во всех union используются явные discriminators:

- `provider.kind = NATIVE | APP`;
- `feature.state = DISABLED | OPTIONAL | REQUIRED`;
- `pricing.strategy`;
- `fulfillment.mode`;
- `payment.mode`.

`ProductTypeManifestV1` хранится и передается целиком. Отдельные DB columns для
часто используемых identity/status полей являются индексируемой projection, а
не альтернативным источником manifest.

### 1.4. Provider operation contracts

Создать только action envelopes, без handlers:

```ts
type ProviderResourceAction =
  | "productProvider.resource.create.v1"
  | "productProvider.resource.update.v1"
  | "productProvider.resource.validate.v1"
  | "productProvider.resource.readForAdmin.v1"
  | "productProvider.resource.tombstone.v1";
```

Общий request envelope содержит:

- contract version;
- action;
- Store ID из trusted broker context;
- provider identity;
- exact definition revision;
- Product ID/revision;
- resource ref для операций над существующей revision;
- schema-bound provider input;
- idempotency/correlation metadata.

Общий response envelope содержит:

- exact resource ref;
- schema-bound publication projection при наличии;
- schema-bound Admin view при наличии;
- versioned validation issues;
- provider execution identity.

Нельзя включать:

- SQL locator;
- secret;
- произвольное broker action name;
- callback URL;
- capability override.

### 1.5. Purchase selection и compile input

Публичный Storefront input:

```ts
type PurchaseSelectionInputV1 = Readonly<{
  inputVersion: 1;
  purchasableId: string;
  quantity: number;
  selection: JsonValue;
  clientLineKey?: string;
}>;
```

Trusted internal compile input должен быть отдельным типом
`PurchaseCompileInputV1`. Он включает:

- `storeId`;
- exact Product/published revision snapshot;
- exact definition revision и effective manifest;
- exact provider resource ref;
- expected selection schema identity;
- quantity и untrusted selection;
- currency/locale;
- minimal customer segment snapshot без PII;
- source revisions/quote context;
- immutable provider/function binding;
- execution/correlation/deadline metadata.

`PurchaseSelectionInputV1` нельзя повторно использовать как internal input:
trusted snapshots добавляются только Checkout.

### 1.6. Provider output и PurchaseCompilation

Зафиксировать отдельные codecs:

- `ProviderPurchaseOutputV1` — untrusted runner result;
- `PurchaseCompilationV1` — platform-composed pre-pricing result;
- `PurchaseExtensionOutcomeV1`;
- `PurchaseExecutionSnapshotV1`.

Общие вложенные contracts:

- `PurchaseIdentityV1`;
- `PurchaseProviderSnapshotV1`;
- `PurchaseSelectionSnapshotV1`;
- `PurchaseCompilationLineV1`;
- `AppliedPurchaseRuleV1`;
- `PurchaseBasePricingProposalV1`;
- `PurchaseQuoteSnapshotV1`;
- `PurchaseFulfillmentProposalV1`;
- `PurchasePaymentProposalV1`.

Provider output не содержит trusted fields:

- `identity`;
- `provider`;
- `source` line;
- `compilationRevision`;
- `execution`;
- `extensionOutcomes`;
- `executorProvider` obligation.

Для line topology используются стабильные `key`/`parentKey`, не array index.
Money хранится в minor units. В contract package тип должен отражать safe
integer requirement, но само вычисление/проверка остается вне этого плана.

### 1.7. Pricing contract

Определить request/result boundary между Checkout и Pricing:

```ts
type PricePurchaseCompilationInputV1 = Readonly<{
  inputVersion: 1;
  storeId: string;
  checkoutId: string;
  checkoutRevision: string;
  compilationRevision: string;
  compilationDigest: string;
  currencyCode: string;
  lines: readonly PricingLineInputV1[];
  customerContext: PricingCustomerContextV1;
  sourceRevisions: readonly SourceRevisionV1[];
}>;

type PurchasePricingSnapshotV1 = Readonly<{
  schemaVersion: 1;
  currencyCode: string;
  merchandiseSubtotalMinor: number;
  discountMinor: number;
  merchandiseTotalMinor: number;
  lineAllocations: readonly PurchasePricingLineAllocationV1[];
  adjustments: readonly PurchasePricingAdjustmentV1[];
  pricingRevision: string;
}>;
```

Pricing request получает только необходимые price facts, line identity и
разрешенный context. Он не получает provider secrets или mutation authority.

### 1.8. Sealed PurchaseContract

Определить:

- `PurchaseValidationSnapshotV1`;
- `PurchaseContractSealV1`;
- `PurchaseContractV1`.

`PurchaseContractV1` содержит ровно:

```text
contractVersion
compilation
pricing
validation
seal
```

Contract codec не должен автоматически пересчитывать или «чинить» данные.
Decode означает structural validation. Семантическая validation и seal
verification принадлежат Checkout/Orders integration и находятся вне этого
плана.

### 1.9. Finalization и Orders envelopes

Определить broker data contracts:

- `PurchaseFinalizationPermitV1`;
- `CreatePurchaseOrderInputV1`;
- `CreatePurchaseOrderResultV1`;
- `OrderPurchaseContractRecordedV1`;
- `OrderFulfillmentObligationEnvelopeV1`;
- `OrderFulfillmentObligationStateV1`.

`CreatePurchaseOrderInputV1` содержит полный sealed contract, Store/Checkout
identity и deterministic idempotency key. Orders не получает selection отдельно
и не должен загружать Product/App для построения snapshot.

### 1.10. Error contract

Создать стабильный `PurchaseContractIssueV1`:

```ts
type PurchaseContractIssueV1 = Readonly<{
  code: PurchaseContractIssueCode;
  path: readonly (string | number)[];
  message: string;
  source:
    | "PLATFORM"
    | "CATALOG"
    | "PROVIDER"
    | "EXTENSION"
    | "PRICING"
    | "INVENTORY";
  details?: SchemaBoundValue;
}>;
```

Коды являются platform enum и могут расширяться только новой версией contract
package. `message` не используется для programmatic branching. Не включать
stack trace, raw provider payload, PII или secret.

## 2. Catalog data model

Catalog использует Drizzle models и handwritten SQL migrations в
`services/catalog/migrations/domains/**`. Для нового bounded domain выделить
отдельный диапазон, например `1100_product_types`.

### 2.1. `catalog.product_type_schema`

Immutable registry Catalog-owned schema snapshots.

Колонки:

| Column | Type | Назначение |
|---|---|---|
| `id` | uuid PK | UUIDv7 identity |
| `kind` | varchar | selection/resource/projection/line-data |
| `schema_key` | varchar | namespaced stable key |
| `schema_version` | integer | positive version |
| `schema_hash` | char(64) | canonical schema hash |
| `owner_kind` | varchar | `NATIVE_SERVICE` или `APP` |
| `owner_key` | varchar | service namespace или appCode |
| `canonical_schema` | jsonb | immutable schema document |
| `limits` | jsonb | decoded `SchemaLimitsV1` |
| `created_at` | timestamptz | immutable timestamp |

Constraints/indexes:

- unique `(schema_key, schema_version)`;
- unique `(schema_key, schema_version, schema_hash)`;
- check `schema_version > 0`;
- check hash format;
- index `(owner_kind, owner_key, kind)`.

### 2.2. `catalog.product_type_manifest_snapshot`

Immutable validated contribution copied into Catalog ownership boundary.

Колонки:

- `id uuid PK`;
- `type_key varchar`;
- `manifest_version varchar`;
- `manifest_hash char(64)`;
- `schema_version integer`;
- `provider_kind varchar`;
- `provider_service varchar null`;
- `provider_key varchar null`;
- `app_code varchar null`;
- `source_contribution_id uuid null`;
- `source_contribution_revision varchar null`;
- `manifest jsonb`;
- `created_at timestamptz`.

Constraints:

- unique `(type_key, manifest_version, manifest_hash)`;
- native/app provider column checks;
- native `type_key` должен быть namespaced, App key начинается с
  `app.${app_code}.` — DB хранит факт, semantic validation реализуется позднее;
- snapshot никогда не обновляется.

Catalog не ставит FK на Apps contribution.

### 2.3. `catalog.product_type_definition`

Stable definition identity:

- `id uuid PK`;
- `store_id uuid not null`;
- `type_key varchar not null`;
- `current_revision integer not null`;
- `created_at timestamptz`.

Constraints/indexes:

- unique `(store_id, id)`;
- unique `(store_id, type_key, id)`;
- index `(store_id, type_key)`;
- `current_revision > 0`.

Таблица не содержит mutable configuration/manifest. Они находятся только в
revision table.

### 2.4. `catalog.product_type_definition_revision`

Immutable content:

- `id uuid PK`;
- `definition_id uuid not null`;
- `store_id uuid not null`;
- `revision integer not null`;
- `type_key varchar not null`;
- `manifest_snapshot_id uuid not null`;
- `manifest_version varchar not null`;
- `manifest_hash char(64) not null`;
- `configuration_revision integer not null`;
- `configuration_snapshot jsonb not null`;
- `effective_manifest jsonb not null`;
- `effective_manifest_hash char(64) not null`;
- provider discriminator columns;
- `selection_schema_key/version/hash`;
- `provider_resource_schema_key/version/hash`;
- `compiler_target varchar not null`;
- `created_at timestamptz`.

Provider columns:

- native: `provider_service`, `provider_key`;
- App: `app_code`, `installation_id`, `function_key`,
  `capability_route_id`, `route_revision`.

Constraints:

- unique `(definition_id, revision)`;
- unique `(store_id, definition_id, revision)`;
- check revision/configuration revision positive;
- native/App shape checks;
- exactly one compile binding;
- `compiler_target = 'checkout.purchase.compile.v1'` for V1;
- local FK только к Catalog manifest/definition/schema tables;
- никакого FK к `apps.*`.

`configuration_snapshot` содержит только non-secret configuration. Для secret
разрешен лишь opaque schema-bound reference без secret value.

### 2.5. Definition state и history

`catalog.product_type_definition_state`:

- `definition_id uuid`;
- `definition_revision integer`;
- `store_id uuid`;
- `status varchar`;
- `status_revision integer`;
- `status_reason varchar`;
- `changed_at timestamptz`;
- PK/unique по Catalog identity без `store_id` в PK.

`catalog.product_type_definition_state_transition` append-only:

- `id uuid PK`;
- definition identity;
- `from_status`, `to_status`;
- `from_status_revision`, `to_status_revision`;
- `reason`;
- actor/correlation metadata без PII;
- `changed_at`.

Platform enums:

- status: `ACTIVE | SUSPENDED | RETIRED`;
- reason: `NONE | APP_SUSPENDED | APP_UNINSTALLED |
  PROVIDER_RETIRED | MANUALLY_SUSPENDED`.

### 2.6. Product shell и immutable revisions

В greenfield cutover текущая mutable `catalog.product` модель заменяется, а не
оборачивается compatibility слоем.

Product shell должен содержать:

- `id uuid PK`;
- `store_id uuid`;
- `merchant_status`;
- `current_revision integer`;
- `published_revision integer null`;
- `created_at`, `updated_at`;
- optional tombstone timestamp только если он согласован с `ARCHIVED`.

`catalog.product_revision`:

- `id uuid PK`;
- `product_id uuid`;
- `store_id uuid`;
- `revision integer`;
- definition identity/revision/type key/effective manifest hash;
- `provider_state`;
- provider resource discriminator/identity/revision;
- resource schema key/version/hash;
- `provider_resource_digest`;
- common immutable authoring snapshot;
- `handle`, localized title/content snapshot;
- `created_at`.

Constraints:

- unique `(product_id, revision)`;
- unique `(store_id, product_id, revision)`;
- `provider_resource` null только для `PENDING_PROVIDER` и
  `PROVIDER_SETUP_FAILED`;
- `READY` требует полный resource ref;
- `published_revision` ссылается на revision того же Product через локальный
  Catalog FK;
- `PUBLISHED` требует non-null `published_revision`;
- provider resource ID остается opaque `varchar`, не UUID/FK.

Не добавлять `kind`, `product_kind`, App installation discriminator или bundle
fields в Product shell.

### 2.7. Publication proof

`catalog.product_publication_validation` — immutable result:

- `id uuid PK`;
- `store_id`, `product_id`, `product_revision`;
- definition ID/revision/status revision;
- manifest/effective manifest hashes;
- resource ID/revision/digest;
- route revision nullable для native;
- selection/resource schema hashes;
- validation result digest;
- `issues jsonb` как `PurchaseContractIssueV1[]`;
- `is_valid boolean`;
- `validated_at`.

Unique key должен исключать два разных result для одного полного pinned input
digest. Результат не обновляется при invalidation; новый input создает новую
запись.

### 2.8. Provider availability projection

`catalog.product_provider_availability_projection` — rebuildable read model:

- Store/Product/published revision;
- definition/status revision;
- installation/route revision nullable;
- `provider_availability`;
- `effective_availability`;
- source event revision/digest;
- `refreshed_at`.

Это не source of truth и не должно участвовать в finalization permit.

### 2.9. Finalization permits

`catalog.purchase_finalization_permit`:

- поля `PurchaseFinalizationPermitV1`;
- `contract_candidate_digest`;
- `created_at`, `expires_at`, `terminal_at`;
- state enum `ACTIVE | COMPLETED | FAILED | EXPIRED`;
- unique idempotency key `(store_id, checkout_id, checkout_revision,
  product_id, product_revision)`;
- indexes для active permits по `installation_id` и definition revision.

Таблица фиксирует данные для будущей lifecycle serialization, но сам workflow
не входит в этот план.

### 2.10. Что не хранить в Catalog

- App provider aggregate;
- checkout selection;
- PurchaseCompilation/Contract;
- Pricing result;
- Order snapshot;
- secrets;
- executable validation rules;
- arbitrary extension output без schema identity;
- cross-service route FK.

## 3. Apps data model

Apps также использует Drizzle и handwritten migrations.

### 3.1. Product type contribution snapshots

Добавить `apps.product_type_contribution_snapshot`:

- `id uuid PK`;
- `store_id uuid`;
- `installation_id uuid` с локальным FK;
- `app_code`, `app_version`;
- `type_key`;
- `manifest_version`, `manifest_hash`, `manifest_schema_version`;
- `manifest jsonb`;
- provider resource schema identity;
- selection schema identity;
- `function_key`;
- `capability`, `target`;
- `contribution_revision varchar`;
- `created_at`.

Constraints:

- immutable unique `(installation_id, type_key, contribution_revision)`;
- `capability = 'commerce.function'`;
- `target = 'checkout.purchase.compile.v1'`;
- unique content tuple с manifest hash;
- App namespace index.

Catalog получает copy snapshot по action contract и не ссылается FK на эту
таблицу.

### 3.2. Capability route revisions

Текущая модель одного mutable route на installation недостаточна. Разделить:

`apps.capability_route`:

- stable `id`;
- Store/installation/capability/operation/function identity;
- `current_revision`;
- timestamps.

`apps.capability_route_revision`:

- `id uuid PK`;
- `route_id`;
- `store_id`, `installation_id`;
- `revision varchar`;
- `app_code`, `app_version`;
- `function_key`;
- `capability`, `target`, `target_action`;
- `runtime_artifact_digest`;
- `manifest_snapshot_id`;
- state `PREPARED | ACTIVE | RETAINED | RETIRED`;
- `created_at`, `activated_at`, `retired_at`.

Unique:

- `(route_id, revision)`;
- exact discovery tuple `(installation_id, function_key, revision)`;
- one current pointer in route, но несколько retained revisions.

Старое поле `appBindings.targetAction` не используется как единственный
источник pinned route.

### 3.3. Runtime retention references

Добавить `apps.runtime_retention_reference`:

- route revision identity;
- reference kind `PUBLISHED_PRODUCT | ACTIVE_PERMIT |
  NON_TERMINAL_OBLIGATION`;
- external owner/ref ID;
- `store_id`;
- `retained_until` nullable;
- `released_at`.

Таблица является data foundation для будущего purge/uninstall workflow.
Cross-service FK запрещен.

### 3.4. App provider schemas

Canonical provider resource schemas и App-specific line/obligation schemas
хранятся в immutable Apps manifest snapshot. Catalog/Checkout/Orders получают
требуемый canonical snapshot в своем registry boundary. Не создавать общую
таблицу, к которой все сервисы ходят напрямую.

### 3.5. Что не хранить в Apps

- Catalog definition;
- Product shell;
- PurchaseContract;
- Order display snapshot;
- raw customer PII;
- checkout line state.

## 4. Checkout data contracts и persistence

Checkout использует event-sourced write model и Knex read models. Этот план не
меняет выбранную архитектуру.

### 4.1. Event payload versions

Добавить versioned event data:

- `CheckoutPurchaseSelectionAcceptedV1`;
- `CheckoutPurchaseCompilationRecordedV1`;
- `CheckoutPurchaseContractSealedV1`;
- `CheckoutLinePurchaseContractReplacedV1`;
- `CheckoutLinePurchaseContractInvalidatedV1`;
- `CheckoutFinalizationStartedV1`;
- `CheckoutOrderCreationAcceptedV1`.

Каждый event содержит:

- `eventVersion`;
- Store/Checkout/line identity;
- checkout revision;
- contract/compilation revision и digest;
- полный authoritative snapshot только там, где event является source of truth;
- correlation/idempotency metadata.

Старый event с client-provided `purchasableSnapshot`, `children` или
`priceConfig` не поддерживается.

### 4.2. Immutable contract document

Внутри event payload сохранять полный `PurchaseContractV1`. Для эффективного
read/finalize добавить append-only document projection
`checkout.purchase_contract_document`:

- `id uuid PK`;
- `store_id`;
- `checkout_id`, `checkout_revision`, `checkout_line_id`;
- `contract_revision varchar`;
- `contract_version integer`;
- `type_key`, `purchasable_id`;
- `selection_digest`;
- `compilation_digest`, `pricing_digest`, `contract_digest`;
- `quote_valid_until`;
- `contract jsonb`;
- `source_event_position`;
- `created_at`;
- unique `(store_id, checkout_id, checkout_line_id, contract_revision)`;
- unique `(store_id, contract_digest)`.

Это immutable projection/copy. Source of truth — event stream.

### 4.3. Checkout line projection

Материализовать только данные чтения:

- root checkout line identity;
- active contract revision/digest;
- type key/purchasable ID;
- selection digest;
- quantity;
- status `VALID | INVALID | PROVIDER_UNAVAILABLE`;
- root display snapshot;
- merchandise totals;
- quote expiry;
- line topology projection.

Component/charge/entitlement строки получают internal row identity, но
authoritative identity остается `(contract_digest, line_key)`.

Не хранить независимые mutable:

- child price config;
- client snapshot;
- provider metadata без schema identity;
- totals, не связанные с contract digest.

### 4.4. Checkout-owned schema registry

Добавить immutable registry для:

- provider output schema;
- extension slot input/output schemas;
- purchase line provider data schemas, разрешенных Checkout;
- target limits/policy revisions.

Минимальные таблицы:

- `checkout.purchase_contract_schema`;
- `checkout.purchase_target_revision`;
- `checkout.purchase_extension_slot_schema`.

Они повторяют общий `RegisteredSchemaSnapshotV1`, но принадлежат Checkout и не
имеют FK на Catalog/Apps.

## 5. Pricing data contract

### 5.1. Versioned broker boundary

В `packages/broker-types` объявить action contracts:

- `pricing.purchase.price.v1`;
- request `PricePurchaseCompilationInputV1`;
- response `PurchasePricingSnapshotV1`;
- versioned pricing issues.

Broker types должны импортировать DTO из `@shopana/purchase-contracts`, а не
создавать параллельные локальные типы.

### 5.2. Pricing persistence

Если Pricing сохраняет calculation audit, добавить append-only
`pricing.purchase_pricing_snapshot`:

- `id uuid PK`;
- `store_id`;
- checkout/compilation identity;
- `input_digest`;
- `pricing_revision`;
- `currency_code`;
- merchandise subtotal/discount/total в `bigint`;
- `snapshot jsonb`;
- `created_at`;
- unique `(store_id, pricing_revision)`;
- unique `(store_id, input_digest, pricing_revision)`.

Для DB money использовать `bigint`/exact integer representation. GraphQL money
продолжает использовать общий `Money`, а не PostgreSQL numeric float.

Таблица не является обязательной для Checkout contract validity: Checkout
сохраняет полный pricing snapshot внутри contract.

### 5.3. Что не входит

- discount business rules;
- promotion application;
- allocation algorithm;
- currency conversion;
- rounding;
- tax/shipping/duties/payment fee schemas.

## 6. Orders data contracts и persistence

### 6.1. Order event

Order creation event должен содержать:

- `orderContractVersion`;
- full `PurchaseContractV1` для каждой root purchase;
- Checkout identity/revision;
- deterministic idempotency key;
- tax/shipping/duties snapshots как отдельные versioned поля, не внутри
  PurchaseContract V1.

Никакой Product/App lookup не нужен для декодирования event.

### 6.2. Purchase contract read model

`orders.order_purchase_contract`:

- `id uuid PK`;
- `store_id`, `order_id`, `order_line_id`;
- `contract_version`;
- `contract_digest`, compilation/pricing digests;
- type/product/purchasable identity;
- definition/provider/App/route revisions;
- `contract jsonb`;
- `source_event_position`;
- `created_at`;
- unique `(store_id, order_id, contract_digest)`.

`orders.order_purchase_line` projection:

- `contract_id` local FK;
- `line_key`, `parent_key`, role, source kind/binding;
- purchasable identity/revision;
- quantity;
- title/SKU/durable media reference;
- base/final monetary allocation;
- physical/inventory flags;
- schema-bound provider data;
- unique `(contract_id, line_key)`.

Parent relation проверяется в projection builder, а не cross-row FK, чтобы
ROOT с null parent и arbitrary stable string keys не усложняли insert order.

### 6.3. Applied rules projection

`orders.order_purchase_rule`:

- `contract_id`;
- rule key/revision/type/source;
- input digest;
- outcome/snapshot JSON;
- unique `(contract_id, rule_key, rule_revision)`.

Это read model. Полный результат остается в contract event.

### 6.4. Fulfillment obligations

`orders.order_fulfillment_obligation`:

- `id uuid PK`;
- `store_id`, `order_id`, `contract_id`;
- obligation key/type/version/trigger;
- executor provider snapshot;
- payload schema hash и payload;
- PII refs как schema-checked opaque array;
- state `PENDING | RUNNING | SUCCEEDED | FAILED | CANCELED`;
- state revision;
- attempt/idempotency identity;
- timestamps;
- unique `(store_id, order_id, contract_digest, obligation_key)`.

`orders.order_fulfillment_obligation_transition` append-only хранит state
history. Реализация executor/workflow не входит в план.

### 6.5. Retention projection

Orders должен уметь предоставить Apps immutable fact:

- route revision;
- obligation identity;
- required/optional failure mode;
- terminal/non-terminal state.

Это broker read contract, а не shared SQL view.

## 7. GraphQL schema

### 7.1. Общие правила

- ID кодируются существующим `shared-graphql-guid`.
- `DateTime` — string scalar.
- `JSON` используется только внутри schema-bound/presentation полей.
- Internal digests можно показывать в Admin diagnostics, но не обязательно в
  Storefront.
- `storeId`, installation secret refs и broker action names не публикуются.
- Все list queries используют существующие Relay connection patterns.
- Mutation payloads возвращают entity и `userErrors`.

### 7.2. Catalog Admin: product type

Добавить статические platform enums:

```graphql
enum ProductTypeProviderKind {
  NATIVE
  APP
}

enum ProductTypeDefinitionStatus {
  ACTIVE
  SUSPENDED
  RETIRED
}

enum ProductTypeDefinitionStatusReason {
  NONE
  APP_SUSPENDED
  APP_UNINSTALLED
  PROVIDER_RETIRED
  MANUALLY_SUSPENDED
}

enum ProductFeaturePolicyState {
  DISABLED
  OPTIONAL
  REQUIRED
}
```

Core objects:

```graphql
type SchemaIdentity {
  key: String!
  version: Int!
  hash: String!
}

type SchemaBoundData {
  schema: SchemaIdentity!
  data: JSON!
  digest: String!
}

type ProductTypeProvider {
  kind: ProductTypeProviderKind!
  service: String
  providerKey: String
  appCode: String
  installationId: ID
  functionKey: String
  routeRevision: String
}

type ProductTypeDefinition implements Node {
  id: ID!
  key: String!
  revision: Int!
  manifestVersion: String!
  manifestHash: String!
  configurationRevision: Int!
  configuration: SchemaBoundData!
  effectiveManifest: ProductTypeManifest!
  effectiveManifestHash: String!
  provider: ProductTypeProvider!
  state: ProductTypeDefinitionState!
  createdAt: DateTime!
}

type ProductTypeDefinitionState {
  status: ProductTypeDefinitionStatus!
  revision: Int!
  reason: ProductTypeDefinitionStatusReason!
  changedAt: DateTime!
}
```

`ProductTypeManifest` должен быть typed для platform-owned core:

- identity;
- feature policies;
- purchase quantity/pricing/fulfillment/payment;
- selection schema identity;
- allowed extension slots;
- presentation references.

Только namespaced provider configuration остается `SchemaBoundData`.
`effectiveManifest: JSON!` из архитектурного примера допустим как первая
техническая версия, но целевая схема этого плана — typed core object.

Queries в `CatalogQuery`:

- `productTypeDefinitions(first, after, filter): ProductTypeDefinitionConnection!`;
- `productTypeDefinition(id): ProductTypeDefinition`;
- `productTypeManifest(typeKey, version, hash): ProductTypeManifestSnapshot`;
- `productContractSchema(key, version): RegisteredContractSchema`;

Mutation schema contracts:

- `productTypeDefinitionCreate`;
- `productTypeDefinitionRevise`;
- `productTypeDefinitionStatusUpdate`;
- `productTypeDefinitionUpgradePrepare`.

Последняя mutation создает только data record/validation request contract.
Upgrade workflow logic не входит в этот план.

### 7.3. Catalog Admin: Product

Целевой Product:

```graphql
enum ProductMerchantStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ProductProviderState {
  PENDING_PROVIDER
  READY
  PROVIDER_SETUP_FAILED
}

enum ProductEffectiveAvailability {
  AVAILABLE
  NOT_PUBLISHED
  ARCHIVED
  PROVIDER_UNAVAILABLE
}

type Product implements Node @key(fields: "id") {
  id: ID!
  revision: Int!
  publishedRevision: Int
  type: ProductTypeDefinition!
  typeKey: String!
  merchantStatus: ProductMerchantStatus!
  providerState: ProductProviderState!
  providerResource: ProviderProductResource
  effectiveAvailability: ProductEffectiveAvailability!
  providerAdminData: SchemaBoundData
  # existing common authoring fields according to effective manifest
}

type ProviderProductResource {
  resourceId: String!
  resourceRevision: String!
  schema: SchemaIdentity!
  digest: String!
}
```

Не публиковать raw provider route/action и resource database locator.

Product create/update schema должна принимать:

- definition ID/revision;
- common authoring fields;
- schema-bound provider input.

Обычный `productUpdate` не принимает новый `typeKey`. Смена типа — отдельный
future use case/schema.

### 7.4. Catalog Storefront

Storefront публикует только effective available published revisions:

```graphql
interface Purchasable {
  id: ID!
  typeKey: String!
}

type Product implements Node & Purchasable @key(fields: "id") {
  id: ID!
  typeKey: String!
  purchase: ProductPurchaseDescriptor!
  # sanitized common published fields
}

type ProductPurchaseDescriptor {
  selectionSchema: SchemaIdentity!
  selectionUi: SchemaBoundData
  quantity: ProductPurchaseQuantity!
  pricingStrategy: ProductPricingStrategy!
  fulfillmentMode: ProductFulfillmentMode!
  paymentMode: ProductPaymentMode!
}
```

Storefront не получает:

- definition configuration;
- provider resource data;
- installation ID;
- route revision;
- secrets;
- publication validation details.

### 7.5. Checkout Storefront input

Заменить текущий input:

```graphql
input PurchaseSelectionInput {
  purchasableId: ID!
  quantity: Int!
  selection: JSON!
  clientLineKey: String
}

input CheckoutLinesAddInput {
  checkoutId: ID!
  selections: [PurchaseSelectionInput!]!
}
```

Удалить без compatibility:

- `PurchasableSnapshotInput`;
- `CheckoutChildLineInput`;
- `CheckoutLineAddInput.purchasableSnapshot`;
- `CheckoutLineAddInput.children`;
- клиентский `CheckoutLinePriceConfig`.

Клиент передает намерение, а не line topology или trusted snapshot.

### 7.6. Checkout Storefront output

Стабильная view:

```graphql
enum PurchaseLineRole {
  ROOT
  COMPONENT
  CHARGE
  ENTITLEMENT
}

enum CheckoutPurchaseStatus {
  VALID
  INVALID
  PROVIDER_UNAVAILABLE
}

type CheckoutLine implements Node @key(fields: "id") {
  id: ID!
  typeKey: String!
  purchasableId: ID!
  quantity: Int!
  role: PurchaseLineRole!
  parent: CheckoutLine
  components: [CheckoutLine!]!
  title: String!
  sku: String
  imageSrc: String
  cost: CheckoutLineCost!
  purchaseStatus: CheckoutPurchaseStatus!
  selection: SchemaBoundData!
}
```

`providerData`, contract digests и execution trace по умолчанию не нужны
Storefront. Если требуется diagnostics, это отдельное Admin/internal поле.

### 7.7. Pricing GraphQL

Purchase pricing pipeline не добавляет публичную mutation в Pricing Admin API.
Pricing result является broker contract.

Если нужен Admin audit, добавить read-only:

- `purchasePricingSnapshot(revision: String!): PurchasePricingSnapshot`;
- line allocations;
- adjustments;
- input/output digests.

Нельзя через GraphQL изменять sealed pricing snapshot.

### 7.8. Orders Admin/Storefront

Order line больше не должен полагаться на generic
`PurchasableSnapshot.purchasableSnapshot: JSON!`.

Typed order view:

```graphql
type OrderPurchaseSnapshot {
  typeKey: String!
  purchasableId: ID!
  productId: ID
  selection: SchemaBoundData!
  provider: OrderPurchaseProviderSnapshot!
  appliedRules: [OrderAppliedPurchaseRule!]!
  contractDigest: String!
}

type OrderLine {
  id: ID!
  lineKey: String!
  role: PurchaseLineRole!
  parent: OrderLine
  children: [OrderLine!]!
  quantity: Int!
  title: String!
  sku: String
  imageSrc: String
  pricing: OrderLinePurchasePricing!
  purchase: OrderPurchaseSnapshot!
  fulfillmentObligations: [OrderFulfillmentObligation!]!
}
```

Admin может видеть provider/App/route revisions и digests. Storefront получает
sanitized provider label и purchase facts, но не installation/runtime identity,
если это не customer-visible requirement.

Raw contract JSON не публикуется Storefront. Для Admin diagnostics допустимо
поле `contract: JSON!` только под отдельным permission и с документированным
version field; предпочтительна typed projection.

### 7.9. Apps Admin diagnostics

Добавить read-only types:

- `AppProductTypeContribution`;
- `AppCapabilityRouteRevision`;
- `AppRuntimeRetentionReference`.

Не добавлять mutation, позволяющую App напрямую создавать Catalog definition.
Catalog definition создается Catalog mutation.

## 8. Broker action schema

Action names и владельцы:

| Action | Owner | Request/response |
|---|---|---|
| `catalog.productTypeDefinition.resolve.v1` | Catalog | exact definition snapshot |
| `catalog.purchasable.resolve.v1` | Catalog | exact published Product snapshot |
| `catalog.productProviderResource.validateRef.v1` | Catalog/provider dispatch | ref proof |
| `catalog.purchaseFinalizationPermit.create.v1` | Catalog | permit snapshot |
| `apps.productTypeContribution.get.v1` | Apps | immutable contribution |
| `apps.capabilityRoute.resolveRevision.v1` | Apps | exact route revision |
| `checkout.purchase.compile.v1` | Checkout | compile target envelope |
| `pricing.purchase.price.v1` | Pricing | pricing snapshot |
| `orders.purchaseOrder.create.v1` | Orders | idempotent create envelope |
| `orders.fulfillmentRetention.list.v1` | Orders | non-terminal retained routes |

Все action DTO импортируются из общего contract package. В
`packages/broker-types` остаются только routing/action maps и transport
envelopes.

## 9. Порядок реализации

### Этап 1. Зафиксировать contract package

1. Создать package и entrypoints.
2. Добавить JSON/schema identity primitives.
3. Добавить manifest/provider/definition/resource contracts.
4. Добавить selection/provider output/compilation contracts.
5. Добавить pricing/validation/seal/contract contracts.
6. Добавить finalization/order/obligation contracts.
7. Добавить versioned issue codes.
8. Исключить дублирующие DTO из service packages.

Результат: все последующие DB/GQL слои ссылаются на один versioned vocabulary.

### Этап 2. Catalog schema foundation

1. Handwritten migration domain `product_types`.
2. Drizzle models для schema/manifest/definition/state.
3. Product shell/revision target schema.
4. Publication proof/provider availability projection.
5. Finalization permit table.
6. Обновить model-derived Catalog DB inventory docs.
7. Добавить только repository row types/interfaces, без scripts/workflows.

### Этап 3. Apps immutable data

1. Contribution snapshots.
2. Stable route + immutable route revisions.
3. Runtime retention references.
4. Drizzle models и handwritten migrations.
5. Broker DTO для exact revision reads.

### Этап 4. Checkout и Pricing contracts

1. Новые Checkout event payload versions.
2. Immutable contract document/read projections.
3. Checkout schema/target registries.
4. Pricing broker request/result.
5. Optional Pricing audit snapshot table.
6. Удалить старые client snapshot/children DTO из schema contracts.

### Этап 5. Orders autonomous snapshots

1. Order creation event V1 с full contract.
2. Contract/line/rule read models.
3. Obligation/state transition models.
4. Retention read contract.
5. Удалить generic authoritative `PurchasableSnapshot` JSON модель.

### Этап 6. GraphQL schemas

1. Общие schema-bound types/scalars.
2. Catalog Admin product type/definition schemas.
3. Catalog Product revision/provider fields.
4. Catalog Storefront purchase descriptor.
5. Checkout selection input и typed line output.
6. Orders typed purchase snapshots.
7. Apps/Pricing Admin diagnostics.
8. Federation ownership/directives и Global ID mapping.

### Этап 7. Schema verification

Использовать только `shopana-cli` workflow, установленный правилами проекта:

- export subgraph schemas;
- compose Admin/Storefront supergraphs;
- выполнить GraphQL codegen;
- проверить generated input Zod schemas;
- проверить migration ordering и model/SQL parity;
- проверить, что build assets включают новые nested migrations и GraphQL
  schemas.

Реализация бизнес handlers, tests, build и runtime execution не являются частью
этого плана.

## 10. Hard cutover из текущей модели

Удалить или заменить напрямую:

- любые `ProductKind`/`BASE | BUNDLE | ...` discriminators;
- mutable Product как единственный source без Product revisions;
- Checkout client `purchasableSnapshot`;
- Checkout client `children`;
- Checkout `ChildPriceType`/`CheckoutLinePriceConfig` как authoritative input;
- Orders `PurchasableSnapshot { purchasableSnapshot: JSON! }` как основной
  purchase snapshot;
- single-current App route lookup без exact route revision;
- provider metadata JSON без schema key/version/hash;
- cross-service SQL assumptions старых bundle документов.

Не создавать:

- legacy fields с deprecation period;
- translation старого snapshot в новый contract;
- backfill existing checkout/order events;
- alias `ProductKind -> typeKey`;
- dual schema для old/new cart line.

Старые документы `docs/bundles/*` не являются источником platform contract.
Будущий bundle provider проектируется поверх `ProviderProductResourceRefV1` и
`ProviderPurchaseOutputV1`.

## 11. Критерии готовности

### Contracts

- Каждый внешний/persisted JSON имеет schema identity или fully versioned codec.
- Provider output структурно отделен от trusted compilation.
- Pricing snapshot структурно отделен от provider proposal.
- Sealed contract содержит все business facts для Order.
- Все versions являются literal fields и входят в codec.
- Нет service-local копий центральных purchase DTO.

### Database

- Все content revisions immutable.
- Operational state и content revisions разделены.
- Все Store data tenant-scoped и индексированы.
- `store_id` отсутствует в PK/FK.
- Все persisted UUID — UUIDv7.
- Нет cross-service FK/join.
- Catalog не хранит App aggregate.
- Orders хранит автономный full contract.
- Checkout и Orders projections всегда привязаны к contract digest.

### GraphQL

- Schema не зависит от installed Apps.
- `typeKey` — String, не enum product kinds.
- Storefront input не принимает trusted snapshot/price/topology.
- Provider-specific JSON schema-bound.
- Product и Order имеют typed stable purchase views.
- Internal routes/secrets/DB locators скрыты.
- Admin и Storefront supergraphs компонуются без ownership conflicts.

### Scope

- Ни один compiler, Pricing algorithm, reservation, workflow или obligation
  executor не реализован в рамках этого плана.
- Ни один конкретный тип продукта не получает provider-specific таблицы или
  GraphQL mutations в рамках платформенного этапа.
- План оставляет четкие action/data seams для последующей реализации логики.

## 12. Решения, которые должны быть подтверждены перед началом кода

Эти вопросы не меняют архитектурный scope, но должны быть закрыты в первом
contract PR:

1. Финальное имя общего package: `purchase-contracts` или
   `commerce-contracts`.
2. Будет ли Pricing audit snapshot persisted сразу или только embedded в
   Checkout contract.
3. Формат opaque provider `resourceRevision`: unrestricted string с limits или
   canonical digest-like token.
4. Будет ли Admin GraphQL публиковать full raw contract под permission либо
   только typed projection.
5. Где хранить canonical obligation schema copy: Checkout registry, Orders
   registry или в обоих owner boundaries с одинаковым hash.
6. Финальный migration domain number для Catalog product types.

Рекомендуемые defaults:

- package `@shopana/purchase-contracts`;
- Pricing audit table включить сразу как append-only diagnostics;
- `resourceRevision` оставить bounded opaque string;
- raw contract не публиковать, оставить typed Admin projection;
- obligation schema копировать в Checkout при validation и Orders вместе с
  accepted contract;
- использовать следующий свободный Catalog migration domain после текущих
  доменов.
