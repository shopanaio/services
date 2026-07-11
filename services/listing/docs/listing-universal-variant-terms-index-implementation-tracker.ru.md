# Трекер реализации универсального variant-term индекса Listing

Дата создания: 2026-07-11

Статус: `NOT_STARTED`

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

- [ ] `INV-01` Physical term bitmap содержит `variant_doc_id`, не
  `product_doc_id`.
- [ ] `INV-02` OR применяется внутри одной term group, AND — между groups.
- [ ] `INV-03` OPTION, availability, criterion и price пересекаются в variant
  space до projection.
- [ ] `INV-04` Отсутствие availability input не создает availability predicate.
- [ ] `INV-05` `available=false` — explicit `unavailable` term, а не complement
  positive bitmap.
- [ ] `INV-06` Каждый indexable variant находится ровно в одном availability
  state.
- [ ] `INV-07` Каждый term bitmap является subset
  `system.state=indexable`.
- [ ] `INV-08` Product aggregate `in_stock` используется только для
  sort/diagnostics и не влияет на membership/counts.
- [ ] `INV-09` `variant_listing_price_index` содержит priced rows всех
  indexable availability/criterion states.
- [ ] `INV-10` Price range и matched price sort работают только по matching
  variant candidates.
- [ ] `INV-11` Product без eligible price не исчезает из membership и
  сортируется как `NULLS LAST`.
- [ ] `INV-12` Page, total, counts, virtual facets и sort используют один
  canonical `productMatches` contract в одном request snapshot.
- [ ] `INV-13` Missing posting для declared active state считается нарушением
  индекса; существующий empty posting означает корректный zero-result.
- [ ] `INV-14` Raw broker payload и public input не могут передать arbitrary
  physical term key.
- [ ] `INV-15` Runtime не читает и writer не создает legacy
  `entity_type=variant, field=facet` rows.

## Сводный roadmap

| Фаза | Статус | Результат | Зависит от | Exit gate |
|---|---|---|---|---|
| 0. Baseline и fixtures | `NOT_STARTED` | Зафиксированы contract dataset, legacy inventory и baseline | — | G0 |
| 1. Term domain contract | `NOT_STARTED` | Value object, encoder, registry и normalized groups | G0 | G1 |
| 2. Posting repository | `NOT_STARTED` | Exact reads, bulk delta writes, empty declared states и audit primitives | G1 | G2 |
| 3. Write cutover | `NOT_STARTED` | Single/batch создают один canonical term index | G2 | G3 |
| 4. Read compiler cutover | `NOT_STARTED` | Один `productMatches` и same-variant semantics | G3 | G4 |
| 5. Counts и metadata | `NOT_STARTED` | Generalized isolation, term counts и virtual facets | G4 | G5 |
| 6. Sort и cursor | `NOT_STARTED` | Matched variant price sort и стабильная пагинация | G4, G5 | G6 |
| 7. Signature audit | `NOT_STARTED` | Signature fast path доказан или удален | G5, G6 | G7 |
| 8. Snapshot и observability | `NOT_STARTED` | Один snapshot, метрики и invariant audit | G4–G7 | G8 |
| 9. Verification и docs | `NOT_STARTED` | Clean-DB, e2e и performance acceptance закрыты | G8 | G9 |

## Фаза 0. Baseline, inventory и canonical fixtures

Статус: `NOT_STARTED`

Цель: до изменения индекса зафиксировать ожидаемую семантику, текущее
физическое поведение и измеримый baseline.

### 0.1. Зафиксировать implementation inventory

- [ ] `P0-01` Составить список всех writers legacy variant OPTION postings.
  Минимально проверить:
  `ListingBuildSyncWriteModelScript.ts`,
  `ListingWriteIndexActionScript.ts`,
  `stepWriteListingBatchSyncIndexAction.ts` и
  `ListingPostingBitmapRepository.ts`.
- [ ] `P0-02` Составить список всех readers
  `entity_type=variant, field=facet`. Проверить все SQL compiler файлы, а не
  только page query.
- [ ] `P0-03` Найти и классифицировать все availability-specific membership
  branches: `plan.inStock ?? true`, `vli.in_stock`, `pli.in_stock`,
  in-stock-only price paths и virtual facet branches.
- [ ] `P0-04` Найти все места, где option signature участвует в correctness,
  counts, price eligibility или strategy selection.
- [ ] `P0-05` Зафиксировать текущие price indexes через clean-schema DDL и
  `EXPLAIN (ANALYZE, BUFFERS)` representative queries.
- [ ] `P0-06` Зафиксировать текущую границу storefront request: normalization,
  пять logical branches, parallel execution и отсутствие/наличие общего DB
  snapshot.
- [ ] `P0-07` Сохранить inventory в progress log этого документа либо в
  отдельном audit artifact с ссылкой отсюда.

### 0.2. Создать canonical dataset

- [ ] `P0-08` Добавить в `e2e/fixtures/listing/seed.ts` и/или
  `e2e/utils/listingSeed.ts` именованные records P1–P11:
  available/ready, available/not-ready, unavailable/ready,
  unavailable/not-ready, mixed variants, duplicate term variants, mixed price,
  inactive variant, product without active variants, unknown criterion и
  selected zero-count value.
- [ ] `P0-09` Для P5 явно использовать разные OPTION/availability/delivery/price
  combinations на двух variants одного product, чтобы ранняя projection давала
  заведомо неверный результат.
- [ ] `P0-10` Для P6 создать два variants одного product с одинаковым term для
  проверки удаления одного variant без потери второго.
- [ ] `P0-11` Для P7 создать available variant без price и unavailable priced
  variant для проверки matched price semantics.
- [ ] `P0-12` Для P8 проверить, что inactive/archived variant имеет source
  values, но не попадает в indexable universe, terms и price runtime index.

### 0.3. Зафиксировать contract expectations

- [ ] `P0-13` Создать expected matrix для ALL/AVAILABLE/UNAVAILABLE без других
  filters.
- [ ] `P0-14` Создать expected matrix для OPTION + availability,
  OPTION + PRICE, availability + delivery и полного conjunctive запроса.
- [ ] `P0-15` Зафиксировать monotonicity: добавление AND-group не расширяет
  result, добавление value в существующую OR-group может расширить result.
- [ ] `P0-16` Зафиксировать overlap counts: mixed product разрешено учитывать в
  нескольких isolated boolean buckets.
- [ ] `P0-17` Зафиксировать page/total parity для всех scopes и sorts.
- [ ] `P0-18` Зафиксировать metadata rules для selected zero-count и declared
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

Статус: `NOT_STARTED`

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

- [ ] `P1-01` Добавить immutable `ListingVariantTerm` с `fieldKey` и
  `valueKey`.
- [ ] `P1-02` Добавить `ListingVariantTermGroup` с `groupKey`, `terms` и
  `source: OPTION | AVAILABILITY | CRITERION`.
- [ ] `P1-03` Добавить value domain types: `DECLARED`,
  `CONFIGURED_OPTION_VALUES`, `VALIDATED_IDS`.
- [ ] `P1-04` Добавить unknown policies: `FORBID`, `EXPLICIT`, `OMIT`.
- [ ] `P1-05` Зафиксировать constraints: trimmed non-empty, canonical
  case-sensitive keys, deterministic sort, no localized labels и no mutable
  handles при наличии stable ID.

### 1.2. Реализовать versioned encoding

- [ ] `P1-06` Реализовать единственный encoder:
  `JSON.stringify(["v1", fieldKey, valueKey])`.
- [ ] `P1-07` Реализовать strict decoder только для diagnostics/contract
  verification; runtime lookup не должен парсить DB `value_key`.
- [ ] `P1-08` Добавить helpers `compareTerms`, `deduplicateTerms`,
  `encodeListingVariantTerm` и exact posting key builder.
- [ ] `P1-09` Запретить ручную конкатенацию `fieldKey/valueKey` вне модуля
  builders/encoder статическим поиском и code review checklist.
- [ ] `P1-10` Зафиксировать encoded examples availability, delivery и OPTION в
  contract fixtures.

### 1.3. Создать начальный registry

- [ ] `P1-11` Зарегистрировать `system.state=indexable` как declared state.
- [ ] `P1-12` Зарегистрировать `criterion.availability` со значениями строго
  `available`, `unavailable` и policy `FORBID` для unknown.
- [ ] `P1-13` Зарегистрировать namespace `option:<facetId>` с domain
  `CONFIGURED_OPTION_VALUES`.
- [ ] `P1-14` Добавить reference definition
  `criterion.delivery.ready=true|false|unknown`; до наличия upstream поля он
  используется в fixtures и contract verification, но не выдумывается из
  других данных.
- [ ] `P1-15` Добавить registry version/build metadata для diagnostics.
- [ ] `P1-16` Реализовать validation stable IDs для OPTION/ID domains и запрет
  произвольных registry keys из broker payload.

### 1.4. Реализовать materializers и input normalization

- [ ] `P1-17` Materializer indexable variant всегда добавляет
  `system.state=indexable`.
- [ ] `P1-18` Availability materializer использует canonical
  `availableForSale`: `true -> available`, `false -> unavailable`. Quantity не
  меняет этот state.
- [ ] `P1-19` OPTION materializer принимает только resolved stable
  `facetId/facetValueId` и создает term
  `option:<facetId>=<facetValueId>`.
- [ ] `P1-20` Общий builder удаляет duplicates и сортирует terms по
  `fieldKey`, затем `valueKey`.
- [ ] `P1-21` Input normalizer преобразует direct availability и configured
  IN_STOCK alias в одну canonical group.
- [ ] `P1-22` Отсутствующий availability input не создает group; conflicting
  aliases возвращают validation error до SQL compilation.
- [ ] `P1-23` Включить canonical term groups и availability mode в filter hash,
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

Статус: `NOT_STARTED`

Цель: подготовить repository primitives для term postings до переключения
writers и readers.

Основные файлы:

- `src/repositories/listing/listingRepositoryTypes.ts`;
- `src/repositories/listing/ListingPostingBitmapRepository.ts`;
- `src/repositories/models/listingIndex.ts`;
- `migrations/domains/0100_listing_index/0100_listing_index__tables.sql`;
- `src/repositories/listing/VariantListingPriceIndexRepository.ts`.

### 2.1. Расширить repository types и validation

- [ ] `P2-01` Добавить canonical supported kind
  `entityType=variant, field=term` в typed contracts.
- [ ] `P2-02` Разделить допустимые product и variant posting fields так, чтобы
  `term` нельзя было записать как product posting по ошибке.
- [ ] `P2-03` Сохранить `variant_product` как отдельный narrow lookup kind.
- [ ] `P2-04` После cutover запретить запись `variant + facet` на repository
  boundary; product `facet` для TAG/FEATURE остается допустимым.
- [ ] `P2-05` Validation term keys выполняется через strict decoder/registry
  descriptor, а не через prefix/substring assumptions.

### 2.2. Добавить exact bulk reads

- [ ] `P2-06` Добавить bulk lookup exact encoded term keys одним bounded query.
- [ ] `P2-07` Результат lookup должен различать:
  existing empty declared row и missing declared row.
- [ ] `P2-08` Для missing configured OPTION row определить canonical empty
  semantics отдельно от declared system/criterion invariant; не маскировать
  corruption обязательного declared state.
- [ ] `P2-09` Возвращать results в deterministic requested-key order либо map,
  не зависящий от порядка строк PostgreSQL.

### 2.3. Реализовать deterministic bulk delta update

- [ ] `P2-10` Ввести input, агрегирующий для каждого encoded term key
  `removedVariantDocIds` и `addedVariantDocIds`.
- [ ] `P2-11` Нормализовать keys и doc IDs: deduplicate, validate positive IDs,
  sort keys lexicographically и doc IDs numerically.
- [ ] `P2-12` Захватывать/обновлять posting rows в одном deterministic key order,
  чтобы parallel products не создавали lock inversion.
- [ ] `P2-13` Выполнять формулу
  `(bitmap - removed) | added` атомарно на row и пересчитывать cardinality через
  `rb_cardinality`.
- [ ] `P2-14` Убедиться, что remove и add одного doc ID в одном merged batch
  дают конечное membership из `next`, а не зависят от порядка операций.
- [ ] `P2-15` Возвращать touched/created/emptied counters для observability и
  parity checks.

### 2.4. Ввести policy empty rows

- [ ] `P2-16` Не удалять empty rows для active declared states
  `system.state=indexable`, availability states и других definitions, которым
  registry задает retain-empty policy.
- [ ] `P2-17` Разрешить удаление empty OPTION/configured rows только когда row
  больше не нужна active configuration/selected metadata.
- [ ] `P2-18` Заменить безусловное удаление cardinality-zero rows в
  `removeDocIdsReturning` на registry-aware policy.
- [ ] `P2-19` Создавать оба availability rows даже в store, где один bucket
  пуст.

### 2.5. Добавить audit primitives

- [ ] `P2-20` Проверять `cardinality = rb_cardinality(bitmap)`.
- [ ] `P2-21` Проверять каждый term bitmap как subset indexable universe.
- [ ] `P2-22` Проверять availability intersection как empty и union как exact
  universe.
- [ ] `P2-23` Проверять variant mapping на существующий product doc.
- [ ] `P2-24` Проверять price variant IDs как subset universe.
- [ ] `P2-25` Добавить registry-specific exactly-one/zero-or-one audit hooks.

### 2.6. Подтвердить DB schema

- [ ] `P2-26` Подтвердить, что существующих columns и PK
  `(store_id, entity_type, field, value_key)` достаточно для `field=term`.
- [ ] `P2-27` Не добавлять availability/delivery columns или новые bitmap
  columns.
- [ ] `P2-28` Проверить criterion-neutral price indexes под range и matched
  per-product minimum; менять DDL только по сохраненному `EXPLAIN ANALYZE`.
- [ ] `P2-29` Если DDL не меняется, явно записать `no schema change required` в
  журнал решений; не создавать пустую migration.

### Gate G2

- [ ] Repository exact-read различает missing и retained empty declared term.
- [ ] Bulk delta update детерминирован и не теряет concurrent additions.
- [ ] Availability empty states сохраняются.
- [ ] Audit обнаруживает cardinality, universe и availability partition errors.
- [ ] Physical schema не содержит criterion-specific columns.

## Фаза 3. Полный cutover write path

Статус: `NOT_STARTED`

Цель: single и batch writers атомарно создают одинаковые canonical term, price,
mapping, projection и aggregate rows; legacy variant facet writer удален.

### 3.1. Изменить normalized write model

- [ ] `P3-01` Заменить `variantFacetValueKeysByVariantId` на canonical
  `variantTermsByVariantId` либо на `terms` внутри normalized variant record.
- [ ] `P3-02` Сохранить в normalized variant минимум `variantId`,
  `variantDocId` после allocation, `productDocId`, sorted terms и prices.
- [ ] `P3-03` Явно определить indexable classifier для active variants и
  использовать один helper в single/batch.
- [ ] `P3-04` Non-indexable variants не получают universe term, criterion terms
  или runtime price rows.
- [ ] `P3-05` Изменить version/hash marker write model, поскольку shape и
  physical meaning несовместимы с v1; старый version должен отклоняться, а не
  silently интерпретироваться как новый.
- [ ] `P3-06` Product `inStock` вычислять как diagnostic/sort aggregate от
  canonical indexable variant availability, не как membership source.
- [ ] `P3-07` Product sort bool сохранять согласованным с тем же aggregate.

### 3.2. Переписать builder

- [ ] `P3-08` `ListingBuildSyncWriteModelScript` вызывает shared registry
  materializer для каждого indexable variant.
- [ ] `P3-09` Availability определяется только `availableForSale`; убрать
  quantity guard из canonical state.
- [ ] `P3-10` Resolved OPTION values преобразуются в canonical terms, legacy
  `<facetId>:<facetValueId>` keys для variant postings больше не строятся.
- [ ] `P3-11` Duplicate source selections дают один term на variant.
- [ ] `P3-12` Price rows строятся для всех priced indexable variants независимо
  от availability/delivery term.
- [ ] `P3-13` `variant_listing_price_index` не получает term columns и не
  фильтруется по `inStock` при build.
- [ ] `P3-14` Если signature временно остается до фазы 7, строить его только из
  canonical OPTION terms и не включать criterion-specific state.

### 3.3. Переписать single writer

- [ ] `P3-15` В `ListingWriteIndexActionScript` получить previous/next term
  memberships для variants продукта и построить merged delta по encoded key.
- [ ] `P3-16` Применить term delta в одной item transaction вместе с product,
  variant, price, sort, projection и item state writes.
- [ ] `P3-17` Variant add/update/delete и active/inactive transition обновляют
  universe и все terms атомарно.
- [ ] `P3-18` Удаление одного из двух variants с одинаковым term не удаляет
  membership второго.
- [ ] `P3-19` Price add/update/delete не изменяет unrelated term bitmap.
- [ ] `P3-20` Удалить вызов `replaceVariantMemberships(field="facet")`.
- [ ] `P3-21` Убедиться, что stale variant cleanup удаляет `term`,
  `variant_product`, price и mapping dependencies до/вместе с variant row.

### 3.4. Переписать batch writer

- [ ] `P3-22` Заменить `VariantMembershipReplacement.field="facet"` на merged
  term delta model.
- [ ] `P3-23` Перед записью объединить changes всех products по term key, чтобы
  один hot row обновлялся bounded число раз на batch.
- [ ] `P3-24` Сортировать products, variants и term keys детерминированно.
- [ ] `P3-25` Batch применяет те же builder, retain-empty policy и cleanup
  helpers, что single path.
- [ ] `P3-26` Batch transaction включает term/price/projection/item-state writes
  без промежуточного visible state.
- [ ] `P3-27` Удалить batch legacy `field="facet"` variant membership writes.

### 3.5. Закрыть transition matrix

- [ ] `P3-28` available -> unavailable.
- [ ] `P3-29` unavailable -> available.
- [ ] `P3-30` delivery true -> false/unknown и обратно.
- [ ] `P3-31` OPTION add/remove/change.
- [ ] `P3-32` criterion add/remove/change.
- [ ] `P3-33` active -> inactive/archived и обратно.
- [ ] `P3-34` variant delete/recreate со stable allocation rules.
- [ ] `P3-35` product publish/unpublish/delete.
- [ ] `P3-36` price add/update/delete независимо от term state.
- [ ] `P3-37` повтор той же idempotency/event sequence дает noop, а conflict не
  оставляет partial bitmap delta.

### Gate G3

- [ ] Clean sync создает только `variant + term` OPTION postings.
- [ ] Поиск по DB не находит runtime-created `variant + facet` rows.
- [ ] Single и batch дают row-level parity для terms, price, mapping,
  projection, aggregates и item state.
- [ ] Полная transition matrix атомарна.
- [ ] Universe и availability partition audit проходят после каждого сценария.

## Фаза 4. Canonical read compiler и membership cutover

Статус: `NOT_STARTED`

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

- [ ] `P4-01` Добавить `variantTermGroups` в `StorefrontFilterPlan`.
- [ ] `P4-02` OPTION resolution возвращает terms, а не legacy facet posting
  value keys.
- [ ] `P4-03` Availability direct input/alias возвращает group
  `criterion.availability` либо не возвращает group для ALL.
- [ ] `P4-04` Numeric/range filters остаются отдельной частью plan.
- [ ] `P4-05` `needsVariantWitness` вычислять как наличие term group или numeric
  variant filter.
- [ ] `P4-06` Group identity строить по stable `groupKey`, не по UI label или
  hardcoded SQL branch.

### 4.2. Ввести criterion-neutral SQL helpers

- [ ] `P4-07` Реализовать `compileVariantTermPostingKey`.
- [ ] `P4-08` Реализовать bitmap OR для одной term group.
- [ ] `P4-09` Реализовать bitmap AND для всех term groups.
- [ ] `P4-10` При наличии variant witness начинать от
  `system.state=indexable`, затем применять groups.
- [ ] `P4-11` Реализовать numeric candidate bitmap из
  `variant_listing_price_index` с `has_price=true`.
- [ ] `P4-12` Пересекать term и numeric candidates в variant space.
- [ ] `P4-13` Использовать один canonical
  `projectVariantBitmapToProducts` helper для broad/partial projection.
- [ ] `P4-14` Сохранить `variant_product` только как measured narrow lookup, с
  parity относительно canonical projection.

### 4.3. Собрать один productMatches contract

- [ ] `P4-15` `productBase = published scope & product-level filters`.
- [ ] `P4-16` При `needsVariantWitness=false` вернуть только `productBase`:
  product без active variants остается допустимым в ALL.
- [ ] `P4-17` При `needsVariantWitness=true` вычислить
  `productBase & projectDistinctProducts(variantCandidates)`.
- [ ] `P4-18` Page и total используют один helper/CTE contract без независимой
  интерпретации filters.
- [ ] `P4-19` Product TAG/FEATURE filters применяются на product bitmap, но при
  variant witness пересекаются с той же projection.

### 4.4. Удалить legacy availability membership

- [ ] `P4-20` Удалить `shouldApplyProductStockAtProductLevel` и product
  `in_stock` predicate из membership.
- [ ] `P4-21` Удалить implicit `plan.inStock ?? true`.
- [ ] `P4-22` Удалить `vli.in_stock` predicates из OPTION/price membership.
- [ ] `P4-23` Удалить special-case `available=false -> empty` в priced path.
- [ ] `P4-24` Availability mode остается в public normalization/hash, но
  physical compiler получает обычную term group.

### 4.5. Удалить legacy OPTION readers

- [ ] `P4-25` Заменить все reads `variant + facet` на exact `variant + term`
  keys.
- [ ] `P4-26` Удалить legacy key construction `<facetId>:<facetValueId>` из
  variant runtime compiler.
- [ ] `P4-27` Не добавлять fallback к legacy encoding при missing term.
- [ ] `P4-28` Выполнить repository-wide search и классифицировать оставшиеся
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

Статус: `NOT_STARTED`

Цель: counts и facet output используют тот же variant term algebra, что page и
total.

### 5.1. Generalize isolation

- [ ] `P5-01` Изолировать target variant group по `groupKey`.
- [ ] `P5-02` При расчете target group сохранить все остальные term groups,
  numeric filters и product-level filters.
- [ ] `P5-03` Для target value вычислять
  `baseVariantTerms & targetValueTerm & numericCandidates`.
- [ ] `P5-04` Сначала проецировать matching variants, затем пересекать с
  `productBase`, затем считать product cardinality.
- [ ] `P5-05` Два matching variants одного product дают count +1, не +2.
- [ ] `P5-06` Mixed product разрешено учитывать и в available, и в unavailable
  isolated buckets.

### 5.2. Перевести OPTION counts

- [ ] `P5-07` Canonical OPTION count path читает term postings.
- [ ] `P5-08` Candidate expansion не делает query per value.
- [ ] `P5-09` Heavy option path не становится correctness source и может быть
  принудительно отключен для parity.
- [ ] `P5-10` Product facets TAG/FEATURE продолжают читать product `field=facet`
  и учитывают canonical variant witness.

### 5.3. Перевести availability и future criteria

- [ ] `P5-11` Availability true/false counts вычисляются тем же engine, что
  OPTION terms.
- [ ] `P5-12` Reference `delivery.ready` fixture проходит без новой DB schema и
  без нового count compiler branch.
- [ ] `P5-13` Declared multi-state criterion применяет registry policy для
  unknown и output order.

### 5.4. Исправить metadata contract

- [ ] `P5-14` OPTION metadata остается в `facet/facet_value` configuration,
  physical term rows не становятся metadata source.
- [ ] `P5-15` Virtual boolean/enum metadata строится из registry definition.
- [ ] `P5-16` Selected configured value возвращается при count=0.
- [ ] `P5-17` Unselected configured discrete value с count=0 скрывается по
  текущему public contract.
- [ ] `P5-18` Все declared boolean states возвращаются, включая zero counts.
- [ ] `P5-19` Internal `system.*` и непубличные `criterion.*` terms никогда не
  публикуются автоматически.

### 5.5. Исправить PRICE virtual facet

- [ ] `P5-20` PRICE isolation исключает только active price range, сохраняя все
  term groups.
- [ ] `P5-21` Min/max вычисляются по price rows variants, matching remaining
  terms.
- [ ] `P5-22` Availability term не подменяется `pli.in_stock`/`vli.in_stock`.
- [ ] `P5-23` Product без matching priced variant не влияет на min/max, но это
  не меняет membership page.

### Gate G5

- [ ] OPTION, availability и delivery counts проходят одну isolation model.
- [ ] Counts всегда являются distinct product counts после projection.
- [ ] Selected zero-count и declared zero-count behavior соответствует fixtures.
- [ ] PRICE virtual facet сохраняет non-target term constraints.
- [ ] Forced canonical counts дают правильный результат без signatures.

## Фаза 6. Sort, matched price collector и cursor

Статус: `NOT_STARTED`

Цель: sort не меняет membership, а price key выбирается только среди matching
variants.

### 6.1. Matched price sort

- [ ] `P6-01` Price collector стартует от canonical `productMatches`.
- [ ] `P6-02` Для каждого product выбирать minimum price только среди variants,
  входящих в canonical matching variant bitmap.
- [ ] `P6-03` Применять одинаковый matched price key для ASC и DESC; направление
  меняет порядок, но не eligible variant set.
- [ ] `P6-04` Product без eligible price сохраняется и получает nullable sort
  key с `NULLS LAST`.
- [ ] `P6-05` Price collector не читает availability/delivery columns из price
  row.

### 6.2. Availability-first product sort

- [ ] `P6-06` Product aggregate `in_stock` и sort bool можно использовать в
  ordering tuple, но не как predicate.
- [ ] `P6-07` Проверить aggregate parity с bool-or canonical available terms.
- [ ] `P6-08` Sorting AVAILABLE/UNAVAILABLE membership остается результатом
  term filter, а не sort row.

### 6.3. Cursor contract

- [ ] `P6-09` Cursor хранит полный nullable tuple для выбранного collector:
  availability-first component, price/text/time key, tie breakers,
  `variantDocId` при необходимости и `productId`.
- [ ] `P6-10` Cursor hash включает canonical term groups и отличает
  ALL/AVAILABLE/UNAVAILABLE.
- [ ] `P6-11` Boundary predicates повторяют DB ordering для NULL и ASC/DESC.
- [ ] `P6-12` Проверить отсутствие duplicates/skips при одинаковой price и при
  переходе priced -> NULL rows.

### Gate G6

- [ ] Sort не изменяет `productMatches` и totalCount.
- [ ] Price key берется только от matching variant.
- [ ] NULL-price products остаются в page последними.
- [ ] Forward pagination без duplicates/skips проходит для всех sorts и
  availability modes.

## Фаза 7. Audit и решение по option signatures

Статус: `NOT_STARTED`

Цель: оставить signature structures только как измеренную оптимизацию с
доказанной parity либо удалить их полностью.

### 7.1. Подготовить сравнение

- [ ] `P7-01` Добавить forced canonical strategy flag только для tests,
  diagnostics и profiling.
- [ ] `P7-02` Сравнить canonical term counts с каждой signature strategy на
  P1–P11 и 10k dataset.
- [ ] `P7-03` Покрыть OPTION + availability + delivery + PRICE и mixed products.
- [ ] `P7-04` Сравнить result bitmap, counts, selected zero values, p50/p95,
  buffers, temp spill, index bytes и write overhead.

### 7.2. Проверить допустимость fast path

- [ ] `P7-05` Signature принимает уже ограниченный matching variant set либо
  имеет доказательство same-variant equivalence.
- [ ] `P7-06` Signature schema не содержит availability/delivery/criterion
  columns, bitmaps или counters.
- [ ] `P7-07` Добавление нового registry criterion не требует schema или
  algorithm change signature index.
- [ ] `P7-08` Canonical path остается доступным как reference и diagnostic.
- [ ] `P7-09` Signature data строится из canonical OPTION terms, не из legacy
  posting keys.

### 7.3. Принять необратимое решение

- [ ] `P7-10` Если parity и benefit доказаны, записать benchmark evidence,
  supported query shapes и fallback rules в decision log.
- [ ] `P7-11` Если benefit недостаточен или equivalence не доказана, удалить:
  `ListingOptionSignatureRepository`, signature model tables/indexes, write
  wiring, strategy SQL и configuration flags.
- [ ] `P7-12` После удаления/сохранения выполнить repository-wide search на
  orphan types, imports, DDL и docs.

### Gate G7

- [ ] Для каждой оставшейся signature strategy есть canonical parity evidence.
- [ ] Нет criterion-specific signature schema.
- [ ] Либо signature path полностью удален, либо его ограниченная роль
  документирована и измерена.

## Фаза 8. Request snapshot, observability и invariant audit

Статус: `NOT_STARTED`

Цель: все logical branches одного listing request видят один committed state,
а production diagnostics показывают term algebra и integrity.

### 8.1. Один read snapshot

- [ ] `P8-01` Добавить repository boundary для
  `REPEATABLE READ READ ONLY` storefront listing transaction.
- [ ] `P8-02` Facet resolution, term posting reads, price candidates,
  projection, page, total, metadata, counts и virtual facets выполнять внутри
  этой transaction.
- [ ] `P8-03` Если parallel queries нельзя безопасно выполнять на одном
  transaction connection, выбрать deterministic sequential/combined execution;
  latency сравнить с baseline, но snapshot correctness имеет приоритет.
- [ ] `P8-04` Profiling queries не должны менять snapshot semantics основного
  response либо блокировать transaction дольше documented budget.
- [ ] `P8-05` Добавить concurrent transition fixture, доказывающий отсутствие
  mixed old/new rows между branches.

### 8.2. Request observability

- [ ] `P8-06` Логировать `variantTermGroupCount` и `variantTermCount`.
- [ ] `P8-07` Логировать term/numeric/final variant candidate cardinalities.
- [ ] `P8-08` Логировать projected product cardinality и projection strategy.
- [ ] `P8-09` Логировать collector kind, snapshot strategy и branch durations.
- [ ] `P8-10` Не логировать raw user-sensitive context или полный arbitrary term
  payload; использовать validated field labels/aggregates.

### 8.3. Index audit command/path

- [ ] `P8-11` Добавить bounded audit для posting cardinality.
- [ ] `P8-12` Добавить universe subset и availability partition audit.
- [ ] `P8-13` Добавить price subset, variant mapping и projection block audit.
- [ ] `P8-14` Добавить product aggregate/sort bool diagnostic parity.
- [ ] `P8-15` Добавить registry version/divergence diagnostics.
- [ ] `P8-16` Audit сообщает store, encoded key/decoded safe descriptor,
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

Статус: `NOT_STARTED`

Цель: доказать correctness и приемлемую стоимость incompatible cutover на clean
DB и закрыть документацию по фактически реализованной модели.

### 9.1. Статические проверки cutover

- [ ] `P9-01` Поиск по source подтверждает отсутствие variant OPTION writer с
  `field=facet`.
- [ ] `P9-02` Поиск по runtime SQL подтверждает отсутствие variant OPTION reader
  с `field='facet'`.
- [ ] `P9-03` Поиск подтверждает отсутствие `plan.inStock ?? true` и product
  stock predicates в membership/counts.
- [ ] `P9-04` Price rows/indexes и signatures не содержат criterion-specific
  columns.
- [ ] `P9-05` Raw broker/public input не может построить arbitrary encoded term.

### 9.2. Build и clean DB

- [ ] `P9-06` Выполнить Listing build через Shopana CLI/MCP.
- [ ] `P9-07` Поднять clean DB schema через Shopana CLI/MCP и проверить все
  listing migrations.
- [ ] `P9-08` Выполнить clean sync fixtures и invariant audit.
- [ ] `P9-09` Не выполнять migration/reindex старого index: это отдельная
  operational задача вне scope.

### 9.3. Targeted e2e verification

- [ ] `P9-10` Обновить `e2e/tests/listing-api/listing.spec.ts` canonical
  membership/count/sort cases.
- [ ] `P9-11` Обновить
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

- [ ] `P9-24` Обновить
  `knowledge/vault/listing/facets-architecture.ru.md`: variant OPTION и
  availability теперь `field=term`, price остается typed index.
- [ ] `P9-25` Обновить актуальный DB/index contract document; явно пометить
  legacy drafts, если они продолжают описывать `variant + facet` или implicit
  stock semantics.
- [ ] `P9-26` Документировать registry namespaces, versioning и процедуру
  добавления нового criterion.
- [ ] `P9-27` Документировать итоговое решение по option signatures.
- [ ] `P9-28` Записать фактическую snapshot strategy и performance profile.
- [ ] `P9-29` Changeset при необходимости генерировать только разрешенной npm
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

- [ ] `AC-01` Все discrete variant predicates используют общий
  `ListingVariantTerm` contract.
- [ ] `AC-02` Physical term postings содержат `variant_doc_id`.
- [ ] `AC-03` Новый boolean/enum criterion не требует DB schema change.
- [ ] `AC-04` Availability хранится explicit available/unavailable terms.
- [ ] `AC-05` OPTION runtime использует только variant term engine; legacy
  read/write/fallback отсутствуют.
- [ ] `AC-06` Один compiler реализует OR внутри group и AND между groups.
- [ ] `AC-07` OPTION, availability, delivery и PRICE совпадают на одном variant.
- [ ] `AC-08` Projection выполняется после всех variant predicates.
- [ ] `AC-09` Product stock aggregate не участвует в membership/counts.
- [ ] `AC-10` Variant price index содержит все priced indexable variants и не
  имеет criterion-specific columns.
- [ ] `AC-11` Price range/sort ограничены matching variant bitmap.
- [ ] `AC-12` Product без eligible price остается в page как NULL-last.
- [ ] `AC-13` Page и total используют один `productMatches` contract.
- [ ] `AC-14` Facet isolation исключает только target group.
- [ ] `AC-15` Counts считают distinct products после projection.
- [ ] `AC-16` Selected zero-count values сохраняются.
- [ ] `AC-17` Declared boolean states возвращаются с zero count.
- [ ] `AC-18` Single и batch writers создают одинаковый normalized index.
- [ ] `AC-19` Term/status/price/delete transitions атомарны.
- [ ] `AC-20` Posting cardinality и term universe audits проходят.
- [ ] `AC-21` Option signatures не содержат criterion-specific schema.
- [ ] `AC-22` Любой оставшийся signature fast path имеет canonical parity.
- [ ] `AC-23` Все logical read branches видят один repeatable snapshot.
- [ ] `AC-24` Registry domains и ID validation защищают от term explosion.
- [ ] `AC-25` 10k profile проходит thresholds и hard pass/fail conditions.
- [ ] `AC-26` Knowledge base и index schema docs обновлены после audit.

## Журнал решений

Заполнять при каждом изменении исходного плана или выборе между вариантами.

| ID | Дата | Статус | Решение | Основание/artifact | Влияние на фазы |
|---|---|---|---|---|---|
| D-001 | — | OPEN | Нужны ли изменения criterion-neutral price indexes после `EXPLAIN ANALYZE`? | — | 2, 9 |
| D-002 | — | OPEN | Сохранить или удалить option signature structures? | — | 7, 9 |
| D-003 | — | OPEN | Как выполнить parallel branches на одном repeatable-read connection? | — | 8 |

## Журнал блокеров

| ID | Дата | Фаза/задача | Блокер | Владелец решения | Следующее действие | Статус |
|---|---|---|---|---|---|---|
| B-001 | — | — | — | — | — | CLOSED |

## Журнал прогресса

| Дата | Фаза | Выполнено | Проверка/artifact | Следующий шаг |
|---|---|---|---|---|
| 2026-07-11 | Planning | Создан подробный implementation tracker | Этот документ | Начать P0-01 |

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
