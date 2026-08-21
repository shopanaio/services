/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, idempotencyKey, seedAccount, setupStore } from './helpers';

async function fixture(api: any, limits: any = {}) {
  const { program, version } = await createDraft(api, {}, { rewardDefinitions: [{ code: 'bonus', name: 'Bonus points', rewardType: 'POINTS', configuration: { points: '100' }, validityDays: 30, ...limits }] });
  const account = await seedAccount(api, program);
  return { program, version, definition: version.rewardDefinitions[0], account };
}

async function issue(api: any, account: any, definition: any, overrides: any = {}) {
  return api.admin.mutation('loyality-admin-api/RewardEntitlementIssue', { variables: { input: { accountId: account.id, rewardDefinitionId: definition.id, quantity: '1', idempotencyKey: idempotencyKey('entitlement-issue'), ...overrides } } });
}

test.describe('Loyalty Admin API reward entitlements', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('issues an entitlement with an immutable definition snapshot and audit event', async ({ api }) => {
    const { account, definition } = await fixture(api);
    const result = await issue(api, account, definition, { quantity: '2', externalReference: 'pricing-voucher-1' });
    const payload = result.data.loyaltyMutation.rewardEntitlementIssue;
    expectNoUserErrors(payload);
    expect(payload.rewardEntitlement).toMatchObject({ status: 'ISSUED', quantity: '2', configurationSchemaVersion: 1, configurationSnapshot: { points: '100' }, externalReference: 'pricing-voucher-1', revision: 1, definition: { id: definition.id }, account: { id: account.id }, events: [{ eventType: 'ISSUED', previousStatus: null, status: 'ISSUED', reasonCode: 'REWARD_ISSUED' }] });
  });

  test('enforces global and per-account issuance limits at quantity boundaries', async ({ api }) => {
    const { account, definition } = await fixture(api, { issuanceLimit: '3', perAccountLimit: '2' });
    const accepted = await issue(api, account, definition, { quantity: '2' });
    expectNoUserErrors(accepted.data.loyaltyMutation.rewardEntitlementIssue);
    const rejected = await issue(api, account, definition, { quantity: '1' });
    expectUserError(rejected.data.loyaltyMutation.rewardEntitlementIssue);
    expect(rejected.data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement).toBeNull();
  });

  test('revokes an issued entitlement once and records deterministic history', async ({ api }) => {
    const { account, definition } = await fixture(api);
    const issued = (await issue(api, account, definition)).data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement;
    const revoked = await api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRevoke', { variables: { input: { entitlementId: issued.id,  reasonCode: 'ADMIN_REVOKED', idempotencyKey: idempotencyKey('entitlement-revoke') } } });
    expectNoUserErrors(revoked.data.loyaltyMutation.rewardEntitlementRevoke);
    expect(revoked.data.loyaltyMutation.rewardEntitlementRevoke.rewardEntitlement).toMatchObject({ status: 'REVOKED', revision: 2, events: [{ eventType: 'ISSUED' }, { eventType: 'REVOKED', previousStatus: 'ISSUED', status: 'REVOKED', reasonCode: 'ADMIN_REVOKED' }] });
    const repeated = await api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRevoke', { variables: { input: { entitlementId: issued.id,  reasonCode: 'AGAIN', idempotencyKey: idempotencyKey('revoke-again') } } });
    expectUserError(repeated.data.loyaltyMutation.rewardEntitlementRevoke);
  });

  test('rejects release from issued and stale transitions without side effects', async ({ api }) => {
    const { account, definition } = await fixture(api);
    const issued = (await issue(api, account, definition)).data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement;
    const release = await api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRelease', { variables: { input: { entitlementId: issued.id,  reasonCode: 'NOT_RESERVED', idempotencyKey: idempotencyKey('invalid-release') } } });
    expectUserError(release.data.loyaltyMutation.rewardEntitlementRelease);
    expect(release.data.loyaltyMutation.rewardEntitlementRelease.rewardEntitlement).toBeNull();
  });

  test('filters entitlements and replays issuance idempotently', async ({ api }) => {
    const { account, definition } = await fixture(api);
    const key = idempotencyKey('issue-replay');
    const first = await issue(api, account, definition, { idempotencyKey: key });
    const replay = await issue(api, account, definition, { idempotencyKey: key });
    expect(replay.data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement.id).toBe(first.data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement.id);
    const listed = await api.admin.query<any>('loyality-admin-api/RewardEntitlements', { variables: { first: 20, where: { accountIds: [account.id], rewardDefinitionIds: [definition.id], statuses: ['ISSUED'], validAt: new Date().toISOString() } } });
    expect(listed.data.loyaltyQuery.rewardEntitlements).toEqual([expect.objectContaining({ id: first.data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement.id })]);
    const conflict = await issue(api, account, definition, { idempotencyKey: key, quantity: '2' });
    expectUserError(conflict.data.loyaltyMutation.rewardEntitlementIssue);
  });
});
