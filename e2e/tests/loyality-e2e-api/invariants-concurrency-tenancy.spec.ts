/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createProgram, idempotencyKey, seedAccount } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty invariants concurrency and tenancy', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('serializes concurrent reservations without overspending', async () => {
    const fixture = await kit.fundedAccount('100');
    const contexts = [kit.checkoutContext(), kit.checkoutContext()];
    const quotes = await Promise.all(contexts.map((context) => kit.quote(fixture, '100', context)));
    const results = await Promise.all(contexts.map((context, index) =>
      kit.reserve(context, quotes[index].quote)));
    expect(results.filter(({ status }) => status === 'RESERVED')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'REJECTED')).toHaveLength(1);
    const balance = await kit.accountBalance(fixture.account.id);
    expect(BigInt(balance.availablePoints) + BigInt(balance.reservedPoints)).toBe(100n);
  });

  test('replays API, event and workflow commands to one economic outcome', async () => {
    const fixture = await kit.createActiveAccount();
    const event = kit.orderRewardEvent();
    await Promise.all([kit.deliverEvent(event), kit.deliverEvent(event)]);
    expect(await kit.transactionCount(fixture.account.id, ['EARN_PENDING'])).toBe(1);

    const adjustedKey = idempotencyKey('parallel-adjust');
    const input = {
      accountId: fixture.account.id, expectedBalanceRevision: 2,
      direction: 'CREDIT', points: '5', reasonCode: 'E2E', description: 'parallel replay',
      idempotencyKey: adjustedKey,
    };
    const calls = await Promise.all([1, 2].map(() => kit.api.admin.mutation<any>(
      'loyality-admin-api/PointsAdjust', { variables: { input } },
    )));
    expect(calls[0].data.loyaltyMutation.pointsAdjust.transaction.id)
      .toBe(calls[1].data.loyaltyMutation.pointsAdjust.transaction.id);
  });

  test('keeps stores isolated for direct reads and economic writes', async () => {
    const first = await kit.fundedAccount('25');
    const firstProject = kit.api.session.project;
    await kit.api.session.setupProject({ displayName: 'Foreign loyalty store', currencyCode: 'USD' });
    const foreignProgram = await createProgram(kit.api, { isDefault: true });
    await seedAccount(kit.api, foreignProgram);
    const direct = await kit.api.admin.query<any>('loyality-admin-api/CustomerAccount', {
      variables: { customerId: first.account.customerId, programId: first.program.id },
    });
    expect(direct.data.loyaltyQuery.customerAccount).toBeNull();
    kit.api.session.project = firstProject;
    expect((await kit.accountBalance(first.account.id)).availablePoints).toBe('25');
  });

  test('preserves bigint precision and non-negative unsigned projections', async () => {
    const points = '900719925474099312345';
    const fixture = await kit.fundedAccount(points);
    const admin = await kit.accountBalance(fixture.account.id);
    const storefront = await kit.loyaltyAccount('balance { availablePoints debtPoints }');
    expect(admin.availablePoints).toBe(points);
    expect(storefront?.balance.availablePoints).toBe(points);
    expect(BigInt(storefront?.balance.availablePoints)).toBeGreaterThanOrEqual(0n);
  });
});
