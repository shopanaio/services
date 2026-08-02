# Customers checkout pipeline: подробный план реализации

## 1. Назначение документа

Этот документ описывает изменения в bounded context Customers, необходимые
для разрешения buyer eligibility до запуска перерасчёта Checkout.

Целевая синхронная граница:

```text
Checkout
  -> customers.resolveCheckoutBuyerEligibility
  -> Customers eligibility read model
  -> lifecycle Customer + активные memberships сегментов
  <- неизменяемый eligibility snapshot
  -> Pricing -> Delivery -> Pricing final -> Payments -> Validation
```

Customers отвечает только за принадлежащие ему факты eligibility. Checkout
продолжает владеть checkout draft, контактным snapshot покупателя, адресами,
выбранными опциями и результатом pipeline.

## 2. Текущее состояние

Межсервисный action уже объявлен в
`packages/broker-types/src/actions/customers.ts`:

```ts
customers.resolveCheckoutBuyerEligibility
```

Текущий запрос:

```ts
interface ResolveCheckoutBuyerEligibilityParams {
  storeId: string;
  customerId: string;
  effectiveAt: string;
}
```

Текущий успешный ответ:

```ts
{
  ok: true;
  storeId: string;
  customerId: string;
  effectiveAt: string;
  segmentIds: readonly string[];
  segmentMembershipRevision: string;
}
```

В Customers уже существуют:

- lifecycle и tenant ownership Customer;
- ручные и материализованные memberships сегментов;
- время вычисления и истечения membership;
- статус, definition и aggregate revision сегмента;
- Zod scaffolding запроса и ответа в `src/checkout-pipeline/`.

Пока отсутствуют:

- явно зафиксированная lifecycle eligibility policy;
- checkout-specific read repository;
- детерминированная генерация eligibility revision;
- application script;
- реальный broker action и его регистрация в Nest;
- защита от устаревших dynamic memberships;
- сфокусированные проверки контракта и интеграции.

## 3. Объём реализации

### 3.1 Входит в реализацию

- поиск существующего Customer внутри одного доверенного Store;
- определение допустимости checkout по lifecycle Customer;
- разрешение активных memberships на момент `effectiveAt`;
- исключение устаревших материализованных dynamic memberships;
- вычисление детерминированной `segmentMembershipRevision`;
- публикация результата через service broker;
- разделение бизнес- и инфраструктурных ошибок;
- документация и сфокусированное покрытие новой границы.

### 3.2 Не входит в реализацию

- создание Customer из checkout;
- изменение профиля или контактов Customer;
- возврат email, телефона, имени или других PII;
- загрузка адресов Customer в Checkout;
- группы, теги, consent, tax identifiers и статистика;
- вычисление dynamic segment rules во время checkout-запроса;
- применение скидок или выбор payment/delivery methods;
- хранение checkout state в Customers;
- создание Order и оркестрация завершения checkout.

Dynamic segments вычисляются отдельно и материализуются заранее. Синхронный
checkout action только читает корректный материализованный результат.

## 4. Архитектурные решения

### 4.1 Customers является владельцем eligibility

Checkout не должен читать таблицы Customers, повторять lifecycle policy или
локально выводить memberships. Customers возвращает immutable snapshot для
переданной Checkout временной границы.

### 4.2 Только ACTIVE Customer может продолжить checkout

Зафиксировать следующую матрицу:

| Lifecycle | Поведение | Публичная ошибка |
| --- | --- | --- |
| `ACTIVE` | Разрешить сегменты и продолжить | отсутствует |
| `DISABLED` | Остановить до pipeline | `CUSTOMER_NOT_ELIGIBLE` / `DISABLED` |
| `BLOCKED` | Остановить до pipeline | `CUSTOMER_NOT_ELIGIBLE` / `BLOCKED` |
| `MERGED` | Остановить, идентичность должна быть обновлена | `CUSTOMER_NOT_ELIGIBLE` / `MERGED` |
| `REDACTED` | Остановить | `CUSTOMER_NOT_ELIGIBLE` / `REDACTED` |
| deleted | Скрыть существование | `CUSTOMER_NOT_FOUND` |
| другой Store | Скрыть существование | `CUSTOMER_NOT_FOUND` |

Ответ не должен содержать `blockedReason`, moderation note, merge target или
другие внутренние сведения.

### 4.3 `effectiveAt` — единственная временная граница

Eligibility-запросы не используют database `now()`. Membership считается
действующим, когда:

```text
membership.evaluatedAt <= effectiveAt
AND (membership.expiresAt IS NULL OR membership.expiresAt > effectiveAt)
```

Граница expiry исключительная: если `expiresAt === effectiveAt`, membership
уже не действует.

### 4.4 Это read action, а не workflow

Операция синхронная, side-effect free и ограничена общим deadline checkout
mutation. Для неё нужен broker action поверх read-only repository. DBOS
workflow или saga не требуются.

### 4.5 Dynamic rules не вычисляются синхронно

Выполнение произвольных dynamic rules внутри checkout сделает latency,
детерминизм и failure surface всего pipeline непредсказуемыми. Поэтому dynamic
membership должен быть материализован заранее и связан с revision definition,
по которому он был вычислен.

## 5. Целевой shared contract

Изменить `packages/broker-types/src/actions/customers.ts`, чтобы отсутствие
Customer, бизнес-недопустимость и инфраструктурный сбой были разными
результатами.

Рекомендуемый контракт:

```ts
export type CustomerCheckoutIneligibilityReason =
  | "DISABLED"
  | "BLOCKED"
  | "MERGED"
  | "REDACTED";

export type ResolveCheckoutBuyerEligibilityResult =
  | Readonly<{
      ok: true;
      storeId: string;
      customerId: string;
      effectiveAt: string;
      segmentIds: readonly string[];
      segmentMembershipRevision: string;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_FOUND";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_ELIGIBLE";
      reason: CustomerCheckoutIneligibilityReason;
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_LIMIT_EXCEEDED";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED";
      message: string;
      retryable: true;
    }>;
```

Инварианты контракта:

- `storeId`, `customerId` и `effectiveAt` успешного ответа точно совпадают с
  запросом;
- `segmentIds` уникальны и лексикографически отсортированы;
- возвращается не более 500 segment IDs;
- активный Customer без сегментов получает success и пустой массив;
- внутренние подробности исключения не попадают в `message`;
- бизнес-ошибки всегда имеют `retryable: false`;
- инфраструктурная ошибка всегда имеет `retryable: true`.

Legacy-вариант контракта сохранять не нужно: production consumers и данные,
требующие обратной совместимости, отсутствуют.

## 6. Изменения базы данных

### 6.1 Недостаток текущей модели dynamic membership

`customer_segment_membership.evaluated_at` показывает время материализации,
но не revision dynamic definition. После изменения правила старая строка может
выглядеть актуальной, хотя была вычислена по предыдущему definition.

Существующий `customer_segment.revision` не подходит для этой задачи. Это
aggregate concurrency revision: он меняется и при definition updates, и при
membership updates. Если использовать его как revision определения, изменение
одного Customer сделает устаревшими memberships всех остальных Customers в
этом сегменте.

### 6.2 Новые поля

Добавить в `customer_segment`:

```sql
"definition_revision" integer NOT NULL DEFAULT 0
```

Добавить в `customer_segment_membership`:

```sql
"evaluated_definition_revision" integer
```

Добавить ограничения, эквивалентные:

```sql
CHECK ("definition_revision" >= 0)

CHECK (
  ("source" = 'RULE' AND "evaluated_definition_revision" IS NOT NULL)
  OR
  ("source" <> 'RULE' AND "evaluated_definition_revision" IS NULL)
)
```

### 6.3 Семантика двух revision

| Изменение | `revision` | `definition_revision` |
| --- | ---: | ---: |
| name, description или color | +1 | без изменений |
| status | +1 | без изменений |
| type, query или definition | +1 | +1 |
| manual membership | +1 | без изменений |
| materialized membership replacement | +1 | без изменений |

Каждый `RULE` membership записывает текущую `definition_revision`. В checkout
он действует только при условии:

```text
membership.evaluatedDefinitionRevision === segment.definitionRevision
```

### 6.4 Индекс для checkout read path

Добавить индекс:

```sql
CREATE INDEX "customer_segment_membership_store_customer_expiry_idx"
  ON "customers"."customer_segment_membership"
  ("store_id", "customer_id", "expires_at", "segment_id");
```

### 6.5 Стратегия миграции

Так как production data отсутствуют, а compatibility/backfill запрещены,
изменить baseline migration и Drizzle model одновременно. Не добавлять
dual-read, временные compatibility columns или data backfill. Локальную БД,
созданную по старому baseline, при реализации потребуется пересоздать через
проектный migration workflow.

Файлы:

- `services/customers/migrations/domains/0500_classification/0502_classification__segments.sql`;
- `services/customers/src/repositories/models/classification.ts`;
- `services/customers/docs/customers-database-schema.md`.

## 7. Изменения write paths сегментов

Обновить `CustomerSegmentRepository` и `CustomerSegmentUpdateScript`, чтобы
новая семантика revision соблюдалась во всех командах.

### 7.1 Определение изменения definition

До repository update вычислять:

```ts
const definitionChanged =
  nextType !== current.type ||
  nextQuery !== current.query ||
  !canonicalJsonEqual(nextDefinition, current.definition);
```

Сравнение JSON должно быть структурным и не зависеть от порядка добавления
ключей объекта.

### 7.2 Правила записи

- aggregate `revision` увеличивается ровно один раз на принятую команду;
- `definitionRevision` увеличивается только при `definitionChanged`;
- membership-only команды не меняют `definitionRevision`;
- manual membership получает `evaluatedDefinitionRevision: null`;
- rule-materialized membership требует текущую definition revision;
- definition и memberships изменяются в одной транзакции, если одна команда
  содержит обе операции.

Проверить каждый путь записи:

- `create`;
- `update`;
- `updateWithMemberships`;
- `addCustomers`;
- `removeCustomers`;
- `replaceCustomers`;
- `replaceManualMembershipsForCustomer`;
- операции dynamic materializer после его появления.

## 8. Checkout eligibility repository

### 8.1 Новый repository

Добавить:

```text
services/customers/src/repositories/checkout/
  CustomerCheckoutEligibilityRepository.ts
```

Зарегистрировать его в:

```text
services/customers/src/repositories/Repository.ts
```

Предлагаемая read model:

```ts
export interface CustomerCheckoutEligibilityReadModel {
  customer: Readonly<{
    id: string;
    lifecycleStatus: Customer["lifecycleStatus"];
  }>;
  memberships: readonly Readonly<{
    membershipId: string;
    segmentId: string;
    source: CustomerSegmentMembership["source"];
    evaluatedAt: string;
    expiresAt: string | null;
    definitionRevision: number | null;
  }>[];
}
```

Метод:

```ts
resolveBuyerEligibility(input: {
  customerId: string;
  effectiveAt: string;
}): Promise<CustomerCheckoutEligibilityReadModel | null>;
```

`storeId` намеренно отсутствует во входе repository. Repository получает его
из доверенного Customers `ServiceContext` через `BaseRepository.storeId`.

### 8.2 Условия выборки

Read должен использовать согласованный database snapshot и tenant predicates
для каждой таблицы:

```text
customer.store_id = context.store.id
customer.id = customerId
customer.deleted_at IS NULL

membership.store_id = customer.store_id
membership.customer_id = customer.id
membership.evaluated_at <= effectiveAt
membership.expires_at IS NULL OR membership.expires_at > effectiveAt

segment.store_id = membership.store_id
segment.id = membership.segment_id
segment.status = ACTIVE
segment.deleted_at IS NULL
```

Для `RULE` membership дополнительно:

```text
membership.evaluated_definition_revision = segment.definition_revision
```

Использовать `LEFT JOIN` либо два чтения в одной read-only transaction.
Customer без активных сегментов должен отличаться от отсутствующего Customer.

Сортировать результат на database boundary по `segmentId`, затем по
`membershipId`. Application layer повторно сортирует данные перед хешированием
и возвратом как defensive measure.

## 9. Детерминированная eligibility revision

Добавить:

```text
services/customers/src/checkout-pipeline/eligibilityRevision.ts
```

### 9.1 Canonical payload

Формировать versioned payload из точных строк, использованных read model:

```ts
{
  version: 1,
  customerId,
  memberships: [
    {
      membershipId,
      segmentId,
      source,
      evaluatedAt,
      expiresAt,
      definitionRevision
    }
  ]
}
```

Правила:

- сортировать memberships по `segmentId`, затем по `membershipId`;
- сериализовать ключи объектов в фиксированном порядке;
- отсутствующие optional values нормализовать в `null`;
- вычислять SHA-256 от UTF-8 canonical JSON;
- возвращать строку `sha256:<lowercase hex>`;
- не включать wall-clock time, request ID или `effectiveAt` в hash.

`effectiveAt` определяет, какие строки попали в snapshot, но не является
eligibility fact. Его включение создавало бы новую revision на каждом
перерасчёте даже при неизменных данных.

### 9.2 Обязательные свойства

- одинаковые source rows дают одинаковую revision;
- порядок строк не влияет на revision;
- пустой список memberships имеет валидную стабильную revision;
- создание, удаление, замена и изменение expiry меняют revision;
- изменение dynamic definition меняет revision после rematerialization;
- несвязанное изменение Customer profile не меняет revision.

Utility остаётся локальной для Customers. Не импортировать private utility из
Checkout и не создавать отдельный shared package только ради hashing.

## 10. Application layer

Добавить:

```text
services/customers/src/checkout-pipeline/
  ResolveCheckoutBuyerEligibilityScript.ts
```

Script реализует `CustomersCheckoutEligibilityPort` и выполняет:

```text
validated request
  -> eligibility repository
  -> not-found mapping
  -> lifecycle policy
  -> uniqueness + ordering
  -> maximum-size policy
  -> deterministic revision
  -> validated result
```

### 10.1 Success mapping

```ts
{
  ok: true,
  storeId: context.store.id,
  customerId: read.customer.id,
  effectiveAt: params.effectiveAt,
  segmentIds,
  segmentMembershipRevision,
}
```

### 10.2 Failure mapping

| Условие | Результат | Retryable |
| --- | --- | ---: |
| Customer отсутствует/deleted/другой Store | `CUSTOMER_NOT_FOUND` | нет |
| lifecycle не `ACTIVE` | `CUSTOMER_NOT_ELIGIBLE` | нет |
| больше 500 активных сегментов | `BUYER_ELIGIBILITY_LIMIT_EXCEEDED` | нет |
| database/infrastructure exception | `BUYER_ELIGIBILITY_RESOLUTION_FAILED` | да |

Infrastructure exceptions логируются существующим Customers logger. PII и
текст внутреннего исключения не возвращаются в Checkout.

## 11. Boundary schemas

Обновить:

```text
services/customers/src/checkout-pipeline/schemas.ts
```

Необходимые изменения:

- сохранить strict request schema;
- экспортировать request parser;
- описать каждый failure variant отдельно;
- валидировать `CUSTOMER_NOT_ELIGIBLE.reason`;
- сохранить максимум в 500 segment IDs;
- отклонять дубликаты;
- требовать непустую revision;
- проверять точное совпадение identity запроса и успешного ответа;
- использовать `.strict()` для каждого object variant.

Экспортировать одну функцию, которая валидирует result и проверяет его
identity относительно request. Broker handler возвращает только прошедший эту
проверку результат.

## 12. Broker action

Добавить:

```text
services/customers/src/actions/CustomersBrokerActions.ts
services/customers/src/actions/index.ts
```

Целевая форма:

```ts
@Injectable()
export class CustomersBrokerActions extends BrokerActions {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Action(CustomersCheckoutActionNames.resolveBuyerEligibility, {
    readOnly: true,
  })
  @ZodSchema(resolveBuyerEligibilityParamsSchema)
  async resolveCheckoutBuyerEligibility(
    params: Customers.ResolveCheckoutBuyerEligibilityParams,
  ): Promise<Customers.ResolveCheckoutBuyerEligibilityResult> {
    // Enter trusted Customers Store context.
    // Run application script.
    // Parse and return result.
  }
}
```

В `@Action` передаётся unqualified name из
`CustomersCheckoutActionNames`. `ServiceBroker` самостоятельно добавляет
префикс `customers.`. Итоговое имя:

```text
customers.resolveCheckoutBuyerEligibility
```

Зарегистрировать `CustomersBrokerActions` как provider в
`services/customers/src/customers.module.ts`. Не вызывать `broker.register`
вручную: `BrokerActions` выполняет регистрацию при Nest module initialization,
а broker отвечает за cleanup.

### 12.1 Service context

Repository требует доверенный Store-scoped `ServiceContext`. Action должен
войти в Customers context до запуска script, используя существующий
Kernel/context механизм. `storeId` нельзя передавать напрямую в методы
repository.

Payload не должен принимать claimed caller service. Для observability или
будущей авторизации использовать только broker-provided `BrokerCallContext`.

## 13. Интеграция на стороне Checkout

Checkout adapter уже вызывает правильный action:

```text
services/checkout/src/infrastructure/pipeline/BrokerCheckoutAdapters.ts
```

Требуется проверить и обновить только typing/mapping ошибок:

- identity успешного ответа должна совпадать с запросом;
- `CUSTOMER_NOT_FOUND` проходит как non-retryable;
- `CUSTOMER_NOT_ELIGIBLE` проходит как non-retryable;
- `BUYER_ELIGIBILITY_LIMIT_EXCEEDED` проходит как non-retryable;
- declared infrastructure failure остаётся retryable;
- broker throw/transport failure преобразуется в
  `BUYER_ELIGIBILITY_RESOLUTION_FAILED`;
- mismatch ответа остаётся `BUYER_ELIGIBILITY_RESPONSE_INVALID`.

Порядок pipeline менять не нужно. Customers вызывается внутри
`CheckoutRecalculationRequestFactory` до предварительного Pricing.

Не добавлять PII в `CheckoutBuyerEligibilityContext`. В этом scope Customers
передаёт только `segmentIds` и `segmentMembershipRevision`.

## 14. Карта изменений по файлам

| Файл | Изменение |
| --- | --- |
| `packages/broker-types/src/actions/customers.ts` | Расширить failure contract и экспортировать ineligibility reason |
| `services/customers/migrations/domains/0500_classification/0502_classification__segments.sql` | Добавить definition revisions, constraints и checkout index |
| `services/customers/src/repositories/models/classification.ts` | Синхронизировать Drizzle с migration |
| `services/customers/src/repositories/classification/CustomerSegmentRepository.ts` | Реализовать aggregate/definition revision semantics |
| `services/customers/src/scripts/classification/CustomerSegmentUpdateScript.ts` | Определять изменение definition |
| `services/customers/src/repositories/checkout/CustomerCheckoutEligibilityRepository.ts` | Добавить tenant-safe temporal read |
| `services/customers/src/repositories/Repository.ts` | Зарегистрировать новый repository |
| `services/customers/src/checkout-pipeline/contracts.ts` | Синхронизировать Customers application boundary |
| `services/customers/src/checkout-pipeline/schemas.ts` | Валидировать новый union запроса/ответа |
| `services/customers/src/checkout-pipeline/eligibilityRevision.ts` | Добавить canonical SHA-256 revision |
| `services/customers/src/checkout-pipeline/ResolveCheckoutBuyerEligibilityScript.ts` | Реализовать policy и mapping |
| `services/customers/src/actions/CustomersBrokerActions.ts` | Опубликовать broker action |
| `services/customers/src/actions/index.ts` | Экспортировать action provider |
| `services/customers/src/customers.module.ts` | Зарегистрировать provider |
| `services/checkout/src/infrastructure/pipeline/BrokerCheckoutAdapters.ts` | Синхронизировать failure mapping |
| `services/customers/README.md` | Описать checkout responsibility |
| `services/customers/docs/customers-database-schema.md` | Описать revision fields и invariants |

## 15. Последовательность реализации

### Фаза 1. Shared contract

1. Расширить broker failure union.
2. Добавить lifecycle reason type.
3. Обновить Customers request/result schemas.
4. Обновить typings и failure pass-through Checkout adapter.

Результат фазы: producer и consumer используют одну strict boundary.

### Фаза 2. Persistence correctness

1. Добавить `definition_revision` и `evaluated_definition_revision` в
   baseline migration.
2. Обновить Drizzle models.
3. Добавить constraints и checkout read index.
4. Обновить все write paths сегментов и memberships.
5. Описать различие двух revisions.

Результат фазы: stale dynamic membership определяется без выполнения rule во
время checkout.

### Фаза 3. Read model и hashing

1. Добавить checkout eligibility repository.
2. Зарегистрировать его в repository aggregate.
3. Реализовать temporal filtering по `effectiveAt`.
4. Добавить canonical eligibility hashing.
5. Зафиксировать empty-segment behavior и deterministic ordering.

Результат фазы: Customers может построить внутренний детерминированный
eligibility snapshot без broker integration.

### Фаза 4. Application и transport

1. Реализовать `ResolveCheckoutBuyerEligibilityScript`.
2. Добавить lifecycle и failure mapping.
3. Добавить broker action provider.
4. Войти в доверенный Store context.
5. Зарегистрировать provider в `CustomersModule`.
6. Валидировать outgoing result.

Результат фазы: Checkout вызывает fully-qualified action и получает
contract-valid результат.

### Фаза 5. Документация и покрытие

1. Добавить repository, revision, script и action scenarios.
2. Обновить Customers README и database documentation.
3. Проверить logs на PII и утечку внутренних ошибок.
4. Проверить каждый query/join на явный Store scope.

Результат фазы: behavior, invariants и operational boundaries описаны и
покрыты.

## 16. План проверок

### 16.1 Contract и schema scenarios

- валидный request с ISO timestamp и offset;
- пустые или отсутствующие identifiers;
- невалидный timestamp;
- неизвестные поля объекта;
- duplicate segment IDs;
- больше 500 segment IDs;
- identity mismatch успешного ответа;
- неизвестный lifecycle reason;
- retryability, не соответствующая error variant.

### 16.2 Repository scenarios

- active Customer без memberships;
- active Customer с несколькими manual memberships;
- membership с `evaluatedAt === effectiveAt` включается;
- membership, вычисленный после `effectiveAt`, исключается;
- membership с `expiresAt > effectiveAt` включается;
- membership с `expiresAt === effectiveAt` исключается;
- membership без expiry включается;
- `DRAFT`, `ARCHIVED` и deleted segment исключаются;
- stale `RULE` membership исключается;
- актуальный `RULE` membership включается;
- deleted Customer не найден;
- Customer другого Store не раскрывается;
- output ordering детерминирован.

### 16.3 Revision scenarios

- одинаковые source rows всегда дают один hash;
- input row order не влияет на hash;
- пустой список memberships даёт стабильный непустой hash;
- addition/removal membership меняет hash;
- изменение expiry/evaluation timestamp меняет hash;
- изменение dynamic definition revision меняет hash;
- несвязанное изменение Customer profile не меняет hash.

### 16.4 Application policy scenarios

- `ACTIVE` возвращает success;
- каждый non-active lifecycle возвращает правильный reason;
- not found/deleted/wrong Store имеют одинаковое внешнее поведение;
- segment limit является non-retryable failure;
- repository exception санитизируется и становится retryable;
- failures не содержат PII и внутренних error messages.

### 16.5 Broker и Checkout scenarios

- Nest регистрирует `customers.resolveCheckoutBuyerEligibility`;
- action выполняется в правильном Store context;
- Checkout adapter отправляет точный request;
- success попадает в Checkout buyer snapshot;
- business failures остаются non-retryable;
- thrown broker failure становится retryable resolution failure;
- response identity mismatch отклоняется.

Test-файлы добавляются при реализации. Согласно root `AGENTS.md`, не запускать
`test`, `tsc` или build только ради проверки. Для development commands, когда
они действительно потребуются, использовать `shopana-cli` MCP.

## 17. Observability и security checklist

- Логировать action name, duration, outcome code и retryability.
- Не логировать email, телефон, имя, адрес, blocked reason или arbitrary data.
- Не логировать полный broker payload.
- Не получать Store scope из публичного GraphQL input на repository boundary.
- Добавлять Store predicates для Customer, membership и segment relations.
- Возвращать одинаковый not-found result для deleted и cross-Store identity.
- Не добавлять cache в первой реализации.
- Перед будущим caching определить event-driven invalidation.
- В будущих cache keys обязательно включать Store и Customer identity.

## 18. Риски и меры защиты

| Риск | Последствие | Решение |
| --- | --- | --- |
| Dynamic membership устарел | Неправильная discount/payment eligibility | Хранить и сравнивать definition revision |
| Query использует `now()` | Недетерминированный recalculation | Использовать `effectiveAt` во всех temporal predicates |
| Inner join скрывает Customer без сегментов | Ложный `CUSTOMER_NOT_FOUND` | `LEFT JOIN` или два read в одном snapshot |
| Порядок segment IDs нестабилен | Нестабильная revision | Сортировать перед возвратом и hashing |
| Aggregate revision используется как definition revision | Изменение одного Customer затрагивает остальных | Отдельная `definitionRevision` |
| Cross-Store read | Tenant data leak | Store scope на каждой таблице и join |
| DB error возвращается клиенту | Information disclosure | Санитизировать response, детали оставлять в log |
| Dynamic rule выполняется синхронно | Pipeline deadline failures | Читать только materialized memberships |
| Список молча обрезается после 500 | Неправильная eligibility | Явная non-retryable limit failure |

## 19. Definition of Done

Интеграция готова, когда выполнены все условия:

- `customers.resolveCheckoutBuyerEligibility` зарегистрирован Customers Nest
  module;
- Checkout вызывает Customers только для identity с `customerId`;
- action разрешает Customer и сегменты строго внутри одного Store;
- lifecycle policy блокирует non-active Customer до запуска Pricing;
- temporal evaluation использует переданный Checkout `effectiveAt`;
- inactive, deleted, expired и stale dynamic memberships исключаются;
- active Customer без сегментов получает успешный пустой snapshot;
- `segmentIds` уникальны, отсортированы и ограничены;
- `segmentMembershipRevision` стабильна и детерминирована;
- PII не пересекает эту boundary;
- business failures non-retryable, infrastructure failures retryable;
- Checkout adapter отклоняет malformed или mismatched response;
- migration, Drizzle models, write paths и документация описывают одинаковую
  revision semantics;
- добавлено focused coverage tenant isolation, lifecycle, time boundaries,
  dynamic staleness, hashing и broker mapping.

## 20. Ожидаемый итоговый boundary

Для допустимого Customer:

```json
{
  "ok": true,
  "storeId": "019...",
  "customerId": "019...",
  "effectiveAt": "2026-08-02T10:00:00.000Z",
  "segmentIds": ["019...", "019..."],
  "segmentMembershipRevision": "sha256:0123456789abcdef..."
}
```

Для заблокированного Customer:

```json
{
  "ok": false,
  "code": "CUSTOMER_NOT_ELIGIBLE",
  "reason": "BLOCKED",
  "message": "Customer is not eligible for checkout.",
  "retryable": false
}
```

Для инфраструктурного сбоя:

```json
{
  "ok": false,
  "code": "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
  "message": "Buyer eligibility could not be resolved.",
  "retryable": true
}
```

Этого boundary достаточно, чтобы Checkout построил immutable buyer eligibility
context и либо продолжил downstream pipeline, либо остановился до его запуска.
