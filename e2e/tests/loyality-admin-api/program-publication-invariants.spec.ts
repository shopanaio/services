/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createDraft,
  createProgram,
  createVersion,
  expectNoUserErrors,
  expectUserError,
  future,
  idempotencyKey,
  publishVersion,
  requestProgramCreate,
  setupStore,
  unique,
} from './helpers';

const conditions = { type: 'ALL', conditions: [] };

test.describe('Loyalty Admin API publication and configuration invariants', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('rejects a version starting before an already published successor', async ({ api }) => {
    const program = await createProgram(api, { isDefault: true });
    const firstDraft = await createVersion(api, program);
    const active = await publishVersion(api, firstDraft);
    let current = (await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: program.id } }))
      .data.loyaltyQuery.program;
    const successorDraft = await createVersion(api, current);
    const successorStart = future(60);
    await publishVersion(api, successorDraft, { effectiveFrom: successorStart });
    current = (await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: program.id } }))
      .data.loyaltyQuery.program;
    const overlappingDraft = await createVersion(api, current);
    const rejected = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionPublish', {
      variables: { input: {
        programVersionId: overlappingDraft.id,
        expectedRevision: overlappingDraft.revision,
        effectiveFrom: future(30),
        idempotencyKey: idempotencyKey('overlapping-version'),
      } },
    });
    expectUserError(rejected.data.loyaltyMutation.programVersionPublish, 'INVALID_PROGRAM_VERSION_WINDOW');
    expect(rejected.data.loyaltyMutation.programVersionPublish.programVersion).toBeNull();
    expect(active.status).toBe('ACTIVE');
  });

  test('retires the previous active version at the exact successor boundary', async ({ api }) => {
    const program = await createProgram(api, { isDefault: true });
    const firstDraft = await createVersion(api, program);
    const active = await publishVersion(api, firstDraft);
    const current = (await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: program.id } }))
      .data.loyaltyQuery.program;
    const successorDraft = await createVersion(api, current);
    const boundary = future(30);
    const successor = await publishVersion(api, successorDraft, { effectiveFrom: boundary });
    const run = await api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: { effectiveAt: boundary, limit: 100, idempotencyKey: idempotencyKey('successor-boundary') } },
    });
    expectNoUserErrors(run.data.loyaltyMutation.maintenanceRun);
    const after = (await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: program.id } }))
      .data.loyaltyQuery.program;
    expect(after.activeVersion.id).toBe(successor.id);
    expect(after.versions.find(({ id }: any) => id === active.id)).toMatchObject({ status: 'RETIRED', effectiveTo: boundary });
    expect(after.versions.find(({ id }: any) => id === successor.id)).toMatchObject({ status: 'ACTIVE', effectiveFrom: boundary });
  });

  test('serializes concurrent publication of the same draft', async ({ api }) => {
    const { version } = await createDraft(api, { isDefault: true });
    const effectiveFrom = new Date().toISOString();
    const calls = await Promise.all([1, 2].map((index) => api.admin.mutation<any>(
      'loyality-admin-api/ProgramVersionPublish',
      { variables: { input: {
        programVersionId: version.id, expectedRevision: version.revision, effectiveFrom,
        idempotencyKey: idempotencyKey(`concurrent-publish-${index}`),
      } } },
    )));
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.programVersionPublish.userErrors.length === 0)).toHaveLength(1);
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.programVersionPublish.userErrors.length > 0)).toHaveLength(1);
  });

  test('deletes a draft version and every owned configuration aggregate atomically', async ({ api }) => {
    const { version } = await createDraft(api, {}, {
      earningRules: [{
        code: unique('cascade-rule'),
        name: 'Cascade rule',
        triggerType: 'LOGIN',
        conditions,
        actionType: 'AWARD_FIXED_POINTS',
        action: { type: 'AWARD_FIXED_POINTS', points: '1' },
        limits: {
          startsAt: null,
          endsAt: null,
          perEventMaxPoints: null,
          perAccount: null,
          campaign: null,
        },
      }],
      rewardDefinitions: [{ code: unique('cascade-reward'), name: 'Cascade reward', rewardType: 'POINTS', configuration: { points: '1' } }],
      tierPolicy: { windowType: 'LIFETIME', downgradePolicy: 'IMMEDIATE', requalificationPolicy: 'AUTOMATIC' },
      tiers: [{ code: unique('cascade-tier'), name: 'Cascade tier', rank: 1, qualification: { type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null, operator: 'GTE', threshold: '0', currencyCode: null } }],
    });
    const ownedIds = [
      version.id,
      version.earningRules[0].id,
      version.rewardDefinitions[0].id,
      version.tiers[0].id,
      version.tierPolicy.id,
    ];
    const deleted = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionDelete', {
      variables: { input: {
        programVersionId: version.id, expectedRevision: version.revision,
        idempotencyKey: idempotencyKey('cascade-version-delete'),
      } },
    });
    expectNoUserErrors(deleted.data.loyaltyMutation.programVersionDelete);
    const nodes = await api.admin.query<any>('loyality-admin-api/Nodes', { variables: { ids: ownedIds } });
    expect(nodes.data.loyaltyQuery.nodes).toEqual(ownedIds.map(() => null));
  });

  test('keeps exactly one default program under concurrent creation', async ({ api }) => {
    const inputs = [1, 2].map((index) => ({
      code: unique(`default-${index}`), name: `Default ${index}`, defaultCurrencyCode: 'USD', isDefault: true,
      idempotencyKey: idempotencyKey(`default-${index}`),
    }));
    const created = await Promise.all(inputs.map((input) => requestProgramCreate(api, input)));
    const successful = created.filter(({ payload }) => payload?.userErrors.length === 0);
    expect(successful.length).toBeGreaterThanOrEqual(1);
    const defaults = await api.admin.query<any>('loyality-admin-api/Programs', {
      variables: { first: 20, where: { isDefault: true } },
    });
    expect(defaults.data.loyaltyQuery.programs.totalCount).toBe(1);
    expect(successful.map(({ payload }) => payload.program.id)).toContain(defaults.data.loyaltyQuery.programs.edges[0].node.id);
  });
});
