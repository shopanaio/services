/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

const conditions = { type: 'ALL', conditions: [] };

function rule(code: string, overrides: Record<string, unknown>) {
  return {
    code, name: code, priority: 10, triggerType: 'ORDER', triggerConfig: {},
    conditions, actionType: 'AWARD_FIXED_POINTS',
    action: { type: 'AWARD_FIXED_POINTS', points: '25' }, limits: {},
    ...overrides,
  };
}

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

  test('fully reverses base points rule points monetary cashback and issued rewards', async () => {
    const fixture = await kit.createActiveAccount({
      refundPolicy: 'FULL_REVERSAL',
      earningRules: [
        rule('refund-fixed-points', {}),
        rule('refund-monetary-cashback', {
          actionType: 'AWARD_CASHBACK',
          action: {
            type: 'AWARD_CASHBACK', basisPoints: 1_000,
            settlement: 'MONETARY', currencyCode: 'USD',
          },
        }),
        rule('refund-issued-reward', {
          actionType: 'ISSUE_REWARD',
          action: { type: 'ISSUE_REWARD', rewardDefinitionCode: 'storefront-points' },
        }),
      ],
    });
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('35');

    await kit.deliverEvent(reversal(earned, '1'));
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '0', debtPoints: '0',
    });
    const [wallet] = await kit.sql<any[]>`
      select b.pending_amount_minor as "pendingAmountMinor",
             b.available_amount_minor as "availableAmountMinor",
             b.debt_amount_minor as "debtAmountMinor"
      from loyalty.monetary_wallet w
      join loyalty.monetary_wallet_balance b on b.wallet_id = w.id
      where w.account_id = ${decodeGlobalId(fixture.account.id).id}
        and w.wallet_type = 'CASHBACK' and w.currency_code = 'USD'
    `;
    expect(wallet).toEqual({
      pendingAmountMinor: '0', availableAmountMinor: '0', debtAmountMinor: '0',
    });
    const [entitlement] = await kit.sql<any[]>`
      select status, revision from loyalty.reward_entitlement
      where account_id = ${decodeGlobalId(fixture.account.id).id}
    `;
    expect(entitlement).toEqual({ status: 'REVOKED', revision: 2 });
    expect(await kit.transactionCount(fixture.account.id, ['REVERSE_EARN'])).toBe(2);
  });

  test('restores committed redemption points proportionally to cumulative refunds', async () => {
    const fixture = await kit.fundedAccount('1000');
    const earned = kit.orderRewardEvent();
    await kit.deliverEvent(earned);
    const context = kit.checkoutContext();
    const quoted = await kit.quote(fixture, '100', context);
    const reserved = await kit.reserve(context, quoted.quote);
    await kit.commit(context, quoted.quote, reserved, { orderId: earned.payload.orderId });

    const first = await kit.deliverEvent(reversal(earned, '400'));
    expect(first).toMatchObject({
      success: true,
      data: { redemptionRestoreTransactionIds: [expect.any(String)] },
    });
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('946');
    const second = await kit.deliverEvent(reversal(earned, '600'));
    expect(second).toMatchObject({
      success: true,
      data: { redemptionRestoreTransactionIds: [expect.any(String)] },
    });
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('1000');
    expect(await kit.transactionCount(fixture.account.id, ['RESTORE_REDEEM'])).toBe(2);
  });
});
