import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];

/**
 * Helper to create a product with default variant
 */
async function createProduct(api: Api, title: string, handle?: string) {
  const productHandle = handle ?? `test-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle: productHandle,
      },
    },
  });

  const product = data.inventoryMutation.productCreate.product;
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

  const product = data.inventoryMutation.productCreate.product;
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
    product,
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

      const result = data.inventoryMutation.productUpdate;

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

      const result = data.inventoryMutation.productUpdate;

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
                json: { blocks: [{ type: 'paragraph', data: { text: 'This is the updated description' } }] },
              },
              excerpt: 'Short excerpt for the product',
            },
          },
        },
      });

      const result = data.inventoryMutation.productUpdate;

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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.product.seo).toBeTruthy();
      expect(result.product.seo.seoTitle).toBe('SEO Optimized Title');
      expect(result.product.seo.seoDescription).toBe('This is an SEO-optimized description for search engines');
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

      const result = data.inventoryMutation.productUpdate;

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

      const newRevision = publishData.inventoryMutation.productUpdate.product.revision;

      // Then unpublish it
      const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: newRevision,
          operations: { status: 'DRAFT' },
        },
      });

      const result = data.inventoryMutation.productUpdate;

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

      const result = data.inventoryMutation.productUpdate;

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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.price).toBeTruthy();
      expect(updatedVariant.price.currency).toBe('UAH');
      expect(updatedVariant.price.amountMinor).toBe(10000);
      expect(updatedVariant.price.compareAtMinor).toBe(12000);

      // Check operation results
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.sku).toBe('SKU-TEST-001');
      expect(updatedVariant.weight).toBeTruthy();
      expect(updatedVariant.weight.value).toBe(500);

      // Stock is an array - find the stock record for our warehouse
      const stockRecord = updatedVariant.stock.find(
        (s: { warehouse: { code: string } }) => s.warehouse.code === warehouseCode
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(100);

      expect(updatedVariant.cost).toBeTruthy();
      expect(updatedVariant.cost.unitCostMinor).toBe(5000);
      expect(updatedVariant.cost.currency).toBe('UAH');
    });

    test('should update variant dimensions', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Dimensions Test Product');

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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.dimensions).toBeTruthy();
      expect(updatedVariant.dimensions.width).toBe(100);
      expect(updatedVariant.dimensions.height).toBe(50);
      expect(updatedVariant.dimensions.length).toBe(200);
    });

    test('should update multiple variants at once', async ({ api }) => {
      const { productId, variants, revision } = await createProductWithOptions(api, 'Multi-Variant Product');

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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Should have operation results for each variant
      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
      );
      expect(variantOps).toHaveLength(2);
      expect(variantOps.every((op: { applied: boolean }) => op.applied)).toBe(true);

      // Verify variants were updated
      const updatedVariants = result.product.variants.edges;
      const redS = updatedVariants.find(
        (e: { node: { handle: string } }) => e.node.handle === 'red-s'
      )?.node;
      const redL = updatedVariants.find(
        (e: { node: { handle: string } }) => e.node.handle === 'red-l'
      )?.node;

      expect(redS?.sku).toBe('RED-S-001');
      expect(redS?.price?.amountMinor).toBe(10000);
      expect(redL?.sku).toBe('RED-L-001');
      expect(redL?.price?.amountMinor).toBe(11000);
    });

    test('should update product and variants in single request', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Combined Update Product');

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

      const result = data.inventoryMutation.productUpdate;

      expect(result.userErrors).toHaveLength(0);

      // Check product fields
      expect(result.product.title).toBe('Updated Combined Product');
      expect(result.product.handle).toBe(newHandle);
      expect(result.product.seo.seoTitle).toBe('Combined SEO');

      // Check variant fields
      const variant = result.product.variants.edges[0].node;
      expect(variant.sku).toBe('COMBINED-001');
      expect(variant.price.amountMinor).toBe(15000);

      // Find stock record for our warehouse
      const stockRecord = variant.stock.find(
        (s: { warehouse: { code: string } }) => s.warehouse.code === warehouseCode
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(75);

      expect(variant.dimensions.width).toBe(150);

      // Check operation results (should have both product and variant ops)
      expect(result.operationResults).toHaveLength(2);
      const productOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'PRODUCT_UPDATE'
      );
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
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

      expect(data.inventoryMutation.productUpdate.userErrors).toHaveLength(0);
      expect(data.inventoryMutation.productUpdate.product.revision).toBe(revision + 1);
    });

    test('should fail with REVISION_CONFLICT when expectedRevision does not match', async ({ api }) => {
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

      const result = data.inventoryMutation.productUpdate;
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

      expect(data.inventoryMutation.productUpdate.userErrors).toHaveLength(0);
      expect(data.inventoryMutation.productUpdate.product.title).toBe('Updated without locking');
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

      expect(firstUpdate.inventoryMutation.productUpdate.userErrors).toHaveLength(0);

      // Second update with old revision fails
      const { data: secondUpdate } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision, // Old revision
          operations: { title: 'Second Update' },
        },
        throwOnError: false,
      });

      expect(secondUpdate.inventoryMutation.productUpdate.userErrors.length).toBeGreaterThan(0);
      expect(secondUpdate.inventoryMutation.productUpdate.userErrors[0].code).toBe('REVISION_CONFLICT');
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

      const result = data.inventoryMutation.productUpdate;
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

      const result = data.inventoryMutation.productUpdate;

      // Product should still exist but variant update should fail
      expect(result.product).toBeTruthy();

      // Check variant operation failed
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
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

      const result = data.inventoryMutation.productUpdate;

      // Check that variant operation failed
      const variantOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
      );
      expect(variantOp).toBeTruthy();
      expect(variantOp.applied).toBe(false);
    });

    test('should handle partial failure (some operations succeed, others fail)', async ({ api }) => {
      const { productId, variantId, revision } = await createProduct(api, 'Partial Failure Product');
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

      const result = data.inventoryMutation.productUpdate;

      // Product should be updated
      expect(result.product).toBeTruthy();
      expect(result.product.title).toBe('Partial Failure Title');

      // Check operation results
      const productOp = result.operationResults.find(
        (op: { type: string }) => op.type === 'PRODUCT_UPDATE'
      );
      expect(productOp?.applied).toBe(true);

      // One variant should succeed, one should fail
      const variantOps = result.operationResults.filter(
        (op: { type: string }) => op.type === 'VARIANT_UPDATE'
      );
      expect(variantOps).toHaveLength(2);

      const successOp = variantOps.find((op: { applied: boolean }) => op.applied);
      const failOp = variantOps.find((op: { applied: boolean }) => !op.applied);

      expect(successOp).toBeTruthy();
      expect(failOp).toBeTruthy();
      expect(failOp.errors.length).toBeGreaterThan(0);

      // Verify successful variant was actually updated
      const updatedVariant = result.product.variants.edges[0].node;
      expect(updatedVariant.sku).toBe('PARTIAL-OK');
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

      const result = data.inventoryMutation.productUpdate;

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

      const result = data.inventoryMutation.productUpdate;

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

      expect(uahUpdate.inventoryMutation.productUpdate.userErrors).toHaveLength(0);
      const newRevision = uahUpdate.inventoryMutation.productUpdate.product.revision;

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

      expect(usdUpdate.inventoryMutation.productUpdate.userErrors).toHaveLength(0);
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
      expect(first.inventoryMutation.productUpdate.product.revision).toBe(revision + 1);

      // Second update
      const { data: second } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision + 1,
          operations: { title: 'Second' },
        },
      });
      expect(second.inventoryMutation.productUpdate.product.revision).toBe(revision + 2);

      // Third update
      const { data: third } = await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId,
          expectedRevision: revision + 2,
          operations: { title: 'Third' },
        },
      });
      expect(third.inventoryMutation.productUpdate.product.revision).toBe(revision + 3);
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

      expect(setData.inventoryMutation.productUpdate.product.excerpt).toBe('Initial excerpt');
      const newRevision = setData.inventoryMutation.productUpdate.product.revision;

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

      expect(clearData.inventoryMutation.productUpdate.userErrors).toHaveLength(0);
      // Excerpt should be empty or null
      expect(clearData.inventoryMutation.productUpdate.product.excerpt || '').toBe('');
    });
  });
});
