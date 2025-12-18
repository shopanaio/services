import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { ApiTagQueryFindManyArgs } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';



const inputs = [
  {
    title: 'Uno',
    slug: randomUUID(),
    color: '#0000ff',
  },
  {
    title: 'Dos',
    slug: randomUUID(),
    color: '#ff0000',
  },
  {
    title: 'Tres',
    slug: randomUUID(),
    color: '#00ff00',
  },
];

test.describe('TagFindMany', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();

    for (const input of inputs) {
      await api.admin.tag.create({ input });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  test('1st page / perPage 1', async ({ api }) => {
    const { data } = await api.admin.query('admin/TagFindMany', {
      variables: { input: { page: 1, pageSize: 1 } },
    });

    expect(data.tagQuery.findMany.meta).toMatchObject({
      page: 1,
      pageSize: 1,
      count: 1,
      total: 3,
      pageCount: 3,
    });
  });

  test('2nd page / perPage 2', async ({ api }) => {
    const { data } = await api.admin.query('admin/TagFindMany', {
      variables: { input: { page: 2, pageSize: 2 } },
    });

    expect(data.tagQuery.findMany.meta).toMatchObject({
      page: 2,
      pageSize: 2,
      count: 1,
      total: 3,
      pageCount: 2,
    });
  });

  test('Sort by createdAt ASC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'createdAtASC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Uno');
    expect(data.tagQuery.findMany.data[1].title).toBe('Dos');
    expect(data.tagQuery.findMany.data[2].title).toBe('Tres');
  });

  // FIXME wrong sort by createdAt DESC
  test('Sort by createdAt DESC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'createdAtDESC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Tres');
    expect(data.tagQuery.findMany.data[1].title).toBe('Dos');
    expect(data.tagQuery.findMany.data[2].title).toBe('Uno');
  });

  // FIXME wrong sort by color ASC
  test('Sort by color ASC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'colorASC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Uno');
    expect(data.tagQuery.findMany.data[1].title).toBe('Tres');
    expect(data.tagQuery.findMany.data[2].title).toBe('Dos');
  });

  test('Sort by color DESC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'colorDESC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Dos');
    expect(data.tagQuery.findMany.data[1].title).toBe('Tres');
    expect(data.tagQuery.findMany.data[2].title).toBe('Uno');
  });

  test('Sort by title ASC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'titleASC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Dos');
    expect(data.tagQuery.findMany.data[1].title).toBe('Tres');
    expect(data.tagQuery.findMany.data[2].title).toBe('Uno');
  });

  test('Sort by title DESC', async ({ api }) => {
    const { data } = await api.admin.query<ApiTagQueryFindManyArgs>('admin/TagFindMany', {
      variables: { input: { order: 'titleDESC' } },
    });

    expect(data.tagQuery.findMany.data[0].title).toBe('Uno');
    expect(data.tagQuery.findMany.data[1].title).toBe('Tres');
    expect(data.tagQuery.findMany.data[2].title).toBe('Dos');
  });
});
