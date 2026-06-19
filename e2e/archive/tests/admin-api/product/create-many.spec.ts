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



test.describe('Products API', () => {
  let category = {} as ApiCategory;
  let product = {} as ApiProduct;

  const categoryInput = {
    excerpt: '',
    includeChildrenProducts: false,
    listingFilters: [],
    listingOrderBy: ListingSort.PriceAsc,
    listingOrderByStatus: true,
    listingType: ListingType.Manual,
    slug: randomUUID(),
    status: EntityStatus.Draft,
    title: 'Category',
    gallery: [],
  };

  test('Create products', async ({ api }) => {
    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create product and category', async () => {
      product = await api.admin.product.create({
        input: {
          title: 'Sunglasses',
        },
      });


      product = await api.admin.product.update({
        input: {
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                oldPrice: 3000,
                price: 3500,
              },
            ],
          },
        },
      });

      category = await api.admin.category.create({ input: categoryInput });
    });

    /* ---- Update ---- */

    await test.step('Change title and check that api handle didn\'t change', async () => {
      const updateProductInput = { title: 'Product Updated' };

      const updated = await api.admin.product.update({
        input: {
          ...updateProductInput,
          id: product.id,
        },
      });
      expect(updated).toMatchSchema(
        Yup.object({
          title: Yup.string().equals([updateProductInput.title]).required(),
          slug: Yup.string().equals([product.slug]).required(),
        }),
      );
    });

    await test.step('Change description and excerpt', async () => {
      const updateProductInput = {
        description: {
          html: '<p style="">Product description</p>',
          json: '{"data":{"type":"doc","content":[{"type":"paragraph","attrs":{"nodeIndent":null,"nodeTextAlignment":null,"nodeLineHeight":null,"style":""},"content":[{"type":"text","text":"Description"}]}]}}',
          text: 'Product description',
        },
        excerpt: 'Product except',
      };

      const updated = await api.admin.product.update({
        input: {
          id: product.id,
          ...updateProductInput,
        },
      });

      // FIXME can't make .equals([updateProductInput.description])
      // returns {"data":{"type":"doc","content":[{"type":"paragraph","attrs":{"nodeIndent":null,"nodeTextAlignment":null,"nodeLineHeight":null,"style":""},"content":[{"type":"text","text":"Description"}]}]}}

      expect(updated).toMatchSchema(
        Yup.object({
          description: Yup.string() /* .equals([updateProductInput.description]) */
            .required(),
          excerpt: Yup.string().equals([updateProductInput.excerpt]).required(),
        }),
      );
    });

    //await test.step('Remove cover and upload another', async () => { });
    //await test.step('Add 2 gallery images', async () => { });

    await test.step('Change prices, SKU, weight', async () => {
      const updateProductInput = {
        price: 5000,
        sku: 'Product SKU',
        weight: 100,
      };

      const updated = await api.admin.product.update({
        input: {
          requiresShipping: true,
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                ...updateProductInput,
              },
            ],
          },
        },
      });
      expect(updated.variants[0]).toMatchSchema(
        Yup.object({
          sku: Yup.string().equals([updateProductInput.sku]).required(),
          price: Yup.number().equals([updateProductInput.price]).required(),
          weight: Yup.number().equals([updateProductInput.weight]).required(),
        }),
      );
    });

    await test.step('Add 1 category', async () => {
      const updated = await api.admin.product.update({
        input: {
          requiresShipping: true,
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                categories: [category.id],
              },
            ],
          },
        },
      });
      expect(updated.variants[0]).toMatchSchema(
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
