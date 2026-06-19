
import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';
import type {
  ApiProduct } from '@codegen/admin-gql';
import {
  DimensionUnit,
  EntityStatus,
  WeightUnit,
} from '@codegen/admin-gql';
import { expect } from '@playwright/test';
import * as Yup from 'yup';

test.describe('Validation of product options and variants handling', () => {
  const shippingSettings = {
    weight: 0,
    weightUnit: WeightUnit.Gr,
    width: 0,
    height: 0,
    length: 0,
    dimensionUnit: DimensionUnit.Mm,
  };

  test('Comprehensive test', async ({ api }) => {
    let productWithColorOptions: ApiProduct;
    let productWithColorAndSizeOptions: ApiProduct;
    let productWithColorSizeAndMaterialOptions: ApiProduct;

    const productsIds: string[] = [];

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create basic products', async () => {
      const basicProducts = [
        { title: 'Product 1' },
        { title: 'Product 2' },
        { title: 'Product 3' },
      ];

      for (const productData of basicProducts) {
        const product = await api.admin.product.create({
          input: {
            title: productData.title,
            slug: randomUUID(),
            status: EntityStatus.Draft,
            variants: {
              create: [
                {
                  categories: [],
                  inListing: false,
                  price: 0,
                  stockStatus: 'OUT_OF_STOCK',
                  variantSortIndex: 0,
                  title: productData.title,
                  slug: randomUUID(),
                  ...shippingSettings,
                },
              ],
            },
          },
        });
        productsIds.push(product.id);
      }
    });

    await test.step('Creating the first option', async () => {
      await test.step('Add the "Color" option with values: Red, Blue, Green', async () => {
        productWithColorOptions = await api.admin.product.createWithOptions({
          title: 'Product with Color Options',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Green', 'Blue', 'Yellow', 'Black'],
            },
          ],
          status: EntityStatus.Draft,
        });
      });

      await test.step('Expectation: 5 new variants appear ("Red", "Green", "Blue", "Yellow", "Black")', async () => {
        expect(productWithColorOptions.variants?.length).toBe(5);
        expect(productWithColorOptions.variants[0].title).toBe('Red');
        expect(productWithColorOptions.variants[1].title).toBe('Green');
        expect(productWithColorOptions.variants[2].title).toBe('Blue');
        expect(productWithColorOptions.variants[3].title).toBe('Yellow');
        expect(productWithColorOptions.variants[4].title).toBe('Black');
      });
    });

    await test.step('Adding the second option', async () => {
      await test.step('Add the "Size" option with values: M, L', async () => {
        productWithColorAndSizeOptions = await api.admin.product.createWithOptions({
          title: 'Product with Color and Size Options',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Green', 'Blue'],
            },
            {
              title: 'Size',
              slug: 'size',
              values: ['M', 'L'],
            },
          ],
          status: EntityStatus.Draft,
        });
      });

      await test.step('Expectation: 6 total combinations appear (e.g., "Red M", "Red L", etc.)', async () => {
        expect(productWithColorAndSizeOptions.variants?.length).toBe(6);

        expect(productWithColorAndSizeOptions.variants[0].title).toBe('Red M');
        expect(productWithColorAndSizeOptions.variants[1].title).toBe('Red L');
        expect(productWithColorAndSizeOptions.variants[2].title).toBe('Green M');
        expect(productWithColorAndSizeOptions.variants[3].title).toBe('Green L');
        expect(productWithColorAndSizeOptions.variants[4].title).toBe('Blue M');
        expect(productWithColorAndSizeOptions.variants[5].title).toBe('Blue L');
      });
    });

    await test.step('Bulk data update verification', async () => {
      await test.step('Set price to $1000 and status to "In Stock" for all variants', async () => {
        const updatedProduct = await api.admin.product.update({
          input: {
            id: productWithColorAndSizeOptions.id,
            variants: {
              update: productWithColorAndSizeOptions.variants.map((variant) => ({
                id: variant.id,
                price: 100000,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: variant.variantSortIndex || 0,
              })),
            },
          },
        });

        const variantSchema = Yup.object({
          inListing: Yup.boolean().oneOf([true]),
          price: Yup.number().oneOf([100000]).required(),
          stockStatus: Yup.string().oneOf(['IN_STOCK']).required(),
        });

        expect(updatedProduct?.variants?.length).toBe(6);
        updatedProduct.variants.forEach((variant) => {
          expect(variant).toMatchSchema(variantSchema);
        });
      });

      await test.step('Open each variant and set unique SKU, weight, and update the variant title', async () => {
        const product = await api.admin.product.findOne(productWithColorAndSizeOptions.id);

        await api.admin.product.update({
          input: {
            id: productWithColorAndSizeOptions.id,
            variants: {
              update: product.variants.map((variant) => ({
                id: variant.id,
                sku: `sku-${variant.title.toLowerCase().replace(/\s+/g, '-')}`,
                title: `${product.title} ${variant.title}`,
                weight: 450,
              })),
            },
          },
        });
      });
    });

    await test.step('Adding and removing options and values', async () => {
      await test.step('Add the "Material" option with values "Cotton", "Wool"', async () => {
        productWithColorSizeAndMaterialOptions = await api.admin.product.createWithOptions({
          title: 'Product with Color, Size and Material Options',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Green', 'Blue'],
            },
            {
              title: 'Size',
              slug: 'size',
              values: ['M', 'L'],
            },
            {
              title: 'Material',
              slug: 'material',
              values: ['Wool', 'Cotton'],
            },
          ],
          status: EntityStatus.Draft,
        });

        expect(productWithColorSizeAndMaterialOptions?.variants?.length).toBe(12);
      });

      await test.step('Remove the "Size" option by creating new product without it', async () => {
        const productWithoutSize = await api.admin.product.createWithOptions({
          title: 'Product with Color and Material Options (no Size)',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Green', 'Blue'],
            },
            {
              title: 'Material',
              slug: 'material',
              values: ['Wool', 'Cotton'],
            },
          ],
          status: EntityStatus.Draft,
        });

        expect(productWithoutSize?.variants?.length).toBe(6);

        expect(productWithoutSize?.variants[0].title).toBe('Red Wool');
        expect(productWithoutSize?.variants[1].title).toBe('Red Cotton');
        expect(productWithoutSize?.variants[2].title).toBe('Green Wool');
        expect(productWithoutSize?.variants[3].title).toBe('Green Cotton');
        expect(productWithoutSize?.variants[4].title).toBe('Blue Wool');
        expect(productWithoutSize?.variants[5].title).toBe('Blue Cotton');
      });

      await test.step('Add "Yellow" to the "Color" option', async () => {
        const productWithYellow = await api.admin.product.createWithOptions({
          title: 'Product with extended Color and Material Options',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Green', 'Blue', 'Yellow'],
            },
            {
              title: 'Material',
              slug: 'material',
              values: ['Wool', 'Cotton'],
            },
          ],
          status: EntityStatus.Draft,
        });

        expect(productWithYellow?.variants?.length).toBe(8);

        expect(productWithYellow?.variants[0].title).toBe('Red Wool');
        expect(productWithYellow?.variants[1].title).toBe('Red Cotton');
        expect(productWithYellow?.variants[2].title).toBe('Green Wool');
        expect(productWithYellow?.variants[3].title).toBe('Green Cotton');
        expect(productWithYellow?.variants[4].title).toBe('Blue Wool');
        expect(productWithYellow?.variants[5].title).toBe('Blue Cotton');
        expect(productWithYellow?.variants[6].title).toBe('Yellow Wool');
        expect(productWithYellow?.variants[7].title).toBe('Yellow Cotton');
      });

      await test.step('Remove "Green" from the "Color" option', async () => {
        const productWithoutGreen = await api.admin.product.createWithOptions({
          title: 'Product without Green color',
          options: [
            {
              title: 'Color',
              slug: 'color',
              values: ['Red', 'Blue', 'Yellow'],
            },
            {
              title: 'Material',
              slug: 'material',
              values: ['Wool', 'Cotton'],
            },
          ],
          status: EntityStatus.Draft,
          price: 100000,
        });

        expect(productWithoutGreen?.variants?.length).toBe(6);

        expect(productWithoutGreen?.variants[0].title).toBe('Red Wool');
        expect(productWithoutGreen?.variants[1].title).toBe('Red Cotton');
        expect(productWithoutGreen?.variants[2].title).toBe('Blue Wool');
        expect(productWithoutGreen?.variants[3].title).toBe('Blue Cotton');
        expect(productWithoutGreen?.variants[4].title).toBe('Yellow Wool');
        expect(productWithoutGreen?.variants[5].title).toBe('Yellow Cotton');
      });
    });
  });
});
