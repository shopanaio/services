/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, idempotencyKey, publishVersion, setupStore, unique } from './helpers';

const metric = { type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null, operator: 'GTE', threshold: '100', currencyCode: null };

test.describe('Loyalty Admin API tiers and benefits', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('configures lifetime rolling and calendar tier policies', async ({ api }) => {
    const cases = [
      { windowType: 'LIFETIME' },
      { windowType: 'ROLLING', rollingWindowDays: 365 },
      { windowType: 'CALENDAR', calendarPeriod: 'MONTH' },
      { windowType: 'CALENDAR', calendarPeriod: 'PROGRAM_YEAR', programYearStartsMonth: 4 },
    ];
    for (const policy of cases) {
      const { version } = await createDraft(api);
      const result = await api.admin.mutation<any>('loyality-admin-api/TierPolicyUpsert', { variables: { input: { programVersionId: version.id, membershipDurationDays: 365, gracePeriodDays: 30, downgradePolicy: 'GRACE_PERIOD', requalificationPolicy: 'AUTOMATIC', idempotencyKey: idempotencyKey('tier-policy'), ...policy } } });
      expectNoUserErrors(result.data.loyaltyMutation.tierPolicyUpsert);
      expect(result.data.loyaltyMutation.tierPolicyUpsert.tierPolicy).toMatchObject(policy);
    }
  });

  test('validates tier-policy dependent options and ranges', async ({ api }) => {
    for (const policy of [
      { windowType: 'ROLLING' },
      { windowType: 'LIFETIME', rollingWindowDays: 10 },
      { windowType: 'CALENDAR' },
      { windowType: 'CALENDAR', calendarPeriod: 'PROGRAM_YEAR', programYearStartsMonth: 13 },
    ]) {
      const { version } = await createDraft(api);
      const result = await api.admin.mutation<any>('loyality-admin-api/TierPolicyUpsert', { variables: { input: { programVersionId: version.id, idempotencyKey: idempotencyKey('invalid-policy'), ...policy } } });
      expectUserError(result.data.loyaltyMutation.tierPolicyUpsert);
      expect(result.data.loyaltyMutation.tierPolicyUpsert.tierPolicy).toBeNull();
    }
  });

  test('creates ranked tiers with nested qualification expressions and updates them', async ({ api }) => {
    const { version } = await createDraft(api);
    const qualification = { type: 'ALL', expressions: [metric, { type: 'NOT', expression: { ...metric, operator: 'GT', threshold: '1000' } }] };
    const created = await api.admin.mutation<any>('loyality-admin-api/TierCreate', { variables: { input: { programVersionId: version.id, code: unique('gold'), name: 'Gold', rank: 10, qualification, maintenance: metric, idempotencyKey: idempotencyKey('tier-create') } } });
    const payload = created.data.loyaltyMutation.tierCreate;
    expectNoUserErrors(payload);
    expect(payload.tier).toMatchObject({ name: 'Gold', rank: 10, qualification, maintenance: metric });
    const updated = await api.admin.mutation<any>('loyality-admin-api/TierUpdate', { variables: { input: { tierId: payload.tier.id, name: 'Platinum', rank: 20, clearMaintenance: true, idempotencyKey: idempotencyKey('tier-update') } } });
    expectNoUserErrors(updated.data.loyaltyMutation.tierUpdate);
    expect(updated.data.loyaltyMutation.tierUpdate.tier).toMatchObject({ name: 'Platinum', rank: 20, maintenance: null });
  });

  test('rejects invalid metric combinations duplicate ranks and published changes', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const qualification of [
      { ...metric, metric: 'CUSTOM', customMetricCode: null },
      { ...metric, metric: 'NET_SPEND_MINOR', currencyCode: null },
      { ...metric, metric: 'ORDER_COUNT', currencyCode: 'USD' },
      { ...metric, threshold: '-1' },
    ]) {
      const result = await api.admin.mutation<any>('loyality-admin-api/TierCreate', { variables: { input: { programVersionId: version.id, code: unique('invalid-tier'), name: 'Invalid', rank: Math.floor(Math.random() * 10000) + 1, qualification, idempotencyKey: idempotencyKey('invalid-tier') } } });
      expectUserError(result.data.loyaltyMutation.tierCreate);
    }
    const first = await api.admin.mutation<any>('loyality-admin-api/TierCreate', { variables: { input: { programVersionId: version.id, code: unique('bronze'), name: 'Bronze', rank: 1, qualification: metric, idempotencyKey: idempotencyKey('bronze') } } });
    const duplicate = await api.admin.mutation<any>('loyality-admin-api/TierCreate', { variables: { input: { programVersionId: version.id, code: unique('silver'), name: 'Silver', rank: 1, qualification: metric, idempotencyKey: idempotencyKey('silver') } } });
    expectUserError(duplicate.data.loyaltyMutation.tierCreate);
    await publishVersion(api, version);
    const update = await api.admin.mutation<any>('loyality-admin-api/TierUpdate', { variables: { input: { tierId: first.data.loyaltyMutation.tierCreate.tier.id, name: 'Changed', idempotencyKey: idempotencyKey('published-tier') } } });
    expectUserError(update.data.loyaltyMutation.tierUpdate);
  });
});
