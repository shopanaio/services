# Что нужно закончить в backend

Статическая инвентаризация Admin, Storefront и внутренних API.

## apps

- [ ] Проверить восстановление install/update/uninstall после restart.
- [ ] Проверить конкурентные lifecycle-операции.
- [ ] Завершить production-ротацию secrets.
- [ ] Добавить readiness app runtime и subgraph registry.
- [ ] Покрыть timeout и недоступность app runtime.

## bootstrap

- [ ] Подключить Loyalty после реализации runtime.
- [ ] Добавить общую readiness-проверку сервисов.
- [ ] Запрещать startup без обязательных production secrets/adapters.
- [ ] Закрыть test action proxy для production.

## catalog

- [ ] Реализовать low-stock alerts.
- [ ] Добавить rebuild/reconciliation для Listing index.
- [ ] Покрыть конкурентные stock reservations и oversell.
- [ ] Покрыть delete lifecycle связанных сущностей.

## checkout

- [ ] Реализовать `Query.checkoutPlacement`.
- [ ] Реализовать `Mutation.checkoutBillingAddressUpdate`.
- [ ] Завершить user context или удалить неиспользуемый путь.
- [ ] Добавить Admin API для просмотра и восстановления checkout либо явно отказаться от него.
- [ ] Добавить cleanup abandoned checkout и reservations.
- [ ] Покрыть replay, stale version и provider timeout.

## customers

- [ ] Запустить Storefront GraphQL runtime.
- [ ] Реализовать `Query.customer`.
- [ ] Реализовать обновление customer profile.
- [ ] Реализовать CRUD и default customer addresses.
- [ ] Реализовать marketing consent.
- [ ] Реализовать customer data requests.
- [ ] Реализовать customer tax identifiers.
- [ ] Реализовать wishlists.
- [ ] Реализовать product comparison.
- [ ] Завершить merge/delete/privacy cleanup.
- [ ] Добавить Admin и Storefront E2E.

## delivery

- [ ] Реализовать `createDeliveryShipment`.
- [ ] Реализовать `cancelDeliveryShipment`.
- [ ] Реализовать `getDeliveryShipment`.
- [ ] Реализовать `reconcileDeliveryShipment`.
- [ ] Реализовать `completeDeliveryProviderOperation`.
- [ ] Реализовать `reportDeliveryProviderEvent`.
- [ ] Добавить shipment persistence и workflows.
- [ ] Добавить tracking и provider event deduplication.
- [ ] Добавить reconciliation scheduler.
- [ ] Добавить Admin API для delivery configuration и shipments либо определить другого владельца.

## events

- [ ] Покрыть retry, DLQ, duplicate delivery и batch dispatch.
- [ ] Добавить метрики очередей и handlers.
- [ ] Зафиксировать retention и cleanup policy.
- [ ] Решить, нужен ли Admin API для просмотра и replay событий.

## iam

- [ ] Реализовать `userUpdateEmail`.
- [ ] Реализовать `userUpdatePassword`.
- [ ] Реализовать `Role.__resolveReference`.
- [ ] Реализовать `User.locale`.
- [ ] Реализовать `User.isForbidden`.
- [ ] Реализовать `User.isDeleted`.
- [ ] Прокидывать `sessionId` во все нужные actions.
- [ ] Подключить production email, rate-limit, audit и keyring adapters.
- [ ] Завершить cache invalidation.
- [ ] Покрыть credential и user lifecycle E2E.

## listing

- [ ] Реализовать `ListingQuery.node`.
- [ ] Реализовать `ListingQuery.nodes`.
- [ ] Добавить полный и incremental rebuild index.
- [ ] Добавить reconciliation с Catalog.
- [ ] Покрыть stale и out-of-order events.
- [ ] Покрыть cursor pagination при изменении price, rank и stock.
- [ ] Зафиксировать performance release gate.

## loyalty

- [ ] Реализовать repositories и runtime module.
- [ ] Подключить сервис в Bootstrap.
- [ ] Реализовать весь Admin GraphQL.
- [ ] Реализовать `Customer.loyaltyAccount`.
- [ ] Реализовать `Product.loyalty`.
- [ ] Реализовать `ProductVariant.loyalty`.
- [ ] Реализовать loyalty opportunities и rewards.
- [ ] Реализовать points ledger и balance projection.
- [ ] Реализовать programs, versions, rules и tiers.
- [ ] Реализовать earn, redeem, reserve, release, expire и reverse.
- [ ] Реализовать Checkout broker actions.
- [ ] Реализовать customer/order/store event handlers.
- [ ] Добавить scheduled expiration и reconciliation.
- [ ] Добавить полный Admin, Storefront и workflow E2E.

## media

- [ ] Покрыть Storefront media и tenant isolation.
- [ ] Покрыть interrupted и duplicate uploads.
- [ ] Покрыть полный deletion workflow.
- [ ] Завершить production S3/CDN security.
- [ ] Определить malware/content validation.
- [ ] Добавить GC metrics и reconciliation.
- [ ] Проверить backrefs всех сервисов.

## notifications

- [ ] Описать строгие payload schemas для 51 notification definitions.
- [ ] Описать template variables для этих definitions.
- [ ] Добавить versioning notification contracts и templates.
- [ ] Валидировать payload до enqueue.
- [ ] Подключить production email и SMS providers.
- [ ] Завершить webhook signing и rotation.
- [ ] Реализовать retry, deduplication и reconciliation.
- [ ] Реализовать bounce, complaint и suppression lifecycle.
- [ ] Завершить PII encryption, retention и erasure.

## orders

- [ ] Реализовать Admin `OrderQuery.orders`.
- [ ] Реализовать filtering, sorting и pagination.
- [ ] Реализовать authorization списка заказов.
- [ ] Заполнить все поля Admin `Order`.
- [ ] Исправить Storefront Query resolver registry.
- [ ] Реализовать Storefront `Query.order`.
- [ ] Реализовать `Query.orderReturnRequest`.
- [ ] Реализовать `Customer.orders`.
- [ ] Реализовать `orderCancel`.
- [ ] Реализовать `orderReorder`.
- [ ] Реализовать `orderReturnRequestCreate`.
- [ ] Реализовать `orderReturnRequestCancel`.
- [ ] Реализовать `orderPaymentRetry`.
- [ ] Заполнить все обязательные Storefront `Order` и `OrderLine` fields.
- [ ] Реализовать delivery, fulfillment, payment, refund и return projections.
- [ ] Добавить Admin и Storefront E2E.

## payments

- [ ] Реализовать `cancelPayment`.
- [ ] Реализовать `capturePayment`.
- [ ] Реализовать `voidPayment`.
- [ ] Реализовать `refundPayment`.
- [ ] Реализовать `reconcilePayment`.
- [ ] Реализовать `completeProviderOperation`.
- [ ] Реализовать `reportPaymentProviderEvent`.
- [ ] Добавить operation journal и workflows.
- [ ] Реализовать partial capture и refund.
- [ ] Добавить reconciliation scheduler.
- [ ] Добавить Admin API либо определить владельца payment management.
- [ ] Добавить provider lifecycle E2E.

## pricing

- [ ] Добавить полноценные Admin GraphQL E2E.
- [ ] Покрыть preliminary/final pricing parity.
- [ ] Покрыть usage reserve, commit, release и reverse.
- [ ] Покрыть stacking, schedules, segments, channels и currencies.
- [ ] Добавить reconciliation зависших usage reservations.
- [ ] Убрать dual source of truth между Pricing и Catalog.

## project

- [ ] Покрыть Storefront market selection.
- [ ] Покрыть locale и currency default transitions.
- [ ] Покрыть store lifecycle compensation.
- [ ] Завершить cache invalidation.
- [ ] Проверить provisioning/deprovisioning всех сервисов.
- [ ] Покрыть media backrefs.

## reviews

- [ ] Добавить полноценные Admin и Storefront E2E.
- [ ] Покрыть guest/customer submissions и moderation modes.
- [ ] Покрыть verified purchase.
- [ ] Покрыть rating criteria и summary recalculation.
- [ ] Покрыть votes, reports и subscriptions.
- [ ] Покрыть concurrent moderation.
- [ ] Завершить privacy erasure и media cleanup.
- [ ] Добавить reconciliation summaries.
- [ ] Интегрировать Loyalty rewards после реализации Loyalty.

## Общее для всех сервисов

- [ ] Проверять Admin и Storefront federation composition.
- [ ] Проверять SDL без resolver и resolver без SDL.
- [ ] Покрыть все federation references.
- [ ] Завершить RBAC и tenant isolation.
- [ ] Завершить idempotency и concurrency policy.
- [ ] Добавить workflow recovery и compensation.
- [ ] Добавить event replay и read-model rebuild.
- [ ] Убрать PII и secrets из logs/errors/workflows.
- [ ] Добавить health, readiness и metrics.
- [ ] Добавить E2E: success, validation, forbidden, cross-tenant, replay, stale revision и timeout.
