# Delivery Checkout Action — implementation plan

## Goal

Реализовать `DeliveryCheckoutActions.calculateOptions` как Delivery-owned
pipeline:

`planning → eligibility → rates → customization → bindings → selection`.

## Implementation

1. Добавить provider-side request/result schemas и provenance/revision checks для
   `CalculateCheckoutDeliveryOptionsParams/Result`.
2. Реализовать `DeliveryCheckoutPlanningPort`: построить stable groups из
   preliminary physical lines и destinations, разрешить origins/packages и
   вычислить `ratedFactsHash`/rate-plan revision.
3. Реализовать eligibility read: загрузить active manual methods и carrier
   accounts/routes, применить store/channel/location/weight/value constraints и
   вернуть deterministic eligibility revision.
4. Реализовать `DeliveryRateAggregationPort`: объединить manual rates и bounded
   provider `quoteRates`, соблюдать deadline, execution policy, concurrency,
   idempotent-request cache и fallback policy; ошибки представить через typed
   executions/issues, не раскрывая private provider payload.
5. Выполнить Delivery customization functions в stable order, проверить output
   policy и нормализовать уникальные opaque option handles.
6. Разрешить submitted selections только против нового option set: вернуть
   `NONE`, `SELECTED` или canonical `RESET`; отдельно вернуть orphaned resets.
7. Сохранить handle-to-provider bindings через `DeliveryOptionBindingsPort` и
   собрать deterministic stage revisions.
8. Реализовать concrete `DeliveryCheckoutOptionsPort` и broker action class,
   зарегистрировать exact action name и dependencies в `DeliveryModule`.

## Verification

- empty/non-physical cart, unassigned physical line и multi-destination cart;
- manual option, live carrier rate, no-service, timeout, cache hit и fallback;
- invalid/orphaned selection даёт `RESET`;
- customization не создаёт неизвестные groups/handles и соблюдает failure mode;
- PII передаётся только provider rating boundary и не логируется;
- broker result проходит Checkout-side canonical parser.

## Done

Action возвращает полный contract-valid Delivery snapshot с groups, options,
bindings, executions, issues и revisions без создания shipment.

## Non-Goals

- Shipment/fulfillment lifecycle.
- Checkout persistence и mutation coordination.
