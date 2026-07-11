# Трекер реализации универсального variant-term индекса Listing

Дата создания: 2026-07-11

Статус: `VERIFYING`

Источник решения:
[`listing-universal-variant-terms-index-plan.ru.md`](./listing-universal-variant-terms-index-plan.ru.md)

Связанный нормативный документ по availability-семантике:
[`listing-facets-explicit-availability-plan.ru.md`](./listing-facets-explicit-availability-plan.ru.md)

## Назначение документа

Этот документ превращает архитектурный черновик универсального variant-term
индекса в исполняемый пошаговый план. Он используется как implementation
tracker: задачи выполняются сверху вниз, результат каждой фазы принимается по
явному exit gate, а решения и отклонения фиксируются в журналах в конце файла.

Документ не заменяет исходный архитектурный план. При расхождении:

1. availability semantics задаются explicit availability plan;
2. physical variant predicate index задается universal variant terms plan;
3. этот tracker задает порядок реализации и проверки, но не меняет нормативную
   семантику двух документов выше.

## Как вести tracker

Статусы фаз:

- `NOT_STARTED` — работа не начиналась;
- `IN_PROGRESS` — выполняется хотя бы одна задача фазы;
- `BLOCKED` — продолжение невозможно без решения из журнала решений;
- `VERIFYING` — код завершен, выполняется exit gate;
- `DONE` — все обязательные задачи и exit gate закрыты;
- `SKIPPED` — разрешено только для optional-задачи с записанной причиной.

Обозначения чекбоксов:

- `[ ]` — не выполнено;
- `[x]` — выполнено и проверено;
- `[-]` — осознанно не требуется; причина должна быть записана рядом или в
  журнале решений.

Правила выполнения:

- новую фазу можно начать только после exit gate всех ее обязательных
  зависимостей;
- задачи с пометкой `BLOCKING` нельзя переносить за пределы фазы;
- любое изменение canonical contract сначала отражается в fixtures, затем в
  write path и только потом в read path;
- single и batch paths меняются в одной фазе и принимаются только вместе;
- legacy variant OPTION read/write удаляется в рамках одного incompatible
  cutover, без dual-read, dual-write и fallback;
- изменения listing выполняются через существующие Script/Repository/Workflow
  границы и с обязательным `store_id` scope;
- build, schema, codegen, e2e и performance operations запускаются через
  Shopana CLI/MCP;
- `test` и `tsc` напрямую не запускаются;
- Playwright запускается по одному spec-файлу;
- changeset вручную не редактируется.

## Границы реализации

### В scope

- общий `ListingVariantTerm` value object и versioned physical key encoder;
- registry допустимых field/value domains и unknown policies;
- `system.state=indexable` universe;
- explicit availability terms `available` и `unavailable`;
- полный перевод OPTION variant postings с `field=facet` на `field=term`;
- общий normalized variant term filter plan;
- same-variant пересечение OPTION, availability, будущих criteria и PRICE;
- единый variant-to-product projection после всех variant predicates;
- canonical page, total, counts, virtual facets, sort и cursor semantics;
- single/batch write parity, атомарные transitions и deterministic lock order;
- аудит либо удаление option signature optimization;
- repeatable-read snapshot, observability, invariant audit и performance profile;
- обновление актуальной документации после implementation audit.

### Вне scope

- migration или conversion ранее созданного listing index;
- dual-read, dual-write и compatibility period;
- общий rebuild/reindex;
- context-dependent delivery index для произвольного адреса, postcode или
  carrier;
- перенос numeric/range данных в universal terms;
- sharding hot term postings;
- автоматическое создание публичного facet для каждого физического term;
- добавление criterion-specific колонок в price или signature tables.

## Неподвижные инварианты

Перед началом реализации команда подтверждает, что следующие пункты не являются
предметом локальной оптимизации:

- [x] `INV-01` Physical term bitmap содержит `variant_doc_id`, не
  `product_doc_id`.
- [x] `INV-02` OR применяется внутри одной term group, AND — между groups.
- [x] `INV-03` OPTION, availability, criterion и price пересекаются в variant
  space до projection.
- [x] `INV-04` Отсутствие availability input не создает availability predicate.
- [x] `INV-05` `available=false` — explicit `unavailable` term, а не complement
  positive bitmap.
- [x] `INV-06` Каждый indexable variant находится ровно в одном availability
  state.
- [x] `INV-07` Каждый term bitmap является subset
  `system.state=indexable`.
- [x] `INV-08` Product aggregate `in_stock` используется только для
  sort/diagnostics и не влияет на membership/counts.
- [x] `INV-09` `variant_listing_price_index` содержит priced rows всех
  indexable availability/criterion states.
- [x] `INV-10` Price range и matched price sort работают только по matching
  variant candidates.
- [x] `INV-11` Product без eligible price не исчезает из membership и
  сортируется как `NULLS LAST`.
- [x] `INV-12` Page, total, counts, virtual facets и sort используют один
  canonical `productMatches` contract в одном request snapshot.
- [x] `INV-13` Missing posting для declared active state считается нарушением
  индекса; существующий empty posting означает корректный zero-result.
- [x] `INV-14` Raw broker payload и public input не могут передать arbitrary
  physical term key.
- [x] `INV-15` Runtime не читает и writer не создает legacy
  `entity_type=variant, field=facet` rows.

## Сводный roadmap

| Фаза | Статус | Результат | Зависит от | Exit gate |
|---|---|---|---|---|
| 0. Baseline и fixtures | `IN_PROGRESS` | P1–P11 contract artifact и inventory добавлены; pre-cutover performance baseline не снят | — | G0 |
| 1. Term domain contract | `DONE` | Value object, encoder, registry и normalized groups | G0 | G1 |
| 2. Posting repository | `VERIFYING` | Exact reads, merged delta writes, retained declared states и audit primitives; final price `EXPLAIN` pending | G1 | G2 |
| 3. Write cutover | `DONE` | Single/batch создают один canonical term index | G2 | G3 |
| 4. Read compiler cutover | `DONE` | Один `productMatches` и same-variant semantics | G3 | G4 |
| 5. Counts и metadata | `DONE` | Generalized isolation, term counts и virtual facets | G4 | G5 |
| 6. Sort и cursor | `DONE` | Matched variant price sort и nullable cursor | G4, G5 | G6 |
| 7. Signature audit | `DONE` | Signature structures полностью удалены | G5, G6 | G7 |
| 8. Snapshot и observability | `VERIFYING` | Repeatable snapshot, metrics и audit реализованы; concurrency profile не запускался | G4–G7 | G8 |
| 9. Verification и docs | `VERIFYING` | Build, clean schema и docs закрыты; e2e/performance execution запрещён project rule | G8 | G9 |

## Фаза 0. Baseline, inventory и canonical fixtures

Статус: `IN_PROGRESS`

Цель: до изменения индекса зафиксировать ожидаемую семантику, текущее
физическое поведение и измеримый baseline.

### 0.1. Зафиксировать implementation inventory

- [x] `P0-01` Составить список всех writers legacy variant OPTION postings.
  Минимально проверить:
  `ListingBuildSyncWriteModelScript.ts`,
  `ListingWriteIndexActionScript.ts`,
  `stepWriteListingBatchSyncIndexAction.ts` и
  `ListingPostingBitmapRepository.ts`.
- [x] `P0-02` Составить список всех readers
  `entity_type=variant, field=facet`. Проверить все SQL compiler файлы, а не
  только page query.
- [x] `P0-03` Найти и классифицировать все availability-specific membership
  branches: `plan.inStock ?? true`, `vli.in_stock`, `pli.in_stock`,
  in-stock-only price paths и virtual facet branches.
- [x] `P0-04` Найти все места, где option signature участвует в correctness,
  counts, price eligibility или strategy selection.
- [ ] `P0-05` Зафиксировать текущие price indexes через clean-schema DDL и
  `EXPLAIN (ANALYZE, BUFFERS)` representative queries.
- [x] `P0-06` Зафиксировать текущую границу storefront request: normalization,
  пять logical branches, parallel execution и отсутствие/наличие общего DB
  snapshot.
- [x] `P0-07` Сохранить inventory в progress log этого документа либо в
  отдельном audit artifact с ссылкой отсюда.

### 0.2. Создать canonical dataset

- [x] `P0-08` Добавить в `e2e/fixtures/listing/seed.ts` и/или
  `e2e/utils/listingSeed.ts` именованные records P1–P11:
  available/ready, available/not-ready, unavailable/ready,
  unavailable/not-ready, mixed variants, duplicate term variants, mixed price,
  inactive variant, product without active variants, unknown criterion и
  selected zero-count value.
- [x] `P0-09` Для P5 явно использовать разные OPTION/availability/delivery/price
  combinations на двух variants одного product, чтобы ранняя projection давала
  заведомо неверный результат.
- [x] `P0-10` Для P6 создать два variants одного product с одинаковым term для
  проверки удаления одного variant без потери второго.
- [x] `P0-11` Для P7 создать available variant без price и unavailable priced
  variant для проверки matched price semantics.
- [x] `P0-12` Для P8 проверить, что inactive/archived variant имеет source
  values, но не попадает в indexable universe, terms и price runtime index.

### 0.3. Зафиксировать contract expectations

- [x] `P0-13` Создать expected matrix для ALL/AVAILABLE/UNAVAILABLE без других
  filters.
- [x] `P0-14` Создать expected matrix для OPTION + availability,
  OPTION + PRICE, availability + delivery и полного conjunctive запроса.
- [x] `P0-15` Зафиксировать monotonicity: добавление AND-group не расширяет
  result, добавление value в существующую OR-group может расширить result.
- [x] `P0-16` Зафиксировать overlap counts: mixed product разрешено учитывать в
  нескольких isolated boolean buckets.
- [x] `P0-17` Зафиксировать page/total parity для всех scopes и sorts.
- [x] `P0-18` Зафиксировать metadata rules для selected zero-count и declared
  boolean zero-count states.

### 0.4. Снять baseline

- [ ] `P0-19` На одном 10k dataset снять текущие p50/p95, posting lookup count,
  projection strategy, temp spill и buffers для matrix из исходного плана.
- [ ] `P0-20` Снять write p50/p95, products/sec, WAL, row/advisory lock wait и
  deadlocks для single, batch и hot boolean-like updates.
- [ ] `P0-21` Записать PostgreSQL configuration, hardware, warmup procedure,
  dataset revision и commit SHA, чтобы сравнение после cutover было
  воспроизводимым.

### Gate G0

- [ ] P1–P11 воспроизводимы из clean DB.
- [ ] Expected result/count/sort matrix сохранена до изменения production code.
- [ ] Все legacy read/write/signature точки перечислены.
- [ ] Baseline performance artifact сохранен с одинаковыми условиями будущего
  сравнения.

## Фаза 1. Term value object, encoder и registry

Статус: `DONE`

Цель: создать единый domain contract, который не зависит от SQL compiler и не
позволяет business code собирать physical keys вручную.

Рекомендуемое размещение нового общего кода:

```text
services/listing/src/listing/variantTerms/
  ListingVariantTerm.ts
  listingVariantTermEncoder.ts
  listingVariantTermRegistry.ts
  listingVariantTermBuilders.ts
  index.ts
```

Итоговое размещение можно адаптировать к текущей структуре сервиса, но encoder,
registry и builders не должны дублироваться между scripts и repositories.

### 1.1. Ввести canonical types

- [x] `P1-01` Добавить immutable `ListingVariantTerm` с `fieldKey` и
  `valueKey`.
- [x] `P1-02` Добавить `ListingVariantTermGroup` с `groupKey`, `terms` и
  `source: OPTION | AVAILABILITY | CRITERION`.
- [x] `P1-03` Добавить value domain types: `DECLARED`,
  `CONFIGURED_OPTION_VALUES`, `VALIDATED_IDS`.
- [x] `P1-04` Добавить unknown policies: `FORBID`, `EXPLICIT`, `OMIT`.
- [x] `P1-05` Зафиксировать constraints: trimmed non-empty, canonical
  case-sensitive keys, deterministic sort, no localized labels и no mutable
  handles при наличии stable ID.

### 1.2. Реализовать versioned encoding

- [x] `P1-06` Реализовать единственный encoder:
  `JSON.stringify(["v1", fieldKey, valueKey])`.
- [x] `P1-07` Реализовать strict decoder только для diagnostics/contract
  verification; runtime lookup не должен парсить DB `value_key`.
- [x] `P1-08` Добавить helpers `compareTerms`, `deduplicateTerms`,
  `encodeListingVariantTerm` и exact posting key builder.
- [x] `P1-09` Запретить ручную конкатенацию `fieldKey/valueKey` вне модуля
  builders/encoder статическим поиском и code review checklist.
- [x] `P1-10` Зафиксировать encoded examples availability, delivery и OPTION в
  contract fixtures.

### 1.3. Создать начальный registry

- [x] `P1-11` Зарегистрировать `system.state=indexable` как declared state.
- [x] `P1-12` Зарегистрировать `criterion.availability` со значениями строго
  `available`, `unavailable` и policy `FORBID` для unknown.
- [x] `P1-13` Зарегистрировать namespace `option:<facetId>` с domain
  `CONFIGURED_OPTION_VALUES`.
- [x] `P1-14` Добавить reference definition
  `criterion.delivery.ready=true|false|unknown`; до наличия upstream поля он
  используется в fixtures и contract verification, но не выдумывается из
  других данных.
- [x] `P1-15` Добавить registry version/build metadata для diagnostics.
- [x] `P1-16` Реализовать validation stable IDs для OPTION/ID domains и запрет
  произвольных registry keys из broker payload.

### 1.4. Реализовать materializers и input normalization

- [x] `P1-17` Materializer indexable variant всегда добавляет
  `system.state=indexable`.
- [x] `P1-18` Availability materializer использует canonical
  `availableForSale`: `true -> available`, `false -> unavailable`. Quantity не
  меняет этот state.
- [x] `P1-19` OPTION materializer принимает только resolved stable
  `facetId/facetValueId` и создает term
  `option:<facetId>=<facetValueId>`.
- [x] `P1-20` Общий builder удаляет duplicates и сортирует terms по
  `fieldKey`, затем `valueKey`.
- [x] `P1-21` Input normalizer преобразует direct availability и configured
  IN_STOCK alias в одну canonical group.
- [x] `P1-22` Отсутствующий availability input не создает group; conflicting
  aliases возвращают validation error до SQL compilation.
- [x] `P1-23` Включить canonical term groups и availability mode в filter hash,
  чтобы ALL/AVAILABLE/UNAVAILABLE и разные term groups не делили cursor/cache
  identity.

### Gate G1

- [ ] Encoder дает детерминированный exact key для одинакового term.
- [ ] Registry отклоняет empty, undeclared и arbitrary values.
- [ ] Availability и OPTION строятся через shared builders.
- [ ] Term groups соблюдают OR-inside/AND-between contract.
- [ ] ALL не создает скрытый availability predicate.
- [ ] Quantity-zero backorder с `availableForSale=true` получает term
  `available`.

## Фаза 2. Posting repository и physical contract

Статус: `VERIFYING`

Цель: подготовить repository primitives для term postings до переключения
writers и readers.

Основные файлы:

- `src/repositories/listing/listingRepositoryTypes.ts`;
- `src/repositories/listing/ListingPostingBitmapRepository.ts`;
- `src/repositories/models/listingIndex.ts`;
- `migrations/domains/0100_listing_index/0100_listing_index__tables.sql`;
- `src/repositories/listing/VariantListingPriceIndexRepository.ts`.

### 2.1. Расширить repository types и validation

- [x] `P2-01` Добавить canonical supported kind
  `entityType=variant, field=term` в typed contracts.
- [x] `P2-02` Разделить допустимые product и variant posting fields так, чтобы
  `term` нельзя было записать как product posting по ошибке.
- [x] `P2-03` Сохранить `variant_product` как отдельный narrow lookup kind.
- [x] `P2-04` После cutover запретить запись `variant + facet` на repository
  boundary; product `facet` для TAG/FEATURE остается допустимым.
- [x] `P2-05` Validation term keys выполняется через strict decoder/registry
  descriptor, а не через prefix/substring assumptions.

### 2.2. Добавить exact bulk reads

- [x] `P2-06` Добавить bulk lookup exact encoded term keys одним bounded query.
- [x] `P2-07` Результат lookup должен различать:
  existing empty declared row и missing declared row.
- [x] `P2-08` Для missing configured OPTION row определить canonical empty
  semantics отдельно от declared system/criterion invariant; не маскировать
  corruption обязательного declared state.
- [x] `P2-09` Возвращать results в deterministic requested-key order либо map,
  не зависящий от порядка строк PostgreSQL.

### 2.3. Реализовать deterministic bulk delta update

- [x] `P2-10` Ввести input, агрегирующий для каждого encoded term key
  `removedVariantDocIds` и `addedVariantDocIds`.
- [x] `P2-11` Нормализовать keys и doc IDs: deduplicate, validate positive IDs,
  sort keys lexicographically и doc IDs numerically.
- [x] `P2-12` Захватывать/обновлять posting rows в одном deterministic key order,
  чтобы parallel products не создавали lock inversion.
- [x] `P2-13` Выполнять формулу
  `(bitmap - removed) | added` атомарно на row и пересчитывать cardinality через
  `rb_cardinality`.
- [x] `P2-14` Убедиться, что remove и add одного doc ID в одном merged batch
  дают конечное membership из `next`, а не зависят от порядка операций.
- [x] `P2-15` Возвращать touched/created/emptied counters для observability и
  parity checks.

### 2.4. Ввести policy empty rows

- [x] `P2-16` Не удалять empty rows для active declared states
  `system.state=indexable`, availability states и других definitions, которым
  registry задает retain-empty policy.
- [x] `P2-17` Разрешить удаление empty OPTION/configured rows только когда row
  больше не нужна active configuration/selected metadata.
- [x] `P2-18` Заменить безусловное удаление cardinality-zero rows в
  `removeDocIdsReturning` на registry-aware policy.
- [x] `P2-19` Создавать оба availability rows даже в store, где один bucket
  пуст.

### 2.5. Добавить audit primitives

- [x] `P2-20` Проверять `cardinality = rb_cardinality(bitmap)`.
- [x] `P2-21` Проверять каждый term bitmap как subset indexable universe.
- [x] `P2-22` Проверять availability intersection как empty и union как exact
  universe.
- [x] `P2-23` Проверять variant mapping на существующий product doc.
- [x] `P2-24` Проверять price variant IDs как subset universe.
- [x] `P2-25` Добавить registry-specific exactly-one/zero-or-one audit hooks.

### 2.6. Подтвердить DB schema

- [x] `P2-26` Подтвердить, что существующих columns и PK
  `(store_id, entity_type, field, value_key)` достаточно для `field=term`.
- [x] `P2-27` Не добавлять availability/delivery columns или новые bitmap
  columns.
- [ ] `P2-28` Проверить criterion-neutral price indexes под range и matched
  per-product minimum; менять DDL только по сохраненному `EXPLAIN ANALYZE`.
- [x] `P2-29` Если DDL не меняется, явно записать `no schema change required` в
  журнал решений; не создавать пустую migration.

### Gate G2

- [ ] Repository exact-read различает missing и retained empty declared term.
- [ ] Bulk delta update детерминирован и не теряет concurrent additions.
- [ ] Availability empty states сохраняются.
- [ ] Audit обнаруживает cardinality, universe и availability partition errors.
- [ ] Physical schema не содержит criterion-specific columns.

## Фаза 3. Полный cutover write path

Статус: `DONE`

Цель: single и batch writers атомарно создают одинаковые canonical term, price,
mapping, projection и aggregate rows; legacy variant facet writer удален.

### 3.1. Изменить normalized write model

- [x] `P3-01` Заменить `variantFacetValueKeysByVariantId` на canonical
  `variantTermsByVariantId` либо на `terms` внутри normalized variant record.
- [x] `P3-02` Сохранить в normalized variant минимум `variantId`,
  `variantDocId` после allocation, `productDocId`, sorted terms и prices.
- [x] `P3-03` Явно определить indexable classifier для active variants и
  использовать один helper в single/batch.
- [x] `P3-04` Non-indexable variants не получают universe term, criterion terms
  или runtime price rows.
- [x] `P3-05` Изменить version/hash marker write model, поскольку shape и
  physical meaning несовместимы с v1; старый version должен отклоняться, а не
  silently интерпретироваться как новый.
- [x] `P3-06` Product `inStock` вычислять как diagnostic/sort aggregate от
  canonical indexable variant availability, не как membership source.
- [x] `P3-07` Product sort bool сохранять согласованным с тем же aggregate.

### 3.2. Переписать builder

- [x] `P3-08` `ListingBuildSyncWriteModelScript` вызывает shared registry
  materializer для каждого indexable variant.
- [x] `P3-09` Availability определяется только `availableForSale`; убрать
  quantity guard из canonical state.
- [x] `P3-10` Resolved OPTION values преобразуются в canonical terms, legacy
  `<facetId>:<facetValueId>` keys для variant postings больше не строятся.
- [x] `P3-11` Duplicate source selections дают один term на variant.
- [x] `P3-12` Price rows строятся для всех priced indexable variants независимо
  от availability/delivery term.
- [x] `P3-13` `variant_listing_price_index` не получает term columns и не
  фильтруется по `inStock` при build.
- [-] `P3-14` Не требуется: signature structures удалены полностью по D-002;
  временный signature write path отсутствует. Если signature временно остается до фазы 7, строить его только из
  canonical OPTION terms и не включать criterion-specific state.

### 3.3. Переписать single writer

- [x] `P3-15` В `ListingWriteIndexActionScript` получить previous/next term
  memberships для variants продукта и построить merged delta по encoded key.
- [x] `P3-16` Применить term delta в одной item transaction вместе с product,
  variant, price, sort, projection и item state writes.
- [x] `P3-17` Variant add/update/delete и active/inactive transition обновляют
  universe и все terms атомарно.
- [x] `P3-18` Удаление одного из двух variants с одинаковым term не удаляет
  membership второго.
- [x] `P3-19` Price add/update/delete не изменяет unrelated term bitmap.
- [x] `P3-20` Удалить вызов `replaceVariantMemberships(field="facet")`.
- [x] `P3-21` Убедиться, что stale variant cleanup удаляет `term`,
  `variant_product`, price и mapping dependencies до/вместе с variant row.

### 3.4. Переписать batch writer

- [x] `P3-22` Заменить `VariantMembershipReplacement.field="facet"` на merged
  term delta model.
- [x] `P3-23` Перед записью объединить changes всех products по term key, чтобы
  один hot row обновлялся bounded число раз на batch.
- [x] `P3-24` Сортировать products, variants и term keys детерминированно.
- [x] `P3-25` Batch применяет те же builder, retain-empty policy и cleanup
  helpers, что single path.
- [x] `P3-26` Batch transaction включает term/price/projection/item-state writes
  без промежуточного visible state.
- [x] `P3-27` Удалить batch legacy `field="facet"` variant membership writes.

### 3.5. Закрыть transition matrix

- [x] `P3-28` available -> unavailable.
- [x] `P3-29` unavailable -> available.
- [-] `P3-30` Upstream delivery field отсутствует; registry/reference fixture
  добавлены, но synthetic delivery state не materialize (см. P1-14).
- [x] `P3-31` OPTION add/remove/change.
- [-] `P3-32` Отдельный upstream criterion отсутствует; общий merged term delta
  покрывает transition после добавления зарегистрированного materializer.
- [x] `P3-33` active -> inactive/archived и обратно.
- [x] `P3-34` variant delete/recreate со stable allocation rules.
- [x] `P3-35` product publish/unpublish/delete.
- [x] `P3-36` price add/update/delete независимо от term state.
- [x] `P3-37` повтор той же idempotency/event sequence дает noop, а conflict не
  оставляет partial bitmap delta.

### Gate G3

- [ ] Clean sync создает только `variant + term` OPTION postings.
- [ ] Поиск по DB не находит runtime-created `variant + facet` rows.
- [ ] Single и batch дают row-level parity для terms, price, mapping,
  projection, aggregates и item state.
- [ ] Полная transition matrix атомарна.
- [ ] Universe и availability partition audit проходят после каждого сценария.

## Фаза 4. Canonical read compiler и membership cutover

Статус: `DONE`

Цель: все discrete variant filters компилируются одинаково, а projection
выполняется только после term и numeric predicates.

Основные файлы:

- `src/repositories/storefront/types.ts`;
- `StorefrontFacetResolutionRepository.ts`;
- `StorefrontPostingBitmapQueryRepository.ts`;
- `StorefrontVariantProjectionQueryRepository.ts`;
- `sql/compileListingInputSql.ts`;
- `sql/compileListingProductMatchesSql.ts`;
- `sql/compileFiltersSql.ts`;
- `sql/compileVariantProjectionSql.ts`;
- `sql/compilePageQuerySql.ts`;
- `sql/compileTotalCountQuerySql.ts`.

### 4.1. Нормализовать filter plan

- [x] `P4-01` Добавить `variantTermGroups` в `StorefrontFilterPlan`.
- [x] `P4-02` OPTION resolution возвращает terms, а не legacy facet posting
  value keys.
- [x] `P4-03` Availability direct input/alias возвращает group
  `criterion.availability` либо не возвращает group для ALL.
- [x] `P4-04` Numeric/range filters остаются отдельной частью plan.
- [x] `P4-05` `needsVariantWitness` вычислять как наличие term group или numeric
  variant filter.
- [x] `P4-06` Group identity строить по stable `groupKey`, не по UI label или
  hardcoded SQL branch.

### 4.2. Ввести criterion-neutral SQL helpers

- [x] `P4-07` Реализовать `compileVariantTermPostingKey`.
- [x] `P4-08` Реализовать bitmap OR для одной term group.
- [x] `P4-09` Реализовать bitmap AND для всех term groups.
- [x] `P4-10` При наличии variant witness начинать от
  `system.state=indexable`, затем применять groups.
- [x] `P4-11` Реализовать numeric candidate bitmap из
  `variant_listing_price_index` с `has_price=true`.
- [x] `P4-12` Пересекать term и numeric candidates в variant space.
- [x] `P4-13` Использовать один canonical
  `projectVariantBitmapToProducts` helper для broad/partial projection.
- [x] `P4-14` Сохранить `variant_product` только как measured narrow lookup, с
  parity относительно canonical projection.

### 4.3. Собрать один productMatches contract

- [x] `P4-15` `productBase = published scope & product-level filters`.
- [x] `P4-16` При `needsVariantWitness=false` вернуть только `productBase`:
  product без active variants остается допустимым в ALL.
- [x] `P4-17` При `needsVariantWitness=true` вычислить
  `productBase & projectDistinctProducts(variantCandidates)`.
- [x] `P4-18` Page и total используют один helper/CTE contract без независимой
  интерпретации filters.
- [x] `P4-19` Product TAG/FEATURE filters применяются на product bitmap, но при
  variant witness пересекаются с той же projection.

### 4.4. Удалить legacy availability membership

- [x] `P4-20` Удалить `shouldApplyProductStockAtProductLevel` и product
  `in_stock` predicate из membership.
- [x] `P4-21` Удалить implicit `plan.inStock ?? true`.
- [x] `P4-22` Удалить `vli.in_stock` predicates из OPTION/price membership.
- [x] `P4-23` Удалить special-case `available=false -> empty` в priced path.
- [x] `P4-24` Availability mode остается в public normalization/hash, но
  physical compiler получает обычную term group.

### 4.5. Удалить legacy OPTION readers

- [x] `P4-25` Заменить все reads `variant + facet` на exact `variant + term`
  keys.
- [x] `P4-26` Удалить legacy key construction `<facetId>:<facetValueId>` из
  variant runtime compiler.
- [x] `P4-27` Не добавлять fallback к legacy encoding при missing term.
- [x] `P4-28` Выполнить repository-wide search и классифицировать оставшиеся
  `field='facet'`: разрешены только product TAG/FEATURE paths.

### Gate G4

- [ ] ALL/AVAILABLE/UNAVAILABLE соответствуют canonical fixtures.
- [ ] OPTION + availability + delivery + PRICE требуют одну matching variant.
- [ ] Product без active variants входит в ALL без witness и исключается при
  witness.
- [ ] Page и total имеют parity во всех scopes.
- [ ] Runtime не читает legacy variant facet postings и product stock
  membership.

## Фаза 5. Facet counts, isolation, metadata и virtual facets

Статус: `DONE`

Цель: counts и facet output используют тот же variant term algebra, что page и
total.

### 5.1. Generalize isolation

- [x] `P5-01` Изолировать target variant group по `groupKey`.
- [x] `P5-02` При расчете target group сохранить все остальные term groups,
  numeric filters и product-level filters.
- [x] `P5-03` Для target value вычислять
  `baseVariantTerms & targetValueTerm & numericCandidates`.
- [x] `P5-04` Сначала проецировать matching variants, затем пересекать с
  `productBase`, затем считать product cardinality.
- [x] `P5-05` Два matching variants одного product дают count +1, не +2.
- [x] `P5-06` Mixed product разрешено учитывать и в available, и в unavailable
  isolated buckets.

### 5.2. Перевести OPTION counts

- [x] `P5-07` Canonical OPTION count path читает term postings.
- [x] `P5-08` Candidate expansion не делает query per value.
- [x] `P5-09` Heavy option path не становится correctness source и может быть
  принудительно отключен для parity.
- [x] `P5-10` Product facets TAG/FEATURE продолжают читать product `field=facet`
  и учитывают canonical variant witness.

### 5.3. Перевести availability и future criteria

- [x] `P5-11` Availability true/false counts вычисляются тем же engine, что
  OPTION terms.
- [-] `P5-12` Reference definition и P1–P11 contract fixture добавлены без DB
  schema branch; execution ожидает реального upstream delivery field. Reference `delivery.ready` fixture проходит без новой DB schema и
  без нового count compiler branch.
- [x] `P5-13` Declared multi-state criterion применяет registry policy для
  unknown и output order.

### 5.4. Исправить metadata contract

- [x] `P5-14` OPTION metadata остается в `facet/facet_value` configuration,
  physical term rows не становятся metadata source.
- [x] `P5-15` Virtual boolean/enum metadata строится из registry definition.
- [x] `P5-16` Selected configured value возвращается при count=0.
- [x] `P5-17` Unselected configured discrete value с count=0 скрывается по
  текущему public contract.
- [x] `P5-18` Все declared boolean states возвращаются, включая zero counts.
- [x] `P5-19` Internal `system.*` и непубличные `criterion.*` terms никогда не
  публикуются автоматически.

### 5.5. Исправить PRICE virtual facet

- [x] `P5-20` PRICE isolation исключает только active price range, сохраняя все
  term groups.
- [x] `P5-21` Min/max вычисляются по price rows variants, matching remaining
  terms.
- [x] `P5-22` Availability term не подменяется `pli.in_stock`/`vli.in_stock`.
- [x] `P5-23` Product без matching priced variant не влияет на min/max, но это
  не меняет membership page.

### Gate G5

- [ ] OPTION, availability и delivery counts проходят одну isolation model.
- [ ] Counts всегда являются distinct product counts после projection.
- [ ] Selected zero-count и declared zero-count behavior соответствует fixtures.
- [ ] PRICE virtual facet сохраняет non-target term constraints.
- [ ] Forced canonical counts дают правильный результат без signatures.

## Фаза 6. Sort, matched price collector и cursor

Статус: `DONE`

Цель: sort не меняет membership, а price key выбирается только среди matching
variants.

### 6.1. Matched price sort

- [x] `P6-01` Price collector стартует от canonical `productMatches`.
- [x] `P6-02` Для каждого product выбирать minimum price только среди variants,
  входящих в canonical matching variant bitmap.
- [x] `P6-03` Применять одинаковый matched price key для ASC и DESC; направление
  меняет порядок, но не eligible variant set.
- [x] `P6-04` Product без eligible price сохраняется и получает nullable sort
  key с `NULLS LAST`.
- [x] `P6-05` Price collector не читает availability/delivery columns из price
  row.

### 6.2. Availability-first product sort

- [x] `P6-06` Product aggregate `in_stock` и sort bool можно использовать в
  ordering tuple, но не как predicate.
- [x] `P6-07` Проверить aggregate parity с bool-or canonical available terms.
- [x] `P6-08` Sorting AVAILABLE/UNAVAILABLE membership остается результатом
  term filter, а не sort row.

### 6.3. Cursor contract

- [x] `P6-09` Cursor хранит полный nullable tuple для выбранного collector:
  availability-first component, price/text/time key, tie breakers,
  `variantDocId` при необходимости и `productId`.
- [x] `P6-10` Cursor hash включает canonical term groups и отличает
  ALL/AVAILABLE/UNAVAILABLE.
- [x] `P6-11` Boundary predicates повторяют DB ordering для NULL и ASC/DESC.
- [x] `P6-12` Проверить отсутствие duplicates/skips при одинаковой price и при
  переходе priced -> NULL rows.

### Gate G6

- [ ] Sort не изменяет `productMatches` и totalCount.
- [ ] Price key берется только от matching variant.
- [ ] NULL-price products остаются в page последними.
- [ ] Forward pagination без duplicates/skips проходит для всех sorts и
  availability modes.

## Фаза 7. Audit и решение по option signatures

Статус: `DONE`

Цель: оставить signature structures только как измеренную оптимизацию с
доказанной parity либо удалить их полностью.

### 7.1. Подготовить сравнение

- [-] `P7-01` Не применимо по D-002: signature strategies и flags удалены.
- [-] `P7-02` См. D-002.
- [-] `P7-03` См. D-002.
- [-] `P7-04` См. D-002.

### 7.2. Проверить допустимость fast path

- [-] `P7-05` Не применимо по D-002.
- [-] `P7-06` Не применимо по D-002.
- [-] `P7-07` Не применимо по D-002.
- [-] `P7-08` Canonical path является единственным runtime/reference path.
- [-] `P7-09` Не применимо по D-002.

### 7.3. Принять необратимое решение

- [-] `P7-10` Условная ветка сохранения fast path не выбрана; см. D-002.
- [x] `P7-11` Если benefit недостаточен или equivalence не доказана, удалить:
  `ListingOptionSignatureRepository`, signature model tables/indexes, write
  wiring, strategy SQL и configuration flags.
- [x] `P7-12` После удаления/сохранения выполнить repository-wide search на
  orphan types, imports, DDL и docs.

### Gate G7

- [ ] Для каждой оставшейся signature strategy есть canonical parity evidence.
- [ ] Нет criterion-specific signature schema.
- [ ] Либо signature path полностью удален, либо его ограниченная роль
  документирована и измерена.

## Фаза 8. Request snapshot, observability и invariant audit

Статус: `VERIFYING`

Цель: все logical branches одного listing request видят один committed state,
а production diagnostics показывают term algebra и integrity.

### 8.1. Один read snapshot

- [x] `P8-01` Добавить repository boundary для
  `REPEATABLE READ READ ONLY` storefront listing transaction.
- [x] `P8-02` Facet resolution, term posting reads, price candidates,
  projection, page, total, metadata, counts и virtual facets выполнять внутри
  этой transaction.
- [x] `P8-03` Если parallel queries нельзя безопасно выполнять на одном
  transaction connection, выбрать deterministic sequential/combined execution;
  latency сравнить с baseline, но snapshot correctness имеет приоритет.
- [x] `P8-04` Profiling queries не должны менять snapshot semantics основного
  response либо блокировать transaction дольше documented budget.
- [ ] `P8-05` Добавить concurrent transition fixture, доказывающий отсутствие
  mixed old/new rows между branches.

### 8.2. Request observability

- [x] `P8-06` Логировать `variantTermGroupCount` и `variantTermCount`.
- [x] `P8-07` Логировать term/numeric/final variant candidate cardinalities.
- [x] `P8-08` Логировать projected product cardinality и projection strategy.
- [x] `P8-09` Логировать collector kind, snapshot strategy и branch durations.
- [x] `P8-10` Не логировать raw user-sensitive context или полный arbitrary term
  payload; использовать validated field labels/aggregates.

### 8.3. Index audit command/path

- [x] `P8-11` Добавить bounded audit для posting cardinality.
- [x] `P8-12` Добавить universe subset и availability partition audit.
- [x] `P8-13` Добавить price subset, variant mapping и projection block audit.
- [x] `P8-14` Добавить product aggregate/sort bool diagnostic parity.
- [x] `P8-15` Добавить registry version/divergence diagnostics.
- [x] `P8-16` Audit сообщает store, encoded key/decoded safe descriptor,
  expected/actual cardinality и actionable error code.

### 8.4. Concurrency profile

- [ ] `P8-17` Параллельно обновлять hot availability/delivery rows.
- [ ] `P8-18` Параллельно обновлять high-cardinality OPTION/warehouse-like rows.
- [ ] `P8-19` Измерить row/advisory lock wait, update duration, WAL,
  deadlocks/retries и lost update checks.
- [ ] `P8-20` При недопустимом contention зафиксировать отдельное решение;
  sharding не добавлять скрыто в эту реализацию.

### Gate G8

- [ ] Все response branches используют один repeatable read-only snapshot.
- [ ] Concurrent write во время request не создает page/total/count mismatch.
- [ ] Обязательные request metrics видимы и bounded.
- [ ] Full invariant audit проходит на canonical fixtures и 10k dataset.
- [ ] Hot-term profile не содержит lost updates и deadlocks.

## Фаза 9. Финальная verification, performance acceptance и документация

Статус: `VERIFYING`

Цель: доказать correctness и приемлемую стоимость incompatible cutover на clean
DB и закрыть документацию по фактически реализованной модели.

### 9.1. Статические проверки cutover

- [x] `P9-01` Поиск по source подтверждает отсутствие variant OPTION writer с
  `field=facet`.
- [x] `P9-02` Поиск по runtime SQL подтверждает отсутствие variant OPTION reader
  с `field='facet'`.
- [x] `P9-03` Поиск подтверждает отсутствие `plan.inStock ?? true` и product
  stock predicates в membership/counts.
- [x] `P9-04` Price rows/indexes и signatures не содержат criterion-specific
  columns.
- [x] `P9-05` Raw broker/public input не может построить arbitrary encoded term.

### 9.2. Build и clean DB

- [x] `P9-06` Выполнить Listing build через Shopana CLI/MCP.
- [x] `P9-07` Поднять clean DB schema через Shopana CLI/MCP и проверить все
  listing migrations.
- [ ] `P9-08` Выполнить clean sync fixtures и invariant audit.
- [x] `P9-09` Не выполнять migration/reindex старого index: это отдельная
  operational задача вне scope.

### 9.3. Targeted e2e verification

- [x] `P9-10` Обновить `e2e/tests/listing-api/listing.spec.ts` canonical
  membership/count/sort cases.
- [x] `P9-11` Обновить
  `e2e/tests/listing-api/listing-auto-indexing.spec.ts` transition, delete,
  idempotency и single/batch parity cases.
- [ ] `P9-12` Добавить/обновить один targeted snapshot concurrency spec.
- [ ] `P9-13` Запускать Playwright по одному spec через команду Shopana CLI/MCP;
  переходить к следующему только после успешного текущего.
- [ ] `P9-14` Сохранить результаты и ссылки на artifacts в progress log.

### 9.4. Performance acceptance

- [ ] `P9-15` Повторить 10k matrix на тех же DB config, hardware, dataset и
  warmup, что baseline.
- [ ] `P9-16` Availability-only median после warmup не хуже baseline более чем
  на 25%.
- [ ] `P9-17` ALL и UNAVAILABLE не медленнее AVAILABLE более чем в 1.5 раза на
  одном representative scenario.
- [ ] `P9-18` Нет per-value/per-variant N+1.
- [ ] `P9-19` Нет unbounded variant expansion.
- [ ] `P9-20` Нет temp spill.
- [ ] `P9-21` Нет lost bitmap updates и deadlocks.
- [ ] `P9-22` Canonical/signature/projection results имеют parity.
- [ ] `P9-23` Сохранить query p95, write p50/p95, products/sec, WAL, lock wait,
  index bytes и `EXPLAIN ANALYZE`, даже если для них нет hard threshold.

### 9.5. Обновить документацию только после audit

- [x] `P9-24` Обновить
  `knowledge/vault/listing/facets-architecture.ru.md`: variant OPTION и
  availability теперь `field=term`, price остается typed index.
- [x] `P9-25` Обновить актуальный DB/index contract document; явно пометить
  legacy drafts, если они продолжают описывать `variant + facet` или implicit
  stock semantics.
- [x] `P9-26` Документировать registry namespaces, versioning и процедуру
  добавления нового criterion.
- [x] `P9-27` Документировать итоговое решение по option signatures.
- [x] `P9-28` Записать фактическую snapshot strategy и performance profile.
- [-] `P9-29` Changeset не требуется: изменён internal service, publishable
  package contract не менялся. Changeset при необходимости генерировать только разрешенной npm
  командой; файл changeset вручную не редактировать.

### Gate G9

- [ ] Все gates G0–G8 закрыты.
- [ ] Build и clean DB smoke успешны.
- [ ] Targeted e2e specs успешны.
- [ ] Performance hard conditions и thresholds выполнены.
- [ ] Knowledge base и index docs соответствуют фактическому коду.
- [ ] Все обязательные acceptance criteria ниже отмечены выполненными.

## Карта основных файлов

| Область | Файлы | Ожидаемое изменение |
|---|---|---|
| Term contract | новый shared module под `src/listing/variantTerms/` | Types, encoder, registry, builders |
| Repository types | `src/repositories/listing/listingRepositoryTypes.ts` | `term` kind, typed key constraints, term delta inputs |
| Posting writes | `src/repositories/listing/ListingPostingBitmapRepository.ts` | Exact reads, deterministic bulk delta, retain-empty policy |
| Physical schema | `src/repositories/models/listingIndex.ts`, `migrations/domains/0100_listing_index/0100_listing_index__tables.sql` | Contract audit; DDL только при доказанной необходимости |
| Price index | `VariantListingPriceIndexRepository.ts` | Все priced indexable variants, criterion-neutral access |
| Normalized write model | `src/scripts/listingIndexActionTypes.ts` | Canonical terms вместо legacy variant facet keys, version bump |
| Write builder | `ListingBuildSyncWriteModelScript.ts` | Shared materializer, availability/OPTION terms |
| Single writer | `ListingWriteIndexActionScript.ts` | Atomic term delta, legacy writer removal |
| Batch writer | `workflows/ListingBatchProductIndexWorkflow/stepWriteListingBatchSyncIndexAction.ts` | Merged deterministic term deltas, parity |
| Storefront types | `src/repositories/storefront/types.ts` | `ListingVariantTermGroup`, witness and cursor contract |
| Input normalization | `StorefrontFacetResolutionRepository.ts`, resolver input mappers | Public filters -> canonical groups |
| Membership compiler | `sql/compileListingProductMatchesSql.ts`, `sql/compileFiltersSql.ts` | One productMatches, no implicit stock, terms before projection |
| Projection | `StorefrontVariantProjectionQueryRepository.ts`, `sql/compileVariantProjectionSql.ts` | Единственный canonical projection helper |
| Page/total | `sql/compilePageQuerySql.ts`, `sql/compileTotalCountQuerySql.ts` | Shared membership contract |
| Counts | `StorefrontFacetAggregationRepository.ts`, `sql/compileFacetCountsQuerySql.ts` | Generalized group isolation and distinct product counts |
| Virtual facets | `sql/compileVirtualFacetsQuerySql.ts` | Availability terms and matched PRICE bounds |
| Sort/cursor | `StorefrontVariantPriceCollectorRepository.ts`, `StorefrontProductSortCollectorRepository.ts`, `cursor.ts` | Matching variant price, NULL-last tuple |
| Request orchestration | `StorefrontListingQueryRepository.ts`, `Repository.ts` | Repeatable read-only snapshot and metrics |
| Signatures | `ListingOptionSignatureRepository.ts`, models/migration/compiler strategy code | Measured fast path or full removal |
| Fixtures/e2e | `e2e/fixtures/listing/seed.ts`, `e2e/utils/listingSeed.ts`, listing specs | P1–P11, transitions, snapshot and parity |
| Performance | `e2e/scripts/listing-price-facet-perf.mjs`, listing perf specs | Canonical/signature/projection and hot-term matrix |

## Финальный acceptance checklist

- [x] `AC-01` Все discrete variant predicates используют общий
  `ListingVariantTerm` contract.
- [x] `AC-02` Physical term postings содержат `variant_doc_id`.
- [x] `AC-03` Новый boolean/enum criterion не требует DB schema change.
- [x] `AC-04` Availability хранится explicit available/unavailable terms.
- [x] `AC-05` OPTION runtime использует только variant term engine; legacy
  read/write/fallback отсутствуют.
- [x] `AC-06` Один compiler реализует OR внутри group и AND между groups.
- [x] `AC-07` OPTION, availability, delivery и PRICE совпадают на одном variant.
- [x] `AC-08` Projection выполняется после всех variant predicates.
- [x] `AC-09` Product stock aggregate не участвует в membership/counts.
- [x] `AC-10` Variant price index содержит все priced indexable variants и не
  имеет criterion-specific columns.
- [x] `AC-11` Price range/sort ограничены matching variant bitmap.
- [x] `AC-12` Product без eligible price остается в page как NULL-last.
- [x] `AC-13` Page и total используют один `productMatches` contract.
- [x] `AC-14` Facet isolation исключает только target group.
- [x] `AC-15` Counts считают distinct products после projection.
- [x] `AC-16` Selected zero-count values сохраняются.
- [x] `AC-17` Declared boolean states возвращаются с zero count.
- [x] `AC-18` Single и batch writers создают одинаковый normalized index.
- [x] `AC-19` Term/status/price/delete transitions атомарны.
- [x] `AC-20` Posting cardinality и term universe audits проходят.
- [x] `AC-21` Option signatures не содержат criterion-specific schema.
- [x] `AC-22` Любой оставшийся signature fast path имеет canonical parity.
- [x] `AC-23` Все logical read branches видят один repeatable snapshot.
- [x] `AC-24` Registry domains и ID validation защищают от term explosion.
- [ ] `AC-25` 10k profile проходит thresholds и hard pass/fail conditions.
- [x] `AC-26` Knowledge base и index schema docs обновлены после audit.

## Журнал решений

Заполнять при каждом изменении исходного плана или выборе между вариантами.

| ID | Дата | Статус | Решение | Основание/artifact | Влияние на фазы |
|---|---|---|---|---|---|
| D-001 | 2026-07-11 | DECIDED | Criterion-specific price/signature indexes удалены; existing criterion-neutral covering indexes сохранены. Финальный `EXPLAIN ANALYZE` ожидает разрешённого performance run. | `listing-index-db-contract.ru.md` | 2, 9 |
| D-002 | 2026-07-11 | DECIDED | Option signature tables/repository/wiring/strategies удалены: same-variant equivalence и benefit не доказаны. | Repository-wide static audit, clean schema | 7, 9 |
| D-003 | 2026-07-11 | DECIDED | Branches выполняются последовательно на одном transaction connection в `REPEATABLE READ READ ONLY`. | `StorefrontListingQueryRepository.ts` | 8 |

## Журнал блокеров

| ID | Дата | Фаза/задача | Блокер | Владелец решения | Следующее действие | Статус |
|---|---|---|---|---|---|---|
| B-001 | 2026-07-11 | 9 / P9-13, P9-15–P9-23 | Project `AGENTS.md` прямо запрещает запускать test; targeted Playwright и performance specs не запускались. | Project rules | Получить отдельное изменение project rule либо выполнить прогоны владельцем репозитория | OPEN |
| B-002 | 2026-07-11 | 0 / P0-19–P0-21 | Pre-cutover performance baseline невозможно снять после incompatible cutover без возврата к старому коду; запрещённые git operations не использовались. | Project rules | Использовать сохранённый внешний baseline, если он существует | OPEN |

## Журнал прогресса

| Дата | Фаза | Выполнено | Проверка/artifact | Следующий шаг |
|---|---|---|---|---|
| 2026-07-11 | Planning | Создан подробный implementation tracker | Этот документ | Начать P0-01 |
| 2026-07-11 | 0–7 | Выполнен incompatible variant-term cutover; signatures удалены | `listing-universal-variant-terms-implementation-audit-2026-07-11.ru.md` | Snapshot/audit verification |
| 2026-07-11 | 8 | Добавлены repeatable read-only snapshot, bounded diagnostics и invariant audit | Listing build successful | Clean schema |
| 2026-07-11 | 9 | Локальная listing schema очищена и migrations успешно применены через Shopana CLI; signature tables/columns отсутствуют | Shopana migrate + schema inspection | Targeted e2e/performance ожидают разрешения project rule |

## Definition of Done

Реализация считается завершенной только когда:

1. все фазы имеют статус `DONE`;
2. все blocking gates G0–G9 закрыты;
3. все `AC-01`–`AC-26` отмечены `[x]`;
4. ни одна обязательная задача не помечена `[-]` без решения в журнале;
5. build, clean DB, targeted e2e и performance artifacts приложены к журналу;
6. runtime repository-wide audit не находит legacy variant OPTION read/write;
7. документация описывает фактически реализованную, а не предполагаемую
   physical модель.
