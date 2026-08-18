/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

const emptyConditions = { type: 'ALL', conditions: [] };
const rule = (code: string, overrides: Record<string, unknown> = {}) => ({
  code,
  name: code,
  priority: 10,
  triggerType: 'ORDER',
  triggerConfig: {},
  conditions: emptyConditions,
  actionType: 'AWARD_FIXED_POINTS',
  action: { type: 'AWARD_FIXED_POINTS', points: '1' },
  limits: {},
  ...overrides,
});

test.describe('Loyalty earning rule runtime branches end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  function externalEvent(payload: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    const eventId = String(overrides.eventId ?? crypto.randomUUID());
    const timestamp = String(overrides.timestamp ?? new Date().toISOString());
    return {
      eventId,
      eventType: String(overrides.eventType ?? 'customer.login'),
      timestamp,
      source: String(overrides.source ?? 'loyalty-runtime-e2e'),
      emitKey: `runtime:${eventId}`,
      context: {
        organizationId: kit.realm.organizationId,
        correlationId: crypto.randomUUID(),
      },
      subject: { type: 'customer', id: kit.customer.rawId },
      payload: {
        customerId: kit.customer.rawId,
        storeId: kit.realm.storeId,
        channelCode: 'WEB',
        segmentIds: [],
        ...payload,
      },
    };
  }

  function deliverExternal(event: Record<string, any>) {
    return kit.callAction('loyalty.*', {
      event,
      delivery: {
        jobId: crypto.randomUUID(),
        attempt: 1,
        maxAttempts: 10,
        idempotencyKey: `event:${event.eventId}`,
      },
    });
  }

  test('executes spend-ratio multiplier and points-cashback actions with integer math', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [
        rule('runtime-spend-ratio', {
          actionType: 'AWARD_SPEND_RATIO',
          action: { type: 'AWARD_SPEND_RATIO', points: '3', amountMinor: '100' },
        }),
        rule('runtime-multiplier', {
          actionType: 'APPLY_MULTIPLIER',
          action: { type: 'APPLY_MULTIPLIER', multiplierBps: 15_000 },
        }),
        rule('runtime-points-cashback', {
          actionType: 'AWARD_CASHBACK',
          action: {
            type: 'AWARD_CASHBACK', basisPoints: 1_000,
            settlement: 'POINTS', currencyCode: null,
          },
        }),
      ],
    });
    await kit.deliverEvent(kit.orderRewardEvent());
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({
      availablePoints: '46',
    });

    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map((item: any) => ({
      code: item.earningRule.code,
      points: item.pointsAwarded,
    })).sort((left: any, right: any) => left.code.localeCompare(right.code))).toEqual([
      { code: 'runtime-multiplier', points: '5' },
      { code: 'runtime-points-cashback', points: '1' },
      { code: 'runtime-spend-ratio', points: '30' },
    ]);
  });

  test('matches every catalog selector against immutable order lines', async () => {
    const ids = {
      productId: crypto.randomUUID(),
      variantId: crypto.randomUUID(),
      categoryId: crypto.randomUUID(),
      tagId: crypto.randomUUID(),
      featureId: crypto.randomUUID(),
      optionValueId: crypto.randomUUID(),
    };
    const selectors: Array<[string, string | null]> = [
      ['ALL', null],
      ['PRODUCT', ids.productId],
      ['VARIANT', ids.variantId],
      ['CATEGORY', ids.categoryId],
      ['TAG', ids.tagId],
      ['FEATURE', ids.featureId],
      ['OPTION_VALUE', ids.optionValueId],
    ];
    const fixture = await kit.createActiveAccount({
      earningRules: selectors.map(([type, id]) => rule(`catalog-${type.toLowerCase()}`, {
        conditions: { type: 'CATALOG', selector: { type, ids: id === null ? [] : [id] } },
      })),
    });
    const event = kit.orderRewardEvent({ payload: { lines: [{
      orderLineId: crypto.randomUUID(),
      productId: ids.productId,
      variantId: ids.variantId,
      categoryIds: [ids.categoryId],
      tagIds: [ids.tagId],
      featureIds: [ids.featureId],
      optionValueIds: [ids.optionValueId],
      quantity: 1,
      eligibleAmountAfterProductDiscountsMinor: '1000',
      eligibleAmountAfterAllDiscountsMinor: '1000',
    }] } });
    await kit.deliverEvent(event);
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('17');
  });

  test('evaluates payment first-purchase schedule and nested boolean conditions', async () => {
    const segmentId = crypto.randomUUID();
    const at = new Date(Date.now() + 60_000).toISOString();
    const fixture = await kit.createActiveAccount({
      earningRules: [rule('compound-condition', {
        triggerType: 'LOGIN',
        conditions: {
          type: 'ALL',
          conditions: [
            { type: 'PAYMENT_METHOD', paymentMethodCodes: ['card'] },
            { type: 'FIRST_PURCHASE' },
            { type: 'SCHEDULE', startsAt: at, endsAt: new Date(Date.parse(at) + 60_000).toISOString() },
            { type: 'SEGMENT', match: 'ALL', segmentIds: [segmentId] },
            { type: 'ANY', conditions: [
              { type: 'CHANNEL', channelCodes: ['MOBILE'] },
              { type: 'NOT', condition: { type: 'CHANNEL', channelCodes: ['ADMIN'] } },
            ] },
          ],
        },
        action: { type: 'AWARD_FIXED_POINTS', points: '20' },
      })],
    });
    await deliverExternal(externalEvent({
      paymentMethodCode: 'card', firstPurchase: true, segmentIds: [segmentId],
    }, { timestamp: at }));
    await deliverExternal(externalEvent({
      paymentMethodCode: 'cash', firstPurchase: true, segmentIds: [segmentId],
    }, { timestamp: at }));
    await deliverExternal(externalEvent({
      paymentMethodCode: 'card', firstPurchase: true, segmentIds: [segmentId],
    }, { timestamp: new Date(Date.parse(at) + 60_000).toISOString() }));
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('20');
  });

  test('awards a first-purchase order rule only for the chronologically first order', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule('first-order', {
        conditions: { type: 'FIRST_PURCHASE' },
        action: { type: 'AWARD_FIXED_POINTS', points: '20' },
      })],
    });
    const firstAt = new Date(Date.now() + 60_000).toISOString();
    const secondAt = new Date(Date.parse(firstAt) + 1_000).toISOString();
    await kit.deliverEvent(kit.orderRewardEvent({ payload: { eligibleAt: firstAt } }));
    await kit.deliverEvent(kit.orderRewardEvent({ payload: { eligibleAt: secondAt } }));
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('40');
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
      .toEqual(['AWARDED', 'INELIGIBLE']);
  });

  test('executes all event-field comparison operators', async () => {
    const comparisons = [
      ['EQ', 10], ['NE', 11], ['IN', [9, 10]], ['GTE', 10],
      ['GT', 9], ['LTE', 10], ['LT', 11],
    ];
    const fixture = await kit.createActiveAccount({
      earningRules: comparisons.map(([operator, value]) => rule(`event-${String(operator).toLowerCase()}`, {
        triggerType: 'LOGIN',
        conditions: { type: 'EVENT_FIELD', path: ['metrics', 'score'], operator, value },
      })),
    });
    await deliverExternal(externalEvent({ metrics: { score: 10 } }));
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('7');
  });

  test('applies a monetary campaign budget atomically under concurrent events', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule('monetary-budget', {
        triggerType: 'LOGIN',
        actionType: 'AWARD_CASHBACK',
        action: {
          type: 'AWARD_CASHBACK', basisPoints: 1_000,
          settlement: 'MONETARY', currencyCode: 'USD',
        },
        limits: {
          campaign: {
            maxOccurrences: '1', maxPoints: null,
            maxMonetaryMinorByCurrency: { USD: '100' },
          },
        },
      })],
    });
    await Promise.all([
      deliverExternal(externalEvent({ currencyCode: 'USD', eligibleAmountMinor: '1000' })),
      deliverExternal(externalEvent({ currencyCode: 'USD', eligibleAmountMinor: '1000' })),
    ]);
    const [wallet] = await kit.sql<any[]>`
      select b.pending_amount_minor as "pendingAmountMinor",
             b.available_amount_minor as "availableAmountMinor"
      from loyalty.monetary_wallet w
      join loyalty.monetary_wallet_balance b on b.wallet_id = w.id
      where w.account_id = ${decodeGlobalId(fixture.account.id).id}
        and w.wallet_type = 'CASHBACK' and w.currency_code = 'USD'
    `;
    expect(wallet).toEqual({ pendingAmountMinor: '0', availableAmountMinor: '100' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
      .toEqual(['AWARDED', 'BUDGET_EXHAUSTED']);
  });

  test('rejects reuse of an external event identity with changed immutable payload', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule('event-idempotency', { triggerType: 'LOGIN' })],
    });
    const event = externalEvent({ value: 'first' });
    await deliverExternal(event);
    const conflict = await deliverExternal({
      ...event,
      payload: { ...event.payload, value: 'changed' },
    });
    expect(conflict).toMatchObject({
      success: false,
      error: { code: 'EXTERNAL_LOYALTY_EARNING_FAILED', retryable: false },
    });
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('1');
    expect(await kit.transactionCount(fixture.account.id, ['EARN_PENDING'])).toBe(1);
  });
});
