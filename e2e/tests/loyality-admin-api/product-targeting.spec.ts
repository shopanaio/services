import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { baseRules, createProgram, createVersion, expectUserError, requestVersionCreate, setupStore, versionInput } from './helpers';

test.describe('Loyalty Admin API product applies-to targeting', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('stores canonical ALL exclusions and modifiers', async ({ api }) => {
    const program = await createProgram(api);
    const rules = baseRules({ earning: { excludedSelectors: [{ type: 'ALL', ids: [] }], modifiers: [{ id: 'all-products', title: 'Double points', priority: 10, multiplierBps: 20_000, selector: { type: 'ALL', ids: [] }, segmentIds: [] }] } });
    const version = await createVersion(api, program, { rules });
    expect(version.rules.earning).toMatchObject({ excludedSelectors: [{ type: 'ALL', ids: [] }], modifiers: [{ id: 'all-products', multiplierBps: 20_000, selector: { type: 'ALL', ids: [] } }] });
  });

  test('supports HIGHEST ADD and MULTIPLY modifier stacking modes', async ({ api }) => {
    for (const modifierStackingMode of ['HIGHEST', 'ADD', 'MULTIPLY'] as const) {
      const program = await createProgram(api);
      const version = await createVersion(api, program, { rules: baseRules({ earning: { modifierStackingMode } }) });
      expect(version.rules.earning.modifierStackingMode).toBe(modifierStackingMode);
    }
  });

  test('rejects IDs on ALL and requires IDs for specific selectors', async ({ api }) => {
    for (const selector of [
      { type: 'ALL', ids: [crypto.randomUUID()] },
      ...['PRODUCT', 'VARIANT', 'CATEGORY', 'TAG', 'FEATURE', 'OPTION_VALUE'].map((type) => ({ type, ids: [] })),
    ]) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ earning: { excludedSelectors: [selector] } }) }));
      expectUserError(result.payload);
      expect(result.payload.programVersion).toBeNull();
    }
  });

  test('rejects malformed, wrong-entity and missing catalog references', async ({ api }) => {
    for (const id of ['', Buffer.from(`gid://shopana/Customer/${crypto.randomUUID()}`).toString('base64'), Buffer.from(`gid://shopana/Product/${crypto.randomUUID()}`).toString('base64')]) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ earning: { excludedSelectors: [{ type: 'PRODUCT', ids: [id] }] } }) }));
      expectUserError(result.payload);
    }
  });

  test('validates modifier identity, multiplier and schedule atomically', async ({ api }) => {
    const validBase = { id: 'campaign', title: 'Campaign', priority: 1, multiplierBps: 15_000, selector: { type: 'ALL', ids: [] }, segmentIds: [] };
    for (const modifiers of [
      [{ ...validBase, id: '' }],
      [{ ...validBase, multiplierBps: 0 }],
      [validBase, { ...validBase }],
      [{ ...validBase, startsAt: '2030-01-02T00:00:00.000Z', endsAt: '2030-01-01T00:00:00.000Z' }],
    ]) {
      const program = await createProgram(api);
      const result = await requestVersionCreate(api, versionInput(program, { rules: baseRules({ earning: { modifiers } }) }));
      expectUserError(result.payload);
      expect(result.payload.programVersion).toBeNull();
    }
  });
});
