/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  currentStore,
  expectError,
  expectSuccess,
  selectStore,
  setupStore,
  stableSettings,
  rawId,
  updateStore,
  validAddress,
  validBrand,
  validContact,
  validCurrencySettings,
  validDefaults,
  validOrderProcessing,
} from './helpers';

test.describe('Project Settings Admin API - unified store update', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-UPD-001 storeUpdate requires a valid Store global ID', async ({ api }) => {
    const store = await currentStore(api);
    for (const storeId of ['invalid', composeGlobalId('File', crypto.randomUUID())]) {
      const payload = await updateStore(
        api,
        store,
        { contactDetails: validContact('Invalid ID', store.name) },
        { storeId },
      );
      expectError(payload.userErrors, { code: 'INVALID_ID', field: ['storeId'] });
      expect(payload.store).toBeNull();
    }
  });

  test('PRJ-UPD-002 clientMutationId is trimmed and bounded to 1..128 characters', async ({
    api,
  }) => {
    const store = await currentStore(api);
    for (const clientMutationId of ['', '   ', 'x'.repeat(129)]) {
      const payload = await updateStore(
        api,
        store,
        { contactDetails: validContact('Invalid mutation ID', store.name) },
        { clientMutationId },
      );
      expectError(payload.userErrors, {
        code: 'INVALID_CLIENT_MUTATION_ID',
        field: ['clientMutationId'],
      });
    }
    const valid = await updateStore(
      api,
      store,
      { contactDetails: validContact('Trimmed mutation ID', store.name) },
      { clientMutationId: `  ${crypto.randomUUID()}  ` },
    );
    expectSuccess(valid);
  });

  test('PRJ-UPD-003 expectedRevision must be a non-negative integer', async ({ api }) => {
    const store = await currentStore(api);
    const payload = await updateStore(
      api,
      store,
      { contactDetails: validContact('Invalid revision', store.name) },
      { expectedRevision: -1 },
    );
    expectError(payload.userErrors, {
      code: 'INVALID_EXPECTED_REVISION',
      field: ['expectedRevision'],
    });
  });

  test('PRJ-UPD-004/PRJ-UPD-017 authorization denial marks every requested operation unapplied', async ({
    api,
  }) => {
    const store = await currentStore(api);
    api.session.clearSession();
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Forbidden', store.name),
      address: validAddress,
    });
    expect(payload.store).toBeNull();
    expectError(payload.userErrors, { code: 'UNAUTHENTICATED' });
    expect(payload.operationResults).toEqual([
      expect.objectContaining({ type: 'CONTACT_DETAILS_UPDATE', applied: false }),
      expect.objectContaining({ type: 'ADDRESS_UPDATE', applied: false }),
    ]);
  });

  test('PRJ-UPD-005 ownership is derived from the persisted target store', async ({ api }) => {
    const store = await currentStore(api);
    const foreignOrganization = await api.session.setupOrganization({
      displayName: 'Foreign selector',
    });
    api.session.organizationId = foreignOrganization.id;
    selectStore(api, store);
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Persisted ownership', store.name),
    });
    expectSuccess(payload);
  });

  test('PRJ-UPD-006/PRJ-UPD-007 single and multi-section updates increment revision exactly once', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const single = await updateStore(api, store, {
      address: validAddress,
    });
    expectSuccess(single);
    expect(single.store?.revision).toBe(store.revision + 1);
    const multi = await updateStore(api, single.store!, {
      contactDetails: validContact('Multi section', store.name),
      brand: validBrand,
      defaults: validDefaults,
    });
    expectSuccess(multi);
    expect(multi.store?.revision).toBe(single.store!.revision + 1);
  });

  test('PRJ-UPD-008/PRJ-UPD-009 operationResults follow schema input order with empty success errors', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {
      currencySettings: validCurrencySettings,
      brand: validBrand,
      contactDetails: validContact('Schema order', store.name),
      defaults: validDefaults,
      address: validAddress,
      orderProcessing: validOrderProcessing,
    });
    expectSuccess(payload, [
      'CONTACT_DETAILS_UPDATE',
      'ADDRESS_UPDATE',
      'BRAND_UPDATE',
      'ORDER_PROCESSING_UPDATE',
      'DEFAULTS_UPDATE',
      'CURRENCY_SETTINGS_UPDATE',
    ]);
  });

  test('PRJ-UPD-010/PRJ-UPD-011/PRJ-UPD-012 mapping failure prefixes fields, aggregates errors, and applies nothing', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const before = stableSettings(store);
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Must not apply', store.name),
      brand: { ...validBrand, defaultLogoId: composeGlobalId('Store', crypto.randomUUID()) },
    });
    expect(payload.store).toBeNull();
    expect(payload.operationResults).toEqual([
      expect.objectContaining({ type: 'CONTACT_DETAILS_UPDATE', applied: false }),
      expect.objectContaining({
        type: 'BRAND_UPDATE',
        applied: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            code: 'INVALID_ID',
            field: ['operations', 'brand', 'defaultLogoId'],
          }),
        ]),
      }),
    ]);
    expectError(payload.userErrors, {
      code: 'INVALID_ID',
      field: ['operations', 'brand', 'defaultLogoId'],
    });
    expect(stableSettings(await currentStore(api))).toEqual(before);
  });

  test('PRJ-UPD-013 unrequested sections remain unchanged', async ({ api }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, { address: validAddress });
    expectSuccess(payload);
    expect(payload.store?.contactDetails).toEqual(before.contactDetails);
    expect(payload.store?.brand).toEqual(before.brand);
    expect(payload.store?.orderProcessing).toEqual(before.orderProcessing);
    expect(payload.store?.defaults).toEqual(before.defaults);
    expect(payload.store?.currencySettings).toEqual(before.currencySettings);
  });

  test('PRJ-UPD-014 stale revision returns REVISION_CONFLICT and applies nothing', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const first = await updateStore(api, store, { address: validAddress });
    expectSuccess(first);
    const stale = await updateStore(
      api,
      store,
      { contactDetails: validContact('Stale', store.name) },
      { expectedRevision: store.revision },
    );
    expectError(stale.userErrors, { code: 'REVISION_CONFLICT' });
    expect((await currentStore(api)).displayName).toBe(store.displayName);
  });

  test('PRJ-UPD-015 parallel updates with one revision have exactly one owner', async ({ api }) => {
    const store = await currentStore(api);
    const [left, right] = await Promise.all([
      updateStore(api, store, { address: validAddress }),
      updateStore(api, store, {
        contactDetails: validContact('Parallel', store.name),
      }),
    ]);
    const results = [left, right];
    expect(results.filter(({ store: updated }) => updated !== null)).toHaveLength(1);
    expect(
      results.filter(({ userErrors }) =>
        userErrors.some(({ code }) => code === 'REVISION_CONFLICT'),
      ),
    ).toHaveLength(1);
    expect((await currentStore(api)).revision).toBe(store.revision + 1);
  });

  test('PRJ-UPD-016 foreign or deleted Store IDs return safe NOT_FOUND', async ({ api }) => {
    const store = await currentStore(api);
    const unknown = composeGlobalId('Store', crypto.randomUUID());
    const payload = await updateStore(
      api,
      store,
      { address: validAddress },
      { storeId: unknown },
    );
    expectError(payload.userErrors, { code: 'NOT_FOUND', field: ['storeId'] });
    expect(JSON.stringify(payload)).not.toContain(rawId(unknown));
  });

  test('PRJ-UPD-018 empty operations follow the explicit no-op result contract', async ({ api }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {});
    expect(payload.userErrors).toHaveLength(0);
    expect(payload.operationResults).toHaveLength(0);
    expect(payload.store?.revision).toBe(store.revision + 1);
  });

  test('PRJ-UPD-019/PRJ-UPD-021 identical idempotent retries reuse one durable result and revision', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const clientMutationId = `retry-${crypto.randomUUID()}`;
    const operations = { address: validAddress };
    const first = await updateStore(api, store, operations, { clientMutationId });
    const retry = await updateStore(api, store, operations, { clientMutationId });
    expectSuccess(first);
    expectSuccess(retry);
    expect(retry.store?.revision).toBe(first.store?.revision);
    expect((await currentStore(api)).revision).toBe(store.revision + 1);
  });

  test('PRJ-UPD-020 clientMutationId cannot be reused with different content', async ({ api }) => {
    const store = await currentStore(api);
    const clientMutationId = `reuse-${crypto.randomUUID()}`;
    expectSuccess(await updateStore(api, store, { address: validAddress }, { clientMutationId }));
    const conflict = await updateStore(
      api,
      store,
      { contactDetails: validContact('Different content', store.name) },
      { clientMutationId },
    );
    expect(conflict.store).toBeNull();
    expect(conflict.userErrors.length).toBeGreaterThan(0);
  });

  test('PRJ-UPD-022/PRJ-UPD-023 infrastructure failure restores snapshot without overwriting newer data', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const failed = await updateStore(api, store, {
      contactDetails: validContact('Must compensate', store.name),
      brand: {
        ...validBrand,
        defaultLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
    });
    expect(failed.store).toBeNull();
    const after = await currentStore(api);
    expect(after.revision).toBe(store.revision);
    expect(stableSettings(after)).toEqual(stableSettings(store));
  });

  test('PRJ-UPD-024 returns a freshly committed Store projection', async ({ api }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Fresh projection', store.name),
      address: validAddress,
    });
    expectSuccess(payload);
    const fresh = await currentStore(api);
    expect(payload.store).toEqual(expect.objectContaining(stableSettings(fresh)));
    expect(payload.store?.revision).toBe(fresh.revision);
  });

  test('PRJ-UPD-025 negative updates change neither target nor sibling store', async ({ api }) => {
    const target = await currentStore(api);
    const sibling = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    selectStore(api, sibling);
    const siblingBefore = await currentStore(api);
    selectStore(api, target);
    const targetBefore = stableSettings(target);
    const failed = await updateStore(api, target, {
      defaults: { ...validDefaults, timezone: 'Invalid/Timezone' },
    });
    expect(failed.store).toBeNull();
    expect(stableSettings(await currentStore(api))).toEqual(targetBefore);
    selectStore(api, sibling);
    expect(stableSettings(await currentStore(api))).toEqual(stableSettings(siblingBefore));
  });
});
