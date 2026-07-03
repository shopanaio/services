# Альтернативный план оптимизации option facet counts через signature product bitmap

## Назначение

Этот документ описывает альтернативный read/index contract для ускорения
storefront option facet counts без отказа от strict same-variant semantics для
option-vs-option фильтров.

Идея: во время sync построить product bitmap для каждой реально существующей
полной option signature variant-а. Runtime counts больше не должен для
option-only cases каждый раз делать broad projection `variant_doc_id ->
product_doc_id` и dedup products.

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
- заменить `listing.listing_posting_variant_price` для price filters,
  price range или matched variant price sort;
- ускорить arbitrary price-filtered option counts без variant-level refinement.

## Основная модель

Для каждого storefront-eligible in-stock variant строится ровно одна full option
signature:

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
request-time в sync/index-time.

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
- проще audit/repair: signature bitmap должен сверяться с variant option set и
  `variant_listing_index.in_stock`;
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

Допустимые варианты:

1. Fallback для option counts на существующий strict variant-level path:

```text
option bitmaps
& price_variant relation/bitmap from listing_posting_variant_price
-> project variants to products
```

2. Дополнительный `signature -> variant_bitmap` index и price join/refinement:

```text
matching signatures
-> OR variant bitmaps
-> join/refine through listing_posting_variant_price
-> project to products
```

Initial implementation должен выбрать fallback, потому он проще и не добавляет
price materialization.

### Active stock filter

Signature index строится только из storefront-eligible in-stock variants.

Поэтому:

- missing stock filter: signature index корректен;
- `in_stock = true`: signature index корректен;
- `in_stock = false` вместе с option path: option counts должны быть zero или
  fallback-нуться в текущую semantics, где out-of-stock variants не участвуют в
  option filters/counts.

## Query D shape

Query D может иметь два branch-а для option counts:

```text
Branch D1: product facet counts через product/facet bitmap
Branch D2: option facet counts через signature product bitmap, если:
  - нет active price predicate;
  - required set DNF не превышает configured limit;
  - signature index freshness valid.
Branch D3 fallback: strict variant-level option counts.
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

## Sync maintenance

При refresh variant:

1. Resolve variant option source values into root display option `value_key`.
2. Drop disabled/invalid/non-display values.
3. If variant is not storefront-eligible or not in-stock:
   - remove previous signature membership for this variant/product if any.
4. Build sorted unique full signature value list.
5. Compute `signature_key`.
6. Add parent `product_doc_id` to
   `listing_option_signature.product_bitmap`.
7. Upsert signature value rows into `listing_option_signature_value`.
8. Recompute `cardinality = rb_cardinality(product_bitmap)`.

При удалении/soft-delete variant или stock change to out-of-stock:

```text
remove product_doc_id from old signature bitmap
delete signature row if bitmap becomes empty
delete reverse lookup rows via cascade
```

Если у одного product несколько in-stock variants с одинаковой signature,
bitmap dedup скрывает duplicate membership. Но sync должен знать, можно ли
удалять product_doc_id при удалении одного variant. Для этого нужен один из
вариантов:

```text
Option A:
  maintain normalized membership counter table
  (project_id, signature_key, product_doc_id, variant_count)

Option B:
  on variant refresh/delete recompute product membership for affected product
  and affected signatures from variant_listing_index + option mappings
```

Для incremental correctness предпочтительнее Option A.

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
table является source/debug layer для correct decrement при variant deletion.

## Freshness audit

Audit должен проверять:

- каждая signature row имеет reverse lookup rows, соответствующие full sorted
  option value list;
- `cardinality = rb_cardinality(product_bitmap)`;
- membership table и product bitmap содержат одинаковые products;
- signature membership соответствует in-stock storefront-eligible variants;
- disabled/invalid/source-only option values не попадают в signatures;
- stale signature rows without membership удаляются;
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
- Sync writes становятся дороже.
- Storage и audit complexity растут.
- Active price filter требует fallback или дополнительный variant refinement,
  потому price не является bitmap/signature dimension.

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
```

Acceptance:

- таблицы scoped by `project_id`;
- есть lookup index `(project_id, value_key, signature_key)`;
- product bitmap cardinality хранится и валидируется audit-ом;
- historical migrations не редактируются.

### Фаза 2. Sync maintenance

Добавить builder для full option signature per in-stock variant.

Acceptance:

- один variant дает не больше одной full signature;
- signatures строятся только из enabled root display option values;
- source children резолвятся в root display values;
- out-of-stock/non-storefront variants не участвуют;
- duplicate variants одного product с одной signature корректно учитываются через
  membership counter.

### Фаза 3. Query D signature branch

Добавить option count branch через signature product bitmap для cases без active
price predicate.

Acceptance:

- active option filters сохраняют same-variant semantics через full signature
  containment;
- OR within facet group поддержан через bounded DNF;
- current candidate facet изолируется;
- result counts совпадают со strict variant-level implementation на fixtures;
- fallback path используется при active price predicate или DNF limit exceeded.

### Фаза 4. Metrics and guardrails

Добавить runtime metrics:

```text
signature_count
required_set_count
matching_signature_count per candidate
OR bitmap count
fallback reason
Query D duration
```

Acceptance:

- можно сравнить Query D strict variant path vs signature path;
- p95 Query D улучшается на representative option-only scenarios;
- no regression for price-filtered scenarios because they fallback.

## Correctness fixtures

Минимальные fixtures:

- one product, two variants: `red/M`, `blue/L`;
- several products sharing same signature;
- one product with duplicate variants same signature;
- active `color=red`, count `size=M/L`;
- active `color=red OR blue`, count `size=M`;
- active `material=cotton`, count `color`;
- missing option filter, count all option values;
- active price filter triggers fallback and matches strict variant path;
- stock change removes signature membership;
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
more storage, more sync complexity, materialized projection contract
```

Для active price filters strict same-variant correctness требует fallback на
variant-level path, потому price остается typed range index, not bitmap.
