# Project Service Readiness Audit

**Дата аудита:** 2026-08-20  
**Объект:** `services/project`  
**Цель:** оценить готовность Project service при условии, что всё заявленное API и связанная
бизнес-логика должны быть завершены.  
**Итоговый статус:** **NOT READY**  
**Оценочная готовность:** **около 60%**

## 1. Резюме

Project service уже содержит содержательную реализацию Admin GraphQL API для lifecycle магазина,
профиля, локалей, региональных настроек, branding, контактов, RBAC, optimistic concurrency и
media-компенсаций. Эта часть значительно ближе к завершению, чем общий статус сервиса может
подразумевать.

Однако сервис нельзя считать feature-complete. Есть четыре блокирующие группы проблем:

1. контракт изменения canonical store currency противоречит тестам и пользовательскому интерфейсу;
2. Storefront Markets/Localization опубликованы как API, но не имеют owning write path и
   provisioning при создании store;
3. storefront E2E представлены двадцатью пустыми сценариями без запросов и assertions;
4. lifecycle магазина не замкнут: нет status transition, полного IAM cleanup и строгой обработки
   всех внешних side effects.

Главный практический результат: созданный стандартным `storeCreate` магазин не получает default
market и не может гарантированно обслужить `localization`. Магазин, созданный со статусом
`INACTIVE`, невозможно активировать через Project API. Валюта магазина после создания также не
изменяется через опубликованный update contract, хотя Admin UI и E2E ожидают обратное.

## 2. Методика и ограничения

Аудит выполнен как read-only статический анализ:

- изучены Admin и Storefront GraphQL schemas;
- проверено соответствие schema → generated types → resolvers → scripts/sagas → repositories →
  database models/migrations;
- просмотрены broker actions и их потребители;
- проверены E2E-сценарии Project Admin и Project Storefront;
- реализация сопоставлена с правилами multi-tenancy, resolver/repository patterns и currency
  handling из knowledge base;
- проверены явные `TODO`, заглушки, отсутствующие write paths и расхождения между API и тестовыми
  ожиданиями.

В соответствии с `AGENTS.md` не запускались:

- tests;
- TypeScript compiler;
- dev/start server;
- browser-проверки.

Build также не запускался, поскольку код не изменялся и новая версия сервиса для аудита не
требовалась. Поэтому выводы о runtime-поведении основаны на доступном коде и контрактах. Там, где
поведение внешней инфраструктуры нельзя доказать статически, оно отмечено как риск, а не как
подтверждённый дефект.

## 3. Заявленная зона ответственности

Корневое описание платформы определяет Project service как владельца:

- store/project settings;
- locales;
- currencies.

Фактическая реализация расширяет эту область:

- store creation, queries, update и soft deletion;
- organization/store RBAC integration;
- store profile, contact details и address;
- brand assets, colors, copy и social links;
- order processing defaults;
- measurement/timezone defaults;
- currency formatting;
- locale lifecycle;
- storefront public Store projection;
- storefront markets и localization;
- federation references на Organization, Membership, File/MediaImage, Store и Market;
- broker API для получения store и перечисления активных stores;
- lifecycle/configuration domain events.

Все перечисленные поверхности включены в данный аудит.

## 4. Инвентаризация API

### 4.1 Admin GraphQL queries

`StoreQuery` публикует:

| Operation                | Назначение                          | Статус                           |
| ------------------------ | ----------------------------------- | -------------------------------- |
| `stores(organizationId)` | Список доступных stores организации | Реализовано, есть RBAC filtering |
| `currentStore`           | Store из trusted Admin context      | Реализовано                      |

Источник: `src/api/graphql-admin/schema/base.graphql`.

### 4.2 Admin GraphQL mutations

`StoreMutation` публикует:

| Operation          | Назначение                              | Статус                                           |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| `storeCreate`      | Создание store и внешних ресурсов       | Частично завершено                               |
| `storeUpdate`      | Unified settings update                 | В основном реализовано, currency contract сломан |
| `storeDelete`      | Soft delete и cleanup                   | Частично завершено                               |
| `localeCreate`     | Добавление active/draft locale          | Реализовано                                      |
| `localeDelete`     | Удаление non-default locale             | Реализовано                                      |
| `localeSetDefault` | Смена default locale с активацией draft | Реализовано                                      |

### 4.3 Admin Store projection

Admin `Store` публикует:

- identity и organization reference;
- `name`, `displayName`, `status`;
- timezone, email;
- active locales, all language settings и default locale;
- canonical `currencyCode`;
- weight/dimension defaults;
- revision и timestamps;
- Membership federation reference;
- contact details;
- address;
- brand и File federation references;
- order processing;
- defaults;
- currency formatting.

Все опубликованные поля имеют resolver path или возвращаются как поля сформированного resolver
value. Основной пробел находится не в чтении, а в lifecycle отдельных значений.

### 4.4 Storefront GraphQL

Root `Query` публикует:

| Operation        | Назначение                                    | Статус                         |
| ---------------- | --------------------------------------------- | ------------------------------ |
| `store`          | Публичный Store из trusted storefront context | Реализован read path           |
| `market(handle)` | Active market по handle                       | Реализован только read path    |
| `localization`   | Localization default active market            | Реализован только default path |

Storefront types публикуют:

- Store public profile;
- brand/contact/address;
- Relay connection markets;
- Market countries, languages, currencies и defaults;
- Localization selected/available values;
- federation references Store, Market и MediaImage.

Read resolvers присутствуют, но supporting state нельзя создать или изменить через Project API.

### 4.5 Broker API

Project service регистрирует:

| Action                     | Назначение                      | Статус                     |
| -------------------------- | ------------------------------- | -------------------------- |
| `project.getCurrentStore`  | Store по slug                   | Реализовано                |
| `project.getStoreById`     | Store по raw UUID               | Реализовано                |
| `project.listActiveStores` | Bounded enumeration для Listing | Реализовано с caller check |

`project.getStoreById` используется Customers, Headless, Pricing, Checkout, Listing, Loyalty,
Notifications и Catalog. Это делает корректность canonical currency, lifecycle status и
configuration events системно значимой, а не локальной для Admin UI.

## 5. Оценка готовности по подсистемам

| Подсистема                  | Готовность | Обоснование                                                                                |
| --------------------------- | ---------: | ------------------------------------------------------------------------------------------ |
| Admin store queries/profile |        80% | Полная projection, trusted context, RBAC; остаются lifecycle-зависимости                   |
| Store creation              |        65% | Store/IAM/media/events есть, но нет default market и полного compensation closure          |
| Unified settings update     |        75% | Sections, revision, validation, idempotency, media compensation; currency contract неполон |
| Locale lifecycle            |        90% | Create/delete/default, draft activation, locking и tenant isolation реализованы            |
| Currency lifecycle          |        40% | Создание и formatting есть, canonical currency update отсутствует                          |
| Store status lifecycle      |        35% | Status читается и задаётся только при создании                                             |
| Store deletion              |        55% | Soft delete и events есть; IAM/media cleanup не гарантирован полностью                     |
| Storefront Store projection |        65% | Resolver path есть, реальная E2E-проверка отсутствует                                      |
| Markets                     |        25% | Read repository/resolvers есть; CRUD/configuration/provisioning отсутствуют                |
| Localization                |        30% | Default-market projection есть; hints, management и invariants не завершены                |
| Federation                  |        70% | Основные references присутствуют и storefront loaders tenant-scoped                        |
| Automated verification      |        55% | Admin scenarios многочисленны, storefront scenarios пусты; есть contract drift             |

Итоговая оценка около 60% является инженерной оценкой полноты, а не арифметическим средним строк
таблицы. При требовании «всё заявленное API и бизнес-логика завершены» итоговый gate остаётся
бинарным: **NOT READY**.

## 6. Блокирующие находки

### PRJ-RDY-001 — Canonical currency нельзя изменить через API

**Severity:** Blocker  
**Область:** Admin API, downstream services, Admin UI, events

`StoreCurrencySettings` возвращает `currencyCode`, но `StoreCurrencySettingsUpdateInput` содержит
только formatting options:

- `src/api/graphql-admin/schema/storeSettings.graphql:108-119`;
- `src/api/graphql-admin/schema/storeSettings.graphql:168-177`;
- `src/api/graphql-admin/generated/types.ts:341-363`.

`StoreMutationResolver.mapStoreUpdateInput()` не маппит currency code.
`StoreCurrencySettingsUpdateScript` обновляет только `store_currency_formatting`. На repository
level изменение намеренно отклоняется:

```ts
if (data.currencyCode !== undefined) {
  throw new Error("Store accounting currency is immutable");
}
```

Источник: `src/repositories/store/StoreRepository.ts:346-348`.

Одновременно тестовая спецификация ожидает:

- передачу `currencySettings.currencyCode`;
- смену USD → EUR;
- атомарное сохранение currency и formatting;
- compensation currency при неуспешном batch.

Источники:

- `e2e/tests/project-settings-admin-api/helpers.ts:155-165`;
- `e2e/tests/project-settings-admin-api/order-defaults-currency.spec.ts:151-160`;
- `e2e/tests/project-settings-admin-api/order-defaults-currency.spec.ts:221-231`;
- `e2e/tests/project-settings-admin-api/saga-observability.spec.ts:39-67`.

GraphQL input object с неизвестным `currencyCode` не соответствует схеме. Эти E2E-сценарии не могут
проверить заявленное поведение на текущем contract.

Admin UI также показывает currency selector, но mapper удаляет выбранный `currencyCode` и отправляет
только formatting:

- `admin/src/domains/system/general-settings/modals/store-currency-modal/store-currency-modal.tsx:132-159`;
- `admin/src/domains/system/general-settings/mappers/store-settings-input.mapper.ts:78-89`.

**Необходимое решение:** выбрать и зафиксировать единственную бизнес-модель.

Вариант A — currency mutable:

- добавить `currencyCode` в GraphQL input;
- валидировать код;
- обновлять `store.currencyCode` вместе с formatting;
- включить currency в snapshot/compensation;
- увеличивать configuration revision;
- гарантированно публиковать `storeConfigurationUpdated`;
- определить влияние на цены, checkouts, orders и loyalty state без backfill.

Вариант B — currency immutable:

- удалить currency selector из update UI;
- удалить несовместимые E2E-ожидания;
- явно документировать immutability в GraphQL contract;
- определить отдельный destructive/recreate workflow, если смена валюты бизнесу необходима.

Текущая смесь двух моделей недопустима.

### PRJ-RDY-002 — Markets не имеют owning write path

**Severity:** Blocker  
**Область:** Storefront, Admin API, data ownership

Storefront schema публикует полноценный `Market` и `MarketConnection`, но Project service не
содержит:

- Admin market queries;
- `marketCreate`;
- `marketUpdate`;
- `marketDelete`;
- смену status/default market;
- замену countries/locales/currencies;
- scripts/sagas для market lifecycle;
- repository write methods.

`src/repositories/market/MarketRepository.ts` содержит только read methods:

- `findActiveById`;
- `findActiveByHandle`;
- `findDefaultActive`;
- `findAllActive`;
- `getConnection`;
- `getSnapshot`;
- `getSnapshotsByIds`.

При этом storefront E2E-спецификация прямо заявляет обновление market configuration через Admin:

`e2e/tests/project-storefront-api/markets.spec.ts:19-20`.

**Воздействие:** опубликованный storefront API зависит от данных, для которых у owning service
отсутствует поддерживаемый lifecycle.

### PRJ-RDY-003 — Store creation не создаёт default market

**Severity:** Blocker  
**Область:** Store creation, storefront readiness

`StoreCreateSaga.run()` выполняет:

1. generation store ID;
2. создание store/locales;
3. создание IAM roles;
4. назначение admin role;
5. создание Media asset group;
6. публикацию store events.

Источник: `src/sagas/StoreCreateSaga.ts:74-95`.

Market, market country, market locale и market currency при этом не создаются. Миграции также не
содержат default market seeding для нового store.

`QueryResolver.localization()` требует active default market и иначе выбрасывает:

```text
STORE_CONFIGURATION_ERROR: The storefront has no active default market
```

Источник: `src/resolvers/storefront/QueryResolver.ts:19-29`.

**Воздействие:** успешный `storeCreate` не приводит систему в состояние, достаточное для выполнения
опубликованного non-null `localization: Localization!`.

**Необходимое решение:** либо атомарно создавать минимальный default market из store
locale/currency/timezone, либо включить обязательную market configuration фазу и не считать store
storefront-ready до её завершения.

### PRJ-RDY-004 — Storefront E2E являются пустыми заглушками

**Severity:** Blocker  
**Область:** verification

Обнаружено 20 объявленных storefront tests в четырёх файлах:

- `brand-contact-federation.spec.ts` — 5;
- `localization-resolution.spec.ts` — 5;
- `markets.spec.ts` — 5;
- `store-context.spec.ts` — 5.

Все callbacks синхронные, содержат только комментарии и не выполняют API requests или assertions.
Фактическое автоматизированное покрытие storefront Project API равно нулю.

Не проверяются:

- trusted storefront context;
- inactive/deleted store behavior;
- cross-store isolation;
- public/private field boundary;
- Media federation;
- market lookup;
- forward/backward Relay pagination;
- localization defaults и hints;
- default membership invariants;
- request-local cache isolation;
- atomic visibility Admin updates на Storefront.

### PRJ-RDY-005 — Отсутствует status transition

**Severity:** High  
**Область:** Store lifecycle

`StoreStatus` и поле `Store.status` опубликованы. `StoreCreateInput.status` позволяет создать
`INACTIVE` store. Однако:

- `StoreUpdateInput` не содержит status operation;
- `UpdateStoreData` не содержит `status`;
- отсутствуют activate/deactivate scripts или mutations.

Источники:

- `src/api/graphql-admin/schema/project.graphql:2-13`;
- `src/api/graphql-admin/schema/project.graphql:151-153`;
- `src/api/graphql-admin/schema/storeSettings.graphql:179-189`;
- `src/repositories/store/StoreRepository.ts:74-85`.

Storefront resolver скрывает inactive store, а `listActiveStores` также исключает его. Поэтому
store, созданный `INACTIVE`, нельзя перевести в рабочее состояние через Project API.

### PRJ-RDY-006 — Store delete не завершает внешний lifecycle

**Severity:** High  
**Область:** IAM, Media, events, consistency

Create saga создаёт store-scoped IAM roles и назначает creator роль `admin`. Delete saga не удаляет:

- store IAM domain/roles;
- assignments/membership.

Media deletion и `media.entityDeleted` обёрнуты в `try/catch`; исключения логируются и
проглатываются:

- `src/sagas/StoreDeleteSaga.ts:73-84`;
- `src/sagas/StoreDeleteSaga.ts:86-103`.

После этого saga продолжает выполнение и может вернуть успешный `deletedStoreId`. Это расходится с
сильной трактовкой lifecycle-теста «successful delete soft-deletes reads, media, and emits
storeDeleted».

Нужно явно выбрать семантику:

- strict cleanup — mutation завершается только после durable cleanup;
- accepted asynchronous cleanup — mutation возвращает отдельный lifecycle state, cleanup становится
  retryable workflow и наблюдаемым процессом;
- documented best effort — допустимо только если orphan resources являются осознанной политикой и
  существует reconciliation.

Сейчас policy не выражена в API и не доказана тестами отказов.

### PRJ-RDY-007 — Результаты event workflows не проверяются явно

**Severity:** High  
**Область:** observability, downstream consistency

При создании IAM workflow results явно проверяются через `result.success`. В то же время вызовы
`events.emit` в create, update и delete paths не проверяют возвращаемый result.

Источники:

- `src/sagas/StoreCreateSaga.ts:117-173` — IAM result checks;
- `src/sagas/StoreCreateSaga.ts:191-248` — event calls;
- `src/sagas/StoreUpdateSaga.ts:582-621`;
- `src/sagas/StoreDeleteSaga.ts:105-128`.

Если `runWorkflow` всегда бросает исключение при failed result, риск закрывается инфраструктурным
контрактом. Если он может вернуть `{ success: false }`, store lifecycle способен завершиться без
обязательного event. Это необходимо подтвердить и закрепить тестом failure path.

### PRJ-RDY-008 — Market invariants не защищены

**Severity:** High  
**Область:** data integrity, multi-tenancy

Модель комментирует, что currency и locale membership валидируются application layer, но write layer
отсутствует. Database constraints не гарантируют:

- наличие хотя бы одной country;
- наличие primary country;
- наличие default locale в `market_locale`;
- наличие default currency в `market_currency`;
- совпадение `market_country.store_id`, `market_locale.store_id` и `market_currency.store_id` с
  owner store соответствующего market;
- наличие default active market у storefront-ready store.

Источник: `src/repositories/models/market.ts`.

Storefront resolvers частично маскируют неконсистентные данные через tenant filters, но это не
заменяет write-time invariants.

## 7. Дополнительные замечания

### 7.1 Нулевая unit/integration test база внутри service package

В `services/project` отсутствуют `*.spec.ts` и `*.test.ts`. Всё автоматизированное покрытие вынесено
в E2E. Для sagas, validation mapping, currency/status rules и repository invariants это повышает
стоимость диагностики и оставляет некоторые failure branches недоказанными.

### 7.2 Admin E2E объёмны, но не равны доказанной готовности

В `e2e/tests/project-settings-admin-api` объявлено 133 test cases. Они хорошо описывают ожидаемое
поведение:

- RBAC и tenant isolation;
- global ID validation;
- settings validation;
- concurrency/revision;
- idempotency;
- compensation;
- safe errors;
- lifecycle events.

Однако currency fixture содержит поле, отсутствующее в schema. Поэтому количество сценариев нельзя
интерпретировать как подтверждение passing state без устранения contract drift и фактического
выполнения через разрешённый project workflow.

### 7.3 Locale ordering явно не закреплён

`LocaleRepository.findByStoreId()` не задаёт `orderBy`. Если API требует полностью deterministic
ordering для `languageSettings`, порядок необходимо определить контрактом и реализовать в
repository. Сейчас большинство тестов используют membership assertions, поэтому проблема не является
blocker, но может проявиться в UI или snapshot tests.

### 7.4 Database singleton lifecycle

`src/infrastructure/db/database.ts` кэширует Drizzle instance в module-level переменной, а
`Kernel.close()` её не очищает. Для обычного single-start процесса это допустимо. Для in-process
restart или подключения нового database client возможно повторное использование старого instance.
Требуется либо документировать запрет restart, либо добавить controlled reset lifecycle.

## 8. Что реализовано качественно

### 8.1 Tenant isolation и authorization

- Admin context строится из verified gateway claims.
- `stores` различает organization-wide и selected-store access.
- Store resolver использует `TypePolicy`.
- Locale writes требуют `store.profile:write`.
- Store update policy строится из persisted target store organization, а не client selector.
- Storefront loaders принимают verified `storefrontStoreId` и возвращают только scoped Store/Market.
- Market repository read methods всегда включают `storeId`, active status и `deletedAt IS NULL`.

### 8.2 Global IDs и federation

- Store, Organization, File и Market IDs кодируются/декодируются через shared GUID package.
- Brand media input проверяет entity type `File`.
- Storefront federation reference loaders остаются в trusted store scope.
- Admin Store возвращает Organization и Membership references с ожидаемыми ключами.

### 8.3 Locale lifecycle

- минимум одна initial locale проверяется при store creation;
- duplicate locales отклоняются;
- default locale нельзя удалить;
- установка draft locale default автоматически активирует её;
- set-default и delete сериализуются через lock store row;
- parallel duplicate create использует unique constraint и `onConflictDoNothing`;
- locale reads разделяют active locales и all language settings.

### 8.4 Unified settings update

- client mutation ID нормализуется и ограничивается;
- expected revision валидируется;
- revision приобретается атомарно;
- операции исполняются в deterministic schema order;
- Zod validation выдаёт nested field paths;
- unrequested sections сохраняются;
- snapshot включает все текущие settings sections;
- brand media link/unlink имеет compensation hooks;
- mutation возвращает свежую Store projection.

### 8.5 Database validation

Есть полезные constraints для:

- store slug format и uniqueness;
- non-blank profile fields;
- E.164 phones и ordering position;
- brand colors;
- social platform/url format;
- currency fraction digit bounds/order;
- market handle и country code formats;
- single default market index.

## 9. План завершения

### Этап 1 — Закрыть решения по контрактам

1. Зафиксировать mutable или immutable canonical store currency.
2. Зафиксировать lifecycle store status.
3. Зафиксировать strict или asynchronous semantics внешнего cleanup.
4. Определить storefront-ready state и обязанность иметь default market.
5. Определить источник localization hints: GraphQL args, trusted gateway context или storefront
   access context.

### Этап 2 — Завершить currency и status

1. Синхронизировать GraphQL schema, generated types, resolver mapper, DTO, script, repository, saga
   snapshot и Admin mapper.
2. Добавить configuration revision/event semantics для допустимых currency/timezone изменений.
3. Добавить status transition operation с RBAC, optimistic concurrency и event.
4. Определить разрешённые переходы `ACTIVE ↔ INACTIVE`.
5. Проверить, что status transition немедленно отражается в Storefront и `listActiveStores`.

### Этап 3 — Реализовать Market bounded context

1. Добавить Admin Market query/connection.
2. Добавить create/update/delete/status/default mutations.
3. Реализовать repository writes и transaction scripts/sagas.
4. Валидировать countries/locales/currencies и все default membership invariants.
5. Гарантировать tenant ownership дочерних records.
6. Создавать default market при store creation либо через обязательный provisioning workflow.
7. Определить configuration revision/event для market changes.

### Этап 4 — Замкнуть lifecycle dependencies

1. Добавить IAM deprovision/reconciliation при store delete.
2. Определить поведение при Media cleanup failure.
3. Проверять event workflow results или документировать throw-only contract.
4. Добавить failure-path coverage для create/delete/event/IAM/media combinations.
5. Исключить состояние, в котором mutation сообщает clean success при незавершённом обязательном
   side effect.

### Этап 5 — Завершить verification

1. Реализовать все 20 storefront E2E.
2. Исправить currency fixtures в соответствии с выбранным контрактом.
3. Добавить Market Admin E2E.
4. Добавить status lifecycle E2E.
5. Добавить tests на default market provisioning.
6. Добавить event failure и cleanup reconciliation scenarios.
7. Добавить проверки schema/generated/Admin consumer drift.

## 10. Definition of Done

Project service может считаться завершённым только когда выполнены все условия ниже.

### API completeness

- Каждое опубликованное GraphQL поле имеет рабочий resolver path.
- Каждое изменяемое domain value имеет owning mutation/workflow.
- Canonical currency contract един и совпадает в schema, service, Admin UI и tests.
- Store status имеет поддерживаемый lifecycle.
- Market state полностью управляется Project service.
- Новый storefront-ready store имеет валидный active default market.
- Localization всегда возвращает возможный tuple либо документированную безопасную ошибку.

### Business invariants

- Default locale всегда configured и active.
- Default market единственный, active и не deleted.
- Default market country/language/currency входят в available lists.
- Market child records принадлежат тому же store.
- Store revision увеличивается ровно один раз на accepted unified update.
- Failed atomic update не оставляет partial state.
- Currency/timezone/market changes публикуют корректный configuration event.
- Inactive/deleted stores недоступны Storefront и active-store enumeration.

### Lifecycle consistency

- Store create либо полностью provisioned, либо компенсирован без orphan IAM/Media state.
- Store delete имеет явно определённый и наблюдаемый cleanup outcome.
- Обязательные events не теряются бесшумно.
- Retry не дублирует store, roles, media groups, references или events.

### Security

- Admin operations используют verified claims и persisted ownership.
- Storefront operations используют только trusted context.
- Global IDs type-safe.
- Cross-store Market/Store/Media access отклоняется.
- Errors не раскрывают credentials, PII, SQL или stack traces.

### Verification

- Ни один Project E2E test не является пустой заглушкой.
- Admin currency tests соответствуют реальной schema.
- Storefront Store, Market, Localization и federation покрыты реальными requests/assertions.
- Failure, retry, concurrency и compensation paths покрыты.
- Generated GraphQL artifacts синхронизированы со schemas.
- Approved build завершается успешно через Shopana project workflow.

## 11. Итоговый release gate

На дату аудита Project service нельзя объявлять завершённым.

Минимальный набор blocker-условий перед повторной оценкой:

1. устранено противоречие canonical currency;
2. реализован полный Market write lifecycle;
3. новый store получает валидный default market либо явный non-ready lifecycle state;
4. реализован status transition;
5. определён и реализован полный IAM/Media/event cleanup contract;
6. все 20 storefront E2E заменены рабочими сценариями;
7. schema, generated types, Admin UI и E2E приведены к одному контракту.

После закрытия этих пунктов целевая повторная оценка должна отдельно проверить runtime-поведение
через разрешённый Shopana CLI workflow.
