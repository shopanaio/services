---
tags: [listing, facets, bitmap, segmentation, postgres, scale]
related: [listing/facets-architecture]
status: proposal
---

# Архитектура сегментированного bitmap-индекса Listing

## Статус и назначение

Документ описывает целевую PostgreSQL-архитектуру Listing для одного store с
миллионами товаров и десятками миллионов variants. Это design proposal, а не
описание уже работающего physical contract.

Текущая архитектура с global Roaring bitmap остаётся эффективной на малых и
средних каталогах. На большом store ограничением становится не размер bitmap и
не операция `AND`, а операции вокруг bitmap:

- полный scan `variant_listing_index` для построения variant scope;
- `rb_iterate` широкого bitmap с превращением миллионов doc IDs в SQL rows;
- повторная variant-to-product projection;
- broad scan price rows;
- перезапись одной большой TOAST-строки при изменении небольшого числа doc IDs;
- lock contention на одной posting row для горячего term.

Целевая модель должна сохранять canonical variant-term contract из
[[facets-architecture]], exact distinct-product counts, same-variant semantics и
target isolation.

## Целевой масштаб

Базовый sizing-сценарий:

```text
products в одном store:       1 000 000+
variants на product:          около 18
variants в одном store:       18 000 000+
видимых OPTION values:        десятки или сотни
listing page size:            до 50–100
```

При таком объёме глобальный variant bitmap остаётся компактным, но scan 18 млн
mapping/price rows и materialization десятков миллионов промежуточных SQL rows
неприемлемы для storefront request.

## Инварианты

Сегментация не меняет логическую семантику Listing:

1. `product_doc_id` и `variant_doc_id` являются стабильными dictionary IDs в
   отдельных пространствах одного store.
2. Canonical availability и OPTION predicates остаются universal variant terms.
3. TAG/FEATURE/vendor/category остаются product predicates.
4. Все variant predicates пересекаются в variant space до projection в product
   space.
5. Counts возвращают exact distinct products.
6. Target isolation исключает только target group.
7. Product с разными matching variants не может склеить несовместимые variant
   predicates.
8. Mixed product может входить одновременно в available и unavailable isolated
   buckets.
9. Segment является physical optimization и не входит в public API, cursor или
   identity term.

## Термины и размеры

### Posting segment

Posting segment — диапазон doc IDs одного entity space. Начальный рекомендуемый
размер совпадает с естественным Roaring container:

```text
POSTING_SEGMENT_SIZE = 65 536
segment_id = floor((doc_id - 1) / 65 536)
doc_from = segment_id * 65 536 + 1
doc_to = doc_from + 65 536
```

Количество variant segments:

| Каталог | Variants | Segments |
|---|---:|---:|
| 1 000 products | 18 000 | 1 |
| 10 000 products | 180 000 | 3 |
| 1 000 000 products | 18 000 000 | около 275 |

Bitmap хранит global doc IDs, ограниченные диапазоном segment. Local-offset
encoding не используется: оно усложняет projection, audit и объединение
результатов, не давая достаточного выигрыша поверх Roaring containers.

### Projection block

Projection block остаётся более мелкой единицей variant-to-product mapping:

```text
VARIANT_PROJECTION_BLOCK_SIZE = 4 096
16 projection blocks на posting segment
```

Block применяется только там, где full-block shortcut действительно сокращает
работу. Равномерно распределённые OPTION values обычно делают все blocks partial;
для них compiler должен выбрать другой путь.

### Product projection shortcut

Для каждого variant posting segment может храниться производный product bitmap:

```text
(variant term, variant segment)
  -> variant bitmap
  -> distinct product bitmap для variants этого posting segment
```

Product bitmap не является canonical membership source. Это rebuildable
projection, используемая только когда candidate полностью покрывает target
posting segment. Для частичного intersection выполняется exact partial
projection.

## Physical schema

### Segmented postings

```sql
CREATE TABLE listing.listing_posting_bitmap_segment (
  store_id       uuid NOT NULL,
  entity_type    varchar(16) NOT NULL,
  field          varchar(64) NOT NULL,
  value_key      text NOT NULL,
  segment_id     int NOT NULL,
  doc_from       int NOT NULL,
  doc_to         int NOT NULL,
  bitmap         roaringbitmap NOT NULL,
  cardinality    int NOT NULL,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (
    store_id,
    entity_type,
    field,
    value_key,
    segment_id
  ),

  CHECK (segment_id >= 0),
  CHECK (doc_from > 0 AND doc_to > doc_from),
  CHECK (cardinality >= 0)
);
```

Дополнительный range index не требуется для canonical read, если запрос всегда
адресует `segment_id`. Он может быть добавлен только для audit/rebuild tooling.

### Segment directory и pruning

Перед чтением posting payload compiler использует компактный routing index:
для каждого posting key хранится bitmap непустых `segment_id`. Это bitmap
физических segments, а не product/variant doc IDs.

```sql
CREATE TABLE listing.listing_posting_segment_directory (
  store_id       uuid NOT NULL,
  entity_type    varchar(16) NOT NULL,
  field          varchar(64) NOT NULL,
  value_key      text NOT NULL,
  segment_bitmap roaringbitmap NOT NULL,
  segment_count  int NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, entity_type, field, value_key),

  CHECK (segment_count >= 0)
);
```

Directory является rebuildable acceleration projection. Canonical membership
остаётся в `listing_posting_bitmap_segment`; наличие segment в directory
означает только возможность match, а не доказывает непустой результат после
пересечения с другими predicates.

Compiler сначала выполняет algebra над segment IDs:

```text
candidateSegments =
  universeSegments
  & categoryScopeSegments
  & AND(OR(valueSegments внутри каждой term group))
  & priceEligibleSegments
```

После этого posting rows загружаются только для `candidateSegments`, и exact
bitmap algebra выполняется внутри них. OR внутри группы применяется и к segment
directory, и к document postings. Отсутствующая directory row означает empty
segment set; это не отменяет обязательную group skeleton semantics.

Наиболее полезны directory entries для storefront scope: category, collection,
channel/market и других селективных scopes. Популярные широкие terms вроде
`system.state=indexable` или `available` могут покрывать все segments и сами по
себе не дают pruning.

Для планирования рядом с directory поддерживаются rebuildable per-segment
summaries: posting cardinality, serialized bitmap bytes и distinct product
count. Price segments дополнительно хранят `min_price_minor` и
`max_price_minor`, а product sort segments — нижнюю и верхнюю границы sort key.
Summaries используются для pruning, порядка чтения и выбора projection
strategy, но не заменяют exact membership checks.

Начальный physical field contract:

| entity_type | field | Source | Назначение |
|---|---|---|---|
| product | category | canonical product scope | product scope |
| product | vendor | canonical product membership | product filter |
| product | facet | canonical TAG/FEATURE membership | product facet |
| variant | term | canonical universal variant terms | OPTION/availability/future criteria |
| variant | scope_category | derived | быстрый category variant scope |

`variant + scope_category` является rebuildable acceleration projection. Source
of truth остаётся product category membership плюс variant-to-product mapping.

### Term-specific product projections

Projection рекомендуется хранить отдельно от canonical posting:

```sql
CREATE TABLE listing.listing_posting_variant_product_segment (
  store_id           uuid NOT NULL,
  field              varchar(64) NOT NULL,
  value_key          text NOT NULL,
  variant_segment_id int NOT NULL,
  product_bitmap     roaringbitmap NOT NULL,
  product_count      int NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (
    store_id,
    field,
    value_key,
    variant_segment_id
  ),

  CHECK (variant_segment_id >= 0),
  CHECK (product_count >= 0)
);
```

Раздельная таблица подчёркивает, что product bitmap — derived projection, и
позволяет независимо rebuild/drop projection без изменения canonical postings.

### Segment-aware mapping и price

`variant_listing_index` и `variant_listing_price_index` получают вычисляемый
`variant_segment_id`:

```sql
variant_segment_id int GENERATED ALWAYS AS (
  (variant_doc_id - 1) / 65536
) STORED
```

Минимальные covering indexes:

```sql
CREATE INDEX ... ON listing.variant_listing_index (
  store_id,
  variant_segment_id,
  variant_doc_id,
  product_doc_id
);

CREATE INDEX ... ON listing.variant_listing_price_index (
  store_id,
  currency,
  variant_segment_id,
  price_minor,
  variant_doc_id,
  product_doc_id
) WHERE has_price = true AND price_minor IS NOT NULL;
```

Физические PostgreSQL partitions и bitmap segments — разные понятия. Не нужно
создавать PostgreSQL partition на каждый segment. Крупные relational tables
могут дополнительно hash-partition по `store_id` и крупным doc-ID ranges, но
`segment_id` остаётся обычной частью ключа и индекса.

### Segment-aware product sort

Для page collector `listing_posting_product_sort` получает
`product_segment_id`. Индекс сортировки должен позволять выбрать локальный
top-N каждого matching product segment, после чего coordinator SQL объединяет
локальные top-N в глобальный page:

```text
matching product segments
  -> top(first + 1) внутри каждого segment
  -> merge/sort локальных кандидатов
  -> global first + 1
```

Это исключает scan всех sort rows большого store при маленьком page size.

Sort bounds позволяют page collector читать segments лениво в порядке лучшего
возможного sort key. После получения global `first + 1` collector прекращает
чтение, только если bound всех непрочитанных matching segments доказывает, что
они не могут изменить страницу. Early stop применим к page, но не к exact total
и facet counts.

## Canonical segmented algebra

### Product predicates

Product postings пересекаются независимо по `product segment_id`:

```text
productBase[segment] =
  publishedScope[segment]
  & category[segment]
  & vendor[segment]
  & AND(product facet groups[segment])
```

Total count равен сумме cardinality непересекающихся product segments:

```text
total = SUM(rb_cardinality(productMatches[segment]))
```

### Variant predicates

Variant term groups сначала агрегируются внутри segment:

```text
groupBitmap[group, segment] = OR(value postings[group, segment])

variantCandidates[segment] =
  indexableUniverse[segment]
  & categoryVariantScope[segment]
  & AND(groupBitmap[group, segment])
  & priceCandidates[segment]
```

До этой document-level algebra compiler вычисляет `candidateSegments` через
segment directory. Запрос к postings обязан быть ограничен полученным набором
segment IDs. Если directory показывает все segments, compiler переходит к broad
segment path; он не разворачивает global bitmap через `rb_iterate`.

Отсутствующая posting row в segment означает empty bitmap. Compiler обязан
начинать с universe segments и left-join group postings, чтобы missing row не
исчезала из algebra как будто predicate отсутствует.

Пример формы SQL:

```sql
WITH universe_segments AS MATERIALIZED (
  SELECT segment_id, bitmap
  FROM listing.listing_posting_bitmap_segment
  WHERE store_id = $1
    AND entity_type = 'variant'
    AND field = 'term'
    AND value_key = $indexable
),
group_segments AS MATERIALIZED (
  SELECT
    p.segment_id,
    requested.group_key,
    rb_or_agg(p.bitmap) AS bitmap
  FROM requested_terms requested
  JOIN listing.listing_posting_bitmap_segment p
    ON p.store_id = $1
   AND p.entity_type = 'variant'
   AND p.field = 'term'
   AND p.value_key = requested.value_key
  GROUP BY p.segment_id, requested.group_key
),
candidate_segments AS MATERIALIZED (
  SELECT
    u.segment_id,
    u.bitmap & rb_and_agg(g.bitmap) AS bitmap
  FROM universe_segments u
  JOIN group_segments g ON g.segment_id = u.segment_id
  GROUP BY u.segment_id, u.bitmap
)
SELECT segment_id, bitmap
FROM candidate_segments
WHERE rb_cardinality(bitmap) > 0;
```

Production compiler формирует group skeleton явно; приведённый SQL показывает
форму вычисления, а не полную missing-segment semantics.

## Adaptive projection

Projection strategy выбирается не только по cardinality одного value. Compiler
использует следующие метрики:

- `segment matched cardinality`;
- `SUM(matched cardinality)` всех values batch;
- количество values;
- доля полностью покрытых projection blocks;
- наличие готового term-specific product projection;
- число matching segments.

Порядок выбора:

```text
1. Target posting segment полностью покрыт candidate:
     использовать term-specific product_bitmap.

2. Суммарный narrow work мал:
     rb_iterate + indexed mapping lookup.

3. Full-block ratio достаточно высокий:
     OR full block product bitmaps;
     partial projection только неполных blocks.

4. Values широкие и blocks преимущественно partial:
     один segment-local mapping scan для всего batch;
     set-based grouping по projection_key.
```

Запрещённый план:

```text
миллионы candidate variant IDs
  -> global rb_iterate
  -> миллионы SQL rows
  -> lookup mapping по одному ID
```

`rb_iterate` разрешён только narrow branch и bounded partial segments.

Thresholds не являются schema contract. Они конфигурируются и калибруются на
матрицах 1k, 10k, 100k и 1m. Начальный existing threshold `10 000` можно
использовать как baseline, но batch threshold должен учитывать сумму work.

## Facets metadata и counts

Metadata и counts остаются одним set-based statement.

Pipeline:

1. получить product и variant scope segments;
2. определить candidate values по segment postings;
3. сохранить selected configured values даже при count `0`;
4. построить target-isolated candidate segments;
5. выбрать projection strategy для каждого segment/value batch;
6. получить product bitmaps;
7. пересечь их с product base segments;
8. вернуть metadata и exact count одним result set.

Для no-filter/broad values term-specific product projection должна устранять
variant-to-product projection полностью. При дополнительных OPTION/price
predicates fast path разрешён только после доказательства полного покрытия
target posting segment.

TAG/FEATURE используют product postings и не проходят через variant projection,
если request не содержит variant witness. При наличии variant predicates они
пересекаются с общей projected variant-product base, вычисленной один раз.

## Virtual facets

Availability counts используют те же segmented variant terms и target
isolation, что OPTION counts. Product availability sort projection не является
источником membership.

Price bounds выбирают adaptive path:

```text
узкие candidate segments:
  rb_iterate + indexed price lookup

широкие candidate segments:
  segment-aware price scan
  + candidate bitmap membership по variant_doc_id
  + product base membership по product_doc_id
```

До выбора path price summary отбрасывает segments, чей
`[min_price_minor, max_price_minor]` не пересекается с requested range. Summary
не доказывает membership для граничных или overlapping segments; внутри них
сохраняется exact price predicate.

`variant_listing_price_index` уже содержит `variant_doc_id` и `product_doc_id`;
широкий price path не должен проходить через `variant_listing_index`.

Следующий optional уровень — price bucket postings. Полностью покрытые buckets
объединяются bitmap-операциями, B-tree используется только для двух граничных
buckets. Bucket identity и currency входят в physical key, но не заменяют exact
boundary predicate.

## Write path

### Delta routing

Для каждого added/removed doc ID writer вычисляет `segment_id`, группирует delta
по posting key и segment, затем сортирует keys перед locking/update.

```text
nextBitmap = (currentBitmap - removedDocIds) | addedDocIds
cardinality = rb_cardinality(nextBitmap)
```

Один variant update затрагивает только:

- indexable universe segment;
- availability segment;
- OPTION term segments;
- derived category scope segments;
- price segment;
- affected projection block;
- affected term-specific product projection segments.

Empty undeclared rows удаляются. Declared universe/availability semantics
сохраняются на уровне registry; нет необходимости хранить empty row для каждого
физически несуществующего segment.

В той же item transaction writer обновляет соответствующий segment directory:
добавляет `segment_id` при переходе posting `empty -> non-empty`, удаляет при
`non-empty -> empty` и пересчитывает `segment_count`. Изменение membership
внутри уже непустого segment не блокирует общую directory row: иначе популярный
term снова превратил бы её в hot row. Изменения directory keys сортируются до
locking так же, как posting keys. Directory и summaries должны полностью
восстанавливаться offline builder без canonical source changes.

### Product projection correctness

Удаление variant из одного segment не должно удалить product из общей term
projection, если другой matching variant product остаётся в другом segment.
Поэтому product bitmap хранится отдельно для каждого variant segment, а global
projection строится через `rb_or_agg` segment product bitmaps.

Affected segment projection проще и безопаснее пересчитать из mapping и
canonical segment posting внутри item transaction, чем поддерживать глобальный
reference count.

### Category fan-out

Derived variant category postings увеличивают write amplification. Writer
материализует их только для storefront-addressable category scopes. Audit
проверяет parity с product category posting и variant-to-product mapping.

## Concurrency и storage

Segment входит в primary key, поэтому конкурентные updates одного term чаще
блокируют разные rows. Это уменьшает hot-row contention, но не отменяет
необходимость:

- сортировать posting keys и segment IDs;
- объединять batch delta до одного update на row;
- ограничивать transaction batch size;
- наблюдать TOAST size и bloat;
- vacuum/analyze segment и relational tables.

Для 18 млн variants один dense global bitmap занимает несколько мегабайт. После
сегментации суммарный payload остаётся близким, но каждый update переписывает
только один segment row. Количество rows увеличивается приблизительно
пропорционально числу непустых `(posting key, segment)`.

High-cardinality per-product postings, включая `variant_product`, должны пройти
отдельный usage audit перед масштабированием: миллион малых posting rows может
стоить дороже, чем indexed mapping table.

## Read orchestration

Page, total, facets-with-counts и virtual facets остаются независимыми read-only
statements и запускаются параллельно. Segmentation не должна возвращать
dependency `metadata -> counts`.

Diagnostics выполняются только при profiling/sampling и не участвуют в обычном
critical path.

Один SQL branch материализует shared segment CTE один раз. Запрещены повторные
candidate compilation и mapping scan на каждый visible value.

## Observability и guardrails

Listing debug/profile добавляет:

- число segments до и после directory pruning;
- долю запросов, где directory вернул все segments;
- product/variant segment count;
- total и max candidate cardinality;
- sum cardinality по batch values;
- выбранную projection strategy;
- full/partial block ratio;
- число shortcut product projections;
- число `rb_iterate` rows;
- число mapping/price rows scanned;
- max serialized segment bitmap bytes;
- planning/execution time и shared buffers по branch.

Runtime guardrails:

```text
global rb_iterate широкого bitmap              запрещён
mapping scan всего store внутри request        запрещён
price lookup по одному ID для broad candidate  запрещён
неограниченный intermediate row expansion      запрещён
```

Если estimated work превышает safety limit, compiler обязан выбрать broad
segment path, а не продолжать narrow iteration.

## Audit

Bounded и offline audit проверяют:

1. segment range соответствует `segment_id`;
2. bitmap не содержит doc ID вне segment range;
3. stored cardinality совпадает с `rb_cardinality`;
4. OR всех segment bitmaps совпадает с canonical membership;
5. universe/availability partition выполняется внутри каждого segment;
6. derived category variant postings совпадают с product category mapping;
7. term-specific product projection совпадает с distinct products canonical
   variant posting segment;
8. projection blocks покрывают mapping без overlap/gap активных doc IDs;
9. price rows принадлежат indexable universe segment;
10. registry metadata не расходится между segments одного declared term.
11. directory bitmap совпадает с набором непустых canonical posting segments;
12. `segment_count` directory совпадает с canonical rows;
13. price/sort summary bounds покрывают canonical значения segment.

## Rollout

Постоянный dual-read/dual-write не является частью целевой архитектуры.

Порядок внедрения:

1. создать synthetic datasets 100k и 1m;
2. добавить segmented tables и offline builder;
3. построить segments, directory и summaries из canonical listing index;
4. выполнить parity audit global и segmented results;
5. реализовать segment compiler за feature flag;
6. сравнить result parity и performance matrices;
7. переключить writer и reader в согласованной release boundary;
8. пересоздать clean listing index либо выполнить controlled rebuild;
9. удалить global postings и legacy compiler после подтверждения parity.

Для проекта без production data initial DDL обновляется напрямую и listing index
пересоздаётся. Migration compatibility старого physical index не является
обязательным contract.

## Performance gates

Новая архитектура принимается только при выполнении всех условий:

- result parity на ALL/AVAILABLE/UNAVAILABLE, OPTION, TAG/FEATURE и price;
- mixed-product same-variant parity;
- selected-zero metadata parity;
- отсутствие более чем 10% regression на матрицах 1k и 10k;
- bounded growth latency на 100k и 1m;
- отсутствие full-store mapping scans в broad plans;
- selective requests читают только directory-selected posting segments;
- broad requests не деградируют в global `rb_iterate` при отсутствии pruning;
- отсутствие broad per-ID price lookups;
- bounded `rb_iterate` rows;
- write throughput и lock wait не хуже global design на large-store dataset;
- успешный audit после batch indexing, update и delete.

Целевые абсолютные latency фиксируются только после benchmark на согласованном
hardware. Архитектурный контракт определяет форму bounded work, а не обещает
конкретное число миллисекунд.

## Риски и решения

| Риск | Mitigation |
|---|---|
| Больше posting rows и planning overhead | один segment для малых stores, arrays/unnest и stable SQL shape |
| Write amplification category scope | материализовать только storefront-addressable scopes, batch delta |
| Stale derived product projection | same-transaction rebuild affected segment + audit |
| Все OPTION blocks partial | direct segment-local batch mapping вместо block path |
| Skew/holey doc IDs | cardinality-based strategy, не считать range density по умолчанию |
| Слишком большие segment rows | наблюдать serialized bytes; пересмотреть physical segment size по benchmark |
| Слишком много tiny segments | natural 65 536 baseline, не создавать empty rows |
| Directory stale относительно postings | same-transaction boundary transitions + offline parity audit |
| Широкий term адресует все segments | broad segment path либо измеренная hot-scope projection |
| `integer` doc ID exhaustion | отдельное решение: controlled allocator lifecycle либо roaringbitmap64/bigint migration |

## Итоговое решение

Масштабирование до миллионов товаров строится не вокруг большего global bitmap,
а вокруг bounded segment work:

```text
segmented canonical postings
  + segment directory и scope-aware pruning
  + price/sort segment summaries
  + derived variant category scope
  + adaptive narrow/block/direct projection
  + term-specific product shortcut
  + segment-aware price and page collectors
  + запрет broad rb_iterate
```

Малый store естественно использует один segment и сохраняет простой execution
path. Большой store распределяет работу по сотням bounded segments без полного
scan mapping table и без материализации миллионов doc IDs в SQL rows.

Directory устраняет чтение всех segments для селективных запросов. Для широкого
exact total или facet count, реально покрывающего весь store, пропустить
matching segments без потери корректности невозможно. Такой workload требует
broad bounded segment execution либо заранее рассчитанной rebuildable projection
для измеренного hot scope; произвольные комбинации predicates не
материализуются.
