import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateStoreSlug = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

test.describe('StoreCreate API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
  });

  test('Create store with minimal required fields', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Test Store',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.name).toBe('Test Store');
    expect(result.store?.slug).toBe(slug);
    expect(result.store?.status).toBe('active');
    expect(result.store?.locales).toContain('en');
    expect(result.store?.currencies).toContain('USD');
    expect(result.store?.defaultCurrency).toBe('USD');
  });

  test('Create store with all fields', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Full Test Store',
          slug,
          locales: ['en', 'uk'],
          currencies: ['USD', 'EUR'],
          defaultCurrency: 'EUR',
          status: 'active',
          timezone: 'Europe/Kiev',
          email: 'test@example.com',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.name).toBe('Full Test Store');
    expect(result.store?.slug).toBe(slug);
    expect(result.store?.status).toBe('active');
    expect(result.store?.timezone).toBe('Europe/Kiev');
    expect(result.store?.email).toBe('test@example.com');
    expect(result.store?.locales).toEqual(expect.arrayContaining(['en', 'uk']));
    expect(result.store?.currencies).toEqual(expect.arrayContaining(['USD', 'EUR']));
    expect(result.store?.defaultCurrency).toBe('EUR');
  });

  test('Create store with inactive status', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Inactive Store',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
          status: 'inactive',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.status).toBe('inactive');
  });

  test('Create store with duplicate slug should fail', async ({ api }) => {
    const slug = generateStoreSlug();

    // Create first store
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'First Store',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Try to create second store with same slug
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Second Store',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.store).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Create store without name should fail', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: '',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store without slug should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Store',
          slug: '',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with empty locales should fail', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Store',
          slug,
          locales: [],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with empty currencies should fail', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Store',
          slug,
          locales: ['en'],
          currencies: [],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with multiple locales', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Multi-locale Store',
          slug,
          locales: ['en', 'uk', 'de', 'fr'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.locales).toHaveLength(4);
    expect(result.store?.locales).toEqual(expect.arrayContaining(['en', 'uk', 'de', 'fr']));
  });

  test('Create store with multiple currencies', async ({ api }) => {
    const slug = generateStoreSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Multi-currency Store',
          slug,
          locales: ['en'],
          currencies: ['USD', 'EUR', 'GBP', 'UAH'],
          defaultCurrency: 'EUR',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.currencies).toHaveLength(4);
    expect(result.store?.currencies).toEqual(
      expect.arrayContaining(['USD', 'EUR', 'GBP', 'UAH']),
    );
    expect(result.store?.defaultCurrency).toBe('EUR');
  });
});
