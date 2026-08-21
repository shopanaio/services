/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import { expectNoUserErrors, expectUserError, idempotencyKey } from './helpers';

test.describe('Loyalty Admin API account and ledger invariants', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  test('forbids economic mutations for suspended and closed accounts', async () => {
    const fixture = await kit.fundedAccount('100');
    let status = await kit.api.admin.mutation<any>('loyality-admin-api/AccountStatusUpdate', {
      variables: { input: {
        accountId: fixture.account.id,  status: 'SUSPENDED', reason: 'RISK_REVIEW',
        idempotencyKey: idempotencyKey('suspend-economic'),
      } },
    });
    expectNoUserErrors(status.data.loyaltyMutation.accountStatusUpdate);
    const suspendedAdjustment = await kit.api.admin.mutation<any>('loyality-admin-api/PointsAdjust', {
      variables: { input: {
        accountId: fixture.account.id, expectedBalanceRevision: 2, direction: 'CREDIT', points: '1',
        reasonCode: 'INVALID', description: 'must not apply', idempotencyKey: idempotencyKey('suspended-adjust'),
      } },
    });
    expectUserError(suspendedAdjustment.data.loyaltyMutation.pointsAdjust);

    status = await kit.api.admin.mutation<any>('loyality-admin-api/AccountStatusUpdate', {
      variables: { input: {
        accountId: fixture.account.id,
        
        status: 'CLOSED', reason: 'CUSTOMER_REQUEST', idempotencyKey: idempotencyKey('close-economic'),
      } },
    });
    expectNoUserErrors(status.data.loyaltyMutation.accountStatusUpdate);
    const closed = status.data.loyaltyMutation.accountStatusUpdate.account;
    const reopen = await kit.api.admin.mutation<any>('loyality-admin-api/AccountStatusUpdate', {
      variables: { input: {
        accountId: fixture.account.id,  status: 'ACTIVE', reason: 'INVALID_REOPEN',
        idempotencyKey: idempotencyKey('closed-reopen'),
      } },
    });
    expectUserError(reopen.data.loyaltyMutation.accountStatusUpdate);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '100' });
  });

  test('allocates debits from the earliest-expiring lots first', async () => {
    const fixture = await kit.createActiveAccount();
    const early = new Date(Date.now() + 86_400_000).toISOString();
    const late = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const first = await kit.adjustPoints(fixture.account, 'CREDIT', '100', 1, 'early lot', early);
    const second = await kit.adjustPoints(fixture.account, 'CREDIT', '100', first.account.balance.revision, 'late lot', late);
    const debit = await kit.api.admin.mutation<any>('loyality-admin-api/PointsAdjust', {
      variables: { input: {
        accountId: fixture.account.id, expectedBalanceRevision: second.account.balance.revision,
        direction: 'DEBIT', points: '150', reasonCode: 'FIFO_ASSERTION', description: 'consume FIFO',
        idempotencyKey: idempotencyKey('fifo-debit'),
      } },
    });
    expectNoUserErrors(debit.data.loyaltyMutation.pointsAdjust);
    const allocations = await kit.sql<{ expiresAt: string; points: string }[]>`
      select lot.expires_at as "expiresAt", sum(allocation.points)::text as points
      from loyalty.lot_allocation allocation
      join loyalty.point_lot lot on lot.id = allocation.lot_id
      where allocation.transaction_id = ${decodeGlobalId(debit.data.loyaltyMutation.pointsAdjust.transaction.id).id}
      group by lot.expires_at
      order by lot.expires_at
    `;
    expect(allocations.map(({ points }) => points)).toEqual(['100', '50']);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '50' });
  });

  test('serializes concurrent debits and never produces a negative projection', async () => {
    const fixture = await kit.fundedAccount('100');
    const calls = await Promise.all([1, 2].map((index) => kit.api.admin.mutation<any>(
      'loyality-admin-api/PointsAdjust',
      { variables: { input: {
        accountId: fixture.account.id, expectedBalanceRevision: fixture.balanceRevision,
        direction: 'DEBIT', points: '80', reasonCode: 'CONCURRENT_DEBIT', description: `debit ${index}`,
        idempotencyKey: idempotencyKey(`concurrent-debit-${index}`),
      } } },
    )));
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.pointsAdjust.userErrors.length === 0)).toHaveLength(1);
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.pointsAdjust.userErrors.length > 0)).toHaveLength(1);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '20' });
    expect(await kit.transactionCount(fixture.account.id, ['ADJUST_DEBIT'])).toBe(1);
  });

  test('rebuild restores every lifetime counter from immutable transactions', async () => {
    const fixture = await kit.createActiveAccount();
    const credit = await kit.adjustPoints(fixture.account, 'CREDIT', '100', 1);
    await kit.adjustPoints(fixture.account, 'DEBIT', '40', credit.account.balance.revision);
    await kit.sql`
      update loyalty.account_balance set
        available_points = 999, lifetime_adjusted_points = 999, revision = revision + 1
      where account_id = ${decodeGlobalId(fixture.account.id).id}
    `;
    const rebuilt = await kit.api.admin.mutation<any>('loyality-admin-api/AccountBalanceRebuild', {
      variables: { input: { accountId: fixture.account.id, idempotencyKey: idempotencyKey('full-counter-rebuild') } },
    });
    expectNoUserErrors(rebuilt.data.loyaltyMutation.accountBalanceRebuild);
    expect(rebuilt.data.loyaltyMutation.accountBalanceRebuild.balance).toMatchObject({
      availablePoints: '60', lifetimeAdjustedPoints: '60',
    });
  });
});
