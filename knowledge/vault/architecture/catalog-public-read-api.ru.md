---
tags:
  - architecture
  - catalog
  - inter-service
  - read-api
  - type-resolver
related:
  - architecture/overview
  - architecture/decisions
  - packages/shared-kernel/service-broker
  - packages/type-resolver/index
  - packages/type-resolver/executor
  - patterns/federation
---

# Catalog Product Read API

## Назначение

`Catalog Product Read API` - это межсервисный read API каталога для получения снимков продуктов через broker action с GraphQL-like selection semantics.

API нужен сервисам, которым требуется читать catalog data, но нельзя:

- читать таблицы `catalog` напрямую;
- импортировать catalog repositories или доменные модели;
- получать полную внутреннюю доменную модель продукта;
- делать ad-hoc API под один внешний сценарий;
- изобретать DTO shape, который расходится с admin GraphQL contract.

Основной use case: межсервисное получение product snapshot через стабильный broker action с явным selection contract.

Ключевое правило формы данных:

- snapshot продукта должен повторять `Product` shape из `admin/schema.graphql`;
- имена полей snapshot должны совпадать с GraphQL field names;
- nested objects должны повторять соответствующие GraphQL types (`ProductMediaItem`, `File`, `VariantConnection`, `ProductFeature`, `ProductPriceRange` и т.д.);
- args в broker selection должны повторять query arguments из admin GraphQL schema;
- broker contract не должен возвращать старую альтернативную форму вроде `productId`, `status`, `primaryImage`, `attributes`, `currencyCode`, `minAmountMinor`.

Важное правило доступности:

- если продукта нет в рамках `storeId`, он не возвращается в `products`;
- если продукт существует, но не опубликован, он возвращается как обычный admin-compatible snapshot;
- состояние публикации выражается полями `publishedAt` и `isPublished`, а не отдельным broker-only `status`;
- состояние публикации не создает специальный result-state.

## Владелец данных

`catalog` является source of truth для:

- products;
- variants;
- categories;
- tags;
- options;
- features;
- product publication state;
- media assignments, связанные с продуктом.

Другие сервисы не владеют catalog domain data.

## Принцип API

API должен работать по смыслу как GraphQL resolver:

- input содержит `storeId`, набор product IDs и selection;
- selection описывает, какие поля нужно вернуть;
- `catalog` резолвит только запрошенные fields и relations;
- response содержит только запрошенные поля и обязательные wrapper/result поля;
- вложенные поля возвращаются только если они явно запрошены в relation selection.

Реализация внутри `catalog` может использовать `@shopana/type-resolver`, но broker contract не должен зависеть от этой библиотеки.

Не рекомендуется делать:

```ts
catalog.getProductForSpecificScenario
catalog.getProductForSpecificProjection
catalog.getProductDomainModel
catalog.getProductWithEverything
```

## Broker Action

```ts
catalog.getProductSnapshots
```

Action должна поддерживать bulk-запросы. Контракт принимает массив `productIds`.

Название сохраняет слово `Snapshots`, потому что результат является снимком состояния продукта на момент чтения. При этом snapshot shape не фиксирован целиком: он определяется `selection`.

## Broker Types

Контракт broker action должен жить в `packages/broker-types/src/actions/catalog.ts`.

Типы должны быть объявлены явно в `@shopana/broker-types`. Нельзя импортировать или re-export типы из `@shopana/type-resolver`, GraphQL packages или catalog implementation modules.

Причины:

- `@shopana/broker-types` должен оставаться стабильным межсервисным DTO package;
- broker payload должен быть полностью сериализуемым;
- internal resolver library является implementation detail сервиса `catalog`;
- изменение `@shopana/type-resolver` не должно становиться breaking change для broker contract.

## Input Contract

Root input содержит service boundary параметры и bulk lookup по admin-compatible product ID.

```ts
export interface GetProductSnapshotsParams {
  storeId: string;
  productIds: string[];
  selection: ProductSnapshotSelection;
}
```

Правила:

- `storeId` обязателен для multi-tenancy и изоляции данных.
- `storeId` является tenant boundary для этого read API. `organizationId` не входит в контракт, потому что продуктовые данные каталога store-scoped, а broker action должна фильтровать чтение по `storeId`.
- `productIds` всегда массив, даже если нужен один продукт.
- `productIds` соответствует admin `CatalogQuery.product(id: ID!)` для bulk-запроса по ID. Это не search/list API и не замена `CatalogQuery.products(...)`.
- `productIds` должен быть дедуплицирован при чтении. В result каждый `id` должен встречаться не более одного раза.
- `selection` обязателен. Пустой selection является невалидным input.
- Максимальный bulk batch должен быть зафиксирован реализацией. Рекомендуемый стартовый лимит: `100` product IDs.

Если в будущем нужен broker list/read API, он должен повторять args `CatalogQuery.products`:

```ts
export interface CatalogProductsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  where?: ProductWhereInput;
  orderBy?: ProductOrderByInput[];
  meta?: ProductProductsMetaInput;
}
```

`getProductSnapshots` не принимает эти args, потому что его root lookup уже задан через `productIds`.

Locale/currency не оформляются как broker `args`, пока они не являются GraphQL query arguments для `CatalogQuery.product`. Если реализации нужен request context для локализации или выбора валюты, этот context должен быть отдельным service-level параметром или выводиться из `storeId`, но не смешиваться с GraphQL-like `args`.

## Selection Contract

Selection contract должен повторять shape `QueryArgs` из `@shopana/type-resolver`, но быть product-specific и явно типизированным.

Нельзя использовать универсальный `fields: string[]` без ограничений на разрешенные поля. Нельзя пропускать через broker внутренний `QueryArgs` из `@shopana/type-resolver`.

Raw shape библиотеки:

```ts
type QueryArgs<TArgs = unknown> = {
  fields?: string[];
  populate?: { [fieldName: string]: QueryArgs };
  args?: TArgs;
  fieldName?: string;
};
```

Broker shape должен быть тем же по структуре, но с concrete field unions, concrete populate keys и concrete args. Имена fields и populate keys должны совпадать с `admin/schema.graphql`.

```ts
export interface ProductSnapshotSelection {
  fields?: ProductSnapshotField[];
  populate?: ProductSnapshotPopulate;
  args?: never;
  fieldName?: never;
}

export interface ProductSnapshotPopulate {
  vendor?: VendorSelection;
  variants?: VariantConnectionSelection;
  media?: ProductMediaItemSelection;
  options?: ProductOptionSelection;
  features?: ProductFeatureSelection;
  primaryCategory?: CategorySelection;
  categoryAssignments?: ProductCategoryAssignmentSelection;
  tags?: TagSelection;
  description?: RichTextSelection;
  excerpt?: RichTextSelection;
  seo?: ProductSeoSelection;
  priceRange?: ProductPriceRangeSelection;
}

export type ProductSnapshotField =
  | "id"
  | "kind"
  | "handle"
  | "publishedAt"
  | "isPublished"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "revision"
  | "variantsCount"
  | "title";
```

Root scalar fields повторяют scalar fields `type Product`. Object/list/connection fields задаются только через `populate`.

## Relation Selection Types

### Variants

`Product.variants` должен повторять admin GraphQL field:

```graphql
variants(first: Int, after: String, last: Int, before: String): VariantConnection!
```

```ts
export interface VariantConnectionSelection {
  args?: RelayConnectionArgs;
  fields?: VariantConnectionField[];
  populate?: VariantConnectionPopulate;
  fieldName?: "variants";
}

export interface RelayConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface VariantConnectionPopulate {
  edges?: VariantEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export type VariantConnectionField = "totalCount";

export interface VariantEdgeSelection {
  fields?: VariantEdgeField[];
  populate?: VariantEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type VariantEdgeField = "cursor";

export interface VariantEdgePopulate {
  node?: VariantSelection;
}
```

```ts
export interface VariantSelection {
  fields?: VariantField[];
  populate?: VariantPopulate;
  args?: never;
  fieldName?: "node";
}

export interface VariantPopulate {
  product?: ProductSnapshotSelection;
  price?: VariantPriceSelection;
  priceHistory?: VariantPriceConnectionSelection;
  selectedOptions?: SelectedOptionSelection;
  media?: VariantMediaItemSelection;
}

export type VariantField =
  | "id"
  | "kind"
  | "isDefault"
  | "handle"
  | "externalSystem"
  | "externalId"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "title";
```

Поля `dimensions`, `weight`, `inventoryItem`, `bundleConfiguration` можно добавить только если broker read contract явно расширяется соответствующими admin-compatible nested types. В первой версии product read API они не входят в contract, чтобы не раскрывать inventory/fulfillment internals через product snapshot.

### Price

```ts
export interface ProductPriceRangeSelection {
  fields?: ProductPriceRangeField[];
  populate?: never;
  args?: never;
  fieldName?: "priceRange";
}

export type ProductPriceRangeField =
  | "minPriceAmount"
  | "maxPriceAmount"
  | "currency";

export interface VariantPriceSelection {
  fields?: VariantPriceField[];
  populate?: never;
  args?: never;
  fieldName?: "price";
}

export type VariantPriceField =
  | "id"
  | "currency"
  | "amountMinor"
  | "compareAtMinor"
  | "effectiveFrom"
  | "effectiveTo"
  | "recordedAt"
  | "isCurrent";
```

`ProductPriceRange` повторяет admin fields `minPriceAmount`, `maxPriceAmount`, `currency`. Нельзя возвращать broker-only `minAmountMinor`, `maxAmountMinor`, `currencyCode`.

### Variant Price History

`Variant.priceHistory` должен повторять admin GraphQL field:

```graphql
priceHistory(first: Int, after: String, last: Int, before: String): VariantPriceConnection!
```

```ts
export interface VariantPriceConnectionSelection {
  args?: RelayConnectionArgs;
  fields?: VariantPriceConnectionField[];
  populate?: VariantPriceConnectionPopulate;
  fieldName?: "priceHistory";
}

export type VariantPriceConnectionField = "totalCount";

export interface VariantPriceConnectionPopulate {
  edges?: VariantPriceEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export interface VariantPriceEdgeSelection {
  fields?: VariantPriceEdgeField[];
  populate?: VariantPriceEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type VariantPriceEdgeField = "cursor";

export interface VariantPriceEdgePopulate {
  node?: VariantPriceSelection;
}
```

### Media And File

`Product.media` и `Variant.media` повторяют admin GraphQL types `ProductMediaItem` и `VariantMediaItem`.

```ts
export interface ProductMediaItemSelection {
  fields?: ProductMediaItemField[];
  populate?: ProductMediaItemPopulate;
  args?: never;
  fieldName?: "media";
}

export interface ProductMediaItemPopulate {
  file?: FileSelection;
}

export type ProductMediaItemField = "sortIndex";

export interface VariantMediaItemSelection {
  fields?: VariantMediaItemField[];
  populate?: VariantMediaItemPopulate;
  args?: never;
  fieldName?: "media";
}

export interface VariantMediaItemPopulate {
  file?: FileSelection;
}

export type VariantMediaItemField = "sortIndex";
```

`File` повторяет admin federated `File` shape. Catalog может возвращать только те поля, которые доступны через broker read implementation. Если поле требует обращения в media service, resolver должен делать это явно или не включать поле в contract первой версии.

```ts
export interface FileSelection {
  fields?: FileField[];
  populate?: FilePopulate;
  args?: never;
  fieldName?: "file" | "ogImage";
}

export interface FilePopulate {
  dimensions?: MediaDimensionsSelection;
}

export type FileField =
  | "id"
  | "provider"
  | "url"
  | "mimeType"
  | "ext"
  | "sizeBytes"
  | "originalName"
  | "durationMs"
  | "altText"
  | "sourceUrl"
  | "isProcessed";

export interface MediaDimensionsSelection {
  fields?: MediaDimensionsField[];
  populate?: never;
  args?: never;
  fieldName?: "dimensions";
}

export type MediaDimensionsField = "width" | "height";
```

### Options

```ts
export interface ProductOptionSelection {
  fields?: ProductOptionField[];
  populate?: ProductOptionPopulate;
  args?: never;
  fieldName?: "options";
}

export interface ProductOptionPopulate {
  values?: ProductOptionValueSelection;
}

export type ProductOptionField =
  | "id"
  | "slug"
  | "name"
  | "displayType"
  | "sortIndex";

export interface ProductOptionValueSelection {
  fields?: ProductOptionValueField[];
  populate?: ProductOptionValuePopulate;
  args?: never;
  fieldName?: "values";
}

export interface ProductOptionValuePopulate {
  swatch?: ProductOptionSwatchSelection;
}

export type ProductOptionValueField =
  | "id"
  | "slug"
  | "name"
  | "sortIndex";

export interface ProductOptionSwatchSelection {
  fields?: ProductOptionSwatchField[];
  populate?: ProductOptionSwatchPopulate;
  args?: never;
  fieldName?: "swatch";
}

export interface ProductOptionSwatchPopulate {
  file?: FileSelection;
}

export type ProductOptionSwatchField =
  | "id"
  | "swatchType"
  | "colorOne"
  | "colorTwo"
  | "metadata";
```

### Selected Options

```ts
export interface SelectedOptionSelection {
  fields?: SelectedOptionField[];
  populate?: never;
  args?: never;
  fieldName?: "selectedOptions";
}

export type SelectedOptionField =
  | "optionId"
  | "optionValueId";
```

### Features

`Product.features` повторяет admin GraphQL `ProductFeature`, а не старый broker-only `attributes`.

```ts
export interface ProductFeatureSelection {
  fields?: ProductFeatureField[];
  populate?: ProductFeaturePopulate;
  args?: never;
  fieldName?: "features" | "parent" | "children";
}

export interface ProductFeaturePopulate {
  parent?: ProductFeatureSelection;
  children?: ProductFeatureSelection;
  values?: ProductFeatureValueSelection;
}

export type ProductFeatureField =
  | "id"
  | "slug"
  | "index"
  | "isGroup"
  | "name";

export interface ProductFeatureValueSelection {
  fields?: ProductFeatureValueField[];
  populate?: never;
  args?: never;
  fieldName?: "values";
}

export type ProductFeatureValueField =
  | "id"
  | "slug"
  | "index"
  | "name";
```

### Categories

```ts
export interface CategorySelection {
  fields?: CategoryField[];
  populate?: CategoryPopulate;
  args?: never;
  fieldName?: "primaryCategory" | "category" | "parent" | "children" | "ancestors";
}

export interface CategoryPopulate {
  description?: RichTextSelection;
  excerpt?: RichTextSelection;
  seo?: SeoSelection;
  parent?: CategorySelection;
  children?: CategorySelection;
  ancestors?: CategorySelection;
}

export type CategoryField =
  | "id"
  | "handle"
  | "publishedAt"
  | "isPublished"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "revision"
  | "depth"
  | "path"
  | "name"
  | "defaultSort"
  | "defaultSortDirection";

export interface ProductCategoryAssignmentSelection {
  fields?: ProductCategoryAssignmentField[];
  populate?: ProductCategoryAssignmentPopulate;
  args?: never;
  fieldName?: "categoryAssignments";
}

export type ProductCategoryAssignmentField = "isPrimary";

export interface ProductCategoryAssignmentPopulate {
  category?: CategorySelection;
}
```

### Tags, Vendor, Rich Text, SEO, Page Info

```ts
export interface TagSelection {
  fields?: TagField[];
  populate?: never;
  args?: never;
  fieldName?: "tags";
}

export type TagField =
  | "id"
  | "handle"
  | "createdAt"
  | "name"
  | "productsCount";

export interface VendorSelection {
  fields?: VendorField[];
  populate?: never;
  args?: never;
  fieldName?: "vendor";
}

export type VendorField = "id" | "name";

export interface RichTextSelection {
  fields?: RichTextField[];
  populate?: never;
  args?: never;
  fieldName?: "description" | "excerpt";
}

export type RichTextField = "text" | "html" | "json";

export interface ProductSeoSelection {
  fields?: ProductSeoField[];
  populate?: ProductSeoPopulate;
  args?: never;
  fieldName?: "seo";
}

export interface ProductSeoPopulate {
  ogImage?: FileSelection;
}

export type ProductSeoField =
  | "seoTitle"
  | "seoDescription"
  | "ogTitle"
  | "ogDescription";

export interface SeoSelection {
  fields?: SeoField[];
  populate?: SeoPopulate;
  args?: never;
  fieldName?: "seo";
}

export interface SeoPopulate {
  ogImage?: FileSelection;
}

export type SeoField =
  | "seoTitle"
  | "seoDescription"
  | "ogTitle"
  | "ogDescription";

export interface PageInfoSelection {
  fields?: PageInfoField[];
  populate?: never;
  args?: never;
  fieldName?: "pageInfo";
}

export type PageInfoField =
  | "hasNextPage"
  | "hasPreviousPage"
  | "startCursor"
  | "endCursor";
```

## Selection Rules

- `fields` содержит только scalar/enum fields текущего type.
- Object, list и connection fields задаются только через `populate`.
- `args` имеет concrete type только у тех relation resolvers, где аргументы есть в admin GraphQL schema.
- `Product.variants.args` и `Variant.priceHistory.args` повторяют Relay args `first`, `after`, `last`, `before`.
- `fieldName` повторяет shape `QueryArgs`, но ограничен concrete resolver field name. На root product selection используется `fieldName?: never`.
- Relation без вложенных `fields` или nested selection считается невалидной.
- Unknown field должен приводить к `INVALID_CATALOG_PRODUCT_READ_INPUT`.
- Если поле не запрошено, resolver не должен его вычислять и response не должен его содержать.
- Если relation не запрошена, response не должен содержать ключ relation.
- Selection должен быть ограничен по глубине. Рекомендуемый стартовый лимит: `5`, потому что admin-compatible shape содержит connections и edges.

Эта форма повторяет execution model `@shopana/type-resolver`: executor читает scalar fields из `fields`, relation fields из `populate`, relation args из `args`, а real resolver method name из `fieldName`.

## Example Request

```ts
const result = await broker.call("catalog.getProductSnapshots", {
  storeId: "store-id",
  productIds: ["product-1", "product-2"],
  selection: {
    fields: ["id", "kind", "handle", "isPublished", "revision", "title"],
    populate: {
      media: {
        fields: ["sortIndex"],
        populate: {
          file: {
            fields: ["id", "url", "altText"],
          },
        },
      },
      priceRange: {
        fields: ["currency", "minPriceAmount", "maxPriceAmount"],
      },
      categoryAssignments: {
        fields: ["isPrimary"],
        populate: {
          category: {
            fields: ["id", "handle", "name"],
          },
        },
      },
      variants: {
        args: { first: 20 },
        fields: ["totalCount"],
        populate: {
          edges: {
            fields: ["cursor"],
            populate: {
              node: {
                fields: ["id", "kind", "handle", "title"],
                populate: {
                  price: {
                    fields: ["currency", "amountMinor", "compareAtMinor"],
                  },
                  selectedOptions: {
                    fields: ["optionId", "optionValueId"],
                  },
                },
              },
            },
          },
          pageInfo: {
            fields: ["hasNextPage", "endCursor"],
          },
        },
      },
    },
  },
});
```

## Result Contract

```ts
export type GetProductSnapshotsResult =
  | {
      ok: true;
      products: ProductSnapshotResolved[];
    }
  | {
      ok: false;
      code: ProductReadErrorCode;
      message: string;
      retryable: boolean;
    };

export type ProductReadErrorCode =
  | "INVALID_CATALOG_PRODUCT_READ_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PRODUCT_READ_QUERY_FAILED";
```

`products` содержит sparse objects: каждый объект включает только поля, запрошенные selection, плюс обязательные wrapper/result поля.

Если продукт найден, он возвращается независимо от publication state. Неопубликованный продукт возвращается как admin-compatible snapshot с теми же правилами selection, что и опубликованный продукт.

## Explicit Result Types

Response types должны повторять admin GraphQL schema. Так как shape зависит от selection, все fields в DTO optional, но runtime contract запрещает возвращать незапрошенные поля.

```ts
export interface ProductSnapshotResolved {
  id?: string;
  kind?: ProductKind;
  handle?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  revision?: number;
  vendor?: VendorResolved | null;
  variants?: VariantConnectionResolved;
  media?: ProductMediaItemResolved[];
  options?: ProductOptionResolved[];
  features?: ProductFeatureResolved[];
  variantsCount?: number;
  primaryCategory?: CategoryResolved | null;
  categoryAssignments?: ProductCategoryAssignmentResolved[];
  tags?: TagResolved[];
  title?: string;
  description?: RichTextResolved | null;
  excerpt?: RichTextResolved | null;
  seo?: ProductSeoResolved | null;
  priceRange?: ProductPriceRangeResolved | null;
}

export type ProductKind = "BASE" | "BUNDLE";

export interface ProductPriceRangeResolved {
  minPriceAmount?: string;
  maxPriceAmount?: string;
  currency?: string;
}

export interface VariantConnectionResolved {
  edges?: VariantEdgeResolved[];
  pageInfo?: PageInfoResolved;
  totalCount?: number;
}

export interface VariantEdgeResolved {
  node?: VariantResolved;
  cursor?: string;
}

export interface VariantResolved {
  id?: string;
  kind?: ProductKind;
  product?: ProductSnapshotResolved;
  isDefault?: boolean;
  handle?: string;
  externalSystem?: string | null;
  externalId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  price?: VariantPriceResolved | null;
  priceHistory?: VariantPriceConnectionResolved;
  selectedOptions?: SelectedOptionResolved[];
  title?: string | null;
  media?: VariantMediaItemResolved[];
}

export interface VariantPriceResolved {
  id?: string;
  currency?: string;
  amountMinor?: string;
  compareAtMinor?: string | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  recordedAt?: string;
  isCurrent?: boolean;
}

export interface VariantPriceConnectionResolved {
  edges?: VariantPriceEdgeResolved[];
  pageInfo?: PageInfoResolved;
  totalCount?: number;
}

export interface VariantPriceEdgeResolved {
  node?: VariantPriceResolved;
  cursor?: string;
}

export interface SelectedOptionResolved {
  optionId?: string;
  optionValueId?: string;
}

export interface ProductMediaItemResolved {
  file?: FileResolved;
  sortIndex?: number;
}

export interface VariantMediaItemResolved {
  file?: FileResolved;
  sortIndex?: number;
}

export interface FileResolved {
  id?: string;
  provider?: string;
  url?: string;
  mimeType?: string | null;
  ext?: string | null;
  sizeBytes?: string;
  originalName?: string | null;
  dimensions?: MediaDimensionsResolved | null;
  durationMs?: number | null;
  altText?: string | null;
  sourceUrl?: string | null;
  isProcessed?: boolean;
}

export interface MediaDimensionsResolved {
  width?: number;
  height?: number;
}

export interface ProductOptionResolved {
  id?: string;
  slug?: string;
  name?: string;
  displayType?: string;
  sortIndex?: number;
  values?: ProductOptionValueResolved[];
}

export interface ProductOptionValueResolved {
  id?: string;
  slug?: string;
  name?: string;
  sortIndex?: number;
  swatch?: ProductOptionSwatchResolved | null;
}

export interface ProductOptionSwatchResolved {
  id?: string;
  swatchType?: string;
  colorOne?: string | null;
  colorTwo?: string | null;
  file?: FileResolved | null;
  metadata?: unknown;
}

export interface ProductFeatureResolved {
  id?: string;
  slug?: string;
  index?: number[];
  isGroup?: boolean;
  name?: string;
  parent?: ProductFeatureResolved | null;
  children?: ProductFeatureResolved[];
  values?: ProductFeatureValueResolved[];
}

export interface ProductFeatureValueResolved {
  id?: string;
  slug?: string;
  index?: number;
  name?: string;
}

export interface CategoryResolved {
  id?: string;
  handle?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  revision?: number;
  depth?: number;
  path?: string;
  name?: string;
  description?: RichTextResolved | null;
  excerpt?: RichTextResolved | null;
  defaultSort?: string;
  defaultSortDirection?: string;
  seo?: SeoResolved | null;
  parent?: CategoryResolved | null;
  children?: CategoryResolved[];
  ancestors?: CategoryResolved[];
}

export interface ProductCategoryAssignmentResolved {
  category?: CategoryResolved;
  isPrimary?: boolean;
}

export interface TagResolved {
  id?: string;
  handle?: string;
  createdAt?: string;
  name?: string;
  productsCount?: number;
}

export interface VendorResolved {
  id?: string;
  name?: string;
}

export interface RichTextResolved {
  text?: string;
  html?: string;
  json?: unknown;
}

export interface ProductSeoResolved {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: FileResolved | null;
}

export interface SeoResolved {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: FileResolved | null;
}

export interface PageInfoResolved {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}
```

Правила result:

- `ok: true` означает, что action корректно обработал весь request.
- `products` может содержать меньше объектов, чем было запрошено в `productIds`.
- Порядок `products` должен следовать порядку `productIds` для тех продуктов, которые попали в result.
- `ProductSnapshotResolved` не должен содержать поля, которых нет в `selection`.
- Если поле запрошено, но значение отсутствует по GraphQL schema/business-смыслу, resolver может вернуть `null` только для nullable fields.
- Если поле запрошено, но не может быть надежно вычислено из-за ошибки чтения, action должен вернуть `ok: false`.
- BigInt GraphQL fields (`minPriceAmount`, `maxPriceAmount`, `amountMinor`, `compareAtMinor`, `sizeBytes`) сериализуются как string в broker DTO.
- Неопубликованный продукт не является ошибкой и не должен опускаться из result, если он найден в рамках `storeId`.

## Example Response

Для request из примера выше допустимый response:

```ts
{
  ok: true,
  products: [
    {
      id: "product-1",
      kind: "BASE",
      handle: "iphone-15",
      isPublished: true,
      revision: 42,
      title: "iPhone 15",
      media: [
        {
          sortIndex: 0,
          file: {
            id: "file-1",
            url: "https://cdn.example.com/iphone-15.jpg",
            altText: "iPhone 15"
          }
        }
      ],
      priceRange: {
        currency: "UAH",
        minPriceAmount: "3999900",
        maxPriceAmount: "4599900"
      },
      categoryAssignments: [
        {
          isPrimary: true,
          category: {
            id: "category-1",
            handle: "phones",
            name: "Phones"
          }
        }
      ],
      variants: {
        totalCount: 1,
        edges: [
          {
            cursor: "variant-cursor-1",
            node: {
              id: "variant-1",
              kind: "BASE",
              handle: "iphone-15-128-black",
              title: "128 GB / Black",
              price: {
                currency: "UAH",
                amountMinor: "3999900",
                compareAtMinor: null
              },
              selectedOptions: [
                {
                  optionId: "option-storage",
                  optionValueId: "value-128gb"
                },
                {
                  optionId: "option-color",
                  optionValueId: "value-black"
                }
              ]
            }
          }
        ],
        pageInfo: {
          hasNextPage: false,
          endCursor: "variant-cursor-1"
        }
      }
    },
    {
      id: "product-2",
      kind: "BASE",
      handle: "draft-phone",
      isPublished: false,
      revision: 7,
      title: "Draft Phone"
    }
  ]
}
```

В response нет `description`, `tags`, `features`, `options`, `createdAt`, `updatedAt`, потому что они не были запрошены.

`product-2` показывает, что draft product возвращается как обычный product snapshot, если он найден и его поля запрошены.

## Errors

```ts
export type ProductReadErrorCode =
  | "INVALID_CATALOG_PRODUCT_READ_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PRODUCT_READ_QUERY_FAILED";
```

Правила ошибок:

- `ok: false` означает, что action не смог корректно обработать весь request.
- `INVALID_CATALOG_PRODUCT_READ_INPUT` используется для невалидного input: пустой `storeId`, пустой `productIds`, слишком большой bulk batch, пустой или невалидный `selection`, неизвестное field, слишком глубокий selection, невалидные GraphQL-like `args` у nested fields.
- `CATALOG_STORE_NOT_FOUND` используется, если `storeId` не найден или catalog не может безопасно построить store context.
- `CATALOG_PRODUCT_READ_QUERY_FAILED` используется для неожиданных ошибок чтения или сборки response. `retryable` должен быть `true`, если повтор request может помочь.
- Отсутствующий конкретный `productId` не является ошибкой всего action.

## Bulk, Missing And Partial Results

`getProductSnapshots` должен различать ошибку всего запроса и неполный набор продуктов внутри успешного bulk result.

Правила успешного result:

- `ok: true` может вернуть меньше `products`, чем было запрошено в `productIds`.
- Если продукт существует в рамках `storeId`, он возвращается независимо от publication state.
- Если `productId` не найден в рамках `storeId`, такой продукт опускается из `products`.
- Порядок `products` должен следовать порядку `productIds` для тех продуктов, которые попали в result.
- Дубликаты в `productIds` должны быть дедуплицированы при чтении. В result каждый `id` должен встречаться не более одного раза.

Правила partial failure:

- Не нужно возвращать одновременно `ok: true` с частью `products` и отдельным списком ошибок.
- Если catalog не может надежно выполнить bulk query или собрать response, action возвращает `ok: false`.
- Если catalog не может надежно определить состояние конкретного продукта, action должен вернуть `ok: false`, а не опускать продукт из `products`.

## Implementation Through Type Resolver

Broker contract не зависит от `@shopana/type-resolver`, но реализация `catalog` должна использовать его как execution engine.

Рекомендуемый flow:

1. Broker handler валидирует `GetProductSnapshotsParams`.
2. Handler строит request-scoped `ServiceContext` для `storeId` и доступного request context.
3. Handler валидирует `ProductSnapshotSelection` и передает его как structurally-compatible internal query.
4. Handler вызывает resolver, например:

```ts
const products = await ProductSnapshotResolver.loadMany(
  uniqueProductIds,
  input.selection,
  ctx
);
```

5. Handler фильтрует отсутствующие products и возвращает `GetProductSnapshotsResult`.

Важное правило: этот API должен использовать отдельные broker-facing resolvers, например:

```txt
services/catalog/src/resolvers/product-read/
  CatalogProductReadType.ts
  ProductSnapshotResolver.ts
  VariantSnapshotResolver.ts
  ProductMediaItemResolver.ts
  ProductFeatureResolver.ts
  ProductOptionResolver.ts
```

Нельзя использовать admin `ProductResolver` как broker resolver напрямую, потому что admin resolver может содержать authorization, UI-specific behavior и federation details, которые не являются частью broker read execution.

При этом broker-facing resolver должен возвращать admin-compatible DTO shape, а не отдельную domain/broker naming model.

## Selection Compatibility

`ProductSnapshotSelection` должен быть структурно совместим с internal `QueryArgs`, но не импортировать его тип.

Пример:

```ts
{
  fields: ["id", "revision", "isPublished", "title"],
  populate: {
    variants: {
      args: { first: 20 },
      fields: ["totalCount"],
      populate: {
        edges: {
          populate: {
            node: {
              fields: ["id", "title"]
            }
          }
        }
      }
    }
  }
}
```

Эта структура соответствует форме, которую executor ожидает на runtime.

Отличие от raw `QueryArgs` в том, что broker type ограничивает допустимые `fields`, `populate` keys и `args` для каждого resolver type.

## Field Semantics

### Product Fields

- `id` - admin GraphQL global product ID.
- `kind` - product discriminator из `ProductKind`.
- `handle` - product handle.
- `publishedAt` - дата публикации или `null`.
- `isPublished` - текущий publication state.
- `createdAt`, `updatedAt`, `deletedAt` - admin-compatible timestamps.
- `revision` - optimistic locking revision.
- `variantsCount` - количество вариантов продукта.
- `title` - локализованный title.
- `description`, `excerpt` - `RichText` в admin-compatible форме.
- `seo` - `ProductSeo`.
- `priceRange` - `ProductPriceRange` в выбранной currency.

### Media

`media` возвращает массив `ProductMediaItem` с `file` и `sortIndex`. Primary image не является отдельным broker field: клиент выбирает первый элемент по `sortIndex`, если ему нужен primary media item.

### Price Fields

`priceRange` и `variant.price` возвращают display prices для валюты, определенной request context или валютой проекта по умолчанию. Они не являются order-specific price snapshots и не должны использоваться checkout/orders для фиксации цены покупки.

### Categories

`primaryCategory` и `categoryAssignments` повторяют admin GraphQL schema. Старое broker-only `categories.path` не входит в contract. Для иерархии используются admin fields `parent`, `children`, `ancestors`, если они явно добавлены в selection.

### Tags

`tags` возвращает admin-compatible `Tag`.

### Variants

`variants` возвращает `VariantConnection`, а не массив вариантов. Args повторяют Relay pagination args из admin schema.

Inventory, stock reservation и internal fulfillment fields не входят в первую версию этого контракта.

### Features

`features` возвращает `ProductFeature[]`. Старое поле `attributes` запрещено, потому что оно не повторяет admin GraphQL schema.

## Что не входит в Product Read API

В `ProductSnapshotSelection` и `ProductSnapshotResolved` не должны входить:

- broker-only aliases для admin полей (`productId`, `status`, `primaryImage`, `attributes`);
- внутренние catalog aggregate fields;
- cost price;
- supplier/internal procurement data;
- inventory reservation state;
- order-specific price snapshots;
- permissions/admin metadata;
- внутренние audit fields;
- поля, добавленные только под один внешний сценарий.

Для других классов catalog read API должен быть отдельный контракт:

```ts
catalog.getProductPurchaseSnapshots
```

## Почему не GraphQL Federation

GraphQL Federation используется для внешнего API и composition между subgraphs.

Для бизнес-логики и внутренних read workflows между сервисами используется broker action через typed client:

- проще контролировать стабильность DTO;
- проще делать bulk-запросы;
- проще валидировать input/output;
- меньше coupling с transport/runtime GraphQL;
- проще использовать из внутренних workflows и application services.

При этом broker action должен повторять admin GraphQL shape там, где он возвращает admin catalog data, и может исполняться через Type Resolver.

## Почему не универсальный fields selector

Не стоит делать API вида:

```ts
catalog.getProducts({
  ids,
  fields: ["title", "categoryAssignments.category.name", "variants.edges.node.price"]
});
```

Такой API быстро превращается во внутренний GraphQL поверх broker и начинает раскрывать произвольную структуру catalog domain.

Правильная форма - explicit product selection types:

```ts
selection: {
  fields: ["id", "title"],
  populate: {
    categoryAssignments: {
      populate: {
        category: {
          fields: ["handle", "name"]
        }
      }
    }
  }
}
```

То есть selection есть, но он ограничен contract type, а не произвольными строковыми paths.

## Shared Service API Client

Клиент должен жить в `packages/shared-service-api/src/catalog`, по аналогии с существующими service API clients.

```ts
import type { Catalog } from "@shopana/broker-types";

export interface CatalogApiClient {
  getProductSnapshots(
    input: Catalog.GetProductSnapshotsParams
  ): Promise<Catalog.GetProductSnapshotsResult>;
}
```

Пример клиента:

```ts
import type { Catalog } from "@shopana/broker-types";
import type { BrokerLike } from "../broker";

export class CatalogClient implements CatalogApiClient {
  constructor(private readonly broker: BrokerLike) {}

  async getProductSnapshots(
    input: Catalog.GetProductSnapshotsParams
  ): Promise<Catalog.GetProductSnapshotsResult> {
    return (await this.broker.call(
      "catalog.getProductSnapshots",
      input
    )) as Catalog.GetProductSnapshotsResult;
  }
}
```

`packages/shared-service-api` не является источником DTO контракта. Он импортирует broker action DTO из `@shopana/broker-types` и предоставляет удобный typed client поверх `broker.call`.

## Рекомендуемая структура файлов

```txt
packages/shared-service-api/src/catalog/
  client.ts
  index.ts
  types.ts
```

`types.ts` содержит `CatalogApiClient` и при необходимости re-export типов из `@shopana/broker-types`, но не дублирует DTO broker action.

`client.ts` вызывает broker action.

`index.ts` экспортирует client и types.

`packages/shared-service-api/src/serviceApi.ts` должен добавить:

```ts
public readonly catalog: CatalogApiClient;
```

## Версионирование

Контракт должен развиваться additive-first:

- можно добавлять новые optional fields в result DTO;
- можно добавлять новые literal values в field unions только если клиенты валидируют selection через актуальные broker types;
- нельзя менять смысл существующих полей без новой версии;
- нельзя переименовывать поля без миграционного периода;
- breaking changes требуют новой action или versioned DTO.

Если потребуется новая версия:

```ts
catalog.getProductSnapshotsV2
```

Предпочтение: новая action для явных breaking changes.

## Итоговое правило

`catalog` должен предоставлять read API продукта через стабильный broker action:

```ts
catalog.getProductSnapshots
```

API имеет GraphQL-like semantics, но broker contract состоит из explicit DTO types в `@shopana/broker-types`.

Snapshot продукта повторяет admin GraphQL `Product` shape, а args повторяют admin GraphQL query arguments. `@shopana/type-resolver` используется только внутри `catalog` для исполнения selection и не является частью межсервисного контракта.
