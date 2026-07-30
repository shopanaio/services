# Контракты типов продуктов и платформа данных Catalog/Apps

## Статус документа

Целевой implementation plan для foundation-слоя расширяемых типов продуктов.

Исходное архитектурное решение:
`docs/product-types-and-purchase-contracts.ru.md`.

Этот план намеренно ограничен четырьмя результатами:

1. platform-owned TypeScript/Zod-контрактами типов продуктов;
2. декларативными contributions в App manifest;
3. моделями данных PostgreSQL/Drizzle в `catalog` и `apps`;
4. стабильными Admin/Storefront GraphQL-схемами Catalog и Admin GraphQL-схемой
   Apps.

План не включает исполнение provider actions, orchestration, публикационные
workflow, migration jobs, UI, конкретные типы продуктов и какую-либо
доменную бизнес-логику.

## Жесткая граница scope

### В scope

- namespaced `ProductTypeKey`;
- `ProductTypeDataManifestV1` для product-owned authoring/data capabilities;
- feature policies и platform limits;
- native/App provider identity;
- versioned provider-resource schemas;
- App product-type contributions;
- immutable App contribution snapshots;
- Catalog-owned `ProductTypeDefinition` и его immutable revisions;
- operational state definition и история state transitions;
- ссылка Product на exact definition revision;
- opaque immutable `ProviderProductResourceRef`;
- Product shell, immutable Product revisions и pointers current/published;
- provider availability projection как Catalog read model;
- typed GraphQL presentation всех перечисленных контрактов;
- versioned JSON envelopes только для provider-owned данных;
- tenant isolation, hashes, immutable revisions, constraints и indexes;
- прямой greenfield cutover существующей модели без compatibility layer.

### Вне scope

- любые downstream purchase contracts и их исполнение;
- любые contracts, data models и изменения сервисов кроме Catalog и Apps;
- runtime вызова provider;
- capability executor и function runner;
- lifecycle workflows install/update/suspend/uninstall;
- publication validation implementation;
- создание, обновление, rebind или tombstone provider resource;
- реализация standard product, bundle, gift card или другого конкретного типа;
- provider-specific таблицы и GraphQL-типы конкретной App;
- Admin editor и Storefront components;
- resolver, repository, service, script, saga и workflow implementations;
- backfill, dual-write, legacy adapters и чтение старого формата.

Если для будущего consumer-domain потребуется дополнительный контракт, он
проектируется отдельным документом и ссылается на foundation из этого плана.
Foundation не должен заранее содержать payload или execution semantics такого
домена.

## Нормативные принципы

1. Catalog владеет Product shell, Product revisions,
   `ProductTypeDefinition` и effective product-owned data manifest.
2. Apps владеет App manifest snapshot, installation и исходным App
   contribution snapshot.
3. Catalog сохраняет собственную immutable копию нужных App facts. Между
   схемами `catalog` и `apps` нет foreign keys, joins или общей транзакции.
4. Один Product pin-ит ровно один primary product type.
5. `typeKey` — строковый namespaced key, а не расширяемый enum.
6. `typeKey` не содержит `storeId`, `installationId`, version или revision.
7. Native key имеет зарегистрированный service namespace. App key обязан иметь
   префикс `app.${appCode}.`.
8. Manifest, schema и configuration snapshots canonicalized до hashing.
9. Immutable content никогда не обновляется in-place.
10. Operational state хранится отдельно от immutable content revision.
11. Provider resource ID является opaque и не является authorization proof.
12. Любой provider-owned JSON имеет `schemaKey`, `schemaVersion` и
    `schemaHash`.
13. GraphQL schema статична и не меняется при установке App.
14. Raw action names, database locators, secrets и internal route metadata не
    публикуются через GraphQL.
15. Все tenant-owned строки имеют `store_id`; App provider data дополнительно
    scope-ится `installation_id`.
16. `store_id` не входит в primary key и foreign key в соответствии с правилами
    migrations проекта.
17. Все persisted UUID создаются как UUIDv7.
18. Новые контракты заменяют текущую модель напрямую: production-данных нет,
    поэтому backfill и compatibility path запрещены.

## Текущее состояние и разрыв

### Catalog

Сейчас:

- `services/catalog/src/repositories/models/products.ts` описывает mutable
  `catalog.product`;
- `catalog.product` не имеет `typeKey`, definition ref, provider ref,
  current/published revision pointers;
- common fields и relations обновляются относительно одного product ID;
- GraphQL `Product` не показывает тип, effective product manifest или provider
  state;
- `ProductCreateInput` не выбирает definition и не принимает versioned
  provider data;
- существующий `revision` является optimistic-lock counter, а не identity
  immutable snapshot.

Цель:

- `catalog.product` становится shell;
- immutable facts выносятся в `catalog.product_revision`;
- тип продукта задается exact `product_type_definition_revision_id`;
- provider data представляется только opaque versioned reference;
- GraphQL раскрывает platform fields, но не внутреннее устройство App storage.

### Apps

Сейчас:

- `packages/app-sdk/src/index.ts` поддерживает App manifest V1/V2;
- manifest содержит capabilities, permissions и GraphQL surfaces, но не
  product-type contributions;
- `apps.app_installation_manifest_snapshots` хранит весь manifest как JSONB;
- `apps.slots` содержит mutable route facts без отдельного product-type
  contribution snapshot;
- Apps GraphQL не показывает contributions и их schema descriptors.

Цель:

- перейти напрямую на App manifest V3;
- добавить декларативный `productTypes`;
- материализовать immutable contribution/schema/operation snapshots;
- публиковать безопасную read-only проекцию contributions в Apps Admin GraphQL;
- не создавать Catalog definitions из Apps GraphQL и не владеть ими в Apps DB.

## Целевая схема ownership

```text
App manifest V3
  └── AppProductTypeContributionV1
        ├── ProductTypeDataManifestV1
        ├── provider resource schema descriptors
        ├── provider operation descriptors
        └── UI extension references
                    │
                    │ immutable Apps snapshot
                    ▼
apps.app_product_type_contribution_snapshot
                    │
                    │ copied facts, no SQL FK
                    ▼
catalog.product_type_definition_revision
        ├── source contribution provenance
        ├── provider identity
        ├── product manifest snapshot/hash
        ├── configuration snapshot/hash
        └── effective product manifest snapshot/hash
                    │
                    │ exact revision pin
                    ▼
catalog.product_revision
        └── catalog.product_provider_resource_ref
```

## 1. Общий package контрактов

### 1.1 Package и dependency direction

Создать:

```text
packages/product-type-contracts/
  package.json
  tsconfig.json
  src/
    index.ts
    json.ts
    identity.ts
    feature-policy.ts
    manifest.ts
    schema-registry.ts
    provider.ts
    definition.ts
    product.ts
    app-contribution.ts
    errors.ts
```

Package должен содержать только:

- readonly TypeScript types;
- Zod schemas;
- constants и string patterns;
- canonical JSON types;
- pure canonicalization/hash input helpers;
- schema-level refinements.

Package не должен импортировать NestJS, broker, Drizzle, GraphQL, DBOS или
service code. Направление зависимостей:

```text
@shopana/product-type-contracts
  ↑              ↑               ↑
app-sdk     services/apps   services/catalog
```

`packages/broker-types` в этой фазе не становится владельцем product model.
Когда execution actions будут проектироваться отдельно, их envelopes могут
ссылаться на этот package.

### 1.2 Canonical JSON

Определить:

```ts
type ProductTypeJsonPrimitive = string | number | boolean | null;

type ProductTypeJsonValue =
  | ProductTypeJsonPrimitive
  | readonly ProductTypeJsonValue[]
  | { readonly [key: string]: ProductTypeJsonValue };

type VersionedDataEnvelopeV1 = Readonly<{
  schemaKey: string;
  schemaVersion: number;
  schemaHash: string;
  data: ProductTypeJsonValue;
}>;
```

Обязательные schema refinements:

- object keys сортируются lexicographically при canonicalization;
- `undefined`, `bigint`, `symbol`, functions, custom prototypes и cycles
  запрещены;
- `NaN`, `Infinity` и `-Infinity` запрещены;
- `schemaVersion` — positive safe integer;
- hash — lowercase SHA-256 hex длиной 64;
- byte/depth/property/array limits являются частью schema snapshot;
- hash вычисляется по canonical bytes, а не по исходному JSON text;
- digest не заменяет сохранение canonical snapshot.

### 1.3 Identity

Определить:

```ts
type ProductTypeKey = string;
type ProductTypeManifestVersion = string;
type ProductTypeSchemaKey = string;
type ProductTypeDigest = string;

type ProductTypeProviderRef =
  | Readonly<{
      kind: "NATIVE";
      service: string;
      providerKey: string;
    }>
  | Readonly<{
      kind: "APP";
      appCode: string;
      installationId: string;
      contributionSnapshotId: string;
      contributionHash: string;
    }>;
```

Validation rules:

- key pattern:
  `^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+$`;
- native owner регистрирует один неизменяемый namespace;
- App contribution key начинается с `app.${appCode}.`;
- `providerKey` стабилен и namespaced внутри service;
- App provider ref всегда pin-ит immutable contribution snapshot;
- `installationId` допустим только для `APP`;
- provider owner существующего `typeKey` нельзя заменить новой revision.

### 1.4 Feature policy

Определить discriminated union:

```ts
type DisabledFeature = Readonly<{
  state: "DISABLED";
}>;

type OptionalFeature = Readonly<{
  state: "OPTIONAL";
  defaultEnabled: boolean;
  merchantToggle: boolean;
}>;

type RequiredFeature = Readonly<{
  state: "REQUIRED";
}>;

type FeaturePolicy =
  | DisabledFeature
  | OptionalFeature
  | RequiredFeature;
```

Известный platform feature catalog V1:

```ts
type ProductFeatureManifestV1 = Readonly<{
  content: FeaturePolicy;
  media: ProductMediaFeaturePolicyV1;
  seo: FeaturePolicy;
  attributes: FeaturePolicy;
  options: FeaturePolicy;
  variants: ProductVariantsFeaturePolicyV1;
  categories: FeaturePolicy;
  tags: FeaturePolicy;
  physical: FeaturePolicy;
}>;
```

Хотя конкретная логика отдельных features не входит в план, product-owned
authoring shape должен быть полным. Возможности, принадлежащие другим
владельцам, не включаются в этот slice и позже композируются с ним без
расширения scope данного плана.

Specialized policies:

```ts
type ProductMediaFeaturePolicyV1 =
  | DisabledFeature
  | Readonly<{
      state: "OPTIONAL" | "REQUIRED";
      defaultEnabled?: boolean;
      merchantToggle?: boolean;
      minItems?: number;
      maxItems?: number;
      allowedKinds: readonly ("IMAGE" | "VIDEO" | "MODEL_3D")[];
    }>;

type ProductVariantsFeaturePolicyV1 =
  | Readonly<{ state: "DISABLED"; mode: "NONE" }>
  | Readonly<{
      state: "OPTIONAL" | "REQUIRED";
      mode: "SINGLE_HIDDEN" | "MULTIPLE";
      minimum?: number;
      maximum?: number;
    }>;

```

Контракт фиксирует только product authoring capability.

Platform refinements:

- `minItems >= 0`;
- `maxItems >= minItems`;
- `minimum >= 0`;
- `maximum >= minimum`;
- `DISABLED` не содержит optional configuration;
- `REQUIRED` нельзя ослабить effective configuration;
- неизвестные core feature keys отклоняются strict Zod object;
- provider-specific authoring data находится отдельно в versioned envelope, а
  не добавляет поля в core feature catalog.

### 1.5 Product-owned data manifest

В этой фазе вводится отдельный product-owned slice, а не сокращенная и
несовместимая версия полного `ProductTypeManifestV1` из исходного
архитектурного документа. Полный manifest позже композирует этот slice с
контрактами других владельцев; данный план их не определяет.

```ts
type ProductTypeDataManifestV1 = Readonly<{
  schemaVersion: 1;

  identity: Readonly<{
    typeKey: ProductTypeKey;
    manifestVersion: string;
    displayName: string;
    description?: string;
  }>;

  authoring: Readonly<{
    features: ProductFeatureManifestV1;
    providerData?: ProductTypeSchemaDescriptorV1;
    adminData?: ProductTypeSchemaDescriptorV1;
    publicationProjection?: ProductTypeSchemaDescriptorV1;
  }>;

  extensions: Readonly<{
    productValidation: boolean;
    adminSections: readonly ProductTypeUiExtensionRefV1[];
    storefrontSections: readonly ProductTypeUiExtensionRefV1[];
  }>;

  presentation?: Readonly<{
    icon?: string;
    badge?: string;
  }>;
}>;
```

`ProductTypeUiExtensionRefV1`:

```ts
type ProductTypeUiExtensionRefV1 = Readonly<{
  extensionKey: string;
  surface: "ADMIN_PRODUCT" | "STOREFRONT_PRODUCT";
  assetDigest: string;
  fallback: "HIDE" | "READ_ONLY_DATA";
}>;
```

Важно:

- в manifest нет executable code;
- UI ref не является URL или dynamic import path;
- `providerData`, `adminData` и `publicationProjection` — descriptors, не
  payload;
- schema hash pin-ится в каждой immutable revision;
- provider-specific configuration не смешивается с core feature policies;
- effective product manifest имеет тот же shape и собственный hash;
- merchant override может только сузить manifest.

### 1.6 Schema registry contract

```ts
type ProductTypeSchemaKind =
  | "PROVIDER_RESOURCE"
  | "PROVIDER_ADMIN_DATA"
  | "PUBLICATION_PROJECTION"
  | "DEFINITION_CONFIGURATION";

type ProductTypeSchemaLimitsV1 = Readonly<{
  maxBytes: number;
  maxDepth: number;
  maxProperties: number;
  maxArrayItems: number;
}>;

type ProductTypeSchemaDescriptorV1 = Readonly<{
  schemaKey: ProductTypeSchemaKey;
  schemaVersion: number;
  schemaHash: ProductTypeDigest;
  kind: ProductTypeSchemaKind;
}>;

type ProductTypeSchemaSnapshotV1 = Readonly<{
  descriptor: ProductTypeSchemaDescriptorV1;
  owner: Readonly<{
    kind: "PLATFORM" | "NATIVE" | "APP";
    key: string;
  }>;
  canonicalSchema: ProductTypeJsonValue;
  limits: ProductTypeSchemaLimitsV1;
}>;
```

Uniqueness invariant:

```text
(schemaKey, schemaVersion) -> exactly one schemaHash
```

Повторная регистрация другого content под существующей парой запрещена.

### 1.7 Definition contracts

```ts
type ProductTypeDefinitionRevision = Readonly<{
  id: string;
  definitionId: string;
  revision: number;
  storeId: string;

  typeKey: ProductTypeKey;
  provider: ProductTypeProviderRef;

  productManifestVersion: string;
  productManifestHash: string;
  productManifest: ProductTypeDataManifestV1;

  configurationRevision: number;
  configuration: VersionedDataEnvelopeV1;
  configurationHash: string;

  effectiveProductManifest: ProductTypeDataManifestV1;
  effectiveProductManifestHash: string;

  source: ProductTypeDefinitionSourceV1;
  createdAt: string;
}>;

type ProductTypeDefinitionSourceV1 =
  | Readonly<{
      kind: "NATIVE";
      contributionKey: string;
      contributionHash: string;
    }>
  | Readonly<{
      kind: "APP";
      appCode: string;
      installationId: string;
      appVersion: string;
      contributionKey: string;
      manifestSnapshotId: string;
      manifestHash: string;
      contributionSnapshotId: string;
      contributionHash: string;
    }>;

type ProductTypeDefinitionStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "RETIRED";

type ProductTypeDefinitionStatusReason =
  | "NONE"
  | "APP_SUSPENDED"
  | "APP_UNINSTALLED"
  | "PROVIDER_RETIRED"
  | "MANUALLY_SUSPENDED";
```

Definition revision является self-contained Catalog fact. Чтение revision не
требует обращения к Apps.

### 1.8 Product contracts

```ts
type ProductTypeRef = Readonly<{
  definitionId: string;
  definitionRevisionId: string;
  definitionRevision: number;
  typeKey: ProductTypeKey;
  effectiveProductManifestHash: string;
}>;

type ProviderProductResourceRef = Readonly<{
  provider: ProductTypeProviderRef;
  resourceId: string;
  resourceRevision: string;
  schemaKey: string;
  schemaVersion: number;
  schemaHash: string;
  snapshotDigest: string;
}>;

type ProductProviderState =
  | "PENDING_PROVIDER"
  | "READY"
  | "PROVIDER_SETUP_FAILED";

type ProductMerchantStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";

type ProductProviderAvailability =
  | "AVAILABLE"
  | "SUSPENDED"
  | "UNINSTALLED"
  | "RESOURCE_MISSING"
  | "CONFIGURATION_INVALID";

type ProductEffectiveAvailability =
  | "AVAILABLE"
  | "NOT_PUBLISHED"
  | "ARCHIVED"
  | "PROVIDER_UNAVAILABLE";
```

Product revision:

```ts
type ProductRevisionV1 = Readonly<{
  id: string;
  productId: string;
  revision: number;
  storeId: string;
  type: ProductTypeRef;
  providerState: ProductProviderState;
  providerResource: ProviderProductResourceRef | null;
  commonData: VersionedDataEnvelopeV1;
  commonDataHash: string;
  createdAt: string;
}>;
```

`commonData` — platform-owned versioned snapshot common product authoring data.
В этой фазе он заменяет попытку детально ревизионировать каждую существующую
child table. Отдельный план может нормализовать конкретную feature data, но
immutable Product revision всегда pin-ит canonical common snapshot.

Invariants:

- `providerResource = null` только для `PENDING_PROVIDER` и
  `PROVIDER_SETUP_FAILED`;
- `READY` всегда имеет resource ref;
- provider identity в resource ref равна provider identity definition
  revision;
- schema descriptor resource ref зарегистрирован в definition;
- `snapshotDigest` и все hashes имеют SHA-256 format;
- Product revision не меняется in-place;
- type нельзя менять обычным product update contract;
- `publishedRevisionId` указывает только на revision того же Product;
- `PUBLISHED` требует non-null published revision;
- `ARCHIVED` не стирает revisions.

### 1.9 Provider operation descriptors

Для Apps contribution определить только декларативные descriptors:

```ts
type ProductProviderOperation =
  | "CREATE"
  | "UPDATE"
  | "VALIDATE"
  | "READ_FOR_ADMIN"
  | "TOMBSTONE";

type ProductProviderOperationDescriptorV1 = Readonly<{
  operation: ProductProviderOperation;
  operationContract:
    | "productProvider.resource.create.v1"
    | "productProvider.resource.update.v1"
    | "productProvider.resource.validate.v1"
    | "productProvider.resource.readForAdmin.v1"
    | "productProvider.resource.tombstone.v1";
  action: string;
  inputSchema: ProductTypeSchemaDescriptorV1;
  outputSchema: ProductTypeSchemaDescriptorV1;
}>;
```

Это только registration contract. В плане отсутствуют handler signatures,
invocation envelope, retries, idempotency implementation и вызов action.

Обязательные manifest-level rules:

- ровно одна descriptor для каждой из пяти operations;
- duplicate operation/action запрещен;
- action non-empty и принадлежит App manifest;
- schema kind соответствует operation;
- raw action не копируется в Catalog GraphQL;
- общий `DELETE` contract отсутствует.

### 1.10 Stable error codes

Контрактный enum/string union:

```text
PRODUCT_TYPE_KEY_INVALID
PRODUCT_TYPE_NAMESPACE_MISMATCH
PRODUCT_TYPE_MANIFEST_INVALID
PRODUCT_TYPE_MANIFEST_HASH_MISMATCH
PRODUCT_TYPE_SCHEMA_CONFLICT
PRODUCT_TYPE_SCHEMA_HASH_MISMATCH
PRODUCT_TYPE_DEFINITION_NOT_FOUND
PRODUCT_TYPE_DEFINITION_REVISION_MISMATCH
PRODUCT_TYPE_DEFINITION_SUSPENDED
PRODUCT_TYPE_DEFINITION_RETIRED
PRODUCT_TYPE_PROVIDER_UNAVAILABLE
PRODUCT_PROVIDER_RESOURCE_MISSING
PRODUCT_PROVIDER_RESOURCE_SCHEMA_MISMATCH
PRODUCT_PROVIDER_RESOURCE_REVISION_MISMATCH
PRODUCT_TYPE_CONTRIBUTION_NOT_FOUND
PRODUCT_TYPE_CONTRIBUTION_HASH_MISMATCH
PRODUCT_TYPE_CONFIGURATION_INVALID
```

Errors фиксируются как platform vocabulary. Маппинг на конкретные payloads и
логика возникновения не входят в scope.

## 2. App manifest V3

### 2.1 Cutover manifest schema

В `packages/app-sdk/src/index.ts`:

- удалить V1/V2 из public discriminated union;
- ввести `AppManifestV3Schema`;
- обновить `defineAppManifest` на V3;
- обновить все bundled `apps/*/app.manifest.ts` на `schemaVersion: 3`;
- для Apps без product types использовать `productTypes: []`;
- compatibility parsing старых manifest не добавлять.

Shape:

```ts
type AppManifestV3 = Readonly<{
  schemaVersion: 3;
  code: string;
  version: string;
  displayName: string;
  description: string;
  icon: AppIcon;
  lifecycle: AppLifecycle;
  permissions: readonly string[];
  capabilities: readonly AppCapability[];
  graphql: AppGraphQLManifest;
  productTypes: readonly AppProductTypeContributionV1[];
}>;
```

### 2.2 App contribution

```ts
type AppProductTypeContributionV1 = Readonly<{
  schemaVersion: 1;
  contributionKey: string;
  typeKey: ProductTypeKey;
  productManifest: ProductTypeDataManifestV1;
  schemas: readonly ProductTypeSchemaSnapshotV1[];
  providerOperations: readonly ProductProviderOperationDescriptorV1[];
}>;
```

Rules:

- `contributionKey` стабилен внутри `appCode`;
- `typeKey` начинается с `app.${appCode}.`;
- `manifest.identity.typeKey === contribution.typeKey`;
- все descriptors manifest разрешаются в `schemas`;
- schema owner равен `APP:${appCode}`;
- schema keys имеют App namespace;
- contribution canonicalized и получает отдельный contribution hash;
- App version может объявить новую immutable contribution snapshot;
- существующий snapshot не переписывается;
- secrets, installation configuration и runtime status отсутствуют в
  contribution.

## 3. Apps database platform

### 3.1 Migration placement

Добавить handwritten migrations:

```text
services/apps/migrations/domains/0400_product_types/
  0400_product_types__contribution_snapshots.sql
  0401_product_types__schema_snapshots.sql
  0402_product_types__operation_snapshots.sql
```

Обновить Drizzle models:

```text
services/apps/src/repositories/models/
  appProductTypeContributions.ts
  appProductTypeSchemas.ts
  appProductTypeOperations.ts
  index.ts
```

Migrations и Drizzle models должны описывать один и тот же target schema.

### 3.2 `apps.app_product_type_contribution_snapshot`

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 immutable snapshot ID |
| `installation_id` | `uuid` | no | FK на App installation |
| `manifest_snapshot_id` | `uuid` | no | FK на immutable installation manifest snapshot |
| `store_id` | `uuid` | no | tenant scope |
| `app_code` | `varchar(128)` | no | stable App owner |
| `app_version` | `varchar(64)` | no | version, объявившая snapshot |
| `contribution_key` | `varchar(128)` | no | stable key внутри App |
| `type_key` | `varchar(255)` | no | global namespaced product type |
| `product_manifest_version` | `varchar(64)` | no | product-owned manifest version |
| `product_manifest_hash` | `varchar(64)` | no | canonical product-owned manifest hash |
| `product_manifest_snapshot` | `jsonb` | no | canonical product-owned manifest |
| `contribution_hash` | `varchar(64)` | no | hash всего contribution |
| `contribution_snapshot` | `jsonb` | no | canonical self-contained contribution |
| `created_at` | `timestamptz` | no | immutable creation time |

Constraints:

- PK `id`;
- FK только по `installation_id` и `manifest_snapshot_id`;
- unique
  `(installation_id, app_version, contribution_key, contribution_hash)`;
- unique `(manifest_snapshot_id, type_key)`;
- check non-empty keys;
- check hash format;
- index `(store_id, type_key, created_at DESC)`;
- index `(installation_id, contribution_key, created_at DESC)`;
- `store_id` не участвует в PK/FK.

После insert content columns не обновляются.

### 3.3 `apps.app_product_type_schema_snapshot`

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 |
| `contribution_snapshot_id` | `uuid` | no | owning contribution FK |
| `schema_key` | `varchar(255)` | no | namespaced key |
| `schema_version` | `integer` | no | positive immutable version |
| `schema_hash` | `varchar(64)` | no | canonical hash |
| `schema_kind` | enum | no | provider/admin/projection/configuration |
| `canonical_schema` | `jsonb` | no | canonical JSON Schema/Zod-compatible document |
| `limits` | `jsonb` | no | versioned limits snapshot |
| `created_at` | `timestamptz` | no | creation time |

Constraints:

- PK `id`;
- FK `contribution_snapshot_id`;
- unique `(schema_key, schema_version)`;
- unique `(contribution_snapshot_id, schema_kind, schema_key, schema_version)`;
- check `schema_version > 0`;
- check hash format;
- index `(contribution_snapshot_id, schema_kind)`.

Если одинаковый schema key/version нужен новой App version, он обязан иметь тот
же hash. Для другого content создается новая schema version.

### 3.4 `apps.app_product_type_operation_snapshot`

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 |
| `contribution_snapshot_id` | `uuid` | no | contribution FK |
| `operation` | enum | no | CREATE/UPDATE/VALIDATE/READ_FOR_ADMIN/TOMBSTONE |
| `operation_contract` | `varchar(128)` | no | platform contract name |
| `capability` | `varchar(128)` | no | fixed product-provider capability |
| `action` | `varchar(128)` | no | internal App action |
| `input_schema_snapshot_id` | `uuid` | no | schema FK |
| `output_schema_snapshot_id` | `uuid` | no | schema FK |
| `created_at` | `timestamptz` | no | creation time |

Constraints:

- PK `id`;
- unique `(contribution_snapshot_id, operation)`;
- unique `(contribution_snapshot_id, operation_contract)`;
- all three FKs point to immutable Apps rows;
- `capability` имеет фиксированное значение
  `catalog.product-type-provider`;
- action не пустой;
- ровно пять required operations проверяются App manifest Zod schema; SQL
  обеспечивает uniqueness, но не count.

Эта таблица не заменяет общий route registry. Она является immutable
declaration snapshot. Runtime binding к route проектируется отдельно.

### 3.5 Связь с существующими Apps tables

- `app_installation_manifest_snapshots.manifest` остается полным source
  snapshot;
- product contribution rows являются normalized immutable projection этого
  snapshot;
- `app_installations.configuration` не копируется в contribution;
- secrets не появляются ни в одной product-type таблице;
- `apps.slots` не получает product configuration;
- `slot_assignments` не становится владельцем Catalog definition;
- uninstall не каскадно удаляет contribution snapshots, на которые может
  ссылаться Catalog provenance.

Для последнего пункта заменить destructive `ON DELETE CASCADE` там, где он
может удалить required immutable manifest facts, на retention-safe policy
отдельным migration решением. Физическое удаление installation не является
частью обычного lifecycle.

## 4. Catalog database platform

### 4.1 Migration placement

Добавить:

```text
services/catalog/migrations/domains/0150_product_types/
  0150_product_types__schema_registry.sql
  0151_product_types__definitions.sql
  0152_product_types__definition_states.sql
  0153_product_types__product_revisions.sql
  0154_product_types__provider_resources.sql
  0155_product_types__availability_projection.sql
```

Обновить:

```text
services/catalog/src/repositories/models/
  productTypeSchemas.ts
  productTypeDefinitions.ts
  productTypeDefinitionStates.ts
  productRevisions.ts
  productProviderResources.ts
  productProviderAvailability.ts
  products.ts
  index.ts
```

Также обновить model-derived schema documentation Catalog в
`services/catalog/docs/`,
поскольку это обязательное правило handwritten Catalog migrations.

### 4.2 `catalog.product_type_schema_snapshot`

Catalog хранит собственный validated snapshot независимо от Apps DB.

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 |
| `schema_key` | `varchar(255)` | no | global namespaced key |
| `schema_version` | `integer` | no | positive version |
| `schema_hash` | `varchar(64)` | no | canonical hash |
| `schema_kind` | enum | no | schema kind |
| `owner_kind` | enum | no | PLATFORM/NATIVE/APP |
| `owner_key` | `varchar(255)` | no | service namespace или appCode |
| `canonical_schema` | `jsonb` | no | immutable canonical schema |
| `limits` | `jsonb` | no | immutable limits |
| `source_snapshot_id` | `uuid` | yes | opaque Apps snapshot UUID, без FK |
| `source_hash` | `varchar(64)` | yes | provenance hash |
| `created_at` | `timestamptz` | no | creation time |

Constraints:

- PK `id`;
- unique `(schema_key, schema_version)`;
- check positive version и hash format;
- APP требует source snapshot/hash;
- PLATFORM/NATIVE не имеют Apps source;
- owner key должен соответствовать namespace schema key;
- index `(owner_kind, owner_key, schema_kind)`.

### 4.3 `catalog.product_type_definition`

Stable identity definition:

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 definition ID |
| `store_id` | `uuid` | no | tenant scope |
| `type_key` | `varchar(255)` | no | stable namespaced key |
| `created_at` | `timestamptz` | no | creation |

Constraints:

- PK `id`;
- unique `(store_id, type_key)`;
- index `(store_id, created_at)`;
- type key pattern check.

Definition identity не содержит mutable `currentRevision`. Current revision
разрешается отдельным pointer, чтобы immutable history не смешивалась с shell.

### 4.4 `catalog.product_type_definition_revision`

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 revision ID |
| `definition_id` | `uuid` | no | FK на definition |
| `store_id` | `uuid` | no | duplicated tenant scope |
| `revision` | `integer` | no | monotonic revision |
| `type_key` | `varchar(255)` | no | pinned key |
| `provider_kind` | enum | no | NATIVE/APP |
| `native_service` | `varchar(128)` | yes | native owner |
| `native_provider_key` | `varchar(255)` | yes | native provider |
| `app_code` | `varchar(128)` | yes | App owner |
| `installation_id` | `uuid` | yes | opaque Apps ID, no FK |
| `contribution_key` | `varchar(128)` | no | stable native/App contribution key |
| `contribution_snapshot_id` | `uuid` | yes | opaque Apps snapshot ID, no FK |
| `contribution_hash` | `varchar(64)` | no | source/native contribution hash |
| `app_version` | `varchar(64)` | yes | source App version |
| `app_manifest_snapshot_id` | `uuid` | yes | opaque Apps snapshot ID |
| `app_manifest_hash` | `varchar(64)` | yes | source App manifest hash |
| `product_manifest_version` | `varchar(64)` | no | product-owned data manifest version |
| `product_manifest_hash` | `varchar(64)` | no | product-owned data manifest hash |
| `product_manifest_snapshot` | `jsonb` | no | immutable product-owned data manifest |
| `configuration_revision` | `integer` | no | provenance revision |
| `configuration_schema_snapshot_id` | `uuid` | no | Catalog schema FK |
| `configuration_snapshot` | `jsonb` | no | canonical non-secret config |
| `configuration_hash` | `varchar(64)` | no | config hash |
| `effective_product_manifest_snapshot` | `jsonb` | no | narrowed product-owned manifest |
| `effective_product_manifest_hash` | `varchar(64)` | no | effective product manifest hash |
| `created_at` | `timestamptz` | no | creation time |

Constraints:

- PK `id`;
- FK `definition_id`;
- FK `configuration_schema_snapshot_id`;
- unique `(definition_id, revision)`;
- check `revision > 0`, `configuration_revision > 0`;
- NATIVE требует native columns и запрещает App columns;
- APP требует App provenance columns и запрещает native columns;
- all hash format checks;
- index `(store_id, type_key, revision DESC)`;
- index `(installation_id, app_code)` where provider APP;
- index `(contribution_snapshot_id)` where non-null.

Immutable trigger или repository contract должен запрещать `UPDATE`/`DELETE`
content rows. Сам enforcement mechanism фиксируется DB-level migration, без
реализации domain logic в этой фазе.

### 4.5 `catalog.product_type_definition_current`

Pointer:

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `definition_id` | `uuid` | no | PK/FK stable identity |
| `definition_revision_id` | `uuid` | no | unique FK exact revision |
| `updated_at` | `timestamptz` | no | pointer change time |

Constraints:

- PK `definition_id`;
- unique `definition_revision_id`;
- обе FK не содержат `store_id`;
- revision должна принадлежать definition; это обеспечивается дополнительным
  unique `(id, definition_id)` на revision и composite FK без `store_id`.

Pointer mutable; target revision immutable.

### 4.6 Definition operational state

Текущий state:

`catalog.product_type_definition_state`

| Column | Type | Null |
|---|---|---:|
| `definition_revision_id` | `uuid` PK/FK | no |
| `store_id` | `uuid` | no |
| `status` | enum ACTIVE/SUSPENDED/RETIRED | no |
| `status_revision` | `integer` | no |
| `status_reason` | enum | no |
| `changed_at` | `timestamptz` | no |

История:

`catalog.product_type_definition_state_transition`

| Column | Type | Null |
|---|---|---:|
| `id` | `uuid` PK | no |
| `definition_revision_id` | `uuid` FK | no |
| `store_id` | `uuid` | no |
| `status_revision` | `integer` | no |
| `from_status` | enum | yes |
| `to_status` | enum | no |
| `reason` | enum | no |
| `operation_id` | `varchar(255)` | no |
| `changed_at` | `timestamptz` | no |

Constraints:

- unique `(definition_revision_id, status_revision)`;
- `status_revision > 0`;
- unique `(definition_revision_id, operation_id)` для idempotent provenance;
- `RETIRED` terminal invariant фиксируется как contract; transition logic
  реализуется позже;
- state update не создает новую content revision.

### 4.7 Greenfield replacement `catalog.product`

Целевой shell:

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | existing Product UUIDv7 identity |
| `store_id` | `uuid` | no | tenant scope |
| `merchant_status` | enum | no | DRAFT/PUBLISHED/ARCHIVED |
| `current_revision_id` | `uuid` | no | exact editable revision pointer |
| `published_revision_id` | `uuid` | yes | exact visible revision pointer |
| `created_at` | `timestamptz` | no | creation |
| `updated_at` | `timestamptz` | no | shell pointer/status change |

Удалить из shell как authoritative content:

- `vendor_id`;
- `handle`;
- `published_at`;
- `deleted_at`;
- optimistic-lock `revision`.

Они либо входят в versioned common data, либо являются derived projection.
Soft-delete заменяется `ARCHIVED`; physical delete не проектируется.

Constraints:

- PK `id`;
- unique `(store_id, id)` допустим как tenant lookup constraint, но не FK;
- index `(store_id, merchant_status, updated_at DESC)`;
- check `PUBLISHED -> published_revision_id IS NOT NULL`;
- current/published revision обязаны принадлежать тому же Product через
  `(revision_id, product_id)` FK pair без `store_id`;
- circular FKs добавляются deferrable после создания revision table.

### 4.8 `catalog.product_revision`

| Column | Type | Null | Назначение |
|---|---|---:|---|
| `id` | `uuid` | no | UUIDv7 revision identity |
| `product_id` | `uuid` | no | Product FK |
| `store_id` | `uuid` | no | tenant scope |
| `revision` | `integer` | no | monotonic per Product |
| `definition_revision_id` | `uuid` | no | exact type definition FK |
| `type_key` | `varchar(255)` | no | denormalized pinned key |
| `effective_product_manifest_hash` | `varchar(64)` | no | pinned effective product manifest |
| `provider_state` | enum | no | pending/ready/failed |
| `common_data_schema_snapshot_id` | `uuid` | no | Catalog schema FK |
| `common_data_snapshot` | `jsonb` | no | canonical common data |
| `common_data_hash` | `varchar(64)` | no | snapshot hash |
| `created_at` | `timestamptz` | no | creation |

Constraints:

- PK `id`;
- FK `product_id`, `definition_revision_id`,
  `common_data_schema_snapshot_id`;
- unique `(product_id, revision)`;
- unique `(id, product_id)` для pointer FK;
- check `revision > 0`;
- hash checks;
- index `(store_id, type_key, created_at DESC)`;
- index `(definition_revision_id, product_id)`;
- immutable content.

`type_key` и `effective_product_manifest_hash` денормализованы намеренно: revision
самодостаточна для audit/read и может проверить целостность pinned definition.

### 4.9 `catalog.product_provider_resource_ref`

| Column | Type | Null |
|---|---|---:|
| `id` | `uuid` PK | no |
| `product_revision_id` | `uuid` unique FK | no |
| `store_id` | `uuid` | no |
| `provider_kind` | enum | no |
| `native_service` | `varchar(128)` | yes |
| `native_provider_key` | `varchar(255)` | yes |
| `app_code` | `varchar(128)` | yes |
| `installation_id` | `uuid` | yes |
| `contribution_snapshot_id` | `uuid` | yes |
| `contribution_hash` | `varchar(64)` | yes |
| `resource_id` | `varchar(512)` | no |
| `resource_revision` | `varchar(255)` | no |
| `schema_snapshot_id` | `uuid` FK | no |
| `schema_key` | `varchar(255)` | no |
| `schema_version` | `integer` | no |
| `schema_hash` | `varchar(64)` | no |
| `snapshot_digest` | `varchar(64)` | no |
| `created_at` | `timestamptz` | no |

Constraints:

- at most one ref per Product revision;
- provider discriminated checks аналогичны definition revision;
- resource ID non-empty и никогда не parsed Catalog;
- App ref всегда имеет installation/contribution provenance;
- schema columns обязаны совпадать с `schema_snapshot_id`;
- unique provider resource revision:
  `(provider_kind, installation_id, resource_id, resource_revision,
  snapshot_digest)` для App и отдельный native equivalent;
- index `(store_id, product_revision_id)`;
- no cross-schema FK;
- no physical locator column;
- immutable row.

Для `PENDING_PROVIDER`/`PROVIDER_SETUP_FAILED` строки нет. Для `READY` строка
обязательна; cross-table invariant фиксируется contract acceptance и
реализуется позже в transaction boundary.

### 4.10 Provider projection envelope

Добавить optional
`catalog.product_provider_publication_projection`:

| Column | Type | Null |
|---|---|---:|
| `id` | `uuid` PK | no |
| `product_revision_id` | `uuid` unique FK | no |
| `store_id` | `uuid` | no |
| `schema_snapshot_id` | `uuid` FK | no |
| `schema_key` | `varchar(255)` | no |
| `schema_version` | `integer` | no |
| `schema_hash` | `varchar(64)` | no |
| `projection` | `jsonb` | no |
| `projection_hash` | `varchar(64)` | no |
| `created_at` | `timestamptz` | no |

Это ограниченная immutable projection, а не source of truth provider aggregate.
Наличие произвольного поля не делает его автоматически filterable/sortable.

### 4.11 Provider availability projection

`catalog.product_provider_availability`:

| Column | Type | Null |
|---|---|---:|
| `product_id` | `uuid` PK/FK | no |
| `store_id` | `uuid` | no |
| `definition_revision_id` | `uuid` FK | no |
| `definition_status_revision` | `integer` | no |
| `installation_id` | `uuid` | yes |
| `provider_availability` | enum | no |
| `effective_availability` | enum | no |
| `reason_code` | `varchar(128)` | yes |
| `projected_at` | `timestamptz` | no |

Projection:

- является read model, а не source of truth;
- может быть пересобрана из Catalog facts и полученного Apps state snapshot;
- не изменяет `merchant_status`;
- не хранит secrets или provider payload;
- index `(store_id, effective_availability, product_id)`;
- index `(installation_id, provider_availability)` where installation non-null.

Механизм обновления projection не входит в этот план.

## 5. Catalog Admin GraphQL contract

### 5.1 File layout

Добавить:

```text
services/catalog/src/api/graphql-admin/schema/
  product-type.graphql
  product-type-manifest.graphql
  product-type-provider.graphql
```

Обновить:

```text
services/catalog/src/api/graphql-admin/schema/base.graphql
services/catalog/src/api/graphql-admin/schema/product.graphql
packages/shared-graphql-guid/src/.../GlobalIdEntity
```

Новые Node identities:

- `ProductTypeDefinition`;
- при необходимости отдельный ID для definition revision наружу не вводить:
  revision доступна как nested object и адресуется definition ID + Int.

### 5.2 Общие enums

```graphql
enum ProductFeaturePolicyState {
  DISABLED
  OPTIONAL
  REQUIRED
}

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

enum ProductProviderState {
  PENDING_PROVIDER
  READY
  PROVIDER_SETUP_FAILED
}

enum ProductProviderAvailability {
  AVAILABLE
  SUSPENDED
  UNINSTALLED
  RESOURCE_MISSING
  CONFIGURATION_INVALID
}

enum ProductMerchantStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ProductEffectiveAvailability {
  AVAILABLE
  NOT_PUBLISHED
  ARCHIVED
  PROVIDER_UNAVAILABLE
}

enum ProductTypeSchemaKind {
  PROVIDER_RESOURCE
  PROVIDER_ADMIN_DATA
  PUBLICATION_PROJECTION
  DEFINITION_CONFIGURATION
}
```

### 5.3 Versioned data and schema descriptors

```graphql
type ProductTypeSchemaDescriptor {
  key: String!
  version: Int!
  hash: String!
  kind: ProductTypeSchemaKind!
}

type VersionedProductTypeData {
  schema: ProductTypeSchemaDescriptor!
  data: JSON!
  digest: String!
}
```

`canonicalSchema`, limits и raw registry internals доступны только в Admin и
только если действительно нужны editor tooling. По умолчанию GraphQL публикует
descriptor, не полный validation schema.

### 5.4 Typed feature manifest

Не возвращать весь effective product manifest только как untyped JSON. Core policies
должны быть typed:

```graphql
type ProductFeaturePolicy {
  state: ProductFeaturePolicyState!
  defaultEnabled: Boolean
  merchantToggle: Boolean
}

type ProductMediaFeaturePolicy {
  state: ProductFeaturePolicyState!
  defaultEnabled: Boolean
  merchantToggle: Boolean
  minItems: Int
  maxItems: Int
  allowedKinds: [ProductMediaKind!]!
}

type ProductVariantsFeaturePolicy {
  state: ProductFeaturePolicyState!
  mode: ProductVariantsMode!
  minimum: Int
  maximum: Int
}

type ProductFeatureManifest {
  content: ProductFeaturePolicy!
  media: ProductMediaFeaturePolicy!
  seo: ProductFeaturePolicy!
  attributes: ProductFeaturePolicy!
  options: ProductFeaturePolicy!
  variants: ProductVariantsFeaturePolicy!
  categories: ProductFeaturePolicy!
  tags: ProductFeaturePolicy!
  physical: ProductFeaturePolicy!
}
```

Presentation:

```graphql
enum ProductTypeUiSurface {
  ADMIN_PRODUCT
  STOREFRONT_PRODUCT
}

enum ProductTypeUiFallback {
  HIDE
  READ_ONLY_DATA
}

type ProductTypeUiExtension {
  key: String!
  surface: ProductTypeUiSurface!
  assetDigest: String!
  fallback: ProductTypeUiFallback!
}

type ProductTypeDataManifest {
  schemaVersion: Int!
  key: String!
  version: String!
  displayName: String!
  description: String
  features: ProductFeatureManifest!
  providerDataSchema: ProductTypeSchemaDescriptor
  adminDataSchema: ProductTypeSchemaDescriptor
  publicationProjectionSchema: ProductTypeSchemaDescriptor
  productValidationEnabled: Boolean!
  adminSections: [ProductTypeUiExtension!]!
  storefrontSections: [ProductTypeUiExtension!]!
  icon: String
  badge: String
  hash: String!
}
```

### 5.5 Provider summary

```graphql
type ProductTypeProvider {
  kind: ProductTypeProviderKind!
  ownerKey: String!
  appCode: String
  installationId: ID
  contributionSnapshotId: ID
  contributionHash: String
  available: Boolean!
}

type ProviderProductResource {
  state: ProductProviderState!
  resourceRevision: String
  schema: ProductTypeSchemaDescriptor
  snapshotDigest: String
  adminData: VersionedProductTypeData
}
```

Не публиковать:

- `resourceId`;
- native action;
- App action;
- capability route ID;
- database schema/table;
- secret refs;
- external URL/credentials.

`adminData` является validated provider-returned envelope. Его получение не
реализуется в этой фазе; поле и nullability фиксируются заранее.

### 5.6 Definition types

```graphql
type ProductTypeDefinition implements Node @key(fields: "id") {
  id: ID!
  key: String!
  currentRevision: ProductTypeDefinitionRevision!
  status: ProductTypeDefinitionStatus!
  statusReason: ProductTypeDefinitionStatusReason!
  statusRevision: Int!
  createdAt: DateTime!
}

type ProductTypeDefinitionRevision {
  revision: Int!
  provider: ProductTypeProvider!
  productManifest: ProductTypeDataManifest!
  effectiveProductManifest: ProductTypeDataManifest!
  configuration: VersionedProductTypeData!
  source: ProductTypeDefinitionSource!
  createdAt: DateTime!
}

type ProductTypeDefinitionSource {
  kind: ProductTypeProviderKind!
  contributionKey: String
  contributionHash: String!
  appCode: String
  appVersion: String
  manifestHash: String
}
```

Source скрывает internal snapshot IDs, если они не нужны Admin tooling.

### 5.7 Query contract

Расширить `CatalogQuery`:

```graphql
type CatalogQuery {
  productTypeDefinition(id: ID!): ProductTypeDefinition

  productTypeDefinitionByKey(
    key: String!
  ): ProductTypeDefinition

  productTypeDefinitions(
    first: Int
    after: String
    last: Int
    before: String
    where: ProductTypeDefinitionWhereInput
    orderBy: [ProductTypeDefinitionOrderByInput!]
  ): ProductTypeDefinitionConnection!
}
```

Filters V1:

- `key`;
- `providerKind`;
- `appCode`;
- `status`;
- `createdAt`.

Не добавлять filter по arbitrary provider JSON.

### 5.8 Mutation schema contracts

В этой фазе фиксируется SDL, но resolver/service logic не реализуется.

```graphql
input ProductTypeDefinitionSourceInput {
  nativeContributionKey: String
  appContributionSnapshotId: ID
}

input VersionedProductTypeDataInput {
  schemaKey: String!
  schemaVersion: Int!
  schemaHash: String!
  data: JSON!
}

input ProductTypeDefinitionCreateInput {
  source: ProductTypeDefinitionSourceInput!
  configuration: VersionedProductTypeDataInput!
  clientMutationId: String!
}

input ProductTypeDefinitionReviseInput {
  definitionId: ID!
  expectedRevision: Int!
  expectedManifestHash: String!
  configuration: VersionedProductTypeDataInput!
  clientMutationId: String!
}

input ProductTypeDefinitionStatusSetInput {
  definitionId: ID!
  expectedDefinitionRevision: Int!
  expectedStatusRevision: Int!
  status: ProductTypeDefinitionStatus!
  clientMutationId: String!
}

type ProductTypeDefinitionPayload {
  definition: ProductTypeDefinition
  userErrors: [GenericUserError!]!
}
```

Добавить в `CatalogMutation`:

```graphql
productTypeDefinitionCreate(
  input: ProductTypeDefinitionCreateInput!
): ProductTypeDefinitionPayload!

productTypeDefinitionRevise(
  input: ProductTypeDefinitionReviseInput!
): ProductTypeDefinitionPayload!

productTypeDefinitionStatusSet(
  input: ProductTypeDefinitionStatusSetInput!
): ProductTypeDefinitionPayload!
```

GraphQL не принимает `storeId`; tenant берется только из request context.

`ProductTypeDefinitionSourceInput` требует exactly one source field. Пока в
schema проекта нет `@oneOf`, это фиксируется description и будущей Zod
refinement.

### 5.9 Изменение Product SDL

Добавить:

```graphql
type ProductTypeRef {
  definition: ProductTypeDefinition!
  definitionRevision: Int!
  key: String!
  effectiveProductManifestHash: String!
}

extend type Product {
  type: ProductTypeRef!
  merchantStatus: ProductMerchantStatus!
  effectiveAvailability: ProductEffectiveAvailability!
  providerResource: ProviderProductResource!
  currentRevision: Int!
  publishedRevision: Int
}
```

Изменить create input:

```graphql
input ProductTypeSelectionInput {
  definitionId: ID!
  definitionRevision: Int!
  providerData: VersionedProductTypeDataInput
}

input ProductCreateInput {
  type: ProductTypeSelectionInput!
  # existing common product authoring fields remain here
}
```

Обычный `ProductUpdateInput`:

- не содержит `typeKey`;
- не содержит definition ID/revision;
- не принимает raw provider resource ID;
- provider-specific edit data получает отдельный versioned input contract в
  будущем вместе с logic plan.

Существующие `isPublished`, `publishedAt`, `deletedAt` считаются legacy
presentation. При cutover:

- `isPublished` можно оставить временным derived field внутри одной целевой
  schema revision, если UI еще использует его;
- authoritative field — `merchantStatus`;
- compatibility resolver/dual storage не создавать;
- окончательное удаление legacy fields выполняется тем же greenfield schema
  cutover, если все текущие queries обновляются атомарно.

## 6. Catalog Storefront GraphQL contract

### 6.1 Stable surface

Storefront получает только безопасную presentation:

```graphql
type StorefrontProductType {
  key: String!
  displayName: String!
  productManifestVersion: String!
  effectiveProductManifestHash: String!
  storefrontSections: [StorefrontProductTypeUiExtension!]!
}

type StorefrontProductTypeUiExtension {
  key: String!
  assetDigest: String!
  fallback: ProductTypeUiFallback!
}

extend type Product {
  type: StorefrontProductType!
  effectiveAvailability: ProductEffectiveAvailability!
}
```

Storefront не получает:

- definition ID и configuration;
- provider resource ID/revision;
- admin data schema/payload;
- installation ID;
- contribution snapshot;
- unavailable Products.

### 6.2 Static Federation rule

- `Product` остается Catalog-owned `@key(fields: "id")`;
- dynamic App installation не создает новый GraphQL object type;
- bundled App может иметь статически скомпонованные types только для своей
  собственной opt-in API, но они не являются discriminator core Product;
- общий список продуктов возвращает `Product`, а не union всех App types;
- type resolution не зависит от runtime schema composition.

## 7. Apps Admin GraphQL contract

### 7.1 Files

Добавить:

```text
services/apps/src/api/graphql-admin/schema/app-product-type.graphql
```

Обновить:

```text
services/apps/src/api/graphql-admin/schema/app-definition.graphql
services/apps/src/api/graphql-admin/schema/app-installation.graphql
services/apps/src/api/graphql-admin/schema/base.graphql
packages/shared-graphql-guid/src/.../GlobalIdEntity
```

Новый Node identity:

- `AppProductTypeContributionSnapshot`.

### 7.2 Types

Apps GraphQL не должен дублировать весь Catalog definition type. Он показывает
только App-owned source contribution:

```graphql
type AppProductTypeContributionDefinition {
  contributionKey: String!
  typeKey: String!
  displayName: String!
  description: String
  productManifestVersion: String!
  productManifestHash: String!
  schemas: [AppProductTypeSchemaDescriptor!]!
  operations: [AppProductTypeProviderOperation!]!
}

type AppProductTypeContributionSnapshot
  implements Node
  @key(fields: "id") {
  id: ID!
  appCode: String!
  appVersion: String!
  contributionKey: String!
  typeKey: String!
  contributionHash: String!
  productManifestVersion: String!
  productManifestHash: String!
  schemas: [AppProductTypeSchemaDescriptor!]!
  operations: [AppProductTypeProviderOperation!]!
  createdAt: DateTime!
}

type AppProductTypeSchemaDescriptor {
  key: String!
  version: Int!
  hash: String!
  kind: AppProductTypeSchemaKind!
}

enum AppProductTypeSchemaKind {
  PROVIDER_RESOURCE
  PROVIDER_ADMIN_DATA
  PUBLICATION_PROJECTION
  DEFINITION_CONFIGURATION
}

enum AppProductTypeProviderOperationKind {
  CREATE
  UPDATE
  VALIDATE
  READ_FOR_ADMIN
  TOMBSTONE
}

type AppProductTypeProviderOperation {
  operation: AppProductTypeProviderOperationKind!
  contract: String!
  inputSchema: AppProductTypeSchemaDescriptor!
  outputSchema: AppProductTypeSchemaDescriptor!
}
```

Не публиковать `action` и `capability`.

### 7.3 AppDefinition и AppInstallation

```graphql
extend type AppDefinition {
  productTypes: [AppProductTypeContributionDefinition!]!
}

extend type AppInstallation {
  productTypeContributions(
    first: Int
    after: String
    last: Int
    before: String
  ): AppProductTypeContributionSnapshotConnection!
}
```

`AppDefinition.productTypes` читает bundled manifest definition.
`AppInstallation.productTypeContributions` читает persisted immutable
snapshots. Эти поля могут различаться во время будущего update; это намеренно.

### 7.4 AppsQuery

```graphql
extend type AppsQuery {
  appProductTypeContributionSnapshot(
    id: ID!
  ): AppProductTypeContributionSnapshot
}
```

Не добавлять Apps mutations для:

- создания Catalog definition;
- назначения типа Product;
- изменения Product shell;
- записи provider resource ref в Catalog.

Эти сущности не принадлежат Apps.

## 8. GraphQL code generation and contract artifacts

После SDL changes:

- обновить GraphQL generated resolver types Catalog/Apps;
- обновить generated Zod input schemas;
- добавить Global ID enum values;
- проверить отсутствие одинаковых GraphQL enum/type definitions между
  subgraphs; общие presentation types либо принадлежат одному subgraph, либо
  имеют корректный `@shareable`;
- сохранить namespace entry points `catalogQuery/catalogMutation` и
  `appsQuery/appsMutation`;
- не добавлять root-level product-type mutations;
- не добавлять dynamic schema loading из App manifest.

Для проверки использовать только `shopana-cli` schema/codegen commands,
предписанные проектом. `build`, `test` и `tsc` в рамках этой документационной
задачи не требуются.

## 9. Порядок реализации

### Фаза 0. Зафиксировать foundation contract

1. Создать `@shopana/product-type-contracts`.
2. Зафиксировать key/hash/schema patterns.
3. Зафиксировать strict Zod schemas manifest V1.
4. Зафиксировать feature policies и platform limits.
5. Зафиксировать provider, definition, Product revision и App contribution
   types.
6. Зафиксировать stable error vocabulary.

Результат: Catalog, Apps и App SDK используют один compile-time contract без
service dependencies.

### Фаза 1. App manifest V3

1. Добавить `productTypes` в manifest schema.
2. Выполнить прямой V2 -> V3 cutover всех bundled Apps.
3. Добавить namespace/refinement checks.
4. Добавить canonical contribution hash.
5. Не добавлять compatibility parser.

Результат: любая App декларативно объявляет ноль или несколько product types.

### Фаза 2. Apps immutable data platform

1. Добавить contribution snapshot table/model.
2. Добавить schema snapshot table/model.
3. Добавить operation snapshot table/model.
4. Связать snapshots с exact installation manifest snapshot.
5. Зафиксировать retention-safe foreign-key behavior.
6. Не изменять общий runtime routing в этой фазе.

Результат: Apps хранит self-contained immutable source facts.

### Фаза 3. Catalog definition registry

1. Добавить Catalog schema snapshot registry.
2. Добавить definition identity/revision/current pointer.
3. Добавить current operational state и transition history.
4. Добавить App source provenance без cross-schema FK.
5. Добавить DB checks для provider discriminated unions.
6. Зафиксировать immutable rows DB-level.

Результат: Catalog имеет автономную versioned definition model.

### Фаза 4. Product revision data platform

1. Превратить `catalog.product` в shell.
2. Добавить immutable `product_revision`.
3. Добавить exact definition pin.
4. Добавить provider resource ref table.
5. Добавить optional publication projection envelope.
6. Добавить availability read model.
7. Удалить старый optimistic-lock revision как смешение двух semantics.
8. Не создавать dual-write.

Результат: Product identity отделена от immutable content/type/provider
revisions.

### Фаза 5. Catalog Admin GraphQL SDL

1. Добавить typed manifest/feature policies.
2. Добавить definition queries/connections.
3. Добавить definition mutation contracts.
4. Расширить Product type/type-ref/status fields.
5. Расширить ProductCreateInput definition selection.
6. Скрыть raw provider locators/actions.
7. Обновить Global IDs и generated contracts.

Результат: Admin API стабильно описывает platform model без App-specific
GraphQL types.

### Фаза 6. Apps Admin GraphQL SDL

1. Добавить contribution definition/snapshot types.
2. Расширить AppDefinition/AppInstallation.
3. Добавить snapshot query/connection.
4. Не добавлять ownership-нарушающие mutations.
5. Скрыть action/capability implementation details.

Результат: Apps API показывает source contributions, не притворяясь владельцем
Catalog definition.

### Фаза 7. Storefront GraphQL SDL

1. Добавить минимальный `StorefrontProductType`.
2. Добавить safe UI extension refs.
3. Не раскрывать configuration/provider/admin data.
4. Зафиксировать статичность Federation schema.

Результат: storefront contract расширяем без per-installation schema changes.

### Фаза 8. Contract verification

1. Сверить SQL и Drizzle models.
2. Сверить Zod manifest schemas и persisted JSON shapes.
3. Выполнить GraphQL codegen Catalog/Apps через `shopana-cli`.
4. Выполнить schema export/compose через `shopana-cli`.
5. Проверить generated SDL на dynamic App-specific core types.
6. Проверить migration constraints против tenant/UUID правил.
7. Проверить, что ни один новый contract не импортирует consumer-domain types.

Результат: foundation schemas согласованы статически. Runtime behavior остается
отдельной следующей работой.

## 10. Матрица ownership данных

| Fact | Owner | Persisted location | GraphQL owner |
|---|---|---|---|
| App manifest | Apps | `app_installation_manifest_snapshots` | Apps |
| App product type contribution | Apps | `app_product_type_contribution_snapshot` | Apps |
| App schema declaration | Apps | `app_product_type_schema_snapshot` | Apps |
| App provider operation declaration | Apps | `app_product_type_operation_snapshot` | Apps |
| Catalog schema registry copy | Catalog | `product_type_schema_snapshot` | Catalog Admin |
| Definition identity | Catalog | `product_type_definition` | Catalog |
| Definition immutable content | Catalog | `product_type_definition_revision` | Catalog |
| Definition current pointer | Catalog | `product_type_definition_current` | Catalog |
| Definition operational state | Catalog | `product_type_definition_state` | Catalog |
| Definition state history | Catalog | `product_type_definition_state_transition` | Catalog Admin |
| Product shell | Catalog | `product` | Catalog |
| Product immutable revision | Catalog | `product_revision` | Catalog |
| Provider resource reference | Catalog | `product_provider_resource_ref` | Catalog Admin, redacted |
| Provider aggregate | Native provider/App | provider-owned schema/database | Provider-owned optional static API |
| Provider publication projection | Catalog copy | `product_provider_publication_projection` | Catalog safe projection |
| Provider availability read model | Catalog | `product_provider_availability` | Catalog |

## 11. Security and tenancy checklist

- `storeId` всегда берется из service context, не из GraphQL input.
- Все Catalog/Apps reads включают store scope.
- App contribution принадлежит installation того же store.
- Catalog не доверяет форме opaque Apps UUID.
- Cross-service provenance проверяется hash/snapshot facts, а не SQL FK.
- App schema keys и type keys проверяются по `appCode` namespace.
- JSON проходит canonicalization и limits до persistence.
- GraphQL никогда не возвращает secrets, action names и resource IDs.
- Provider admin data возвращается только versioned envelope.
- Storefront не получает unavailable product provider details.
- Global ID используется для encoding identity, но не для authorization.
- Arbitrary JSON fields не становятся filters/sorts.
- Digests не считаются encryption.
- Immutable snapshots подпадают под общую at-rest encryption policy.

## 12. Что удалить при greenfield cutover

- App manifest V1/V2 public parsing;
- отсутствие обязательного `productTypes` в App manifests;
- использование `catalog.product.revision` одновременно как lock и snapshot
  identity;
- mutable product content как единственный authoritative state;
- возможность создать Product без explicit type definition;
- legacy product discriminator enums, если они существуют в параллельных
  ветках/документах;
- GraphQL assumptions, что все Products имеют одинаковый набор writable
  sections;
- прямое раскрытие unversioned provider JSON;
- планы отдельного GraphQL core type на каждую установленную App;
- cross-schema FK/read между Catalog и App provider tables.

Удаление выполняется напрямую. Backfill и legacy read adapter не создаются.

## 13. Acceptance criteria

### Контракты

- `ProductTypeKey` является namespaced string и не enum.
- Manifest и все provider JSON имеют strict versioned schemas.
- Core feature catalog typed и закрыт для неизвестных keys.
- App contribution полностью canonicalized и hash-addressable.
- Definition revision self-contained и читается без Apps call.
- Product revision pin-ит exact definition revision и effective product
  manifest hash.
- Provider resource ref opaque, immutable и schema-pinned.
- Operational state отделен от content revision.

### Apps DB/API

- App manifest V3 объявляет `productTypes`.
- Apps хранит immutable contribution/schema/operation snapshots.
- Один `(schemaKey, schemaVersion)` не допускает разные hashes.
- Apps GraphQL показывает contribution facts, но скрывает actions.
- Apps не создает и не изменяет Catalog definition/Product.

### Catalog DB/API

- `catalog.product` является shell с current/published pointers.
- Definition, Product и provider resource revisions не обновляются in-place.
- Все tenant reads могут использовать `store_id` indexes.
- Ни один FK не пересекает service schema.
- Product GraphQL показывает type/status/availability.
- Effective core manifest представлен typed GraphQL fields.
- Provider-specific data доступна только versioned envelope.
- Storefront не раскрывает internal provider/configuration facts.

### Scope protection

- Нет изменений consumer domains.
- Нет runtime provider invocation.
- Нет конкретной product-type реализации.
- Нет business services, scripts, workflows и resolvers в этом плане.
- Нет Admin UI.
- Нет dual-write, compatibility adapters или backfill.

## 14. Definition of done этой фазы

Фаза завершена, когда в репозитории существуют и согласованы:

1. `@shopana/product-type-contracts`;
2. App manifest V3 contract;
3. Apps SQL/Drizzle schema product-type snapshots;
4. Catalog SQL/Drizzle schema definitions/Product revisions/provider refs;
5. Catalog Admin и Storefront SDL;
6. Apps Admin SDL;
7. generated GraphQL TypeScript/Zod artifacts;
8. schema composition без per-installation dynamic types;
9. обновленная Catalog model-derived schema documentation.

Работа по domain logic начинается только отдельным планом после принятия этих
контрактов и схем.
