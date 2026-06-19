import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiProductQueryFindManyArgs } from '@codegen/admin-gql';



test.describe('ProductFindMany', () => {
  test('list of products', async ({ api }) => {
    await api.session.setupUserAndProject();

    const inputs = [
      { title: 'Sunglasses', price: 3500, oldPrice: 3000 },
      { title: 'Hat', price: 2500, oldPrice: 2000 },
      { title: 'Pants', price: 5000, oldPrice: 4000 },
    ];

    for (const input of inputs) {
      const product = await api.admin.product.create({
        input: {
          title: input.title,
        },
      });


      await api.admin.product.update({
        input: {
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                price: input.price,
                oldPrice: input.oldPrice,
              },
            ],
          },
        },
      });
    }

    await test.step('1st page / perPage 1', async () => {
      const { data } = await api.admin.query('admin/ProductFindMany', {
        variables: {
          input: {
            page: 1,
            pageSize: 1,
          },
        },
      });
      expect(data.productQuery.findMany.meta).toMatchObject({
        page: 1,
        pageSize: 1,
        count: 1,
        total: 3,
        pageCount: 3,
      });
    });

    await test.step('2nd page / perPage 2', async () => {
      const { data } = await api.admin.query('admin/ProductFindMany', {
        variables: {
          input: {
            page: 2,
            pageSize: 2,
          },
        },
      });
      expect(data.productQuery.findMany.meta).toMatchObject({
        page: 2,
        pageSize: 2,
        count: 1,
        total: 3,
        pageCount: 2,
      });
    });

    await test.step('Sort by createdAtASC', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: { input: { order: 'createdAtASC' } },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Sunglasses');
      expect(data.productQuery.findMany.data[1].title).toBe('Hat');
      expect(data.productQuery.findMany.data[2].title).toBe('Pants');
    });

    await test.step('Sort by createdAtDESC', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: { input: { order: 'createdAtDESC' } },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Pants');
      expect(data.productQuery.findMany.data[1].title).toBe('Hat');
      expect(data.productQuery.findMany.data[2].title).toBe('Sunglasses');
    });

    await test.step('Sort by titleAsc', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { order: 'titleASC' },
        },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Hat');
      expect(data.productQuery.findMany.data[1].title).toBe('Pants');
      expect(data.productQuery.findMany.data[2].title).toBe('Sunglasses');
    });

    await test.step('Sort by titleDesc', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { order: 'titleDESC' },
        },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Sunglasses');
      expect(data.productQuery.findMany.data[1].title).toBe('Pants');
      expect(data.productQuery.findMany.data[2].title).toBe('Hat');
    });

    // FIXME
    await test.step.skip('Sort by PriceAsc', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { order: 'priceAsc' },
        },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Hat');
      expect(data.productQuery.findMany.data[1].title).toBe('Sunglasses');
      expect(data.productQuery.findMany.data[2].title).toBe('Pants');
    });

    // FIXME
    await test.step.skip('Sort by PriceDesc', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { order: 'priceDesc' },
        },
      });
      expect(data.productQuery.findMany.data[0].title).toBe('Pants');
      expect(data.productQuery.findMany.data[1].title).toBe('Sunglasses');
      expect(data.productQuery.findMany.data[2].title).toBe('Hat');
    });

    await test.step('Filter by title Eq', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { where: { And: [{ title: { Eq: 'Hat' } }] } },
        },
      });
      expect(data.productQuery.findMany.data).toHaveLength(1);
      expect(data.productQuery.findMany.data[0].title).toBe('Hat');
    });

    await test.step('Filter by title ILike', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: { where: { And: [{ title: { ILike: 'Su' } }] } },
        },
      });
      expect(data.productQuery.findMany.data).toHaveLength(1);
      expect(data.productQuery.findMany.data[0].title).toBe('Sunglasses');
    });

    await test.step('Filter by price', async () => {
      const { data } = await api.admin.query<ApiProductQueryFindManyArgs>('admin/ProductFindMany', {
        variables: {
          input: {
            where: {
              And: [
                {
                  variants: {
                    price: {
                      Eq: 5000,
                    },
                  },
                },
              ],
            },
          },
        },
      });
      expect(data.productQuery.findMany.data).toHaveLength(1);
      expect(data.productQuery.findMany.data[0].title).toBe('Pants');
    });
  });
});
