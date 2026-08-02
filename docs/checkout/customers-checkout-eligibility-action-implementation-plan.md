# Customers Checkout Eligibility Action — implementation plan

## Goal

Реализовать `CustomersCheckoutActions.resolveBuyerEligibility`, возвращающий
canonical segment membership snapshot клиента на заданный `effectiveAt`.

## Implementation

1. Добавить Customers-owned read method по `{ storeId, customerId, effectiveAt }`:
   проверить существование non-deleted customer в том же store и загрузить
   memberships, у которых `expiresAt` отсутствует либо позже `effectiveAt`.
2. Включать только существующие, non-deleted и active segment definitions;
   `segmentIds` вернуть unique и в stable ID order.
3. Вычислить `segmentMembershipRevision` как canonical hash customer identity,
   ordered membership facts (включая expiry) и segment definition revisions.
   `effectiveAt` определяет состав snapshot, но не добавляется в hash сам по
   себе. Локальные wall-clock reads запрещены.
4. Реализовать `CustomersCheckoutEligibilityPort`; использовать существующие
   `resolveBuyerEligibilityParamsSchema` и
   `parseResolveBuyerEligibilityResult` для boundary validation.
5. Добавить `CustomersCheckoutBrokerActions extends BrokerActions`,
   зарегистрировать `CustomersCheckoutActionNames.resolveBuyerEligibility` и
   подключить action/read dependency в `CustomersModule`/`Kernel`.
6. Возвращать typed `CUSTOMER_NOT_FOUND` или
   `BUYER_ELIGIBILITY_RESOLUTION_FAILED`; не подменять failures пустым segment
   set и не раскрывать cross-store customer.

## Verification

- customer без memberships возвращает empty list и non-empty revision;
- active, expired, deleted и cross-store memberships фильтруются корректно;
- segment/customer update меняет revision, одинаковый snapshot — нет;
- result сохраняет exact `storeId`, `customerId`, `effectiveAt` request;
- malformed input/result отклоняется schemas;
- exact broker action name зарегистрирован один раз.

## Done

Action возвращает tenant-safe, deterministic, contract-valid eligibility
snapshot без изменения Customers или Checkout state.

## Non-Goals

- Вычисление membership из checkout tables.
- Checkout adapter, request factory и pipeline wiring.
- Изменение segment membership во время checkout.
