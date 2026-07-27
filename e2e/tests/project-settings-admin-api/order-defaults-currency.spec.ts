/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  currentStore,
  expectError,
  expectSuccess,
  setupStore,
  stableSettings,
  updateStore,
  validCurrencySettings,
  validDefaults,
  validOrderProcessing,
} from './helpers';

test.describe('Project Settings Admin API - order, defaults, and currency settings', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-ORDER-001/PRJ-ORDER-003 order behavior persists and nullable suffix clears independently', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const updated = await updateStore(api, store, {
      orderProcessing: validOrderProcessing,
    });
    expectSuccess(updated, ['ORDER_PROCESSING_UPDATE']);
    expect(updated.store?.orderProcessing).toEqual(validOrderProcessing);
    const cleared = await updateStore(api, updated.store!, {
      orderProcessing: { ...validOrderProcessing, orderNumberSuffix: null },
    });
    expectSuccess(cleared);
    expect(cleared.store?.orderProcessing.orderNumberPrefix).toBe(
      validOrderProcessing.orderNumberPrefix,
    );
    expect(cleared.store?.orderProcessing.orderNumberSuffix).toBeNull();
  });

  test('PRJ-ORDER-002 prefixes and suffixes reject overflow and control characters', async ({
    api,
  }) => {
    const store = await currentStore(api);
    for (const [field, value] of [
      ['orderNumberPrefix', 'x'.repeat(17)],
      ['orderNumberPrefix', 'WEB\n'],
      ['orderNumberSuffix', 'x'.repeat(17)],
      ['orderNumberSuffix', '\u0000'],
    ] as const) {
      const payload = await updateStore(api, store, {
        orderProcessing: { ...validOrderProcessing, [field]: value },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'orderProcessing', field],
      });
    }
  });

  test('PRJ-ORDER-004 fulfillment enum round-trips to each durable domain value', async ({
    api,
  }) => {
    let store = await currentStore(api);
    for (const mode of ['ALL_LINE_ITEMS', 'GIFT_CARDS_ONLY', 'DISABLED']) {
      const payload = await updateStore(api, store, {
        orderProcessing: {
          ...validOrderProcessing,
          automaticFulfillmentMode: mode,
        },
      });
      expectSuccess(payload);
      expect(payload.store?.orderProcessing.automaticFulfillmentMode).toBe(mode);
      store = payload.store!;
    }
  });

  test('PRJ-ORDER-005 order processing has stable rowless defaults', async ({ api }) => {
    expect((await currentStore(api)).orderProcessing).toEqual({
      orderNumberPrefix: '#',
      orderNumberSuffix: null,
      requireCheckoutConfirmation: true,
      automaticFulfillmentMode: 'DISABLED',
      automaticallyArchiveOrders: true,
    });
  });

  test('PRJ-ORDER-006 order settings update leaves pre-existing store state intact', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, {
      orderProcessing: validOrderProcessing,
    });
    expectSuccess(payload);
    expect(payload.store?.createdAt).toBe(before.createdAt);
    expect(payload.store?.contactDetails).toEqual(before.contactDetails);
  });

  test('PRJ-DEF-001 defaults persist atomically', async ({ api }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, { defaults: validDefaults });
    expectSuccess(payload, ['DEFAULTS_UPDATE']);
    expect(payload.store?.defaults).toEqual(validDefaults);
    expect(payload.store?.timezone).toBe(validDefaults.timezone);
    expect(payload.store?.defaultWeightUnit).toBe(validDefaults.defaultWeightUnit);
    expect(payload.store?.defaultDimensionUnit).toBe(validDefaults.defaultDimensionUnit);
  });

  test('PRJ-DEF-002 metric and imperial systems accept schema-declared units', async ({ api }) => {
    let store = await currentStore(api);
    for (const defaults of [
      validDefaults,
      {
        unitSystem: 'IMPERIAL',
        defaultWeightUnit: 'lb',
        defaultDimensionUnit: 'in',
        timezone: 'America/New_York',
      },
    ]) {
      const payload = await updateStore(api, store, { defaults });
      expectSuccess(payload);
      expect(payload.store?.defaults).toEqual(defaults);
      store = payload.store!;
    }
  });

  test('PRJ-DEF-003/PRJ-DEF-004 timezone is bounded, valid IANA, and maps to its nested field', async ({
    api,
  }) => {
    const store = await currentStore(api);
    for (const timezone of ['Not/A_Real_Zone', '', 'x'.repeat(65)]) {
      const payload = await updateStore(api, store, {
        defaults: { ...validDefaults, timezone },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'defaults', 'timezone'],
      });
    }
  });

  test('PRJ-DEF-005/PRJ-DEF-006 defaults affect the canonical projection without rewriting other data', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, { defaults: validDefaults });
    expectSuccess(payload);
    expect(payload.store?.defaults).toEqual(validDefaults);
    expect(payload.store?.contactDetails).toEqual(before.contactDetails);
    expect(payload.store?.createdAt).toBe(before.createdAt);
  });

  test('PRJ-CUR-001/PRJ-CUR-002 currency and all formatting enums round-trip atomically', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {
      currencySettings: validCurrencySettings,
    });
    expectSuccess(payload, ['CURRENCY_SETTINGS_UPDATE']);
    expect(payload.store?.currencySettings).toEqual(validCurrencySettings);
    expect(payload.store?.currencyCode).toBe('EUR');
  });

  test('PRJ-CUR-003 fraction digit boundaries are accepted', async ({ api }) => {
    let store = await currentStore(api);
    for (const [minimumFractionDigits, maximumFractionDigits] of [
      [0, 0],
      [0, 100],
      [100, 100],
    ]) {
      const payload = await updateStore(api, store, {
        currencySettings: {
          ...validCurrencySettings,
          minimumFractionDigits,
          maximumFractionDigits,
        },
      });
      expectSuccess(payload);
      expect(payload.store?.currencySettings).toEqual(
        expect.objectContaining({ minimumFractionDigits, maximumFractionDigits }),
      );
      store = payload.store!;
    }
  });

  test('PRJ-CUR-004/PRJ-CUR-005 invalid fraction digit ranges are rejected at the exact field', async ({
    api,
  }) => {
    const store = await currentStore(api);
    for (const [minimumFractionDigits, maximumFractionDigits, field] of [
      [3, 2, 'minimumFractionDigits'],
      [-1, 2, 'minimumFractionDigits'],
      [0, 101, 'maximumFractionDigits'],
    ] as const) {
      const payload = await updateStore(api, store, {
        currencySettings: {
          ...validCurrencySettings,
          minimumFractionDigits,
          maximumFractionDigits,
        },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'currencySettings', field],
      });
    }
  });

  test('PRJ-CUR-006 currency formatting has stable rowless defaults', async ({ api }) => {
    expect((await currentStore(api)).currencySettings).toEqual({
      currencyCode: 'USD',
      currencyDisplay: 'SYMBOL',
      currencySign: 'STANDARD',
      grouping: 'AUTO',
      signDisplay: 'AUTO',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      roundingMode: 'HALF_EXPAND',
      trailingZeroDisplay: 'AUTO',
    });
  });

  test('PRJ-CUR-007/PRJ-CUR-008 canonical currency changes without rewriting unrelated stored state', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, {
      currencySettings: validCurrencySettings,
    });
    expectSuccess(payload);
    expect(payload.store?.currencyCode).toBe('EUR');
    expect(payload.store?.contactDetails).toEqual(before.contactDetails);
    expect(payload.store?.createdAt).toBe(before.createdAt);
  });

  test('PRJ-CUR-009 failed formatting validation preserves currency and formatting row', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, {
      currencySettings: {
        ...validCurrencySettings,
        minimumFractionDigits: 4,
        maximumFractionDigits: 2,
      },
    });
    expect(payload.store).toBeNull();
    expect((await currentStore(api)).currencySettings).toEqual(before.currencySettings);
  });

  test('PRJ-CUR-010/PRJ-CUR-011 all regional sections return independent deterministic results', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {
      orderProcessing: validOrderProcessing,
      defaults: validDefaults,
      currencySettings: validCurrencySettings,
    });
    expectSuccess(payload, [
      'ORDER_PROCESSING_UPDATE',
      'DEFAULTS_UPDATE',
      'CURRENCY_SETTINGS_UPDATE',
    ]);
    expect(payload.store?.revision).toBe(store.revision + 1);
  });

  test('PRJ-CUR-012 regional settings remain isolated between sibling stores', async ({ api }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    api.session.project = second;
    const secondBefore = await currentStore(api);
    api.session.project = first;
    expectSuccess(
      await updateStore(api, first, {
        orderProcessing: validOrderProcessing,
        defaults: validDefaults,
        currencySettings: validCurrencySettings,
      }),
    );
    api.session.project = second;
    expect(stableSettings(await currentStore(api))).toEqual(stableSettings(secondBefore));
  });
});
