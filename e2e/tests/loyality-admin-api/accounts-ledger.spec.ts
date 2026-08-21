/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createProgram, expectNoUserErrors, expectUserError, getCustomerAccount, idempotencyKey, seedAccount, setupStore } from './helpers';

async function adjust(api: any, account: any, direction: 'CREDIT' | 'DEBIT', points: string, overrides: any = {}) {
  return api.admin.mutation('loyality-admin-api/PointsAdjust', { variables: { input: { accountId: account.id, expectedBalanceRevision: overrides.expectedBalanceRevision ?? account.balanceRevision, direction, points, reasonCode: 'ADMIN_CORRECTION', description: `${direction} from e2e`, metadata: { suite: 'accounts-ledger' }, idempotencyKey: overrides.idempotencyKey ?? idempotencyKey('points-adjust'), ...overrides } } });
}

test.describe('Loyalty Admin API accounts and points ledger', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('queries an account by customer plus program with balances and timestamps', async ({ api }) => {
    const program = await createProgram(api, { isDefault: true });
    const seeded = await seedAccount(api, program);
    const account = await getCustomerAccount(api, seeded.customerId, program.id);
    expect(account).toMatchObject({ id: seeded.id, customerId: seeded.customerId, status: 'ACTIVE', revision: 1, program: { id: program.id }, balance: { pendingPoints: '0', availablePoints: '0', reservedPoints: '0', debtPoints: '0', revision: 1 } });
    expect(new Date(account.openedAt).toISOString()).toBe(account.openedAt);
  });

  test('filters and paginates accounts without gaps or duplicates', async ({ api }) => {
    const program = await createProgram(api);
    const accounts = await Promise.all([seedAccount(api, program), seedAccount(api, program), seedAccount(api, program)]);
    const filtered = await api.admin.query<any>('loyality-admin-api/Accounts', { variables: { first: 10, where: { programIds: [program.id], customerIds: [accounts[1].customerId], statuses: ['ACTIVE'], minimumAvailablePoints: '0', hasDebt: false } } });
    expect(filtered.data.loyaltyQuery.accounts).toMatchObject({ totalCount: 1, edges: [{ node: { id: accounts[1].id } }] });
    const first = await api.admin.query<any>('loyality-admin-api/Accounts', { variables: { first: 2 } });
    const next = await api.admin.query<any>('loyality-admin-api/Accounts', { variables: { first: 2, after: first.data.loyaltyQuery.accounts.pageInfo.endCursor } });
    const ids = [...first.data.loyaltyQuery.accounts.edges, ...next.data.loyaltyQuery.accounts.edges].map(({ node }: any) => node.id);
    expect(new Set(ids).size).toBe(3);
  });

  test('credits and debits points with balanced append-only entries', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    const credit = await adjust(api, account, 'CREDIT', '100');
    const creditPayload = credit.data.loyaltyMutation.pointsAdjust;
    expectNoUserErrors(creditPayload);
    expect(creditPayload.account.balance).toMatchObject({ availablePoints: '100', lifetimeAdjustedPoints: '100', revision: 2 });
    expect(creditPayload.transaction).toMatchObject({ kind: 'ADJUST_CREDIT', source: 'ADMIN', reasonCode: 'ADMIN_CORRECTION', actorType: 'ADMIN_USER' });
    expect(creditPayload.transaction.entries.reduce((sum: bigint, entry: any) => sum + BigInt(entry.pointsDelta), 0n)).toBe(100n);

    const debit = await adjust(api, { ...account, balanceRevision: 2 }, 'DEBIT', '40');
    const debitPayload = debit.data.loyaltyMutation.pointsAdjust;
    expectNoUserErrors(debitPayload);
    expect(debitPayload.account.balance).toMatchObject({ availablePoints: '60', lifetimeAdjustedPoints: '60', revision: 3 });
    expect(debitPayload.transaction.entries.reduce((sum: bigint, entry: any) => sum + BigInt(entry.pointsDelta), 0n)).toBe(-40n);
    expect(debitPayload.transaction.lotAllocations.reduce((sum: bigint, item: any) => sum + BigInt(item.points), 0n)).toBe(40n);
  });

  test('rejects zero malformed excessive and stale adjustments atomically', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    for (const input of [
      { direction: 'CREDIT', points: '0' },
      { direction: 'CREDIT', points: '-1' },
      { direction: 'DEBIT', points: '1' },
      { direction: 'CREDIT', points: '10', expectedBalanceRevision: 99 },
    ]) {
      const result = await adjust(api, account, input.direction as 'CREDIT' | 'DEBIT', input.points, input);
      expectUserError(result.data.loyaltyMutation.pointsAdjust);
      expect(result.data.loyaltyMutation.pointsAdjust.transaction).toBeNull();
    }
    const current = await getCustomerAccount(api, account.customerId, program.id);
    expect(current.balance).toMatchObject({ availablePoints: '0', revision: 1 });
    expect(current.transactions.totalCount).toBe(0);
  });

  test('suspends reactivates and closes an account with revision checks', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    let revision = 1;
    for (const status of ['SUSPENDED', 'ACTIVE', 'CLOSED'] as const) {
      const result = await api.admin.mutation<any>('loyality-admin-api/AccountStatusUpdate', { variables: { input: { accountId: account.id,  status, reason: `e2e ${status}`, idempotencyKey: idempotencyKey(`account-${status}`) } } });
      expectNoUserErrors(result.data.loyaltyMutation.accountStatusUpdate);
      expect(result.data.loyaltyMutation.accountStatusUpdate.account.status).toBe(status);
      revision = result.data.loyaltyMutation.accountStatusUpdate.account.revision;
    }
    const stale = await api.admin.mutation<any>('loyality-admin-api/AccountStatusUpdate', { variables: { input: { accountId: account.id,  status: 'ACTIVE', reason: 'stale', idempotencyKey: idempotencyKey('stale-status') } } });
    expectUserError(stale.data.loyaltyMutation.accountStatusUpdate);
  });

  test('replays equal adjustments idempotently and rejects conflicting retries', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    const key = idempotencyKey('replay-adjustment');
    const first = await adjust(api, account, 'CREDIT', '25', { idempotencyKey: key });
    const replay = await adjust(api, account, 'CREDIT', '25', { idempotencyKey: key });
    expectNoUserErrors(first.data.loyaltyMutation.pointsAdjust);
    expectNoUserErrors(replay.data.loyaltyMutation.pointsAdjust);
    expect(replay.data.loyaltyMutation.pointsAdjust.transaction.id).toBe(first.data.loyaltyMutation.pointsAdjust.transaction.id);
    const conflict = await adjust(api, { ...account, balanceRevision: 2 }, 'CREDIT', '26', { idempotencyKey: key });
    expectUserError(conflict.data.loyaltyMutation.pointsAdjust);
    const transactions = await api.admin.query<any>('loyality-admin-api/Transactions', { variables: { first: 20, where: { accountIds: [account.id], kinds: ['ADJUST_CREDIT'], sources: ['ADMIN'] } } });
    expect(transactions.data.loyaltyQuery.transactions.totalCount).toBe(1);
  });
});
