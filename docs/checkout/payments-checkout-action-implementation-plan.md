# Payments Checkout Action — implementation plan

## Goal

Реализовать `PaymentsCheckoutActions.getAvailableMethods`, который возвращает
доступные payment methods и canonical resolution текущего selection.

## Implementation

1. Добавить provider-side request/result schemas и проверки provenance,
   `basedOnFinalQuoteRevision` и `basedOnDeliveryRevision`.
2. Реализовать `PaymentsCheckoutMethodsPort`:
   - загрузить active provider accounts для store;
   - получить Apps routes для `getMethods`;
   - построить PII-free discovery request из final quote, buyer eligibility и
     selected delivery facts;
   - вызвать providers в пределах общего deadline;
   - валидировать, фильтровать и детерминированно сортировать methods;
   - сформировать platform-owned opaque handles и public method projection.
3. Сохранить handle-to-provider bindings через `PaymentMethodBindingsPort` с
   checkout/version/final-quote revision и expiry.
4. Разрешить submitted selection против нового method set: `NONE`, `SELECTED`
   или `RESET`; никогда не принимать provider/code pair как identity.
5. Вычислить deterministic methods revision и собрать contract result без
   provider-private metadata.
6. Добавить broker action class с exact action name и собрать BrokerModule,
   accounts/apps/bindings/methods dependencies в `PaymentsModule`.

## Verification

- zero-payable и payable checkout;
- online/offline/on-delivery methods и delivery-dependent eligibility;
- disabled/missing provider, malformed result и deadline failure;
- stable unique handles, deterministic ordering/revision;
- valid selection сохраняется, отсутствующий handle даёт `RESET`;
- broker result проходит Checkout-side canonical parser.

## Done

Action зарегистрирован и возвращает contract-valid methods snapshot без создания
payment collection/session и без выполнения settlement операций.

## Non-Goals

- Payment collection/session lifecycle.
- Checkout mutation integration и persistence.
