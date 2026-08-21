# Reviews Service Readiness Audit

**Дата аудита:** 2026-08-20  
**Область:** `services/reviews`, актуальные Reviews Admin API и Storefront API сценарии в
`e2e/tests/reviews-*`  
**Целевой критерий:** всё заявленное API и вся заявленная бизнес-логика завершены и подтверждены
исполняемыми тестами

## Резюме

Текущая готовность Reviews Service оценивается в **35–40% от заявленного функционального
контракта**.

Сервис уже не является техническим skeleton: присутствуют полная доменная SQL-схема, Drizzle-модели,
tenant-scoped repositories, Relay pagination, DataLoader, Admin и Storefront GraphQL schemas,
resolver слой, scripts и DBOS workflows. Большинство заявленных root GraphQL fields имеют реализацию
и подключены к серверу.

Однако критерий полной готовности не выполнен. Основные блокеры:

1. активные e2e-сценарии являются пустыми спецификациями без API-вызовов и assertions;
2. Storefront visibility не учитывает `content_publication`, channel, locale и расписание;
3. Admin aggregate updates не атомарны и могут оставлять частично применённое состояние;
4. заявленный customer flow для `review_request` отсутствует в Storefront mutation contract;
5. межсервисные ссылки и Media-политики не проходят требуемую проверку владельцем данных;
6. domain events, уведомления и фоновые lifecycle-процессы реализованы фрагментарно;
7. RBAC не разделяет Reviews read/configure/moderate/integrate capabilities;
8. revision snapshots не позволяют восстановить весь typed aggregate.

**Вывод:** сервис не готов к функциональной приёмке, интеграционной эксплуатации или объявлению API
завершённым. Следующий milestone должен быть не расширением SDL, а замыканием существующего
контракта исполняемыми тестами и исправлением P0-инвариантов.

## Методика и ограничения

Аудит выполнен статически по цепочкам:

```text
GraphQL SDL
  -> root/type resolver
  -> workflow или script
  -> repository
  -> Drizzle model
  -> SQL migration/constraint
  -> активная e2e-спецификация
```

Источники заявленного поведения:

- `services/reviews/README.md`;
- `services/reviews/docs/admin-graphql-schema.md`;
- Admin SDL: `services/reviews/src/api/graphql-admin/schema/`;
- Storefront SDL: `services/reviews/src/api/graphql-storefront/schema/`;
- активные сценарии `e2e/tests/reviews-admin-api/`;
- активные сценарии `e2e/tests/reviews-storefront-api/`.

Архивные тесты в `e2e/archive/` использовались только как исторический контекст и не считались
актуальным доказательством контракта.

В соответствии с корневыми инструкциями проекта во время аудита не запускались tests, `tsc`, dev
server или browser. Build не запускался, поскольку новая версия кода не создавалась. Поэтому отчёт
не подтверждает runtime-композицию supergraph или фактическое прохождение запросов.

## Сводная оценка

| Область                                      | Оценка | Состояние                                                                            |
| -------------------------------------------- | -----: | ------------------------------------------------------------------------------------ |
| SQL migrations и физическая модель           |    80% | Основные агрегаты, индексы и constraints присутствуют                                |
| Drizzle models и repositories                |    75% | Существенное покрытие CRUD, Relay и tenant scope                                     |
| GraphQL SDL и resolver wiring                |    70% | Root surface в основном подключён, но часть публичного контракта лишняя или неполная |
| Базовые create/read/update/delete paths      |    60% | Реализованы основные happy paths                                                     |
| Бизнес-инварианты                            |    30% | Важные cross-service и aggregate-инварианты отсутствуют                              |
| Publication и localization                   |    20% | Данные сохраняются, но не управляют Storefront visibility                            |
| Review request customer flow                 |    15% | Admin CRUD есть, customer consumption flow отсутствует                               |
| Events, notifications и background lifecycle |    20% | Только часть create/delete events; processors отсутствуют                            |
| Authorization и capability separation        |    25% | Tenant context есть, granular Reviews RBAC отсутствует                               |
| Acceptance/e2e verification                  |     0% | 182 пустых тестовых сценария, 0 assertions                                           |

## Реализованный фундамент

### Доменная модель

Сервис моделирует основные заявленные области:

- store configuration;
- rating criteria, translations и assignments;
- общий `content_item` для reviews, replies, questions и answers;
- content translations и publications;
- review ratings и media;
- review requests и request events;
- votes, reports и content metrics;
- moderation cases, events, revisions и signals;
- external references;
- product review/question summary read models.

Миграции организованы по доменам, а cross-service UUID намеренно не имеют SQL foreign keys. Это
соответствует описанной service-boundary архитектуре.

### Repository слой

Положительные свойства repository слоя:

- `store_id` добавляется из service context;
- основные reads и mutations tenant-scoped;
- soft-delete учитывается в большинстве list/read paths;
- Relay query builders используют limits и deterministic tie-breaker;
- ID filters проходят через global-ID mappers;
- mutations возвращают `applied` или `not_found`;
- summary rebuild использует transaction-level advisory locks;
- vote upsert и report uniqueness опираются на repository/database guarantees.

### GraphQL surface

Структурно подключены:

- Admin query namespace `reviewsQuery`;
- Admin mutation namespace `reviewsMutation`;
- Admin product widget namespace;
- Storefront direct content reads;
- Storefront review/question/answer CRUD;
- Storefront vote, report и subscription mutations;
- Product, ProductVariant и Customer federation extensions;
- summaries, criteria, nested replies/answers и viewer state.

Наличие root resolver метода означает только structural coverage. Оно не означает завершённость
business policy, authorization, publication rules или side effects.

## P0: блокеры полной готовности

### P0-1. Активные e2e-тесты не исполняют контракт

В активном наборе находятся:

| API        | Spec-файлов | `test(...)` | Assertions | API-вызовов |
| ---------- | ----------: | ----------: | ---------: | ----------: |
| Admin      |          13 |          88 |          0 |           0 |
| Storefront |          14 |          94 |          0 |           0 |
| **Итого**  |      **27** |     **182** |      **0** |       **0** |

Каждый тест содержит только комментарий с ожидаемым поведением. Например:

- `e2e/tests/reviews-admin-api/review-lifecycle.spec.ts`;
- `e2e/tests/reviews-admin-api/events-concurrency-idempotency.spec.ts`;
- `e2e/tests/reviews-storefront-api/review-submission.spec.ts`;
- `e2e/tests/reviews-storefront-api/moderation-publication-localization.spec.ts`.

Последствия:

- schema composition фактически не проверена;
- happy paths и failure paths не проверены;
- tenant isolation не доказан;
- concurrent mutation serialization не доказана;
- atomicity и idempotency не доказаны;
- projection consistency не доказана;
- federation visibility не доказана.

**Критерий завершения:** каждый заявленный сценарий должен содержать реальные fixtures, GraphQL
операции, assertions состояния API и, где требуется, проверку side effects.

### P0-2. Storefront visibility игнорирует publication aggregate

Документированная модель разделяет:

- moderation eligibility в `content_item.status`;
- channel/locale delivery в `content_publication`.

Фактическая Storefront visibility в `src/resolvers/storefront/ContentResolver.ts:isContentVisible()`
проверяет только:

- `deletedAt`;
- `redactedAt`;
- `content.status`;
- ownership для unpublished author content.

Storefront connections аналогично фильтруют только `status = PUBLISHED` и `redactedAt IS NULL`. Не
проверяются:

- наличие опубликованной publication для текущего storefront channel;
- publication locale;
- `scheduledAt` boundary;
- `publishedAt`/`unpublishedAt` publication state;
- market/channel scope;
- видимость parent aggregate при nested reply/answer reads.

Следствие: контент может быть доступен на Storefront, даже если он DRAFT, SCHEDULED или UNPUBLISHED
для требуемого канала. Обратная проблема также возможна: publication может быть PUBLISHED, но
Storefront её не использует.

Отдельного worker/process для активации scheduled publications в `services/reviews/src` не найдено.

**Критерий завершения:** единая policy-функция Storefront visibility должна учитывать content,
publication, channel, locale, schedule, parent visibility и owner preview semantics. Все прямые,
connection, nested и federation paths должны использовать одну политику.

### P0-3. Aggregate update не является атомарным

`ReviewUpdateWorkflow.run()` последовательно запускает каждую operation отдельным workflow
step/script, сохраняет успехи и ошибки каждой операции независимо и не откатывает ранее применённые
операции, если следующая операция завершилась ошибкой.

Это противоречит заявленным требованиям:

- update агрегата атомарен;
- validation failure не создаёт mutation/revision/event;
- semantic no-op не создаёт revision/event.

Практические дефекты:

- частичное сохранение aggregate при mixed success/failure;
- failed nested operation может сосуществовать с применёнными sibling operations;
- summary refresh видит частичное состояние.

Аналогичный риск существует в `ProductQuestionUpdateWorkflow` и section-based criterion updates.

**Критерий завершения:** preflight validation всех операций, одна database transaction для aggregate
mutation, один revision increment только при effective change, rollback всего агрегата при любой
ошибке и event/outbox после commit.

### P0-4. Storefront review-request flow отсутствует

Storefront `ReviewCreateInput` принимает product, variant, order и order line, но не принимает:

- `reviewRequestId`;
- одноразовый customer-facing request token;
- иной идентификатор потребления request.

Следовательно, API не может реализовать заявленные сценарии:

- открыть request и записать monotonic `OPENED` event;
- проверить owner/store/order/product binding request;
- отклонить expired/cancelled/completed/consumed request;
- завершить request созданным review ровно один раз;
- связать request с `review_id`;
- применить и раскрыть incentive из request/campaign;
- обеспечить idempotent replay всего customer flow.

Storefront query проверяет только совпадение `customerId`. Status, expiry и revocation не участвуют
в visibility. Resolver также возвращает expired/terminal request владельцу.

**Критерий завершения:** определить customer-facing request credential contract, добавить atomic
consume workflow и реализовать monotonic request events, verification и incentive binding.

### P0-5. Cross-service reference validation не завершена

Документация требует проверять существование и tenant consistency ссылок через contracts владельцев:

- Catalog: product, variant, category;
- Customers: author, voter, reporter, subscriber, request customer;
- Orders: order, order line и purchase eligibility;
- Media: file ownership и file policy;
- IAM: principal references.

Фактически Admin review create/update проверяет в основном global-ID type и локальные constraints.
`ReviewCreateScript` проверяет диапазон rating, duplicate criterion IDs и локальное существование
criterion, но не проверяет:

- что criterion применим к product/category;
- что обязательные criteria представлены;
- что product существует и принадлежит текущему store;
- что variant принадлежит product;
- что order/order line согласованы с customer/product;
- что Media file существует в текущем store;
- что MIME type и size разрешены конфигурацией;
- что Media file допустим для Storefront attachment.

Storefront использует Orders contract только при переданных order/orderLine evidence и Catalog query
для расчёта applicable criteria. Это не закрывает Admin imports/updates и остальные cross-service
references.

**Критерий завершения:** централизованные reference validators с batch/broker calls, fail-closed
tenant semantics и одинаковыми правилами для create/update/nested operations.

## P1: обязательные функциональные пробелы

### P1-1. Domain events и outbox contract неполны

`events.emit` найден для части create/delete workflows:

- review create/delete;
- product question create/delete;
- rating criterion create/delete;
- review request create;
- moderation case create;
- external reference create/delete.

Не найдено эквивалентного emit path для большинства updates и Storefront mutations:

- store configuration update;
- review/question aggregate update;
- answer/reply create/update/delete внутри aggregate;
- content moderation/publication/translation changes;
- content redact/restore;
- review request lifecycle update;
- vote set/remove;
- report create/update;
- subscription set/update;
- moderation case update;
- external reference update.

Также не обнаружены consumers/processors для:

- scheduled publication/unpublication;
- request dispatch, retry и expiry;
- answer/subscription notifications;
- report-to-signal/case automation;
- ordered monotonic projection replay;
- provider synchronization retries.

**Критерий завершения:** mutation event matrix, transactional outbox или эквивалентная надёжная
схема, idempotent consumers и e2e-проверки commit/no-op/failure semantics.

### P1-2. Storefront localization не выбирает presentation locale

`ContentResolver.title()`, `body()` и `locale()` возвращают поля исходного `content_item`.
Опубликованные translations доступны отдельным списком, но отсутствует выбор presentation по:

- request locale;
- store default locale;
- deterministic fallback chain;
- publication locale;
- translation moderation/publication completeness.

Поэтому заявленный сценарий «selects the requested content translation with deterministic locale
fallback» не реализован.

Rating criterion resolver требует отдельной проверки на ту же проблему: title/description должны
выбираться согласованно с текущим locale и assignment precedence.

### P1-3. Authorization capabilities слишком грубые

Заявленные Admin сценарии требуют раздельных capabilities:

- Reviews read;
- configuration management;
- content management;
- moderation;
- integration/external synchronization.

Фактические workflow policies используют в основном общие:

- `resource: store.data`, `action: write`;
- `resource: store.data`, `action: admin`.

Admin Query resolver не содержит operation-level `@Policy`. Аутентификация и store context сами по
себе не доказывают granular read permission.

Особенно заметно, что external reference mutations используют общий `write`, а moderation/report
mutations — общий `admin`. Это не обеспечивает отдельные integration/moderation roles.

**Критерий завершения:** согласовать Reviews permission vocabulary с IAM/Casbin и применить policy к
root namespaces/operations и protected federation reads.

### P1-4. Revision snapshot неполон

README требует, чтобы snapshot содержал root и typed-extension поля, необходимые для воспроизведения
версии.

`contentSnapshot()` сохраняет только поля `content_item`. Не сохраняются:

- review subject, overall rating и verification;
- incentive state;
- detailed ratings;
- media;
- replies/answers и их ordering;
- question subject;
- translations;
- publications.

`ContentRevisionRestoreScript` восстанавливает только content patch. Поэтому операция не может
восстановить состояние aggregate, которое пользователь видел в прошлом.

Дополнительный privacy-риск: восстановление старого snapshot может вернуть ранее redacted author
PII, если policy явно не запрещает такой restore. Заявленный тест требует не восстанавливать
redacted/prohibited данные, но исполняемой проверки нет.

### P1-5. Summary и metrics не используют полную public eligibility

Summary rebuild фильтрует `content_item.status = PUBLISHED` и `deletedAt IS NULL`, но не учитывает:

- `redactedAt`;
- publication channel/locale/schedule;
- market scope;
- active parent visibility для nested content.

Из-за этого Storefront list и summary могут показывать разные снимки публичного состояния.

Metrics обновляются синхронно в части Storefront mutations и в некоторых nested operations, но нет
единой гарантии обновления после каждой moderation/publication/delete/restore transition.

### P1-6. Storefront edit policy неполна

`requireEditable()` проверяет:

- content kind;
- customer ownership;
- edit-window deadline.

Не проверяются terminal moderation states, redaction, publication policy или иной запрет
редактирования после lifecycle transition. Repository read скрывает soft-deleted rows, но остальные
policy facts должны быть явными.

Update/delete mutations также не имеют собственного idempotency key, поэтому активная спецификация
idempotent replay без duplicate events не подтверждена.

### P1-7. Question/answer ordering и notification policy неполны

Storefront answers сортируются по created time или helpful count. Accepted/official priority,
заявленный public policy и `sortIndex` не участвуют в default ordering.

Subscription rows создаются и обновляются, но отсутствует delivery processor. Нет доказательства:

- one notification per published answer;
- отправки только active channels;
- suppression для paused/unsubscribed subscriptions;
- обновления `lastNotifiedAt` после commit;
- идемпотентности notification retries.

### P1-8. Storefront schema шире заявленного безопасного контракта

Storefront server явно подключает:

- `integration/external-reference.graphql`;
- `moderation/moderation.graphql`.

Через federation доступны customer-owned moderation cases, events, revisions, signals и external
references. External reference type включает provider metadata. Даже при ownership guard это
противоречит заявленному сценарию, что Storefront не раскрывает Admin moderation/integration data.

Нужно принять одно из решений:

1. удалить эти типы из Storefront SDL и federation resolver registry; или
2. формально признать их частью customer API, определить privacy-safe поля и покрыть security tests.

## P2: качество контракта и документации

### P2-1. README противоречит текущему состоянию

Последняя строка `services/reviews/README.md` утверждает, что GraphQL operations и Drizzle models —
последующая задача, хотя они уже существуют. Это делает README ненадёжным источником readiness.

Документацию следует разделить на:

- implemented architecture;
- target behavior;
- explicitly deferred functionality;
- generated/API references.

### P2-2. Semantic no-op behavior неоднородно

Некоторые entity updates могут обновлять `updatedAt` даже при patch без effective changes.
Требование «no revision/event for semantic no-op» должно быть единым для всех mutations.

### P2-3. Error contract неоднороден

Storefront `decodeContentId()` бросает runtime error для malformed ID вместо стабильного
`ReviewUserError`.

Нужна единая taxonomy:

- invalid ID/type;
- not found/inaccessible;
- concurrent write failure;
- policy violation;
- retryable integration failure;
- internal error.

### P2-4. Federation reference validation требует отдельной проверки

Некоторые `__resolveReference` paths загружают Reviews-owned entities непосредственно после decode.
Необходимо проверить, что каждый resolver применяет те же правила tenant, soft-delete, visibility и
ownership, что и root query. Это особенно важно для Admin nodes и Storefront moderation/integration
entities.

## Матрица Admin API

Легенда:

- **Structural** — field существует и resolver подключён;
- **Partial** — happy path реализован, но заявленные инварианты/side effects неполны;
- **Blocked** — ключевая часть contract отсутствует;
- **Unverified** — нет исполняемого e2e-доказательства.

| Область                        | Structural | Business completeness | Основные пробелы                                       |
| ------------------------------ | ---------- | --------------------- | ------------------------------------------------------ |
| Node/nodes                     | Да         | Partial, unverified   | granular auth и federation parity                      |
| Store configuration            | Да         | Partial, unverified   | no-op/event semantics, capability separation           |
| Rating criteria CRUD           | Да         | Partial, unverified   | cross-service assignments, dependency policy           |
| Reviews CRUD                   | Да         | Partial, unverified   | non-atomic update, criteria/media/reference validation |
| Replies через reviewUpdate     | Да         | Partial, unverified   | aggregate rollback, events, revision snapshots         |
| Product questions CRUD         | Да         | Partial, unverified   | non-atomic update, Catalog validation                  |
| Answers через questionUpdate   | Да         | Partial, unverified   | ordering, notification, aggregate rollback             |
| Question subscriptions         | Да         | Partial, unverified   | delivery side effects и capability separation          |
| Content redaction/restore      | Да         | Partial, unverified   | incomplete snapshots, privacy restore policy           |
| Review requests                | Да         | Partial, unverified   | eligibility, dispatch/expiry, customer consumption     |
| Reports                        | Да         | Partial, unverified   | event/signal/case automation                           |
| Moderation cases               | Да         | Partial, unverified   | complete action semantics, events, projections         |
| External references            | Да         | Partial, unverified   | provider validation, sync processors, safe metadata    |
| Relay filters/order/pagination | Да         | Partial, unverified   | runtime and cursor stability not tested                |
| Summaries/widgets              | Да         | Partial, unverified   | full public eligibility and rebuild consistency        |

## Матрица Storefront API

| Область                       | Structural | Business completeness | Основные пробелы                                          |
| ----------------------------- | ---------- | --------------------- | --------------------------------------------------------- |
| Store configuration           | Да         | Partial, unverified   | inactive/unknown context behavior                         |
| Review read/list              | Да         | Blocked               | publication/channel/locale visibility                     |
| Review create                 | Да         | Partial               | subject/media eligibility, request/incentive flow, events |
| Review update/delete          | Да         | Partial               | terminal policy, replay idempotency, events               |
| Question read/list            | Да         | Blocked               | publication/localization/parent visibility                |
| Question create/update/delete | Да         | Partial               | Catalog eligibility, events, policy completeness          |
| Answer create/update/delete   | Да         | Partial               | ordering, notification, events                            |
| Subscription set              | Да         | Partial               | lifecycle semantics и delivery processor                  |
| Votes                         | Да         | Partial               | event contract, concurrency proof                         |
| Reports                       | Да         | Partial               | signals/events and second-report lifecycle proof          |
| Viewer engagement             | Да         | Partial               | request-local cache isolation unverified                  |
| Viewer capabilities           | Да         | Partial               | only update/delete window represented                     |
| Review request customer flow  | Частично   | Blocked               | no request consumption mutation contract                  |
| Summaries                     | Да         | Blocked               | publication/redaction scope mismatch                      |
| Federation                    | Да         | Partial               | visibility parity и excess public entity types            |

## План доведения до полной готовности

### Этап 1. Сделать спецификацию исполняемой

1. Создать GraphQL documents для всех Reviews Admin и Storefront operations.
2. Реализовать текущие 182 test bodies, начиная с P0 flows.
3. Добавить database/event-side assertions там, где одного GraphQL response недостаточно.
4. Выполнять тесты по одному spec-файлу в соответствии с `e2e/AGENTS.md`.
5. Зафиксировать ожидаемые error codes и field paths как часть контракта.

Выходной критерий: ни одного comment-only test в активных Reviews каталогах.

### Этап 2. Исправить aggregate transaction model

1. Отделить preflight parsing/validation от mutation.
2. Собрать aggregate command без записи в БД.
3. Выполнить все effective operations в одной transaction.
4. Записывать audit revision один раз после успешного effective change.
5. Не менять revision/updatedAt и не создавать event для semantic no-op.
6. Записывать complete revision snapshot.
7. Публиковать event/outbox только после commit.

Выходной критерий: stale/mixed failure/concurrent/no-op e2e проходят для review, question и
criterion aggregates.

### Этап 3. Ввести единую public eligibility policy

1. Определить текущие channel, locale и market из trusted Storefront context.
2. Объединить content moderation и content publication state.
3. Реализовать schedule boundary semantics.
4. Реализовать translation selection/fallback.
5. Применить policy к direct reads, lists, nested content, summaries и federation.
6. Добавить parent visibility checks для replies/answers и engagement.

Выходной критерий: один public snapshot согласован во всех Storefront paths.

### Этап 4. Завершить cross-service validation

1. Catalog validator: product, variant, category и relationship checks.
2. Media validator: store ownership, file state, MIME type, size и attachment eligibility.
3. Orders validator: customer/order/order-line/product binding и lifecycle eligibility.
4. Customers/IAM validators для Admin imports и ownership references.
5. Batch validation и fail-closed behavior при unavailable dependency.

Выходной критерий: ни одна foreign/cross-store/invalid external reference не сохраняется.

### Этап 5. Завершить review-request lifecycle

1. Определить безопасный Storefront credential/token contract.
2. Реализовать open/consume/complete workflow.
3. Проверять expiry, terminal states и single consumption.
4. Связать verification и incentive с immutable request evidence.
5. Реализовать dispatch/retry/expiry processors и provider events.
6. Удалить provider secrets из public schema.

Выходной критерий: весь `review-request-customer-flow.spec.ts` исполняется и проходит.

### Этап 6. Events, projections и notifications

1. Создать mutation-to-event matrix.
2. Ввести гарантированную post-commit доставку.
3. Реализовать idempotent monotonic handlers.
4. Обновлять summaries/metrics/publication/search projections идемпотентно.
5. Реализовать answer/subscription notifications.
6. Проверить recovery после сбоев зависимостей без повторной domain mutation.

### Этап 7. RBAC и public contract hardening

1. Определить Reviews-specific permissions.
2. Применить granular policies к queries, mutations и federation.
3. Удалить из Storefront SDL Admin-only types либо формализовать безопасный customer contract.
4. Проверить non-disclosure для inaccessible IDs и connection counts.
5. Проверить отсутствие PII/secrets в events, errors, metadata и GraphQL output.

## Definition of Done

Reviews Service можно считать полностью готовым только при одновременном выполнении всех условий:

- каждый Admin и Storefront SDL field имеет используемый resolver path;
- все заявленные business invariants реализованы до записи;
- aggregate mutations атомарны;
- concurrent mutations сериализуются backend workflow;
- semantic no-op не меняет состояние;
- tenant и cross-service ownership проверяются fail-closed;
- Storefront visibility учитывает moderation, publication, channel, locale, schedule и parent state;
- review request проходит полный безопасный customer lifecycle;
- domain events создаются ровно один раз после commit;
- projections и notifications восстанавливаются идемпотентно;
- Admin RBAC разделяет read/configure/content/moderate/integrate;
- Storefront schema не раскрывает Admin-only данные и secrets;
- revision snapshots восстанавливают полный допустимый aggregate без возврата redacted PII;
- все 182 заявленных активных e2e-сценария имеют реальные assertions и проходят;
- отсутствуют active comment-only tests;
- README и API documentation описывают фактически реализованный contract.

## Итог

Сервис имеет хороший фундамент хранения и значительный объём structural API implementation. Главный
риск — разрыв между богатым заявленным контрактом и фактически проверяемым поведением. До завершения
P0 и P1 задач нельзя считать законченной ни Storefront publication model, ни aggregate mutation
model, ни review-request flow, ни integration/event guarantees.

Рекомендуемый следующий deliverable: **исполняемый вертикальный срез review lifecycle** — Admin
configuration/criteria, Storefront submission, publication visibility, owner edit/delete,
moderation, summary и events — с атомарностью и полным e2e-покрытием. После него тем же шаблоном
закрыть questions, requests, engagement и external integrations.
