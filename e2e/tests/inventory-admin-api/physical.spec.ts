import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';

test.describe('Physical Attributes API (Dimensions & Weight)', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  async function createProductWithVariant(api: any, title: string) {
    const handle = title.toLowerCase().replace(/\s+/g, '-');
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle,
          inventoryItem: { tracked: true },
        },
      },
    });

    const product = data.catalogMutation.productCreate.product;
    const variant = product?.variants?.edges?.[0]?.node ?? null;

    return {
      product,
      productId: product?.id ?? null,
      revision: product?.revision ?? null,
      variantId: variant?.id ?? null,
    };
  }

  async function setDimensions(
    api: any,
    params: {
      productId: string;
      revision?: number | null;
      variantId: string;
      width: number;
      height: number;
      length: number;
      throwOnError?: boolean;
    },
  ) {
    const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
      variables: {
        productId: params.productId,
        expectedRevision: params.revision,
        variantId: params.variantId,
        width: params.width,
        height: params.height,
        length: params.length,
      },
      throwOnError: params.throwOnError,
    });

    return data.catalogMutation.productUpdate;
  }

  async function setWeight(
    api: any,
    params: {
      productId: string;
      revision?: number | null;
      variantId: string;
      weight: number;
      throwOnError?: boolean;
    },
  ) {
    const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
      variables: {
        productId: params.productId,
        expectedRevision: params.revision,
        variantId: params.variantId,
        weight: params.weight,
      },
      throwOnError: params.throwOnError,
    });

    return data.catalogMutation.productUpdate;
  }

  test.describe('Variant Dimensions', () => {
    test('should set variant dimensions', async ({ api }) => {
      const { product, productId, revision, variantId } = await createProductWithVariant(
        api,
        'Dimensions Test Product',
      );

      expect(product).toBeTruthy();
      expect(productId).toBeTruthy();
      expect(variantId).toBeTruthy();

      const result = await setDimensions(api, {
        productId,
        revision,
        variantId,
        width: 100,
        length: 200,
        height: 50,
      });

      const variant = result.product?.variants?.edges?.[0]?.node;
      expect(result.userErrors).toHaveLength(0);
      expect(variant?.dimensions?.width).toBe(100);
      expect(variant?.dimensions?.length).toBe(200);
      expect(variant?.dimensions?.height).toBe(50);
    });

    test('should update variant dimensions', async ({ api }) => {
      const { productId, revision, variantId } = await createProductWithVariant(
        api,
        'Dimensions Update Test',
      );

      expect(productId).toBeTruthy();
      expect(variantId).toBeTruthy();

      const initial = await setDimensions(api, {
        productId,
        revision,
        variantId,
        width: 100,
        length: 100,
        height: 100,
      });

      const result = await setDimensions(api, {
        productId,
        revision: initial.product?.revision,
        variantId,
        width: 150,
        length: 250,
        height: 75,
      });

      const variant = result.product?.variants?.edges?.[0]?.node;
      expect(result.userErrors).toHaveLength(0);
      expect(variant?.dimensions?.width).toBe(150);
      expect(variant?.dimensions?.length).toBe(250);
      expect(variant?.dimensions?.height).toBe(75);
    });

    test('should return error for non-existent global variant ID', async ({ api }) => {
      const { productId, revision } = await createProductWithVariant(
        api,
        'Dimensions Missing Variant Test',
      );
      const missingVariantId = encodeGlobalId(
        'Variant',
        '00000000-0000-0000-0000-000000000000',
      );

      const result = await setDimensions(api, {
        productId,
        revision,
        variantId: missingVariantId,
        width: 100,
        length: 100,
        height: 100,
        throwOnError: false,
      });

      expect(result.product).toBeTruthy();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Variant Weight', () => {
    test('should set variant weight', async ({ api }) => {
      const { product, productId, revision, variantId } = await createProductWithVariant(
        api,
        'Weight Test Product',
      );

      expect(product).toBeTruthy();
      expect(productId).toBeTruthy();
      expect(variantId).toBeTruthy();

      const result = await setWeight(api, {
        productId,
        revision,
        variantId,
        weight: 500,
      });

      const variant = result.product?.variants?.edges?.[0]?.node;
      expect(result.userErrors).toHaveLength(0);
      expect(variant?.weight?.value).toBe(500);
    });

    test('should update variant weight', async ({ api }) => {
      const { productId, revision, variantId } = await createProductWithVariant(
        api,
        'Weight Update Test',
      );

      expect(productId).toBeTruthy();
      expect(variantId).toBeTruthy();

      const initial = await setWeight(api, {
        productId,
        revision,
        variantId,
        weight: 500,
      });

      const result = await setWeight(api, {
        productId,
        revision: initial.product?.revision,
        variantId,
        weight: 1000,
      });

      const variant = result.product?.variants?.edges?.[0]?.node;
      expect(result.userErrors).toHaveLength(0);
      expect(variant?.weight?.value).toBe(1000);
    });

    test('should return error for non-existent global variant ID', async ({ api }) => {
      const { productId, revision } = await createProductWithVariant(
        api,
        'Weight Missing Variant Test',
      );
      const missingVariantId = encodeGlobalId(
        'Variant',
        '00000000-0000-0000-0000-000000000000',
      );

      const result = await setWeight(api, {
        productId,
        revision,
        variantId: missingVariantId,
        weight: 500,
        throwOnError: false,
      });

      expect(result.product).toBeTruthy();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Combined Physical Attributes', () => {
    test('should set both dimensions and weight on same variant', async ({ api }) => {
      const { productId, revision, variantId } = await createProductWithVariant(
        api,
        'Combined Physical Test',
      );

      expect(productId).toBeTruthy();
      expect(variantId).toBeTruthy();

      const dimensions = await setDimensions(api, {
        productId,
        revision,
        variantId,
        width: 300,
        length: 400,
        height: 200,
      });

      expect(dimensions.userErrors).toHaveLength(0);

      const weight = await setWeight(api, {
        productId,
        revision: dimensions.product?.revision,
        variantId,
        weight: 2500,
      });

      const variant = weight.product?.variants?.edges?.[0]?.node;
      expect(weight.userErrors).toHaveLength(0);
      expect(variant?.weight?.value).toBe(2500);
    });
  });
});
