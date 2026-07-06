# План синхронизации Facet Reference State

## Цель

Поддерживать reference state, которым владеет Listing, в актуальном состоянии,
когда product/variant facet source или source value становится валидным или
устаревшим.

Reference state принадлежит Listing:

- `listing.facet_source.reference_status`
- `listing.facet_source.reference_checked_at`
- `listing.facet_source.reference_status_changed_at`
- `listing.facet_value.reference_status` для `kind = 'source'`
- `listing.facet_value.reference_checked_at`
- `listing.facet_value.reference_status_changed_at`

Catalog не должен знать, где его product/variant данные используются как facets.
Контракты событий менять нельзя.

## Не цели

- Не менять event contracts.
- Не отправлять facet-specific events из Catalog.
- Не заставлять Catalog зависеть от facet-концепций Listing.
- Не удалять stale facet sources или source values автоматически.
- Не менять публичные GraphQL contracts без отдельного UI-требования.
- Не редактировать changeset files вручную.

## Текущее состояние

Listing уже хранит reference state:

- `facet_source.reference_status` по умолчанию `VALID`.
- `facet_value.reference_status` по умолчанию `VALID`.
- Display facet values через DB constraint всегда остаются `VALID`.
- Storefront SQL уже фильтрует `VALID` source values в нескольких путях.

Catalog уже предоставляет candidate actions:

- `catalog.getFacetSourceCandidate`
- `catalog.getFacetValueCandidatesByHandles`
- `catalog.facetSourceCandidates`
- `catalog.facetValueCandidates`

Эти actions можно переиспользовать как read-side validators.

## Важное ограничение: candidate actions валидируют, но не триггерят

Candidate actions могут ответить, существует ли reference сейчас. Они не могут
сообщить Listing, что данные в Catalog изменились.

Следовательно:

- Использовать candidate actions для вычисления `VALID` / `STALE`.
- Запускать sync из Listing-owned flows и maintenance jobs.
- Не добавлять новые Catalog facet events.

## Насколько подходят candidate actions

### Проверка facet source

Для точечной проверки source reference использовать
`catalog.getFacetSourceCandidate`:

```ts
{
  storeId,
  locale,
  facetType,
  handle
}
```

Результат:

- row exists: source is `VALID`
- `null`: source is `STALE`

Это покрывает:

- `TAG` source: `tags`
- `FEATURE` source: product feature slug
- `OPTION` source: product option slug
- computed sources вроде `PRICE` / `IN_STOCK`, если они остаются в source candidate view

### Проверка source value

Для batch-проверки values использовать `catalog.getFacetValueCandidatesByHandles`:

```ts
{
  storeId,
  locale,
  candidateType,
  sourceHandles,
  handles
}
```

Возвращаемые rows содержат `sourceHandle` и `handle`, поэтому Listing может
собрать set существующих ключей.

Это покрывает:

- `TAG`: value handle равен tag handle
- `FEATURE`: value handle равен `featureSlug:valueSlug`
- `OPTION`: value handle равен `optionSlug:valueSlug`

Так как source value handles для `FEATURE` и `OPTION` уже содержат prefix source
slug, текущий lookup `sourceHandle IN (...) AND handle IN (...)` безопасен для
batch-проверок.

### Нюанс с locale

Candidate views зависят от locale, потому что join-ят translation tables.

Для reference state нужно использовать default locale магазина, а не активную
locale admin request. Иначе существующая Catalog entity без перевода в текущей
locale может быть ошибочно помечена как `STALE`.

## Reference keys

Listing должен нормализовать проверки в явные ключи.

```ts
type ReferenceStatus = "VALID" | "STALE";

type FacetSourceReferenceKey = {
  facetType: "TAG" | "FEATURE" | "OPTION" | "PRICE" | "IN_STOCK";
  sourceHandle: string;
};

type FacetSourceValueReferenceKey = {
  facetType: "TAG" | "FEATURE" | "OPTION";
  sourceHandle: string;
  valueHandle: string;
};
```

## Предлагаемая реализация

### 1. Добавить Listing script

Добавить script, которым владеет Listing:

```ts
FacetReferenceStateSyncScript
```

Input:

```ts
{
  facetIds?: string[];
  facetSourceIds?: string[];
  facetValueIds?: string[];
  checkValues?: boolean;
}
```

Output:

```ts
{
  checkedSourceCount: number;
  staleSourceCount: number;
  checkedValueCount: number;
  staleValueCount: number;
}
```

Script выполняется внутри Listing context и использует
`ctx.store.defaultLocale` для candidate checks.

### 2. Добавить repository methods

Добавить методы в Listing facet repositories:

- загрузить sources для reference sync
- загрузить source values для reference sync
- bulk update source reference state
- bulk update source value reference state

Правила обновления state:

- Всегда ставить `reference_checked_at = now()`.
- Ставить `reference_status_changed_at = now()` только если status изменился.
- Не обновлять display values в `STALE`.

### 3. Алгоритм sync для sources

1. Загрузить целевые rows `facet_source` с `facetType` и `handle`.
2. Сгруппировать уникальные keys `(facetType, handle)`.
3. Для маленьких batches вызвать `getFacetSourceCandidate` на каждый уникальный key.
4. Для больших batches опционально использовать `facetSourceCandidates` с filters и pagination.
5. Пометить каждый row:
   - found: `VALID`
   - missing: `STALE`
6. Сохранить state bulk-обновлением там, где это возможно.

### 4. Алгоритм sync для source values

1. Загрузить source rows `facet_value` вместе с parent facet и facet sources.
2. Пропустить non-source values.
3. Если owning facet source уже `STALE`, пометить value как `STALE`.
4. Сгруппировать оставшиеся values по `facetType`.
5. Для каждой группы вызвать `getFacetValueCandidatesByHandles`.
6. Собрать existing keys из возвращенных rows `(sourceHandle, handle)`.
7. Пометить каждый source value:
   - found: `VALID`
   - missing: `STALE`
8. Сохранить state bulk-обновлением там, где это возможно.

## Trigger points

### Listing facet mutations

Запускать sync после того, как Listing изменил собственные references:

- `FacetCreateScript`
  - после insert sources
  - после insert source values из выбранных candidates

- `FacetUpdateScript`
  - после `replaceSources`
  - затем resync source values внутри facet

- `FacetValueCreateScript`
  - после создания `kind = 'source'`

Для чистых изменений display value sync не нужен.

### Maintenance sync

Добавить manual или scheduled sync entrypoint, которым владеет Listing.

Это необходимо, потому что candidate actions не уведомляют Listing об изменении
Catalog data. Maintenance sync должен поддерживать:

- один store
- один facet
- retry только stale references
- ограниченный batch size

## Storefront и consistency resolution

Проверить все Listing resolution paths, чтобы stale source values не
резолвились.

Известная цель:

- `FacetRepository.resolveFacetFilterValues` должен игнорировать stale source
  values и stale child values при resolution filters.

Storefront SQL уже фильтрует `reference_status = 'VALID'` в нескольких путях, но
реализация sync должна проверить, что все listing/facet resolution paths ведут
себя консистентно.

## Предлагаемые индексы

Существующих индексов может хватить для первой реализации. Добавлять индексы
только если они понадобятся batch sync:

```sql
CREATE INDEX ... ON listing.facet_source
  (store_id, reference_status, reference_checked_at);

CREATE INDEX ... ON listing.facet_value
  (store_id, kind, reference_status, reference_checked_at)
  WHERE kind = 'source';
```

## Поведение при ошибках

Если candidate lookup падает из-за временной недоступности Catalog:

- не помечать references как `STALE`
- вернуть/retry как transient failure
- оставить предыдущий status без изменений

Помечать `STALE` только когда Catalog lookup успешно выполнился и reference
отсутствует.

## План проверки

Не запускать `test` или `tsc`.

Когда реализация готова и нужна проверка новой версии кода, запускать только
build.

Ручные сценарии:

1. Создать facet source из существующего candidate.
2. Запустить sync и проверить, что source стал `VALID`.
3. Создать source value из существующего candidate.
4. Запустить sync и проверить, что value стал `VALID`.
5. Сымитировать отсутствие source candidate.
6. Запустить sync и проверить, что source и зависимые source values стали `STALE`.
7. Восстановить candidate.
8. Запустить sync и проверить, что state вернулся в `VALID`.
9. Проверить, что storefront/listing resolution не возвращает stale source values.

## Рекомендация

Для первой реализации использовать существующие candidate actions. Их достаточно
для reference validation, и они позволяют не менять event contracts.

Главные caveats:

- использовать default locale для reference checks
- добавить Listing-owned trigger/job, потому что candidate actions не являются notifications
- не считать transient candidate lookup failures stale references
