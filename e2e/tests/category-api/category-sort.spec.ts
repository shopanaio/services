import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category Sort Configuration API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // HAPPY PATH
  // ===============================================

  test('should create category with default sort settings', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-default-sort',
      name: 'Default Sort Category',
    });

    expect(category.id).toBeTruthy();
    expect(category.defaultSort).toBe('MANUAL');
    expect(category.defaultSortDirection).toBe('asc');
  });

  test('should update category sort to PRICE ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-price-asc',
      name: 'Price ASC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'PRICE',
          defaultSortDirection: 'asc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('PRICE');
    expect(result.category.defaultSortDirection).toBe('asc');
  });

  test('should update category sort to PRICE DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-price-desc',
      name: 'Price DESC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'PRICE',
          defaultSortDirection: 'desc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('PRICE');
    expect(result.category.defaultSortDirection).toBe('desc');
  });

  test('should update category sort to NEWEST ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-newest-asc',
      name: 'Newest ASC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'NEWEST',
          defaultSortDirection: 'asc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('NEWEST');
    expect(result.category.defaultSortDirection).toBe('asc');
  });

  test('should update category sort to NEWEST DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-newest-desc',
      name: 'Newest DESC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'NEWEST',
          defaultSortDirection: 'desc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('NEWEST');
    expect(result.category.defaultSortDirection).toBe('desc');
  });

  test('should update category sort to NAME ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-name-asc',
      name: 'Name ASC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'NAME',
          defaultSortDirection: 'asc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('NAME');
    expect(result.category.defaultSortDirection).toBe('asc');
  });

  test('should update category sort to NAME DESC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-name-desc',
      name: 'Name DESC Category',
    });

    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'NAME',
          defaultSortDirection: 'desc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('NAME');
    expect(result.category.defaultSortDirection).toBe('desc');
  });

  test('should update category sort to MANUAL ASC', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'category-manual-asc',
      name: 'Manual ASC Category',
    });

    // First change to something else
    await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'PRICE',
          defaultSortDirection: 'desc',
        },
      },
    });

    // Then change back to MANUAL
    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      variables: {
        input: {
          id: category.id,
          defaultSort: 'MANUAL',
          defaultSortDirection: 'asc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.defaultSort).toBe('MANUAL');
    expect(result.category.defaultSortDirection).toBe('asc');
  });

  // ===============================================
  // VALIDATION
  // ===============================================

  test('should reject non-existent category ID', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryUpdateSort', {
      throwOnError: false,
      variables: {
        input: {
          id: '00000000-0000-0000-0000-000000000000',
          defaultSort: 'PRICE',
          defaultSortDirection: 'asc',
        },
      },
    });

    const result = data.catalogMutation.categoryUpdateSort;

    expect(result.category).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'NOT_FOUND',
      })
    );
  });

  // ===============================================
  // USING FIXTURE HELPER
  // ===============================================

  test('should update sort using fixture helper', async ({ api }) => {
    const category = await api.admin.category.create({
      handle: 'fixture-sort-test',
      name: 'Fixture Sort Test',
    });

    const updated = await api.admin.category.updateSort(category.id, 'PRICE', 'desc');

    expect(updated.defaultSort).toBe('PRICE');
    expect(updated.defaultSortDirection).toBe('desc');
  });
});
