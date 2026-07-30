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

Решения в документе являются нормативными. Если пример расходится с явно
зафиксированным ownership, lifecycle или invariant, применяется нормативное
правило, а пример должен быть исправлен.

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
скомпилировать выбор покупателя в `PurchaseCompilation`.

### Product type manifest

Версионированное декларативное описание доступных product features и
обязательного purchase behavior.

### Product type definition

Store-scoped настроенная установка product type manifest. Содержит разрешенную
merchant-конфигурацию и immutable revision.

Definition принадлежит Catalog. Для App-backed type Catalog создает ее из
immutable contribution snapshot, полученного от Apps service.

### Provider product resource

Типоспецифичный aggregate конкретного Product. Он хранится provider в его
собственной схеме или внешней базе. Catalog хранит только opaque immutable
reference на его revision и никогда не читает таблицы provider напрямую.

### Purchase selection

Недоверенный ввод покупателя: выбранные компоненты, номинал, персонализация и
другие параметры конкретной покупки.

### Purchase compilation

Проверенный и скомпонованный Checkout versioned результат до Pricing:
нормализованный выбор, line topology, base price proposal, inventory
requirements, fulfillment obligations и extension outcomes. Provider возвращает
недоверенный `ProviderPurchaseOutput`; Checkout декодирует его и только после
platform validation создает `PurchaseCompilation`.

### Purchase contract

Запечатанный Checkout versioned результат после platform validation и Pricing.
Только `PurchaseContract`, а не provider output, является единым authoritative
контрактом между Checkout, Pricing, Catalog Inventory и Orders.

### Product extension

Дополнительная возможность продукта, которая не становится основным владельцем
покупки: reviews, engraving, warranty и аналогичные дополнения.

## Основные решения

### Один основной provider, несколько extensions

У продукта может быть только один основной product type provider. Он определяет,
что именно покупается и как построить `PurchaseCompilation`.

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

Platform registry резервирует namespace:

- native key начинается с зарегистрированного service namespace;
- App key обязан начинаться с `app.${appCode}.`;
- повторная регистрация key другим owner запрещена;
- изменение owner или смысла существующего key требует нового key.

`ProductKind` вида `BASE | BUNDLE | GIFT_CARD | ...` не является extensibility
mechanism и не должен использоваться в целевой модели.

### Manifest управляет authoring, compilation предлагает покупку, contract ее фиксирует

`ProductTypeManifest` отвечает за:

- доступные разделы продукта;
- обязательность данных;
- допустимые merchant overrides;
- редактор и presentation hints;
- связь с purchase compiler.

`PurchaseCompilation` отвечает за:

- конкретный выбор покупателя;
- состав покупаемых линий;
- примененные правила;
- base price proposal;
- inventory requirements;
- fulfillment obligations;
- audit trace.

`PurchaseContract` добавляет authoritative pricing result, platform validation
proof и immutable seal. Эти контракты нельзя объединять. Manifest описывает тип,
provider output предлагает покупку, compilation является проверенным и
скомпонованным pre-pricing результатом, contract — окончательно разрешенной
платформой покупкой.

### Catalog shell, provider-owned product data

Catalog владеет общим `ProductShell`, `ProductTypeDefinition` и publication
state. Provider владеет типоспецифичным product aggregate.

```text
Catalog.ProductShell
  ├── common authoring data
  ├── ProductTypeDefinitionRef
  └── ProviderProductResourceRef
          ├── native service schema
          ├── bundled App schema
          └── external App database
```

Между Catalog и provider data запрещены cross-service foreign keys и
cross-schema joins. Связь логическая, Store-scoped и проверяется actions
владеющего сервиса.

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
      functionKey: string;
    }>;
```

Installation ID хранится в Store-scoped definition, но не включается в
`typeKey`. Несколько Stores могут использовать один type с разными
установками и конфигурацией. App compiler всегда вызывается через фиксированный
capability `commerce.function` и target из purchase manifest; provider ref не
может подменить capability или target.

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
вернуть валидный base price proposal, который затем проверяет Pricing.

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
    schemaHash: string;
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
- получить или вычислить base price proposal;
- вернуть customer-visible snapshot;
- объявить inventory и fulfillment requirements;
- вернуть schema-valid `ProviderPurchaseOutput`;
- работать read-only и детерминированно относительно явно переданных snapshots
  и source revisions.

Selection schemas регистрируются в immutable platform registry. Повторная
регистрация другого содержимого под тем же `(schemaKey, schemaVersion)`
запрещена. Registry хранит owner, canonical schema, hash, limits и retention.
Manifest, selection snapshot и contract всегда pin-ят `schemaHash`.

Для изменяемых источников цены compiler input содержит exact source revision
либо quote metadata `calculatedAt/validUntil`. Скрытые чтения mutable current
state запрещены. Execution timestamps и duration не входят в business-output
digest.

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
  providerResourceSchema: {
    schemaKey: string;
    schemaVersion: number;
    schemaHash: string;
  };
  functionKey: string;
}>;
```

App также объявляет Commerce Function implementation:

```ts
{
  capability: "commerce.function",
  target: "checkout.purchase.compile.v1",
  functionKey: "gift-card-purchase-compiler",
  action: "compilePurchase"
}
```

Apps service:

1. валидирует manifest;
2. сохраняет immutable manifest snapshot;
3. регистрирует capability route;
4. предоставляет Catalog immutable contribution snapshot;
5. не создает и не изменяет Catalog definition.

Catalog отдельной mutation создает Store-scoped `ProductTypeDefinition` и
function binding owner, связанный с конкретной App installation. Для одной
definition разрешен ровно один compile binding.

Catalog не импортирует код App и не читает ее таблицы.

## Product type definition

```ts
type ProductTypeDefinitionRevision = Readonly<{
  id: string;
  revision: number;
  storeId: string;

  typeKey: ProductTypeKey;
  provider: ProductTypeProviderRef;

  manifestVersion: string;
  manifestHash: string;

  configurationRevision: number;
  configurationSnapshot: JsonValue;

  effectiveManifest: ProductTypeManifestV1;
  effectiveManifestHash: string;

  createdAt: string;
}>;

type ProductTypeDefinitionState = Readonly<{
  definitionId: string;
  definitionRevision: number;
  storeId: string;

  status: "ACTIVE" | "SUSPENDED" | "RETIRED";
  statusRevision: number;
  statusReason:
    | "NONE"
    | "APP_SUSPENDED"
    | "APP_UNINSTALLED"
    | "PROVIDER_RETIRED"
    | "MANUALLY_SUSPENDED";
  changedAt: string;
}>;
```

Catalog является единственным владельцем definition. Apps владеет исходным App
manifest, installation и capability route, но не Catalog definition.
`configurationSnapshot` содержит только non-secret merchant configuration.
Secrets остаются в Apps secret store; definition может хранить только opaque
secret reference, который не передается в Checkout/Order.

Ключ immutable revision — `(storeId, id, revision)`. Любое изменение manifest,
provider binding, effective policy или merchant configuration создает новую
общую `revision`. `configurationRevision` сохраняется как происхождение
конфигурации, но Product pin-ит общую definition revision.

Definition content immutable. Operational state хранится отдельно и не меняет
content revision:

- `ACTIVE` разрешает validation, publication и compile;
- `SUSPENDED` временно запрещает publication и новые compile;
- `RETIRED` окончательно запрещает новые compile для этой revision.

История status transitions сохраняется отдельно. State адресуется exact
`(definitionId, definitionRevision)`. Возврат `SUSPENDED → ACTIVE` допустим
только после provider validation. `RETIRED → ACTIVE` для этой revision
запрещен; upgrade создает новую content revision с отдельным ACTIVE state.

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

### Provider product resource

Типоспецифичные данные конкретного Product не входят в
`ProductTypeDefinition.configurationSnapshot`. Definition configuration
Store-scoped и общая для всех Products этого типа. Данные конкретного Product
хранятся provider:

```ts
type ProviderProductResourceRef = Readonly<{
  provider: ProductTypeProviderRef;
  resourceId: string;
  resourceRevision: string;

  schemaKey: string;
  schemaVersion: number;
  snapshotDigest: string;
}>;
```

`resourceId` является opaque identifier. Catalog не декодирует его и не
использует как authorization proof.

Native provider хранит aggregate в schema владеющего сервиса. Bundled App
использует одну database schema на стабильный `appCode`, а не на installation:

```text
catalog.standard_product
catalog.bundle_product
app_gift_cards.product
```

Каждая provider table содержит `store_id`, а App table дополнительно
`installation_id`. Database role App имеет доступ только к своей schema.
External App хранит aggregate в своей базе. В обоих случаях Catalog работает
только через provider actions.

Запрещены:

- schema на каждую installation;
- прямые записи App в `catalog.*`;
- чтение Catalog таблиц App через SQL;
- cross-service foreign keys;
- изменение resource revision in-place.

Новая App/provider version не изменяет старый resource schema in-place.
Versioned representations могут временно сосуществовать, пока на них ссылаются
published Products, active permits или obligations. Это retention immutable
facts, а не compatibility adapter или backfill: старая revision не
транслируется в новый формат при чтении и удаляется только отдельным purge после
исчезновения references.

Каждый provider реализует platform-owned resource actions:

```ts
type ProductProviderOperationsV1 = Readonly<{
  create: "productProvider.resource.create.v1";
  update: "productProvider.resource.update.v1";
  validate: "productProvider.resource.validate.v1";
  readForAdmin: "productProvider.resource.readForAdmin.v1";
  tombstone: "productProvider.resource.tombstone.v1";
}>;
```

Actions Store-scoped, idempotent и возвращают только versioned schemas. Общего
`delete` нет. Catalog не предоставляет App generic SQL/data proxy.

Provider может вернуть Catalog ограниченную
`ProviderProductPublicationProjection` для Storefront/indexing. Projection
имеет schema/hash, проходит validation и не становится source of truth
provider aggregate. Произвольные App fields не становятся автоматически
фильтруемыми core Catalog fields.

### Product shell и доступность

```ts
type ProductShell = Readonly<{
  id: string;
  storeId: string;

  merchantStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  currentRevision: number;
  publishedRevision: number | null;

  createdAt: string;
}>;

type ProductRevision = Readonly<{
  productId: string;
  revision: number;
  storeId: string;

  type: ProductTypeRef;

  providerState:
    | "PENDING_PROVIDER"
    | "READY"
    | "PROVIDER_SETUP_FAILED";
  providerResource: ProviderProductResourceRef | null;

  title: JsonValue;
  handle: string | null;
  content: JsonValue | null;

  createdAt: string;
}>;

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

Merchant intent и operational availability независимы. Suspend/uninstall App
не меняет `merchantStatus`. Published Product остается published в Admin, но
получает `PROVIDER_UNAVAILABLE` и исчезает из Storefront.

`providerResource = null` разрешен только для `PENDING_PROVIDER` и
`PROVIDER_SETUP_FAILED`. Publication требует `providerState = READY`. Storefront
и purchase используют immutable `publishedRevision`, а Admin редактирует новую
`currentRevision`. Поэтому draft-изменение provider resource не меняет уже
опубликованную покупку до успешной повторной публикации.

`merchantStatus = PUBLISHED` требует `publishedRevision != null`.
`publishedRevision` всегда указывает на существующую immutable Product revision
того же Store и Product.

Authoritative availability вычисляется из pinned definition status, current
installation state и provider resource validation. Для Listing Catalog хранит
локальную projection по
`definitionId/definitionRevision/installationId/statusRevision`. Массовое
обновление каждого Product при uninstall не является source of truth и не
требуется.

Checkout перед каждым compile и перед созданием Order повторно проверяет
authoritative state; stale Listing projection не может разрешить покупку.

### Создание и изменение provider resource

Создание Product выполняется DBOS saga:

1. Catalog создает `DRAFT` shell и Product revision в
   `PENDING_PROVIDER`.
2. Provider идемпотентно создает aggregate с переданным Catalog product ID.
3. Provider возвращает `ProviderProductResourceRef`.
4. Catalog проверяет Store, provider identity, schema и digest.
5. Catalog создает следующую Product revision с reference и `READY`.

При ошибке новая Product revision получает `PROVIDER_SETUP_FAILED`, а созданный
provider resource tombstone-ится compensation step. Physical delete не
используется как компенсация.

Изменение provider data создает новую resource revision. Catalog принимает
новый ref с optimistic check текущих Product/resource revisions и создает новую
Product revision. `publishedRevision` не меняется до успешной publication
validation.

## Product extensions

Product type manifest определяет разрешенные slots:

```ts
type ProductExtensionSlot =
  | "product-validation"
  | "purchase-validation"
  | "pricing-adjustment"
  | "line-enrichment"
  | "supplemental-line"
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

### Порядок extension pipeline

Порядок фаз фиксирован платформой:

```text
provider compile
  → purchase-validation
  → line-enrichment
  → supplemental-line
  → pricing-adjustment proposal
  → fulfillment-obligation
  → compose PurchaseCompilation
  → Pricing
  → final platform validation
  → contract seal
```

`product-validation` выполняется отдельно при публикации.
`admin-section/storefront-section` являются UI slots и не участвуют в purchase
pipeline.

Для каждого execution Catalog/Checkout строит immutable binding set. Внутри
slot порядок:

```text
precedence ASC
activationSequence ASC
functionBindingId ASC
```

Правила композиции принадлежат платформе:

- `purchase-validation` только добавляет validation issues;
- `line-enrichment` может добавлять только namespaced display/provider data и
  не меняет quantity, purchasable, topology или base price;
- `supplemental-line` может добавить только namespaced `CHARGE` или
  `ENTITLEMENT` leaf под ROOT; key детерминирован, output schema
  зарегистрирована, ROOT/COMPONENT и существующие lines неизменяемы;
- `pricing-adjustment` возвращает proposal, но только Pricing создает
  authoritative adjustment;
- `fulfillment-obligation` может добавить только зарегистрированный obligation
  type и не удаляет provider obligations; slot не получает final Pricing
  result, а executor позднее получает весь sealed contract.

Output extension не применяется напрямую как JSON patch. Каждый slot имеет
versioned Zod input/output schema, byte/depth/count limits, conflict resolver и
failure policy. Required failure отклоняет compilation, optional failure
фиксируется в trace и не меняет результат.

### UI extensions

`editorComponent` и `storefrontComponent` являются ссылками на
зарегистрированные UI extensions, а не путями для динамического import.
Регистрация фиксирует App/version, asset digest, sandbox policy, разрешенный API
и fallback. Unavailable component не делает Product data нечитаемыми: Admin
показывает common shell и состояние provider.

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
PRODUCT_TYPE_DEFINITION_SUSPENDED
PRODUCT_TYPE_DEFINITION_RETIRED
PRODUCT_PROVIDER_RESOURCE_MISSING
PRODUCT_PROVIDER_RESOURCE_REVISION_MISMATCH
PRODUCT_PROVIDER_ROUTE_REVISION_MISMATCH
```

### Publication validation

Перед публикацией Catalog:

1. загружает exact ProductTypeDefinition revision;
2. проверяет, что definition `ACTIVE`, а installation/provider доступны;
3. загружает exact ProviderProductResourceRef;
4. проверяет core product invariants;
5. проверяет все `REQUIRED` features;
6. вызывает provider validation для exact resource revision;
7. проверяет compile binding и pinned route revision;
8. сохраняет validation result со всеми revisions/digests;
9. публикует только при отсутствии ошибок.

Изменение данных после validation инвалидирует result через revision.

Validation result pin-ит Product revision, definition revision, resource
revision/digest, manifest/effective manifest hashes, route revision и schema
hashes. Любое несовпадение делает result stale.

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

Для Product `purchasableId` разрешается в exact `publishedRevision`. Draft
`currentRevision` никогда не участвует в Storefront compile.

## Purchase compiler

Checkout владеет Commerce Function target:

```ts
{
  target: "checkout.purchase.compile.v1",
  owningService: "checkout",
  executionMode: "SINGLE",
  allowMultipleAppImplementations: false,
  appFailureMode: "REQUIRED",
  nativeImplementations: [{
    implementationId: "checkout.purchase.native-dispatcher.v1",
    action: "checkout.compileNativePurchase",
    failureMode: "REQUIRED"
  }]
}
```

В target registry существует ровно одна native implementation — dispatcher.
Регистрировать standard, bundle и другие native providers как несколько native
implementations этого `SINGLE` target запрещено: текущий Function Runner выбрал
бы первую implementation, а не provider из Product definition.

Dispatcher получает pinned `ProductTypeProviderRef`, находит provider в
статическом native registry и вызывает broker action этого provider. Неизвестный
`providerKey`, несовпадение service или typeKey отклоняются до вызова.

Для App-backed definition Checkout передает ровно один App function binding.
Function Runner в режиме `SINGLE` выбирает его вместо native dispatcher. Ноль
или больше одного App binding являются domain configuration error. Native и App
providers возвращают одинаковый `ProviderPurchaseOutputV1`.

Compile input содержит:

- Store ID;
- exact ProductTypeDefinition revision и snapshots;
- exact ProviderProductResourceRef;
- purchasable reference;
- quantity;
- selection;
- currency и locale;
- customer segment без лишней PII;
- pinned price/rule/inventory source revisions либо quote context;
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

Provider не выбирает route из input и не может переназначить provider identity.
Checkout строит binding из Catalog definition, а Apps проверяет installation,
function key и pinned route revision.

Для App update и pinned obligations route discovery разрешает exact tuple
`(installationId, functionKey, routeRevision)`, а не только current route по
installation. Apps хранит immutable route/runtime revisions до окончания
retention. Текущий resolver, который индексирует единственный route по
`installationId`, должен быть изменен до внедрения App product types; временный
fallback на current route запрещен.

## PurchaseCompilation

### Верхнеуровневый контракт

```ts
type PurchaseCompilationV1 = Readonly<{
  compilationVersion: 1;
  compilationRevision: string;

  identity: PurchaseIdentity;
  provider: PurchaseProviderSnapshot;
  selection: PurchaseSelectionSnapshot;

  lines: readonly PurchaseCompilationLine[];
  appliedRules: readonly AppliedPurchaseRule[];

  basePricing: PurchaseBasePricingProposal;
  fulfillment: PurchaseFulfillmentProposal;
  payment: PurchasePaymentProposal;
  quote: PurchaseQuoteSnapshot;

  execution: PurchaseExecutionSnapshot;
  extensionOutcomes: readonly PurchaseExtensionOutcome[];
}>;

type ProviderPurchaseOutputV1 = Readonly<{
  outputVersion: 1;
  normalizedSelection: JsonValue;
  lines: readonly ProviderPurchaseLineOutput[];
  appliedRules: readonly AppliedPurchaseRule[];
  basePricing: PurchaseBasePricingProposal;
  fulfillment: ProviderPurchaseFulfillmentOutput;
  payment: PurchasePaymentProposal;
  quote: PurchaseQuoteSnapshot;
}>;
```

Runner возвращает `unknown`. Checkout декодирует его как
`ProviderPurchaseOutputV1`, применяет platform validation и extension pipeline,
а затем создает immutable `PurchaseCompilationV1`. Identity, provider snapshot,
selection schema/digest и execution trace добавляются Checkout из trusted input
и Function Runner trace. Provider не может назначить их,
`compilationRevision` или extension outcomes. Даже native provider не может
обойти общие invariants.

```ts
type PurchaseExtensionOutcome = Readonly<{
  slot: ProductExtensionSlot;
  bindingId: string;
  implementationRevision: string;
  status: "APPLIED" | "SKIPPED_OPTIONAL_FAILURE";
  inputDigest: string;
  outputDigest: string | null;
  namespacedOutput: JsonValue | null;
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
  effectiveManifestHash: string;
  configurationRevision: number;

  providerResourceId: string;
  providerResourceRevision: string;
  providerResourceDigest: string;
}>;
```

### Provider snapshot

```ts
type PurchaseProviderSnapshot =
  | Readonly<{
      kind: "NATIVE";
      service: string;
      providerKey: string;
      implementationId: string;
    }>
  | Readonly<{
      kind: "APP";
      appCode: string;
      appVersion: string;
      installationId: string;
      functionKey: string;
      capabilityRouteId: string;
      routeRevision: string;
    }>;
```

### Selection snapshot

```ts
type PurchaseSelectionSnapshot = Readonly<{
  schemaKey: string;
  schemaVersion: number;
  schemaHash: string;
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

type PurchaseCompilationLine = Readonly<{
  key: string;
  parentKey: string | null;
  role: PurchaseLineRole;

  source:
    | Readonly<{ kind: "PRIMARY_PROVIDER" }>
    | Readonly<{ kind: "EXTENSION"; bindingId: string }>;

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

  basePrice: {
    unitMinor: number;
    compareAtUnitMinor: number | null;
  };

  fulfillment: {
    physical: boolean;
    inventoryTracked: boolean;
  };

  providerData?: {
    schemaKey: string;
    schemaVersion: number;
    schemaHash: string;
    data: JsonValue;
  };
}>;

type ProviderPurchaseLineOutput = Omit<
  PurchaseCompilationLine,
  "source"
>;
```

Line keys генерируются provider детерминированно из нормализованного выбора.
Нельзя коррелировать component output по позиции массива.
Checkout добавляет trusted `source` из compiler/extension binding.

Platform validation применяет следующие invariants:

- line count, nesting depth и serialized size не превышают target limits;
- keys уникальны и соответствуют platform key format;
- существует ровно одна `ROOT` line с `parentKey = null`;
- каждая другая line имеет существующий parent;
- граф ацикличен и все lines достижимы от ROOT;
- `COMPONENT` может быть дочерней ROOT или COMPONENT;
- `CHARGE` и `ENTITLEMENT` являются leaves;
- quantity каждой line является положительным safe integer;
- quantity ROOT соблюдает manifest minimum/maximum/increments;
- component quantity проверяется provider rules и platform limits;
- money является неотрицательным safe integer;
- `compareAtUnitMinor`, если задан, не меньше `unitMinor`;
- provider не может сослаться на product/resource другого Store;
- ROOT display берется Checkout из published Product revision и не доверяется
  provider output;
- component display допускается только из provider-owned resource и проходит
  sanitization/size limits;
- `providerData` всегда имеет зарегистрированные schema key/version/hash;
- display URL не может быть временным signed URL; сохраняется durable media
  reference либо стабильный public URL.

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
Checkout проверяет, что `sourceRef/ruleRevision` принадлежат provider resource
или разрешенному extension binding. Произвольная ссылка на platform promotion
отклоняется.

В Order сохраняется не только список rule IDs, но и результат их применения.
Здесь находятся только provider-owned composition/eligibility/base-price rules.
Platform discounts и promotions сохраняются в
`PurchasePricingSnapshot.adjustments`; provider не может выдавать их за свои.

### Base pricing proposal

```ts
type PurchaseBasePricingProposal = Readonly<{
  currencyCode: string;

  allocations: readonly {
    lineKey: string;
    quantity: number;
    unitMinor: number;
    subtotalMinor: number;
  }[];
}>;
```

Provider предлагает base price и распределение. Он не создает platform
discounts и не определяет authoritative total.

Checkout/Pricing проверяют:

- ISO currency;
- safe integer minor units;
- отсутствие запрещенных отрицательных значений;
- уникальность allocation для каждой priced line;
- `subtotalMinor = unitMinor * quantity` без overflow;
- совпадение allocation с line base price;
- допустимость payment mode;
- platform pricing invariants.

### Quote

```ts
type PurchaseQuoteSnapshot = Readonly<{
  calculatedAt: string;
  validUntil: string | null;
  sourceRevisions: readonly {
    sourceType: string;
    sourceId: string;
    revision: string;
  }[];
}>;
```

Если цена зависит от mutable external state, `validUntil` обязателен. Finalize
отклоняет истекший quote и запускает новый compile.

### Fulfillment

```ts
type PurchaseFulfillmentProposal = Readonly<{
  mode: "PHYSICAL" | "DIGITAL" | "MIXED" | "NONE";

  inventoryRequirements: readonly {
    lineKey: string;
    ownerService: "catalog";
    inventoryItemId: string;
    inventoryItemRevision: string;
    quantity: number;
  }[];

  obligations: readonly {
    key: string;
    typeKey: string;
    typeVersion: number;
    trigger: "ORDER_CONFIRMED" | "PAYMENT_CAPTURED";
    executorProvider: PurchaseProviderSnapshot;
    payloadSchemaHash: string;
    payload: JsonValue;
    piiRefs?: readonly string[];
  }[];
}>;

type ProviderPurchaseFulfillmentOutput = Readonly<{
  mode: "PHYSICAL" | "DIGITAL" | "MIXED" | "NONE";
  inventoryRequirements:
    PurchaseFulfillmentProposal["inventoryRequirements"];
  obligations: readonly {
    key: string;
    typeKey: string;
    typeVersion: number;
    trigger: "ORDER_CONFIRMED" | "PAYMENT_CAPTURED";
    payloadSchemaHash: string;
    payload: JsonValue;
    piiRefs?: readonly string[];
  }[];
}>;
```

Obligations описывают будущую работу, но не исполняются в compiler. Checkout
добавляет `executorProvider` из trusted compiler binding или extension binding;
provider output не может выбрать произвольного executor.

```ts
type PurchasePaymentProposal = Readonly<{
  mode: "IMMEDIATE" | "DEFERRED" | "FREE";
}>;
```

Payment proposal обязан совпадать с effective manifest. Provider не выбирает
payment provider, payment method, authorization или capture semantics.

### Registries requirements и obligations

Свободные `inventoryItemId`, `typeKey` и payload не являются доверенными.
Платформа имеет два статически зарегистрированных каталога:

```ts
type InventoryRequirementPolicy = Readonly<{
  ownerService: "catalog";
  validateReferenceAction: string;
  reserveAction: string;
  releaseAction: string;
  maxQuantity: number;
}>;

type FulfillmentObligationTypeDefinition = Readonly<{
  typeKey: string;
  typeVersion: number;
  ownerService: string;
  payloadSchemaHash: string;
  allowedProviderKinds: readonly ("NATIVE" | "APP")[];
  executeTarget: string;
  allowedTriggers: readonly ("ORDER_CONFIRMED" | "PAYMENT_CAPTURED")[];
  failureMode: "REQUIRED" | "OPTIONAL";
  retentionMode: "PLATFORM_COMMAND" | "PINNED_APP_RUNTIME";
}>;
```

Catalog Inventory проверяет Store, resource relationship, revision и право
provider ссылаться на каждый inventory item. Факт существования item
недостаточен.

Каждый requirement ссылается на существующую physical/inventory-tracked line.
Одинаковые `(lineKey, inventoryItemId, inventoryItemRevision)` агрегируются
детерминированно, а итоговая quantity проверяется на overflow и platform limit.

Obligation принимается только если type/version зарегистрированы,
executorProvider получен из trusted binding, payload проходит pinned schema, а
`piiRefs` принадлежат тому же Store и purpose. Provider не может вернуть
произвольный action/workflow name.

Value-bearing issuance, включая gift card, использует только
`PAYMENT_CAPTURED`. `ORDER_CONFIRMED` допускается registry только для `FREE`
purchase либо действий, которым оплата не требуется. Deferred payment не
исполняет `PAYMENT_CAPTURED` obligations до фактического capture.

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
`completedAt`, duration и deadline не входят в business digest compilation.

## PurchaseContract

Checkout создает contract только после extension pipeline, Pricing и всех
platform validations:

```ts
type PurchaseContractV1 = Readonly<{
  contractVersion: 1;

  compilation: PurchaseCompilationV1;
  pricing: PurchasePricingSnapshot;
  validation: PurchaseValidationSnapshot;
  seal: PurchaseContractSeal;
}>;

type PurchasePricingSnapshot = Readonly<{
  currencyCode: string;

  merchandiseSubtotalMinor: number;
  discountMinor: number;
  merchandiseTotalMinor: number;

  lineAllocations: readonly {
    lineKey: string;
    baseSubtotalMinor: number;
    discountMinor: number;
    finalSubtotalMinor: number;
  }[];

  adjustments: readonly {
    key: string;
    typeKey: string;
    sourceRef: string;
    amountMinor: number;
  }[];

  pricingRevision: string;
}>;

type PurchaseValidationSnapshot = Readonly<{
  schemaVersion: 1;
  productRevision: number;
  catalogInventoryRevision: string;
  definitionStatusRevision: number;
  extensionBindingSetRevision: string;
  validatedAt: string;
}>;

type PurchaseContractSeal = Readonly<{
  algorithm: "SHA-256";
  compilationDigest: string;
  pricingDigest: string;
  contractDigest: string;
  sealedAt: string;
}>;
```

`contractDigest` вычисляется по canonical
`{ contractVersion, compilation, pricing, validation }`. Объект `seal`, включая
`sealedAt` и сам digest, в hash input не входит.

Pricing является единственным владельцем discounts, adjustments, final line
allocations и merchandise total. Checkout является владельцем sealed contract.
Provider и extensions не изменяют `PurchasePricingSnapshot`.

Purchase pricing охватывает только merchandise. Tax, shipping, duties, tips и
payment fees принадлежат другим checkout stages и не входят в
`PurchaseContractV1`. Order сохраняет их отдельными versioned snapshots.

Pricing invariants:

- ровно одна allocation для каждой priced line;
- `baseSubtotal - discount = finalSubtotal`;
- сумма line base subtotal равна `merchandiseSubtotalMinor`;
- сумма line discounts равна `discountMinor`;
- сумма final subtotal равна `merchandiseTotalMinor`;
- adjustments имеют уникальные keys и объясняют discount;
- сумма adjustment amounts равна `discountMinor`;
- currency совпадает с accepted Checkout currency;
- все операции выполняются safe-integer arithmetic без overflow.

## Checkout lifecycle

### Добавление линии

1. Checkout принимает `PurchaseSelectionInput`.
2. Разрешает purchasable и exact type definition.
3. Проверяет, что definition и provider активны.
4. Запускает purchase compiler и получает `ProviderPurchaseOutput`.
5. Валидирует provider output.
6. Выполняет extension pipeline и создает `PurchaseCompilation`.
7. Получает authoritative Pricing result.
8. Проверяет Catalog Inventory availability без reservation side effect.
9. Запечатывает `PurchaseContract`.
10. Сохраняет contract revision и materialized checkout lines.

### Line identity

Одинаковый `purchasableId` не означает одинаковую линию.

```ts
lineIdentityDigest = hash({
  typeKey,
  purchasableId,
  selectionDigest,
  mergeDiscriminator,
});
```

Bundle с разным составом и gift cards с разными номиналами или получателями не
объединяются.

`mergeDiscriminator` создается Checkout из разрешенной line merge policy.
`clientLineKey` используется только для correlation ответа и не участвует в
identity. Клиент не может принудительно объединить или разделить lines.

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

1. Checkout берет optimistic lock на checkout revision.
2. Получает finalization permit для exact Product/definition/installation
   revisions.
3. Выполняет финальную compile и extension pipeline.
4. Pricing создает authoritative pricing snapshot.
5. Checkout запечатывает новый `PurchaseContract`.
6. Catalog Inventory резервирует exact requirements по contract digest.
7. Orders идемпотентно создает Order с exact sealed contract.
8. Checkout фиксирует completion и reservation ownership.
9. Finalization permit переводится в terminal state.

Шаги координируются DBOS saga. Идемпотентность выводится из
`storeId + checkoutId + checkoutRevision + contractDigest`, а не из случайного
execution ID.

Compensation matrix:

- failure до reservation не требует compensation;
- failure после reservation, но до Order creation освобождает reservation;
- повторный `createOrder` с тем же key возвращает существующий Order;
- после успешного Order creation reservation передается Order и не
  освобождается Checkout compensation;
- неизвестный outcome разрешается запросом по idempotency key, а не повторным
  созданием с новым key.

Перед reservation повторно проверяются quote expiry и inventory revisions.
Изменение любого pinned source отклоняет finalize и требует нового contract.
Дальнейшее отображение Order не вызывает provider.

### Finalization permit и lifecycle race

Finalization permit является Store-scoped durable record:

```ts
type PurchaseFinalizationPermit = Readonly<{
  id: string;
  storeId: string;
  checkoutId: string;
  checkoutRevision: string;
  productId: string;
  productRevision: number;
  definitionId: string;
  definitionRevision: number;
  definitionStatusRevision: number;
  installationId: string | null;
  state: "ACTIVE" | "COMPLETED" | "FAILED" | "EXPIRED";
  expiresAt: string;
}>;
```

Создание permit и проверка definition state являются одной serialized
Catalog operation. Переход App в `UNINSTALLING` устанавливает lifecycle fence:
после него новые permits для installation не создаются. Уже созданные permits
либо завершаются, либо истекают; uninstall ожидает их terminal state перед
удалением routes.

Это задает линейную точку:

- если lifecycle fence записан первым, новая покупка запрещена;
- если permit записан первым, эта конкретная finalize может завершиться;
- Listing projection и cache не участвуют в решении.

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

Idempotency key obligation:

```text
storeId + orderId + contractDigest + obligationKey
```

Для `PLATFORM_COMMAND` contract содержит все business facts, и platform-owned
executor не вызывает старую App. Для `PINNED_APP_RUNTIME` Apps service обязан
удерживать exact runtime artifact, manifest snapshot и restricted execution
route до terminal status всех obligations.

Suspend запрещает новые покупки, но existing pinned obligations продолжают
исполняться через отдельный fulfillment execution path. Этот path принимает
только Order obligation envelope и не возвращает App обычные revoked scopes.

Обычный uninstall блокируется, пока существует хотя бы одна non-terminal
`REQUIRED` obligation с `PINNED_APP_RUNTIME`. Optional obligation должна быть
явно canceled по policy до uninstall. Force uninstall, который молча теряет
required obligation, запрещен.

Order чтение никогда не зависит от App runtime.

## GraphQL и Federation

GraphQL schema не меняется на каждую Store installation.

Core API предоставляет стабильные типы:

```graphql
type ProductType {
  key: String!
  definitionId: ID!
  definitionRevision: Int!
  manifestVersion: String!
  manifestHash: String!
  effectiveManifest: JSON!
  providerStatus: ProductTypeProviderStatus!
}

type Product {
  id: ID!
  type: ProductType!
  merchantStatus: ProductMerchantStatus!
  effectiveAvailability: ProductEffectiveAvailability!
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
provider/platform validation. Для immutable schemas дополнительно обязателен
`schemaHash`.

Admin может получить opaque provider resource status и revision, но raw
database locator, route action и installation secrets в GraphQL не выдаются.
Storefront возвращает только Products с effective availability `AVAILABLE`.

## Владение данными по сервисам

### Catalog

Владеет:

- Product shell;
- ProductTypeDefinition и immutable revisions;
- ссылкой Product на definition и provider resource;
- native product data;
- feature policy enforcement;
- publication validation;
- provider availability projection;
- native bundle definitions и immutable rule revisions.

Catalog не владеет App provider resource data.

### Apps

Владеет:

- App manifests и snapshots;
- App installation lifecycle;
- product type contributions;
- capability routes;
- App configuration snapshots;
- route and installation revisions.

Apps не владеет `ProductTypeDefinition` и `ProductShell`.

### Checkout

Владеет:

- PurchaseSelection;
- compiler orchestration;
- PurchaseCompilation validation;
- final contract sealing;
- mutable contract revisions;
- materialized cart lines;
- checkout pricing state.

### Pricing

Владеет:

- platform money invariants;
- discounts и adjustments;
- финальным pricing result;
- распределением сумм согласно разрешенной стратегии.

### Catalog Inventory

Владеет:

- availability;
- reservations;
- stock movements;
- inventory requirements execution.

В текущей service topology Inventory является bounded module Catalog service, а
не отдельным microservice. Выделение отдельного Inventory service требует
отдельного ADR. Catalog Inventory не интерпретирует bundle rules или gift card
configuration.

### Orders

Владеет:

- immutable final PurchaseContract snapshot;
- order event history;
- fulfillment obligation state и execution;
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
- Provider resource lookup всегда включает `storeId`; для App также
  `installationId`.
- Catalog проверяет provider resource ownership через provider action, а не по
  форме resource ID.
- Contract target задает max lines, tree depth, rules, obligations, PII refs,
  input bytes и output bytes.
- Contract и Order event не содержат secrets, access tokens, raw recipient PII
  или временные signed URLs.
- Canonical snapshots encrypted at rest по общей storage policy; digest не
  используется как средство сокрытия данных.

## Версионирование

Независимо версионируются:

- manifest schema;
- manifest version/hash;
- product type definition revision;
- definition status revision;
- Product revision и published revision pointer;
- provider product resource revision/schema hash;
- provider configuration revision;
- selection schema;
- purchase contract;
- rule revisions;
- App version;
- capability route revision;
- App update cutover revision;
- finalization permit;
- checkout/order event contract.

Любой snapshot canonicalized перед hashing. Digest используется для сравнения и
аудита, но не заменяет сохранение необходимых business facts.

## Изменение manifest и definition

Manifest нельзя заменить in-place для существующих Products.

Upgrade выполняется отдельной операцией:

```ts
type ProductTypeDefinitionUpgrade = Readonly<{
  definitionId: string;
  fromDefinitionRevision: number;
  fromManifestHash: string;
  toManifestHash: string;
  scope:
    | Readonly<{ mode: "ALL_USING_REVISION" }>
    | Readonly<{
        mode: "EXPLICIT";
        productIds: readonly string[];
      }>;
  validationResultRef: string;
}>;
```

Большой upgrade выполняется server-side job с paginated checkpoints; broker
envelope не содержит неограниченный массив Product IDs. Explicit scope
ограничен platform batch limit.

Upgrade отклоняется, если:

- новая версия отключает feature, для которой существуют данные;
- required feature отсутствует;
- purchase semantics несовместимы с product configuration;
- provider route недоступен;
- migration требует неявного удаления данных.

Удаление данных возможно только отдельной явно подтвержденной операцией. В
текущем greenfield-проекте не создается compatibility или backfill path для
старой модели.

Upgrade создает новую definition revision и новые provider resource revisions,
если этого требует provider schema. Product refs переключаются только для
успешно validated Products. Cutover выполняется bounded Catalog batches; каждый
batch переключается одной транзакцией. Большой `ALL_USING_REVISION` upgrade
может состоять из нескольких явно видимых batches, пока Apps удерживает старую
и новую route revisions. Неуспешный Product остается на старой revision и
требует отдельного решения merchant; молчаливое переключение запрещено.

## Update, suspend, uninstall и повторная установка App

### Update

App update не заменяет manifest, route или provider schema in-place.

1. Apps выполняет preflight нового manifest и сохраняет immutable snapshot.
2. Installation переходит в `UPDATING`; current pinned route revisions остаются
   доступны для Products, которые еще не участвуют в cutover.
3. Старый runtime и routes остаются доступными для rollback и pinned
   obligations.
4. App migration workflow создает новые provider resource revisions.
5. Catalog создает новые definition revisions и Product revisions.
6. Catalog выполняет полную publication validation нового set.
7. Apps создает новый immutable route revision в состоянии `PREPARED`, не
   удаляя старый.
8. Для bounded batch устанавливается lifecycle fence, новые permits для его
   definitions запрещаются, существующие завершаются.
9. Catalog одной транзакцией переключает definition refs и `publishedRevision`
   validated Products на новый route revision. Это является cutover point.
10. Apps помечает новый route revision current, сохраняя старый для pinned
   executions согласно retention.
11. После завершения всех batches installation возвращается в `ACTIVE`.

Если ошибка происходит до первого cutover, новые revisions остаются
неактивными, installation возвращается к старому runtime/route, а Products
продолжают использовать старые published revisions. Если часть явно видимых
batches уже переключена, они остаются на новых revisions, остальные — на
старых; installation получает `UPDATE_FAILED`, а Apps удерживает оба runtimes
до resume/rollback. После cutover rollback является новым явным update с
новыми revisions; in-place rollback запрещен.

Межсервисной SQL-транзакции нет. Безопасность cutover обеспечивается тем, что
Apps умеет исполнять обе immutable route revisions, а Catalog начинает выдавать
новую только после ее `PREPARED`. Потеря coordinator после шага 9 безопасно
возобновляется по cutover revision.

Breaking update, который не может мигрировать все выбранные Products, не
активируется частично. Merchant должен исключить/архивировать несовместимые
Products либо отклонить update. Это operational migration существующих
provider-owned aggregates, а не compatibility adapter в Checkout/Orders.

После cutover Checkout инвалидирует затронутые cart lines и пересчитывает их
по новой published Product revision. Если старая selection не проходит новую
schema, line получает `INVALID_SELECTION` и требует нового выбора покупателя.
Молчаливая трансляция selection или использование старого успешного contract
для finalize запрещены.

### Suspend

Apps lifecycle переводит installation в `SUSPENDING` и устанавливает lifecycle
fence. Новые permits запрещаются, выданные permits завершаются или истекают,
после чего обычные capability routes отключаются. Durable workflow вызывает
Catalog action:

```ts
type SetAppProductProviderStatusInput = Readonly<{
  storeId: string;
  installationId: string;
  operationId: string;
  status: "SUSPENDED" | "RETIRED";
  reason: "APP_SUSPENDED" | "APP_UNINSTALLED";
}>;
```

Catalog идемпотентно переводит связанные definitions в `SUSPENDED`, обновляет
availability projection и публикует invalidation для Listing/Checkout.
Products не меняют merchant status. Resume:

1. включает installation runtime;
2. проверяет contribution/route compatibility;
3. валидирует definition и provider resources;
4. создает новую validation result;
5. переводит только успешно validated definitions в `ACTIVE`.

### Uninstall

Uninstall выполняется DBOS workflow:

1. Apps атомарно переводит installation в `UNINSTALLING` и устанавливает
   lifecycle fence.
2. Новые purchases запрещаются; ранее выданные finalization permits завершаются
   через restricted route.
3. Orders повторно проверяет non-terminal pinned obligations после drain.
4. При blocker операция завершается `UNINSTALL_FAILED`; definitions остаются
   `SUSPENDED`, obligation execution path сохраняется.
5. Catalog идемпотентно переводит связанные definitions в `RETIRED`.
6. Listing удаляет Products из Storefront projection.
7. Checkout помечает связанные lines `PROVIDER_UNAVAILABLE`.
8. Обычные capability routes отключаются.
9. App uninstall workflow может tombstone-ить provider data и выполнить
   недеструктивную очистку.
10. Apps удаляет обычные routes/scopes и фиксирует `UNINSTALLED`.

Truth находится в installation/definition states; перечисление и массовая
запись каждого Product не нужны. Catalog action возвращает affected count и
definition IDs, но не передает массив Product IDs через broker.

После uninstall:

- Product shell и merchant content остаются доступны в Admin;
- provider section read-only и может быть недоступна;
- publication и purchase запрещены;
- Orders полностью читаются;
- App data физически не удаляются автоматически.

`purgeAppData` является отдельной destructive operation. Она разрешена только
после retention period, отсутствия checkout references и terminal status всех
obligations. Purge tombstone-ит provider resources и сохраняет минимальные
audit references. App никогда не удаляет Product shell.

### Повторная установка

Новая installation получает новый `installationId` и не активирует старые
definitions/Products автоматически. `RETIRED` revision необратима.

Восстановление выполняется явным rebind/upgrade use case:

1. проверяется тот же `appCode` и совместимый `typeKey`;
2. App мигрирует или импортирует provider resource;
3. Catalog создает новую definition revision с новым provider ref;
4. каждый Product получает новую resource revision;
5. выполняется publication validation;
6. merchant отдельно подтверждает возврат в Storefront.

## Failure semantics

### Provider unavailable

- Draft остается доступным для чтения.
- Редактирование provider-owned configuration блокируется.
- Публикация и новые покупки запрещены.
- Существующая checkout line помечается invalid при recalculation.
- Последний успешный contract может отображаться только как historical cart
  snapshot и не может быть finalized.
- Order остается полностью читаемым.

### Invalid provider output

Output отклоняется целиком. Частичные lines, price или obligations не
сохраняются.

### Lifecycle fence или истекший permit

Новый compiler execution не запускается. Active finalize завершается
controlled failure, reservation compensation выполняется по saga. Клиент
получает stable domain error и должен перечитать Checkout; автоматический retry
с новым permit во время fence запрещен.

### Optional extension failure

Поведение определяется slot policy. Ошибка optional extension фиксируется в
trace, но не изменяет compilation, если slot допускает продолжение.

### Required extension failure

Compile pipeline завершается ошибкой, новый contract не сохраняется.

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

Provider aggregate хранится в `catalog.standard_product`. Compilation содержит
одну root line. Pricing создает final allocation, после чего Checkout
запечатывает PurchaseContract.

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

Provider aggregate хранится в `catalog.bundle_product` и связанных bundle
tables. Compilation содержит:

- root line bundle;
- component lines;
- normalized selections по group/item keys;
- configuration и rule revisions;
- результаты dependency и pricing rules;
- base allocations;
- inventory requirements для components.

Pricing создает authoritative discounts/allocations независимо от bundle
provider.

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

Provider aggregate хранится bundled App в `app_gift_cards.*` либо external App
в собственной базе. Catalog сохраняет только ProviderProductResourceRef.
Uninstall App переводит definition в `RETIRED`; gift card Products становятся
`PROVIDER_UNAVAILABLE`, но их shells и созданные Orders не удаляются.

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

### Отдельная database schema на каждую App installation

Приводит к schema explosion, сложным migrations и operational cleanup. Bundled
App использует одну schema на стабильный `appCode`, а isolation Stores и
installations обеспечивается обязательными `store_id/installation_id`,
repository policy и database role.

### Исполнение side effects во время compile

Повторная калькуляция корзины может происходить многократно. Любые issuance,
reservation или notification side effects должны исполняться отдельными
идемпотентными workflows.

## Последовательность внедрения

1. Ввести platform contracts для manifest, Catalog-owned definition,
   ProductShell и ProviderProductResourceRef.
2. Заменить `ProductKind` на `ProductTypeRef`.
3. Разделить common Catalog data и provider-owned aggregates.
4. Создать immutable registries selection/provider schemas, native/App
   contributions, inventory requirements и obligations.
5. Добавить Catalog feature policy enforcement, provider availability projection
   и publication validation.
6. Определить `PurchaseSelection`, `PurchaseCompilationV1`, authoritative
   Pricing snapshot и sealed `PurchaseContractV1`.
7. Зарегистрировать `checkout.purchase.compile.v1` с одной native dispatcher
   implementation.
8. Перевести App route resolution и runtime registry на exact immutable
   route/app revisions.
9. Реализовать native provider registry для standard product и bundle.
10. Заменить текущий inventory offer flow на compilation → Pricing → Catalog
   Inventory requirements.
11. Перевести Checkout events/read models на sealed contract revisions.
12. Перевести Orders на полный immutable PurchaseContract snapshot и order
    creation saga.
13. Добавить DBOS fulfillment obligations и runtime retention.
14. Добавить App product contributions, lifecycle integration и gift card
    reference implementation.
15. Обновить Admin editor для manifest-driven sections и unavailable provider
    states.

На каждом шаге новые схемы вводятся как целевые. Legacy dual-write и adapters не
создаются.

## Критерии готовности

- Новый native/App product type регистрируется без изменения Checkout и Orders.
- Native `SINGLE` target всегда вызывает provider из pinned definition, а не
  первую зарегистрированную implementation.
- Каждый provider хранит product aggregate в своей schema/базе; Catalog не
  выполняет cross-schema reads.
- Отключенная feature недоступна и в UI, и через прямую API mutation.
- Required features проверяются перед публикацией.
- Два одинаковых purchasable с разным selection создают разные lines.
- Bundle contract объясняет состав и примененные правила.
- Gift card не требует variant, inventory или physical data.
- App не может назначить authoritative discount/total или сослаться на чужой
  inventory item.
- Order отображается без вызова Catalog или App.
- App update не меняет смысл уже созданного Order.
- Suspend/uninstall корректно разделяет новые покупки, существующие checkouts,
  Orders и незавершенные obligations.
- Uninstall не меняет merchant publication status, переводит definitions в
  `RETIRED` и делает Products `PROVIDER_UNAVAILABLE`.
- Повторная установка App не активирует старые Products без явного rebind.
- Все provider invocations имеют pinned revisions, limits, digest и trace.
