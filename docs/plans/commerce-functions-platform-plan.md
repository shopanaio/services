# Commerce Extension Platform и Commerce Functions через broker actions

## Статус документа

Архитектурный и реализационный план платформы расширений commerce backend.

На этом этапе фиксируются:

- граница между Commerce Functions и другими типами App extensions;
- место Commerce Functions в архитектуре Shopana;
- полный Shopify-подобный каталог function targets и порядок их исполнения;
- ownership функций;
- общий executor и runner;
- discovery и вызов App function implementations;
- порядок выполнения, ошибки, наблюдаемость и rollout.

На этом этапе намеренно **не фиксируются**:

- точные input/output contracts каждого target;
- полный набор операций, возвращаемых каждым target;
- GraphQL API управления функциями;
- окончательная модель Pricing Quote;
- формулы скидок, allocation и rounding отдельных типов скидок.
- полные контракты payment, delivery, fulfillment и tax providers;
- runtime и delivery-модель UI extensions;
- визуальный редактор automation workflows.

Контракты конкретных функций должны проектироваться отдельно, поверх общего
механизма исполнения.

## Цель

Создать Shopify-подобную платформу расширения Shopana, в которой разные виды
расширений имеют разные семантику:

- **Functions** синхронно возвращают декларативные operations внутри
  platform-owned commerce pipeline;
- **Providers** реализуют выбранную внешнюю подсистему: payment gateway,
  delivery carrier, fulfillment service или tax engine;
- **Event subscriptions** асинхронно реагируют на уже зафиксированные domain
  events;
- **Automation triggers/actions** участвуют в durable workflows;
- **UI extensions** добавляют интерфейс в разрешённые Admin, Storefront,
  Checkout и Customer Account surfaces.

Этот документ подробно проектирует Commerce Functions и фиксирует их место в
общей extension platform. Он не должен превращать все App actions в Functions.

Функции исполняются только через существующий `ServiceBroker`.
WASM, отдельный sandbox runtime и загрузка пользовательского кода во время
запроса не используются.

Главный принцип:

> Function implementation вычисляет и возвращает декларативный результат, а
> владеющий домен проверяет, разрешает конфликты и применяет этот результат.

App function не получает право самостоятельно изменять checkout, pricing
tables, inventory, order или итоговую сумму заказа.

## Граница Commerce Functions

Shopify Functions расширяют преимущественно синхронный purchase/checkout loop:
cart transform, discounts, fulfillment constraints, order routing, delivery,
payment methods и validation. Остальные части Shopify расширяются не
Functions, а payment extensions, fulfillment services, APIs/webhooks, Flow,
UI extensions, metafields/metaobjects и другими механизмами.

В Shopana принимается такая же граница.

### Что является Function

Function подходит, когда:

- платформа должна принять решение внутри текущей синхронной операции;
- несколько native/App implementations могут внести предложения;
- результат можно выразить декларативными operations;
- только владеющий домен применяет итог;
- повторный запуск на одинаковом input и execution plan даёт одинаковый
  результат;
- implementation не выполняет необратимых side effects.

### Что не является Function

Следующие интеграции являются отдельными extension kinds:

| Extension kind | Примеры | Execution semantics |
|---|---|---|
| `provider` | LiqPay, Stripe, Nova Poshta, Meest, 3PL, tax engine | Выбранный implementation выполняет protocol-specific command |
| `eventSubscription` | экспорт оплаченного заказа в ERP, analytics, CRM sync | Асинхронно после commit, durable delivery |
| `automationTrigger` | App сообщает событие для workflow | Запускает DBOS workflow |
| `automationAction` | начислить баллы, поставить order hold, отправить сообщение | Side effect как контролируемый workflow step |
| `ui` | Admin block, checkout block, customer account page | Исполняется на конкретной UI surface |

Например:

- скрыть наложенный платёж — Function
  `cart.payment-methods.transform.run`;
- провести платёж через LiqPay — provider action `payments.charge`;
- отправить `orders.paid` в ERP — `eventSubscription`;
- начислить loyalty points после оплаты — `automationAction`;
- показать loyalty balance в Admin — `ui`.

Термин `provider` далее не используется для implementation функции, чтобы не
смешивать её с payment/delivery/fulfillment provider extensions.

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

Отвечает за один invocation одной function implementation:

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
- запускает implementations с ограниченным параллелизмом;
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

### 4. Один capability namespace для Functions

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

Capability route подтверждает, что installation технически умеет выполнить
target, но сам по себе не включает бизнес-правило для store.

Активация и конфигурация описываются отдельным function binding, связанным с
domain owner. Для простых глобальных transforms owner может быть store. Для
discount function owner — конкретная discount definition. Для delivery или
payment customization owner — соответствующая customization entity.

`commerce.function` нельзя использовать для других extension kinds. Они
получают отдельные capability namespaces и contracts:

```text
payments.provider
delivery.provider
fulfillment.provider
tax.provider
automation.action
```

Event subscriptions используют event topics, а UI extensions — UI target
registry. Они не обнаруживаются через `commerce.function`.

Концептуальная manifest-модель:

```ts
{
  extensions: [
    {
      kind: "function",
      capability: "commerce.function",
      target: "cart.lines.discounts.generate.run",
      action: "generateDiscounts"
    },
    {
      kind: "provider",
      capability: "payments.provider",
      operations: {
        authorize: "authorizePayment",
        capture: "capturePayment",
        refund: "refundPayment"
      }
    },
    {
      kind: "eventSubscription",
      topic: "orders.paid",
      action: "exportPaidOrder"
    },
    {
      kind: "automationAction",
      key: "loyalty.add-points",
      action: "addLoyaltyPoints"
    },
    {
      kind: "ui",
      target: "admin.customer.details.block",
      module: "customerLoyaltyBlock"
    }
  ]
}
```

Точная общая manifest schema проектируется отдельно. В function-runner
используется только extension kind `function`.

### 5. Target принадлежит домену

Общий package может знать имя target и общую execution policy, но только
владеющий сервис:

- строит canonical input;
- валидирует implementation output по target-specific schema;
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
      FunctionImplementation.ts
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
      native-implementations.ts
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
  bindings: readonly CommerceFunctionBindingRef[];
  bindingSetRevision: string;
  input: TInput;
  executionId: string;
  correlationId?: string;
  deadlineAt?: string;
}

interface CommerceFunctionRunResult<TOutput = unknown> {
  target: CommerceFunctionTarget;
  outputs: FunctionImplementationOutput<TOutput>[];
  trace: CommerceFunctionExecutionTrace;
}
```

Владеющий домен разрешает active bindings до вызова runner. Runner проверяет
их capability routes и revisions, добавляет native implementations из target
definition и фиксирует immutable plan.

`input` и implementation `data` остаются `unknown` на общем уровне.
Target-specific pipeline обязан валидировать их своей Zod schema до
использования.

Общий envelope должен содержать только инфраструктурные сведения:

- target;
- execution ID;
- implementation identity;
- route/installation identity;
- app version для App implementation;
- binding/owner/configuration revisions;
- status;
- duration;
- warning/error classification;
- opaque data.

В envelope нельзя помещать money, cart lines, discounts или delivery methods:
это контракты конкретных targets.

## Implementations функций

Runner поддерживает два вида implementations.

### Native implementation

Native implementation — обычный broker action платформенного сервиса.

Примеры:

- Catalog предоставляет native bundle transform;
- Pricing предоставляет native promotions;
- Checkout предоставляет native validation;
- Delivery предоставляет native delivery constraints.

Native implementation не должен регистрироваться как App installation.
Его route описывается target definition владеющего сервиса.

### App implementation

App implementation обнаруживается через:

```text
apps.listCapabilityRoutes(
  capability = "commerce.function",
  operation = target
)
```

Каждый route вызывается отдельно с обязательным `installationId` через
`apps.executeCapability`.

## Function definition, owner и binding

Shopify разделяет код Function и объект-владелец её конфигурации. Например,
discount function поставляется App, но merchant создаёт отдельный discount,
который хранит конфигурацию и ссылается на эту function.

Shopana должна разделять три сущности.

### Function definition

Статическое объявление App manifest:

- App и version;
- target;
- action;
- supported contract version;
- требуемые scopes;
- configuration schema reference.

Definition отвечает на вопрос: «что эта версия App умеет выполнять?».

### Function owner

Доменная сущность, поведение которой расширяется:

- discount definition в `pricing`;
- cart transform configuration;
- delivery customization;
- payment customization;
- validation rule set;
- routing rule set.

Owner хранится у владеющего домена. Apps service не должен становиться
владельцем discount, payment или delivery configuration.

### Function binding

Активная связь owner с implementation:

```ts
interface CommerceFunctionBinding {
  id: string;
  storeId: string;
  target: CommerceFunctionTarget;
  owner: {
    service: string;
    resourceType: string;
    resourceId: string;
  };
  installationId: string;
  functionKey: string;
  precedence: number;
  activationSequence: number;
  status: "ACTIVE" | "DISABLED";
  configurationRevision: string;
  routeRevision: string;
}
```

Binding отвечает на вопрос: «какая implementation с какой конфигурацией
активна для этого domain owner?».

Одна App implementation может иметь несколько bindings. Например, один action
`generateDiscounts` обслуживает несколько discount definitions с разными
условиями.

### Discovery binding

Execution planning разделяется на два шага:

1. Владеющий домен разрешает active owners/bindings для текущего контекста.
2. Apps service подтверждает, что installation/version всё ещё предоставляет
   capability route для target и action.

`apps.listCapabilityRoutes` не должен автоматически превращать все capability
routes в активные discount/customization rules. Для store-global target
domain может создать один store-owned binding при включении App, но это явная
конфигурация, а не скрытое поведение discovery.

Canonical input одной implementation содержит безопасный snapshot
конфигурации binding либо app-owned configuration reference, разрешённый
владеющим доменом. App не читает configuration напрямую из чужой domain DB.

## Каталог Commerce Functions

Имена Shopana targets нормализуются вокруг изменяемого commerce resource.
Payload contracts будут отдельными решениями.

Shopify на текущем Function API имеет следующие группы:

- Cart and Checkout Validation;
- Cart Transform;
- Delivery Customization;
- Discount;
- Fulfillment Constraints;
- Order Routing Location Rule;
- Payment Customization;
- Local Pickup Delivery Option Generator;
- Pickup Point Delivery Option Generator;
- Discounts Allocator в developer preview.

Shopana покрывает тот же commerce loop, но не обязана сохранять legacy
Shopify namespace `purchase.*`.

### Core targets

| Shopana target | Shopify analogue | Назначение | Оркестратор | Кто применяет результат |
|---|---|---|---|---|
| `cart.transform.run` | `cart.transform.run` | Bundles, expand/merge/update cart lines | `pricing` | Pricing quote pipeline |
| `cart.lines.discounts.generate.run` | тот же target | Product и order discount candidates | `pricing` | pricing discount engine |
| `cart.delivery-options.discounts.generate.run` | тот же target | Discount candidates для доставки | `pricing` | pricing discount engine |
| `cart.fulfillment-constraints.generate.run` | тот же target | Fulfill-from и fulfill-together constraints | `delivery` | fulfillment planner |
| `cart.fulfillment-groups.location-rankings.generate.run` | тот же target | Ранжирование складов/locations | `orders` или будущий fulfillment domain | order routing pipeline |
| `cart.delivery-options.transform.run` | тот же target | Hide/move/rename delivery options | `delivery` | delivery pipeline |
| `cart.local-pickup-options.generate.run` | `purchase.local-pickup-delivery-option-generator.run` | Варианты самовывоза из locations | `delivery` | delivery pipeline |
| `cart.pickup-point-options.generate.run` | `purchase.pickup-point-delivery-option-generator.run` | Отделения, почтоматы и сторонние pickup points | `delivery` | delivery pipeline |
| `cart.payment-methods.transform.run` | тот же target | Hide/move/rename payment methods | `payments` | payment methods pipeline |
| `cart.validations.generate.run` | тот же target | Cart/checkout validation operations | `checkout` | checkout command/workflow |

### Experimental target

| Shopana target | Shopify analogue | Назначение | Execution mode | Решение |
|---|---|---|---|---|
| `cart.discounts.allocate.run` | `purchase.discounts-allocator.run` | Кастомные combination/allocation rules и ограничения скидок | `SINGLE` | Зарезервировать имя, не реализовывать в MVP |

Shopify Discounts Allocator находится в developer preview и допускает максимум
одну allocator function на store. В Shopana первая версия allocation, caps,
rounding и порядок применения полностью принадлежат Pricing. Target можно
включить только после стабилизации Pricing Quote и discount combination model.

### Rollout каталога

#### MVP-A: Pricing migration

- `cart.transform.run`;
- `cart.lines.discounts.generate.run`;
- `cart.delivery-options.discounts.generate.run`.

#### MVP-B: Checkout completion

- `cart.delivery-options.transform.run`;
- `cart.payment-methods.transform.run`;
- `cart.validations.generate.run`.

#### Phase 2: Fulfillment and pickup

- `cart.fulfillment-constraints.generate.run`;
- `cart.fulfillment-groups.location-rankings.generate.run`;
- `cart.local-pickup-options.generate.run`;
- `cart.pickup-point-options.generate.run`.

#### Phase 3: Advanced discount control

- `cart.discounts.allocate.run`, только после отдельного ADR.

### Намеренно не добавлять как универсальные Functions

- Custom tax calculator. Это `tax.provider` с fiscal lifecycle
  quote/commit/refund, а не multi-implementation Function.
- Payment authorization/capture/refund. Это `payments.provider`.
- Delivery shipment create/cancel/track. Это `delivery.provider`.
- Fulfillment accept/reject/ship. Это `fulfillment.provider`.
- Inventory reservation, order creation, notification и ERP export.
  Это actions/workflows/event subscriptions с side effects.
- Произвольные lifecycle hooks без конкретного owner и operation contract.

Commerce Function должна быть вычислением. Side-effecting операции остаются
обычными actions/workflows/sagas.

## Общий execution flow

```text
Domain pipeline
  |
  | 1. разрешает active owners/bindings и строит canonical target input
  v
CommerceFunctionRunner
  |
  | 2. получает target definition
  | 3. добавляет native routes
  | 4. проверяет App binding routes через apps.listCapabilityRoutes
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

Перед вызовом implementations runner создаёт immutable execution plan.

Plan должен фиксировать:

- target;
- store ID;
- implementation type;
- function binding ID;
- domain owner reference;
- native action либо App installation ID;
- App code и app version;
- route revision;
- configuration revision;
- precedence;
- activation sequence;
- failure mode;
- deadline;
- execution ID.

Все implementations можно вызывать параллельно, но результаты всегда
применяются в порядке plan, а не в порядке завершения Promise.

Стабильный порядок App bindings:

```text
precedence ASC
activationSequence ASC
functionBindingId ASC
```

Текущий `updatedAt DESC` в `AppCapabilityRepository` нельзя использовать для
порядка Commerce Functions. Обычное обновление route или assignment не должно
менять порядок расчёта; его определяет immutable activation sequence binding.

`listCapabilityRoutes` сейчас возвращает только `installationId` и `appCode`.
Для проверки implementation route его результат нужно расширить как минимум:

- идентификатор capability route;
- app version;
- route revision.

Binding metadata — precedence, activation sequence, owner и configuration
revision — приходит от владеющего домена, а не вычисляется Apps service.

`executeCapability` должен принимать ожидаемую route revision/app version,
function binding ID и configuration revision либо единый compare-and-run
token. Это защищает один execution plan от смешивания versions/configurations
при одновременном update, disable или suspend App.

Так как проект не требует backward compatibility, broker types и callers
следует изменить напрямую без временного V1/V2 API.

## Target registry

`FunctionTargetRegistry` — статический реестр поддерживаемых targets.
Он не является пользовательским registry в БД.

Target definition содержит только инфраструктурную политику:

- target name;
- owning service;
- execution mode;
- native implementation routes;
- default timeout/deadline;
- concurrency limit;
- failure policy;
- допускаются ли несколько App implementations;
- максимальный размер input/output envelope;
- trace redaction policy.

Registry не содержит бизнес-логику функции и не применяет её output.

Неизвестный target должен отклоняться до route discovery. App не может
объявлением в manifest создать новый системный target.

## Execution modes

Общий runner должен поддержать два режима, даже если MVP в основном использует
первый.

### `COLLECT_ALL`

Вызываются все активные implementations. Результаты возвращаются владельцу
target.

Используется для:

- transforms;
- discounts;
- validations;
- constraints.

### `SINGLE`

Исполняется один выбранный binding по precedence/activation sequence.

Подходит для target, где разрешена ровно одна implementation. Первый
зарезервированный сценарий — `cart.discounts.allocate.run`.

Не следует использовать `SINGLE` для discount generation, потому что несколько
Apps должны иметь возможность вернуть candidates.

`FIRST_SUCCESS` пока не добавлять: он усложняет детерминизм и может скрывать
ошибки конфигурации.

## Failure policy

Runner нормализует технические failures, но не решает бизнес-ошибки.

Базовые режимы:

- `REQUIRED` — failure implementation прерывает target execution;
- `OPTIONAL` — failure фиксируется в trace, implementation output пропускается;
- `DISABLED` — route присутствует в конфигурации, но не включается в plan.

Native implementation по умолчанию `REQUIRED`.
Политика App implementation задаётся target definition и позже может быть
дополнена store configuration.

Нельзя молча использовать старый checkout discount snapshot как fallback при
ошибке Pricing. Это создаёт недетерминированную цену. Quote должен либо успешно
пересчитаться по текущему plan, либо завершиться контролируемой ошибкой.

Ошибки разделяются минимум на:

- route unavailable;
- timeout/deadline exceeded;
- App runtime unavailable;
- authorization/scope error;
- implementation exception;
- invalid implementation output;
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
- implementation должна проверять deadline перед дорогими внешними вызовами;
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
- implementation type;
- installation ID/App code/App version для App;
- native action для platform implementation;
- precedence и sequence;
- success/failure/status;
- error class и безопасный error code;
- input/output byte size;
- deadline status.

Метрики:

- calls и duration по target/implementation;
- implementation failures;
- invalid outputs;
- deadline exceeded;
- stale plan;
- число implementations на execution;
- skipped optional implementations;
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

1. явно заданные native implementations target definition;
2. App implementations из `apps.listCapabilityRoutes`;
3. canonical snapshots, которые Pricing получает через broker read actions;
4. фиксированный порядок stages Pricing pipeline.

Новая App implementation не требует изменения Checkout. Она подключается к
известному target через manifest и assignment.

Новая категория влияния на цену требует нового target или изменения
target-specific contract и поэтому является осознанным изменением платформы.

## Bundles

Конфигурация bundle остаётся в `catalog`.

В первом этапе:

- Catalog предоставляет native implementation для `cart.transform.run`;
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
2. Pricing разрешает merchandise snapshot и выполняет cart.transform.run
3. Pricing выполняет cart.lines.discounts.generate.run
4. Pricing применяет combination policy и line/order allocations
5. Delivery выполняет cart.fulfillment-constraints.generate.run
6. Fulfillment/Orders выполняет
   cart.fulfillment-groups.location-rankings.generate.run
7. Delivery получает carrier rates через delivery providers
8. Delivery выполняет local-pickup и pickup-point generators
9. Delivery выполняет cart.delivery-options.transform.run
10. Pricing выполняет cart.delivery-options.discounts.generate.run
11. Tax provider, когда появится tax domain, рассчитывает fiscal amounts
12. Pricing фиксирует final monetary totals
13. Payments получает methods от payment providers
14. Payments выполняет cart.payment-methods.transform.run
15. Checkout выполняет cart.validations.generate.run
16. DBOS checkout workflow использует зафиксированные snapshots
```

Зависимости stages являются частью platform contract:

- transforms предшествуют line discounts;
- constraints и location rankings работают с уже трансформированными lines;
- delivery generators предшествуют delivery customization;
- delivery discounts работают с итоговым набором delivery options;
- payment customization видит final payable amount;
- validation получает результаты всех предыдущих stages.

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

1. Утвердить термины `Commerce Function`, `target`, `implementation`,
   `executor`, `runner`, `domain applicator`.
2. Утвердить отсутствие WASM и отдельного functions service.
3. Утвердить capability `commerce.function`.
4. Утвердить границу Functions, Providers, Event subscriptions, Automations и
   UI extensions.
5. Утвердить полный target catalog, rollout groups и ownership.
6. Утвердить принцип pure computation/no side effects.

Результат: короткий architecture decision в knowledge base.

### Этап 1. Общий package

1. Создать `packages/function-runner`.
2. Добавить generic request/result/trace envelopes.
3. Добавить `FunctionTargetRegistry`.
4. Добавить route/implementation abstractions.
5. Реализовать `BrokerFunctionExecutor`.
6. Реализовать `CommerceFunctionRunner`.
7. Добавить concurrency limit, deadline classification и failure policy.
8. Экспортировать Nest module/provider factory при необходимости.
9. Добавить broker types без target-specific payloads.

Результат: runner можно вызвать с opaque input и получить упорядоченные opaque
outputs.

### Этап 2. Усилить Apps capability routing

1. Расширить `apps.listCapabilityRoutes` route metadata.
2. Удалить `updatedAt` из порядка Commerce Function routes.
3. Добавить route revision/version token.
4. Сделать `apps.executeCapability` compare-and-run для immutable plan.
5. Добавить размерные ограничения и безопасные error codes.
6. Сохранить обязательный путь через `AppsRuntimeRouter.callAsApp`.

Результат: один function execution не смешивает routes и App versions.

### Этап 3. Function owners и bindings

1. Добавить общие binding identity/revision contracts.
2. Не создавать общую таблицу с domain configuration в Apps service.
3. Реализовать store-owned binding для первого global target.
4. Реализовать pricing-owned binding для discount definition.
5. Добавить precedence и immutable activation sequence.
6. Добавить resolution active owners/bindings перед route verification.
7. Передавать binding/configuration snapshot в target canonical input.
8. Инвалидировать execution plan при изменении route или configuration
   revision.

Результат: manifest capability, active rule и domain configuration являются
разными сущностями.

### Этап 4. Pricing skeleton

1. Создать `PricingFunctionPipeline`.
2. Зарегистрировать pricing-owned targets.
3. Добавить native implementation descriptors.
4. Создать новый broker action `pricing.calculateQuote`.
5. Пока использовать минимальную внутреннюю quote model.
6. Подключить `cart.transform.run`.
7. Подключить `cart.lines.discounts.generate.run`.
8. Подключить `cart.delivery-options.discounts.generate.run`.
9. Добавить trace в pricing logs/metrics.

Результат: все источники влияния на денежный результат проходят через Pricing
pipeline и общий runner.

### Этап 5. Native bundles

1. Добавить catalog native broker action для cart transform.
2. Подключить его как required native implementation.
3. Перенести применение bundle pricing из Checkout в Pricing.
4. Проверить nested bundles, quantity и currency invariants на уровне Pricing.

Результат: bundle pricing больше не рассчитывается legacy-кодом Checkout.

### Этап 6. Переключить Checkout

1. Все price-affecting checkout commands переводятся на
   `pricing.calculateQuote`.
2. Quote/cost snapshots попадают в checkout commands/events.
3. Удаляется fallback на старые discounts.
4. Удаляется `CheckoutCostService`.
5. Удаляется legacy Pricing API `evaluateDiscounts`.
6. Удаляется дублирующая арифметика Checkout.

Результат: Pricing является единственным владельцем денежных расчётов.

### Этап 7. Delivery, Payments и Validation

1. Подключить `DeliveryFunctionPipeline`.
2. Подключить `cart.delivery-options.transform.run`.
3. Подключить `PaymentFunctionPipeline`.
4. Подключить `cart.payment-methods.transform.run`.
5. Подключить `CheckoutValidationPipeline`.
6. Подключить `cart.validations.generate.run`.
7. Встроить stages в checkout workflow в определённом порядке.

Результат: core checkout function loop использует общий runner без переноса
domain ownership.

### Этап 8. Fulfillment routing и pickup

1. Добавить canonical fulfillment groups и location snapshots.
2. Подключить `cart.fulfillment-constraints.generate.run`.
3. Подключить
   `cart.fulfillment-groups.location-rankings.generate.run`.
4. Утвердить владельца order routing: `orders` либо будущий fulfillment
   bounded context.
5. Подключить `cart.local-pickup-options.generate.run`.
6. Подключить `cart.pickup-point-options.generate.run`.
7. Разделить delivery provider rates и declarative generator Functions.
8. Встроить новые stages до delivery customization.

Результат: полный Shopify-подобный function pipeline покрывает fulfillment
planning, order routing и pickup.

### Этап 9. App authoring и Admin

1. Добавить target constants/types в App SDK.
2. Добавить manifest validation известных targets.
3. Показывать function bindings и precedence в Admin.
4. Добавить enable/disable и failure policy, если это потребуется merchant UI.
5. Добавить execution trace view без sensitive payloads.
6. Подготовить example App с несколькими targets из разных domains.
7. Показывать extension kind отдельно от capability, чтобы Function не
   смешивалась с provider/event/automation/UI extension.

Результат: App developer может подключить функцию без знания внутреннего
Pricing/Checkout кода.

### Этап 10. Advanced discount allocator

1. Отдельно спроектировать discount combination и allocation model.
2. Зафиксировать, какие Pricing invariants allocator не может нарушать.
3. Добавить `cart.discounts.allocate.run` как `SINGLE`.
4. Разрешить максимум одну активную App implementation на store.
5. Использовать native Pricing allocator, когда App allocator не назначен.
   Технический failure назначенного allocator должен завершать расчёт ошибкой.
6. Добавить отдельные limits и trace для monetary allocations.

Результат: allocator расширяет политику распределения скидок, но не получает
право самостоятельно задавать quote totals.

## Проверка реализации

Для каждого этапа нужны проверки следующих свойств:

- неизвестный target отклоняется;
- App не может вызвать platform-only discovery/execution;
- inactive/suspended installation не попадает в plan;
- capability route без active function binding не исполняется;
- несколько bindings одной implementation получают каждый свой configuration
  snapshot;
- изменение configuration revision делает старый execution plan stale;
- route order стабилен и не зависит от Promise completion;
- изменение `updatedAt` не меняет порядок;
- App update во время execution даёт stale-plan failure, а не mixed version;
- optional implementation failure отражается в trace;
- required implementation failure прерывает execution;
- late result после deadline не применяется;
- malformed output отклоняется доменным validator;
- App не может напрямую задать final total;
- Function не может выполнить payment, inventory, order или notification side
  effect;
- provider, event, automation и UI extensions не обнаруживаются через
  `commerce.function`;
- `SINGLE` target отклоняет более одной активной App implementation;
- повторный расчёт одного input на одном plan детерминирован;
- bundles и discounts рассчитываются в Pricing, а не в Checkout;
- checkout не использует legacy discount fallback.

Проверки выполняются штатными средствами `shopana-cli`. Build запускается
только когда для проверки нужна новая собранная версия.

## Критерии готовности платформенного слоя

Foundation Commerce Functions можно считать готовым, когда:

1. Есть единый target registry.
2. `BrokerFunctionExecutor` вызывает одну native или App implementation.
3. `CommerceFunctionRunner` исполняет immutable multi-implementation plan.
4. App routes имеют стабильный порядок и version guard.
5. Definition, domain owner и function binding разделены.
6. Execution plan фиксирует route и configuration revisions.
7. Runner возвращает opaque outputs и полный безопасный trace.
8. Ни runner, ни Apps service не содержат pricing/checkout business logic.
9. Первый pricing target работает с native и App implementation одновременно.
10. Checkout получает цену только из нового Pricing quote path.
11. Legacy checkout calculation удалён без compatibility layer.

Полный Commerce Functions loop можно считать готовым, когда дополнительно:

1. Реализованы все core targets из каталога.
2. Checkout stages выполняются в зафиксированном порядке.
3. Fulfillment constraints предшествуют order routing.
4. Pickup generators предшествуют delivery customization.
5. Delivery discounts применяются к итоговым delivery options.
6. Payment customization получает final payable amount.
7. Validation видит результаты всех предыдущих stages.
8. Provider/event/automation/UI contracts не смешаны с function-runner.

## Отдельные решения, которые потребуются позже

После реализации общего runner нужны отдельные документы:

1. Contract `cart.transform.run`.
2. Contract discount generation targets.
3. Discount combination, allocation и rounding policy.
4. Pricing Quote model и его versioning.
5. Delivery/payment transform contracts.
6. Validation severity и checkout stages.
7. Fulfillment constraints и order routing contracts.
8. Local pickup и pickup point generator contracts.
9. Function owner/binding persistence для каждого domain.
10. Advanced Discounts Allocator ADR.
11. Function limits, merchant configuration и billing/usage model.
12. Replay/debugging policy для function executions.
13. Payment, delivery, fulfillment и tax provider platform.
14. Event subscriptions и automation extension model.
15. UI extension target registry и runtime.

## Референсы Shopify

- [Shopify Function APIs](https://shopify.dev/docs/api/functions/2026-07)
- [About Shopify Functions](https://shopify.dev/docs/apps/build/functions/index)
- [Standardized Function target names](https://shopify.dev/changelog/standardized-target-and-operation-names-across-function-apis)
- [Discounts Allocator Function API](https://shopify.dev/docs/api/functions/unstable/discounts-allocator)
- [Payments extensions](https://shopify.dev/docs/apps/build/payments)
- [Fulfillment service apps](https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps)
- [Shopify app extension types](https://shopify.dev/docs/apps/build/app-extensions/list-of-app-extensions)
