/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import { expectNoUserErrors, expectUserError, idempotencyKey } from './helpers';

test.describe('Loyalty Admin API reward entitlement state machine', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function issue(accountId: string, definitionId: string, overrides: Record<string, unknown> = {}) {
    return kit.api.admin.mutation<any>('loyality-admin-api/RewardEntitlementIssue', {
      variables: { input: {
        accountId, rewardDefinitionId: definitionId, quantity: '1',
        idempotencyKey: idempotencyKey('reward-state-issue'), ...overrides,
      } },
    });
  }

  test('rejects issuance to inactive accounts and across program boundaries', async () => {
    const first = await kit.createActiveAccount();
    const definition = first.version.rewardDefinitions.find(({ rewardType }: any) => rewardType === 'POINTS');
    await kit.setAccountStatus(first.account, 'SUSPENDED');
    const inactive = await issue(first.account.id, definition.id);
    expectUserError(inactive.data.loyaltyMutation.rewardEntitlementIssue, 'ACCOUNT_NOT_ACTIVE');

    const second = await kit.createActiveAccount();
    const mismatch = await issue(second.account.id, definition.id);
    expectUserError(mismatch.data.loyaltyMutation.rewardEntitlementIssue, 'REWARD_PROGRAM_MISMATCH');
    expect(mismatch.data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement).toBeNull();
  });

  test('enforces inclusive startsAt and exclusive endsAt during actual issuance', async () => {
    const startsAt = new Date(Date.now() + 60_000).toISOString();
    const endsAt = new Date(Date.now() + 120_000).toISOString();
    const fixture = await kit.createActiveAccount({ rewardDefinitions: [{
      code: 'scheduled-reward', name: 'Scheduled reward', rewardType: 'POINTS',
      configuration: { points: '10' }, startsAt, endsAt,
    }] });
    const definition = fixture.version.rewardDefinitions.find(({ code }: any) => code === 'scheduled-reward');
    const early = await issue(fixture.account.id, definition.id, { occurredAt: new Date().toISOString() });
    expectUserError(early.data.loyaltyMutation.rewardEntitlementIssue, 'REWARD_DEFINITION_INACTIVE');
    const atStart = await issue(fixture.account.id, definition.id, { occurredAt: startsAt });
    expectNoUserErrors(atStart.data.loyaltyMutation.rewardEntitlementIssue);
    const atEnd = await issue(fixture.account.id, definition.id, { occurredAt: endsAt });
    expectUserError(atEnd.data.loyaltyMutation.rewardEntitlementIssue, 'REWARD_DEFINITION_INACTIVE');
  });

  test('serializes concurrent issuance at a global quantity limit', async () => {
    const fixture = await kit.createActiveAccount({ rewardDefinitions: [{
      code: 'single-global', name: 'Single global reward', rewardType: 'POINTS',
      configuration: { points: '10' }, issuanceLimit: '1',
    }] });
    const definition = fixture.version.rewardDefinitions.find(({ code }: any) => code === 'single-global');
    const calls = await Promise.all([1, 2].map(() => issue(fixture.account.id, definition.id)));
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.rewardEntitlementIssue.userErrors.length === 0)).toHaveLength(1);
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.rewardEntitlementIssue.userErrors[0]?.code === 'REWARD_ISSUANCE_LIMIT_REACHED')).toHaveLength(1);
    const listed = await kit.api.admin.query<any>('loyality-admin-api/RewardEntitlements', {
      variables: { first: 20, where: { accountIds: [fixture.account.id], rewardDefinitionIds: [definition.id] } },
    });
    expect(listed.data.loyaltyQuery.rewardEntitlements).toHaveLength(1);
  });

  test('releases a reserved entitlement and clears checkout ownership', async () => {
    const fixture = await kit.createActiveAccount();
    const definition = fixture.version.rewardDefinitions.find(({ rewardType }: any) => rewardType === 'POINTS');
    const issued = (await issue(fixture.account.id, definition.id)).data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement;
    const checkoutId = crypto.randomUUID();
    await kit.sql`
      update loyalty.reward_entitlement
      set status = 'RESERVED', reserved_for_checkout_id = ${checkoutId}, reserved_at = now(), revision = revision + 1
      where id = ${decodeGlobalId(issued.id).id}
    `;
    const result = await kit.api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRelease', {
      variables: { input: {
        entitlementId: issued.id,  reasonCode: 'ADMIN_RELEASED',
        idempotencyKey: idempotencyKey('entitlement-release-success'),
      } },
    });
    expectNoUserErrors(result.data.loyaltyMutation.rewardEntitlementRelease);
    expect(result.data.loyaltyMutation.rewardEntitlementRelease.rewardEntitlement).toMatchObject({
      status: 'ISSUED', revision: 3, reservedForCheckoutId: null,
      events: [
        expect.objectContaining({ eventType: 'ISSUED' }),
        expect.objectContaining({ eventType: 'RELEASED', previousStatus: 'RESERVED', status: 'ISSUED', reasonCode: 'ADMIN_RELEASED' }),
      ],
    });
  });

  test('expires overdue issued rewards once and rejects terminal revocation', async () => {
    const fixture = await kit.createActiveAccount({ rewardDefinitions: [{
      code: 'one-day', name: 'One day reward', rewardType: 'POINTS',
      configuration: { points: '5' }, validityDays: 1,
    }] });
    const definition = fixture.version.rewardDefinitions.find(({ code }: any) => code === 'one-day');
    const occurredAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const issued = (await issue(fixture.account.id, definition.id, { occurredAt }))
      .data.loyaltyMutation.rewardEntitlementIssue.rewardEntitlement;
    const maintenance = await kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: { effectiveAt: new Date().toISOString(), limit: 100, idempotencyKey: idempotencyKey('expire-reward') } },
    });
    expect(maintenance.data.loyaltyMutation.maintenanceRun.result.expiredRewards).toBe(1);
    const revoke = await kit.api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRevoke', {
      variables: { input: {
        entitlementId: issued.id,  reasonCode: 'TOO_LATE',
        idempotencyKey: idempotencyKey('expired-revoke'),
      } },
    });
    expectUserError(revoke.data.loyaltyMutation.rewardEntitlementRevoke, 'ENTITLEMENT_TERMINAL');
    const replayMaintenance = await kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: { effectiveAt: new Date().toISOString(), limit: 100, idempotencyKey: idempotencyKey('expire-reward-replay') } },
    });
    expect(replayMaintenance.data.loyaltyMutation.maintenanceRun.result.expiredRewards).toBe(0);
  });
});
