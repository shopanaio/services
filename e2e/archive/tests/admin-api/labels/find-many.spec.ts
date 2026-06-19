import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiLabelQueryFindManyArgs } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';

const inputs = [
  { name: 'Uno', slug: randomUUID(), colorHex: '#111111' },
  { name: 'Dos', slug: randomUUID(), colorHex: '#222222' },
  { name: 'Tres', slug: randomUUID(), colorHex: '#333333' },
];

test.describe('LabelFindMany', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();

    for (const input of inputs) {
      await api.admin.mutation('admin/LabelCreate', { variables: { input } });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  test('1st page / perPage 1', async ({ api }) => {
    const { data } = await api.admin.query('admin/LabelFindMany', {
      variables: { input: { page: 1, pageSize: 1 } },
    });

    expect(data.labelQuery.findMany.meta).toMatchObject({
      page: 1,
      pageSize: 1,
      count: 1,
      total: 3,
      pageCount: 3,
    });
  });

  test('2nd page / perPage 2', async ({ api }) => {
    const { data } = await api.admin.query('admin/LabelFindMany', {
      variables: { input: { page: 2, pageSize: 2 } },
    });

    expect(data.labelQuery.findMany.meta).toMatchObject({
      page: 2,
      pageSize: 2,
      count: 1,
      total: 3,
      pageCount: 2,
    });
  });

  test('Sort by createdAt ASC', async ({ api }) => {
    const { data } = await api.admin.query<ApiLabelQueryFindManyArgs>('admin/LabelFindMany', {
      variables: { input: { order: 'createdAtASC' } },
    });

    expect(data.labelQuery.findMany.data[0].name).toBe('Uno');
    expect(data.labelQuery.findMany.data[1].name).toBe('Dos');
    expect(data.labelQuery.findMany.data[2].name).toBe('Tres');
  });

  test('Sort by createdAt DESC', async ({ api }) => {
    const { data } = await api.admin.query<ApiLabelQueryFindManyArgs>('admin/LabelFindMany', {
      variables: { input: { order: 'createdAtDESC' } },
    });

    expect(data.labelQuery.findMany.data[0].name).toBe('Tres');
    expect(data.labelQuery.findMany.data[1].name).toBe('Dos');
    expect(data.labelQuery.findMany.data[2].name).toBe('Uno');
  });

  test('Sort by name ASC', async ({ api }) => {
    const { data } = await api.admin.query<ApiLabelQueryFindManyArgs>('admin/LabelFindMany', {
      variables: { input: { order: 'nameASC' } },
    });

    expect(data.labelQuery.findMany.data[0].name).toBe('Dos');
    expect(data.labelQuery.findMany.data[1].name).toBe('Tres');
    expect(data.labelQuery.findMany.data[2].name).toBe('Uno');
  });

  test('Sort by name DESC', async ({ api }) => {
    const { data } = await api.admin.query<ApiLabelQueryFindManyArgs>('admin/LabelFindMany', {
      variables: { input: { order: 'nameDESC' } },
    });

    expect(data.labelQuery.findMany.data[0].name).toBe('Uno');
    expect(data.labelQuery.findMany.data[1].name).toBe('Tres');
    expect(data.labelQuery.findMany.data[2].name).toBe('Dos');
  });
});
