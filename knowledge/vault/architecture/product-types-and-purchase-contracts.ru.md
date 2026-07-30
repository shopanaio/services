---
tags:
  - architecture
  - catalog
  - checkout
  - orders
  - apps
  - purchasable
  - product-types
related:
  - architecture/overview
  - architecture/decisions
  - patterns/federation
  - packages/dbos/workflows
---

# Расширяемые типы продуктов и контракт покупки

## Статус

Архитектурное решение для реализации расширяемых типов продуктов в Shopana.

Документ определяет целевую модель. Проект не имеет production-данных, поэтому
новые контракты должны внедряться напрямую, без слоя обратной совместимости,
legacy adapters и backfill.

## Контекст

Shopana должна поддерживать:

- обычные продукты и варианты;
- fixed bundles и multipacks;
- mix-and-match и другие конфигурируемые составные продукты;
- цифровые продукты;
- подарочные карты;
- будущие типы, добавленные сервисами или установленными Apps;
- дополнительные возможности продукта, не меняющие его основной тип покупки:
  reviews, personalization, warranty и другие extensions.

У разных типов продукта различаются:

- структура данных в Catalog;
- набор доступных разделов редактора;
- обязательность media, SEO, attributes, options и variants;
- источник цены;
- правила выбора покупателем;
- inventory и fulfillment semantics;
- состав checkout/order lines;
- действия после оплаты.

При этом Checkout и Orders не должны знать каждый конкретный тип продукта.
Новый тип не должен требовать добавления очередного значения в общий GraphQL
enum, ветки `if` в Checkout и специального формата order metadata.

## Цели

1. Дать native-сервисам и Apps возможность предоставлять новые типы продуктов.
2. Сделать состав типа декларативным через versioned manifest.
3. Позволить отключать, разрешать или требовать стандартные возможности
   продукта.
4. Сохранить небольшое обязательное purchase-ядро для любого продаваемого типа.
5. Компилировать недоверенный выбор покупателя в единый серверный контракт.
6. Сохранять в Order точное и автономное описание купленного товара.
7. Обеспечить детерминированность, аудит, версионирование и безопасное
   обновление Apps.
8. Не превращать произвольный JSON в источник доверенной бизнес-логики.

## Не цели

- Динамически менять GraphQL schema для каждой установки App или Store.
- Разрешать App напрямую записывать данные в таблицы Catalog, Checkout или
  Orders.
- Хранить executable rules внутри Checkout или Order.
- Вызывать Catalog или App для отображения уже созданного Order.
- Смешивать product options, bundle selection и произвольные extensions в одну
  универсальную EAV-модель.
- Поддерживать старые форматы `ProductKind`, checkout snapshots или order
  events после перехода на новую архитектуру.

## Термины

### Product shell

Базовая витринная сущность в Catalog. Содержит общие данные: публикацию,
локализованный title/content, handle, категории и другие разрешенные manifest
возможности.

### Product type

Стабильный namespaced тип поведения продукта, например:

- `catalog.standard`;
- `catalog.bundle`;
- `app.gift-cards.gift-card`.

### Product type provider

Native-сервис или App, владеющий специфической конфигурацией типа и умеющий
скомпилировать выбор покупателя в `PurchaseContract`.

### Product type manifest

Версионированное декларативное описание доступных product features и
обязательного purchase behavior.

### Product type definition

Store-scoped настроенная установка product type manifest. Содержит разрешенную
merchant-конфигурацию и immutable revision.

### Purchase selection

Недоверенный ввод покупателя: выбранные компоненты, номинал, персонализация и
другие параметры конкретной покупки.

### Purchase contract

Серверный versioned результат компиляции покупки. Это единый контракт между
provider, Checkout, Pricing, Inventory, Fulfillment и Orders.

### Product extension

Дополнительная возможность продукта, которая не становится основным владельцем
покупки: reviews, engraving, warranty и аналогичные дополнения.

## Основные решения

### Один основной provider, несколько extensions

У продукта может быть только один основной product type provider. Он определяет,
что именно покупается и как построить основной `PurchaseContract`.

Дополнительных extensions может быть несколько. Они работают только через
разрешенные extension slots и не могут неявно перехватывать основной purchase
behavior.

```text
Product
  ├── ProductTypeProvider (ровно один)
  ├── Extension: reviews
  ├── Extension: personalization
  └── Extension: warranty
```

Это исключает ситуацию, когда несколько Apps одновременно считают себя
владельцами состава, цены или fulfillment одного продукта.

### Namespaced type key вместо расширяемого enum

Тип продукта идентифицируется строкой:

```ts
type ProductTypeKey = string;

// catalog.standard
// catalog.bundle
// app.gift-cards.gift-card
```

Namespaced key:

- глобально уникален;
- не требует GraphQL codegen при установке App;
- стабилен между deployments;
- не содержит installation ID или revision.

`ProductKind` вида `BASE | BUNDLE | GIFT_CARD | ...` не является extensibility
mechanism и не должен использоваться в целевой модели.

### Manifest управляет authoring, PurchaseContract управляет покупкой

`ProductTypeManifest` отвечает за:

- доступные разделы продукта;
- обязательность данных;
- допустимые merchant overrides;
- редактор и presentation hints;
- связь с purchase compiler.

`PurchaseContract` отвечает за:

- конкретный выбор покупателя;
- состав покупаемых линий;
- примененные правила;
- цену и ее распределение;
- inventory requirements;
- fulfillment obligations;
- audit trace.

Эти контракты нельзя объединять. Manifest описывает тип продукта, а
PurchaseContract — одну конкретную покупку.

## Product type provider

```ts
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
      capability: "purchasable-provider";
    }>;
```

Installation ID хранится в Store-scoped definition, но не включается в
`typeKey`. Несколько Stores могут использовать один type с разными
установками и конфигурацией.

## ProductTypeManifest

### Верхнеуровневый контракт

```ts
type ProductTypeManifestV1 = Readonly<{
  schemaVersion: 1;

  identity: {
    typeKey: ProductTypeKey;
    manifestVersion: string;
    displayName: string;
    description?: string;
  };

  authoring: {
    features: ProductFeatureManifest;
  };

  purchase: ProductPurchaseManifestV1;

  extensions: {
    allowedSlots: readonly ProductExtensionSlot[];
  };

  presentation?: {
    icon?: string;
    editorComponent?: string;
    storefrontComponent?: string;
  };
}>;
```

Manifest проходит platform validation, canonicalization и hashing до
регистрации.

### Базовая feature policy

Features не должны описываться набором независимых booleans. Используется
явная policy:

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

Семантика:

- `DISABLED`: feature нельзя читать как активную или изменять через mutation;
- `OPTIONAL`: provider разрешает feature, effective definition решает, включена
  ли она;
- `REQUIRED`: данные обязательны перед публикацией продукта.

Draft может быть временно неполным. Required policy проверяется при публикации и
при финальной purchase validation, если feature влияет на покупку.

### Стандартный каталог features

Первая версия платформы поддерживает:

```ts
type ProductFeatureManifest = Readonly<{
  content: ProductContentFeature;
  media: ProductMediaFeature;
  seo: FeaturePolicy;
  attributes: ProductAttributesFeature;
  options: ProductOptionsFeature;
  variants: ProductVariantsFeature;
  categories: FeaturePolicy;
  tags: FeaturePolicy;
  pricing: ProductPricingFeature;
  inventory: ProductInventoryFeature;
  physical: ProductPhysicalFeature;
}>;
```

Feature catalog контролируется платформой. App может настраивать известные
features и предоставлять namespaced provider configuration, но не может
добавлять неизвестную core feature строкой и ожидать, что Catalog автоматически
поймет ее semantics.

### Специализированные policies

```ts
type ProductMediaFeature =
  | DisabledFeature
  | Readonly<{
      state: "OPTIONAL" | "REQUIRED";
      defaultEnabled?: boolean;
      merchantToggle?: boolean;
      minItems?: number;
      maxItems?: number;
      allowedKinds: readonly ("IMAGE" | "VIDEO" | "MODEL_3D")[];
    }>;

type ProductVariantsFeature =
  | Readonly<{
      state: "DISABLED";
      mode: "NONE";
    }>
  | Readonly<{
      state: "OPTIONAL" | "REQUIRED";
      mode: "SINGLE_HIDDEN" | "MULTIPLE";
      minimum?: number;
      maximum?: number;
    }>;

type ProductPricingFeature =
  | Readonly<{
      state: "DISABLED";
      strategy: "PURCHASE_COMPILER";
    }>
  | Readonly<{
      state: "REQUIRED";
      strategy:
        | "PRODUCT_PRICE"
        | "VARIANT_PRICE"
        | "PURCHASE_COMPILER";
    }>;

type ProductInventoryFeature =
  | Readonly<{
      state: "DISABLED";
      mode: "NONE";
    }>
  | Readonly<{
      state: "OPTIONAL" | "REQUIRED";
      mode: "PRODUCT" | "VARIANT" | "COMPONENTS";
    }>;
```

Отключенный authoring price не означает бесплатный продукт. Например, gift card
или bundle могут не иметь обычной variant price, но purchase compiler обязан
вернуть валидный price result.

### Merchant overrides

Effective policy вычисляется по иерархии:

```text
Platform invariants
  → Provider manifest
    → Store product type definition
      → Effective manifest
```

Нижний уровень может только сузить разрешения верхнего:

- нельзя включить `DISABLED`;
- нельзя выключить `REQUIRED`;
- нельзя менять provider или compiler target;
- нельзя ослаблять platform limits;
- нельзя менять purchase semantics через presentation configuration.

Effective manifest canonicalized и получает собственный digest.

## Неотключаемое purchase-ядро

Следующие части не являются features и обязательны для каждого product type:

```ts
type ProductPurchaseManifestV1 = Readonly<{
  compilerTarget: "checkout.purchase.compile.v1";

  selectionSchema: {
    schemaKey: string;
    schemaVersion: number;
  };

  quantity: {
    minimum: number;
    maximum?: number;
    increments?: number;
  };

  pricing: {
    strategy: "STATIC" | "VARIANT" | "COMPOSITE" | "DYNAMIC";
    currencyMode: "PRODUCT" | "CHECKOUT" | "PROVIDER";
  };

  fulfillment: {
    mode: "PHYSICAL" | "DIGITAL" | "MIXED" | "NONE";
  };

  payment: {
    mode: "IMMEDIATE" | "DEFERRED" | "FREE";
  };
}>;
```

Любой provider обязан:

- принять selection и quantity;
- проверить Store и принадлежность definition;
- нормализовать selection;
- получить или вычислить цену;
- вернуть customer-visible snapshot;
- объявить inventory и fulfillment requirements;
- создать валидный `PurchaseContract`;
- работать read-only и детерминированно в рамках входного snapshot.

## Регистрация product type

### Native provider

Native-сервисы регистрируют contributions при bootstrap:

```ts
type ProductTypeContribution = Readonly<{
  typeKey: ProductTypeKey;
  manifestVersion: string;
  manifest: ProductTypeManifestV1;
  manifestHash: string;
  provider: ProductTypeProviderRef;
}>;
```

### App provider

App manifest получает декларативные contributions:

```ts
type AppProductTypeContribution = Readonly<{
  typeKey: ProductTypeKey;
  manifest: ProductTypeManifestV1;
  operations: {
    compile: string;
  };
}>;
```

App также объявляет capability:

```ts
{
  key: "purchasable-provider",
  assignmentMode: "resource",
  operations: {
    compile: "compilePurchase"
  }
}
```

Apps service:

1. валидирует manifest;
2. сохраняет immutable manifest snapshot;
3. регистрирует capability route;
4. создает Store-scoped product type definition;
5. связывает definition с конкретной App installation.

Catalog не импортирует код App и не читает ее таблицы.

## Product type definition

```ts
type ProductTypeDefinition = Readonly<{
  id: string;
  storeId: string;

  typeKey: ProductTypeKey;
  provider: ProductTypeProviderRef;

  manifestVersion: string;
  manifestHash: string;

  configurationRevision: number;
  configurationSnapshot: JsonValue;

  effectiveManifest: ProductTypeManifestV1;
  effectiveManifestHash: string;

  status: "ACTIVE" | "SUSPENDED" | "RETIRED";
  createdAt: string;
}>;
```

Definition revisions immutable. Изменение merchant configuration создает новую
revision, а не перезаписывает прошлую.

## Связь Product с типом

```ts
type ProductTypeRef = Readonly<{
  definitionId: string;
  definitionRevision: number;
  typeKey: ProductTypeKey;
  effectiveManifestHash: string;
}>;
```

Product хранит reference, а не копию mutable current manifest.

Смена типа существующего Product является отдельным use case с полной
валидацией данных. Обычная product update mutation не может менять `typeKey`.

## Product extensions

Product type manifest определяет разрешенные slots:

```ts
type ProductExtensionSlot =
  | "product-validation"
  | "purchase-validation"
  | "pricing-adjustment"
  | "line-enrichment"
  | "fulfillment-obligation"
  | "admin-section"
  | "storefront-section";
```

Каждый slot имеет platform-owned input/output contract, execution mode,
precedence и failure policy.

Extensions:

- не меняют основной `typeKey`;
- не могут удалять обязательные root/component lines;
- не могут читать данные другой App;
- добавляют только namespaced output;
- оставляют execution trace;
- не получают права на mutation только из-за участия в compile pipeline.

## Authoring и публикация

### Draft editing

Admin получает effective manifest и строит editor:

- скрывает `DISABLED` sections;
- позволяет включать разрешенные optional sections;
- показывает required sections;
- подключает provider-specific configuration editor;
- не выполняет запросы за отключенными данными.

Backend остается источником истины. Каждая mutation проверяет policy независимо
от поведения Admin UI.

```ts
assertProductFeatureWritable(productType, "media");
assertProductFeatureWritable(productType, "seo");
assertProductFeatureWritable(productType, "options");
```

Типовые ошибки:

```text
PRODUCT_FEATURE_DISABLED
PRODUCT_FEATURE_NOT_ENABLED
PRODUCT_FEATURE_CONFIGURATION_INVALID
PRODUCT_TYPE_PROVIDER_UNAVAILABLE
```

### Publication validation

Перед публикацией Catalog:

1. загружает exact ProductTypeDefinition revision;
2. проверяет core product invariants;
3. проверяет все `REQUIRED` features;
4. вызывает provider validation для provider-owned configuration;
5. проверяет доступность purchase compiler route;
6. сохраняет validation result с manifest/configuration digests;
7. публикует только при отсутствии ошибок.

Изменение данных после validation инвалидирует result через revision.

## PurchaseSelection

Storefront передает только намерение покупателя:

```ts
type PurchaseSelectionInput = Readonly<{
  purchasableId: string;
  quantity: number;
  selection: JsonValue;
  clientLineKey?: string;
}>;
```

Клиент не передает доверенные:

- title;
- SKU;
- image;
- price;
- applied rules;
- child price config;
- purchasable snapshot;
- provider route.

Selection считается недоверенным даже если был сформирован официальным
Storefront.

## Purchase compiler

Checkout владеет Commerce Function target:

```ts
{
  target: "checkout.purchase.compile.v1",
  owningService: "checkout",
  executionMode: "SINGLE",
  allowMultipleAppImplementations: false,
  appFailureMode: "REQUIRED"
}
```

Native standard/bundle providers и App providers реализуют одинаковый contract.

Compile input содержит:

- Store ID;
- exact ProductTypeDefinition ref и snapshots;
- purchasable reference;
- quantity;
- selection;
- currency и locale;
- customer segment без лишней PII;
- execution ID, correlation ID и deadline.

Compile operation:

- read-only;
- имеет размер и depth limits;
- использует canonical JSON;
- не резервирует stock;
- не выпускает gift card;
- не отправляет уведомления;
- не изменяет product configuration;
- возвращает только данные, разрешенные output schema.

## PurchaseContract

### Верхнеуровневый контракт

```ts
type PurchaseContractV1 = Readonly<{
  contractVersion: 1;

  identity: PurchaseIdentity;
  provider: PurchaseProviderSnapshot;
  selection: PurchaseSelectionSnapshot;

  lines: readonly PurchaseContractLine[];
  appliedRules: readonly AppliedPurchaseRule[];

  pricing: PurchasePricingSnapshot;
  fulfillment: PurchaseFulfillmentSnapshot;

  execution: PurchaseExecutionSnapshot;
}>;
```

### Identity

```ts
type PurchaseIdentity = Readonly<{
  typeKey: ProductTypeKey;
  purchasableId: string;
  productId: string | null;

  definitionId: string;
  definitionRevision: number;
  manifestHash: string;
  configurationRevision: number;
}>;
```

### Provider snapshot

```ts
type PurchaseProviderSnapshot = Readonly<{
  kind: "NATIVE" | "APP";
  service?: string;
  providerKey?: string;

  appCode?: string;
  appVersion?: string;
  installationId?: string;

  capabilityRouteId?: string;
  routeRevision?: string;
}>;
```

### Selection snapshot

```ts
type PurchaseSelectionSnapshot = Readonly<{
  schemaKey: string;
  schemaVersion: number;
  normalized: JsonValue;
  digest: string;
}>;
```

Normalized selection не содержит секреты или прямую PII. Для recipient,
delivery details и аналогичных данных используются ссылки на отдельное
PII-хранилище.

### Lines

```ts
type PurchaseLineRole =
  | "ROOT"
  | "COMPONENT"
  | "CHARGE"
  | "ENTITLEMENT";

type PurchaseContractLine = Readonly<{
  key: string;
  parentKey: string | null;
  role: PurchaseLineRole;

  purchasable: {
    typeKey: string;
    id: string;
    revision: string | null;
  };

  quantity: number;

  display: {
    title: string;
    sku: string | null;
    imageUrl: string | null;
  };

  price: {
    originalUnitMinor: number;
    finalUnitMinor: number;
  };

  fulfillment: {
    physical: boolean;
    inventoryTracked: boolean;
  };

  providerData?: {
    schemaVersion: number;
    data: JsonValue;
  };
}>;
```

Line keys генерируются provider детерминированно из нормализованного выбора.
Нельзя коррелировать component output по позиции массива.

### Applied rules

```ts
type AppliedPurchaseRule = Readonly<{
  ruleKey: string;
  ruleRevision: string;
  ruleType: string;
  sourceRef: string;
  inputDigest: string;
  outcome: JsonValue;
  ruleSnapshot?: JsonValue;
}>;
```

Предпочтительная модель — immutable rule revisions. Минимальный rule snapshot
встраивается, если provider не гарантирует долговременное хранение определения.

В Order сохраняется не только список rule IDs, но и результат их применения.

### Pricing

```ts
type PurchasePricingSnapshot = Readonly<{
  currencyCode: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;

  allocations: readonly {
    lineKey: string;
    amountMinor: number;
  }[];
}>;
```

Provider предлагает структуру и расчет, но Checkout/Pricing проверяют:

- ISO currency;
- safe integer minor units;
- отсутствие запрещенных отрицательных значений;
- равенство allocations и totals;
- допустимость payment mode;
- platform pricing invariants.

### Fulfillment

```ts
type PurchaseFulfillmentSnapshot = Readonly<{
  mode: "PHYSICAL" | "DIGITAL" | "MIXED" | "NONE";

  inventoryRequirements: readonly {
    lineKey: string;
    inventoryItemId: string;
    quantity: number;
  }[];

  obligations: readonly {
    key: string;
    type: string;
    provider: PurchaseProviderSnapshot;
    payloadVersion: number;
    payload: JsonValue;
    piiRefs?: readonly string[];
  }[];
}>;
```

Obligations описывают будущую работу, но не исполняются в compiler.

### Execution snapshot

```ts
type PurchaseExecutionSnapshot = Readonly<{
  executionId: string;
  target: "checkout.purchase.compile.v1";
  bindingSetRevision: string;
  planRevision: string;
  inputDigest: string;
  outputDigest: string;
  completedAt: string;
}>;
```

Используется execution trace существующего Commerce Function Runner.

## Checkout lifecycle

### Добавление линии

1. Checkout принимает `PurchaseSelectionInput`.
2. Разрешает purchasable и exact type definition.
3. Проверяет, что definition и provider активны.
4. Запускает purchase compiler.
5. Валидирует `PurchaseContract`.
6. Получает platform pricing result.
7. Проверяет inventory availability без reservation side effect.
8. Сохраняет contract revision и materialized checkout lines.

### Line identity

Одинаковый `purchasableId` не означает одинаковую линию.

```ts
lineIdentityDigest = hash({
  typeKey,
  purchasableId,
  selectionDigest,
  tag,
});
```

Bundle с разным составом и gift cards с разными номиналами или получателями не
объединяются.

### Recalculation

При изменении quantity, currency, relevant customer context или product
definition Checkout выполняет новый compile:

- selection переносится как input;
- создается новая contract revision;
- старый contract остается в event history;
- line может перейти в `INVALID` или `PROVIDER_UNAVAILABLE`;
- Checkout не подменяет последний успешный contract молча.

### Создание Order

Перед созданием Order:

1. Checkout выполняет финальную compile/validation;
2. Inventory выполняет reservation для contract requirements;
3. Pricing фиксирует totals;
4. Order получает exact final `PurchaseContract`;
5. Order creation и reservation координируются durable workflow/saga;
6. дальнейшее отображение Order не требует вызова provider.

## Order snapshot

Order сохраняет:

- полный финальный `PurchaseContract`;
- display snapshots;
- parent/component structure;
- applied rule outcomes;
- pricing allocations;
- provider, App и route revisions;
- fulfillment obligations;
- digests и execution references.

Order не пересчитывает прошлую покупку при:

- изменении продукта;
- изменении bundle rules;
- обновлении App;
- suspend/uninstall provider;
- изменении title, SKU или media.

Order read model может материализовать часто используемые поля, но source of
truth остается event payload с versioned purchase contract.

## Fulfillment obligations

После оплаты DBOS workflow исполняет obligations:

- issue gift card;
- создать digital entitlement;
- зарегистрировать subscription;
- запустить provider-specific fulfillment.

Каждая obligation:

- имеет стабильный key;
- идемпотентна;
- привязана к Order и contract digest;
- использует pinned provider/version semantics;
- хранит статус независимо от отображения Order.

Uninstall App блокируется, пока существуют незавершенные required obligations.
Suspend запрещает новые покупки, но не должен ломать чтение Orders.

## GraphQL и Federation

GraphQL schema не меняется на каждую Store installation.

Core API предоставляет стабильные типы:

```graphql
type ProductType {
  key: String!
  manifestVersion: String!
  manifestHash: String!
  effectiveManifest: JSON!
  providerStatus: ProductTypeProviderStatus!
}

type Product {
  id: ID!
  type: ProductType!
}

interface Purchasable {
  id: ID!
  typeKey: String!
}
```

Provider-specific configuration доступна как versioned namespaced data либо
через статически скомпонованный Federation type для bundled native Apps.

Динамически установленная App не может добавлять новый GraphQL object type в
уже запущенный per-store schema. Ее Admin/Storefront UI использует:

- manifest;
- versioned selection schema;
- UI extension slots;
- namespaced JSON только на внешней границе.

Внутри домена JSON всегда сопровождается `schemaKey/schemaVersion` и проходит
provider/platform validation.

## Владение данными по сервисам

### Catalog

Владеет:

- Product shell;
- ссылкой Product на ProductTypeDefinition;
- native product data;
- feature policy enforcement;
- publication validation;
- native bundle definitions и immutable rule revisions.

### Apps

Владеет:

- App manifests и snapshots;
- App installation lifecycle;
- product type contributions;
- capability routes;
- App configuration snapshots;
- route and installation revisions.

### Checkout

Владеет:

- PurchaseSelection;
- compiler orchestration;
- PurchaseContract validation;
- mutable contract revisions;
- materialized cart lines;
- checkout pricing state.

### Pricing

Владеет:

- platform money invariants;
- discounts и adjustments;
- финальным pricing result;
- распределением сумм согласно разрешенной стратегии.

### Inventory

Владеет:

- availability;
- reservations;
- stock movements;
- inventory requirements execution.

Inventory не интерпретирует bundle rules или gift card configuration.

### Orders

Владеет:

- immutable final PurchaseContract snapshot;
- order event history;
- fulfillment obligation state/reference;
- order-facing line projections.

## Multi-tenancy и безопасность

- Все definitions, products, capability routes и executions Store-scoped.
- Provider не может вернуть reference на данные другого Store.
- App вызывается только через installation context и granted scopes.
- Selection и provider output имеют byte/depth limits.
- JSON canonicalization запрещает non-finite numbers, cycles, custom prototypes и
  нестабильные representations.
- Provider output валидируется платформой до записи event.
- PII хранится отдельно; contract содержит только opaque references.
- Global ID не используется как механизм авторизации.
- Provider не может сам назначить себе capability route или effective policy.

## Версионирование

Независимо версионируются:

- manifest schema;
- manifest version/hash;
- product type definition revision;
- provider configuration revision;
- selection schema;
- purchase contract;
- rule revisions;
- App version;
- capability route revision;
- checkout/order event contract.

Любой snapshot canonicalized перед hashing. Digest используется для сравнения и
аудита, но не заменяет сохранение необходимых business facts.

## Изменение manifest и definition

Manifest нельзя заменить in-place для существующих Products.

Upgrade выполняется отдельной операцией:

```ts
type ProductTypeDefinitionUpgrade = Readonly<{
  fromManifestHash: string;
  toManifestHash: string;
  affectedProductIds: readonly string[];
  validationResult: JsonValue;
}>;
```

Upgrade отклоняется, если:

- новая версия отключает feature, для которой существуют данные;
- required feature отсутствует;
- purchase semantics несовместимы с product configuration;
- provider route недоступен;
- migration требует неявного удаления данных.

Удаление данных возможно только отдельной явно подтвержденной операцией. В
текущем greenfield-проекте не создается compatibility или backfill path для
старой модели.

## Failure semantics

### Provider unavailable

- Draft остается доступным для чтения.
- Редактирование provider-owned configuration блокируется.
- Публикация и новые покупки запрещены.
- Существующая checkout line помечается invalid при recalculation.
- Order остается полностью читаемым.

### Invalid provider output

Output отклоняется целиком. Частичные lines, price или obligations не
сохраняются.

### Optional extension failure

Поведение определяется slot policy. Ошибка optional extension фиксируется в
trace, но не изменяет основной contract, если slot допускает продолжение.

### Required extension failure

Compile завершается ошибкой, новый contract не сохраняется.

## Примеры

### Standard product

```text
typeKey: catalog.standard
features:
  content: REQUIRED
  media: OPTIONAL
  seo: OPTIONAL
  attributes: OPTIONAL
  options: OPTIONAL
  variants: REQUIRED / MULTIPLE
  pricing: REQUIRED / VARIANT_PRICE
  inventory: OPTIONAL / VARIANT
purchase:
  pricing: VARIANT
  fulfillment: PHYSICAL
```

PurchaseContract содержит одну root line.

### Mix-and-match bundle

```text
typeKey: catalog.bundle
features:
  content: REQUIRED
  media: OPTIONAL
  seo: OPTIONAL
  attributes: OPTIONAL
  options: DISABLED
  variants: OPTIONAL / SINGLE_HIDDEN
  pricing: DISABLED / PURCHASE_COMPILER
  inventory: REQUIRED / COMPONENTS
purchase:
  pricing: COMPOSITE
  fulfillment: MIXED
```

PurchaseContract содержит:

- root line bundle;
- component lines;
- normalized selections по group/item keys;
- configuration и rule revisions;
- результаты dependency и pricing rules;
- allocations;
- inventory requirements для components.

### Gift card от App

```text
typeKey: app.gift-cards.gift-card
features:
  content: REQUIRED
  media: OPTIONAL
  seo: OPTIONAL
  attributes: DISABLED
  options: DISABLED
  variants: DISABLED
  pricing: DISABLED / PURCHASE_COMPILER
  inventory: DISABLED
  physical: DISABLED
purchase:
  pricing: DYNAMIC
  fulfillment: DIGITAL
  payment: IMMEDIATE
```

Selection содержит amount и recipient PII reference. Contract содержит digital
root line и `ISSUE_GIFT_CARD` obligation. Выпуск карты происходит после оплаты,
а не во время compile.

## Запрещенные альтернативы

### Расширяемый ProductKind enum

Требует изменения Catalog, GraphQL schema и клиентов для каждой App. Не
подходит для runtime installations.

### Только JSON metadata в checkout/order

Не определяет владельца, schema version, доверенность данных и audit semantics.
Приводит к невалидируемой бизнес-логике.

### Snapshot от клиента

Позволяет подменять title, SKU, price и applied configuration. Клиент передает
только selection.

### App как прямой владелец checkout lines

Нарушает bounded contexts, усложняет транзакции и делает Order зависимым от
доступности App.

### Динамический GraphQL type на каждую App

Невозможен без пересборки общего schema и не соответствует per-store
installation lifecycle.

### Универсальная EAV-модель всех product features

Упрощает запись произвольных данных, но теряет domain constraints, ownership,
queryability и понятные migration rules.

### Исполнение side effects во время compile

Повторная калькуляция корзины может происходить многократно. Любые issuance,
reservation или notification side effects должны исполняться отдельными
идемпотентными workflows.

## Последовательность внедрения

1. Ввести platform contracts для manifest, definition и provider refs.
2. Заменить `ProductKind` на `ProductTypeRef`.
3. Создать registry native/App contributions и immutable snapshots.
4. Добавить Catalog feature policy enforcement и publication validation.
5. Определить `PurchaseSelection` и `PurchaseContractV1`.
6. Зарегистрировать `checkout.purchase.compile.v1` в Commerce Function Runner.
7. Реализовать native providers для standard product и bundle.
8. Заменить текущий inventory offer flow на compile → pricing → inventory
   requirements.
9. Перевести Checkout events/read models на contract revisions.
10. Перевести Orders на полный immutable PurchaseContract snapshot.
11. Добавить DBOS fulfillment obligations.
12. Добавить App product type contributions и gift card reference
    implementation.
13. Обновить Admin editor для manifest-driven sections.

На каждом шаге новые схемы вводятся как целевые. Legacy dual-write и adapters не
создаются.

## Критерии готовности

- Новый native/App product type регистрируется без изменения Checkout и Orders.
- Отключенная feature недоступна и в UI, и через прямую API mutation.
- Required features проверяются перед публикацией.
- Два одинаковых purchasable с разным selection создают разные lines.
- Bundle contract объясняет состав и примененные правила.
- Gift card не требует variant, inventory или physical data.
- Order отображается без вызова Catalog или App.
- App update не меняет смысл уже созданного Order.
- Suspend/uninstall корректно разделяет новые покупки, существующие checkouts,
  Orders и незавершенные obligations.
- Все provider invocations имеют pinned revisions, limits, digest и trace.
