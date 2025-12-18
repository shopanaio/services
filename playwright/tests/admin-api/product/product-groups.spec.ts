
import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';
import {
  ApiProduct,
  DimensionUnit,
  EntityStatus,
  ProductGroupPriceType,
  WeightUnit,
} from '@codegen/admin-gql';
import { expect } from '@playwright/test';

test.describe('Product-components API', () => {
  const shippingSettings = {
    weight: 0,
    weightUnit: WeightUnit.Gr,
    width: 0,
    height: 0,
    length: 0,
    dimensionUnit: DimensionUnit.Mm,
  };

  test('Create components', async ({ api }) => {
    let mainProduct: ApiProduct;
    let componentProductWithVariants: ApiProduct;
    let simpleComponentProduct: ApiProduct;
    let productWithGroups: ApiProduct;

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create products', async () => {
      // Create main product (container for groups)
      mainProduct = await api.admin.product.create({
        input: {
          title: 'Test Box',
          slug: randomUUID(),
          status: EntityStatus.Draft,
          variants: {
            create: [
              {
                categories: [],
                inListing: true,
                price: 0,
                stockStatus: 'OUT_OF_STOCK',
                variantSortIndex: 0,
                title: 'Test Box',
                slug: randomUUID(),
                ...shippingSettings,
              },
            ],
          },
        },
      });

      // Create simple component product
      simpleComponentProduct = await api.admin.product.create({
        input: {
          title: 'Test component 2',
          slug: randomUUID(),
          status: EntityStatus.Draft,
          variants: {
            create: [
              {
                categories: [],
                inListing: true,
                price: 0,
                stockStatus: 'OUT_OF_STOCK',
                variantSortIndex: 0,
                title: 'Test component 2',
                slug: randomUUID(),
                ...shippingSettings,
              },
            ],
          },
        },
      });
    });

    await test.step('Create component with variants using options', async () => {
      componentProductWithVariants = await api.admin.product.createWithOptions({
        title: 'Test component 1',
        options: [
          {
            title: 'Size',
            slug: 'size',
            values: ['Large', 'Medium', 'Small'],
          },
        ],
        status: EntityStatus.Draft,
      });

      expect(componentProductWithVariants.variants?.length).toBe(3);
      expect(componentProductWithVariants.variants[0].title).toBe('Large');
      expect(componentProductWithVariants.variants[1].title).toBe('Medium');
      expect(componentProductWithVariants.variants[2].title).toBe('Small');
    });

    await test.step('Creating Component Groups', async () => {
      await test.step('Create 2 component groups in Product Test Box', async () => {
        productWithGroups = await api.admin.product.update({
          input: {
            id: mainProduct.id,
            groups: {
              create: [
                {
                  isMultiple: false,
                  isRequired: true,
                  items: [
                    {
                      variantId: componentProductWithVariants.variants[0].id,
                      sortIndex: 0,
                      priceType: ProductGroupPriceType.Base,
                    },
                    {
                      variantId: componentProductWithVariants.variants[1].id,
                      sortIndex: 1,
                      priceType: ProductGroupPriceType.Base,
                    },
                    {
                      variantId: componentProductWithVariants.variants[2].id,
                      sortIndex: 2,
                      priceType: ProductGroupPriceType.Base,
                    },
                  ],
                  sortIndex: 0,
                  title: 'Group 1',
                },
                {
                  isMultiple: false,
                  isRequired: true,
                  items: [
                    {
                      variantId: simpleComponentProduct.variants[0].id,
                      sortIndex: 0,
                      priceType: ProductGroupPriceType.Base,
                    },
                  ],
                  sortIndex: 1,
                  title: 'Group 2',
                },
              ],
            },
          },
        });

        expect(productWithGroups.groups.length).toBe(2);

        expect(productWithGroups.groups[0].title).toBe('Group 1');
        expect(productWithGroups.groups[0].items.length).toBe(3);

        expect(productWithGroups.groups[1].title).toBe('Group 2');
        expect(productWithGroups.groups[1].items.length).toBe(1);
      });
    });

    await test.step('Deleting the first group and changing the second group', async () => {
      await test.step('Delete Group 1', async () => {
        productWithGroups = await api.admin.product.update({
          input: {
            id: mainProduct.id,
            groups: {
              delete: [productWithGroups.groups[0].id],
            },
          },
        });

        expect(productWithGroups.groups.length).toBe(1);
        expect(productWithGroups.groups[0].title).toBe('Group 2');
        expect(productWithGroups.groups[0].items.length).toBe(1);
      });

      await test.step('For the Group 2, set is required = false', async () => {
        productWithGroups = await api.admin.product.update({
          input: {
            id: mainProduct.id,
            groups: {
              update: [
                {
                  id: productWithGroups.groups[0].id,
                  isRequired: false,
                },
              ],
            },
          },
        });

        expect(productWithGroups.groups[0].title).toBe('Group 2');
        expect(productWithGroups.groups[0].isRequired).toBe(false);
      });
    });

    await test.step('Removing the remaining group', async () => {
      productWithGroups = await api.admin.product.update({
        input: {
          id: mainProduct.id,
          groups: {
            delete: [productWithGroups.groups[0].id],
          },
        },
      });

      expect(productWithGroups.groups.length).toBe(0);
    });
  });
});
