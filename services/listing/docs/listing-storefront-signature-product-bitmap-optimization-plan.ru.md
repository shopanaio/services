# Альтернативный план оптимизации option facet counts через signature product bitmap

## Назначение

Этот документ описывает альтернативный read/index contract для ускорения
storefront option facet counts без отказа от strict same-variant semantics для
option-vs-option фильтров.

Идея: хранить product bitmap для каждой реально существующей полной option
signature variant-а. Runtime counts больше не должен для
option-only cases каждый раз делать broad projection `variant_doc_id ->
product_doc_id` и dedup products.

Документ задает read/index contract и runtime query shape. Write-side sync,
backfill, repair и audit, которые наполняют и поддерживают эти таблицы, находятся
за scope этого плана и должны быть описаны отдельным sync-планом.

Это отдельная альтернатива текущему плану
`services/listing/docs/listing-storefront-query-optimization-plan.ru.md`.
Она нарушает ограничение "не добавлять новые данные/materialized projections",
поэтому не должна смешиваться с no-new-data вариантом без явного решения.

## Цель

Сохранить semantics:

```text
option facet counts answer:
  сколько products имеют один in-stock storefront-eligible variant,
  который одновременно удовлетворяет active option predicates
  и candidate option value
```

При этом заменить hot runtime path:

```text
variant option bitmaps
AND on variant_doc_id
project variants to products
deduplicate product_doc_id
count products
```

на:

```text
find full variant signatures containing required option values
OR precomputed product bitmaps for those signatures
intersect with product scope/product filters
count products
```

## Не цели

План не пытается:

- хранить price ranges или price buckets в bitmap;
- строить все теоретические option combinations;
- строить все sub-signatures каждого variant;
- заменить `variant/facet` postings для filtering/page collection;
- ускорить arbitrary price-filtered option counts без variant-level refinement;
- описать sync/backfill/repair/audit lifecycle для новых таблиц.

## Основная модель

Index contract предполагает ровно одну full option signature для каждого
storefront-eligible in-stock variant:

```text
signature = sorted unique root display option value keys of one variant
```

Пример:

```text
P1/V1: color=red,  size=M, material=cotton
P1/V2: color=blue, size=L, material=cotton
P2/V3: color=red,  size=L, material=wool
```

Runtime index хранит только реально существующие full signatures:

```text
sig(color=red,size=M,material=cotton)  -> products P1
sig(color=blue,size=L,material=cotton) -> products P1
sig(color=red,size=L,material=wool)    -> products P2
```

Индекс не создает отсутствующую комбинацию:

```text
sig(color=blue,size=M,material=wool)
```

Индекс также не создает sub-signatures:

```text
sig(color=red)
sig(size=M)
sig(color=red,size=M)
```

Partial matching выполняется runtime lookup-ом: найти все full signatures,
которые содержат required values.

## Почему это быстрее

Без signature product bitmap strict count для каждого candidate option value
делает:

```text
active option variant bitmap
& candidate option variant bitmap
& in_stock variant bitmap
-> variant_doc_id set
-> project to product_doc_id
-> deduplicate products
-> cardinality
```

С signature product bitmap option-only count делает:

```text
matching signature ids by required value keys
-> OR signature product bitmaps
-> product bitmap
-> cardinality(product scope & product filters & signature products)
```

Самая дорогая часть `variant -> product -> distinct products` перенесена из
request-time в materialized index.

## Новый индексный контракт

### Таблица signature rows

```sql
CREATE TABLE listing.listing_option_signature (
  project_id           uuid NOT NULL,
  signature_key        text NOT NULL,
  option_value_count   int NOT NULL,
  product_bitmap       roaringbitmap NOT NULL,
  cardinality          bigint NOT NULL,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at           timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, signature_key),
  CONSTRAINT chk_listing_option_signature_value_count_positive
    CHECK (option_value_count > 0),
  CONSTRAINT chk_listing_option_signature_cardinality_nonnegative
    CHECK (cardinality >= 0)
);
```

`signature_key` должен быть стабильным opaque key, например hash от sorted
`value_key` list. Внешний код не должен парсить его для получения
`facet_id/value_id`.

Canonical hash input должен быть versioned и audit-friendly:

```text
signature_key = 'v1:' || sha256(join('\n', sorted_unique_value_keys))
metadata.canonical_value_keys = sorted_unique_value_keys
metadata.signature_version = 1
```

`metadata.canonical_value_keys` не является runtime source of truth для lookup,
но нужен для audit/debug и для безопасной смены алгоритма ключа. Reverse lookup
таблица ниже остается runtime index-ом для поиска signatures by contained values.

`product_bitmap` содержит `product_doc_id` products, у которых есть хотя бы один
storefront-eligible in-stock variant с этой exact full signature.

### Таблица reverse lookup

```sql
CREATE TABLE listing.listing_option_signature_value (
  project_id     uuid NOT NULL,
  signature_key  text NOT NULL,
  facet_id       uuid NOT NULL,
  value_key      text NOT NULL,

  PRIMARY KEY (project_id, signature_key, value_key),
  FOREIGN KEY (project_id, signature_key)
    REFERENCES listing.listing_option_signature(project_id, signature_key)
    ON DELETE CASCADE
);

CREATE INDEX idx_listing_option_signature_value_lookup
  ON listing.listing_option_signature_value (project_id, value_key, signature_key);
```

Reverse lookup нужен для partial matching:

```text
найти full signatures, которые содержат все required value_key
```

### `signature_key` в существующих variant/price таблицах

Новая таблица для связи `variant_doc_id -> signature_key` не нужна. Ключ
сохраняется в существующих derived index tables:

```sql
ALTER TABLE listing.variant_listing_index
  ADD COLUMN signature_key text;

CREATE INDEX idx_variant_listing_signature
  ON listing.variant_listing_index (
    project_id,
    signature_key,
    variant_doc_id,
    product_doc_id
  )
  WHERE signature_key IS NOT NULL;

ALTER TABLE listing.variant_listing_price_index
  ADD COLUMN variant_doc_id int,
  ADD COLUMN product_doc_id int,
  ADD COLUMN product_id uuid,
  ADD COLUMN signature_key text;

CREATE INDEX idx_variant_listing_price_signature_range
  ON listing.variant_listing_price_index (
    project_id,
    signature_key,
    currency,
    price_minor,
    product_doc_id,
    variant_doc_id
  )
  WHERE has_price = true
    AND signature_key IS NOT NULL;
```

`variant_listing_index.signature_key` является canonical current membership
variant-а. Write-side lifecycle может использовать его, чтобы найти previous
signature variant-а и корректно поддерживать product membership.

`variant_listing_price_index` расширяется doc id columns и denormalized
`signature_key`, поэтому он становится price table with B-tree index optimized
for storefront price range scans. Это убирает необходимость в отдельной
`listing_posting_variant_price` для этого path. Same-variant semantics
сохраняется, потому `signature_key`, `price_minor` и `variant_doc_id`
принадлежат одной строке variant price index.

## Почему не `listing_posting_bitmap`

Можно технически хранить rows в `listing.listing_posting_bitmap`:

```text
entity_type = product
field = option_signature
value_key = <signature_key>
bitmap = product_doc_id values
```

Но отдельная таблица предпочтительнее:

- signature rows имеют собственный reverse lookup по contained option values;
- это другой индексный contract, не обычный posting по одному value;
- проще external audit/repair: signature bitmap должен сверяться с variant option
  set и `variant_listing_index.in_stock`;
- меньше риска спутать `product/facet`, `variant/facet` и derived signatures.

Если команда решит использовать `listing_posting_bitmap`, reverse lookup таблица
все равно нужна.

## Runtime partial matching

Если active filter:

```text
color = red
```

и нужно посчитать count для:

```text
size = M
```

required set:

```text
color:red
size:M
```

Runtime ищет все full signatures, которые содержат оба value keys:

```sql
WITH required_values(value_key) AS (
  VALUES
    (:color_red_value_key),
    (:size_m_value_key)
),
matching_signatures AS (
  SELECT sv.signature_key
  FROM listing.listing_option_signature_value sv
  JOIN required_values rv
    ON rv.value_key = sv.value_key
  WHERE sv.project_id = :projectId
  GROUP BY sv.signature_key
  HAVING COUNT(DISTINCT sv.value_key) = (SELECT COUNT(*) FROM required_values)
)
SELECT COALESCE(rb_or_agg(os.product_bitmap), rb_build_empty()) AS products
FROM matching_signatures ms
JOIN listing.listing_option_signature os
  ON os.project_id = :projectId
 AND os.signature_key = ms.signature_key;
```

Если signature содержит дополнительные option dimensions, она все равно подходит:

```text
sig(color=red,size=M,material=cotton)
sig(color=red,size=M,material=wool)
```

Обе содержат required set `color=red + size=M`, поэтому оба product bitmaps
OR-ятся.

## Count semantics

### Active option filters

Для candidate value count текущий facet изолируется как раньше:

```text
required option values =
  all active option groups except current candidate facet
  + candidate value
```

Пример:

```text
active filters:
  color = red
  material = cotton

count candidate:
  size = M

required:
  color:red
  material:cotton
  size:M
```

Count:

```text
matching_signature_products =
  OR product_bitmap for full signatures containing all required values

count =
  cardinality(
    scope_products
    & published_products
    & product_filters
    & matching_signature_products
  )
```

### OR внутри facet group

Если active group содержит несколько values:

```text
color = red OR blue
```

то runtime должен строить disjunctive required sets:

```text
required set A: color:red  + candidate value
required set B: color:blue + candidate value
```

Затем:

```text
candidate_products =
  products(required set A)
  OR products(required set B)
```

Для нескольких OR groups получается disjunctive normal form. Это потенциальный
источник combinatorial runtime cost, поэтому нужно ограничить/измерить:

```text
required set combinations = product(active group value counts excluding candidate facet)
```

Если combinations слишком много, Query D должен fallback-нуться на strict
variant bitmap path или иметь explicit guard/SLR rule.

### Empty option filters

Если нет active option filters, count candidate value:

```text
required = [candidate value]
```

Matching signatures: все full signatures, которые содержат candidate value.

Это эквивалентно:

```text
products with at least one in-stock variant containing candidate value
```

### Active price filter

Price не хранится в bitmap/signature.

Если active price predicate есть, strict same-variant semantics требует, чтобы
candidate option values и price predicate совпали на одном `variant_doc_id`.
`signature -> product_bitmap` этого доказать не может.

Initial implementation не должен добавлять отдельную price bitmap/table. Вместо
этого расширяется существующая `listing.variant_listing_price_index`: она хранит
doc ids и denormalized `signature_key`, нужные runtime range path.

Runtime shape для price-filtered option count:

```text
required option values
-> matching signature keys
-> filter variant_listing_price_index by signature_key
-> apply currency/price range on same variant row
-> rb_build_agg(product_doc_id)
-> intersect with product scope/product filters
-> cardinality
```

Пример SQL shape:

```sql
WITH required_values(value_key) AS (
  VALUES
    (:color_red_value_key),
    (:size_m_value_key)
),
matching_signatures AS (
  SELECT sv.signature_key
  FROM listing.listing_option_signature_value sv
  JOIN required_values rv
    ON rv.value_key = sv.value_key
  WHERE sv.project_id = :projectId
  GROUP BY sv.signature_key
  HAVING COUNT(DISTINCT sv.value_key) = (SELECT COUNT(*) FROM required_values)
),
price_matching_products AS (
  SELECT COALESCE(rb_build_agg(vp.product_doc_id), rb_build_empty()) AS bitmap
  FROM matching_signatures ms
  JOIN listing.variant_listing_price_index vp
    ON vp.project_id = :projectId
   AND vp.signature_key = ms.signature_key
  WHERE vp.currency = :currency
    AND vp.has_price = true
    AND (:minPriceMinor IS NULL OR vp.price_minor >= :minPriceMinor)
    AND (:maxPriceMinor IS NULL OR vp.price_minor <= :maxPriceMinor)
)
SELECT bitmap
FROM price_matching_products;
```

Для этого path используется partial B-tree index, optimized for price range scans
on the existing price table:

```sql
CREATE INDEX idx_variant_listing_price_signature_range
  ON listing.variant_listing_price_index (
    project_id,
    signature_key,
    currency,
    price_minor,
    product_doc_id,
    variant_doc_id
  )
  WHERE has_price = true
    AND signature_key IS NOT NULL;
```

Эта ветка не является fallback на generic strict option bitmap path. Active
price filter тоже должен работать через signatures: option predicates сначала
сужаются до matching `signature_key`, а price predicate применяется к тем же
variant price rows в `variant_listing_price_index`, где `signature_key`,
`price_minor` и `variant_doc_id` принадлежат одной строке.

Strict variant-level path остается только guard/verification path, если:

```text
- required set DNF превышает configured limit;
- matching signatures слишком много для configured limit;
- signature index freshness invalid;
- planner/metrics показывают, что signature+price range-scan path хуже strict
  path для конкретного класса запросов.
```

### Active stock filter

Signature index строится только из storefront-eligible in-stock variants.

Поэтому:

- missing stock filter: signature index корректен;
- `in_stock = true`: signature index корректен;
- `in_stock = false` вместе с option path: option counts должны быть zero или
  fallback-нуться в текущую semantics, где out-of-stock variants не участвуют в
  option filters/counts.

## Query D shape

Query D остается одним all-facet-counts SQL statement:

```text
Branch D1: product facet counts через product/facet bitmap
Branch D2: replacement primary option facet counts через signature-based path,
если:
  - required set DNF не превышает configured limit;
  - matching signatures не превышают configured limit;
  - signature index freshness valid.
Branch D2a: option-only counts через precomputed signature product_bitmap.
Branch D2b: option+price counts тоже через matching signatures плюс
  variant_listing_price_index.signature_key.
Branch D3: strict variant-level option counts только для guard/freshness/
verification cases.
```

Все branch-и остаются внутри одного Query D SQL statement, чтобы full listing
response сохранял лимит read statements текущего плана.

## Candidate metadata

Query C может использовать signature index для option metadata candidates:

```text
option value visible in scope if there is at least one matching full signature
whose product_bitmap intersects scope_product_base
```

Но для простоты initial implementation может оставить Query C на текущем
`variant/facet` postings path. Важно, чтобы Query C и Query D возвращали counts
для одного набора enabled root display values.

## Write-side contract outside scope

Этот план не описывает порядок refresh/delete writes, locking, backfill,
incremental repair или audit jobs. Отдельный sync-план должен поддержать
следующие инварианты read model:

- `listing_option_signature.product_bitmap` содержит products, у которых есть
  хотя бы один storefront-eligible in-stock variant с exact full signature;
- `listing_option_signature_value` содержит reverse lookup rows для всех
  contained option value keys signature;
- `variant_listing_index.signature_key` отражает current signature eligible
  variant-а или `NULL`, если variant не должен участвовать в signature index;
- active `variant_listing_price_index` rows содержат doc ids и denormalized
  `signature_key` same variant-а;
- `listing_option_signature_product_membership` хранит duplicate-aware
  membership counter для product/signature.

Если у одного product несколько in-stock variants с одинаковой signature,
bitmap dedup скрывает duplicate membership. Поэтому write-side lifecycle хранит
canonical variant signature прямо в existing `variant_listing_index.signature_key`
и отдельный product membership counter:

```text
variant signature:
  variant_listing_index.signature_key

product membership counter:
  (project_id, signature_key, product_doc_id) -> variant_count
```

`variant_listing_index.signature_key` отвечает на вопрос "какую старую signature
нужно убрать при изменении variant". Product membership counter отвечает на
вопрос "можно ли удалить product_doc_id из product_bitmap, если один variant
исчез".

### Membership counter table

```sql
CREATE TABLE listing.listing_option_signature_product_membership (
  project_id      uuid NOT NULL,
  signature_key   text NOT NULL,
  product_doc_id  int NOT NULL,
  variant_count   int NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (project_id, signature_key, product_doc_id),
  FOREIGN KEY (project_id, signature_key)
    REFERENCES listing.listing_option_signature(project_id, signature_key)
    ON DELETE CASCADE,
  CONSTRAINT chk_listing_option_signature_membership_variant_count_positive
    CHECK (variant_count > 0)
);
```

`product_bitmap` является physical index over this membership table. Membership
table является source/debug layer для корректного duplicate-aware membership
maintenance. Алгоритм refresh/delete maintenance не входит в этот план.

### Price index contract

Signature index не создает отдельную price table. Existing write flow продолжает
поддерживать `listing.variant_listing_price_index`, но каждая active price row
должна получать doc ids и denormalized `signature_key` текущего variant.

После перевода price filters, price range и matched variant price sort на
расширенный `variant_listing_price_index` таблица
`listing.listing_posting_variant_price` становится дубликатом физического price
index-а и должна быть выведена из read/write path:

```text
1. runtime storefront queries stop reading listing_posting_variant_price;
2. write-side stops writing listing_posting_variant_price;
3. follow-up handwritten migration drops listing_posting_variant_price and its
   indexes after all repository references are removed.
```

Для price-filtered option counts требуется только, чтобы порядок записи в одной
product/variant refresh transaction сохранял инвариант:

```text
variant_listing_index current
variant_listing_index.signature_key current
variant_listing_price_index doc ids/signature_key current
```

Если variant теряет stock/storefront eligibility, его
`variant_listing_index.signature_key` и
`variant_listing_price_index.signature_key` очищаются. Price rows могут
удаляться своим текущим lifecycle-ом; runtime signature+price branch читает
только rows with `signature_key IS NOT NULL`, поэтому stale/missing price rows
не создают false positives.

## Freshness assumptions

Отдельный sync/audit план должен гарантировать:

- каждая signature row имеет reverse lookup rows, соответствующие full sorted
  option value list;
- `cardinality = rb_cardinality(product_bitmap)`;
- membership table и product bitmap содержат одинаковые products;
- `variant_listing_index.signature_key` соответствует product membership
  counters;
- `variant_listing_index.signature_key` заполнен только для in-stock
  storefront-eligible variants;
- `variant_listing_price_index.signature_key` равен current
  `variant_listing_index.signature_key` для same variant price rows;
- disabled/invalid/source-only option values не попадают в signatures;
- stale signature rows without membership не участвуют в runtime reads;
- product_doc_id/variant_doc_id всегда scoped by `project_id`.

## Size model

Если хранить только full signatures:

```text
unique_signature_count <= in_stock_variant_count
```

Reverse lookup size:

```text
signature_value_rows ~= unique_signature_count * avg_option_values_per_variant
```

Membership size:

```text
signature_product_memberships <= in_stock_variant_count
```

Это не combinatorial explosion всех возможных фильтров. Explosion появляется
только если хранить sub-signatures:

```text
sub_signatures_per_variant = 2^option_value_count - 1
```

Sub-signatures запрещены в этом плане.

## Performance risks

- Если active filters пустые, candidate value может match-ить много signatures,
  и `rb_or_agg(product_bitmap)` может быть дорогим.
- OR-heavy filters создают DNF combinations.
- Signature lookup добавляет joins/grouping в Query D.
- Price-filtered option counts добавляют range scan по
  `variant_listing_price_index(signature_key, currency, price_minor)`.
- Write-side maintenance становится дороже.
- Storage и audit complexity растут.
- Active price filter не может использовать plain `signature -> product_bitmap`;
  он должен использовать existing variant price relation with denormalized
  `signature_key` или fallback guard.

## Implementation phases

### Фаза 0. Decision record

Зафиксировать, что команда сознательно разрешает materialized same-variant
option-combination product projection.

Acceptance:

- текущий no-new-data план не считается единственным approved path;
- docs явно говорят, что signature index является materialized projection;
- price не включается в signature bitmap.

### Фаза 1. Data model

Добавить handwritten listing migration:

```text
listing_option_signature
listing_option_signature_value
listing_option_signature_product_membership
ALTER variant_listing_index ADD signature_key
ALTER variant_listing_price_index ADD doc ids/signature_key
DROP listing_posting_variant_price after read/write path migration
```

Acceptance:

- таблицы scoped by `project_id`;
- есть lookup index `(project_id, value_key, signature_key)`;
- есть partial B-tree index на `variant_listing_price_index`, optimized for
  price range scans:
  `(project_id, signature_key, currency, price_minor, product_doc_id, variant_doc_id)`;
- `listing_posting_variant_price` не остается parallel source для runtime price
  reads/writes после cutover;
- product bitmap cardinality хранится и доступна для external audit;
- `signature_key` имеет versioned canonical hash input и audit metadata;
- historical migrations не редактируются.

### Фаза 2. Query D option counts replacement

Заменить primary `Query D option_facet_counts` algorithm на signature-based
path:

- option-only через `listing_option_signature.product_bitmap`;
- option+price через matching signatures и existing
  `variant_listing_price_index.signature_key`.

Acceptance:

- active option filters сохраняют same-variant semantics через full signature
  containment;
- active price filters сохраняют same-variant semantics, потому
  `signature_key`, `price_minor` и `variant_doc_id` находятся в одной price row;
- OR within facet group поддержан через bounded DNF;
- current candidate facet изолируется;
- result counts совпадают со strict variant-level implementation на fixtures;
- strict variant-level path остается только guard/verification path при DNF
  limit exceeded, matching signature limit exceeded, stale signature freshness
  или measured regression guard.

### Фаза 3. Metrics and guardrails

Добавить runtime metrics:

```text
signature_count
required_set_count
matching_signature_count per candidate
OR bitmap count
price_signature_range_row_count
fallback reason
Query D duration
```

Acceptance:

- можно сравнить Query D strict variant path vs signature path;
- p95 Query D улучшается на representative option-only scenarios;
- price-filtered scenarios имеют отдельный metric для signature+price range scan и
  могут fallback-нуться только по guard/freshness/performance rule.

### Фаза 4. Удаление legacy price bitmap таблицы

После cutover-а price reads/writes на расширенный
`listing.variant_listing_price_index` удалить legacy physical price index:

```text
DROP TABLE listing.listing_posting_variant_price;
```

Если в текущей схеме indexes/constraints для
`listing.listing_posting_variant_price` не удаляются автоматически через
`DROP TABLE`, migration должна явно удалить их перед `DROP TABLE`.

Acceptance:

- в коде не осталось read references на `listing_posting_variant_price`;
- write-side cutover на `variant_listing_price_index` завершен отдельным
  sync/write-path планом;
- нет audit/repair/job references на `listing_posting_variant_price`;
- `variant_listing_price_index` покрывает все runtime price filter, price range
  и matched variant price sort use cases;
- handwritten migration удаляет `listing_posting_variant_price` и связанные с
  ней indexes/constraints;
- historical migrations не редактируются.

## Correctness fixtures

Минимальные fixtures:

- one product, two variants: `red/M`, `blue/L`;
- several products sharing same signature;
- one product with duplicate variants same signature;
- active `color=red`, count `size=M/L`;
- active `color=red OR blue`, count `size=M`;
- active `material=cotton`, count `color`;
- missing option filter, count all option values;
- active price filter uses `variant_listing_price_index.signature_key` and matches strict
  variant path;
- out-of-stock/non-storefront variants absent from signature index;
- disabled/source child value resolves to enabled root display value.

## Итог

Signature product bitmap ускоряет strict same-variant option counts by
materializing:

```text
full in-stock variant option combination -> product bitmap
```

Он хранит только реально существующие full variant signatures, поэтому размер
ограничен количеством in-stock variants. Partial filters работают через lookup
full signatures containing required values.

Главный trade-off:

```text
faster option-only counts
vs
more storage, more write-side complexity, materialized projection contract
```

Для active price filters strict same-variant correctness требует existing
variant price relation with denormalized `signature_key`. Price остается typed
numeric value queried through a B-tree range scan, not bitmap, а fallback нужен
только как guard/freshness/performance escape hatch.

## Строгий порядок выполнения плана

Порядок ниже обязателен. Следующий шаг нельзя начинать, пока acceptance
предыдущего шага не выполнен и не зафиксирован в документации/коде/миграциях
соответствующего этапа.

1. Зафиксировать decision record из Фазы 0:
   - явно выбрать materialized signature product bitmap как approved path;
   - подтвердить, что price не входит в signature bitmap;
   - подтвердить, что no-new-data план остается отдельной альтернативой.
2. Добавить новую handwritten migration data model из Фазы 1:
   - создать `listing_option_signature`;
   - создать `listing_option_signature_value`;
   - создать `listing_option_signature_product_membership`;
   - добавить `variant_listing_index.signature_key`;
   - расширить `variant_listing_price_index` doc id columns и
     `signature_key`;
   - добавить все lookup/partial indexes и constraints.
3. Реализовать canonical signature key contract:
   - sorted unique root display option value keys;
   - versioned hash input `v1`;
   - `metadata.canonical_value_keys`;
   - `metadata.signature_version`.
4. Зафиксировать external sync contract:
   - sync/backfill/repair/audit описываются отдельным планом;
   - этот runtime план стартует только когда signature tables поддерживают
     freshness assumptions из этого документа.
5. Заменить primary Query D option-only algorithm:
   - строить required sets с изоляцией current candidate facet;
   - искать full signatures через reverse lookup;
   - OR-ить `listing_option_signature.product_bitmap`;
   - intersect-ить результат с product scope/product filters.
6. Заменить primary Query D option+price algorithm:
   - использовать matching signature keys;
   - читать `variant_listing_price_index.signature_key`;
   - применять currency/price range на той же variant price row;
   - собирать product bitmap из `product_doc_id`.
7. Реализовать bounded DNF и fallback rules:
    - limit на required set combinations;
    - limit на matching signatures;
    - fallback при stale freshness;
    - fallback при measured regression guard.
8. Добавить runtime metrics из Фазы 3:
    - counts для signatures/required sets/matching signatures/OR bitmaps;
    - price range row count;
    - fallback reason;
    - Query D duration.
9. Добавить correctness fixtures и сверить signature path со strict
    variant-level path на всех сценариях из раздела `Correctness fixtures`.
10. Перевести runtime price reads с `listing_posting_variant_price` на
    расширенный `variant_listing_price_index`.
11. Удаление write-side references на `listing_posting_variant_price` выполняется
    отдельным sync/write-path планом.
12. Удалить все оставшиеся non-runtime references на
    `listing_posting_variant_price`:
    - audit jobs;
    - repair jobs;
    - repository helpers;
    - schema/query helpers;
    - documentation references, которые называют таблицу active source.
13. Добавить follow-up handwritten migration удаления legacy table:
    - явно drop-нуть indexes/constraints
      `listing_posting_variant_price`, если они не удаляются автоматически;
    - выполнить `DROP TABLE listing.listing_posting_variant_price`;
    - не редактировать historical migrations.
14. После migration удаления повторно проверить, что
    `variant_listing_price_index` остается единственным physical runtime price
    index для listing storefront path.
