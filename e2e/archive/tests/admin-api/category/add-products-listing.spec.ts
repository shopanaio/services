
import { test } from '@fixtures/base.extend';
import {
  ApiCategory,
  //ApiCategoryQueryFindOneArgs,
  ApiProduct,
  EntityStatus,
  ListingSort,
  ListingType,
  WeightUnit,
  //ApiFeatureGroup,
  //ApiProductQueryFindOneArgs,
  //FeatureType,
} from '@codegen/admin-gql';
import * as Yup from 'yup';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

test.describe('Categories API', () => {
  let category = {} as ApiCategory;
  let product = {} as ApiProduct;
  /* let featureReq: { data: { featureGroupMutation: { create: ApiFeatureGroup } } };
  let featureFindOne: {
    data: {
      featureGroupQuery: {
        findOne: {
          features: { id: string }[];
        };
      };
    };
  }; */
  const categoryInput = {
    title: 'Category',
    slug: randomUUID(),
    status: EntityStatus.Published,
    excerpt: '',
    includeChildrenProducts: true,
    listingFilters: [],
    listingOrderBy: ListingSort.CreatedAtAsc,
    listingOrderByStatus: true,
    listingType: ListingType.Manual,
    gallery: [],
  };

  test('Add products / Manage Listing', async ({ api }) => {
    let categoryId: string;
    let categorySlug: string;

    const updateCategoryListingOrder = (listingOrderBy: string, id: string) =>
      api.admin.mutation('admin/CategoryUpdate', {
        variables: {
          input: {
            listingOrderBy,
            id,
          },
        },
      });

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

    const createProductInput = (title: string, price: number, oldPrice: number) => ({
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
            oldPrice,
            price,
            sku: '',
            slug: randomUUID(),
            stockStatus: 'OUT_OF_STOCK',
            title,
            variantSortIndex: 0,
            weight: 0,
            weightUnit: WeightUnit.Gr,
          },
        ],
      },
    });

    const productsInputs = [
      createProductInput('Sunglasses', 3500, 3000),
      createProductInput('Hat', 2500, 2000),
      createProductInput('Pants', 5000, 4000),
    ];

    const productsIds: string[] = [];

    /*  const featureInput = {
      category: '',
      features: [
        { title: 'red', sortIndex: 0 },
        { title: 'green', sortIndex: 1 },
      ],
      title: 'color',
      type: FeatureType.Radio,
    }; */

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create category with a title, reload and open', async () => {
      category = await api.admin.category.create({ input: categoryInput });
      categoryId = category.id;
      categorySlug = category.slug;
    });

    await test.step('Open Manage Content drawer and check it is empty', async () => {
      const { data } = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(data.listingQuery.listingV1.data.length).toBe(0);
    });

    await test.step('Create 3 products', async () => {
      for (const input of productsInputs) {
        product = await api.admin.product.create({ input });
        productsIds.push(product.id);
      }
    });

    await test.step('Click add products, check all rows and click OK', async () => {
      const categoryWithProducts = await api.admin.mutation('admin/CategoryAddProducts', {
        variables: {
          input: {
            categoryId: categoryId,
            productContainerIds: productsIds,
          },
        },
      });
      expect(categoryWithProducts.data.categoryMutation).toMatchSchema(
        Yup.object({
          addProducts: Yup.boolean().equals([true]).required(),
        }),
      );
    });

    await test.step('Check that all products are added', async () => {
      const { data } = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(data.listingQuery.listingV1.data.length).toBe(3);
      expect(data.listingQuery.listingV1.data[0].title).toBe('Sunglasses');
      expect(data.listingQuery.listingV1.data[1].title).toBe('Hat');
      expect(data.listingQuery.listingV1.data[2].title).toBe('Pants');
    });

    // --- Manage Listing / Check Sort ---

    await test.step('Change to Oldest, open products and check the ordering', async () => {
      await updateCategoryListingOrder(ListingSort.CreatedAtDesc, categoryId);
      expect(await api.admin.category.findOne(categoryId)).toMatchSchema(
        Yup.object({
          listingOrderBy: Yup.string().equals([ListingSort.CreatedAtDesc]).required(),
        }),
      );

      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);
      expect(listing.data.listingQuery.listingV1.data[0].title).toBe('Pants');
      expect(listing.data.listingQuery.listingV1.data[1].title).toBe('Hat');
      expect(listing.data.listingQuery.listingV1.data[2].title).toBe('Sunglasses');
    });

    //FIXME without error but wrong sorting
    await test.step.skip('Change to Title A-Z, open products and check the ordering', async () => {
      await updateCategoryListingOrder(ListingSort.TitleAsc, categoryId);
      expect(await api.admin.category.findOne(categoryId)).toMatchSchema(
        Yup.object({
          listingOrderBy: Yup.string().equals([ListingSort.TitleAsc]).required(),
        }),
      );

      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(listing.data.listingQuery.listingV1.data[0].title).toBe('Hat');
      expect(listing.data.listingQuery.listingV1.data[1].title).toBe('Pants');
      expect(listing.data.listingQuery.listingV1.data[2].title).toBe('Sunglasses');
    });

    //FIXME without error but wrong sorting
    await test.step.skip('Change to Title Z-A, open products and check the ordering', async () => {
      await updateCategoryListingOrder(ListingSort.TitleDesc, categoryId);
      expect(await api.admin.category.findOne(categoryId)).toMatchSchema(
        Yup.object({
          listingOrderBy: Yup.string().equals([ListingSort.TitleDesc]).required(),
        }),
      );
      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(listing.data.listingQuery.listingV1.data[0].title).toBe('Sunglasses');
      expect(listing.data.listingQuery.listingV1.data[1].title).toBe('Pants');
      expect(listing.data.listingQuery.listingV1.data[2].title).toBe('Hat');
    });

    await test.step('Change to Price Lowest, open products and check the ordering', async () => {
      await updateCategoryListingOrder(ListingSort.PriceAsc, categoryId);

      expect(await api.admin.category.findOne(categoryId)).toMatchSchema(
        Yup.object({
          listingOrderBy: Yup.string().equals([ListingSort.PriceAsc]).required(),
        }),
      );

      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(listing.data.listingQuery.listingV1.data[0].title).toBe('Hat');
      expect(listing.data.listingQuery.listingV1.data[1].title).toBe('Sunglasses');
      expect(listing.data.listingQuery.listingV1.data[2].title).toBe('Pants');
    });

    await test.step('Change to Price Highest, open products and check the ordering', async () => {
      await updateCategoryListingOrder(ListingSort.PriceDesc, categoryId);
      expect(await api.admin.category.findOne(categoryId)).toMatchSchema(
        Yup.object({
          listingOrderBy: Yup.string().equals([ListingSort.PriceDesc]).required(),
        }),
      );

      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);

      expect(listing.data.listingQuery.listingV1.data[0].title).toBe('Pants');
      expect(listing.data.listingQuery.listingV1.data[1].title).toBe('Sunglasses');
      expect(listing.data.listingQuery.listingV1.data[2].title).toBe('Hat');
    });

    /* await test.step('Create feature and add in product', async () => {
      featureReq = await api.admin.mutation('admin/FeatureGroupCreate', {

        variables: { input: { ...featureInput } },
      });

      featureFindOne = await api.admin.query('admin/FeatureGroupFindOne', {

        variables: {
          findOneId: featureReq.data.featureGroupMutation.create.id,
        },
      });


      const { data } = await api.admin.query<ApiProductQueryFindOneArgs>('admin/ProductQueryFindOne', {

        variables: {
          id: productsIds[0],
        },
      });


      const productWithFeature = await api.admin.mutation('admin/ProductUpdate', {

        variables: {
          input: {
            id: data.productQuery.findOne.id,
            variants: {
              update: [
                {
                  categories: [],
                  id: data.productQuery.findOne.variants[0].id,
                  inListing: true,
                  variantSortIndex: 0,
                  features: [
                    {
                      attributeSortIndex: 0,
                      featureId: featureFindOne.data.featureGroupQuery.findOne.features[0].id,
                      isAttribute: true,
                      isOption: false,
                      optionSortIndex: 0,
                    },
                    {
                      attributeSortIndex: 0,
                      featureId: featureFindOne.data.featureGroupQuery.findOne.features[1].id,
                      isAttribute: true,
                      isOption: false,
                      optionSortIndex: 0,
                    },
                  ],
                },
              ],
            },
          },
        },
      });
    }); */

    // --- Manage Listing / Delete items ---

    //await test.step('Open products drawer and check all products are still shown', async () => { });
    await test.step('Delete one product which is without variants, check that its disappeared', async () => {
      const { data } = await api.admin.mutation('admin/CategoryDeleteProduct', {
        variables: {
          input: {
            categoryId: categoryId,
            productId: productsIds[0],
          },
        },
      });
      expect(data.categoryMutation.deleteProduct).toBe(true);
      const listing = await getListingBySlugAndListingType(categorySlug, ListingType.Manual);
      expect(listing.data.listingQuery.listingV1.data.length).toBe(2);
    });
    /*await test.step('Open next product without variants, remove category, save, close, and check that it disappears', async () => { });
    await test.step('Open next product which is a variant, uncheck InListing, save, check that it disappears', async () => { });
    await test.step('Click close on one of the last 2 products, check that modal says about 2 products to be removed', async () => { });
    await test.step('Click Ok and check that list is now empty', async () => { }); */
  });
});
