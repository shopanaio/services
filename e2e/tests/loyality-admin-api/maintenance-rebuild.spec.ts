/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, createProgram, expectNoUserErrors, future, getCustomerAccount, idempotencyKey, past, publishVersion, seedAccount, setupStore } from './helpers';

test.describe('Loyalty Admin API maintenance and rebuilds', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('runs empty maintenance with a complete deterministic result', async ({ api }) => {
    const result = await api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', { variables: { input: { effectiveAt: new Date().toISOString(), limit: 10, rebuildBalances: false, idempotencyKey: idempotencyKey('maintenance-empty') } } });
    expectNoUserErrors(result.data.loyaltyMutation.maintenanceRun);
    expect(result.data.loyaltyMutation.maintenanceRun.result).toEqual({ activatedProgramVersions: 0, expiredReservations: 0, activatedPointLots: 0, expiredPointLots: 0, activatedMonetaryLots: 0, expiredMonetaryLots: 0, evaluatedTiers: 0, expiredRewards: 0, rebuiltBalances: 0 });
  });

  test('activates a scheduled program version at its effective boundary', async ({ api }) => {
    const { version } = await createDraft(api, { isDefault: true });
    const effectiveFrom = future(10);
    const scheduled = await publishVersion(api, version, { effectiveFrom });
    expect(scheduled.status).toBe('SCHEDULED');
    const run = await api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', { variables: { input: { effectiveAt: future(11), limit: 100, idempotencyKey: idempotencyKey('activate-version') } } });
    expectNoUserErrors(run.data.loyaltyMutation.maintenanceRun);
    expect(run.data.loyaltyMutation.maintenanceRun.result.activatedProgramVersions).toBe(1);
    const current = await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: scheduled.program.id } });
    expect(current.data.loyaltyQuery.program.activeVersion.id).toBe(version.id);
  });

  test('expires an overdue point lot once and keeps ledger history', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    const credit = await api.admin.mutation<any>('loyality-admin-api/PointsAdjust', { variables: { input: { accountId: account.id, expectedBalanceRevision: 1, direction: 'CREDIT', points: '50', reasonCode: 'EXPIRING_TEST', description: 'expires in maintenance', expiresAt: past(1), idempotencyKey: idempotencyKey('expiring-credit') } } });
    expectNoUserErrors(credit.data.loyaltyMutation.pointsAdjust);
    const run = await api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', { variables: { input: { effectiveAt: new Date().toISOString(), limit: 100, idempotencyKey: idempotencyKey('expire-points') } } });
    expect(run.data.loyaltyMutation.maintenanceRun.result.expiredPointLots).toBe(1);
    const current = await getCustomerAccount(api, account.customerId, program.id);
    expect(current.balance).toMatchObject({ availablePoints: '0', lifetimeExpiredPoints: '50' });
    expect(current.transactions.totalCount).toBe(2);
  });

  test('rebuilds a balance projection from the append-only ledger', async ({ api }) => {
    const program = await createProgram(api);
    const account = await seedAccount(api, program);
    await api.admin.mutation<any>('loyality-admin-api/PointsAdjust', { variables: { input: { accountId: account.id, expectedBalanceRevision: 1, direction: 'CREDIT', points: '75', reasonCode: 'REBUILD_TEST', description: 'rebuild source', idempotencyKey: idempotencyKey('rebuild-credit') } } });
    const rebuild = await api.admin.mutation<any>('loyality-admin-api/AccountBalanceRebuild', { variables: { input: { accountId: account.id, idempotencyKey: idempotencyKey('account-rebuild') } } });
    expectNoUserErrors(rebuild.data.loyaltyMutation.accountBalanceRebuild);
    expect(rebuild.data.loyaltyMutation.accountBalanceRebuild.balance.availablePoints).toBe('75');
    expect(rebuild.data.loyaltyMutation.accountBalanceRebuild.account.balance.availablePoints).toBe('75');
  });
});
