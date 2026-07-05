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

## Broker Types

Контракт broker action должен жить в `packages/broker-types/src/actions/catalog.ts`.

Имена типов должны следовать существующему pattern `Params/Result`, который уже используется catalog action types:

```ts
export interface GetProductPublicSnapshotsParams {
  storeId: string;
  productIds: string[];
  locale?: string;
  currencyCode?: string;
}

export type GetProductPublicSnapshotsResult =
  | {
      ok: true;
      products: ProductPublicSnapshot[];
    }
  | {
      ok: false;
      code: ProductPublicSnapshotErrorCode;
      message: string;
      retryable: boolean;
    };
```

Result должен использовать union с `ok: true/false`, `code`, `message`, `retryable`, как существующий catalog snapshot contract.

`ProductPublicSnapshot`, `CategoryPublicRef`, `TagPublicRef`, `VariantPublicSnapshot`, `ProductPublicAttribute` и связанные enum/string-union типы также должны быть экспортированы из `@shopana/broker-types`.

`packages/shared-service-api` не является источником DTO контракта. Он импортирует broker action DTO из `@shopana/broker-types` и предоставляет удобный typed client поверх `broker.call`.

## Shared Service API Client

Публичный клиент должен жить в `packages/shared-service-api/src/catalog`, по аналогии с `pricing`, `inventory`, `checkout`.

```ts
import type { Catalog } from "@shopana/broker-types";

export interface CatalogApiClient {
  getProductPublicSnapshots(
    input: Catalog.GetProductPublicSnapshotsParams
  ): Promise<Catalog.GetProductPublicSnapshotsResult>;
}
```

Пример клиента:

```ts
import type { Catalog } from "@shopana/broker-types";
import type { BrokerLike } from "../broker";

export class CatalogClient implements CatalogApiClient {
  constructor(private readonly broker: BrokerLike) {}

  async getProductPublicSnapshots(
    input: Catalog.GetProductPublicSnapshotsParams
  ): Promise<Catalog.GetProductPublicSnapshotsResult> {
    return (await this.broker.call(
      "catalog.getProductPublicSnapshots",
      input
    )) as Catalog.GetProductPublicSnapshotsResult;
  }
}
```

## Input

```ts
export interface GetProductPublicSnapshotsParams {
  storeId: string;
  productIds: string[];
  locale?: string;
  currencyCode?: string;
}
```

Правила:

- `storeId` обязателен для multi-tenancy и изоляции данных.
- `storeId` является достаточным tenant boundary для этого public read API. `organizationId` не входит в контракт, потому что продуктовые данные каталога store-scoped, а broker action должна фильтровать чтение по `storeId`.
- `productIds` всегда массив, даже если нужен один продукт.
- `locale` опционален. Если не передан, `catalog` может использовать locale проекта по умолчанию.
- `currencyCode` опционален. Нужен только если public snapshot включает price display fields.

## Result

```ts
export type GetProductPublicSnapshotsResult =
  | {
      ok: true;
      products: ProductPublicSnapshot[];
    }
  | {
      ok: false;
      code: ProductPublicSnapshotErrorCode;
      message: string;
      retryable: boolean;
    };

export type ProductPublicSnapshotErrorCode =
  | "INVALID_CATALOG_PUBLIC_SNAPSHOT_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PUBLIC_SNAPSHOT_QUERY_FAILED";
```

Правила ошибок:

- `ok: false` означает, что action не смог корректно обработать весь запрос.
- `INVALID_CATALOG_PUBLIC_SNAPSHOT_INPUT` используется для невалидного input: пустой `storeId`, пустой `productIds`, слишком большой bulk batch, невалидный `locale` или `currencyCode`.
- `CATALOG_STORE_NOT_FOUND` используется, если `storeId` не найден или catalog не может безопасно построить store context.
- `CATALOG_PUBLIC_SNAPSHOT_QUERY_FAILED` используется для неожиданных ошибок чтения или сборки snapshot. `retryable` должен быть `true`, если повтор запроса может помочь.
- Отсутствующий конкретный `productId` не является ошибкой всего action.

## Bulk, Missing And Partial Results

`getProductPublicSnapshots` должен различать ошибку всего запроса и неполный набор продуктов внутри успешного bulk result.

Правила успешного result:

- `ok: true` может вернуть меньше `products`, чем было запрошено в `productIds`.
- Если продукт существует, но удален или больше не должен быть публичным, `catalog` возвращает tombstone snapshot со статусом `"deleted"` или `"unpublished"`.
- Если `productId` не найден в рамках `storeId` и catalog не может построить корректный tombstone с `revision`, такой продукт опускается из `products`.
- Порядок `products` должен следовать порядку `productIds` для тех продуктов, которые попали в result.
- Дубликаты в `productIds` должны быть дедуплицированы при чтении. В result каждый `productId` должен встречаться не более одного раза.

Правила partial failure:

- Не нужно возвращать одновременно `ok: true` с частью `products` и отдельным списком ошибок.
- Если catalog не может надежно выполнить bulk query или собрать snapshots, action возвращает `ok: false`.
- Потребитель должен считать отсутствующий snapshot сигналом удалить/не индексировать продукт, но должен retry-ить или логировать `ok: false` согласно `retryable`.

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

Tombstone snapshot - это минимальный snapshot для деиндексации или invalidation. Он не должен переносить публичные display/search поля продукта, потому что такие поля могут быть устаревшими или уже не публичными.

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

Правила tombstone:

- `productId`, `revision` и `status` обязательны.
- `status: "deleted"` означает, что продукт удален или catalog больше не может считать его существующим публичным ресурсом.
- `status: "unpublished"` означает, что продукт существует, но не должен быть видим в публичных read projections.
- Для `"deleted"` и `"unpublished"` поля `handle`, `title`, `description`, `primaryImageId`, `categories`, `tags`, `variants`, `attributes` и `searchableText` должны отсутствовать.
- `updatedAt` может быть возвращен только если он отражает момент удаления или изменения publication state, а не старое обновление публичных данных.
- `revision` в tombstone должен быть последней известной revision, из-за которой продукт стал непубличным. Потребитель использует ее для защиты от out-of-order events.

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

## Event Contract

Событие должно быть маленьким и не содержать полный продукт.

Canonical event contract должен жить в `packages/events/src/types.ts`, потому что runtime handlers используют `@shopana/events` и `DomainEvent`.

Event type:

```ts
productPublicSnapshotChanged
```

Payload:

```ts
export interface ProductPublicSnapshotChangedPayload {
  storeId: string;
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

export interface ProductPublicSnapshotChangedEvent
  extends DomainEvent<
    "productPublicSnapshotChanged",
    ProductPublicSnapshotChangedPayload
  > {}
```

Это событие не заменяет существующий `productUpdated` partial-change event. `productUpdated` описывает, какие catalog fields изменились. `productPublicSnapshotChanged` сообщает потребителям публичных read projections, что публичный snapshot продукта нужно перечитать через `catalog.getProductPublicSnapshots`.

Emit должен идти через существующий events service:

```ts
await broker.runWorkflow("events.emit", {
  eventType: "productPublicSnapshotChanged",
  payload: {
    storeId,
    productId,
    revision,
    reason,
  },
  source: "catalog",
  context: {
    tenantId,
    userId,
  },
  subject: { type: "product", id: productId },
  emitKey: `product-public-snapshot:${productId}`,
});
```

Правила:

- событие должно быть типизировано через `@shopana/events`, а не объявлено локально в `listing`;
- `listing`, `search`, storefront cache и recommendations подписываются на `productPublicSnapshotChanged`;
- payload не содержит публичный snapshot, только ключи для повторного чтения;
- `revision` в payload должен соответствовать revision изменения, из-за которого public snapshot мог измениться;
- category/tag/media/publication изменения, влияющие на публичный snapshot продукта, должны эмитить это же событие для затронутых `productId`.
- `context.tenantId` должен следовать существующему `EventContext`; он не заменяет `payload.storeId` и не используется public read API для фильтрации catalog data.

## Event Flow

Пример обработки события в `listing`:

```ts
// listing получил ProductPublicSnapshotChangedEvent
const payload = event.payload;
const currentIndexedRevision = await listingIndexer.getProductRevision(
  payload.productId
);

if (
  currentIndexedRevision != null &&
  payload.revision < currentIndexedRevision
) {
  return;
}

const result = await serviceApi.catalog.getProductPublicSnapshots({
  storeId: payload.storeId,
  productIds: [payload.productId],
  locale: "uk",
  currencyCode: "UAH",
});

if (!result.ok) {
  throw new Error(result.message);
}

const snapshot = result.products[0];
const snapshotRevision = snapshot?.revision ?? payload.revision;

if (
  currentIndexedRevision != null &&
  snapshotRevision < currentIndexedRevision
) {
  return;
}

if (!snapshot || snapshot.status !== "published") {
  await listingIndexer.removeProduct(payload.productId, {
    revision: snapshotRevision,
  });
} else {
  await listingIndexer.reindexProduct(snapshot);
}
```

## Revision Handling

`revision` обязателен. Потребители должны использовать его для защиты от out-of-order events.

Сравнение должно выполняться в двух местах:

- до запроса в `catalog`, чтобы не обрабатывать заведомо старое событие;
- после ответа `catalog`, потому что snapshot может иметь revision новее или старее event revision.

Правила:

- если `event.revision < currentIndexedRevision`, событие нужно пропустить без запроса snapshot;
- если `snapshot.revision < currentIndexedRevision`, результат запроса нужно пропустить;
- если `snapshot.revision > event.revision`, потребитель может индексировать более свежий snapshot, потому что catalog вернул актуальное состояние;
- если `snapshot.revision === currentIndexedRevision`, операция должна быть idempotent: повторный reindex/remove не должен портить состояние;
- если snapshot отсутствует, потребитель использует `event.revision` как revision удаления/деиндексации;
- tombstone snapshot должен проходить те же revision checks, что и published snapshot.

Если событие пришло позже, но содержит старую revision, `listing` не должен перезаписывать более свежий индекс старым snapshot или удалять уже переиндексированный продукт.

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
export interface GetProductPublicSnapshotsParams {
  storeId: string;
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

`types.ts` содержит `CatalogApiClient` и при необходимости re-export типов из `@shopana/broker-types`, но не дублирует DTO broker action.

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
