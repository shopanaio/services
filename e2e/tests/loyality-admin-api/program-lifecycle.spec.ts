/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createProgram, expectNoUserErrors, expectUserError, idempotencyKey, requestProgramCreate, setupStore, unique } from './helpers';

test.describe('Loyalty Admin API program lifecycle', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('creates a draft program with canonical defaults and metadata', async ({ api }) => {
    const program = await createProgram(api, { metadata: { campaign: 'summer' } });
    expect(program).toMatchObject({ status: 'DRAFT', isDefault: false, defaultCurrencyCode: 'USD', revision: 1, metadata: { campaign: 'summer' }, archivedAt: null });
    expect(Buffer.from(program.id, 'base64').toString()).toContain('/LoyaltyProgram/');
    expect(new Date(program.createdAt).toISOString()).toBe(program.createdAt);
  });

  test('updates mutable fields with optimistic concurrency and no partial stale write', async ({ api }) => {
    const program = await createProgram(api);
    const updated = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: program.id,  name: 'Updated loyalty', metadata: { revision: 2 }, isDefault: true, idempotencyKey: idempotencyKey('program-update') } } });
    const payload = updated.data.loyaltyMutation.programUpdate;
    expectNoUserErrors(payload);
    expect(payload.program).toMatchObject({ name: 'Updated loyalty', metadata: { revision: 2 }, isDefault: true, revision: 2 });
    const stale = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: program.id,  name: 'Must not persist', idempotencyKey: idempotencyKey('program-stale') } } });
    expectUserError(stale.data.loyaltyMutation.programUpdate);
    const current = await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: program.id } });
    expect(current.data.loyaltyQuery.program).toMatchObject({ name: 'Updated loyalty', revision: 2 });
  });

  test('keeps codes unique per store while allowing the same code in another store', async ({ api }) => {
    const code = unique('shared');
    const first = await createProgram(api, { code });
    const duplicate = await requestProgramCreate(api, { code, name: 'Duplicate', defaultCurrencyCode: 'USD', idempotencyKey: idempotencyKey('duplicate') });
    expectUserError(duplicate.payload);
    expect(duplicate.payload.program).toBeNull();
    await api.session.setupProject({ displayName: 'Second loyalty store', currencyCode: 'USD' });
    const second = await createProgram(api, { code });
    expect(second.id).not.toBe(first.id);
  });

  test('atomically replaces the default program and keeps exactly one', async ({ api }) => {
    const first = await createProgram(api, { isDefault: true });
    const second = await createProgram(api, { isDefault: true });
    const previous = await api.admin.query<any>('loyality-admin-api/Program', { variables: { id: first.id } });
    expect(previous.data.loyaltyQuery.program.isDefault).toBe(false);
    expect(second.isDefault).toBe(true);
    const defaults = await api.admin.query<any>('loyality-admin-api/Programs', { variables: { first: 20, where: { isDefault: true } } });
    expect(defaults.data.loyaltyQuery.programs).toMatchObject({ totalCount: 1, edges: [{ node: { id: second.id } }] });
  });

  test('transitions through active paused and archived and treats archived as terminal', async ({ api }) => {
    let program = await createProgram(api);
    for (const status of ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const) {
      const result = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: program.id,  status, idempotencyKey: idempotencyKey(`program-${status}`) } } });
      expectNoUserErrors(result.data.loyaltyMutation.programUpdate);
      program = result.data.loyaltyMutation.programUpdate.program;
      expect(program.status).toBe(status);
    }
    expect(program.archivedAt).toEqual(expect.any(String));
    const invalid = await api.admin.mutation<any>('loyality-admin-api/ProgramUpdate', { variables: { input: { programId: program.id,  status: 'ACTIVE', idempotencyKey: idempotencyKey('reactivate') } } });
    expectUserError(invalid.data.loyaltyMutation.programUpdate);
  });

  test('replays equal idempotent creates and rejects conflicting key reuse', async ({ api }) => {
    const input = { code: unique('replay'), name: 'Replay', defaultCurrencyCode: 'USD', idempotencyKey: idempotencyKey('program-replay') };
    const first = await requestProgramCreate(api, input);
    const replay = await requestProgramCreate(api, input);
    expectNoUserErrors(first.payload);
    expectNoUserErrors(replay.payload);
    expect(replay.payload.program.id).toBe(first.payload.program.id);
    const conflict = await requestProgramCreate(api, { ...input, name: 'Changed request' });
    expectUserError(conflict.payload);
    expect(conflict.payload.program).toBeNull();
  });
});
