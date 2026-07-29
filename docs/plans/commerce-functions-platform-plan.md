# Платформа Commerce Functions через broker actions

## Статус документа

Архитектурный и реализационный план первого этапа.

На этом этапе фиксируются:

- место Commerce Functions в архитектуре Shopana;
- общий каталог targets;
- ownership функций;
- общий executor и runner;
- discovery и вызов App providers;
- порядок выполнения, ошибки, наблюдаемость и rollout.

На этом этапе намеренно **не фиксируются**:

- точные input/output contracts каждого target;
- полный набор операций, возвращаемых каждым target;
- GraphQL API управления функциями;
- окончательная модель Pricing Quote;
- формулы скидок, allocation и rounding отдельных типов скидок.

Контракты конкретных функций должны проектироваться отдельно, поверх общего
механизма исполнения.

## Цель

Создать Shopify-подобную платформу расширения commerce pipeline, в которой
native-подсистемы Shopana и установленные Apps могут влиять на корзину, цену,
доставку, оплату и validation через стандартные function targets.

Функции исполняются только через существующий `ServiceBroker`.
WASM, отдельный sandbox runtime и загрузка пользовательского кода во время
запроса не используются.

Главный принцип:

> Function provider вычисляет и возвращает декларативный результат, а
> владеющий домен проверяет, разрешает конфликты и применяет этот результат.

App не получает право самостоятельно изменять checkout, pricing tables или
итоговую сумму заказа.

## Основные архитектурные решения

### 1. Не создавать отдельный `functions` microservice

Commerce Functions являются механизмом расширения нескольких bounded contexts,
а не новым владельцем commerce data.

Владельцами остаются:

- `pricing` — цены, скидки, allocations, денежные totals и Pricing Quote;
- `catalog` — товары, варианты и конфигурация bundles;
- `checkout` — состояние checkout и checkout validation;
- `delivery` — способы доставки и delivery constraints;
- `payments` — способы оплаты;
- `apps` — installations, capability routes и безопасный запуск App actions.

Общий runner поставляется как package и используется нужными сервисами.

### 2. Разделить executor и runner

Должны существовать два разных компонента.

#### `BrokerFunctionExecutor`

Отвечает за один invocation одного provider:

- получает подготовленный route;
- вызывает native broker action или `apps.executeCapability`;
- передаёт correlation/deadline context;
- измеряет duration;
- нормализует success/failure;
- не знает бизнес-смысла результата;
- не применяет операции.

#### `CommerceFunctionRunner`

Отвечает за выполнение target целиком:

- принимает target и opaque input;
- получает список native и App routes;
- формирует immutable execution plan;
- запускает providers с ограниченным параллелизмом;
- собирает результаты;
- восстанавливает стабильный порядок;
- применяет общую failure policy;
- возвращает outputs и execution trace вызывающему домену.

Runner не рассчитывает деньги, не модифицирует checkout и не разрешает
доменные конфликты.

### 3. Apps service остаётся единственной точкой запуска Apps

Нельзя вызывать `apps.<appCode>.<action>` напрямую из pricing, checkout,
delivery или payments.

App route исполняется только так:

1. `apps.listCapabilityRoutes`;
2. выбор route по `installationId`;
3. `apps.executeCapability`;
4. `AppsRuntimeRouter`;
5. `ServiceBroker.callAsApp`.

Таким образом сохраняются:

- installation context;
- granted scopes;
- app version;
- correlation context;
- проверка manifest external contracts;
- запрет App самостоятельно выдавать себя за platform caller.

### 4. Один capability namespace

Для Commerce Functions использовать один App capability:

```text
commerce.function
```

Operation contract внутри capability равен target:

```text
cart.transform.run
cart.lines.discounts.generate.run
cart.delivery-options.transform.run
```

Пример manifest без фиксации payload contracts:

```ts
{
  key: "commerce.function",
  assignmentMode: "store",
  operations: {
    "cart.transform.run": "cartTransformRun",
    "cart.lines.discounts.generate.run": "discountsGenerateRun"
  }
}
```

Для первого этапа функции назначаются на store. `resource` assignments следует
добавлять только тогда, когда появится конкретный сценарий назначения функции
на delivery profile, market, channel или другой ресурс.

### 5. Target принадлежит домену

Общий package может знать имя target и общую execution policy, но только
владеющий сервис:

- строит canonical input;
- валидирует provider output по target-specific schema;
- разрешает конфликты;
- применяет операции;
- формирует итоговое доменное состояние.

Это не позволяет `pricing` превратиться в центральный сервис, знающий правила
delivery, payments и checkout validation.

## Целевая структура

```text
packages/
  function-runner/
    src/
      contracts.ts
      FunctionTargetRegistry.ts
      FunctionRouteResolver.ts
      BrokerFunctionExecutor.ts
      CommerceFunctionRunner.ts
      execution-policy.ts
      trace.ts
      errors.ts

packages/
  broker-types/
    src/actions/
      apps.ts
      functions.ts

services/
  apps/
    src/control-plane/AppsPlatformActions.ts
    src/repositories/capability/AppCapabilityRepository.ts
    src/runtime/AppsRuntimeRouter.ts

  pricing/
    src/functions/
      PricingFunctionPipeline.ts
      pricing-targets.ts
      native-providers.ts
    src/quote/
      PricingQuoteService.ts

  delivery/
    src/functions/
      DeliveryFunctionPipeline.ts
      delivery-targets.ts

  payments/
    src/functions/
      PaymentFunctionPipeline.ts
      payment-targets.ts

  checkout/
    src/functions/
      CheckoutValidationPipeline.ts
      checkout-targets.ts
```

Названия внутренних файлов уточняются во время реализации. Важна граница:
общая механика находится в package, target semantics — в доменных сервисах.

## Общий контракт runner

Пока нужен только общий envelope, не contracts отдельных targets.

Концептуально:

```ts
interface CommerceFunctionRunRequest<TInput = unknown> {
  storeId: string;
  target: CommerceFunctionTarget;
  input: TInput;
  executionId: string;
  correlationId?: string;
  deadlineAt?: string;
}

interface CommerceFunctionRunResult<TOutput = unknown> {
  target: CommerceFunctionTarget;
  outputs: FunctionProviderOutput<TOutput>[];
  trace: CommerceFunctionExecutionTrace;
}
```

`input` и provider `data` остаются `unknown` на общем уровне. Target-specific
pipeline обязан валидировать их своей Zod schema до использования.

Общий envelope должен содержать только инфраструктурные сведения:

- target;
- execution ID;
- provider identity;
- route/installation identity;
- app version для App provider;
- status;
- duration;
- warning/error classification;
- opaque data.

В envelope нельзя помещать money, cart lines, discounts или delivery methods:
это контракты конкретных targets.

## Провайдеры функций

Runner поддерживает два вида providers.

### Native provider

Native provider — обычный broker action платформенного сервиса.

Примеры:

- Catalog предоставляет native bundle transform;
- Pricing предоставляет native promotions;
- Checkout предоставляет native validation;
- Delivery предоставляет native delivery constraints.

Native provider не должен регистрироваться как App installation.
Его route описывается target definition владеющего сервиса.

### App provider

App provider обнаруживается через:

```text
apps.listCapabilityRoutes(
  capability = "commerce.function",
  operation = target
)
```

Каждый route вызывается отдельно с обязательным `installationId` через
`apps.executeCapability`.

## Каталог функций

Имена targets фиксируются как направление архитектуры. Их payload contracts
будут отдельными решениями.

### MVP

| Target | Назначение | Оркестратор | Кто применяет результат |
|---|---|---|---|
| `cart.transform.run` | Bundles, expand/merge/update cart lines | `pricing` | `pricing` в процессе построения quote |
| `cart.lines.discounts.generate.run` | Product и order discount candidates | `pricing` | pricing discount engine |
| `cart.delivery-options.discounts.generate.run` | Скидки на delivery options | `pricing` | pricing discount engine |
| `cart.delivery-options.transform.run` | Hide/rename/reorder delivery options | `delivery` | delivery pipeline |
| `cart.payment-methods.transform.run` | Hide/rename/reorder payment methods | `payments` | payment methods pipeline |
| `cart.validations.generate.run` | Cart и checkout validation errors | `checkout` | checkout command/workflow |

### Следующий этап

| Target | Назначение | Оркестратор | Кто применяет результат |
|---|---|---|---|
| `cart.fulfillment-constraints.generate.run` | Ограничения совместного или location-specific fulfillment | `delivery` | delivery/fulfillment planner |
| `cart.delivery-options.generate.run` | Custom delivery и pickup options | `delivery` | delivery pipeline |
| `order.routing-location-rules.run` | Приоритет location при маршрутизации заказа | `orders` или будущий fulfillment domain | order routing pipeline |

### Пока не добавлять

- Custom discount allocator как App function. В первой версии allocation и
  rounding полностью принадлежат Pricing.
- Custom tax calculator как универсальную функцию. Сначала нужен отдельный
  tax domain и чёткий fiscal contract.
- Функции с прямыми side effects: reserve inventory, charge payment, create
  order, send notification.
- Произвольные lifecycle hooks без конкретного владельца и применения.

Commerce Function должна быть вычислением. Side-effecting операции остаются
обычными actions/workflows/sagas.

## Общий execution flow

```text
Domain pipeline
  |
  | 1. строит canonical target input
  v
CommerceFunctionRunner
  |
  | 2. получает target definition
  | 3. добавляет native routes
  | 4. читает App routes через apps.listCapabilityRoutes
  | 5. фиксирует immutable execution plan
  v
BrokerFunctionExecutor
  |
  | 6a. native: broker.call(service.action)
  | 6b. app: apps.executeCapability(installationId, target)
  v
CommerceFunctionRunner
  |
  | 7. собирает results
  | 8. сортирует в plan order
  | 9. применяет общую failure policy
  | 10. формирует trace
  v
Domain pipeline
  |
  | 11. target-specific validation
  | 12. conflict resolution
  | 13. применение операций
  v
Domain result
```

## Execution plan и детерминизм

Перед вызовом providers runner создаёт immutable execution plan.

Plan должен фиксировать:

- target;
- store ID;
- provider type;
- native action либо App installation ID;
- App code и app version;
- route revision;
- precedence;
- stable sequence;
- failure mode;
- deadline;
- execution ID.

Все providers можно вызывать параллельно, но результаты всегда применяются в
порядке plan, а не в порядке завершения Promise.

Стабильный порядок App routes:

```text
precedence ASC
assignmentCreatedAt ASC
assignmentId ASC
```

Текущий `updatedAt DESC` в `AppCapabilityRepository` нельзя использовать для
Commerce Functions. Обычное обновление assignment не должно менять порядок
расчёта.

`listCapabilityRoutes` сейчас возвращает только `installationId` и `appCode`.
Для runner его результат нужно расширить как минимум:

- идентификатор assignment/route;
- precedence;
- stable sequence;
- app version;
- route revision.

`executeCapability` должен принимать ожидаемую route revision/app version или
другой compare-and-run token. Это защищает один execution plan от смешивания
версий при одновременном update/suspend App.

Так как проект не требует backward compatibility, broker types и callers
следует изменить напрямую без временного V1/V2 API.

## Target registry

`FunctionTargetRegistry` — статический реестр поддерживаемых targets.
Он не является пользовательским registry в БД.

Target definition содержит только инфраструктурную политику:

- target name;
- owning service;
- execution mode;
- native provider routes;
- default timeout/deadline;
- concurrency limit;
- failure policy;
- допускаются ли несколько App providers;
- максимальный размер input/output envelope;
- trace redaction policy.

Registry не содержит бизнес-логику функции и не применяет её output.

Неизвестный target должен отклоняться до route discovery. App не может
объявлением в manifest создать новый системный target.

## Execution modes

Общий runner должен поддержать два режима, даже если MVP в основном использует
первый.

### `COLLECT_ALL`

Вызываются все активные providers. Результаты возвращаются владельцу target.

Используется для:

- transforms;
- discounts;
- validations;
- constraints.

### `SINGLE`

Исполняется один выбранный route по precedence/assignment.

Подходит для эксклюзивного provider scenario, если такой появится. Не следует
использовать `SINGLE` для скидок, потому что несколько Apps должны иметь
возможность вернуть candidates.

`FIRST_SUCCESS` пока не добавлять: он усложняет детерминизм и может скрывать
ошибки конфигурации.

## Failure policy

Runner нормализует технические failures, но не решает бизнес-ошибки.

Базовые режимы:

- `REQUIRED` — failure provider прерывает target execution;
- `OPTIONAL` — failure фиксируется в trace, provider output пропускается;
- `DISABLED` — route присутствует в конфигурации, но не включается в plan.

Native provider по умолчанию `REQUIRED`.
Политика App provider задаётся target definition и позже может быть дополнена
store configuration.

Нельзя молча использовать старый checkout discount snapshot как fallback при
ошибке Pricing. Это создаёт недетерминированную цену. Quote должен либо успешно
пересчитаться по текущему plan, либо завершиться контролируемой ошибкой.

Ошибки разделяются минимум на:

- route unavailable;
- timeout/deadline exceeded;
- App runtime unavailable;
- authorization/scope error;
- provider exception;
- invalid provider output;
- stale execution plan;
- output size limit;
- domain rejection после возврата runner.

## Timeout и отмена

Обычный `Promise.race` не останавливает выполняющийся action. Поэтому timeout
runner означает только прекращение ожидания и классификацию результата.

До появления реальной cooperative cancellation:

- function actions обязаны быть pure/read-only относительно commerce state;
- нельзя выполнять в них charge, reservation или domain writes;
- input должен содержать deadline;
- provider должен проверять deadline перед дорогими внешними вызовами;
- повторный запуск с тем же execution ID должен быть безопасным;
- поздний result не должен применяться после закрытия execution plan.

Если ServiceBroker позже получит `AbortSignal`, executor сможет использовать
его без изменения target contracts.

## Security

- Runner вызывается только platform service.
- `apps.listCapabilityRoutes` и `apps.executeCapability` продолжают отклонять
  вызовы из App context.
- App получает только canonical input конкретного target.
- App не получает внутренние repositories или raw checkout aggregate.
- Доступ App к дополнительным данным происходит через разрешённый
  `AppBrokerFacade` и granted scopes.
- `storeId`, caller identity и installation context нельзя доверять из App
  payload.
- Output каждой App проходит target-specific validation.
- На input/output вводятся size и depth limits.
- Trace не должен сохранять secrets, personal data или полный payload по
  умолчанию.

Без WASM это trusted backend extension model: установленный App code считается
доверенным кодом deployment, но его commerce result всё равно недоверенный до
валидации владеющим доменом.

## Observability

Каждый запуск получает `executionId` и `correlationId`.

Минимальные trace fields:

- target;
- store ID;
- owner service;
- start/end/duration;
- execution plan revision;
- provider type;
- installation ID/App code/App version для App;
- native action для platform provider;
- precedence и sequence;
- success/failure/status;
- error class и безопасный error code;
- input/output byte size;
- deadline status.

Метрики:

- calls и duration по target/provider;
- provider failures;
- invalid outputs;
- deadline exceeded;
- stale plan;
- число providers на execution;
- skipped optional providers;
- quote calculation failures.

Полные function payloads не логируются. Для диагностики можно хранить
редактированный digest/hash и target-specific summary.

## Pricing pipeline

Первой полноценной интеграцией runner должен стать новый pricing calculation
action.

Концептуальный поток:

```text
checkout
  -> pricing.calculateQuote
       -> resolve base merchandise data
       -> cart.transform.run
       -> apply validated transforms
       -> cart.lines.discounts.generate.run
       -> select/combine candidates
       -> allocate discounts
       -> include selected delivery cost when available
       -> cart.delivery-options.discounts.generate.run
       -> calculate totals
       -> return immutable quote
```

Pricing знает о влияющих на цену подсистемах не через imports или общую БД, а
через:

1. явно заданные native providers target definition;
2. App providers из `apps.listCapabilityRoutes`;
3. canonical snapshots, которые Pricing получает через broker read actions;
4. фиксированный порядок stages Pricing pipeline.

Новый provider не требует изменения Checkout. Он подключается к известному
target через manifest и assignment.

Новая категория влияния на цену требует нового target или изменения
target-specific contract и поэтому является осознанным изменением платформы.

## Bundles

Конфигурация bundle остаётся в `catalog`.

В первом этапе:

- Catalog предоставляет native provider для `cart.transform.run`;
- Pricing передаёт canonical cart input;
- Catalog возвращает opaque transform result по будущему target contract;
- Pricing валидирует и применяет transform к расчётному представлению cart;
- Checkout сохраняет исходные пользовательские линии и/или рассчитанный
  snapshot согласно будущей модели quote, но не рассчитывает bundle prices.

Custom App может участвовать в том же target, однако Pricing остаётся
единственным владельцем денежных вычислений и проверок.

## Checkout, Delivery и Payments orchestration

Checkout координирует пользовательский flow, но не исполняет всю function
семантику самостоятельно.

Рекомендуемый порядок:

```text
1. Checkout получает/изменяет cart intent
2. Pricing строит quote и выполняет cart/discount targets
3. Delivery получает или генерирует delivery options
4. Delivery выполняет delivery transform
5. Pricing пересчитывает delivery discounts и final totals
6. Payments получает methods и выполняет payment transform
7. Checkout выполняет validation
8. DBOS checkout workflow использует зафиксированные snapshots
```

DBOS применяется для durable checkout/order/payment orchestration.
Runner сам по себе не является workflow и не должен превращать каждый
синхронный quote calculation в отдельный durable workflow.

## Удаление legacy checkout pricing

Текущее положение:

- `CheckoutCostService` рассчитывает subtotal/discount/grand total внутри
  `checkout`;
- он вызывает legacy `PricingApiClient.evaluateDiscounts`;
- при ошибке Pricing используется fallback из `appliedDiscounts`;
- line-level discounts фактически не применяются;
- bundle child pricing частично находится в checkout domain.

Целевое положение:

- денежный расчёт полностью выполняет `pricing`;
- Checkout вызывает единый pricing quote action;
- Checkout хранит/проецирует полученный immutable cost snapshot;
- legacy `CheckoutCostService` удаляется;
- `PricingApiClient.evaluateDiscounts` и соответствующие legacy broker types
  удаляются;
- fallback на ранее применённые discounts удаляется;
- дублирующие discount arithmetic и totals из checkout удаляются;
- compatibility adapter не создаётся;
- backfill не выполняется.

Удаление legacy следует делать после подключения нового quote path ко всем
checkout mutations, меняющим цену.

## Этапы реализации

### Этап 0. Зафиксировать ADR

1. Утвердить термины `Commerce Function`, `target`, `provider`, `executor`,
   `runner`, `domain applicator`.
2. Утвердить отсутствие WASM и отдельного functions service.
3. Утвердить capability `commerce.function`.
4. Утвердить MVP target list и ownership.
5. Утвердить принцип pure computation/no side effects.

Результат: короткий architecture decision в knowledge base.

### Этап 1. Общий package

1. Создать `packages/function-runner`.
2. Добавить generic request/result/trace envelopes.
3. Добавить `FunctionTargetRegistry`.
4. Добавить route/provider abstractions.
5. Реализовать `BrokerFunctionExecutor`.
6. Реализовать `CommerceFunctionRunner`.
7. Добавить concurrency limit, deadline classification и failure policy.
8. Экспортировать Nest provider/module factory при необходимости.
9. Добавить broker types без target-specific payloads.

Результат: runner можно вызвать с opaque input и получить упорядоченные opaque
outputs.

### Этап 2. Усилить Apps capability routing

1. Расширить `apps.listCapabilityRoutes` route metadata.
2. Удалить `updatedAt` из порядка Commerce Function routes.
3. Добавить stable sequence.
4. Добавить route revision/version token.
5. Сделать `apps.executeCapability` compare-and-run для immutable plan.
6. Добавить размерные ограничения и безопасные error codes.
7. Сохранить обязательный путь через `AppsRuntimeRouter.callAsApp`.

Результат: один function execution не смешивает routes и App versions.

### Этап 3. Pricing skeleton

1. Создать `PricingFunctionPipeline`.
2. Зарегистрировать pricing-owned targets.
3. Добавить native provider descriptors.
4. Создать новый broker action `pricing.calculateQuote`.
5. Пока использовать минимальную внутреннюю quote model.
6. Подключить `cart.transform.run`.
7. Подключить `cart.lines.discounts.generate.run`.
8. Подключить `cart.delivery-options.discounts.generate.run`.
9. Добавить trace в pricing logs/metrics.

Результат: все источники влияния на денежный результат проходят через Pricing
pipeline и общий runner.

### Этап 4. Native bundles

1. Добавить catalog native broker action для cart transform.
2. Подключить его как required native provider.
3. Перенести применение bundle pricing из Checkout в Pricing.
4. Проверить nested bundles, quantity и currency invariants на уровне Pricing.

Результат: bundle pricing больше не рассчитывается legacy-кодом Checkout.

### Этап 5. Переключить Checkout

1. Все price-affecting checkout commands переводятся на
   `pricing.calculateQuote`.
2. Quote/cost snapshots попадают в checkout commands/events.
3. Удаляется fallback на старые discounts.
4. Удаляется `CheckoutCostService`.
5. Удаляется legacy Pricing API `evaluateDiscounts`.
6. Удаляется дублирующая арифметика Checkout.

Результат: Pricing является единственным владельцем денежных расчётов.

### Этап 6. Delivery, Payments и Validation

1. Подключить `DeliveryFunctionPipeline`.
2. Подключить delivery options transform.
3. Подключить `PaymentFunctionPipeline`.
4. Подключить payment methods transform.
5. Подключить `CheckoutValidationPipeline`.
6. Встроить stages в checkout workflow в определённом порядке.

Результат: общий runner используется всеми commerce domains без переноса
domain ownership.

### Этап 7. App authoring и Admin

1. Добавить target constants/types в App SDK.
2. Добавить manifest validation известных targets.
3. Показывать function bindings и precedence в Admin.
4. Добавить enable/disable и failure policy, если это потребуется merchant UI.
5. Добавить execution trace view без sensitive payloads.
6. Подготовить example App с двумя targets.

Результат: App developer может подключить функцию без знания внутреннего
Pricing/Checkout кода.

## Проверка реализации

Для каждого этапа нужны проверки следующих свойств:

- неизвестный target отклоняется;
- App не может вызвать platform-only discovery/execution;
- inactive/suspended installation не попадает в plan;
- route order стабилен и не зависит от Promise completion;
- изменение `updatedAt` не меняет порядок;
- App update во время execution даёт stale-plan failure, а не mixed version;
- optional provider failure отражается в trace;
- required provider failure прерывает execution;
- late result после deadline не применяется;
- malformed output отклоняется доменным validator;
- App не может напрямую задать final total;
- повторный расчёт одного input на одном plan детерминирован;
- bundles и discounts рассчитываются в Pricing, а не в Checkout;
- checkout не использует legacy discount fallback.

Проверки выполняются штатными средствами `shopana-cli`. Build запускается
только когда для проверки нужна новая собранная версия.

## Критерии готовности платформенного слоя

Платформенный слой можно считать готовым, когда:

1. Есть единый target registry.
2. `BrokerFunctionExecutor` вызывает один native или App provider.
3. `CommerceFunctionRunner` исполняет immutable multi-provider plan.
4. App routes имеют стабильный порядок и version guard.
5. Runner возвращает opaque outputs и полный безопасный trace.
6. Ни runner, ни Apps service не содержат pricing/checkout business logic.
7. Первый pricing target работает с native и App provider одновременно.
8. Checkout получает цену только из нового Pricing quote path.
9. Legacy checkout calculation удалён без compatibility layer.

## Отдельные решения, которые потребуются позже

После реализации общего runner нужны отдельные документы:

1. Contract `cart.transform.run`.
2. Contract discount generation targets.
3. Discount combination, allocation и rounding policy.
4. Pricing Quote model и его versioning.
5. Delivery/payment transform contracts.
6. Validation severity и checkout stages.
7. Function limits, merchant configuration и billing/usage model.
8. Replay/debugging policy для function executions.

