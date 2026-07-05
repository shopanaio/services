---
tags:
  - architecture
  - catalog
  - inter-service
  - read-api
  - listing
related:
  - architecture/overview
  - architecture/decisions
  - packages/shared-kernel/service-broker
  - patterns/federation
---

# Catalog Public Read API

## Назначение

`Catalog Public Read API` - это межсервисный read API каталога для получения стабильных публичных снимков продуктов.

Он нужен сервисам, которым требуется прочитать продуктовые данные, но нельзя:

- читать таблицы `catalog` напрямую;
- импортировать catalog repositories или доменные модели;
- получать полную внутреннюю доменную модель продукта;
- создавать узкий API под конкретного потребителя, например только под `listing`.

Основной use case: `listing` получает событие об изменении продукта и запрашивает у `catalog` данные для переиндексации. При этом API должен оставаться пригодным и для других потребителей: search, recommendations, storefront cache, review previews.

## Владелец данных

`catalog` является source of truth для:

- products;
- variants;
- categories;
- tags;
- options;
- features/attributes;
- publish status;
- media references, связанные с продуктом.

Остальные сервисы хранят только свои read models, projections или snapshots.

## Принцип API

API должен возвращать не доменную модель `Product`, а стабильный read contract:

```ts
catalog.getProductPublicSnapshots
```

Это coarse-grained API для класса задач "получить публичное представление продукта", а не endpoint под конкретный сервис.

Не рекомендуется делать:

```ts
catalog.getListingProductData
catalog.getProductForSearchIndex
catalog.getProductDomainModel
catalog.getProductWithEverything
```

## Broker Action

```ts
catalog.getProductPublicSnapshots
```

Action должна поддерживать bulk-запросы. Потребитель не должен вызывать `getProductPublicSnapshot` в цикле.

## Shared Service API Client

Публичный клиент должен жить в `packages/shared-service-api/src/catalog`, по аналогии с `pricing`, `inventory`, `checkout`.

```ts
export interface CatalogApiClient {
  getProductPublicSnapshots(
    input: GetProductPublicSnapshotsInput
  ): Promise<GetProductPublicSnapshotsResult>;
}
```

Пример клиента:

```ts
import type { BrokerLike } from "../broker";

export class CatalogClient implements CatalogApiClient {
  constructor(private readonly broker: BrokerLike) {}

  async getProductPublicSnapshots(
    input: GetProductPublicSnapshotsInput
  ): Promise<GetProductPublicSnapshotsResult> {
    return (await this.broker.call(
      "catalog.getProductPublicSnapshots",
      input
    )) as GetProductPublicSnapshotsResult;
  }
}
```

## Input

```ts
export interface GetProductPublicSnapshotsInput {
  projectId: string;
  productIds: string[];
  locale?: string;
  currencyCode?: string;
}
```

Правила:

- `projectId` обязателен для multi-tenancy и изоляции данных.
- `productIds` всегда массив, даже если нужен один продукт.
- `locale` опционален. Если не передан, `catalog` может использовать locale проекта по умолчанию.
- `currencyCode` опционален. Нужен только если public snapshot включает price display fields.

## Result

```ts
export interface GetProductPublicSnapshotsResult {
  products: ProductPublicSnapshot[];
}
```

## Product Public Snapshot

```ts
export interface ProductPublicSnapshot {
  productId: string;
  revision: number;
  status: ProductPublicSnapshotStatus;

  handle?: string;
  title?: string;
  description?: string | null;

  primaryImageId?: string | null;

  categories?: CategoryPublicRef[];
  tags?: TagPublicRef[];

  variants?: VariantPublicSnapshot[];
  attributes?: ProductPublicAttribute[];

  searchableText?: string;
  updatedAt?: string;
}

export type ProductPublicSnapshotStatus =
  | "published"
  | "unpublished"
  | "deleted";
```

`ProductPublicSnapshot` описывает публичное представление продукта, пригодное для индексирования и read projections. Это не catalog aggregate и не admin DTO.

## Tombstone

Если продукт удален или больше не должен быть видим публично, `catalog` должен вернуть tombstone snapshot.

```ts
{
  productId: "product-id",
  revision: 42,
  status: "deleted"
}
```

или:

```ts
{
  productId: "product-id",
  revision: 43,
  status: "unpublished"
}
```

Потребитель сам решает, что делать:

- `listing` удаляет документ из индекса;
- `search` удаляет или скрывает документ;
- storefront cache инвалидирует публичную страницу;
- recommendations удаляет продукт из выдачи.

## Category Reference

```ts
export interface CategoryPublicRef {
  id: string;
  handle: string;
  title: string;
  path: CategoryPathItem[];
}

export interface CategoryPathItem {
  id: string;
  handle: string;
  title: string;
}
```

`path` нужен для построения breadcrumbs, faceting и поиска по иерархии категорий без дополнительных вызовов в `catalog`.

## Tag Reference

```ts
export interface TagPublicRef {
  id: string;
  handle: string;
  title: string;
}
```

## Variant Snapshot

```ts
export interface VariantPublicSnapshot {
  variantId: string;
  title: string;
  sku?: string | null;
  options: VariantOptionPublicValue[];
}

export interface VariantOptionPublicValue {
  name: string;
  value: string;
}
```

Variant snapshot должен содержать только публичные данные. Inventory, stock reservation и internal fulfillment fields не входят в этот контракт.

## Product Attributes

```ts
export interface ProductPublicAttribute {
  code: string;
  label: string;
  value: string | number | boolean | string[];
}
```

Attributes используются для фильтров, faceting, search ranking и storefront display.

`code` должен быть стабильным machine-readable идентификатором. `label` - локализованный display label.

## Searchable Text

```ts
searchableText?: string;
```

`searchableText` - готовый текстовый материал из публичных полей продукта:

- title;
- description;
- category names;
- tag names;
- selected attributes;
- option values.

Это поле не заменяет собственную логику ranking в `listing` или `search`. Оно снижает дублирование правил "какие catalog поля считаются публичным текстом продукта".

## Event Flow

Событие должно быть маленьким и не содержать полный продукт.

```ts
export interface ProductPublicSnapshotChangedEvent {
  projectId: string;
  productId: string;
  revision: number;
  reason: ProductPublicSnapshotChangedReason;
}

export type ProductPublicSnapshotChangedReason =
  | "productChanged"
  | "categoryChanged"
  | "variantChanged"
  | "mediaChanged"
  | "publicationChanged";
```

Flow:

```ts
// listing получил ProductPublicSnapshotChangedEvent
const result = await serviceApi.catalog.getProductPublicSnapshots({
  projectId: event.projectId,
  productIds: [event.productId],
  locale: "uk",
  currencyCode: "UAH",
});

const snapshot = result.products[0];

if (!snapshot || snapshot.status !== "published") {
  await listingIndexer.removeProduct(event.productId);
} else {
  await listingIndexer.reindexProduct(snapshot);
}
```

## Revision Handling

`revision` обязателен. Потребители должны использовать его для защиты от out-of-order events.

Пример:

```ts
if (event.revision < currentIndexedRevision) {
  return;
}
```

Если событие пришло позже, но содержит старую revision, `listing` не должен перезаписывать более свежий индекс старым snapshot.

## Что не входит в Public Snapshot

В `ProductPublicSnapshot` не должны входить:

- внутренние catalog aggregate fields;
- unpublished draft data;
- cost price;
- supplier/internal procurement data;
- inventory reservation state;
- order-specific price snapshots;
- permissions/admin metadata;
- audit fields, не нужные публичным read projections;
- поля, добавленные только потому, что они нужны одному потребителю.

Если checkout или orders нужна фиксация состояния товара на момент покупки, для этого должен быть отдельный контракт:

```ts
catalog.getProductPurchaseSnapshots
```

или:

```ts
catalog.getCheckoutItemSnapshots
```

## Почему не GraphQL Federation

GraphQL Federation используется для внешнего API и composition между subgraphs.

Для бизнес-логики и асинхронной переиндексации между сервисами лучше использовать broker action через typed client:

- проще контролировать стабильность DTO;
- проще делать bulk-запросы;
- проще валидировать input/output;
- меньше coupling с клиентской GraphQL schema;
- проще использовать из workflows и event handlers.

## Почему не fields selector

Не стоит начинать с API вида:

```ts
catalog.getProducts({
  ids,
  fields: ["title", "categories", "variants.options"]
});
```

Такой API быстро превращается во внутренний GraphQL поверх broker и начинает раскрывать структуру catalog domain.

Лучше иметь несколько стабильных coarse-grained snapshots:

- `ProductRef` - минимальная ссылка на продукт;
- `ProductPublicSnapshot` - публичное read-представление;
- `ProductPurchaseSnapshot` - снимок для checkout/orders;
- `ProductAdminSnapshot` - admin read-представление, если оно нужно.

## Версионирование

Контракт должен развиваться additive-first:

- можно добавлять новые optional fields;
- нельзя менять смысл существующих полей без новой версии;
- нельзя переименовывать поля без миграционного периода;
- breaking changes требуют новой action или versioned DTO.

Если потребуется новая версия:

```ts
catalog.getProductPublicSnapshotsV2
```

или version field в input:

```ts
export interface GetProductPublicSnapshotsInput {
  projectId: string;
  productIds: string[];
  locale?: string;
  currencyCode?: string;
  version?: 2;
}
```

Предпочтение: новая action для явных breaking changes.

## Рекомендуемая структура файлов

```txt
packages/shared-service-api/src/catalog/
  client.ts
  index.ts
  types.ts
```

`types.ts` содержит публичные DTO.

`client.ts` вызывает broker action.

`index.ts` экспортирует client и types.

`packages/shared-service-api/src/serviceApi.ts` должен добавить:

```ts
public readonly catalog: CatalogApiClient;
```

## Итоговое правило

`listing` не должен просить "данные для listing".

Он должен реагировать на событие продукта и запрашивать у `catalog` публичный snapshot продукта:

```ts
catalog.getProductPublicSnapshots
```

`catalog` остается владельцем правил публичности продукта. `listing` остается владельцем правил индексирования.
