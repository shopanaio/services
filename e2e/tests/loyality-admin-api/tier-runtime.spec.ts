/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import {
  createDraft,
  expectNoUserErrors,
  expectUserError,
  idempotencyKey,
  publishVersion,
  seedAccount,
} from './helpers';

const metric = (threshold: string) => ({
  type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null,
  operator: 'GTE', threshold, currencyCode: null,
});
const tier = (code: string, rank: number, threshold: string) => ({
  code, name: code.toUpperCase(), rank,
  qualification: metric(threshold), maintenance: null,
});

test.describe('Loyalty Admin API tier evaluation and benefits', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function evaluate(accountId: string, versionId: string, overrides: Record<string, unknown> = {}) {
    return kit.api.admin.mutation<any>('loyality-admin-api/TierEvaluate', {
      variables: { input: {
        accountId,
        programVersionId: versionId,
        effectiveAt: new Date().toISOString(),
        forceRequalification: false,
        reasonCode: 'ADMIN_EVALUATION',
        idempotencyKey: idempotencyKey('tier-evaluate'),
        ...overrides,
      } },
    });
  }

  test('qualifies the highest matching tier from immutable earning metrics', async () => {
    const fixture = await kit.createActiveAccount({
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 365, downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('silver', 5, '5'), tier('gold', 10, '10')],
    });
    await kit.deliverEvent(kit.orderRewardEvent());
    const result = await evaluate(fixture.account.id, fixture.version.id);
    const payload = result.data.loyaltyMutation.tierEvaluate;
    expectNoUserErrors(payload);
    expect(payload.tierMembership).toMatchObject({
      status: 'ACTIVE', revision: 1, tier: { code: 'gold', rank: 10 },
      events: [expect.objectContaining({
        eventType: 'QUALIFIED',
        tier: expect.objectContaining({ code: 'gold' }),
        reasonCode: 'ADMIN_EVALUATION',
      })],
    });
  });

  test('downgrades immediately when maintenance fails and preserves audit history', async () => {
    const fixture = await kit.createActiveAccount({
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 365, downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('bronze', 1, '0'), { ...tier('gold', 10, '100'), maintenance: metric('100') }],
    });
    await kit.seedTierMembership(fixture.account, fixture.version, { tierIndex: 1 });
    const result = await evaluate(fixture.account.id, fixture.version.id);
    const payload = result.data.loyaltyMutation.tierEvaluate;
    expectNoUserErrors(payload);
    expect(payload.tierMembership).toMatchObject({
      status: 'ACTIVE', tier: { code: 'bronze' },
      events: [expect.objectContaining({
        eventType: 'DOWNGRADED',
        previousTier: expect.objectContaining({ code: 'gold' }),
        tier: expect.objectContaining({ code: 'bronze' }),
      })],
    });
  });

  test('keeps the current tier during its grace period', async () => {
    const fixture = await kit.createActiveAccount({
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 365, gracePeriodDays: 30, downgradePolicy: 'GRACE_PERIOD', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('bronze', 1, '0'), { ...tier('gold', 10, '100'), maintenance: metric('100') }],
    });
    await kit.seedTierMembership(fixture.account, fixture.version, { tierIndex: 1 });
    const result = await evaluate(fixture.account.id, fixture.version.id);
    expectNoUserErrors(result.data.loyaltyMutation.tierEvaluate);
    expect(result.data.loyaltyMutation.tierEvaluate.tierMembership.tier.code).toBe('gold');
  });

  test('defers downgrade until END_OF_MEMBERSHIP and applies it after the boundary', async () => {
    const fixture = await kit.createActiveAccount({
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 30, downgradePolicy: 'END_OF_MEMBERSHIP', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('bronze', 1, '0'), { ...tier('gold', 10, '100'), maintenance: metric('100') }],
    });
    const effectiveTo = new Date(Date.now() + 60_000).toISOString();
    await kit.seedTierMembership(fixture.account, fixture.version, { tierIndex: 1, effectiveTo });
    const before = await evaluate(fixture.account.id, fixture.version.id, {
      effectiveAt: new Date(Date.parse(effectiveTo) - 1).toISOString(),
    });
    expect(before.data.loyaltyMutation.tierEvaluate.tierMembership.tier.code).toBe('gold');
    const after = await evaluate(fixture.account.id, fixture.version.id, {
      effectiveAt: new Date(Date.parse(effectiveTo) + 1).toISOString(),
    });
    expect(after.data.loyaltyMutation.tierEvaluate.tierMembership.tier.code).toBe('bronze');
  });

  test('expires manual membership and requires an explicit forced requalification', async () => {
    const fixture = await kit.createActiveAccount({
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 1, downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'MANUAL' },
      tiers: [tier('member', 1, '0')],
    });
    const effectiveTo = new Date(Date.now() - 1_000).toISOString();
    await kit.seedTierMembership(fixture.account, fixture.version, { effectiveTo });
    const expired = await evaluate(fixture.account.id, fixture.version.id);
    expectNoUserErrors(expired.data.loyaltyMutation.tierEvaluate);
    expect(expired.data.loyaltyMutation.tierEvaluate.tierMembership).toBeNull();
    const forced = await evaluate(fixture.account.id, fixture.version.id, { forceRequalification: true });
    expectNoUserErrors(forced.data.loyaltyMutation.tierEvaluate);
    expect(forced.data.loyaltyMutation.tierEvaluate.tierMembership).toMatchObject({ status: 'ACTIVE', tier: { code: 'member' } });
    const history = await kit.api.admin.query<any>('loyality-admin-api/TierMemberships', {
      variables: { accountId: fixture.account.id, first: 20 },
    });
    expect(history.data.loyaltyQuery.tierMemberships.map(({ status }: any) => status).sort())
      .toEqual(['ACTIVE', 'EXPIRED']);
  });

  test('revokes an active membership once and records the administrative reason', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier('member', 1, '0')] });
    const evaluated = await evaluate(fixture.account.id, fixture.version.id);
    const membership = evaluated.data.loyaltyMutation.tierEvaluate.tierMembership;
    const input = {
      membershipId: membership.id,
      expectedRevision: membership.revision,
      effectiveAt: new Date().toISOString(),
      reasonCode: 'ADMIN_REVOKED',
      idempotencyKey: idempotencyKey('tier-revoke'),
    };
    const revoked = await kit.api.admin.mutation<any>('loyality-admin-api/TierMembershipRevoke', { variables: { input } });
    expectNoUserErrors(revoked.data.loyaltyMutation.tierMembershipRevoke);
    expect(revoked.data.loyaltyMutation.tierMembershipRevoke.tierMembership).toMatchObject({
      status: 'REVOKED', revision: membership.revision + 1,
      events: [
        expect.objectContaining({ eventType: 'QUALIFIED' }),
        expect.objectContaining({ eventType: 'REVOKED', reasonCode: 'ADMIN_REVOKED' }),
      ],
    });
    const replay = await kit.api.admin.mutation<any>('loyality-admin-api/TierMembershipRevoke', { variables: { input } });
    expectNoUserErrors(replay.data.loyaltyMutation.tierMembershipRevoke);
    expect(replay.data.loyaltyMutation.tierMembershipRevoke.tierMembership.revision)
      .toBe(membership.revision + 1);
  });

  test('issues an ON_QUALIFICATION tier benefit exactly once', async () => {
    const { program, version } = await createDraft(kit.api, { isDefault: true }, {
      tierPolicy: { windowType: 'LIFETIME', membershipDurationDays: 365, downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('gold', 10, '0')],
      rewardDefinitions: [{ code: 'gold-benefit', name: 'Gold benefit', rewardType: 'POINTS', configuration: { points: '100' } }],
    });
    const benefit = await kit.api.admin.mutation<any>('loyality-admin-api/TierRewardBenefitCreate', {
      variables: { input: {
        tierId: version.tiers[0].id,
        rewardDefinitionId: version.rewardDefinitions[0].id,
        grantPolicy: { type: 'ON_QUALIFICATION' },
        idempotencyKey: idempotencyKey('tier-benefit'),
      } },
    });
    expectNoUserErrors(benefit.data.loyaltyMutation.tierRewardBenefitCreate);
    await publishVersion(kit.api, version);
    const account = await seedAccount(kit.api, program, { customerId: kit.customer.rawId });
    const first = await evaluate(account.id, version.id);
    expectNoUserErrors(first.data.loyaltyMutation.tierEvaluate);
    await evaluate(account.id, version.id);
    const entitlements = await kit.api.admin.query<any>('loyality-admin-api/RewardEntitlements', {
      variables: { first: 20, where: { accountIds: [account.id], rewardDefinitionIds: [version.rewardDefinitions[0].id] } },
    });
    expect(entitlements.data.loyaltyQuery.rewardEntitlements).toHaveLength(1);
  });

  test('deletes draft benefits tiers and policies but protects published configuration', async () => {
    const { version } = await createDraft(kit.api, {}, {
      tierPolicy: { windowType: 'LIFETIME', downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'AUTOMATIC' },
      tiers: [tier('draft', 1, '0')],
      rewardDefinitions: [{ code: 'draft-benefit', name: 'Draft benefit', rewardType: 'POINTS', configuration: { points: '1' } }],
    });
    const created = await kit.api.admin.mutation<any>('loyality-admin-api/TierRewardBenefitCreate', {
      variables: { input: { tierId: version.tiers[0].id, rewardDefinitionId: version.rewardDefinitions[0].id, idempotencyKey: idempotencyKey('benefit-create') } },
    });
    const benefitId = created.data.loyaltyMutation.tierRewardBenefitCreate.tierRewardBenefit.id;
    const benefitDeleted = await kit.api.admin.mutation<any>('loyality-admin-api/TierRewardBenefitDelete', {
      variables: { input: { tierRewardBenefitId: benefitId, idempotencyKey: idempotencyKey('benefit-delete') } },
    });
    expectNoUserErrors(benefitDeleted.data.loyaltyMutation.tierRewardBenefitDelete);
    const tierDeleted = await kit.api.admin.mutation<any>('loyality-admin-api/TierDelete', {
      variables: { input: { tierId: version.tiers[0].id, idempotencyKey: idempotencyKey('tier-delete') } },
    });
    expectNoUserErrors(tierDeleted.data.loyaltyMutation.tierDelete);
    const policyDeleted = await kit.api.admin.mutation<any>('loyality-admin-api/TierPolicyDelete', {
      variables: { input: { programVersionId: version.id, idempotencyKey: idempotencyKey('policy-delete') } },
    });
    expectNoUserErrors(policyDeleted.data.loyaltyMutation.tierPolicyDelete);

    const publishedFixture = await kit.createActiveAccount({ tiers: [tier('published', 1, '0')] });
    const rejected = await kit.api.admin.mutation<any>('loyality-admin-api/TierDelete', {
      variables: { input: { tierId: publishedFixture.version.tiers[0].id, idempotencyKey: idempotencyKey('published-delete') } },
    });
    expectUserError(rejected.data.loyaltyMutation.tierDelete, 'PROGRAM_VERSION_IMMUTABLE');
  });
});
