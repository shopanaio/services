import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type {
  ApiCategory,
  ApiProduct } from '@codegen/admin-gql';
import {
  EntityStatus,
  ListingSort,
  ListingType,
} from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import * as Yup from 'yup';



test.describe('Product Category', () => {
  let category = {} as ApiCategory;
  let product = {} as ApiProduct;

  const categoryInput = {
    title: 'Primary Category',
    slug: randomUUID(),
    status: EntityStatus.Published,
    excerpt: '',
    includeChildrenProducts: false,
    listingFilters: [],
    listingOrderBy: ListingSort.CreatedAtAsc,
    listingOrderByStatus: true,
    listingType: ListingType.Manual,
    gallery: [],
  };

  test('Create product with primary category', async ({ api }) => {
    await test.step('Create user and project', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Создать категорию', async () => {
      category = await api.admin.category.create({ input: categoryInput });
    });

    await test.step('Create product with primary category and category in all variants', async () => {
      product = await api.admin.product.create({
        input: {
          primaryCategory: category.id,
          variants: {
            create: [
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { categories: [category.id], price: 3500 } as any,
            ],
          },
        },
      });


      expect(product.variants[0]).toMatchSchema(
        Yup.object({
          categories: Yup.array().of(
            Yup.object({
              id: Yup.string().equals([category.id]).required(),
            }),
          ),
        }),
      );
    });

    await test.step('Get product and check that category is present', async () => {
      const { data } = await api.admin.query('admin/ProductFindOne', {
        variables: {
          id: product.id,
        },
      });

      const fetchedProduct = data.productQuery.findOne;

      if (!fetchedProduct) {
        throw new Error('Product not found');
      }

      expect(fetchedProduct.variants[0]).toMatchSchema(
        Yup.object({
          categories: Yup.array().of(
            Yup.object({
              id: Yup.string().equals([category.id]).required(),
            }),
          ),
        }),
      );
    });
  });
});
