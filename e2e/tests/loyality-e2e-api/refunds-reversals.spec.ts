/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty refunds and reversals end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  function reversal(original: any, amountMinor: string, overrides: Record<string, unknown> = {}) {
    const now = new Date().toISOString();
    return {
      eventId: crypto.randomUUID(), eventType: 'orderRewardReversed', timestamp: now,
      source: 'orders', emitKey: crypto.randomUUID(),
      context: { organizationId: kit.realm.organizationId, correlationId: crypto.randomUUID() },
      subject: original.subject,
      payload: {
        schemaVersion: 1, orderId: original.payload.orderId, orderRevision: 2,
        storeId: kit.realm.storeId, customerId: kit.customer.rawId, currencyCode: 'USD',
        sourceType: 'REFUND', sourceId: crypto.randomUUID(), sourceRevision: 1,
        eligibleAmountAfterProductDiscountsMinor: amountMinor,
        eligibleAmountAfterAllDiscountsMinor: amountMinor,
        reversedAt: now,
        lines: [{
          orderLineId: original.payload.lines[0].orderLineId, quantity: 1,
          eligibleAmountAfterProductDiscountsMinor: amountMinor,
          eligibleAmountAfterAllDiscountsMinor: amountMinor,
        }],
        ...overrides,
      },
    };
  }

  test('reverses earned points proportionally for a partial refund', async () => {
    const fixture = await kit.createActiveAccount();
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    const result = await kit.deliverEvent(reversal(earned, '400'));
    expect(result).toMatchObject({ success: true, data: {
      earningReversalTransactionId: expect.any(String), debtPoints: '0',
    } });
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('6');
  });

  test('tracks debt when spent points make a reversal underfunded', async () => {
    const fixture = await kit.createActiveAccount({ debtPolicy: 'TRACK_DEBT' });
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    await kit.adjustPoints(fixture.account, 'DEBIT', '10', 2);
    await kit.deliverEvent(reversal(earned, '1000'));
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '0', debtPoints: '10',
    });
  });

  test('rejects an underfunded reversal under REJECT_REVERSAL policy', async () => {
    const fixture = await kit.createActiveAccount({ debtPolicy: 'REJECT_REVERSAL' });
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    await kit.adjustPoints(fixture.account, 'DEBIT', '10', 2);
    expect(await kit.deliverEvent(reversal(earned, '1000'))).toMatchObject({
      success: false, error: { code: 'ORDER_REWARD_REVERSAL_FAILED' },
    });
    expect((await kit.accountBalance(fixture.account.id)).debtPoints).toBe('0');
  });

  test('processes incremental refunds once and rejects excess economics', async () => {
    const fixture = await kit.createActiveAccount();
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    const firstEvent = reversal(earned, '400');
    const first = await kit.deliverEvent(firstEvent);
    expect(await kit.deliverEvent(firstEvent)).toEqual(first);
    await kit.deliverEvent(reversal(earned, '600'));
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('0');
    expect(await kit.deliverEvent(reversal(earned, '1'))).toMatchObject({ success: false });
    expect(await kit.transactionCount(fixture.account.id, ['REVERSE_EARN'])).toBe(2);
  });
});
