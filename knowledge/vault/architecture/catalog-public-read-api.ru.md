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

`Catalog Product Read API` - это межсервисный read API каталога для получения данных продукта по GraphQL-like модели: клиент явно запрашивает поля, а `catalog` возвращает только запрошенную форму данных.

API нужен сервисам, которым требуется читать catalog data, но нельзя:

- читать таблицы `catalog` напрямую;
- импортировать catalog repositories или доменные модели;
- получать полную внутреннюю доменную модель продукта;
- зависеть от admin GraphQL schema;
- создавать узкий API под один внешний сценарий.

Основной use case: межсервисное получение снимка продукта через стабильный broker action с явным selection contract.

Важное правило доступности:

- если продукта нет в рамках `storeId`, он не возвращается в `products`;
- если продукт существует, но не опубликован, он возвращается как обычный draft snapshot, аналогично admin-представлению в рамках этого контракта;
- состояние публикации не создает специальный result-state.

## Владелец данных

`catalog` является source of truth для:

- products;
- variants;
- categories;
- tags;
- options;
- features/attributes;
- product status;
- media references, связанные с продуктом.

Другие сервисы не владеют catalog domain data.

## Принцип API

API должен работать по смыслу как GraphQL resolver:

- input содержит идентификаторы продуктов и selection;
- selection описывает, какие поля нужно вернуть;
- `catalog` резолвит только запрошенные поля;
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

```ts
export interface GetProductSnapshotsParams {
  storeId: string;
  productIds: string[];
  locale?: string;
  currencyCode?: string;
  selection: ProductSnapshotSelection;
}
```

Правила:

- `storeId` обязателен для multi-tenancy и изоляции данных.
- `storeId` является tenant boundary для этого read API. `organizationId` не входит в контракт, потому что продуктовые данные каталога store-scoped, а broker action должна фильтровать чтение по `storeId`.
- `productIds` всегда массив, даже если нужен один продукт.
- `productIds` должен быть дедуплицирован при чтении. В result каждый `productId` должен встречаться не более одного раза.
- `locale` опционален. Если не передан, `catalog` может использовать locale проекта по умолчанию.
- `currencyCode` опционален. Он используется только для price fields, если они запрошены в selection.
- `selection` обязателен. Пустой selection является невалидным input.
- Максимальный bulk batch должен быть зафиксирован реализацией. Рекомендуемый стартовый лимит: `100` product IDs.

## Explicit Selection Types

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

Broker shape должен быть тем же по структуре, но с concrete field unions, concrete populate keys и concrete args:

```ts
export interface ProductSnapshotSelection {
  fields?: ProductSnapshotField[];
  populate?: ProductSnapshotPopulate;
  args?: never;
  fieldName?: never;
}

export interface ProductSnapshotPopulate {
  primaryImage?: MediaRefSelection;
  priceRange?: ProductPriceRangeSelection;
  categories?: CategoryRefSelection;
  tags?: TagRefSelection;
  variants?: VariantSnapshotSelection;
  attributes?: ProductAttributeSelection;
}

export type ProductSnapshotRelationField =
  | "primaryImage"
  | "priceRange"
  | "categories"
  | "tags"
  | "variants"
  | "attributes";

export type ProductSnapshotField =
  | "productId"
  | "revision"
  | "status"
  | "handle"
  | "title"
  | "description"
  | "searchableText"
  | "updatedAt";
```

Relation selection описывается отдельными explicit types:

```ts
export interface MediaRefSelection {
  fields?: MediaRefField[];
  populate?: never;
  args?: never;
  fieldName?: "primaryImage";
}

export type MediaRefField =
  | "fileId"
  | "alt"
  | "sortIndex";

export interface ProductPriceRangeSelection {
  fields?: ProductPriceRangeField[];
  populate?: never;
  args?: never;
  fieldName?: "priceRange";
}

export type ProductPriceRangeField =
  | "currencyCode"
  | "minAmountMinor"
  | "maxAmountMinor";

export interface CategoryRefSelection {
  fields?: CategoryRefField[];
  populate?: CategoryRefPopulate;
  args?: never;
  fieldName?: "categories";
}

export interface CategoryRefPopulate {
  path?: CategoryPathItemSelection;
}

export type CategoryRefField =
  | "id"
  | "handle"
  | "title";

export interface CategoryPathItemSelection {
  fields?: CategoryPathItemField[];
  populate?: never;
  args?: never;
  fieldName?: "path";
}

export type CategoryPathItemField =
  | "id"
  | "handle"
  | "title";

export interface TagRefSelection {
  fields?: TagRefField[];
  populate?: never;
  args?: never;
  fieldName?: "tags";
}

export type TagRefField =
  | "id"
  | "handle"
  | "title";

export interface VariantSnapshotSelection {
  args?: VariantSnapshotSelectionArgs;
  fields?: VariantSnapshotField[];
  populate?: VariantSnapshotPopulate;
  fieldName?: "variants";
}

export interface VariantSnapshotPopulate {
  price?: VariantPriceSelection;
  options?: VariantOptionValueSelection;
}

export interface VariantSnapshotSelectionArgs {
  first?: number;
}

export type VariantSnapshotField =
  | "variantId"
  | "title"
  | "sku";

export interface VariantPriceSelection {
  fields?: VariantPriceField[];
  populate?: never;
  args?: never;
  fieldName?: "price";
}

export type VariantPriceField =
  | "currencyCode"
  | "amountMinor"
  | "compareAtMinor";

export interface VariantOptionValueSelection {
  fields?: VariantOptionValueField[];
  populate?: never;
  args?: never;
  fieldName?: "options";
}

export type VariantOptionValueField =
  | "name"
  | "value";

export interface ProductAttributeSelection {
  fields?: ProductAttributeField[];
  populate?: never;
  args?: never;
  fieldName?: "attributes";
}

export type ProductAttributeField =
  | "code"
  | "label"
  | "value";
```

Правила selection:

- `fields` содержит только scalar fields текущего type.
- relation field задается только через `populate`, например `populate.variants`, `populate.categories`, `populate.primaryImage`.
- `args` имеет concrete type только у тех relation resolvers, где аргументы разрешены. Для root product selection и relations без аргументов используется `args?: never`.
- `fieldName` повторяет shape `QueryArgs`, но ограничен concrete resolver field name. На root product selection используется `fieldName?: never`, потому что root query не является aliased populate entry.
- relation без вложенных `fields` или nested selection считается невалидной.
- unknown field должен приводить к `INVALID_CATALOG_PRODUCT_READ_INPUT`.
- если поле не запрошено, resolver не должен его вычислять и response не должен его содержать.
- если relation не запрошена, response не должен содержать ключ relation.
- selection должен быть ограничен по глубине. Рекомендуемый стартовый лимит: `3`.

Эта форма повторяет execution model `@shopana/type-resolver`: executor читает scalar fields из `fields`, relation fields из `populate`, relation args из `args`, а real resolver method name из `fieldName`.

## Example Request

```ts
const result = await broker.call("catalog.getProductSnapshots", {
  storeId: "store-id",
  productIds: ["product-1", "product-2"],
  locale: "uk",
  currencyCode: "UAH",
  selection: {
    fields: ["productId", "revision", "status", "handle", "title"],
    populate: {
      primaryImage: {
        fields: ["fileId", "alt"],
      },
      priceRange: {
        fields: ["currencyCode", "minAmountMinor", "maxAmountMinor"],
      },
      categories: {
        fields: ["id", "handle", "title"],
        populate: {
          path: {
            fields: ["id", "handle", "title"],
          },
        },
      },
      variants: {
        args: { first: 20 },
        fields: ["variantId", "title", "sku"],
        populate: {
          price: {
            fields: ["currencyCode", "amountMinor"],
          },
          options: {
            fields: ["name", "value"],
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

`products` содержит sparse objects: каждый объект включает только поля, запрошенные selection, плюс поля, которые были явно запрошены и доступны для данного состояния продукта.

Если продукт найден, он возвращается независимо от `status`. Неопубликованный продукт возвращается как draft snapshot с теми же правилами selection, что и опубликованный продукт.

## Explicit Result Types

Response types также должны быть объявлены явно. Так как shape зависит от selection, все fields в DTO optional, но runtime contract запрещает возвращать незапрошенные поля.

```ts
export interface ProductSnapshotResolved {
  productId?: string;
  revision?: number;
  status?: ProductStatus;

  handle?: string;
  title?: string;
  description?: string | null;
  searchableText?: string;
  updatedAt?: string;

  primaryImage?: MediaRefResolved | null;
  priceRange?: ProductPriceRangeResolved | null;
  categories?: CategoryRefResolved[];
  tags?: TagRefResolved[];
  variants?: VariantSnapshotResolved[];
  attributes?: ProductAttributeResolved[];
}

export type ProductStatus =
  | "draft"
  | "published"
  | "archived";

export interface MediaRefResolved {
  fileId?: string;
  alt?: string | null;
  sortIndex?: number;
}

export interface ProductPriceRangeResolved {
  currencyCode?: string;
  minAmountMinor?: number | null;
  maxAmountMinor?: number | null;
}

export interface CategoryRefResolved {
  id?: string;
  handle?: string;
  title?: string;
  path?: CategoryPathItemResolved[];
}

export interface CategoryPathItemResolved {
  id?: string;
  handle?: string;
  title?: string;
}

export interface TagRefResolved {
  id?: string;
  handle?: string;
  title?: string;
}

export interface VariantSnapshotResolved {
  variantId?: string;
  title?: string;
  sku?: string | null;
  price?: VariantPriceResolved | null;
  options?: VariantOptionValueResolved[];
}

export interface VariantPriceResolved {
  currencyCode?: string;
  amountMinor?: number | null;
  compareAtMinor?: number | null;
}

export interface VariantOptionValueResolved {
  name?: string;
  value?: string;
}

export interface ProductAttributeResolved {
  code?: string;
  label?: string;
  value?: string | number | boolean | string[];
}
```

Правила result:

- `ok: true` означает, что action корректно обработал весь request.
- `products` может содержать меньше объектов, чем было запрошено в `productIds`.
- Порядок `products` должен следовать порядку `productIds` для тех продуктов, которые попали в result.
- `ProductSnapshotResolved` не должен содержать поля, которых нет в `selection`.
- Если поле запрошено, но значение отсутствует по бизнес-смыслу, resolver может вернуть `null` только для nullable fields.
- Если поле запрошено, но не может быть надежно вычислено из-за ошибки чтения, action должен вернуть `ok: false`.
- Неопубликованный продукт не является ошибкой и не должен опускаться из result, если он найден в рамках `storeId`.

## Example Response

Для request из примера выше допустимый response:

```ts
{
  ok: true,
  products: [
    {
      productId: "product-1",
      revision: 42,
      status: "published",
      handle: "iphone-15",
      title: "iPhone 15",
      primaryImage: {
        fileId: "file-1",
        alt: "iPhone 15"
      },
      priceRange: {
        currencyCode: "UAH",
        minAmountMinor: 3999900,
        maxAmountMinor: 4599900
      },
      categories: [
        {
          id: "category-1",
          handle: "phones",
          title: "Phones",
          path: [
            {
              id: "category-root",
              handle: "electronics",
              title: "Electronics"
            }
          ]
        }
      ],
      variants: [
        {
          variantId: "variant-1",
          title: "128 GB / Black",
          sku: "IPH15-128-BLK",
          price: {
            currencyCode: "UAH",
            amountMinor: 3999900
          },
          options: [
            {
              name: "Storage",
              value: "128 GB"
            },
            {
              name: "Color",
              value: "Black"
            }
          ]
        }
      ]
    },
    {
      productId: "product-2",
      revision: 7,
      status: "draft",
      handle: "draft-phone",
      title: "Draft Phone"
    }
  ]
}
```

В response нет `description`, `searchableText`, `tags` и `attributes`, потому что они не были запрошены.

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
- `INVALID_CATALOG_PRODUCT_READ_INPUT` используется для невалидного input: пустой `storeId`, пустой `productIds`, слишком большой bulk batch, пустой или невалидный `selection`, неизвестное field, слишком глубокий selection, невалидный `locale` или `currencyCode`.
- `CATALOG_STORE_NOT_FOUND` используется, если `storeId` не найден или catalog не может безопасно построить store context.
- `CATALOG_PRODUCT_READ_QUERY_FAILED` используется для неожиданных ошибок чтения или сборки response. `retryable` должен быть `true`, если повтор request может помочь.
- Отсутствующий конкретный `productId` не является ошибкой всего action.

## Bulk, Missing And Partial Results

`getProductSnapshots` должен различать ошибку всего запроса и неполный набор продуктов внутри успешного bulk result.

Правила успешного result:

- `ok: true` может вернуть меньше `products`, чем было запрошено в `productIds`.
- Если продукт существует в рамках `storeId`, он возвращается независимо от статуса публикации.
- Если `productId` не найден в рамках `storeId`, такой продукт опускается из `products`.
- Порядок `products` должен следовать порядку `productIds` для тех продуктов, которые попали в result.
- Дубликаты в `productIds` должны быть дедуплицированы при чтении. В result каждый `productId` должен встречаться не более одного раза.

Правила partial failure:

- Не нужно возвращать одновременно `ok: true` с частью `products` и отдельным списком ошибок.
- Если catalog не может надежно выполнить bulk query или собрать response, action возвращает `ok: false`.
- Если catalog не может надежно определить состояние конкретного продукта, action должен вернуть `ok: false`, а не опускать продукт из `products`.

## Implementation Through Type Resolver

Broker contract не зависит от `@shopana/type-resolver`, но реализация `catalog` должна использовать его как execution engine.

Рекомендуемый flow:

1. Broker handler валидирует `GetProductSnapshotsParams`.
2. Handler строит request-scoped `ServiceContext` для `storeId`, `locale`, `currencyCode`.
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
  CategoryRefResolver.ts
  TagRefResolver.ts
```

Нельзя использовать admin `ProductResolver` как broker resolver напрямую, потому что admin resolver может содержать поля и связи, которые не являются частью этого read contract.

## Selection Compatibility

`ProductSnapshotSelection` должен быть структурно совместим с internal `QueryArgs`, но не импортировать его тип.

Пример:

```ts
{
  fields: ["productId", "revision", "status", "title"],
  populate: {
    variants: {
      args: { first: 20 },
      fields: ["variantId", "title"],
      populate: {
        options: {
          fields: ["name", "value"]
        }
      }
    }
  }
}
```

Эта структура уже соответствует форме, которую executor ожидает на runtime.

Отличие от raw `QueryArgs` в том, что broker type ограничивает допустимые `fields`, `populate` keys и `args` для каждого resolver type.

## Field Semantics

### Product Fields

- `productId` - stable catalog product ID.
- `revision` - монотонная revision состояния продукта.
- `status` - состояние продукта в catalog workflow, например `"draft"`, `"published"` или `"archived"`.
- `handle` - product handle.
- `title` - локализованный title.
- `description` - локализованное описание в форме, пригодной для межсервисного чтения.
- `searchableText` - готовый текстовый материал из полей продукта.
- `updatedAt` - время последнего изменения продукта.

### Primary Image

`primaryImage` возвращает ссылку на media file. Это не media domain object и не admin file DTO.

### Price Fields

`priceRange` и `variant.price` возвращают display prices для `currencyCode` из input или валюты проекта по умолчанию. Они не являются order-specific price snapshots и не должны использоваться checkout/orders для фиксации цены покупки.

### Categories

`categories` возвращает category refs. `path` содержит иерархию категории без дополнительных вызовов в `catalog`.

### Tags

`tags` возвращает tag refs.

### Variants

`variants` возвращает variant data, разрешенную этим контрактом. Inventory, stock reservation и internal fulfillment fields не входят в этот контракт.

### Attributes

`attributes` возвращает product attributes. `code` должен быть стабильным machine-readable идентификатором. `label` - локализованный display label.

## Searchable Text

`searchableText` - готовый текстовый материал из полей продукта:

- title;
- description;
- category names;
- tag names;
- selected attributes;
- option values.

Это поле фиксирует правила `catalog` о том, какие поля продукта входят в готовый текстовый материал. Поле вычисляется только если оно запрошено.

## Revision Handling

`revision` возвращается только если он запрошен.

Правила:

- `revision` должен монотонно отражать изменение snapshot продукта;
- draft, published и archived states используют одно и то же поле `revision`;
- если `revision` запрошен, catalog не должен возвращать product object без `revision`.

## Что не входит в Product Read API

В `ProductSnapshotSelection` и `ProductSnapshotResolved` не должны входить:

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
- меньше coupling с клиентской GraphQL schema;
- проще использовать из внутренних workflows и application services.

При этом broker action может иметь GraphQL-like selection semantics и исполняться через Type Resolver.

## Почему не универсальный fields selector

Не стоит делать API вида:

```ts
catalog.getProducts({
  ids,
  fields: ["title", "categories", "variants.options"]
});
```

Такой API быстро превращается во внутренний GraphQL поверх broker и начинает раскрывать структуру catalog domain.

Правильная форма - explicit product selection types:

```ts
selection: {
  fields: ["productId", "title"],
  populate: {
    categories: {
      fields: ["handle", "title"]
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

`@shopana/type-resolver` используется только внутри `catalog` для исполнения selection и не является частью межсервисного контракта.
