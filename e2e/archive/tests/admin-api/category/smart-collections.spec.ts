import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type {
  ApiCategory,
  ApiProduct,
  ApiTag } from '@codegen/admin-gql';
import {
  EntityStatus,
  ListingSort,
  ListingType,
  WeightUnit,
} from '@codegen/admin-gql';

test.describe.skip('Smart-collection API', () => {
  let categoryStandard = {} as ApiCategory;
  let categorySmart = {} as ApiCategory;
  let tag = {} as ApiTag;
  let productRequest: { data: { productMutation: { create: ApiProduct } } };

  const createCategoryInput = (
    title: string,
    status: EntityStatus,
    listingOrderBy: ListingSort,
    listingType: ListingType,
  ) => ({
    title,
    slug: randomUUID(),
    status,
    excerpt: '',
    includeChildrenProducts: true,
    listingFilters: [],
    listingOrderBy,
    listingOrderByStatus: true,
    listingType,
    gallery: [],
  });

  const categoriesInputs = [
    createCategoryInput(
      'Clothes',
      EntityStatus.Published,
      ListingSort.CreatedAtAsc,
      ListingType.Manual,
    ),
    createCategoryInput(
      'Smart-collection',
      EntityStatus.Published,
      ListingSort.CreatedAtAsc,
      ListingType.Auto,
    ),
  ];

  const productsIds: string[] = [];

  test('Smart-collection', async ({ api }) => {
    const getListingBySlugAndListingType = async (slug: string, listingType: string) => {
      return await api.admin.query('admin/ListingV1', {
        variables: {
          input: {
            listingType: listingType,
            category: {
              slug: slug,
            },
            page: 1,
            perPage: 25,
          },
        },
      });
    };

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create 5 products with different prices, stock status', async () => {
      const createProductInput = (title: string, price: number, stockStatus: string) => ({
        description: null,
        excerpt: '',
        groups: [],
        requiresShipping: false,
        slug: randomUUID(),
        status: EntityStatus.Draft,
        tags: [],
        title,
        variants: {
          create: [
            {
              categories: [],
              costPrice: 0,
              coverId: null,
              features: [],
              gallery: [],
              inListing: true,
              oldPrice: price,
              price,
              sku: '',
              slug: randomUUID(),
              stockStatus,
              title,
              variantSortIndex: 0,
              weight: 0,
              weightUnit: WeightUnit.Gr,
            },
          ],
        },
      });

      const productsInputs = [
        createProductInput('Sunglasses', 3500, 'IN_STOCK'),
        createProductInput('Hat', 2500, 'IN_STOCK'),
        createProductInput('Pants', 5000, 'IN_STOCK'),
        createProductInput('Gloves', 2500, 'OUT_OF_STOCK'),
        createProductInput('Hoodie', 3000, 'IN_STOCK'),
      ];

      for (const input of productsInputs) {
        productRequest = await api.admin.mutation('admin/ProductCreate', {
          variables: { input },
        });
        productsIds.push(productRequest.data.productMutation.create.id);
      }
    });

    await test.step('Create tag and add in one product', async () => {
      const input = {
        title: 'Tag 1',
        slug: randomUUID(),
        color: "#000000",
      };

      tag = await api.admin.tag.create({ input });
      await api.admin.mutation('admin/ProductUpdate', {
        variables: {
          input: {
            id: productsIds[4],
            tags: [tag.id],
          },
        },
      });
    });

    await test.step('Create category with 4 of 5 products', async () => {
      categoryStandard = await api.admin.category.create({
        input: categoriesInputs[0],
      });

      await api.admin.mutation('admin/CategoryAddProducts', {
        variables: {
          input: {
            categoryId: categoryStandard.id,
            productContainerIds: productsIds.slice(1, 5),
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(
        categoryStandard.slug,
        ListingType.Manual,
      );

      expect(data.listingQuery.listingV1.data.length).toBe(4);
    });

    /* ------ smart collection ------ */

    await test.step('Create smart collection', async () => {
      categorySmart = await api.admin.category.create({
        input: { ...categoriesInputs[1], slug: randomUUID() },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(5);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Sunglasses');
      expect(data.listingQuery.listingV1.data[1].title).toBe('Hat');
      expect(data.listingQuery.listingV1.data[2].title).toBe('Pants');
      expect(data.listingQuery.listingV1.data[3].title).toBe('Gloves');
      expect(data.listingQuery.listingV1.data[4].title).toBe('Hoodie');
    });

    await test.step('Availability filter - in stock', async () => {
      await api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            id: categorySmart.id,
            listingFilters: [
              {
                operator: 'Eq',
                path: '0.0',
                type: 'AVAILABILITY',
                value: 'IN_STOCK',
              },
            ],
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(4);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Sunglasses');
      expect(data.listingQuery.listingV1.data[1].title).toBe('Hat');
      expect(data.listingQuery.listingV1.data[2].title).toBe('Pants');
      expect(data.listingQuery.listingV1.data[3].title).toBe('Hoodie');
    });

    await test.step('Price filter', async () => {
      await api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            id: categorySmart.id,
            listingFilters: [
              {
                operator: 'Eq',
                path: '0.0',
                type: 'AVAILABILITY',
                value: 'IN_STOCK',
              },
              {
                operator: 'Between',
                path: '1.0',
                type: 'PRICE',
                value: '0',
              },
              {
                operator: 'Between',
                path: '1.1',
                type: 'PRICE',
                value: '4000',
              },
            ],
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(3);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Sunglasses');
      expect(data.listingQuery.listingV1.data[1].title).toBe('Hat');
      expect(data.listingQuery.listingV1.data[2].title).toBe('Hoodie');
    });

    await test.step('Category filter - standard', async () => {
      await api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            id: categorySmart.id,
            listingFilters: [
              {
                operator: 'Eq',
                path: '0.0',
                type: 'AVAILABILITY',
                value: 'IN_STOCK',
              },
              {
                operator: 'Between',
                path: '1.0',
                type: 'PRICE',
                value: '0',
              },
              {
                operator: 'Between',
                path: '1.1',
                type: 'PRICE',
                value: '4000',
              },
              {
                entryID: categoryStandard.id,
                operator: 'Eq',
                path: '2.0',
                type: 'CATEGORY',
                value: '',
              },
            ],
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(2);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Hat');
      expect(data.listingQuery.listingV1.data[1].title).toBe('Hoodie');
    });

    await test.step('Tag filter', async () => {
      await api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            id: categorySmart.id,
            listingFilters: [
              {
                operator: 'Eq',
                path: '0.0',
                type: 'AVAILABILITY',
                value: 'IN_STOCK',
              },
              {
                operator: 'Between',
                path: '1.0',
                type: 'PRICE',
                value: '0',
              },
              {
                operator: 'Between',
                path: '1.1',
                type: 'PRICE',
                value: '4000',
              },
              {
                entryID: categoryStandard.id,
                operator: 'Eq',
                path: '2.0',
                type: 'CATEGORY',
                value: '',
              },
              {
                entryID: tag.id,
                operator: 'Eq',
                path: '3.0',
                type: 'TAG',
                value: '',
              },
            ],
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(1);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Hoodie');
    });

    await test.step.skip('Features filter', async () => {
      await api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            id: categorySmart.id,
            listingFilters: [
              {
                operator: 'Eq',
                path: '0.0',
                type: 'AVAILABILITY',
                value: 'IN_STOCK',
              },
              {
                operator: 'Between',
                path: '1.0',
                type: 'PRICE',
                value: '0',
              },
              {
                operator: 'Between',
                path: '1.1',
                type: 'PRICE',
                value: '4000',
              },
              {
                entryID: categoryStandard.id,
                operator: 'Eq',
                path: '2.0',
                type: 'CATEGORY',
                value: '',
              },
              {
                entryID: tag.id,
                operator: 'Eq',
                path: '3.0',
                type: 'TAG',
                value: '',
              },
              {
                //entryID: ,
                operator: 'Eq',
                path: '4.0',
                type: 'FEATURE',
                value: '',
              },
            ],
          },
        },
      });

      const { data } = await getListingBySlugAndListingType(categorySmart.slug, ListingType.Auto);

      expect(data.listingQuery.listingV1.data.length).toBe(1);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Hoodie');
    });

    //await test.step('Change features filter', async () => { });

    //await test.step('Check', async () => { });
  });
});
