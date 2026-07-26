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
  updateStore,
  validBrand,
} from './helpers';

test.describe('Project Settings Admin API - brand and media', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-BRAND-001 brand copy, colors, social links, and optional media persist', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, { brand: validBrand });
    expectSuccess(payload, ['BRAND_UPDATE']);
    expect(payload.store?.brand).toEqual({
      defaultLogo: null,
      squareLogo: null,
      coverImage: null,
      primaryColor: '#112233',
      secondaryColor: '#AABBCC',
      slogan: 'Settings made clear',
      shortDescription: 'Project settings contract fixture',
      socialLinks: validBrand.socialLinks,
    });
  });

  test('PRJ-BRAND-002 brand query returns stable defaults without a persisted row', async ({
    api,
  }) => {
    expect((await currentStore(api)).brand).toEqual({
      defaultLogo: null,
      squareLogo: null,
      coverImage: null,
      primaryColor: '#1677FF',
      secondaryColor: '#101112',
      slogan: null,
      shortDescription: null,
      socialLinks: [],
    });
  });

  test('PRJ-BRAND-003 colors require exact six-digit hexadecimal values', async ({ api }) => {
    const store = await currentStore(api);
    for (const [field, value] of [
      ['primaryColor', '112233'],
      ['primaryColor', '#123'],
      ['secondaryColor', '#12345G'],
      ['secondaryColor', '#1234567'],
    ] as const) {
      const payload = await updateStore(api, store, {
        brand: { ...validBrand, [field]: value },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'brand', field],
      });
    }
  });

  test('PRJ-BRAND-004 copy is trimmed, nullable, and length bounded', async ({ api }) => {
    const store = await currentStore(api);
    const trimmed = await updateStore(api, store, {
      brand: {
        ...validBrand,
        slogan: '  Trimmed slogan  ',
        shortDescription: null,
      },
    });
    expectSuccess(trimmed);
    expect(trimmed.store?.brand.slogan).toBe('Trimmed slogan');
    expect(trimmed.store?.brand.shortDescription).toBeNull();
    for (const [field, value] of [
      ['slogan', 'x'.repeat(256)],
      ['shortDescription', 'x'.repeat(501)],
      ['slogan', '   '],
    ] as const) {
      const payload = await updateStore(api, trimmed.store!, {
        brand: { ...validBrand, [field]: value },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'brand', field],
      });
    }
  });

  test('PRJ-BRAND-005 platform codes normalize safely and reject unsafe characters', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const normalized = await updateStore(api, store, {
      brand: {
        ...validBrand,
        socialLinks: [{ platform: '  GitHub  ', url: 'https://github.com/shopana' }],
      },
    });
    expectSuccess(normalized);
    expect(normalized.store?.brand.socialLinks).toEqual([
      { platform: 'github', url: 'https://github.com/shopana' },
    ]);
    const invalid = await updateStore(api, normalized.store!, {
      brand: {
        ...validBrand,
        socialLinks: [{ platform: '<script>', url: 'https://example.com' }],
      },
    });
    expectError(invalid.userErrors, {
      field: ['operations', 'brand', 'socialLinks', '0', 'platform'],
    });
  });

  test('PRJ-BRAND-006 social links accept only valid HTTP or HTTPS URLs', async ({ api }) => {
    const store = await currentStore(api);
    for (const url of ['ftp://example.com', 'javascript:alert(1)', 'not-a-url']) {
      const payload = await updateStore(api, store, {
        brand: {
          ...validBrand,
          socialLinks: [{ platform: 'site', url }],
        },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'brand', 'socialLinks', '0', 'url'],
      });
    }
  });

  test('PRJ-BRAND-007/PRJ-BRAND-008 social platforms are unique, limited, and preserve order', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const duplicate = await updateStore(api, store, {
      brand: {
        ...validBrand,
        socialLinks: [
          { platform: 'github', url: 'https://github.com/a' },
          { platform: ' GITHUB ', url: 'https://github.com/b' },
        ],
      },
    });
    expectError(duplicate.userErrors, {
      field: ['operations', 'brand', 'socialLinks'],
    });
    const overflow = await updateStore(api, store, {
      brand: {
        ...validBrand,
        socialLinks: Array.from({ length: 21 }, (_, index) => ({
          platform: `site${index}`,
          url: `https://example.com/${index}`,
        })),
      },
    });
    expectError(overflow.userErrors, {
      field: ['operations', 'brand', 'socialLinks'],
    });
    const ordered = await updateStore(api, store, { brand: validBrand });
    expect(ordered.store?.brand.socialLinks).toEqual(validBrand.socialLinks);
  });

  test('PRJ-BRAND-009/PRJ-BRAND-010 media fields require correctly typed File global IDs', async ({
    api,
  }) => {
    const store = await currentStore(api);
    for (const [field, id] of [
      ['defaultLogoId', 'not-a-global-id'],
      ['squareLogoId', composeGlobalId('Store', crypto.randomUUID())],
      ['coverImageId', composeGlobalId('Product', crypto.randomUUID())],
    ] as const) {
      const payload = await updateStore(api, store, {
        brand: { ...validBrand, [field]: id },
      });
      expectError(payload.userErrors, {
        code: 'INVALID_ID',
        field: ['operations', 'brand', field],
      });
      expect((await currentStore(api)).brand).toEqual(store.brand);
    }
  });

  test('PRJ-BRAND-011/PRJ-BRAND-014/PRJ-BRAND-015/PRJ-BRAND-016 active media can link, replace, remain unchanged, and clear', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const first = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/logo-one.png',
    });
    const second = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/logo-two.png',
    });
    const linked = await updateStore(api, store, {
      brand: { ...validBrand, defaultLogoId: first.id },
    });
    expectSuccess(linked);
    expect(linked.store?.brand.defaultLogo?.id).toBe(first.id);
    const unchanged = await updateStore(api, linked.store!, {
      brand: { ...validBrand, defaultLogoId: first.id },
    });
    expectSuccess(unchanged);
    expect(unchanged.store?.brand.defaultLogo?.id).toBe(first.id);
    const replaced = await updateStore(api, unchanged.store!, {
      brand: { ...validBrand, defaultLogoId: second.id },
    });
    expectSuccess(replaced);
    expect(replaced.store?.brand.defaultLogo?.id).toBe(second.id);
    const cleared = await updateStore(api, replaced.store!, {
      brand: { ...validBrand, defaultLogoId: null },
    });
    expectSuccess(cleared);
    expect(cleared.store?.brand.defaultLogo).toBeNull();
  });

  test('PRJ-BRAND-012 missing media returns MEDIA_FILE_NOT_FOUND and restores brand', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const snapshot = stableSettings(store);
    const payload = await updateStore(api, store, {
      brand: {
        ...validBrand,
        defaultLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
    });
    expectError(payload.userErrors, { code: 'MEDIA_FILE_NOT_FOUND' });
    expect(stableSettings(await currentStore(api))).toEqual(snapshot);
  });

  test('PRJ-BRAND-013 inactive media returns MEDIA_FILE_INACTIVE and restores brand', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const file = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/inactive.png',
    });
    const { data } = await api.admin.mutation('media-api/FileDelete', {
      variables: { input: { id: file.id } },
    });
    expect(data.mediaMutation.fileDelete.userErrors).toHaveLength(0);
    const payload = await updateStore(api, store, {
      brand: { ...validBrand, defaultLogoId: file.id },
    });
    expectError(payload.userErrors, { code: 'MEDIA_FILE_INACTIVE' });
    expect((await currentStore(api)).brand).toEqual(store.brand);
  });

  test('PRJ-BRAND-017/PRJ-BRAND-018 media failures compensate database and reference state', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const valid = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/valid.png',
    });
    const seeded = await updateStore(api, store, {
      brand: { ...validBrand, defaultLogoId: valid.id },
    });
    expectSuccess(seeded);
    const failed = await updateStore(api, seeded.store!, {
      brand: {
        ...validBrand,
        defaultLogoId: valid.id,
        squareLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
    });
    expect(failed.store).toBeNull();
    expect((await currentStore(api)).brand).toEqual(seeded.store?.brand);
  });

  test('PRJ-BRAND-019/PRJ-BRAND-020 foreign-store media cannot be attached or mutate back-references', async ({
    api,
  }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    selectStore(api, second);
    const foreign = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/foreign.png',
    });
    const secondBefore = await currentStore(api);
    selectStore(api, first);
    const payload = await updateStore(api, first, {
      brand: { ...validBrand, defaultLogoId: foreign.id },
    });
    expect(payload.store).toBeNull();
    expect(payload.userErrors.length).toBeGreaterThan(0);
    selectStore(api, second);
    expect((await currentStore(api)).brand).toEqual(secondBefore.brand);
  });

  test('PRJ-BRAND-021 errors expose safe codes without credentials or storage internals', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const payload = await updateStore(api, store, {
      brand: {
        ...validBrand,
        defaultLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
    });
    const serialized = JSON.stringify(payload);
    expect(serialized).toContain('MEDIA_FILE_NOT_FOUND');
    expect(serialized).not.toMatch(/(?:secret|credential|access[_-]?key|bucket|object[_-]?key|stack)/iu);
  });

  test('PRJ-BRAND-022 File federation references remain consistently typed after compensation', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const file = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/federated.png',
    });
    const linked = await updateStore(api, store, {
      brand: { ...validBrand, coverImageId: file.id },
    });
    expectSuccess(linked);
    expect(linked.store?.brand.coverImage?.id).toBe(file.id);
    expect(() => Buffer.from(file.id, 'base64').toString('utf8')).not.toThrow();
  });
});
