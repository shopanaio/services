/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { REWARD_FIELDS } from '../loyality-storefront-api/loyalty-storefront-test-kit';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty reward entitlements end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('issues an immutable reward and presents it on Storefront', async () => {
    const fixture = await kit.createActiveAccount();
    const definition = fixture.version.rewardDefinitions.find(({ rewardType }: any) => rewardType === 'POINTS');
    const entitlement = await kit.issueReward(fixture.account, definition.id, { quantity: '2' });
    expect(entitlement).toMatchObject({
      status: 'ISSUED', quantity: '2', configurationSnapshot: { points: '1' }, revision: 1,
    });
    const account = await kit.loyaltyAccount(`availableRewards(first: 20) {
      totalCount nodes { id reward { ${REWARD_FIELDS} } }
    }`);
    expect(account?.availableRewards).toMatchObject({
      totalCount: 1,
      nodes: [{ reward: { kind: 'POINTS', points: { minimum: '2', maximum: '2' } } }],
    });
  });

  test('excludes future expired revoked reserved and redeemed rewards', async () => {
    const fixture = await kit.createActiveAccount();
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' });
    for (const status of ['RESERVED', 'REDEEMED', 'EXPIRED', 'REVOKED']) {
      await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' }, { status });
    }
    await kit.seedAvailableReward(fixture, 'POINTS', { points: '1' }, {
      validFrom: new Date(Date.now() + 60_000), validTo: new Date(Date.now() + 120_000),
    });
    const account = await kit.loyaltyAccount('availableRewards(first: 20) { totalCount nodes { id } }');
    expect(account?.availableRewards).toMatchObject({ totalCount: 1 });
  });

  test('revokes an entitlement with an audit event and removes it from Storefront', async () => {
    const fixture = await kit.createActiveAccount();
    const definition = fixture.version.rewardDefinitions.find(({ rewardType }: any) => rewardType === 'POINTS');
    const issued = await kit.issueReward(fixture.account, definition.id);
    const revoked = await kit.api.admin.mutation<any>('loyality-admin-api/RewardEntitlementRevoke', {
      variables: { input: {
        entitlementId: issued.id, 
        reasonCode: 'E2E_REVOKED', idempotencyKey: idempotencyKey('revoke'),
      } },
    });
    expect(revoked.data.loyaltyMutation.rewardEntitlementRevoke.rewardEntitlement)
      .toMatchObject({ status: 'REVOKED', revision: 2 });
    expect((await kit.loyaltyAccount('availableRewards(first: 20) { totalCount }'))?.availableRewards.totalCount)
      .toBe(0);
  });

  test('replays issuance exactly once', async () => {
    const fixture = await kit.createActiveAccount();
    const definition = fixture.version.rewardDefinitions.find(({ rewardType }: any) => rewardType === 'POINTS');
    const key = idempotencyKey('issue-replay');
    const first = await kit.issueReward(fixture.account, definition.id, { idempotencyKey: key });
    const replay = await kit.issueReward(fixture.account, definition.id, { idempotencyKey: key });
    expect(replay.id).toBe(first.id);
    const listed = await kit.api.admin.query<any>('loyality-admin-api/RewardEntitlements', {
      variables: { first: 20, where: { accountIds: [fixture.account.id] } },
    });
    expect(listed.data.loyaltyQuery.rewardEntitlements).toHaveLength(1);
  });
});
