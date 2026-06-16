import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];

/**
 * Helper to extract raw UUID from a Global ID (base64 encoded gid://shopana/{Type}/{UUID})
 */
function extractUuidFromGlobalId(globalId: string): string {
  try {
    const decoded = Buffer.from(globalId, 'base64').toString('utf-8');
    // Format: gid://shopana/{Type}/{UUID}
    const parts = decoded.split('/');
    return parts[parts.length - 1];
  } catch {
    // If not a valid base64/global ID, return as-is (might already be a UUID)
    return globalId;
  }
}

/**
 * Helper to create a product with default variant
 */
async function createProduct(api: Api, title: string, handle?: string) {
  const productHandle =
    handle ?? `test-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle: productHandle,
      },
    },
  });

  const product = data.catalogMutation.productCreate.product;
  if (!product) {
    throw new Error('Failed to create product');
  }

  const variantEdges = product.variants?.edges ?? [];
  const defaultVariant = variantEdges[0]?.node;

  return {
    productId: product.id as string,
    product,
    variantId: defaultVariant?.id as string,
    revision: product.revision as number,
  };
}

/**
 * Helper to create a product with options and multiple variants
 */
async function createProductWithOptions(api: Api, title: string) {
  const handle = `product-options-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
        options: [
          {
            name: 'Color',
            slug: 'color',
            values: [
              { name: 'Red', slug: 'red' },
              { name: 'Blue', slug: 'blue' },
            ],
          },
          {
            name: 'Size',
            slug: 'size',
            values: [
              { name: 'Small', slug: 's' },
              { name: 'Large', slug: 'l' },
            ],
          },
        ],
        variants: [
          { handle: 'red-s' },
          { handle: 'red-l' },
          { handle: 'blue-s' },
          { handle: 'blue-l' },
        ],
      },
    },
  });

  const product = data.catalogMutation.productCreate.product;
  if (!product) {
    throw new Error('Failed to create product with options');
  }

  const variantEdges = product.variants?.edges ?? [];
  const variants = variantEdges.map((e: { node: { id: string; handle: string } }) => ({
    id: e.node.id,
    handle: e.node.handle,
  }));

  return {
    productId: product.id as string,
    product: {
      ...product,
      options: product.options ?? [],
    },
    variants,
    revision: product.revision as number,
  };
}

/**
 * Helper to create a warehouse
 */
async function createWarehouse(api: Api, code: string, name: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: { input: { code, name, isDefault: false } },
  });

  return data.inventoryMutation.warehouseCreate.warehouse;
}

test.describe('ProductUpdate API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ============================================
  // SUCCESSFUL CASES - Product Fields
  // ============================================

  test.describe('Product Field Updates', () => {
    test('should update product title', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Original Title');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            title: 'Updated Title',
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product).toBeTruthy();
      expect(result.product.title).toBe('Updated Title');
      expect(result.product.revision).toBe(revision + 1);

      // Check operation result
      expect(result.operationResults).toHaveLength(1);
      expect(result.operationResults[0].type).toBe('PRODUCT_UPDATE');
      expect(result.operationResults[0].applied).toBe(true);
    });

    test('should update product handle', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Test Product');

      const newHandle = `updated-handle-${Date.now()}`;
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            handle: newHandle,
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.handle).toBe(newHandle);
    });

    test('should update product description (content)', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Product With Description');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            content: {
              description: {
                text: 'This is the updated description',
                html: '<p>This is the <strong>updated</strong> description</p>',
                json: {
                  blocks: [
                    { type: 'paragraph', data: { text: 'This is the updated description' } },
                  ],
                },
              },
              excerpt: 'Short excerpt for the product',
            },
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.description).toBeTruthy();
      expect(result.product.description.text).toBe('This is the updated description');
      expect(result.product.description.html).toContain('<strong>updated</strong>');
      expect(result.product.excerpt).toBe('Short excerpt for the product');
    });

    test('should update product SEO metadata', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'SEO Test Product');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            seo: {
              seoTitle: 'SEO Optimized Title',
              seoDescription: 'This is an SEO-optimized description for search engines',
            },
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.seo).toBeTruthy();
      expect(result.product.seo.seoTitle).toBe('SEO Optimized Title');
      expect(result.product.seo.seoDescription).toBe(
        'This is an SEO-optimized description for search engines',
      );
    });

    test('should publish product (update status to PUBLISHED)', async ({ api }) => {
      const { productId, revision, product } = await createProduct(api, 'Draft Product');

      // Initially the product should be draft
      expect(product.isPublished).toBe(false);

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            status: 'PUBLISHED',
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.isPublished).toBe(true);
      expect(result.product.publishedAt).toBeTruthy();
    });

    test('should unpublish product (update status to DRAFT)', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Published Product');

      // First publish the product
      const { data: publishData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { status: 'PUBLISHED' },
        },
      });

      const newRevision = publishData.catalogMutation.productUpdate.product.revision;

      // Then unpublish it
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: { status: 'DRAFT' },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.isPublished).toBe(false);
    });

    test('should update multiple product fields at once', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Multi-field Product');

      const newHandle = `multi-field-${Date.now()}`;
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            title: 'Updated Multi-field Product',
            handle: newHandle,
            content: {
              excerpt: 'New excerpt',
            },
            seo: {
              seoTitle: 'Multi-field SEO Title',
            },
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.title).toBe('Updated Multi-field Product');
      expect(result.product.handle).toBe(newHandle);
      expect(result.product.excerpt).toBe('New excerpt');
      expect(result.product.seo.seoTitle).toBe('Multi-field SEO Title');
    });
  });

  // ============================================
  // SUCCESSFUL CASES - Variant Fields
  // ============================================

  test.describe('Variant Field Updates', () => {
    test('should update variant pricing', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Pricing Test Product');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                pricing: {
                  currency: 'UAH',
                  amountMinor: '10000', // 100.00 UAH
                  compareAtMinor: '12000', // 120.00 UAH (original price)
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.price).toBeTruthy();
      expect(updatedVariant.price.currency).toBe('UAH');
      expect(updatedVariant.price.amountMinor).toBe(10000);
      expect(updatedVariant.price.compareAtMinor).toBe(12000);

      // Check operation results
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(true);
    });

    test('should update variant inventory (stock, SKU, weight)', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Inventory Test Product');

      // Create warehouse first
      const warehouseCode = `WH-INV-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Inventory Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                inventory: {
                  warehouseId: warehouse.id,
                  onHand: 100,
                  unavailable: 5,
                  sku: 'SKU-TEST-001',
                  weight: 500, // 500 grams
                  unitCostMinor: '5000', // 50.00 UAH cost
                  costCurrency: 'UAH',
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.inventoryItem).toBeTruthy();
      expect(updatedVariant.inventoryItem.sku).toBe('SKU-TEST-001');
      expect(updatedVariant.inventoryItem.weight).toBeTruthy();
      expect(updatedVariant.inventoryItem.weight.weightGrams).toBe(500);

      // Stock is an array - find the stock record for our warehouse
      const stockRecord = updatedVariant.inventoryItem.stock.find(
        (s: { warehouse: { code: string } }) => s.warehouse.code === warehouseCode,
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(100);

      expect(updatedVariant.inventoryItem.unitCost).toBeTruthy();
      expect(updatedVariant.inventoryItem.unitCost.amountMinor).toBe(5000);
      expect(updatedVariant.inventoryItem.unitCost.currency).toBe('UAH');
    });

    test('should update variant dimensions', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(
        api,
        'Dimensions Test Product',
      );

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                dimensions: {
                  width: 100, // mm
                  height: 50, // mm
                  length: 200, // mm
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.inventoryItem).toBeTruthy();
      expect(updatedVariant.inventoryItem.dimensions).toBeTruthy();
      expect(updatedVariant.inventoryItem.dimensions.widthMm).toBe(100);
      expect(updatedVariant.inventoryItem.dimensions.heightMm).toBe(50);
      expect(updatedVariant.inventoryItem.dimensions.lengthMm).toBe(200);
    });

    test('should update multiple variants at once', async ({ api }) => {
      const { productId, variants, revision } = await createProductWithOptions(
        api,
        'Multi-Variant Product',
      );

      // Find variants by handle to avoid ordering issues
      const redSVariant = variants.find((v: { handle: string }) => v.handle === 'red-s');
      const redLVariant = variants.find((v: { handle: string }) => v.handle === 'red-l');

      if (!redSVariant || !redLVariant) {
        throw new Error('Expected variants not found');
      }

      const warehouseCode = `WH-MULTI-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Multi-Variant Warehouse');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: redSVariant.id,
                pricing: { currency: 'UAH', amountMinor: '10000' },
                inventory: { warehouseId: warehouse.id, onHand: 50, sku: 'RED-S-001' },
              },
              {
                variantId: redLVariant.id,
                pricing: { currency: 'UAH', amountMinor: '11000' },
                inventory: { warehouseId: warehouse.id, onHand: 30, sku: 'RED-L-001' },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Should have operation results for each variant
      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOps).toHaveLength(2);
      expect(variantOps.every((op: { applied: boolean }) => op.applied)).toBe(true);

      // Verify variants were updated
      const updatedVariants = result.product.variants.edges;
      const redS = updatedVariants.find(
        (e: { node: { handle: string } }) => e.node.handle === 'red-s',
      )?.node;
      const redL = updatedVariants.find(
        (e: { node: { handle: string } }) => e.node.handle === 'red-l',
      )?.node;

      expect(redS?.inventoryItem?.sku).toBe('RED-S-001');
      expect(redS?.price?.amountMinor).toBe(10000);
      expect(redL?.inventoryItem?.sku).toBe('RED-L-001');
      expect(redL?.price?.amountMinor).toBe(11000);
    });

    test('should update product and variants in single request', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(
        api,
        'Combined Update Product',
      );

      const warehouseCode = `WH-COMBINED-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Combined Test Warehouse');

      const newHandle = `combined-update-${Date.now()}`;
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            title: 'Updated Combined Product',
            handle: newHandle,
            seo: { seoTitle: 'Combined SEO' },
            variants: [
              {
                variantId,
                pricing: { currency: 'UAH', amountMinor: '15000' },
                inventory: { warehouseId: warehouse.id, onHand: 75, sku: 'COMBINED-001' },
                dimensions: { width: 150, height: 100, length: 250 },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Check product fields
      expect(result.product.title).toBe('Updated Combined Product');
      expect(result.product.handle).toBe(newHandle);
      expect(result.product.seo.seoTitle).toBe('Combined SEO');

      // Check variant fields
      const variant = result.product.variants.edges[0].node;
      expect(variant.inventoryItem.sku).toBe('COMBINED-001');
      expect(variant.price.amountMinor).toBe(15000);

      // Find stock record for our warehouse
      const stockRecord = variant.inventoryItem.stock.find(
        (s: { warehouse: { code: string } }) => s.warehouse.code === warehouseCode,
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(75);

      expect(variant.inventoryItem.dimensions.widthMm).toBe(150);

      // Check operation results (should have both product and variant ops)
      expect(result.operationResults).toHaveLength(2);
      const productOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'PRODUCT_UPDATE',
      );
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(productOp?.applied).toBe(true);
      expect(variantOp?.applied).toBe(true);
    });
  });

  // ============================================
  // OPTIMISTIC LOCKING (Revision Handling)
  // ============================================

  test.describe('Optimistic Locking', () => {
    test('should succeed when expectedRevision matches current revision', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Revision Match Product');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: 'Updated with correct revision' },
        },
      });

      expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(data.catalogMutation.productUpdate.product.revision).toBe(revision + 1);
    });

    test('should fail with REVISION_CONFLICT when expectedRevision does not match', async ({
      api,
    }) => {
      const { productId } = await createProduct(api, 'Revision Conflict Product');

      // Use wrong revision number
      const wrongRevision = 999;
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: wrongRevision,
          operations: { title: 'Should fail' },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;
      expect(result.product).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('REVISION_CONFLICT');
    });

    test('should succeed without expectedRevision (no optimistic locking)', async ({ api }) => {
      const { productId } = await createProduct(api, 'No Locking Product');

      // Update without expectedRevision
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          operations: { title: 'Updated without locking' },
        },
      });

      expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(data.catalogMutation.productUpdate.product.title).toBe('Updated without locking');
    });

    test('should handle concurrent updates correctly', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Concurrent Update Product');

      // First update succeeds
      const { data: firstUpdate } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: 'First Update' },
        },
      });

      expect(firstUpdate.catalogMutation.productUpdate.userErrors).toHaveLength(0);

      // Second update with old revision fails
      const { data: secondUpdate } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision, // Old revision
          operations: { title: 'Second Update' },
        },
        throwOnError: false,
      });

      expect(secondUpdate.catalogMutation.productUpdate.userErrors.length).toBeGreaterThan(0);
      expect(secondUpdate.catalogMutation.productUpdate.userErrors[0].code).toBe(
        'REVISION_CONFLICT',
      );
    });
  });

  // ============================================
  // EDGE CASES AND ERROR HANDLING
  // ============================================

  test.describe('Edge Cases and Error Handling', () => {
    test('should return NOT_FOUND for non-existent product', async ({ api }) => {
      const fakeProductId = '00000000-0000-0000-0000-000000000000';

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId: fakeProductId,
          operations: { title: 'Should fail' },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;
      expect(result.product).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });

    test('should return error for non-existent variant', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Fake Variant Product');
      const fakeVariantId = '00000000-0000-0000-0000-000000000000';

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: fakeVariantId,
                pricing: { currency: 'UAH', amountMinor: '10000' },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Product should still exist but variant update should fail
      expect(result.product).toBeTruthy();

      // Check variant operation failed
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors.length).toBeGreaterThan(0);
      expect(variantOp.errors[0].code).toBe('NOT_FOUND');
    });

    test('should return error for non-existent warehouse in inventory update', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Fake Warehouse Product');
      const fakeWarehouseId = '00000000-0000-0000-0000-000000000000';

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                inventory: {
                  warehouseId: fakeWarehouseId,
                  onHand: 100,
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Check that variant operation failed
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
    });

    test('should handle partial failure (some operations succeed, others fail)', async ({
      api,
    }) => {
      const { productId, variantId, revision } = await createProduct(
        api,
        'Partial Failure Product',
      );
      const fakeVariantId = '00000000-0000-0000-0000-000000000000';

      const warehouseCode = `WH-PARTIAL-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Partial Failure Warehouse');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            title: 'Partial Failure Title', // Should succeed
            variants: [
              {
                variantId, // Real variant - should succeed
                inventory: { warehouseId: warehouse.id, onHand: 50, sku: 'PARTIAL-OK' },
              },
              {
                variantId: fakeVariantId, // Fake variant - should fail
                pricing: { currency: 'UAH', amountMinor: '10000' },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Product should be updated
      expect(result.product).toBeTruthy();
      expect(result.product.title).toBe('Partial Failure Title');

      // Check operation results
      const productOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'PRODUCT_UPDATE',
      );
      expect(productOp?.applied).toBe(true);

      // One variant should succeed, one should fail
      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOps).toHaveLength(2);

      const successOp = variantOps.find((op: { applied: boolean }) => op.applied);
      const failOp = variantOps.find((op: { applied: boolean }) => !op.applied);

      expect(successOp).toBeTruthy();
      expect(failOp).toBeTruthy();
      expect(failOp.errors.length).toBeGreaterThan(0);

      // Verify successful variant was actually updated
      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.inventoryItem.sku).toBe('PARTIAL-OK');
    });

    test('should handle empty operations (no-op)', async ({ api }) => {
      const { productId, revision, product } = await createProduct(api, 'No-Op Product');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {}, // Empty operations
        },
      });

      const result = data.catalogMutation.productUpdate;

      // Should succeed but with no changes (revision still incremented due to locking)
      expect(result.userErrors).toHaveLength(0);
      expect(result.product).toBeTruthy();
      expect(result.product.title).toBe(product.title); // Unchanged
    });

    test('should handle update with same values (idempotent)', async ({ api }) => {
      const originalTitle = 'Idempotent Product';
      const { productId, revision } = await createProduct(api, originalTitle);

      // Update with same title
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: originalTitle }, // Same value
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.title).toBe(originalTitle);
    });

    test('should handle multiple pricing updates in different currencies', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Multi-Currency Product');

      // First set UAH price
      const { data: uahUpdate } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                pricing: { currency: 'UAH', amountMinor: '10000' },
              },
            ],
          },
        },
      });

      expect(uahUpdate.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      const newRevision = uahUpdate.catalogMutation.productUpdate.product.revision;

      // Then set USD price
      const { data: usdUpdate } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            variants: [
              {
                variantId,
                pricing: { currency: 'USD', amountMinor: '2500' }, // $25.00
              },
            ],
          },
        },
      });

      expect(usdUpdate.catalogMutation.productUpdate.userErrors).toHaveLength(0);
    });

    test('should increment revision on each update', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Revision Increment Product');

      // First update
      const { data: first } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: 'First' },
        },
      });
      expect(first.catalogMutation.productUpdate.product.revision).toBe(revision + 1);

      // Second update
      const { data: second } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision + 1,
          operations: { title: 'Second' },
        },
      });
      expect(second.catalogMutation.productUpdate.product.revision).toBe(revision + 2);

      // Third update
      const { data: third } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision + 2,
          operations: { title: 'Third' },
        },
      });
      expect(third.catalogMutation.productUpdate.product.revision).toBe(revision + 3);
    });

    test('should clear excerpt when set to empty string', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Clear Excerpt Product');

      // First set excerpt
      const { data: setData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            content: { excerpt: 'Initial excerpt' },
          },
        },
      });

      expect(setData.catalogMutation.productUpdate.product.excerpt).toBe('Initial excerpt');
      const newRevision = setData.catalogMutation.productUpdate.product.revision;

      // Then clear it by setting to empty string
      const { data: clearData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            content: { excerpt: '' },
          },
        },
      });

      expect(clearData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      // Excerpt should be empty or null
      expect(clearData.catalogMutation.productUpdate.product.excerpt || '').toBe('');
    });
  });

  // ============================================
  // MEDIA UPDATES
  // ============================================

  test.describe('Media Updates', () => {
    /**
     * Helper to create a test file using external URL provider (no actual upload needed)
     */
    async function createTestFile(api: Api, name: string): Promise<string> {
      const externalId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'URL',
            externalId,
            url: `https://picsum.photos/seed/${externalId}/200/200`,
            originalName: name,
          },
        },
      });

      const file = data.mediaMutation.fileCreateExternal.file;
      if (!file) {
        throw new Error('Failed to create external file');
      }

      return file.id;
    }

    test('should update variant media', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Variant Media Product');

      // Upload test files
      const fileId1 = await createTestFile(api, 'variant-image-1.png');
      const fileId2 = await createTestFile(api, 'variant-image-2.png');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                media: {
                  fileIds: [fileId1, fileId2],
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.media).toHaveLength(2);
      const mediaFileIds = updatedVariant.media.map((m: { file: { id: string } }) => m.file.id);
      expect(mediaFileIds).toContain(extractUuidFromGlobalId(fileId1));
      expect(mediaFileIds).toContain(extractUuidFromGlobalId(fileId2));

      // Check operation result
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(true);
    });

    test('should clear variant media when setting empty array', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Clear Media Product');

      // First add some media
      const fileId = await createTestFile(api, 'temp-image.png');

      const { data: addData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [{ variantId, media: { fileIds: [fileId] } }],
          },
        },
      });

      const newRevision = addData.catalogMutation.productUpdate.product.revision;
      expect(
        addData.catalogMutation.productUpdate.product.variants.edges[0].node.media,
      ).toHaveLength(1);

      // Then clear media
      const { data: clearData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            variants: [{ variantId, media: { fileIds: [] } }],
          },
        },
      });

      expect(clearData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(
        clearData.catalogMutation.productUpdate.product.variants.edges[0].node.media,
      ).toHaveLength(0);
    });

    test('should handle media update with no changes (idempotent)', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(
        api,
        'Idempotent Media Product',
      );

      const fileId = await createTestFile(api, 'idempotent-image.png');

      // First update
      const { data: firstData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [{ variantId, media: { fileIds: [fileId] } }],
          },
        },
      });

      const newRevision = firstData.catalogMutation.productUpdate.product.revision;

      // Second update with same media
      const { data: secondData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            variants: [{ variantId, media: { fileIds: [fileId] } }],
          },
        },
      });

      expect(secondData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(
        secondData.catalogMutation.productUpdate.product.variants.edges[0].node.media,
      ).toHaveLength(1);
    });

    test('should reorder variant media', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Reorder Media Product');

      const fileId1 = await createTestFile(api, 'order-image-1.png');
      const fileId2 = await createTestFile(api, 'order-image-2.png');

      // Set media in order [1, 2]
      const { data: firstData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [{ variantId, media: { fileIds: [fileId1, fileId2] } }],
          },
        },
      });

      const newRevision = firstData.catalogMutation.productUpdate.product.revision;

      // Reorder to [2, 1]
      const { data: reorderData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            variants: [{ variantId, media: { fileIds: [fileId2, fileId1] } }],
          },
        },
      });

      expect(reorderData.catalogMutation.productUpdate.userErrors).toHaveLength(0);

      const media = reorderData.catalogMutation.productUpdate.product.variants.edges[0].node.media;
      expect(media).toHaveLength(2);

      // Verify order by sortIndex
      const sorted = [...media].sort(
        (a: { sortIndex: number }, b: { sortIndex: number }) => a.sortIndex - b.sortIndex,
      );
      expect(sorted[0].file.id).toBe(extractUuidFromGlobalId(fileId2));
      expect(sorted[1].file.id).toBe(extractUuidFromGlobalId(fileId1));
    });
  });

  // ============================================
  // PRODUCT-LEVEL MEDIA UPDATES
  // ============================================

  test.describe.skip('Product-Level Media Updates', () => {
    /**
     * Helper to create a test file using external URL provider (no actual upload needed)
     */
    async function createTestFile(api: Api, name: string): Promise<string> {
      const externalId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data } = await api.admin.mutation('media-api/FileCreateExternal', {
        variables: {
          input: {
            provider: 'URL',
            externalId,
            url: `https://picsum.photos/seed/${externalId}/200/200`,
            originalName: name,
          },
        },
      });

      const file = data.mediaMutation.fileCreateExternal.file;
      if (!file) {
        throw new Error('Failed to create external file');
      }

      return file.id;
    }

    test('should add product-level media', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Product Media Test');

      // Create test files
      const fileId1 = await createTestFile(api, 'product-image-1.png');
      const fileId2 = await createTestFile(api, 'product-image-2.png');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            media: {
              fileIds: [fileId1, fileId2],
            },
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.media).toHaveLength(2);

      const mediaFileIds = result.product.media.map((m: { file: { id: string } }) => m.file.id);
      expect(mediaFileIds).toContain(extractUuidFromGlobalId(fileId1));
      expect(mediaFileIds).toContain(extractUuidFromGlobalId(fileId2));

      // Check operation result
      const productOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'PRODUCT_UPDATE',
      );
      expect(productOp).toBeTruthy();
      expect(productOp.applied).toBe(true);
    });

    test('should clear product-level media when setting empty array', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Clear Product Media');

      // First add media
      const fileId = await createTestFile(api, 'temp-product-image.png');

      const { data: addData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            media: { fileIds: [fileId] },
          },
        },
      });

      const newRevision = addData.catalogMutation.productUpdate.product.revision;
      expect(addData.catalogMutation.productUpdate.product.media).toHaveLength(1);

      // Then clear media
      const { data: clearData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            media: { fileIds: [] },
          },
        },
      });

      expect(clearData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(clearData.catalogMutation.productUpdate.product.media).toHaveLength(0);
    });

    test('should reorder product-level media', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Reorder Product Media');

      const fileId1 = await createTestFile(api, 'order-product-1.png');
      const fileId2 = await createTestFile(api, 'order-product-2.png');
      const fileId3 = await createTestFile(api, 'order-product-3.png');

      // Set media in order [1, 2, 3]
      const { data: firstData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            media: { fileIds: [fileId1, fileId2, fileId3] },
          },
        },
      });

      const newRevision = firstData.catalogMutation.productUpdate.product.revision;

      // Reorder to [3, 1, 2]
      const { data: reorderData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            media: { fileIds: [fileId3, fileId1, fileId2] },
          },
        },
      });

      expect(reorderData.catalogMutation.productUpdate.userErrors).toHaveLength(0);

      const media = reorderData.catalogMutation.productUpdate.product.media;
      expect(media).toHaveLength(3);

      // Verify order by sortIndex
      const sorted = [...media].sort(
        (a: { sortIndex: number }, b: { sortIndex: number }) => a.sortIndex - b.sortIndex,
      );
      expect(sorted[0].file.id).toBe(extractUuidFromGlobalId(fileId3));
      expect(sorted[1].file.id).toBe(extractUuidFromGlobalId(fileId1));
      expect(sorted[2].file.id).toBe(extractUuidFromGlobalId(fileId2));
    });

    test('should update product media and variant media simultaneously', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Combined Media Product');

      const productFileId = await createTestFile(api, 'product-main.png');
      const variantFileId = await createTestFile(api, 'variant-main.png');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            media: { fileIds: [productFileId] },
            variants: [
              {
                variantId,
                media: { fileIds: [variantFileId] },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Check product media
      expect(result.product.media).toHaveLength(1);
      expect(result.product.media[0].file.id).toBe(extractUuidFromGlobalId(productFileId));

      // Check variant media
      const variant = result.product.variants.edges[0].node;
      expect(variant.media).toHaveLength(1);
      expect(variant.media[0].file.id).toBe(extractUuidFromGlobalId(variantFileId));
    });

    test('should handle idempotent product media update', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Idempotent Product Media');

      const fileId = await createTestFile(api, 'idempotent-product.png');

      // First update
      const { data: firstData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            media: { fileIds: [fileId] },
          },
        },
      });

      const newRevision = firstData.catalogMutation.productUpdate.product.revision;

      // Second update with same media
      const { data: secondData } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: {
            media: { fileIds: [fileId] },
          },
        },
      });

      expect(secondData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
      expect(secondData.catalogMutation.productUpdate.product.media).toHaveLength(1);
    });
  });

  // ============================================
  // VARIANT OPTIONS UPDATES
  // ============================================

  test.describe('Variant Options Updates', () => {
    test('should update variant options', async ({ api }) => {
      // Create product with only 2 variants (leaving blue-l available)
      const handle = `product-options-update-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: createData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: 'Options Update Product',
            handle,
            options: [
              {
                name: 'Color',
                slug: 'color',
                values: [
                  { name: 'Red', slug: 'red' },
                  { name: 'Blue', slug: 'blue' },
                ],
              },
              {
                name: 'Size',
                slug: 'size',
                values: [
                  { name: 'Small', slug: 's' },
                  { name: 'Large', slug: 'l' },
                ],
              },
            ],
            variants: [
              { handle: 'red-s' },
              { handle: 'red-l' },
              // blue-l is intentionally not created
            ],
          },
        },
      });

      const product = createData.catalogMutation.productCreate.product;
      if (!product) {
        throw new Error('Failed to create product');
      }
      const productId = product.id;
      const revision = product.revision;
      const variantEdges = product.variants?.edges ?? [];
      const variants = variantEdges.map((e: { node: { id: string; handle: string } }) => ({
        id: e.node.id,
        handle: e.node.handle,
      }));

      // Get product options
      const options = product.options;
      expect(options).toHaveLength(2);

      const colorOption = options.find((o: { slug: string }) => o.slug === 'color');
      const sizeOption = options.find((o: { slug: string }) => o.slug === 'size');

      if (!colorOption || !sizeOption) {
        throw new Error('Expected options not found');
      }

      // Find option values
      const blueValue = colorOption.values.find((v: { slug: string }) => v.slug === 'blue');
      const largeValue = sizeOption.values.find((v: { slug: string }) => v.slug === 'l');

      if (!blueValue || !largeValue) {
        throw new Error('Expected option values not found');
      }

      // Get the red-s variant
      const redSVariant = variants.find((v: { handle: string }) => v.handle === 'red-s');
      if (!redSVariant) {
        throw new Error('red-s variant not found');
      }

      // Update red-s to blue-l (which doesn't exist yet)
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: redSVariant.id,
                options: {
                  set: [
                    { optionId: colorOption.id, optionValueId: blueValue.id },
                    { optionId: sizeOption.id, optionValueId: largeValue.id },
                  ],
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Find the updated variant
      const updatedVariant = result.product.variants.edges.find(
        (e: { node: { id: string } }) => e.node.id === redSVariant.id,
      )?.node;

      expect(updatedVariant).toBeTruthy();
      // Handle should be updated based on new options
      expect(updatedVariant.selectedOptions).toHaveLength(2);

      // Verify option values
      const selectedOptionIds = updatedVariant.selectedOptions.map(
        (o: { optionValueId: string }) => o.optionValueId,
      );
      expect(selectedOptionIds).toContain(blueValue.id);
      expect(selectedOptionIds).toContain(largeValue.id);
    });

    test('should error on invalid optionId (not belonging to product)', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Invalid Option Product');
      const fakeOptionId = '00000000-0000-0000-0000-000000000000';
      const fakeValueId = '00000000-0000-0000-0000-000000000001';

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                options: {
                  set: [{ optionId: fakeOptionId, optionValueId: fakeValueId }],
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Variant operation should fail
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors.length).toBeGreaterThan(0);
      expect(variantOp.errors[0].code).toBe('INVALID_OPTION');
    });

    test('should error on optionValueId not belonging to option', async ({ api }) => {
      const { productId, variants, product, revision } = await createProductWithOptions(
        api,
        'Wrong Value Product',
      );

      const colorOption = product.options.find((o: { slug: string }) => o.slug === 'color');
      const sizeOption = product.options.find((o: { slug: string }) => o.slug === 'size');

      if (!colorOption || !sizeOption) {
        throw new Error('Options not found');
      }

      // Get a size value (e.g., 'l')
      const sizeValue = sizeOption.values[0];

      const variant = variants[0];

      // Try to assign a size value to the color option
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: variant.id,
                options: {
                  set: [{ optionId: colorOption.id, optionValueId: sizeValue.id }],
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors[0].code).toBe('INVALID_OPTION_VALUE');
    });

    test('should error on duplicate optionId in same request', async ({ api }) => {
      const { productId, variants, product, revision } = await createProductWithOptions(
        api,
        'Duplicate Option Product',
      );

      const colorOption = product.options.find((o: { slug: string }) => o.slug === 'color');
      if (!colorOption) {
        throw new Error('Color option not found');
      }

      const redValue = colorOption.values.find((v: { slug: string }) => v.slug === 'red');
      const blueValue = colorOption.values.find((v: { slug: string }) => v.slug === 'blue');

      if (!redValue || !blueValue) {
        throw new Error('Color values not found');
      }

      const variant = variants[0];

      // Try to set same option twice with different values
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: variant.id,
                options: {
                  set: [
                    { optionId: colorOption.id, optionValueId: redValue.id },
                    { optionId: colorOption.id, optionValueId: blueValue.id }, // Duplicate!
                  ],
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors[0].code).toBe('DUPLICATE_OPTION');
    });

    test('should error when clearing options on non-default variant', async ({ api }) => {
      const { productId, variants, revision } = await createProductWithOptions(
        api,
        'Clear Options Product',
      );

      const variant = variants[0]; // Non-default variant

      // Try to clear all options on a non-default variant
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: variant.id,
                options: {
                  set: [],
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Should have an error - non-default variants must have options
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      if (!variantOp) {
        throw new Error('VARIANT_UPDATE operation not found');
      }
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors[0].code).toBe('INVALID_OPTIONS');
    });

    test('should error when updating variant options to match another existing variant (cross-variant conflict)', async ({
      api,
    }) => {
      // Create product with all 4 variant combinations (red-s, red-l, blue-s, blue-l)
      const { productId, variants, product, revision } = await createProductWithOptions(
        api,
        'Cross-Variant Conflict Product',
      );

      const colorOption = product.options.find((o: { slug: string }) => o.slug === 'color');
      const sizeOption = product.options.find((o: { slug: string }) => o.slug === 'size');

      if (!colorOption || !sizeOption) {
        throw new Error('Options not found');
      }

      // Get option values
      const redValue = colorOption.values.find((v: { slug: string }) => v.slug === 'red');
      const blueValue = colorOption.values.find((v: { slug: string }) => v.slug === 'blue');
      const smallValue = sizeOption.values.find((v: { slug: string }) => v.slug === 's');
      const largeValue = sizeOption.values.find((v: { slug: string }) => v.slug === 'l');

      if (!redValue || !blueValue || !smallValue || !largeValue) {
        throw new Error('Option values not found');
      }

      // Find red-s and blue-l variants
      const redSVariant = variants.find((v: { handle: string }) => v.handle === 'red-s');
      const blueLVariant = variants.find((v: { handle: string }) => v.handle === 'blue-l');

      if (!redSVariant || !blueLVariant) {
        throw new Error('Variants not found');
      }

      // Try to update red-s to have blue-l's option combination (which already exists)
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: redSVariant.id,
                options: {
                  set: [
                    { optionId: colorOption.id, optionValueId: blueValue.id },
                    { optionId: sizeOption.id, optionValueId: largeValue.id },
                  ],
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Should fail with duplicate option combination error
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
      expect(variantOp.errors.length).toBeGreaterThan(0);
      expect(variantOp.errors[0].code).toBe('DUPLICATE_OPTIONS');
    });

    test('should error when two variants in same request end up with same option combination', async ({
      api,
    }) => {
      // Create product with 2 variants that have different options
      const handle = `cross-conflict-batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: createData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: 'Batch Cross-Variant Conflict',
            handle,
            options: [
              {
                name: 'Color',
                slug: 'color',
                values: [
                  { name: 'Red', slug: 'red' },
                  { name: 'Blue', slug: 'blue' },
                ],
              },
            ],
            variants: [{ handle: 'red' }, { handle: 'blue' }],
          },
        },
      });

      const createdProduct = createData.catalogMutation.productCreate.product;
      if (!createdProduct) {
        throw new Error('Failed to create product');
      }

      const productId = createdProduct.id;
      const revision = createdProduct.revision;
      const variantEdges = createdProduct.variants?.edges ?? [];
      const createdVariants = variantEdges.map((e: { node: { id: string; handle: string } }) => ({
        id: e.node.id,
        handle: e.node.handle,
      }));

      const colorOption = createdProduct.options.find((o: { slug: string }) => o.slug === 'color');
      if (!colorOption) {
        throw new Error('Color option not found');
      }

      const redValue = colorOption.values.find((v: { slug: string }) => v.slug === 'red');
      if (!redValue) {
        throw new Error('Red value not found');
      }

      const redVariant = createdVariants.find((v: { handle: string }) => v.handle === 'red');
      const blueVariant = createdVariants.find((v: { handle: string }) => v.handle === 'blue');

      if (!redVariant || !blueVariant) {
        throw new Error('Variants not found');
      }

      // Try to update both variants to have the same "red" option in a single request
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: redVariant.id,
                options: {
                  set: [{ optionId: colorOption.id, optionValueId: redValue.id }],
                },
              },
              {
                variantId: blueVariant.id,
                options: {
                  set: [{ optionId: colorOption.id, optionValueId: redValue.id }], // Same as red!
                },
              },
            ],
          },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // At least one variant operation should fail
      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      const failedOp = variantOps.find((op: { applied: boolean }) => !op.applied);
      if (!failedOp) {
        throw new Error('Expected a failed variant operation');
      }
      expect(failedOp.errors[0].code).toBe('DUPLICATE_OPTIONS');
    });

    test('should allow swapping option combinations between two variants in same request', async ({
      api,
    }) => {
      // Create product with 2 variants
      const handle = `swap-options-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: createData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: 'Swap Options Product',
            handle,
            options: [
              {
                name: 'Color',
                slug: 'color',
                values: [
                  { name: 'Red', slug: 'red' },
                  { name: 'Blue', slug: 'blue' },
                ],
              },
            ],
            variants: [{ handle: 'red' }, { handle: 'blue' }],
          },
        },
      });

      const createdProduct = createData.catalogMutation.productCreate.product;
      if (!createdProduct) {
        throw new Error('Failed to create product');
      }

      const productId = createdProduct.id;
      const revision = createdProduct.revision;
      const variantEdges = createdProduct.variants?.edges ?? [];
      const createdVariants = variantEdges.map((e: { node: { id: string; handle: string } }) => ({
        id: e.node.id,
        handle: e.node.handle,
      }));

      const colorOption = createdProduct.options.find((o: { slug: string }) => o.slug === 'color');
      if (!colorOption) {
        throw new Error('Color option not found');
      }

      const redValue = colorOption.values.find((v: { slug: string }) => v.slug === 'red');
      const blueValue = colorOption.values.find((v: { slug: string }) => v.slug === 'blue');

      if (!redValue || !blueValue) {
        throw new Error('Color values not found');
      }

      const redVariant = createdVariants.find((v: { handle: string }) => v.handle === 'red');
      const blueVariant = createdVariants.find((v: { handle: string }) => v.handle === 'blue');

      if (!redVariant || !blueVariant) {
        throw new Error('Variants not found');
      }

      // Swap: red variant becomes blue, blue variant becomes red
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId: redVariant.id,
                options: {
                  set: [{ optionId: colorOption.id, optionValueId: blueValue.id }],
                },
              },
              {
                variantId: blueVariant.id,
                options: {
                  set: [{ optionId: colorOption.id, optionValueId: redValue.id }],
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      // Both operations should succeed (swapping is allowed)
      expect(result.userErrors).toHaveLength(0);

      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE',
      );
      expect(variantOps).toHaveLength(2);
      expect(variantOps.every((op: { applied: boolean }) => op.applied)).toBe(true);

      // Verify the swap happened
      expect(result.product).toBeTruthy();
      const updatedVariants = result.product.variants.edges;
      const formerRedVariant = updatedVariants.find(
        (e: { node: { id: string } }) => e.node.id === redVariant.id,
      )?.node;
      const formerBlueVariant = updatedVariants.find(
        (e: { node: { id: string } }) => e.node.id === blueVariant.id,
      )?.node;

      if (!formerRedVariant || !formerBlueVariant) {
        throw new Error('Updated variants not found');
      }

      expect(formerRedVariant.selectedOptions[0].optionValueId).toBe(blueValue.id);
      expect(formerBlueVariant.selectedOptions[0].optionValueId).toBe(redValue.id);
    });
  });

  // ============================================
  // TIMESTAMP VERIFICATION
  // ============================================

  test.describe('Timestamp Updates', () => {
    test('should update updatedAt timestamp on product update', async ({ api }) => {
      const { productId, revision, product } = await createProduct(api, 'Timestamp Product');
      const originalUpdatedAt = product.updatedAt;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 50));

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: 'Updated Timestamp Product' },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.updatedAt).toBeTruthy();
      expect(new Date(result.product.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime(),
      );
    });

    test('should set publishedAt when status changes to PUBLISHED', async ({ api }) => {
      const { productId, revision, product } = await createProduct(api, 'Publish Time Product');

      // Initially should not have publishedAt
      expect(product.publishedAt).toBeNull();

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { status: 'PUBLISHED' },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.publishedAt).toBeTruthy();
      expect(result.product.isPublished).toBe(true);

      // publishedAt should be a valid date
      const publishedAt = new Date(result.product.publishedAt);
      expect(publishedAt.getTime()).toBeGreaterThan(0);
    });
  });

  // ============================================
  // INPUT VALIDATION
  // ============================================

  test.describe('Input Validation', () => {
    test('should reject duplicate product handle', async ({ api }) => {
      // Create first product with a specific handle
      const uniqueHandle = `unique-handle-${Date.now()}`;
      await createProduct(api, 'First Product', uniqueHandle);

      // Create second product
      const { productId, revision } = await createProduct(api, 'Second Product');

      // Try to update second product with the same handle
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { handle: uniqueHandle },
        },
        throwOnError: false,
      });

      const result = data.catalogMutation.productUpdate;

      // Should have user errors about duplicate handle
      expect(result.userErrors.length).toBeGreaterThan(0);
      // The error code could be DUPLICATE_HANDLE or similar
    });

    test('should handle very long title', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Long Title Product');

      const veryLongTitle = 'A'.repeat(500);

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { title: veryLongTitle },
        },
      });

      const result = data.catalogMutation.productUpdate;

      // Should either succeed or return a validation error (depends on business rules)
      // At minimum, should not throw an unhandled exception
      expect(result).toBeTruthy();
    });

    test('should handle special characters in handle', async ({ api }) => {
      const { productId, revision } = await createProduct(api, 'Special Chars Product');

      // Valid handle with hyphens
      const validHandle = `test-product-${Date.now()}`;

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: { handle: validHandle },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.handle).toBe(validHandle);
    });

    test('should handle zero pricing amount', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Zero Price Product');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                pricing: {
                  currency: 'UAH',
                  amountMinor: '0', // Free product
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.variants.edges[0].node.price.amountMinor).toBe(0);
    });

    test('should handle zero stock quantity', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Zero Stock Product');

      const warehouseCode = `WH-ZERO-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Zero Stock Warehouse');

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                inventory: {
                  warehouseId: warehouse.id,
                  onHand: 0, // Out of stock
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const stockRecord = result.product.variants.edges[0].node.inventoryItem.stock.find(
        (s: { warehouse: { code: string } }) => s.warehouse.code === warehouseCode,
      );
      expect(stockRecord.quantityOnHand).toBe(0);
    });

    test('should handle zero dimensions', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(
        api,
        'Zero Dimensions Product',
      );

      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision,
          operations: {
            variants: [
              {
                variantId,
                dimensions: {
                  width: 0,
                  height: 0,
                  length: 0,
                },
              },
            ],
          },
        },
      });

      const result = data.catalogMutation.productUpdate;

      // Should either succeed or return validation error
      expect(result).toBeTruthy();
    });
  });
});
