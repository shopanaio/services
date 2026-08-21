# Аудит готовности Loyalty Service

Дата: 2026-08-20  
Статус: **не готов к критерию implementation complete**  
Предварительная общая готовность: **65%**  
Тип проверки: статический аудит API, бизнес-логики, persistence, workflows, интеграций и
e2e-покрытия

## 1. Резюме

`loyalty` уже является крупным функциональным bounded context, а не contract-only заготовкой. В
сервисе реализованы:

- Admin и Storefront GraphQL subgraphs;
- lifecycle программ и immutable published versions;
- базовая и расширяемая модель earning rules;
- tenant-aware accounts, balances, append-only points ledger и point lots;
- checkout quote/reserve/commit/release/reverse;
- order earning и refund reversal;
- tiers, tier memberships и tier benefits;
- reward definitions и reward entitlements;
- monetary wallets и points-to-money conversion;
- maintenance workflow;
- customer merge/delete и store delete handlers;
- typed loyalty point events для основных ledger transitions.

GraphQL API почти полностью связан с runtime-реализацией: заявленные root queries, mutations и
storefront federation fields имеют резолверы, repositories и application services. Основные проблемы
находятся не в наличии CRUD-методов, а в полноте бизнес-гарантий.

Сервис нельзя признать завершённым по заявленному контракту по следующим причинам:

1. Storefront presentation не применяет channel eligibility и не умеет корректно разрешать часть
   заявленных earning conditions.
2. Universal external earning создаёт экономические записи, но не публикует соответствующие loyalty
   domain events.
3. Несколько Admin mutations принимают обязательный `idempotencyKey`, но полностью игнорируют его.
4. Time-based lifecycle реализован только как вызываемый maintenance workflow; владельца
   автоматического расписания в репозитории нет.
5. Для части storefront `availableRewards` отсутствует завершённый customer-facing fulfillment path.
6. Часть существенных гарантий не проверяется существующими e2e-сценариями или проверяется
   недостаточно строго.

Итоговый gate:

| Критерий                                                                   | Статус            |
| -------------------------------------------------------------------------- | ----------------- |
| Все заявленные GraphQL поля имеют runtime implementation                   | Почти выполнен    |
| Все заявленные broker actions имеют runtime implementation                 | Выполнен          |
| Все экономические операции атомарны и идемпотентны                         | Частично выполнен |
| Storefront возвращает только авторитетные eligibility projections          | Не выполнен       |
| Все заявленные события публикуются для каждого соответствующего transition | Не выполнен       |
| Time-based lifecycle работает без ручного Admin-вызова                     | Не подтверждён    |
| Все storefront rewards имеют понятный fulfillment lifecycle                | Не выполнен       |
| Тестами подтверждены критические negative/concurrency branches             | Частично выполнен |

## 2. Scope и методика

### 2.1. Проверенный scope

Проверены следующие части репозитория:

- `services/loyalty/README.md` как основной заявленный функциональный контракт;
- Admin GraphQL SDL, generated types/schemas, root и type resolvers;
- Storefront GraphQL SDL, federation resolvers и presentation projection;
- application services;
- repositories и Drizzle models;
- SQL migrations и DB invariants;
- broker actions и event handlers;
- DBOS workflows;
- contracts в `@shopana/broker-types` и `@shopana/events`;
- интеграции Checkout и Orders;
- loyalty Admin, Storefront и cross-service e2e specifications;
- архитектурные правила knowledge base для tenancy, repositories, resolvers, federation,
  idempotency, DBOS и currency handling.

### 2.2. Критерий завершённости

Поле или операция считались завершёнными только при наличии полного исполняемого пути:

```text
public contract
  -> validation and authorization
  -> resolver/action/handler
  -> application service or durable workflow
  -> tenant-scoped repository
  -> database invariant/audit record
  -> required domain event or external integration
  -> meaningful verification scenario
```

Наличие SDL, generated type, repository метода или happy-path теста само по себе не считалось
доказательством завершённости.

### 2.3. Ограничения проверки

В соответствии с `AGENTS.md` не запускались:

- tests;
- `tsc`;
- dev/start server;
- browser verification.

Build также не запускался, поскольку аудит не создаёт новую версию runtime-кода. Поэтому выводы
основаны на статическом анализе и не являются подтверждением фактического прохождения текущего
e2e-suite.

## 3. Заявленный функциональный контракт

README заявляет следующие ownership и runtime guarantees:

- Loyalty владеет conversion rules, balances, reservations, lot allocation, expiry, redemption,
  debt, reward lifecycle, monetary wallets и loyalty audit history.
- Points ledger и monetary ledger являются append-only source of truth.
- Published program versions immutable.
- Eligibility должна вычисляться единым canonical evaluator для earning и redemption.
- Cross-service references проверяются при draft editing и непосредственно перед publication.
- External events дедуплицируются по producer и immutable external event ID.
- Checkout redemption выполняется через quote, reserve, commit, release и reverse.
- Storefront не вычисляет loyalty policy на клиенте и получает server-ranked projections.
- Loyalty публикует typed earned, activated, reserved, redeemed, released, expired, reversed,
  restored и adjusted point events.
- Reservation expiry и другие time-based transitions принадлежат Loyalty.

Эти гарантии использованы как основной baseline аудита.

## 4. Инвентаризация реализации

### 4.1. Admin GraphQL

Admin API предоставляет:

- Relay `node`/`nodes`;
- programs и program versions;
- earning rules;
- reward definitions;
- tiers, tier policy и tier benefits;
- accounts и customer account lookup;
- points transactions, entries, lots и allocations;
- reservations;
- event facts, evaluations и earning rule usage;
- reward entitlements;
- monetary wallets и monetary transactions;
- maintenance и balance rebuild operations.

Root wiring завершён через:

- `src/api/graphql-admin/resolvers/index.ts`;
- `src/resolvers/admin/QueryResolver.ts`;
- `src/resolvers/admin/MutationResolver.ts`;
- `src/resolvers/admin/ResolverRegistry.ts`;
- domain type resolvers и loaders.

По статической проверке отсутствующих root resolver methods для заявленных Admin query/mutation
fields не найдено.

### 4.2. Storefront GraphQL

Storefront API расширяет:

- `Customer.loyaltyAccount`;
- `Product.loyalty`;
- `ProductVariant.loyalty`.

Customer account предоставляет:

- points balance;
- текущий tier;
- account opportunities;
- available rewards;
- upcoming expirations;
- customer-safe transaction history.

Storefront корректно скрывает внутренний policy JSON и использует customer ownership checks при
preload account, reward и transaction nodes.

### 4.3. Broker actions

Реализованы actions:

- `loyalty.getCustomerLoyaltyAccount`;
- `loyalty.quoteCheckoutLoyaltyRedemption`;
- `loyalty.reserveCheckoutLoyaltyRedemption`;
- `loyalty.commitCheckoutLoyaltyRedemption`;
- `loyalty.releaseCheckoutLoyaltyRedemption`;
- `loyalty.expireCheckoutLoyaltyRedemptions`;
- `loyalty.reverseCheckoutLoyaltyRedemption`;
- `loyalty.quoteCheckoutLoyaltyReward`;
- `loyalty.reserveCheckoutLoyaltyReward`;
- `loyalty.commitCheckoutLoyaltyReward`;
- `loyalty.releaseCheckoutLoyaltyReward`;
- `loyalty.runLoyaltyMaintenance`;
- `loyalty.adjustLoyaltyPoints`.

Checkout фактически вызывает loyalty quote/reserve/commit/release actions в checkout pipeline и
durable placement/payment workflows.

### 4.4. Event consumers

Явно реализованы handlers:

- `orderRewardEligible`;
- `orderRewardReversed`;
- `customerMerged`;
- `customerDeleted`;
- `storeDeleted`.

Catch-all handler преобразует остальные customer-scoped события в universal earning facts и выбирает
trigger type для signup, review, referral, birthday, anniversary, login, subscription renewal и
custom event.

### 4.5. Persistence и invariants

Сильные стороны persistence layer:

- все основные rows содержат `store_id`;
- repository reads и mutations используют request store scope;
- ledger transactions и entries append-only;
- опубликованная program configuration защищена immutability triggers;
- point lots и allocations сохраняют origin и expiration policy;
- balances являются rebuildable projections;
- monetary transaction требует entries и finalization в одной транзакции;
- optimistic revisions применяются для mutable state;
- cross-table store/program agreement дополнительно контролируется SQL constraints/triggers.

## 5. Оценка по функциональным областям

| Область                   | Оценка | Комментарий                                                                       |
| ------------------------- | -----: | --------------------------------------------------------------------------------- |
| GraphQL wiring            |    90% | Root API реализован, типы и loaders присутствуют                                  |
| Program/version lifecycle |    80% | Draft, publish, schedule, immutability и reference validation реализованы         |
| Points ledger             |    85% | Append-only ledger, lots, allocations, balances и rebuild реализованы             |
| Checkout redemption       |    80% | Полная action sequence и Checkout integration присутствуют                        |
| Purchase earning/refunds  |    80% | Orders facts, calculation snapshots, reversal и debt paths реализованы            |
| Universal earning         |    60% | Rules исполняются, но outbound economic events неполны                            |
| Tiers                     |    65% | Evaluation engine есть, но operational trigger зависит от maintenance/manual call |
| Rewards                   |    60% | Definitions/entitlements/state machine есть, fulfillment неполон для части типов  |
| Monetary wallets          |    75% | Ledger и conversion сильные, часть mutation audit/idempotency неполна             |
| Storefront presentation   |    55% | Rich projection есть, но eligibility semantics неполны                            |
| Operational lifecycle     |    40% | Maintenance реализован, автоматическое расписание не найдено                      |
| Verification confidence   |    55% | Большой suite, но критические gaps не покрыты и suite не запускался               |

## 6. Блокирующие findings

### LOY-READY-001 — Storefront игнорирует channel eligibility

Приоритет: **P1**  
Статус: **блокирует завершённость Storefront API**

#### Наблюдение

Canonical eligibility evaluator принимает `channelCode` и сначала проверяет
`eligibility.channelCodes`:

- `src/contracts/policy.ts`, `evaluateLoyaltyProgramEligibility`.

Однако Storefront presentation использует отдельную функцию `programEligible`, которая проверяет
только included/excluded segments:

- `src/resolvers/storefront/StorefrontPresentation.ts:687`.

Storefront `ServiceContext` и `StorefrontLoaderOptions` не содержат channel code. Signed storefront
context также не предоставляет domain channel identity, пригодную для loyalty eligibility.

#### Влияние

Программа, опубликованная только для `POS` или `MOBILE`, может показывать WEB-покупателю:

- purchase points;
- earning opportunities;
- product badges;
- account opportunities.

Checkout повторно выполнит canonical eligibility и отклонит такую redemption/earning operation. В
результате Storefront показывает обещание, которое authoritative runtime не подтверждает.

#### Проблема теста

Сценарий `suppresses presentation on an ineligible storefront channel` в
`e2e/tests/loyality-storefront-api/product-eligibility-modifiers.spec.ts:81` использует условие:

```ts
expect(result === null || result.purchaseOpportunity.state).toBeTruthy();
```

Оно проходит и когда presentation ошибочно присутствует.

#### Требуемое исправление

1. Определить canonical source storefront `channelCode`.
2. Передать его через verified context и `StorefrontLoaderOptions`.
3. Использовать `evaluateLoyaltyProgramEligibility`, а не отдельную сокращённую реализацию.
4. Сделать channel частью presentation revision/cache context.
5. Добавить strict tests: для `POS`-only policy WEB query обязана вернуть `null` или documented
   empty projection; для разрешённого channel presentation обязана присутствовать.

#### Acceptance criteria

- Storefront, earning и redemption используют одинаковую eligibility decision.
- Excluded segment продолжает иметь приоритет.
- Channel change меняет presentation revision.
- Невалидный/неразрешённый channel не получает rewards или opportunities.

### LOY-READY-002 — Storefront не разрешает часть earning conditions

Приоритет: **P1**  
Статус: **блокирует обещание server-computed eligibility**

#### Наблюдение

`conditionMatches` в Storefront возвращает `false` для:

- `CHANNEL`;
- `PAYMENT_METHOD`;
- `FIRST_PURCHASE`;
- `EVENT_FIELD`.

См. `src/resolvers/storefront/StorefrontPresentation.ts:658`.

Это не просто conservative omission. Внутри `NOT` значение инвертируется и может стать `true`,
поэтому некоторые unsupported expressions способны ошибочно показать opportunity.

#### Влияние

- `ALL` с unsupported condition скрывает реально доступную возможность.
- `NOT CHANNEL`, `NOT FIRST_PURCHASE` или `NOT EVENT_FIELD` может показать недоступную возможность.
- Storefront state расходится с execution engine.
- Документация утверждает, что values, eligibility, limits и ordering полностью вычислены сервером,
  но это не выполняется.

#### Требуемое решение

Для каждого condition type должна быть явно выбрана одна стратегия:

1. вычислять его из authoritative immutable/viewer context;
2. возвращать documented `UNKNOWN`/не показывать rule без логического инвертирования;
3. запретить этот condition для storefront-presentable rules на publication;
4. разделить executable condition и presentation eligibility expression.

Нельзя моделировать unknown как обычный boolean `false` внутри `NOT`.

### LOY-READY-003 — External universal earning не публикует points-earned events

Приоритет: **P1**  
Статус: **блокирует event contract**

#### Наблюдение

`ExternalRewardWorkflow` вызывает `OrderRewardService.ingestExternal`, который через
`EarningRuleEngine` может:

- начислить points;
- начислить monetary cashback;
- выдать reward entitlement.

Workflow возвращает только `{ success: true }` и не собирает созданные transaction IDs. Вызова
`events.emit` после успешного начисления нет:

- `src/workflows/ExternalRewardWorkflow.ts`;
- `src/application/earning/EarningRuleEngine.ts`.

Для purchase earning аналогичная публикация реализована отдельно в `OrderRewardEligibleWorkflow`, но
universal event path её не использует.

#### Влияние

Points ledger и balance меняются без `loyaltyPointsEarned`. Downstream consumers не могут надёжно:

- обновить projections;
- отправить notification;
- выполнить automation;
- построить event-driven audit;
- отличить отсутствие начисления от отсутствия delivery.

Это прямо расходится с заявлением README о typed earned events для экономических transitions.

#### Требуемое исправление

1. Вернуть из `EarningRuleEngine.evaluate` детерминированный список результатов evaluation.
2. Вернуть из transactional step transaction/entitlement/wallet identifiers.
3. После durable DB step публиковать события отдельными workflow calls с deterministic `callId`.
4. Для point awards публиковать `loyaltyPointsEarned` с точным `programVersionId`.
5. Явно определить contracts для monetary credit и reward issuance либо документировать, почему они
   не являются public domain events.
6. Добавить replay test, подтверждающий ровно одно economic event emission.

### LOY-READY-004 — Обязательные idempotency keys игнорируются частью Admin API

Приоритет: **P1**  
Статус: **блокирует mutation contract**

#### Затронутые mutations

| Mutation                       | `idempotencyKey` в SDL | Реальное использование |
| ------------------------------ | ---------------------: | ---------------------- |
| `accountStatusUpdate`          |                     Да | Игнорируется           |
| `tierEvaluate`                 |                     Да | Игнорируется           |
| `tierMembershipRevoke`         |                     Да | Игнорируется           |
| `monetaryWalletStatusUpdate`   |                     Да | Игнорируется           |
| `accountBalanceRebuild`        |                     Да | Игнорируется           |
| `monetaryWalletBalanceRebuild` |                     Да | Игнорируется           |

Основные места:

- `src/resolvers/admin/MutationResolver.ts:280`;
- `src/resolvers/admin/MutationResolver.ts:823`;
- `src/resolvers/admin/MutationResolver.ts:858`;
- `src/resolvers/admin/MutationResolver.ts:911`;
- `src/resolvers/admin/MutationResolver.ts:1103`;
- `src/resolvers/admin/MutationResolver.ts:1129`.

#### Влияние

- Один ключ можно повторно использовать с другим payload без conflict.
- Retry после ambiguous transport failure не имеет сохранённого результата.
- Rebuild может повторно менять projection revision.
- Tier evaluation с тем же ключом и другими параметрами может создать новый lifecycle transition.
- API создаёт ложное ожидание безопасного replay.

#### Дополнительный audit gap

`monetaryWalletStatusUpdate` принимает обязательный `reasonCode`, но не сохраняет и не использует
его. Для status transition отсутствует отдельная audit event table/record, поэтому причина изменения
теряется.

#### Требуемое исправление

Для каждой mutation необходимо выбрать и последовательно применить один механизм:

- durable workflow с client/content idempotency;
- transaction-scoped mutation record с canonical request hash;
- immutable domain transition event с unique idempotency key.

Повтор того же key и payload обязан вернуть прежний logical result. Тот же key с другим payload
обязан вернуть `IDEMPOTENCY_CONFLICT`.

### LOY-READY-005 — Time-based lifecycle не имеет подтверждённого автоматического запуска

Приоритет: **P1**  
Статус: **operational blocker**

#### Наблюдение

`LoyaltyMaintenanceWorkflow` умеет:

- активировать scheduled program versions;
- expire reservations;
- activate/expire point lots;
- activate/expire monetary lots;
- evaluate tiers;
- expire rewards;
- rebuild balances;
- reconcile published references.

Но в репозитории найдены только два явных входа:

- broker action `runLoyaltyMaintenance`;
- Admin mutation `maintenanceRun`.

Cron, recurring DBOS schedule, bootstrap registration или другой repo-owned trigger не найден.

#### Влияние

Без внешнего scheduler configuration:

- scheduled version не становится active вовремя;
- pending points не активируются;
- expired points остаются в projection;
- reservations не освобождаются;
- rewards и monetary lots не expire;
- tiers не переоцениваются автоматически;
- stale references не reconcile.

Ручная Admin mutation не является достаточным production ownership механизмом.

#### Дополнительная проблема batch semantics

`limit` применяется к части candidate queries, но accounts загружаются через `listAllForStore()` и
обрабатываются полностью. Это делает duration maintenance workflow неограниченной размером магазина
и ослабляет retry/replay predictability.

#### Требуемое исправление

1. Добавить явного владельца recurring schedule либо документировать и version-control внешнюю
   scheduler configuration.
2. Ввести cursor/keyset batches для accounts и wallets.
3. Разделить maintenance domains на bounded workflow steps/runs.
4. Обеспечить overlap protection и deterministic run identity.
5. Добавить мониторинг lag: oldest due reservation/lot/version/reward.

### LOY-READY-006 — Не завершён fulfillment lifecycle части rewards

Приоритет: **P2**, повышается до P1 если эти типы считаются customer-claimable  
Статус: **требует продуктового решения и реализации**

#### Наблюдение

Storefront `availableRewards` показывает все reward kinds, включая:

- `POINTS`;
- `MONETARY_CREDIT`;
- `MEMBER_BENEFIT`.

При этом Checkout action намеренно отклоняет entitlement без Pricing `externalDiscountId` с
`REWARD_NOT_CHECKOUT_APPLICABLE`. Альтернативного Storefront claim/consume API для этих типов в
Loyalty не найдено.

`RewardEntitlementService.issue` создаёт entitlement, но сам по себе не:

- зачисляет points для `POINTS`;
- создаёт wallet credit для `MONETARY_CREDIT`;
- применяет/активирует внешний member benefit.

#### Влияние

Покупатель видит reward как currently available, но не имеет определённого действия для его
использования. Entitlement может оставаться `ISSUED` до expiry без economic fulfillment.

#### Требуемое решение

Для каждого reward type требуется формально определить один lifecycle:

- auto-fulfill при issuance;
- explicit claim action;
- Checkout/Pricing consumption;
- external provider fulfillment;
- informational entitlement без claim, но тогда он не должен называться `availableRewards` без
  соответствующей семантики.

Для auto-fulfill необходимо атомарно связать entitlement с points или monetary transaction и
обеспечить idempotent replay.

## 7. Дополнительные findings

### LOY-READY-007 — Maintenance reconciliation failures не видны в GraphQL result

Приоритет: **P2**

Workflow возвращает `failedProgramVersionReconciliations`, но Admin GraphQL
`LoyaltyMaintenanceResult` не содержит этого поля. Оператор видит количество checked/stale, но не
видит failed calls, хотя workflow намеренно изолирует broker failures.

Требуется либо добавить поле в API, либо писать отдельные observable failure records/metrics.

### LOY-READY-008 — Status transitions не имеют полного audit history

Приоритет: **P2**

Account и monetary wallet status меняются как mutable state. Для account сохраняется только текущая
suspension причина; после последующего transition история причины теряется. Для wallet обязательный
`reasonCode` не сохраняется вовсе.

Если README-гарантия `loyalty audit history` распространяется на administrative state transitions,
необходимы immutable transition events или общий audit journal.

### LOY-READY-009 — Runtime configuration содержит устаревшее описание сервиса

Приоритет: **P3**

В `config.yml` Loyalty всё ещё описан как `contract-only subgraph`, хотя module запускает два
GraphQL servers, workflows, actions и handlers. Это создаёт риск неверных operational ожиданий и
должно быть синхронизировано с фактической архитектурой.

### LOY-READY-010 — Название e2e каталогов содержит `loyality`

Приоритет: **P3**

Production service и contracts используют корректное `loyalty`, но e2e directories и query
namespaces используют `loyality-*`. Это не ломает runtime, однако усложняет discovery, CI filters и
поиск ownership. Рекомендуется отдельный механический rename без изменения test semantics.

## 8. Что реализовано хорошо

### 8.1. Tenant isolation

Repositories последовательно добавляют `storeId` к reads, updates и deletes. Loaders используют
tenant-scoped repository methods. Federation references декодируют typed global IDs, после чего
данные всё равно ищутся внутри current store.

### 8.2. Ledger architecture

Points ledger соответствует сильной модели:

- immutable transactions и entries;
- отдельные buckets `PENDING`, `AVAILABLE`, `RESERVED`, `DEBT`;
- point lots;
- deterministic lot allocation;
- correction через новые transactions;
- balance projection можно rebuild из ledger.

Monetary ledger отделён от points ledger и использует minor units, credit lots и deferred
finalization invariant.

### 8.3. Program immutability

Draft-only update/delete enforcement реализован одновременно в application layer и database
triggers. Publication повторно валидирует policy schemas и cross-service references. Calculation
transactions сохраняют `programVersionId` и snapshots.

### 8.4. Checkout integration

Checkout использует Loyalty после Pricing quote и до Payments eligibility. Place order и payment
monitor workflows вызывают reserve/commit/release actions, а redemption остается tender-like
reduction, отделённой от Pricing discount.

### 8.5. Refund and debt handling

Order reversal path учитывает cumulative reversed economics, proportional/full reversal, previously
reversed amounts, point debt policy, monetary reversal и redeemed point restoration.

## 9. Анализ тестового покрытия

В репозитории найдено **292** loyalty e2e test cases:

| Suite                     | Количество test cases |
| ------------------------- | --------------------: |
| `loyality-admin-api`      |                   121 |
| `loyality-storefront-api` |                    94 |
| `loyality-e2e-api`        |                    77 |
| Всего                     |                   292 |

### 9.1. Хорошо покрытые области

- program lifecycle и immutable publication;
- eligibility policy validation;
- earning calculation и modifier branches;
- ledger invariants;
- reservation state machine;
- refunds/reversals;
- monetary wallet invariants;
- tier evaluation branches;
- reward entitlement state machine;
- Relay queries и tenancy/authorization;
- storefront presentation values/localization;
- checkout integration.

### 9.2. Обязательные недостающие сценарии

Нужно добавить или усилить tests для:

1. Strict storefront channel denial.
2. `NOT` вокруг unsupported/unknown storefront condition.
3. Storefront `CHANNEL` condition на разрешённом и запрещённом channel.
4. Universal external event фактически создаёт points transaction.
5. Universal external award публикует ровно один `loyaltyPointsEarned` при replay.
6. Reuse одного Admin idempotency key с другим payload.
7. Retry каждого affected status/rebuild/tier mutation с тем же key и payload.
8. Automatic recurring maintenance trigger.
9. Maintenance continuation после batch limit.
10. Fulfillment для `POINTS`, `MONETARY_CREDIT` и `MEMBER_BENEFIT` entitlements.
11. Audit persistence `reasonCode` для account/wallet status transitions.
12. Visibility operator-facing reconciliation failures.

### 9.3. Проверки, необходимые после исправлений

Следует использовать только разрешённые проектом `shopana-cli` development commands:

- production build Loyalty и зависимых contracts;
- schema/codegen consistency;
- targeted Admin loyalty e2e;
- targeted Storefront loyalty e2e;
- targeted cross-service loyalty e2e;
- Checkout loyalty integration subset;
- clean-schema migration application;
- replay/concurrency checks для economic workflows.

## 10. Рекомендуемый порядок завершения

### Этап 1 — Исправить публичную семантику Storefront

1. Добавить canonical channel identity в verified storefront context.
2. Заменить `programEligible` на shared evaluator.
3. Ввести корректную модель unknown/non-presentable earning conditions.
4. Исправить tautological channel test и добавить negative matrix.

Выход этапа: Storefront никогда не обещает reward, который authoritative execution отклоняет по
channel/condition eligibility.

### Этап 2 — Завершить event-driven earning

1. Сделать evaluation result явным.
2. Публиковать point earned events для external triggers.
3. Определить events для monetary/reward issuance.
4. Добавить replay-safe emission tests.

Выход этапа: каждое economic изменение имеет соответствующий auditable outbound contract.

### Этап 3 — Унифицировать mutation idempotency и audit

1. Добавить idempotency records/workflows для шести affected mutations.
2. Сохранять canonical request hash и result identity.
3. Добавить immutable account/wallet status audit.
4. Проверить conflict semantics.

Выход этапа: обязательный `idempotencyKey` имеет одинаковую доказуемую семантику во всём Admin API.

### Этап 4 — Сделать maintenance operationally complete

1. Назначить recurring scheduler owner.
2. Разделить unbounded account loop на cursor batches.
3. Добавить lag/failure metrics.
4. Экспортировать reconciliation failures.

Выход этапа: все due transitions выполняются автоматически и наблюдаемы.

### Этап 5 — Закрыть reward fulfillment matrix

1. Зафиксировать lifecycle каждого reward type.
2. Реализовать auto-fulfill/claim/external fulfill paths.
3. Согласовать `availableRewards` с реальной usability.
4. Добавить economic linking и replay tests.

Выход этапа: любой storefront available reward имеет определённый успешный и terminal lifecycle.

## 11. Definition of Done

Сервис может получить статус `implementation complete` только после выполнения всех пунктов:

### API

- [ ] Все GraphQL fields проходят schema/codegen/build verification.
- [ ] Все required mutation inputs фактически участвуют в semantics.
- [ ] Все declared idempotency keys имеют replay и conflict behavior.
- [ ] Storefront nullability и authorization подтверждены negative tests.

### Business logic

- [ ] Program eligibility одинакова для Storefront, earning и redemption.
- [ ] Все earning condition types либо корректно вычисляются, либо запрещены/явно non-presentable.
- [ ] Любое points изменение сохраняет balanced ledger entries и required event.
- [ ] Reward fulfillment определён для каждого advertised type.
- [ ] Tier evaluation запускается по документированным автоматическим причинам.
- [ ] Due transitions не зависят от ручного Admin запуска.

### Reliability

- [ ] Все event-driven mutations дедуплицируются по immutable event identity.
- [ ] Все direct mutations с ключом защищены request hash conflict check.
- [ ] Workflows используют deterministic child call IDs.
- [ ] Maintenance bounded и resumable.
- [ ] Concurrency tests подтверждают limits, reservations, balances и status transitions.

### Audit и observability

- [ ] Account/wallet administrative transitions имеют immutable audit history.
- [ ] Failed reference reconciliations видимы оператору.
- [ ] Есть metrics/alerts для overdue maintenance candidates.
- [ ] Economic transaction можно связать с source fact, program version и emitted event.

### Verification

- [ ] Loyalty build успешен через `shopana-cli`.
- [ ] Clean migrations успешны через `shopana-cli`.
- [ ] Targeted Admin suite успешен.
- [ ] Targeted Storefront suite успешен.
- [ ] Targeted cross-service suite успешен.
- [ ] Checkout loyalty integration suite успешен.
- [ ] Нет skipped/fixme tests для обязательных branches.

## 12. Итоговая оценка

Текущая реализация существенно превосходит ранний prototype и содержит сильный ledger/persistence
foundation. Основной Admin API, checkout redemption, purchase earning, reversals и большая часть
configuration lifecycle фактически реализованы.

Тем не менее требование «всё заявленное API и бизнес-логика завершены» сейчас не выполнено.
Storefront способен возвращать неавторитетную eligibility projection, external earning нарушает
outbound event contract, часть обязательных idempotency keys является декоративной, а time-based
lifecycle не имеет подтверждённого автоматического владельца.

Рекомендуемый статус сервиса:

```text
feature-rich implementation
API surface mostly wired
business completion blocked
production readiness not confirmed
```

После закрытия findings `LOY-READY-001`–`LOY-READY-005`, принятия решения по `LOY-READY-006` и
прохождения разрешённой verification pipeline оценку готовности следует провести повторно.
