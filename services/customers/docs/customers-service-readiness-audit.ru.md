# Аудит готовности Customers Service

Дата аудита: 2026-08-20  
Область: `services/customers`, связанные GraphQL-контракты, broker-контракты, миграции,
workflows/scripts, Customers E2E-контракты и архитектурная документация.  
Целевой критерий: всё заявленное API и соответствующая бизнес-логика реализованы, доступны в
активной федерации и подтверждены исполняемыми проверками.

## 1. Итоговая оценка

Текущая оценка готовности: **60 из 100**.

Customers является крупным работающим bounded context: production build проходит, Admin и
Storefront subgraphs экспортируются, общий supergraph компонуется, основные домены имеют schema,
resolver, workflow/script и repository слои. При этом сервис пока нельзя считать завершённым по
заданному критерию. Есть один прямой пробел в заявленном API — отсутствующий Admin Wishlist
контракт — и несколько существенных пробелов в доказательстве корректности runtime-бизнес-логики.

| Область | Оценка | Вывод |
| --- | ---: | --- |
| Production build и типизация | 100% | Успешно |
| Федеративная композиция | 100% | Успешно |
| GraphQL surface implementation | 80% | Admin Wishlist отсутствует |
| Основная доменная реализация | 75% | Большинство доменов реализовано |
| Подтверждённая runtime-корректность | 45% | Нет актуального полного green baseline |
| Broker/integration contracts | 50% | Значительная часть actions не имеет явного E2E-покрытия |
| DSL/materializer verification | 35% | Нормативная тестовая матрица реализована частично |
| Документация как актуальный контракт | 45% | Есть существенный drift планов и README |

Статус: **не готов к объявлению feature-complete**.

## 2. Методика и ограничения

Аудит выполнен read-only по production-коду и тестовым контрактам. Изменения в runtime-код,
миграции и changeset не вносились.

Проверено:

- корневой `AGENTS.md` и правила knowledge base;
- Customers README и документация схемы данных;
- Admin и Storefront GraphQL SDL;
- root resolvers, entity resolvers, resolver registries и loaders;
- workflows, scripts, repositories, handlers и broker actions;
- SQL migrations и Drizzle runtime models на уровне структуры проекта;
- заявленные implementation plans;
- Customers unit/E2E test inventory;
- последний зафиксированный Customers Admin API failure baseline;
- production build через `shopana-cli`;
- export и composition федеративных схем через `shopana-cli`.

По правилам проекта не запускались `test`, `tsc`, dev server и browser. Поэтому этот аудит не
утверждает, что существующие E2E tests проходят на текущем commit. Type checking выполнялся только
как встроенная часть разрешённого production build.

## 3. Подтверждённые технические проверки

### 3.1 Production build

Команда через `shopana-cli`:

```text
yarn shopana build -s customers
```

Результат:

- format check passed;
- lint passed;
- shared packages built;
- Customers type check passed;
- собран `dist/customers.module.js`;
- скопированы Admin/Storefront schema artifacts;
- скопированы 18 migration files.

Build доказывает синтаксическую и типовую согласованность текущей реализации, но не доказывает
исполнение доменных сценариев, корректность SQL на реальной PostgreSQL и поведение DBOS workflows.

### 3.2 Federation schema build

Команда через `shopana-cli`:

```text
yarn shopana schema build
```

Результат:

- экспортировано 27 subgraphs;
- `customers-admin` экспортирован из 20 schema files;
- `customers-storefront` экспортирован из 13 schema files;
- 0 export failures;
- Storefront supergraph composed;
- Admin supergraph composed.

Это подтверждает структурную совместимость опубликованных Customers SDL с остальной федерацией.
Композиция не проверяет наличие resolver реализации для каждого поля и не исполняет бизнес-логику.

## 4. Фактически реализованный API

### 4.1 Admin GraphQL

Реализованы root reads:

- Relay `node` и `nodes`;
- `customer`, `customerByEmail`, `customers`;
- direct reads адреса, налогового идентификатора, налогового освобождения и согласия;
- groups, tags и segments connections/direct reads;
- segment query validation, preview и attribute catalog;
- merges и data requests;
- customer account settings.

Реализованы root mutations:

- customer account settings update;
- customer create/update/delete;
- group create/update/delete;
- tag create/update/delete;
- segment create/update/delete;
- merge create/update/delete;
- data request create/update/delete.

`customerUpdate` агрегирует profile, addresses, consents, tax identifiers, tax exemptions, groups,
tags и manual segment memberships через единый expected revision contract.

### 4.2 Storefront GraphQL

Реализован viewer-owned `customer` read и self-service mutations:

- profile update;
- address create/update/delete/default set;
- marketing consent update;
- privacy data request create/cancel;
- tax identifier create/update/delete;
- wishlist create/update/delete;
- wishlist product add/remove;
- comparison variant add/remove;
- comparison category clear.

Customer Storefront type публикует owned addresses, tax data, privacy requests, wishlists и
federation entity identity. Customer ID берётся из trusted storefront context, а не из публичного
tenant/customer input.

### 4.3 Broker actions

Заявлены и зарегистрированы:

| Action | Назначение |
| --- | --- |
| `customers.resolveCheckoutBuyerEligibility` | Checkout lifecycle и segment eligibility snapshot |
| `customers.getCustomerComparisonSelection` | Catalog read persisted comparison selection |
| `customers.validateLoyaltySegmentReferences` | Loyalty reference validation |
| `customers.rebuildCustomerStatistics` | Operator rebuild statistics projection |
| `customers.rebuildCustomerDynamicSegments` | Operator dynamic segment rebuild/enqueue |
| `customers.lookupCustomerExternalReference` | Lookup integration reference |
| `customers.upsertCustomerExternalReference` | Upsert integration reference |
| `customers.deleteCustomerExternalReference` | Delete integration reference |
| `customers.syncCustomerExternalReferences` | Batch external reference synchronization |

### 4.4 Event-driven и durable сценарии

В сервисе присутствуют handlers/workflows для:

- IAM application-user provisioning и lifecycle synchronization;
- Store creation/configuration и storefront auth provisioning;
- order, checkout и refund statistics projections;
- customer create/update/delete;
- entity create/update/delete;
- merge processing;
- privacy request processing;
- comparison mutations;
- wishlist mutations;
- external reference synchronization;
- dynamic segment maintenance/materialization;
- temporal/customer event reevaluation.

## 5. Реализованные доменные области

### 5.1 Profiles и IAM boundary

Customers хранит business profile, account/lifecycle projection и связь с IAM principal. IAM
остаётся источником истины для credentials, sessions и application-user identity. Поддержаны guest,
invited и registered состояния, IAM block/unblock/delete projection и provisioning из IAM events.

### 5.2 Addresses

Есть reusable customer addresses, shipping/billing defaults, ownership checks, tenant-scoped
repositories и Storefront/Admin write paths. Database constraints ограничивают число активных
default shipping/billing addresses.

### 5.3 Tax

Разделены tax identifiers и tax exemptions. Поддержаны verification metadata, primary identifier,
validity periods и certificate Media references.

### 5.4 Marketing consent

Текущее состояние consent отделено от immutable consent events. Реализованы channel transitions,
contact projection, evidence и idempotency metadata.

### 5.5 Classification

Groups, tags и segments имеют отдельные aggregates, revisions и memberships/assignments. Dynamic
segments используют canonical DSL, server-generated definition, materialization generation/status,
Store context projection и fail-closed eligibility reads.

### 5.6 Preferences

Реализованы persisted product comparison selection и private named wishlists. Storefront wishlist
write paths проверяют Catalog product и viewer ownership.

### 5.7 Statistics

Order, checkout и refund projections являются revision-aware и используются для rebuildable
customer statistics и per-currency monetary statistics.

### 5.8 Lifecycle и privacy

Реализованы merge aggregate/process и privacy data requests. Delete, merge source и erasure paths
включают cleanup/tombstoning owned Customer data.

### 5.9 Integrations

External references поддерживают scoped lookup, idempotent upsert/delete, conflict policy и batch
sync через broker boundary.

## 6. Findings

### P0. Заявленный Admin Wishlist API отсутствует

Статус: **подтверждённый функциональный пробел**.

`docs/plans/customers-wishlist-implementation-plan.md` заявляет исполняемый read-only Admin API:

- `Customer.wishlists`;
- `Customer.defaultWishlist`;
- `CustomerWishlist` и `CustomerWishlistItem` как `Node`;
- `CustomersQuery.customerWishlist`;
- `CustomersQuery.customerWishlistItem`;
- регистрацию обоих типов в `node`/`nodes`;
- Relay connections, generated filters/order inputs и nullable Product federation reference.

В текущем Admin API:

- нет Admin wishlist schema file;
- wishlist schema не включена в Admin server schema registry;
- `Customer` не имеет `wishlists` и `defaultWishlist`;
- `CustomersQuery` не имеет direct wishlist reads;
- Admin ResolverRegistry не создаёт wishlist/item resolvers;
- Admin `node`/`nodes` не разрешают wishlist entities;
- нет Admin E2E queries/spec для wishlist read paths.

При этом `GlobalIdEntity.CustomerWishlist` и `CustomerWishlistItem`, repository, loaders и Storefront
runtime уже существуют. Это не новый домен, а незавершённый опубликованный Admin boundary.

Влияние:

- заявленный API не выполнен;
- оператор/Admin не может читать wishlist Customer;
- `Node` contract неполон относительно зарегистрированных Global ID entity;
- нельзя объявить Customers feature-complete.

Требуемое исправление:

1. Добавить Admin `wishlist.graphql`.
2. Подключить schema file в Admin server.
3. Добавить поля Customer и direct queries.
4. Добавить resolvers и registry methods для wishlist/item/connections.
5. Добавить оба entity типа в Admin Node resolution.
6. Сгенерировать Admin filters/types разрешённым codegen workflow.
7. Добавить Admin E2E для direct/nested/Relay/Node/tenant/lifecycle/Product-reference сценариев.

### P0. Нет актуального green baseline для Customers Admin API

Статус: **готовность не доказана**.

Последний сохранённый профильный baseline в
`e2e/customers-admin-api-failure-remediation-plan.md` датирован 2026-08-17:

- 214 tests;
- 161 passed;
- 53 failed;
- 0 skipped.

Документ фиксирует failures в merge authorization, revisions, Relay Node resolution, validation,
privacy request semantics, normalization, filters/pagination, classification lifecycle, statistics,
consent ordering, addresses, profile и tax invariants.

После baseline в Customers внесено много production-изменений, и часть причин визуально устранена.
Однако remediation plan не обновлён результатами повторных запусков. Сейчас статический inventory
содержит 222 Admin Customers test declarations. Поэтому старые 53 failures нельзя автоматически
считать текущими, но также нельзя считать закрытыми.

Собственный Definition of Done remediation plan требует green result каждого соответствующего spec
с `--workers 1`. До фиксации этих результатов runtime correctness не подтверждена.

### P1. Нормативный DSL/materializer test contract реализован частично

Статус: **существенный quality и correctness gap**.

`customer-segment-dsl-specification.ru.md` требует проверки:

- parser precedence, lexical priority, raw limits и canonical round trip;
- полной semantic operator/type/entity/date/money matrix;
- SQL NULL truth tables и bound-value compilation;
- Store currency/timezone semantics;
- parity preview/bulk/single-customer/materialized reads;
- physical indexes через representative `EXPLAIN`;
- fixtures минимум 100k customers, 300k addresses, 500k classification relations и 1m order facts;
- materialization concurrency, leases, watermark, crash resume и generation publication;
- temporal/DST/birthday/group expiry/tax validity transitions;
- event ordering, duplicate delivery и terminal failure recovery.

Найденный focused unit inventory:

- 14 tests в `packages/customer-segment-dsl/src/__tests__`;
- 5 tests в `services/customers/src/segments/__tests__`;
- 9 checkout eligibility unit tests.

Admin segment E2E покрывает значительную часть public query/create/update/preview behavior, но не
заменяет заявленные SQL parity, performance и coordination suites. Representative `EXPLAIN`
fixtures, полный lease/watermark/crash-resume contract и нормативная temporal matrix не найдены.

Влияние:

- dynamic segments нельзя уверенно считать корректными при concurrency и temporal boundaries;
- отсутствует доказательство соответствия index/performance contract;
- checkout eligibility зависит от materialized state, корректность публикации которого проверена
  неполно.

### P1. Broker actions покрыты интеграционными проверками неравномерно

Статус: **integration confidence gap**.

Явное E2E-использование найдено для `customers.resolveCheckoutBuyerEligibility`. Для comparison
selection, loyalty reference validation, rebuild actions и external-reference actions не найдено
самостоятельного Customers E2E contract coverage по полному action name.

Нужно подтвердить минимум:

- caller allowlist/forbidden behavior;
- Store isolation и cross-store hiding;
- input schema validation;
- idempotency/replay для writes;
- typed business failures против retryable infrastructure failures;
- sanitization ошибок и отсутствие PII/internal messages;
- batch sync partial failure semantics;
- durable workflow start authorization.

### P1. Документация не является единым актуальным source of truth

Статус: **contract drift**.

Обнаруженные расхождения:

- wishlist plan утверждает, что Admin read-only API входит в задачу, но его нет;
- тот же plan описывает Storefront runtime как будущий и непубликуемый, хотя Storefront server,
  resolvers, E2E и active supergraph уже существуют;
- README описывает dynamic segment rebuild как будущий materializer/invalidate-only этап, тогда как
  в коде уже присутствуют materialization generation/status, queues, scheduler и workflows;
- remediation plan не отражает результаты исправлений после 2026-08-17.

Влияние:

- невозможно однозначно определить полный заявленный product/API scope только по документации;
- новые изменения рискуют опираться на устаревшие ограничения;
- feature-complete declaration не имеет стабильного checklist.

### P2. Operational readiness не формализована

Статус: **не блокирует локальную функциональность, но блокирует уверенный operational handoff**.

В сервисе есть structured logs для части broker actions и health endpoints, но не найден единый
Customers operational contract с обязательными метриками/алертами для:

- DBOS workflow failures и stuck runs;
- segment leases/queues/materialization status;
- statistics projection lag;
- IAM provisioning conflicts;
- privacy request deadline/failure;
- external-reference sync failures;
- broker latency и failure categories.

Проект не имеет production data/users, поэтому это не migration blocker, но перед production-like
эксплуатацией должен появиться наблюдаемый SLO/alerting contract.

## 7. Риски по доменам

| Домен | Риск | Приоритет |
| --- | --- | --- |
| Admin Wishlist | Заявленный API полностью недоступен | P0 |
| Admin mutations | Исправленные сценарии не подтверждены актуальным green baseline | P0 |
| Merge/privacy | Durable child workflow, replay и cleanup требуют runtime evidence | P1 |
| Dynamic segments | Temporal/concurrency/publication correctness доказана частично | P1 |
| Statistics | Event ordering, lag и rebuild требуют подтверждения | P1 |
| External references | Write/sync broker boundary не имеет явного полного E2E | P1 |
| Federation | SDL компонуется, низкий остаточный риск | P2 |
| Build/type safety | Проверка проходит, низкий остаточный риск | P2 |
| Documentation | Drift затрудняет управление scope и DoD | P1 |

## 8. Что не считается блокером

- Отсутствие credentials/session management в Customers корректно: этим владеет IAM.
- Отсутствие Customer order/payment source-of-truth данных корректно: ими владеют Orders и
  Payments.
- Nullable cross-service Product/Media references являются допустимым federation behavior.
- Storefront не должен принимать публичный customer/store identity для viewer-owned operations.
- Backfill и backward compatibility не требуются и запрещены правилами проекта, поскольку
  production data отсутствуют.
- Успешный build не заменяет E2E, но является положительным обязательным gate.

## 9. Рекомендуемый план завершения

### Этап 1. Закрыть API gap

1. Реализовать Admin Wishlist SDL и resolvers.
2. Подключить его к Admin federation subgraph.
3. Добавить Relay filters/order/types и Node mapping.
4. Добавить focused Admin Wishlist E2E.
5. Выполнить Customers codegen/build/schema composition через `shopana-cli`.

### Этап 2. Восстановить достоверный baseline

Запускать по одному spec-файлу согласно проектным правилам и фиксировать результат:

1. customer merges;
2. customer query/filter/pagination;
3. groups;
4. segments;
5. Relay nodes;
6. customer delete;
7. privacy data requests;
8. tags;
9. addresses;
10. classification update;
11. consents;
12. profile;
13. tax;
14. statistics/comparison;
15. customer account settings;
16. все Customers Storefront specs;
17. Customers cross-service lifecycle/sync specs.

Каждый residual failure должен быть классифицирован как production defect, invalid test fixture или
environment problem. Нельзя закрывать failure изменением expectation без подтверждения контракта.

### Этап 3. Закрыть DSL/materializer verification

1. Дополнить parser и semantic table-driven tests.
2. Добавить SQL truth table и parity suites.
3. Добавить physical-index architecture tests и representative `EXPLAIN` fixtures.
4. Добавить lease recovery, generation fencing, watermark и crash-resume tests.
5. Добавить полный temporal boundary suite, включая Europe/Kyiv DST.
6. Подтвердить fail-closed behavior eligibility во всех stale/failed states.

### Этап 4. Закрыть broker integration contracts

1. Comparison selection caller/tenant/entity scenarios.
2. Loyalty segment validation caller/tenant/missing IDs.
3. Statistics and segment rebuild authorization/retry/workflow start.
4. External-reference lookup/upsert/delete/sync idempotency и conflicts.
5. Sanitized error mapping и retryability matrix.

### Этап 5. Синхронизировать документацию

1. Обновить wishlist plan до фактического Admin + Storefront состояния.
2. Обновить README dynamic segment section.
3. Обновить remediation matrix фактическими результатами.
4. Зафиксировать один feature matrix: declared, implemented, published, tested.
5. Добавить operational runbook/metrics contract.

## 10. Definition of Done для 100% готовности

Customers может быть объявлен завершённым только когда одновременно выполнены все условия:

### API

- [ ] Все заявленные Admin fields и mutations присутствуют в active Admin supergraph.
- [ ] Все заявленные Storefront fields и mutations присутствуют в active Storefront supergraph.
- [ ] Admin Wishlist read-only API реализован полностью.
- [ ] Все schema fields имеют runtime resolvers или корректные federation entity/reference rules.
- [ ] Global ID и Relay Node contracts охватывают все Customers entities.
- [ ] Generated types/filters синхронизированы с SDL.

### Business logic

- [ ] Tenant isolation применяется во всех repository/read/write paths.
- [ ] Expected revision и idempotency semantics подтверждены для всех writes.
- [ ] Multi-section customer updates атомарны.
- [ ] Merge/delete/redaction cleanup подтверждён для всех owned entities.
- [ ] IAM lifecycle projection подтверждена для email/phone/block/unblock/delete.
- [ ] Statistics projections устойчивы к duplicate/out-of-order events.
- [ ] Dynamic segment publication fail-closed при stale/failed generation.
- [ ] Wishlist/comparison Catalog reference rules подтверждены.
- [ ] Privacy artifacts, correction и erasure lifecycle подтверждены.

### Integrations

- [ ] Все broker actions имеют caller authorization tests.
- [ ] Все actions имеют tenant, validation, retryability и sanitization tests.
- [ ] Cross-service events имеют idempotency и ordering tests.
- [ ] DBOS parent/child workflow authorization и replay подтверждены.

### Verification

- [ ] Production Customers build проходит.
- [ ] Admin и Storefront supergraph composition проходит.
- [ ] Каждый Customers Admin spec проходит отдельно.
- [ ] Каждый Customers Storefront spec проходит отдельно.
- [ ] Каждый Customers cross-service spec проходит отдельно.
- [ ] DSL/materializer normative test matrix закрыта.
- [ ] Нет skipped/fixme tests для обязательного contract scope.
- [ ] Зафиксирован актуальный dated green baseline.

### Documentation и operations

- [ ] README соответствует текущему runtime.
- [ ] Plans не описывают уже реализованные возможности как future work.
- [ ] Feature matrix не содержит declared-but-unimplemented API.
- [ ] Есть runbook для workflow/projection/materialization failures.
- [ ] Есть безопасные метрики и alerts без Customer PII.

## 11. Финальный вывод

Customers уже имеет зрелый архитектурный каркас и значительный объём production implementation.
Сервис успешно собирается и компонуется в обе федерации. Основной остаточный риск находится не в
отсутствии общей архитектуры, а в незакрытом Admin Wishlist boundary и недостаточном доказательстве
сложной runtime-семантики через актуальные E2E, DSL parity, concurrency и broker integration tests.

До закрытия P0 findings и нормативных P1 verification gaps статус должен оставаться
**feature-incomplete / not release-ready**.
