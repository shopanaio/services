/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { baseRules } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty purchase earning across Orders and Storefront', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('awards standard purchase points from an immutable Orders fact', async () => {
    const fixture = await kit.createActiveAccount();
    const event = kit.orderRewardEvent();
    expect(await kit.deliverEvent(event)).toMatchObject({ success: true, data: {
      accountId: expect.any(String), transactionId: expect.any(String),
    } });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '10' });
    expect((await kit.loyaltyAccount('balance { availablePoints }'))?.balance.availablePoints)
      .toBe('10');
  });

  test('selects the configured immutable eligible-spend basis', async () => {
    const fixture = await kit.createActiveAccount({
      earnPoints: '1', earnAmountMinor: '100',
      rules: baseRules({ earning: { eligibleSpendBasis: 'AFTER_ALL_DISCOUNTS' } }),
    });
    await kit.deliverEvent(kit.orderRewardEvent({ payload: {
      eligibleAmountAfterProductDiscountsMinor: '1000',
      eligibleAmountAfterAllDiscountsMinor: '650',
      lines: [{
        orderLineId: crypto.randomUUID(), productId: crypto.randomUUID(),
        variantId: crypto.randomUUID(), categoryIds: [], tagIds: [], featureIds: [],
        optionValueIds: [], quantity: 1,
        eligibleAmountAfterProductDiscountsMinor: '1000',
        eligibleAmountAfterAllDiscountsMinor: '650',
      }],
    } }));
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '6' });
  });

  test('uses DOWN and UP rounding without floating point', async () => {
    const down = await kit.createActiveAccount({
      earnPoints: '1', earnAmountMinor: '100', roundingMode: 'DOWN',
    });
    await kit.deliverEvent(kit.orderRewardEvent({ payload: {
      eligibleAmountAfterProductDiscountsMinor: '199',
      eligibleAmountAfterAllDiscountsMinor: '199',
      lines: [{
        orderLineId: crypto.randomUUID(), productId: crypto.randomUUID(),
        variantId: crypto.randomUUID(), categoryIds: [], tagIds: [], featureIds: [],
        optionValueIds: [], quantity: 1,
        eligibleAmountAfterProductDiscountsMinor: '199',
        eligibleAmountAfterAllDiscountsMinor: '199',
      }],
    } }));
    expect((await kit.accountBalance(down.account.id)).availablePoints).toBe('1');

    const up = await kit.createActiveAccount({
      earnPoints: '1', earnAmountMinor: '100', roundingMode: 'UP',
    });
    await kit.deliverEvent(kit.orderRewardEvent({ payload: {
      eligibleAmountAfterProductDiscountsMinor: '101',
      eligibleAmountAfterAllDiscountsMinor: '101',
      lines: [{
        orderLineId: crypto.randomUUID(), productId: crypto.randomUUID(),
        variantId: crypto.randomUUID(), categoryIds: [], tagIds: [], featureIds: [],
        optionValueIds: [], quantity: 1,
        eligibleAmountAfterProductDiscountsMinor: '101',
        eligibleAmountAfterAllDiscountsMinor: '101',
      }],
    } }));
    expect((await kit.accountBalance(up.account.id)).availablePoints).toBe('2');
  });

  test('holds points pending until activation maintenance runs', async () => {
    const fixture = await kit.createActiveAccount({ activationDelaySeconds: 60 });
    const event = kit.orderRewardEvent();
    await kit.deliverEvent(event);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      pendingPoints: '10', availablePoints: '0',
    });
    const run = await kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: {
        effectiveAt: new Date(Date.parse(event.timestamp) + 61_000).toISOString(),
        limit: 100, idempotencyKey: crypto.randomUUID(),
      } },
    });
    expect(run.data.loyaltyMutation.maintenanceRun.result.activatedPointLots).toBe(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      pendingPoints: '0', availablePoints: '10',
    });
  });

  test('processes duplicate order reward events exactly once', async () => {
    const fixture = await kit.createActiveAccount();
    const event = kit.orderRewardEvent();
    const first = await kit.deliverEvent(event);
    const replay = await kit.deliverEvent(event);
    expect(replay).toEqual(first);
    expect(await kit.transactionCount(fixture.account.id, ['EARN_PENDING'])).toBe(1);
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('10');
  });
});
