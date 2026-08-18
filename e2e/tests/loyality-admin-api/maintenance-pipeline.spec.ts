/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import { expectUserError, idempotencyKey } from './helpers';

const conditions = { type: 'ALL', conditions: [] };

test.describe('Loyalty Admin API complete maintenance pipeline', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function maintenance(overrides: Record<string, unknown> = {}) {
    return kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: {
        effectiveAt: new Date().toISOString(), limit: 100,
        idempotencyKey: idempotencyKey('complete-maintenance'), ...overrides,
      } },
    });
  }

  test('expires reservations in bounded batches and restores each balance once', async () => {
    const fixture = await kit.fundedAccount('300');
    const reservations = [];
    for (let index = 0; index < 2; index += 1) {
      const context = kit.checkoutContext();
      const quote = await kit.quote(fixture, '100', context);
      reservations.push({ quote: quote.quote, reserved: await kit.reserve(context, quote.quote) });
    }
    const effectiveAt = new Date(Math.max(...reservations.map(({ quote }) => Date.parse(quote.expiresAt))) + 1).toISOString();
    const first = await maintenance({ effectiveAt, limit: 1 });
    expect(first.data.loyaltyMutation.maintenanceRun.result.expiredReservations).toBe(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '200', reservedPoints: '100' });
    const second = await maintenance({ effectiveAt, limit: 1 });
    expect(second.data.loyaltyMutation.maintenanceRun.result.expiredReservations).toBe(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '300', reservedPoints: '0' });
    const third = await maintenance({ effectiveAt, limit: 1 });
    expect(third.data.loyaltyMutation.maintenanceRun.result.expiredReservations).toBe(0);
  });

  test('activates delayed point lots exactly at the maintenance boundary', async () => {
    const fixture = await kit.createActiveAccount({ activationDelaySeconds: 3600 });
    const event = kit.orderRewardEvent();
    await kit.deliverEvent(event);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ pendingPoints: '10', availablePoints: '0' });
    const before = await maintenance({ effectiveAt: new Date(Date.parse(event.payload.eligibleAt) + 3_599_000).toISOString() });
    expect(before.data.loyaltyMutation.maintenanceRun.result.activatedPointLots).toBe(0);
    const atBoundary = await maintenance({ effectiveAt: new Date(Date.parse(event.payload.eligibleAt) + 3_600_000).toISOString() });
    expect(atBoundary.data.loyaltyMutation.maintenanceRun.result.activatedPointLots).toBe(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ pendingPoints: '0', availablePoints: '10' });
  });

  test('activates delayed monetary cashback lots and preserves currency totals', async () => {
    const fixture = await kit.createActiveAccount({
      activationDelaySeconds: 3600,
      earningRules: [{
        code: 'delayed-cashback', name: 'Delayed cashback', priority: 10,
        triggerType: 'CUSTOM_EVENT',
        triggerConfig: { eventType: 'order.cashback-eligible' },
        conditions,
        actionType: 'AWARD_CASHBACK',
        action: { type: 'AWARD_CASHBACK', basisPoints: 1000, settlement: 'MONETARY', currencyCode: 'USD' },
        limits: {
          startsAt: null,
          endsAt: null,
          perEventMaxPoints: null,
          perAccount: null,
          campaign: null,
        },
      }],
    });
    const occurredAt = new Date().toISOString();
    const externalEventId = crypto.randomUUID();
    const delivered = await kit.callAction<any>('loyalty.*', {
      event: {
        eventId: externalEventId,
        eventType: 'order.cashback-eligible',
        timestamp: occurredAt,
        source: 'loyalty-admin-e2e',
        emitKey: `loyalty-admin-e2e:${externalEventId}`,
        context: {
          organizationId: kit.realm.organizationId,
          correlationId: crypto.randomUUID(),
        },
        subject: { type: 'order', id: crypto.randomUUID() },
        payload: {
          customerId: kit.customer.rawId,
          storeId: kit.realm.storeId,
          channelCode: 'WEB',
          segmentIds: [],
          currencyCode: 'USD',
          eligibleAmountMinor: '1000',
        },
      },
      delivery: {
        jobId: crypto.randomUUID(),
        attempt: 1,
        maxAttempts: 10,
        idempotencyKey: `event:${externalEventId}`,
      },
    });
    expect(delivered).toEqual({ success: true });
    let wallets = await kit.api.admin.query<any>('loyality-admin-api/MonetaryWallets', {
      variables: { first: 20, where: { accountIds: [fixture.account.id], walletTypes: ['CASHBACK'] } },
    });
    expect(wallets.data.loyaltyQuery.monetaryWallets[0].balance).toMatchObject({
      pending: { amountMinor: '100' }, available: { amountMinor: '0' },
    });
    const run = await maintenance({ effectiveAt: new Date(Date.parse(occurredAt) + 3_600_000).toISOString() });
    expect(run.data.loyaltyMutation.maintenanceRun.result.activatedMonetaryLots).toBe(1);
    wallets = await kit.api.admin.query<any>('loyality-admin-api/MonetaryWallets', {
      variables: { first: 20, where: { accountIds: [fixture.account.id], walletTypes: ['CASHBACK'] } },
    });
    expect(wallets.data.loyaltyQuery.monetaryWallets[0].balance).toMatchObject({
      pending: { amountMinor: '0' }, available: { amountMinor: '100' },
    });
  });

  test('evaluates tiers and rebuilds account plus wallet projections in one run', async () => {
    const fixture = await kit.fundedAccount('1000', {
      tiers: [{ code: 'member', name: 'Member', rank: 1, qualification: {
        type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null,
        operator: 'GTE', threshold: '0', currencyCode: null,
      } }],
    });
    const converted = await kit.api.admin.mutation<any>('loyality-admin-api/PointsConvertToMonetary', {
      variables: { input: {
        accountId: fixture.account.id, programVersionId: fixture.version.id,
        walletType: 'STORE_CREDIT', currencyCode: 'USD', points: '100',
        idempotencyKey: idempotencyKey('maintenance-wallet'),
      } },
    });
    const wallet = converted.data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    await kit.sql.begin(async (sql) => {
      await sql`update loyalty.account_balance set available_points = 1 where account_id = ${decodeGlobalId(fixture.account.id).id}`;
      await sql`update loyalty.monetary_wallet_balance set available_amount_minor = 1 where wallet_id = ${decodeGlobalId(wallet.id).id}`;
    });
    const run = await maintenance({ rebuildBalances: true });
    expect(run.data.loyaltyMutation.maintenanceRun.result).toMatchObject({ evaluatedTiers: 1, rebuiltBalances: 2 });
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '900' });
    const wallets = await kit.api.admin.query<any>('loyality-admin-api/MonetaryWallets', {
      variables: { first: 20, where: { accountIds: [fixture.account.id] } },
    });
    expect(wallets.data.loyaltyQuery.monetaryWallets[0].balance.available.amountMinor).toBe('100');
    const memberships = await kit.api.admin.query<any>('loyality-admin-api/TierMemberships', {
      variables: { accountId: fixture.account.id, first: 20 },
    });
    expect(memberships.data.loyaltyQuery.tierMemberships).toEqual([
      expect.objectContaining({
        status: 'ACTIVE',
        tier: expect.objectContaining({ code: 'member' }),
      }),
    ]);
  });

  test('rejects unsafe maintenance batch sizes before changing state', async () => {
    for (const limit of [0, -1, 10_001]) {
      const result = await maintenance({ limit });
      expectUserError(result.data.loyaltyMutation.maintenanceRun);
      expect(result.data.loyaltyMutation.maintenanceRun.result).toBeNull();
    }
  });
});
