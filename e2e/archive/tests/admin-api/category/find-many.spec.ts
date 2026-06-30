import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiCategoryQueryFindManyArgs } from '@codegen/admin-gql';

import { randomUUID } from 'node:crypto';

test.describe('CategoryFindMany API', () => {
  test('FindMany', async ({ api }) => {
    await api.session.setupUserAndProject();

    const inputs = [
      {
        title: 'Category 1',
        slug: randomUUID(),
        status: 'DRAFT',
      },
      {
        title: 'Category 2',
        slug: randomUUID(),
        status: 'DRAFT',
      },
      {
        title: 'Category 3',
        slug: randomUUID(),
        status: 'PUBLISHED',
      },
    ];

    for (const input of inputs) {
      await api.admin.mutation('admin/CategoryCreate', {
        variables: {
          input: {
            ...input,
            listingOrderByStatus: true,
            listingType: 'MANUAL',
            includeChildrenProducts: true,
            excerpt: '',
            listingFilters: [],
            listingOrderBy: 'CREATED_AT_ASC',
            gallery: [],
          },
        },
      });
    }

    await test.step('1st page / perPage 1', async () => {
      const { data } = await api.admin.query('admin/CategoryFindMany', {
        variables: {
          input: {
            page: 1,
            pageSize: 1,
          },
        },
      });
      expect(data.categoryQuery.findMany.meta).toMatchObject({
        page: 1,
        pageSize: 1,
        count: 1,
        total: 3,
        pageCount: 3,
      });
    });

    await test.step('2nd page / perPage 2', async () => {
      const { data } = await api.admin.query('admin/CategoryFindMany', {
        variables: {
          input: {
            page: 2,
            pageSize: 2,
          },
        },
      });
      expect(data.categoryQuery.findMany.meta).toMatchObject({
        page: 2,
        pageSize: 2,
        count: 1,
        total: 3,
        pageCount: 2,
      });
    });

    await test.step('sort by createdAtASC', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { order: 'createdAtASC' } },
        },
      );
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 1');
      expect(data.categoryQuery.findMany.data[1].title).toBe('Category 2');
      expect(data.categoryQuery.findMany.data[2].title).toBe('Category 3');
    });

    await test.step('sort by createdAtDESC', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { order: 'createdAtDESC' } },
        },
      );
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 3');
      expect(data.categoryQuery.findMany.data[1].title).toBe('Category 2');
      expect(data.categoryQuery.findMany.data[2].title).toBe('Category 1');
    });

    await test.step('sort by titleAsc', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { order: 'titleASC' } },
        },
      );
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 1');
      expect(data.categoryQuery.findMany.data[1].title).toBe('Category 2');
      expect(data.categoryQuery.findMany.data[2].title).toBe('Category 3');
    });

    await test.step('sort by titleDesc', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { order: 'titleDESC' } },
        },
      );
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 3');
      expect(data.categoryQuery.findMany.data[1].title).toBe('Category 2');
      expect(data.categoryQuery.findMany.data[2].title).toBe('Category 1');
    });

    await test.step('filter by title Eq', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { where: { And: [{ title: { Eq: 'Category 2' } }] } } },
        },
      );
      expect(data.categoryQuery.findMany.data).toHaveLength(1);
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 2');
    });

    await test.step('filter by title ILike', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: { input: { where: { And: [{ title: { ILike: '2' } }] } } },
        },
      );
      expect(data.categoryQuery.findMany.data).toHaveLength(1);
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 2');
    });

    await test.step('filter by title and status', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: {
            input: {
              where: {
                And: [{ title: { ILike: 'Category' } }, { status: { Eq: 'PUBLISHED' } }],
              },
            },
          },
        },
      );
      expect(data.categoryQuery.findMany.data).toHaveLength(1);
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 3');
    });

    await test.step('filter by title or status', async () => {
      const { data } = await api.admin.query<ApiCategoryQueryFindManyArgs>(
        'admin/CategoryFindMany',
        {
          variables: {
            input: {
              where: {
                Or: [{ title: { Eq: 'Category 1' } }, { status: { Eq: 'PUBLISHED' } }],
              },
            },
          },
        },
      );
      expect(data.categoryQuery.findMany.data).toHaveLength(2);
      expect(data.categoryQuery.findMany.data[0].title).toBe('Category 1');
      expect(data.categoryQuery.findMany.data[1].title).toBe('Category 3');
    });
  });
});
