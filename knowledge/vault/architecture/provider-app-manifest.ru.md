---
tags:
  - architecture
  - apps
  - delivery
  - payments
related:
  - architecture/decisions
  - architecture/multi-tenancy
---

# Provider Apps: границы и поля manifest

## Назначение

Этот документ определяет границу App для интеграций с внешними перевозчиками
и платёжными провайдерами, а также семантику каждого поля `app.manifest.ts`.

Канонические контракты находятся в:

- `packages/app-sdk/src/index.ts` — общая схема `AppManifestV2`;
- `packages/broker-types/src/actions/delivery.ts` — delivery capabilities и operations;
- `packages/broker-types/src/actions/payments.ts` — payments capability и operations.

Если документация расходится с TypeScript/Zod-контрактом, источником истины
является контракт.

## Архитектурная граница

Используется правило:

> Один внешний провайдер с независимыми credentials и lifecycle — один App.

Примеры отдельных Apps:

- `nova-poshta`;
- `meest`;
- `ukrposhta`;
- `liqpay`;
- `monobank-acquiring`;
- `wayforpay`;
- `fondy`.

Один delivery App может реализовывать обе связанные capability одного
перевозчика:

- `delivery.carrier-service` — discovery, расчёт вариантов и сбор выбора в
  checkout;
- `delivery.shipment-provider` — создание и сопровождение отправления после
  оформления заказа.

Не следует объединять разных перевозчиков или платёжных провайдеров в один
runtime App. Такое объединение связывает credentials, версии, health,
permissions, установку и отключение независимых интеграций. Связанные бренды с
разными API и рисками также разделяются: например, `nova-poshta` отвечает за
доставку, а `novapay` — за оплату.

Общий UX «Украинские интеграции» реализуется как категория каталога или мастер
установки нескольких Apps. Общий технический код выносится в shared packages,
но это не меняет границы установки.

## Полный справочник `AppManifestV2`

Manifest создаётся через `defineAppManifest`. Схема строгая: неизвестные поля
не допускаются.

| Поле | Тип | Обязательность | Семантика и ограничения |
| --- | --- | --- | --- |
| `schemaVersion` | `2` | обязательное | Версия структуры manifest. Для новых Apps используется только `2`. Это не версия App и не версия provider protocol. |
| `code` | `string` | обязательное | Стабильный машинный идентификатор App. Формат: lowercase kebab-case, начинается с буквы; regex `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`. Не содержит страну, если интеграция не является отдельным региональным продуктом. Не переименовывается между релизами. |
| `version` | `string` | обязательное | Версия сборки App в SemVer, например `1.0.0` или `1.2.0-beta.1`. Изменение provider protocol не заменяет изменение этого поля. |
| `displayName` | `string` | обязательное | Непустое отображаемое имя для Admin UI и каталога Apps. Пробелы по краям удаляются. |
| `description` | `string` | обязательное | Непустое краткое описание назначения интеграции. Должно описывать пользовательскую пользу, а не внутреннюю реализацию. |
| `icon` | `AppIcon` | обязательное | Иконка App для Admin UI. Поля описаны ниже. |
| `lifecycle` | `AppLifecycle` | опциональное | Имена workflow/action, реализующих жизненный цикл установки. По умолчанию `{}`. Поля описаны ниже. |
| `permissions` | `string[]` | опциональное | Outbound contracts, которые App просит разрешить вызывать. По умолчанию `[]`. Это allowlist запрашиваемых scopes, а не факт выдачи доступа. |
| `capabilities` | `AppCapability[]` | опциональное | Возможности и маршруты, предоставляемые App платформе. По умолчанию `[]`. Поля capability описаны ниже. |
| `graphql` | `AppGraphQLManifest` | опциональное | GraphQL surfaces, предоставляемые App. По умолчанию `{ admin: false, storefront: false }`. |

### `icon`

| Поле | Тип | Обязательность | Семантика и ограничения |
| --- | --- | --- | --- |
| `icon.url` | `string` | обязательное | Непустой URL длиной до 2048 символов. Для bundled Apps используется стабильный путь вида `/app-icons/nova-poshta.svg`. |
| `icon.alt` | `string` | обязательное | Непустой альтернативный текст длиной до 255 символов. Описывает бренд или App и не дублирует декоративные подробности изображения. |

### `lifecycle`

Все lifecycle-поля опциональны и содержат непустое имя зарегистрированного
workflow или action. Имя в manifest должно точно совпадать с именем,
зарегистрированным App через broker.

| Поле | Исполнитель | Семантика |
| --- | --- | --- |
| `lifecycle.installWorkflow` | workflow | Установка и первичная инициализация App для конкретного store. Получает конфигурацию установки и выполняется durably. |
| `lifecycle.updateWorkflow` | workflow | Переход существующей установки на `version` текущего manifest и применение новой конфигурации. |
| `lifecycle.suspendAction` | action | Временная остановка использования установки без удаления её данных и secrets. |
| `lifecycle.resumeAction` | action | Возобновление ранее приостановленной установки. |
| `lifecycle.uninstallWorkflow` | workflow | Durable cleanup при удалении установки. Не должен удалять данные других Apps или stores. |
| `lifecycle.healthAction` | action | Проверка здоровья конкретной установки и её зависимости от provider API/configuration. Не заменяет process-level метод `ShopanaApp.health()`. |

Workflow используется для install/update/uninstall, потому что эти операции
могут быть продолжительными и требуют durable execution. Suspend/resume/health
являются actions и должны завершаться быстро.

### `permissions`

Каждый элемент массива — полностью квалифицированный outbound contract или
разрешённый service scope. App может вызвать чужой service contract только
когда permission одновременно:

1. объявлен в manifest;
2. выдан конкретной установке как `grantedScope`.

Вызовы собственного namespace `apps.<app-code>.*` не требуют outbound
permission. Следует запрашивать минимальный набор прав.

Для полностью синхронного provider App допустимо `permissions: []`. Если App
асинхронно завершает операции или сообщает provider events, используются
соответствующие platform contracts:

- delivery: `delivery.completeDeliveryProviderOperation` и
  `delivery.reportDeliveryProviderEvent`;
- payments: `payments.completeProviderOperation` и
  `payments.reportPaymentProviderEvent`.

Наличие permission не означает, что App обязана поддерживать асинхронную
работу: фактическая поддержка объявляется результатом provider configuration
validation.

### `capabilities[]`

Один App может объявить несколько capabilities одного провайдера. Каждый
элемент массива имеет следующие поля.

| Поле | Тип | Обязательность | Семантика |
| --- | --- | --- | --- |
| `capabilities[].key` | `string` | обязательное | Стабильный platform contract capability, например `payments.provider`. Это не `appCode`, не `providerCode` и не произвольный feature flag. |
| `capabilities[].assignmentMode` | `"store" \| "resource"` | опциональное | Область назначения маршрута. При отсутствии используется `store`. Provider Apps используют `store`. |
| `capabilities[].routingMode` | `"single" \| "broadcast"` | опциональное | Discovery cardinality. `single` обозначает выбор одного маршрута; `broadcast` позволяет вызывающей стороне перечислить маршруты и явно обратиться к каждому. Это не скрытый автоматический fan-out одного mutating вызова. Provider-specific контракт определяет, требуется ли поле. |
| `capabilities[].operations` | `Record<string, string>` | обязательное | Отображение `platform operation contract -> App action`. Ключ — имя операции, ожидаемое платформой; значение — непустое имя action, зарегистрированного App. |

`assignmentMode: "store"` означает, что capability доступна установке в рамках
store. `assignmentMode: "resource"` требует явного назначения на platform
resource и предназначен, например, для sales channel, но не для delivery или
payments providers.

#### `delivery.carrier-service.operations`

Capability обязана иметь `assignmentMode: "store"` и
`routingMode: "broadcast"`.

| Поле | Обязательность | Семантика |
| --- | --- | --- |
| `validateCarrierServiceConfiguration` | обязательное | Проверяет configuration/secrets и возвращает provider identity, readiness, поддерживаемые страны, валюты, operations и revision. |
| `quoteRates` | обязательное | Рассчитывает доступные delivery rates для конкретного checkout request. Результат должен быть детерминирован относительно входных facts и revision. |
| `resolveCustomerInput` | обязательное | Валидирует и нормализует выбранные покупателем provider-specific данные, например отделение или почтомат. |
| `searchCustomerInputOptions` | опциональное | Выполняет серверный поиск provider-specific вариантов выбора с pagination, например отделений по строке поиска. Объявляется только при реальной поддержке. |

#### `delivery.shipment-provider.operations`

Capability обязана иметь `assignmentMode: "store"` и
`routingMode: "broadcast"`.

| Поле | Обязательность | Семантика |
| --- | --- | --- |
| `validateShipmentConfiguration` | обязательное | Проверяет готовность configuration/secrets для post-order shipment operations. |
| `createShipment` | обязательное | Создаёт отправление у перевозчика с idempotency и возвращает provider reference/status. |
| `cancelShipment` | опциональное | Отменяет созданное отправление, если provider поддерживает отмену. |
| `getShipment` | опциональное | Получает актуальное состояние конкретного отправления. |
| `reconcileShipment` | опциональное | Сверяет сохранённое платформой состояние с authoritative state перевозчика. |

Carrier-service и shipment-provider разделены намеренно: магазин может
использовать расчёт тарифов перевозчика без передачи ему fulfillment либо
использовать отдельную стратегию расчёта и создание отправлений через provider.

#### `payments.provider.operations`

Capability обязана иметь `assignmentMode: "store"`. Mutating operation всегда
маршрутизируется к installation, закреплённой в payment session.

| Поле | Обязательность | Семантика |
| --- | --- | --- |
| `validateConfiguration` | обязательное | Проверяет configuration/secrets и возвращает provider identity, readiness, режимы, capabilities и revision. |
| `getMethods` | обязательное | Возвращает доступные способы оплаты для конкретного checkout context. Discovery может выполняться для нескольких установок. |
| `createPayment` | обязательное | Создаёт provider payment для закреплённой payment session. Обязан поддерживать idempotency. |
| `confirmPayment` | опциональное | Подтверждает payment после customer action или отдельного шага provider flow. |
| `cancel` | опциональное | Отменяет ещё не завершённый payment flow. |
| `capture` | опциональное | Списывает ранее авторизованную сумму. Наличие и ограничения должны соответствовать возвращённым provider capabilities. |
| `void` | опциональное | Аннулирует авторизацию до settlement/capture, если это поддерживает provider. |
| `refund` | опциональное | Выполняет полный или частичный возврат. Возможность partial/multiple refund объявляется provider capabilities. |
| `reconcile` | опциональное | Сверяет локальное состояние payment с authoritative state провайдера. |

Опциональную operation запрещено объявлять как заглушку «not supported».
Отсутствие поддержки выражается отсутствием поля и соответствующим значением
provider capabilities.

### `graphql`

| Поле | Тип | Default | Семантика |
| --- | --- | --- | --- |
| `graphql.admin` | `boolean` | `false` | App предоставляет собственное расширение Admin GraphQL schema и зарегистрированные handlers. Включается только если provider App действительно имеет отдельный Admin API. |
| `graphql.storefront` | `boolean` | `false` | App предоставляет собственное расширение Storefront GraphQL schema. Provider capabilities сами по себе не требуют включения этого surface. |

Обычный provider App взаимодействует с checkout через capabilities, поэтому
может оставить оба поля `false`. Экран конфигурации App в Admin не является сам
по себе основанием включать storefront surface.

## Рекомендуемые manifest-шаблоны

### Delivery provider

```ts
import { defineAppManifest } from "@shopana/app-sdk";

export const novaPoshtaManifest = defineAppManifest({
  schemaVersion: 2,
  code: "nova-poshta",
  version: "1.0.0",
  displayName: "Nova Poshta",
  description: "Rates, pickup points, shipments, and tracking through Nova Poshta.",
  icon: {
    url: "/app-icons/nova-poshta.svg",
    alt: "Nova Poshta",
  },
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [
    "delivery.completeDeliveryProviderOperation",
    "delivery.reportDeliveryProviderEvent",
  ],
  capabilities: [
    {
      key: "delivery.carrier-service",
      assignmentMode: "store",
      routingMode: "broadcast",
      operations: {
        validateCarrierServiceConfiguration:
          "validateCarrierServiceConfiguration",
        quoteRates: "quoteRates",
        resolveCustomerInput: "resolveCustomerInput",
        searchCustomerInputOptions: "searchCustomerInputOptions",
      },
    },
    {
      key: "delivery.shipment-provider",
      assignmentMode: "store",
      routingMode: "broadcast",
      operations: {
        validateShipmentConfiguration: "validateShipmentConfiguration",
        createShipment: "createShipment",
        cancelShipment: "cancelShipment",
        getShipment: "getShipment",
        reconcileShipment: "reconcileShipment",
      },
    },
  ],
  graphql: { admin: false, storefront: false },
});
```

Permissions для async completion/events необходимо удалить, если App не
вызывает эти contracts.

### Payment provider

```ts
import { defineAppManifest } from "@shopana/app-sdk";

export const liqPayManifest = defineAppManifest({
  schemaVersion: 2,
  code: "liqpay",
  version: "1.0.0",
  displayName: "LiqPay",
  description: "Online payments and refunds through LiqPay.",
  icon: {
    url: "/app-icons/liqpay.svg",
    alt: "LiqPay",
  },
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [
    "payments.completeProviderOperation",
    "payments.reportPaymentProviderEvent",
  ],
  capabilities: [
    {
      key: "payments.provider",
      assignmentMode: "store",
      operations: {
        validateConfiguration: "validateConfiguration",
        getMethods: "getMethods",
        createPayment: "createPayment",
        confirmPayment: "confirmPayment",
        cancel: "cancel",
        capture: "capture",
        void: "void",
        refund: "refund",
        reconcile: "reconcile",
      },
    },
  ],
  graphql: { admin: false, storefront: false },
});
```

Шаблон показывает полный набор operations. Конкретный App обязан удалить все
неподдерживаемые опциональные operations.

## Review checklist

- `code` соответствует одному внешнему провайдеру и не меняется между версиями.
- `version` является валидным SemVer.
- Icon существует, а `alt` имеет самостоятельный смысл.
- Каждое lifecycle/action имя зарегистрировано runtime App.
- В `permissions` нет scopes, которые App не использует.
- Delivery и payments используют только `assignmentMode: "store"`.
- Каждая operation ссылается на реально зарегистрированный action.
- Неподдерживаемые опциональные operations отсутствуют.
- Delivery App не смешивает разных перевозчиков.
- Payment App не смешивает разных процессоров.
- Secrets не находятся в manifest, configuration, logs или provider account
  snapshots; они принадлежат installation secret store.
- `graphql.admin` и `graphql.storefront` включены только при наличии
  соответствующей schema и handlers.
