/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, future, idempotencyKey, past, setupStore, unique } from './helpers';

const baseInput = (versionId: string) => ({ programVersionId: versionId, code: unique('limited'), name: 'Limited earning', triggerType: 'ORDER', conditions: { type: 'ALL', conditions: [] }, actionType: 'AWARD_FIXED_POINTS', action: { type: 'AWARD_FIXED_POINTS', points: '100' }, idempotencyKey: idempotencyKey('limited-rule') });

test.describe('Loyalty Admin API earning rule limits', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('persists inclusive-start exclusive-end schedules and per-event caps', async ({ api }) => {
    const { version } = await createDraft(api);
    const limits = { startsAt: past(5), endsAt: future(5), perEventMaxPoints: '50', perAccount: null, campaign: null };
    const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { ...baseInput(version.id), limits } } });
    expectNoUserErrors(result.data.loyaltyMutation.earningRuleCreate);
    expect(result.data.loyaltyMutation.earningRuleCreate.earningRule.limits).toEqual(limits);
  });

  test('supports lifetime day week month and rolling per-account windows', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const window of [
      { type: 'LIFETIME', rollingWindowSeconds: null },
      { type: 'DAY', rollingWindowSeconds: null },
      { type: 'WEEK', rollingWindowSeconds: null },
      { type: 'MONTH', rollingWindowSeconds: null },
      { type: 'ROLLING', rollingWindowSeconds: 86_400 },
    ]) {
      const limits = { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: { maxOccurrences: '2', maxPoints: '100', window }, campaign: null };
      const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { ...baseInput(version.id), code: unique('window'), limits } } });
      expectNoUserErrors(result.data.loyaltyMutation.earningRuleCreate);
      expect(result.data.loyaltyMutation.earningRuleCreate.earningRule.limits.perAccount.window).toEqual(window);
    }
  });

  test('persists campaign occurrence points and per-currency monetary budgets', async ({ api }) => {
    const { version } = await createDraft(api);
    const campaign = { maxOccurrences: '100', maxPoints: '5000', maxMonetaryMinorByCurrency: { USD: '10000', EUR: '9007199254740993' } };
    const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { ...baseInput(version.id), limits: { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: null, campaign } } } });
    expectNoUserErrors(result.data.loyaltyMutation.earningRuleCreate);
    expect(result.data.loyaltyMutation.earningRuleCreate.earningRule.limits.campaign).toEqual(campaign);
  });

  test('rejects invalid schedules windows caps and monetary values', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const limits of [
      { startsAt: future(10), endsAt: future(5), perEventMaxPoints: null, perAccount: null, campaign: null },
      { startsAt: null, endsAt: null, perEventMaxPoints: '-1', perAccount: null, campaign: null },
      { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: { maxOccurrences: '1', maxPoints: null, window: { type: 'ROLLING', rollingWindowSeconds: null } }, campaign: null },
      { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: null, campaign: { maxOccurrences: null, maxPoints: null, maxMonetaryMinorByCurrency: { usd: '10' } } },
    ]) {
      const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { ...baseInput(version.id), code: unique('invalid-limit'), limits } } });
      expectUserError(result.data.loyaltyMutation.earningRuleCreate);
      expect(result.data.loyaltyMutation.earningRuleCreate.earningRule).toBeNull();
    }
  });
});
