import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

// Test image URLs (using picsum.photos for reliability)
const TEST_IMAGE_1 = 'https://picsum.photos/seed/test1/200/200';
const TEST_IMAGE_2 = 'https://picsum.photos/seed/test2/200/200';

test.describe('Variant Media API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID
   */
  async function createProductWithVariant(api: any, title = 'Media Test Product') {
    const handle = title.toLowerCase().replace(/\s+/g, '-');
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    const product = data.catalogMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  test.describe('variantUpdateMedia', () => {
    test('should set variant media with single file', async ({ api }) => {
      // Create product with variant
      const { product, variantId } = await createProductWithVariant(api);
      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      // Upload a file using media API
      const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1, 'Test product image');
      expect(file.id).toBeTruthy();

      // Set media on variant
      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file.id],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
      expect(result.variant?.id).toBe(variantId);
    });

    test('should set variant media with multiple files', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api, 'Multi-image Product');

      if (!variantId) {
        test.skip();
        return;
      }

      // Upload multiple files
      const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
      const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);

      expect(file1.id).toBeTruthy();
      expect(file2.id).toBeTruthy();

      // Set media on variant
      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file1.id, file2.id],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
    });

    test('should clear variant media with empty array', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api, 'Clear Media Product');

      if (!variantId) {
        test.skip();
        return;
      }

      // First, add some media
      const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);

      await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file.id],
          },
        },
      });

      // Now clear media
      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
    });

    test('should replace existing media', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api, 'Replace Media Product');

      if (!variantId) {
        test.skip();
        return;
      }

      // First set - file1
      const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);

      await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file1.id],
          },
        },
      });

      // Second set - replace with file2
      const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);

      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file2.id],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      // Upload a file first
      const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);

      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId: '00000000-0000-0000-0000-000000000000',
            fileIds: [file.id],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
      expect(result.variant).toBeNull();
    });

    test('should preserve file order', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api, 'Ordered Media Product');

      if (!variantId) {
        test.skip();
        return;
      }

      // Upload files
      const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
      const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);

      // Set with specific order: file2 first, then file1
      const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
        variables: {
          input: {
            variantId,
            fileIds: [file2.id, file1.id],
          },
        },
      });

      const result = data.catalogMutation.variantUpdateMedia;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
    });
  });
});
