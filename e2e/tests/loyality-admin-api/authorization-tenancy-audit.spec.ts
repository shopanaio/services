/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createProgram, expectUserError, idempotencyKey, requestProgramCreate, setupStore, unique } from './helpers';

test.describe('Loyalty Admin API authorization tenancy and audit', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('requires authentication for loyalty admin queries and mutations', async ({ api }) => {
    const program = await createProgram(api);
    api.session.clearSession();
    const query = await api.admin.query<any>('loyality-admin-api/Program', { throwOnError: false, variables: { id: program.id } });
    expect(query.errors?.length || 0).toBeGreaterThan(0);
    expect(query.data?.loyaltyQuery?.program ?? null).toBeNull();
    const mutation = await requestProgramCreate(api, { code: unique('anonymous'), name: 'Anonymous', defaultCurrencyCode: 'USD', idempotencyKey: idempotencyKey('anonymous') });
    expect(mutation.errors?.length || 0).toBeGreaterThan(0);
    expect(mutation.payload?.program ?? null).toBeNull();
  });

  test('isolates query and mutation identifiers by store', async ({ api }) => {
    const foreign = await createProgram(api);
    await api.session.setupProject({ displayName: 'Isolated store', currencyCode: 'USD' });
    const query = await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: foreign.id } });
    expect(query.data.loyaltyQuery.program).toBeNull();
    const mutation = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: foreign.id,  name: 'Cross store write', idempotencyKey: idempotencyKey('foreign-write') } } });
    expectUserError(mutation.data.loyaltyMutation.programUpdate);
    expect(mutation.data.loyaltyMutation.programUpdate.program).toBeNull();
  });

  test('returns structured safe user errors', async ({ api }) => {
    const missing = Buffer.from(`gid://shopana/LoyaltyProgram/${crypto.randomUUID()}`).toString('base64');
    const result = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: missing,  name: 'Missing', idempotencyKey: idempotencyKey('missing') } } });
    const [error] = result.data.loyaltyMutation.programUpdate.userErrors;
    expect(error).toEqual(expect.objectContaining({ message: expect.any(String), code: expect.any(String), retryable: expect.any(Boolean) }));
    expect(JSON.stringify(error)).not.toMatch(/(?:SELECT |INSERT |postgres|stack|\.ts:)/iu);
  });

  test('preserves decimal strings above JavaScript safe integer range', async ({ api }) => {
    const program = await createProgram(api);
    const result = await api.admin.mutation<any>('loyality-admin-api/ProgramVersionCreate', { variables: { input: { programId: program.id, expectedProgramRevision: program.revision, earnPoints: '900719925474099312345', earnAmountMinor: '1', redeemPoints: '900719925474099312345', redeemAmountMinor: '1', rules: { schemaVersion: 1, eligibility: { type: 'ALL', channelCodes: ['WEB'], segmentIds: [], excludedSegmentIds: [] }, earning: { eligibleSpendBasis: 'AFTER_PRODUCT_DISCOUNTS', excludedSelectors: [], modifierStackingMode: 'HIGHEST', modifiers: [] } }, idempotencyKey: idempotencyKey('bigint') } } });
    expect(result.data.loyaltyMutation.programVersionCreate.programVersion).toMatchObject({ earnPoints: '900719925474099312345', redeemPoints: '900719925474099312345' });
  });

  test('concurrent equal creates converge on one idempotent result', async ({ api }) => {
    const input = { code: unique('concurrent'), name: 'Concurrent', defaultCurrencyCode: 'USD', idempotencyKey: idempotencyKey('concurrent') };
    const [first, second] = await Promise.all([requestProgramCreate(api, input), requestProgramCreate(api, input)]);
    const ids = [first.payload?.program?.id, second.payload?.program?.id].filter(Boolean);
    expect(new Set(ids).size).toBe(1);
    const listed = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 20, where: { search: input.code } } });
    expect(listed.data.loyaltyQuery.programs.totalCount).toBe(1);
  });
});
