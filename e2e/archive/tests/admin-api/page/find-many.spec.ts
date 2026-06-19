import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiPageQueryFindManyArgs } from '@codegen/admin-gql';
import { EntityStatus } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';

test.describe('PageFindMany API', () => {
  test('FindMany', async ({ api }) => {
    await api.session.setupUserAndProject();

    const inputs = [
      {
        title: 'Page 1',
        slug: randomUUID(),
        status: EntityStatus.Draft,
      },
      {
        title: 'Page 2',
        slug: randomUUID(),
        status: EntityStatus.Published,
      },
      {
        title: 'Page 3',
        slug: randomUUID(),
        status: EntityStatus.Archived,
      },
    ];

    for (const input of inputs) {
      await api.admin.mutation('admin/PageCreate', {
        variables: {
          input: {
            ...input,
          },
        },
      });
    }

    // FIXME wrong meta
    await test.step.skip('1st page / perPage 1', async () => {
      const { data } = await api.admin.query('admin/PageFindMany', {
        variables: {
          input: {
            page: 1,
            pageSize: 1,
          },
        },
      });

      expect(data.pageQuery.findMany.meta).toMatchObject({
        page: 1,
        pageSize: 1,
        count: 1,
        total: 3,
        pageCount: 3,
      });
    });

    // FIXME wrong meta
    await test.step.skip('2nd page / perPage 2', async () => {
      const { data } = await api.admin.query('admin/PageFindMany', {
        variables: {
          input: {
            page: 2,
            pageSize: 2,
          },
        },
      });

      expect(data.pageQuery.findMany.meta).toMatchObject({
        page: 2,
        pageSize: 2,
        count: 1,
        total: 3,
        pageCount: 2,
      });
    });

    await test.step('Sort by createdAtASC', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'createdAtASC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 1');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 2');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 3');
    });

    await test.step('Sort by createdAtDESC', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'createdAtDESC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 3');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 2');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 1');
    });

    await test.step('Sort by status ASC', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'statusASC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 3');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 1');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 2');
    });

    await test.step('Sort by status DESC', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'statusDESC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 2');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 1');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 3');
    });

    await test.step('Sort by titleAsc', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'titleASC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 1');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 2');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 3');
    });

    await test.step('Sort by titleDesc', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { order: 'titleDESC' } },
      });
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 3');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 2');
      expect(data.pageQuery.findMany.data[2].title).toBe('Page 1');
    });

    await test.step('Filter by title Eq', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { where: { And: [{ title: { Eq: 'Page 2' } }] } } },
      });
      expect(data.pageQuery.findMany.data).toHaveLength(1);
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 2');
    });

    await test.step('Filter by title ILike', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: { input: { where: { And: [{ title: { ILike: '2' } }] } } },
      });
      expect(data.pageQuery.findMany.data).toHaveLength(1);
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 2');
    });

    await test.step('Filter by title and status', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: {
          input: {
            where: {
              And: [{ title: { ILike: 'Page' } }, { status: { Eq: EntityStatus.Published } }],
            },
          },
        },
      });
      expect(data.pageQuery.findMany.data).toHaveLength(1);
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 2');
    });

    await test.step('Filter by title or status', async () => {
      const { data } = await api.admin.query<ApiPageQueryFindManyArgs>('admin/PageFindMany', {
        variables: {
          input: {
            where: {
              Or: [{ title: { Eq: 'Page 1' } }, { status: { Eq: EntityStatus.Published } }],
            },
          },
        },
      });
      expect(data.pageQuery.findMany.data).toHaveLength(2);
      expect(data.pageQuery.findMany.data[0].title).toBe('Page 1');
      expect(data.pageQuery.findMany.data[1].title).toBe('Page 2');
    });
  });
});
