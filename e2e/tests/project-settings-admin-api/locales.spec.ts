/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  currentStore,
  expectError,
  localeCreate,
  localeDelete,
  localeSetDefault,
  selectStore,
  setupStore,
} from './helpers';

test.describe('Project Settings Admin API - locales', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-LOC-001/PRJ-LOC-002/PRJ-LOC-003 active and draft locales expose deterministic state and names', async ({
    api,
  }) => {
    const active = await localeCreate(api, 'de', true);
    expect(active.errors).toBeFalsy();
    expect(active.payload.userErrors).toHaveLength(0);
    expect(active.payload.locale).toEqual({
      code: 'de',
      name: expect.any(String),
      isActive: true,
    });
    const draft = await localeCreate(api, 'fr', false);
    expect(draft.payload.userErrors).toHaveLength(0);
    expect(draft.payload.locale).toEqual({
      code: 'fr',
      name: expect.any(String),
      isActive: false,
    });
    const store = await currentStore(api);
    expect(store.locales).toContain('de');
    expect(store.locales).not.toContain('fr');
    expect(store.languageSettings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'de', isActive: true }),
        expect.objectContaining({ code: 'fr', isActive: false }),
      ]),
    );
  });

  test('PRJ-LOC-004 unsupported locale is rejected before a language row is added', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const result = await localeCreate(api, 'xx-invalid', true);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect((await currentStore(api)).languageSettings).toEqual(before.languageSettings);
  });

  test('PRJ-LOC-005 duplicate locale returns LOCALE_ALREADY_EXISTS', async ({ api }) => {
    await localeCreate(api, 'de', true);
    const duplicate = await localeCreate(api, 'de', false);
    expect(duplicate.payload.locale).toBeNull();
    expectError(duplicate.payload.userErrors, {
      code: 'LOCALE_ALREADY_EXISTS',
      field: ['code'],
    });
  });

  test('PRJ-LOC-006/PRJ-LOC-016 locale state is independent in sibling stores', async ({ api }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    await localeCreate(api, 'de', true);
    selectStore(api, second);
    expect((await currentStore(api)).languageSettings.map(({ code }) => code)).not.toContain('de');
    await localeCreate(api, 'fr', true);
    selectStore(api, first);
    expect((await currentStore(api)).languageSettings.map(({ code }) => code)).not.toContain('fr');
  });

  test('PRJ-LOC-007/PRJ-LOC-008/PRJ-LOC-013 setting a configured draft default activates it atomically', async ({
    api,
  }) => {
    await localeCreate(api, 'de', false);
    const result = await localeSetDefault(api, 'de');
    expect(result.payload.success).toBe(true);
    expect(result.payload.userErrors).toHaveLength(0);
    const store = await currentStore(api);
    expect(store.defaultLocale).toBe('de');
    expect(store.locales).toContain('de');
    expect(store.languageSettings).toContainEqual(
      expect.objectContaining({ code: 'de', isActive: true }),
    );
  });

  test('PRJ-LOC-009 unknown default locale returns LOCALE_NOT_FOUND without changes', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const result = await localeSetDefault(api, 'de');
    expect(result.payload.success).toBe(false);
    expectError(result.payload.userErrors, {
      code: 'LOCALE_NOT_FOUND',
      field: ['locale'],
    });
    expect((await currentStore(api)).defaultLocale).toBe(before.defaultLocale);
  });

  test('PRJ-LOC-010/PRJ-LOC-018 a non-default locale can be removed cleanly', async ({ api }) => {
    await localeCreate(api, 'de', true);
    const result = await localeDelete(api, 'de');
    expect(result.payload.deletedLocaleCode).toBe('de');
    expect(result.payload.userErrors).toHaveLength(0);
    const store = await currentStore(api);
    expect(store.locales).not.toContain('de');
    expect(store.languageSettings.map(({ code }) => code)).not.toContain('de');
  });

  test('PRJ-LOC-011 default locale cannot be deleted', async ({ api }) => {
    const before = await currentStore(api);
    const result = await localeDelete(api, before.defaultLocale);
    expect(result.payload.deletedLocaleCode).toBeNull();
    expectError(result.payload.userErrors, {
      code: 'DEFAULT_LOCALE_DELETE_FORBIDDEN',
      field: ['code'],
    });
    expect((await currentStore(api)).defaultLocale).toBe(before.defaultLocale);
  });

  test('PRJ-LOC-012 deleting an unknown locale returns NOT_FOUND without changes', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const result = await localeDelete(api, 'de');
    expect(result.payload.deletedLocaleCode).toBeNull();
    expectError(result.payload.userErrors, { code: 'NOT_FOUND', field: ['code'] });
    expect((await currentStore(api)).languageSettings).toEqual(before.languageSettings);
  });

  test('PRJ-LOC-014 locale writes require store.profile write access', async ({ api }) => {
    const before = await currentStore(api);
    api.session.clearSession();
    const result = await localeCreate(api, 'de', true);
    const serialized = JSON.stringify(result.errors ?? result.payload?.userErrors);
    expect(serialized).toMatch(/(?:UNAUTHENTICATED|FORBIDDEN|access denied)/iu);
    await api.session.setupUser();
    selectStore(api, before);
  });

  test('PRJ-LOC-015 client-selected sibling store cannot redirect a locale mutation', async ({
    api,
  }) => {
    const trusted = await currentStore(api);
    const sibling = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    selectStore(api, sibling);
    await localeCreate(api, 'de', true);
    selectStore(api, trusted);
    expect((await currentStore(api)).languageSettings.map(({ code }) => code)).not.toContain('de');
  });

  test('PRJ-LOC-017 default locale change is visible through a fresh Admin context', async ({
    api,
  }) => {
    await localeCreate(api, 'uk', true);
    await localeSetDefault(api, 'uk');
    const refreshed = await currentStore(api);
    expect(refreshed.defaultLocale).toBe('uk');
    expect(refreshed.locales).toContain('uk');
  });

  test('PRJ-LOC-019 parallel duplicate create has one winner and one deterministic loser', async ({
    api,
  }) => {
    const [left, right] = await Promise.all([
      localeCreate(api, 'de', true),
      localeCreate(api, 'de', true),
    ]);
    const payloads = [left.payload, right.payload];
    expect(payloads.filter(({ locale }) => locale !== null)).toHaveLength(1);
    const loser = payloads.find(({ locale }) => locale === null)!;
    expectError(loser.userErrors, { code: 'LOCALE_ALREADY_EXISTS' });
    expect((await currentStore(api)).languageSettings.filter(({ code }) => code === 'de')).toHaveLength(
      1,
    );
  });

  test('PRJ-LOC-020 parallel default change and deletion never removes the selected default', async ({
    api,
  }) => {
    await localeCreate(api, 'de', true);
    const [setResult] = await Promise.all([
      localeSetDefault(api, 'de'),
      localeDelete(api, 'de'),
    ]);
    const store = await currentStore(api);
    expect(store.locales).toContain(store.defaultLocale);
    if (setResult.payload.success) expect(store.defaultLocale).toBe('de');
  });
});
