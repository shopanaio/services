/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, createProgram, createVersion, expectNoUserErrors, expectUserError, future, idempotencyKey, publishVersion, requestVersionCreate, setupStore, versionInput } from './helpers';

test.describe('Loyalty Admin API program versions', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('creates a complete draft and preserves decimal-string policy fields', async ({ api }) => {
    const program = await createProgram(api);
    const version = await createVersion(api, program, { effectiveFrom: future(5), effectiveTo: future(60), pointsExpiryDays: 365, earnPoints: '9007199254740993', earnAmountMinor: '250', minimumEligibleAmountMinor: '500', redeemPoints: '250', redeemAmountMinor: '100', minimumRedeemPoints: '50', maximumRedeemPointsPerOrder: '5000', maximumOrderPercentageBps: 7500, roundingMode: 'NEAREST', refundPolicy: 'FULL_REVERSAL', debtPolicy: 'REJECT_REVERSAL', restoredPointsExpiryPolicy: 'RESET_FROM_RESTORE' });
    expect(version).toMatchObject({ version: 1, status: 'DRAFT', revision: 1, pointsExpiryDays: 365, earnPoints: '9007199254740993', earnAmountMinor: '250', minimumRedeemPoints: '50', maximumRedeemPointsPerOrder: '5000', maximumOrderPercentageBps: 7500, roundingMode: 'NEAREST', refundPolicy: 'FULL_REVERSAL', debtPolicy: 'REJECT_REVERSAL', restoredPointsExpiryPolicy: 'RESET_FROM_RESTORE' });
  });

  test('updates and explicitly clears nullable fields', async ({ api }) => {
    const { version } = await createDraft(api, {}, { effectiveTo: future(30), pointsExpiryDays: 30, maximumRedeemPointsPerOrder: '500' });
    const result = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionUpdate', { variables: { input: { programVersionId: version.id,  earningEnabled: false, clearEffectiveTo: true, clearPointsExpiryDays: true, clearMaximumRedeemPointsPerOrder: true, idempotencyKey: idempotencyKey('version-clear') } } });
    const payload = result.data.loyaltyMutation.programVersionUpdate;
    expectNoUserErrors(payload);
    expect(payload.programVersion).toMatchObject({ revision: 2, earningEnabled: false, effectiveTo: null, pointsExpiryDays: null, maximumRedeemPointsPerOrder: null });
  });

  test('publishes immediate and future versions with immutable publication metadata', async ({ api }) => {
    const immediateDraft = await createDraft(api);
    const immediate = await publishVersion(api, immediateDraft.version);
    expect(immediate).toMatchObject({ status: 'ACTIVE', program: { status: 'ACTIVE', activeVersion: { id: immediateDraft.version.id } } });
    expect(immediate.publishedAt).toEqual(expect.any(String));

    const second = await createVersion(api, { ...immediateDraft.program, revision: immediate.program.revision });
    const scheduled = await publishVersion(api, second, { effectiveFrom: future(30) });
    expect(scheduled.status).toBe('SCHEDULED');
    expect(scheduled.program.activeVersion.id).toBe(immediate.id);
  });

  test('rejects stale revisions, invalid ranges and conversion boundaries atomically', async ({ api }) => {
    const program = await createProgram(api);
    const valid = await createVersion(api, program);
    const stale = await requestVersionCreate(api, versionInput(program, { idempotencyKey: idempotencyKey('stale-version') }));
    expectUserError(stale.payload);
    expect(stale.payload.programVersion).toBeNull();

    for (const overrides of [
      { effectiveFrom: future(20), effectiveTo: future(10) },
      { earnPoints: '0' },
      { redeemAmountMinor: '-1' },
      { minimumRedeemPoints: '501', maximumRedeemPointsPerOrder: '500' },
      { maximumOrderPercentageBps: 10_001 },
    ]) {
      const fresh = await createProgram(api);
      const invalid = await requestVersionCreate(api, versionInput(fresh, overrides));
      expect(Boolean(invalid.errors?.length || invalid.payload?.userErrors?.length)).toBe(true);
      expect(invalid.payload?.programVersion ?? null).toBeNull();
    }
    expect(valid.status).toBe('DRAFT');
  });

  test('published versions cannot be changed or deleted', async ({ api }) => {
    const { version } = await createDraft(api);
    const published = await publishVersion(api, version);
    const update = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionUpdate', { variables: { input: { programVersionId: published.id,  redemptionEnabled: false, idempotencyKey: idempotencyKey('published-update') } } });
    expectUserError(update.data.loyaltyMutation.programVersionUpdate);
    const deleted = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionDelete', { variables: { input: { programVersionId: published.id,  idempotencyKey: idempotencyKey('published-delete') } } });
    expectUserError(deleted.data.loyaltyMutation.programVersionDelete);
    expect(deleted.data.loyaltyMutation.programVersionDelete.deletedProgramVersionId).toBeNull();
  });

  test('deletes only a draft and removes it from node resolution', async ({ api }) => {
    const { version } = await createDraft(api);
    const result = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionDelete', { variables: { input: { programVersionId: version.id,  idempotencyKey: idempotencyKey('draft-delete') } } });
    expectNoUserErrors(result.data.loyaltyMutation.programVersionDelete);
    expect(result.data.loyaltyMutation.programVersionDelete.deletedProgramVersionId).toBe(version.id);
    const node = await api.admin.query<any>('loyality-admin-api/Node', { variables: { id: version.id } });
    expect(node.data.loyaltyQuery.node).toBeNull();
  });
});
