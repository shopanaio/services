/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, future, idempotencyKey, publishVersion, setupStore, unique } from './helpers';

test.describe('Loyalty Admin API reward definitions', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('creates points member-benefit and monetary-credit definitions', async ({ api }) => {
    const { version } = await createDraft(api);
    const definitions = [
      ['POINTS', { points: '9007199254740993' }],
      ['MEMBER_BENEFIT', { benefitCode: 'priority-support' }],
      ['MONETARY_CREDIT', { amountMinor: '500', currencyCode: 'USD', walletType: 'STORE_CREDIT' }],
    ] as const;
    for (const [rewardType, configuration] of definitions) {
      const result = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionCreate', { variables: { input: { programVersionId: version.id, code: unique(rewardType.toLowerCase()), name: rewardType, rewardType, configuration, validityDays: 30, issuanceLimit: '1000', perAccountLimit: '2', idempotencyKey: idempotencyKey(`reward-${rewardType}`) } } });
      const payload = result.data.loyaltyMutation.rewardDefinitionCreate;
      expectNoUserErrors(payload);
      expect(payload.rewardDefinition).toMatchObject({ rewardType, configuration, validityDays: 30, issuanceLimit: '1000', perAccountLimit: '2', issuedQuantity: '0' });
    }
  });

  test('updates and explicitly clears optional draft fields', async ({ api }) => {
    const { version } = await createDraft(api);
    const created = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionCreate', { variables: { input: { programVersionId: version.id, code: unique('points'), name: 'Points', rewardType: 'POINTS', configuration: { points: '10' }, validityDays: 10, startsAt: future(1), endsAt: future(20), issuanceLimit: '100', perAccountLimit: '1', idempotencyKey: idempotencyKey('reward-create') } } });
    const definition = created.data.loyaltyMutation.rewardDefinitionCreate.rewardDefinition;
    const updated = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionUpdate', { variables: { input: { rewardDefinitionId: definition.id, name: 'Updated points', configuration: { points: '20' }, clearValidityDays: true, clearStartsAt: true, clearEndsAt: true, clearIssuanceLimit: true, clearPerAccountLimit: true, idempotencyKey: idempotencyKey('reward-update') } } });
    expectNoUserErrors(updated.data.loyaltyMutation.rewardDefinitionUpdate);
    expect(updated.data.loyaltyMutation.rewardDefinitionUpdate.rewardDefinition).toMatchObject({ name: 'Updated points', configuration: { points: '20' }, validityDays: null, startsAt: null, endsAt: null, issuanceLimit: null, perAccountLimit: null });
  });

  test('validates configuration schedule and limit boundaries atomically', async ({ api }) => {
    const { version } = await createDraft(api);
    for (const invalid of [
      { rewardType: 'POINTS', configuration: { points: '0' } },
      { rewardType: 'MONETARY_CREDIT', configuration: { amountMinor: '-1', currencyCode: 'USD', walletType: 'CASHBACK' } },
      { rewardType: 'MEMBER_BENEFIT', configuration: {} },
      { rewardType: 'POINTS', configuration: { points: '1' }, startsAt: future(20), endsAt: future(10) },
      { rewardType: 'POINTS', configuration: { points: '1' }, validityDays: 0 },
    ]) {
      const result = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionCreate', { variables: { input: { programVersionId: version.id, code: unique('invalid'), name: 'Invalid', idempotencyKey: idempotencyKey('invalid-reward'), ...invalid } } });
      expectUserError(result.data.loyaltyMutation.rewardDefinitionCreate);
      expect(result.data.loyaltyMutation.rewardDefinitionCreate.rewardDefinition).toBeNull();
    }
  });

  test('enforces unique codes within a version and draft-only deletion', async ({ api }) => {
    const { version } = await createDraft(api);
    const input = { programVersionId: version.id, code: unique('unique'), name: 'First', rewardType: 'POINTS', configuration: { points: '1' } };
    const first = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionCreate', { variables: { input: { ...input, idempotencyKey: idempotencyKey('first') } } });
    const duplicate = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionCreate', { variables: { input: { ...input, name: 'Duplicate', idempotencyKey: idempotencyKey('duplicate') } } });
    expectUserError(duplicate.data.loyaltyMutation.rewardDefinitionCreate);
    const id = first.data.loyaltyMutation.rewardDefinitionCreate.rewardDefinition.id;
    const deleted = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionDelete', { variables: { input: { rewardDefinitionId: id, idempotencyKey: idempotencyKey('reward-delete') } } });
    expectNoUserErrors(deleted.data.loyaltyMutation.rewardDefinitionDelete);
    expect(deleted.data.loyaltyMutation.rewardDefinitionDelete.deletedId).toBe(id);
  });

  test('published definitions are immutable', async ({ api }) => {
    const { version } = await createDraft(api, {}, { rewardDefinitions: [{ code: 'published-points', name: 'Published points', rewardType: 'POINTS', configuration: { points: '10' } }] });
    const definition = version.rewardDefinitions[0];
    await publishVersion(api, version);
    const update = await api.admin.mutation<any>('loyality-admin-api/RewardDefinitionUpdate', { variables: { input: { rewardDefinitionId: definition.id, name: 'Changed', idempotencyKey: idempotencyKey('published-reward') } } });
    expectUserError(update.data.loyaltyMutation.rewardDefinitionUpdate);
  });
});
