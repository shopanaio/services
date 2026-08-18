/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, idempotencyKey, publishVersion, setupStore, unique } from './helpers';

const conditions = { type: 'ALL', conditions: [] };

test.describe('Loyalty Admin API universal earning rules', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('creates rules for every supported trigger type', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const triggerType of ['ORDER', 'SIGNUP', 'REVIEW', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'LOGIN', 'SUBSCRIPTION_RENEWAL', 'CUSTOM_EVENT'] as const) {
      const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { programVersionId: version.id, code: unique(triggerType.toLowerCase()), name: triggerType, triggerType, triggerConfig: triggerType === 'CUSTOM_EVENT' ? { eventType: 'custom.promoted' } : {}, conditions, actionType: 'AWARD_FIXED_POINTS', action: { type: 'AWARD_FIXED_POINTS', points: '25' }, limits: {}, idempotencyKey: idempotencyKey(`rule-${triggerType}`) } } });
      expectNoUserErrors(result.data.loyaltyMutation.earningRuleCreate);
      expect(result.data.loyaltyMutation.earningRuleCreate.earningRule).toMatchObject({ triggerType, actionType: 'AWARD_FIXED_POINTS', action: { points: '25', type: 'AWARD_FIXED_POINTS' } });
    }
  });

  test('supports every action schema with decimal strings intact', async ({ api }) => {
    const { version } = await createDraft(api);
    const actions = [
      ['AWARD_FIXED_POINTS', { type: 'AWARD_FIXED_POINTS', points: '9007199254740993' }],
      ['AWARD_SPEND_RATIO', { type: 'AWARD_SPEND_RATIO', points: '3', amountMinor: '100' }],
      ['AWARD_CASHBACK', { type: 'AWARD_CASHBACK', basisPoints: 500, settlement: 'MONETARY', currencyCode: 'USD' }],
      ['APPLY_MULTIPLIER', { type: 'APPLY_MULTIPLIER', multiplierBps: 15_000 }],
    ] as const;
    for (const [actionType, action] of actions) {
      const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { programVersionId: version.id, code: unique(actionType.toLowerCase()), name: actionType, triggerType: 'ORDER', conditions, actionType, action, limits: {}, idempotencyKey: idempotencyKey(`action-${actionType}`) } } });
      expectNoUserErrors(result.data.loyaltyMutation.earningRuleCreate);
      expect(result.data.loyaltyMutation.earningRuleCreate.earningRule.action).toEqual(action);
    }
  });

  test('updates and deletes rules only while their version is a draft', async ({ api }) => {
    const { version } = await createDraft(api);
    const created = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { programVersionId: version.id, code: unique('rule'), name: 'Original', priority: 1, triggerType: 'ORDER', conditions, actionType: 'AWARD_FIXED_POINTS', action: { type: 'AWARD_FIXED_POINTS', points: '10' }, limits: {}, idempotencyKey: idempotencyKey('rule-create') } } });
    const rule = created.data.loyaltyMutation.earningRuleCreate.earningRule;
    const updated = await api.admin.mutation<any>('loyality-admin-api/EarningRuleUpdate', { variables: { input: { earningRuleId: rule.id, name: 'Updated', priority: 100, stopProcessing: true, idempotencyKey: idempotencyKey('rule-update') } } });
    expectNoUserErrors(updated.data.loyaltyMutation.earningRuleUpdate);
    expect(updated.data.loyaltyMutation.earningRuleUpdate.earningRule).toMatchObject({ name: 'Updated', priority: 100, stopProcessing: true });
    const deleted = await api.admin.mutation<any>('loyality-admin-api/EarningRuleDelete', { variables: { input: { earningRuleId: rule.id, idempotencyKey: idempotencyKey('rule-delete') } } });
    expectNoUserErrors(deleted.data.loyaltyMutation.earningRuleDelete);
    expect(deleted.data.loyaltyMutation.earningRuleDelete.deletedId).toBe(rule.id);
  });

  test('rejects invalid policy shapes without persisting a rule', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const invalid of [
      { conditions: { type: 'SEGMENT', match: 'ANY', segmentIds: [] } },
      { action: { type: 'AWARD_FIXED_POINTS', points: '0' } },
      { actionType: 'AWARD_CASHBACK', action: { type: 'AWARD_CASHBACK', basisPoints: 10100, settlement: 'POINTS', currencyCode: null } },
      { triggerConfig: { eventType: 'one', eventTypes: ['two'] } },
    ]) {
      const result = await api.admin.mutation<any>('loyality-admin-api/EarningRuleCreate', { variables: { input: { programVersionId: version.id, code: unique('invalid'), name: 'Invalid', triggerType: 'ORDER', triggerConfig: {}, conditions, actionType: 'AWARD_FIXED_POINTS', action: { type: 'AWARD_FIXED_POINTS', points: '1' }, limits: {}, idempotencyKey: idempotencyKey('invalid-rule'), ...invalid } } });
      expectUserError(result.data.loyaltyMutation.earningRuleCreate);
      expect(result.data.loyaltyMutation.earningRuleCreate.earningRule).toBeNull();
    }
  });

  test('protects rules after publication', async ({ api }) => {
    const { version } = await createDraft(api, {}, { earningRules: [{ code: 'published', name: 'Published', triggerType: 'ORDER', conditions, actionType: 'AWARD_FIXED_POINTS', action: { type: 'AWARD_FIXED_POINTS', points: '1' }, limits: {} }] });
    const rule = version.earningRules[0];
    await publishVersion(api, version);
    const update = await api.admin.mutation<any>('loyality-admin-api/EarningRuleUpdate', { variables: { input: { earningRuleId: rule.id, name: 'Mutated', idempotencyKey: idempotencyKey('published-rule') } } });
    expectUserError(update.data.loyaltyMutation.earningRuleUpdate);
    expect(update.data.loyaltyMutation.earningRuleUpdate.earningRule).toBeNull();
  });
});
