# Wishlist в Customers Service

## Кратко

Добавить несколько именованных wishlist для Customer и товарные позиции внутри
них. Admin API получает исполняемый read-only доступ. Storefront получает только
будущий SDL-контракт CRUD: он проверяется отдельно, но не публикуется в активный
Storefront supergraph до появления Customers Storefront server и resolver'ов.

## Граница задачи

- В задачу входят база данных, Drizzle-модели, repositories, loaders, scripts,
  Admin resolver'ы и оба SDL-контракта.
- Admin API является исполняемым и включается в Customers Admin server.
- Storefront SDL описывает будущий viewer-owned API. В этой задаче он не имеет
  resolver'ов и runtime endpoint, поэтому:
  - проверяется как изолированный subgraph SDL и на совместимость с остальными
    Storefront SDL;
  - не добавляется в публикуемую gateway/supergraph-конфигурацию;
  - не считается доступным клиентам до отдельной задачи на Storefront runtime.
- Конфигурация портов и запуск Customers Storefront server не меняются.

## Модель данных и tenant-инварианты

- Добавить миграцию домена `0600_wishlist` и Drizzle-модели.
- `customer_wishlist`:
  - `id` UUIDv7;
  - `store_id`, `customer_id`;
  - `name`, `normalized_name`, `is_default`;
  - `created_at`, `updated_at`.
- `customer_wishlist_item`:
  - `id` UUIDv7;
  - `store_id`, `customer_id`, `wishlist_id`;
  - внешний `product_id` без FK в Catalog;
  - `added_at`.
- Все дублированные tenant/owner ключи защищаются базой, а не только repository:
  - добавить candidate key `customer (store_id, id)`;
  - добавить candidate key `customer_wishlist (store_id, customer_id, id)`;
  - FK `(store_id, customer_id)` из wishlist в Customer;
  - FK `(store_id, customer_id, wishlist_id)` из item в wishlist с
    `ON DELETE CASCADE`;
  - таким образом item не может ссылаться на wishlist другого Store или
    Customer.
- Добавить ограничения:
  - уникальное имя списка:
    `(store_id, customer_id, normalized_name)`;
  - не более одного default списка:
    partial unique `(store_id, customer_id) WHERE is_default = true`;
  - не более одного Product в списке:
    `(store_id, customer_id, wishlist_id, product_id)`;
  - `name` и `normalized_name` не пусты после `btrim`;
  - максимальная длина имени — 128 символов.
- Индексы для основных чтений:
  - wishlist `(store_id, customer_id, created_at, id)`;
  - items `(store_id, customer_id, wishlist_id, added_at, id)`;
  - lookup items по Product
    `(store_id, customer_id, product_id, wishlist_id)`.

## Нормализация имени

- Входное имя обрезается с краёв и не может стать пустым.
- `normalized_name` вычисляется единообразно в script/repository как Unicode
  NFKC от обрезанного имени с последующим locale-independent lowercase.
- Пользовательское `name` хранит обрезанное отображаемое значение.
- Конфликт нормализованного имени возвращается как `CustomerUserError` с кодом
  `WISHLIST_NAME_TAKEN` и полем `name`.

## Repository, loaders и pagination

- Реализовать tenant-scoped repositories для wishlist и items. Каждый
  `find/get/update/delete/connection` фильтрует как минимум по `store_id` из
  trusted context.
- Customer-scoped операции дополнительно принимают `customer_id`; операции по
  item дополнительно проверяют совпадение owner-ключей связанного wishlist.
- Прямое чтение wishlist/item требует существующего Customer с
  `deleted_at IS NULL` и lifecycle status не `MERGED`/`REDACTED`. Это
  defence-in-depth на случай некорректных или старых строк.
- Добавить per-request loaders:
  - wishlist по ID;
  - item по ID;
  - default wishlist по Customer ID.
- Добавить Relay connections:
  - wishlist Customer;
  - items внутри wishlist.
- Использовать `@shopana/drizzle-query`, max limit `100`, default limit `20` и
  обязательный tie-breaker `id`.
- Default ordering:
  - wishlist: `createdAt ASC, id ASC`;
  - items: `addedAt DESC, id DESC`.

## Scripts и конкурентность

- Реализовать scripts для создания, переименования и удаления списков, а также
  добавления и удаления продуктов.
- Все IDs из GraphQL сначала декодируются с ожидаемым `GlobalIdEntity`; ID
  неправильного типа возвращает user error, а не рассматривается как UUID.
- Первый созданный список становится default. Добавление без `wishlistId`
  лениво получает или создаёт default с именем `Wishlist`.
- Создание/получение default выполняется атомарно:
  - операция находится в транзакции;
  - repository пытается вставить default через
    `INSERT ... ON CONFLICT (...) WHERE is_default = true DO NOTHING RETURNING`,
    не переводя транзакцию в aborted state;
  - отсутствие строки в `RETURNING` обрабатывается как ожидаемая гонка;
  - после конфликта перечитывается уже созданный default;
  - конкурентный `wishlistCreate` при отсутствии списков также не должен
    завершаться internal error: проигравшая транзакция повторяет создание как
    custom wishlist, если её имя не конфликтует.
- Основной список можно переименовать, но нельзя удалить. Custom-списки
  удаляются физически вместе с items.
- Добавление Product идемпотентно и не использует `SELECT` перед `INSERT` как
  единственную защиту:
  - применяется `INSERT ... ON CONFLICT DO NOTHING RETURNING`;
  - при конфликте repository перечитывает существующий item;
  - оба конкурентных вызова возвращают один и тот же логический item без
    `INTERNAL_ERROR`.
- Catalog broker validation выполняется до короткой DB-транзакции вставки, чтобы
  не удерживать транзакцию во время сетевого вызова. Изменение публикации сразу
  после validation допустимо: wishlist хранит ссылку, а не snapshot доступности.
- Ошибки уникальности и ownership переводятся в стабильные
  `CustomerUserError`, а не пробрасываются как database/internal errors.

## Catalog validation и Product semantics

- `wishlistProductAdd` принимает global ID типа `Product`, декодирует его в
  Catalog UUID и вызывает существующий `catalog.query` с:
  - `storeId` из trusted Customers context;
  - фильтром по точному Product ID;
  - выборкой `id`, `storeId`, `status`, `publishedAt`.
- Добавление разрешено, только если Catalog вернул ровно этот Product в текущем
  Store и `status = published`. Иначе вернуть:
  - `PRODUCT_NOT_FOUND` для отсутствующего/чужого Product;
  - `PRODUCT_NOT_PUBLISHED` для draft/unpublished Product;
  - `CATALOG_UNAVAILABLE` с retryable-признаком для недоступности Catalog.
- Снятие Product с публикации не удаляет сохранённый item.
- Семантика поля `product` разделяется по API:
  - Admin `CustomerWishlistItem.product: Product` возвращает федеративную ссылку
    на существующий Catalog Product независимо от текущего publish status;
    `null` допустим только если Product удалён или reference не разрешается;
  - будущий Storefront `CustomerWishlistItem.product: Product` является nullable
    и должен возвращать только опубликованный Product. Это поведение будет
    реализовано и runtime-проверено в задаче Storefront server/resolvers.
- Admin resolver не делает broker-вызов на каждый item и не создаёт N+1 только
  ради проверки публикации.

## Customer lifecycle

- Wishlist являются приватными customer preference data и не переживают
  прекращение существования исходного Customer.
- В той же транзакции, где `CustomerDeleteScript` выполняет soft delete
  Customer, физически удалить все его wishlist; items удалятся каскадно.
- При завершении merge физически удалить wishlist source Customer; wishlist
  target Customer не меняются и автоматически не объединяются.
- При redaction/privacy erasure физически удалить все wishlist Customer.
- Повторный lifecycle-вызов должен быть идемпотентным.
- Admin и будущие Storefront reads никогда не возвращают wishlist удалённого,
  merged или redacted Customer даже между lifecycle-повторами.

## Admin GraphQL-контракт

- Добавить `CustomerWishlist` и `CustomerWishlistItem` в `GlobalIdEntity`.
- Оба типа реализуют `Node` и кодируют ID через соответствующий тип.
- `Customer` получает:
  - `wishlists(first, after, last, before, where, orderBy)`;
  - `defaultWishlist`.
- `CustomerWishlist` получает как минимум:
  - `id`, `name`, `isDefault`, `createdAt`, `updatedAt`;
  - `customer`;
  - `items(first, after, last, before, where, orderBy)`.
- `CustomerWishlistItem` получает как минимум:
  - `id`, `wishlist`, `product`, `addedAt`.
- `CustomersQuery` получает:
  - `customerWishlist(id)`;
  - `customerWishlistItem(id)`.
- Зарегистрировать оба типа в существующих `node(id)` и `nodes(ids)` с
  сохранением порядка и `null` для отсутствующего, чужого или неверно
  типизированного ID.
- Добавить Relay connections, generated where/order inputs и nullable
  федеративную ссылку на `Product`.
- Admin mutations не добавлять.

## Storefront SDL-контракт

- Все операции viewer-owned: Customer ID берётся только из trusted storefront
  context и никогда не принимается во входных данных.
- `Customer` получает:
  - `wishlists(first, after, last, before): CustomerWishlistConnection!`;
  - `defaultWishlist: CustomerWishlist`;
  - `wishlist(id: ID!): CustomerWishlist`.
- Mutations:
  - `wishlistCreate(input: WishlistCreateInput!)`;
  - `wishlistUpdate(id: ID!, input: WishlistUpdateInput!)`;
  - `wishlistDelete(id: ID!)`;
  - `wishlistProductAdd(productId: ID!, wishlistId: ID)`;
  - `wishlistProductRemove(itemId: ID!)`.
- Payloads возвращают сущность либо deleted global ID и
  `[CustomerUserError!]!`.
- Каждый переданный wishlist/item ID должен принадлежать viewer Customer и
  текущему Store; для чужого и отсутствующего ID возвращается одинаковый
  `NOT_FOUND`, чтобы не раскрывать существование чужих данных.
- У wishlist item нет изменяемых полей: поддерживаются add/read/remove, но не
  update, reorder или перенос между списками.
- Storefront resolver'ы, runtime authorization и published-only Product
  resolution реализуются отдельной задачей до публикации SDL в active
  supergraph.

## Документация и generated artifacts

- Обновить Customers README и database documentation.
- Добавить wishlist schema file в Admin server schema registry.
- Обновить generated Admin GraphQL filters/types и связанные resolver types.
- Обновить Storefront SDL artifact, не подключая runtime server.
- Changeset вручную не редактировать; при необходимости использовать только
  разрешённую генерацию changeset через npm.

## Проверка

- Repository/scripts сценарии:
  - tenant isolation и составные owner-инварианты;
  - отсутствие доступа по прямому ID к данным другого Store/Customer;
  - нормализация и уникальность имён;
  - ровно один default;
  - конкурентное первое создание списка;
  - конкурентное lazy creation default;
  - конкурентный и повторный Product add;
  - удаление custom и запрет удаления default;
  - Catalog validation и mapping ошибок;
  - неправильные типы global IDs;
  - customer delete, merge source и privacy erasure cleanup.
- Admin API проверки:
  - чтение списков и items;
  - pagination, default ordering и stable cursors;
  - direct queries, `node` и `nodes`;
  - global IDs;
  - Product federation reference для published и unpublished Product;
  - `null` для удалённого Product;
  - отсутствие данных другого Store и lifecycle-недоступных Customer.
- Проверить Admin composition и generated Admin types через `shopana-cli`.
- Storefront SDL проверять отдельно как контракт и на composition compatibility,
  но не включать Customers Storefront subgraph в публикуемый supergraph.
- Storefront CRUD не проверять исполнением в этой задаче, поскольку runtime
  намеренно отсутствует.
- Не запускать test/tsc/dev server/browser. Для получения новой версии кода
  выполнять только необходимые schema/codegen/build операции через
  `shopana-cli`.

## Принятые допущения

- Wishlist приватны и принадлежат только Customer текущего Store.
- Отдельной видимости, sharing, заметок, количества товара, ручного порядка и
  переноса items между списками нет.
- Wishlist source Customer не переносятся при merge.
- Ограничения на максимальное количество списков/items не вводятся в этой
  задаче; API и repository всё равно применяют ограниченную Relay pagination.
- Существующие нереализованные Storefront customer/profile/address/marketing
  resolver'ы не входят в задачу.
