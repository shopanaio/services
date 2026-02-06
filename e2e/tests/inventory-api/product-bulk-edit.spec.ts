import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];

// ============================================
// Types
// ============================================

interface JobProgress {
  total: number;
  succeeded: number;
  failed: number;
  done: number;
  pending: number;
  running: number;
}

interface JobItem {
  productId: string;
  variantId: string | null;
  opType: string;
  status: string;
  errors: { message: string; code: string }[];
}

interface JobResult {
  status: string;
  progress: JobProgress;
  items: JobItem[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Helper to create a product with default variant
 */
async function createProduct(api: Api, title: string, handle?: string) {
  const productHandle =
    handle ?? `bulk-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    handle: productHandle,
  };
}

/**
 * Helper to create a product with options and multiple variants
 */
async function createProductWithOptions(api: Api, title: string) {
  const handle = `bulk-options-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    handle,
  };
}

/**
 * Helper to create a warehouse
 */
async function createWarehouse(api: Api, code: string, name: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: { input: { code, name, isDefault: false } },
  });

  const warehouse = data.inventoryMutation.warehouseCreate.warehouse;
  if (!warehouse) {
    throw new Error('Failed to create warehouse');
  }

  return warehouse;
}

/**
 * Helper to wait for bulk update job to complete with polling
 */
async function waitForJobCompletion(
  api: Api,
  jobId: string,
  maxWaitMs = 30000,
  pollIntervalMs = 500,
): Promise<JobResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const { data } = await api.admin.query('inventory-api/ProductBulkUpdateJob', {
      variables: { jobId },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const job = (data as any).catalogQuery.productBulkUpdateJob;
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      return {
        status: job.status,
        progress: job.progress,
        items: job.items.edges.map((e: { node: JobItem }) => e.node),
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Job ${jobId} did not complete within ${maxWaitMs}ms`);
}

/**
 * Helper to fetch a product by ID
 */
async function fetchProduct(api: Api, productId: string) {
  const { data } = await api.admin.query('inventory-api/ProductFindOne', {
    variables: { id: productId },
  });

  const product = data.catalogQuery.product;
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  return product;
}

interface BulkUpdateProduct {
  productId: string;
  expectedRevision?: number;
  operations: Record<string, unknown>;
}

interface BulkUpdateResult {
  userErrors: { message: string; code: string }[];
  job: { id: string; status: string; progress: { total: number; pending: number } } | null;
}

/**
 * Helper to submit bulk update and wait for completion
 */
async function submitBulkUpdateAndWait(
  api: Api,
  products: BulkUpdateProduct[],
): Promise<{ result: BulkUpdateResult; job: JobResult | null }> {
  const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
    variables: {
      input: { products },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data as any).catalogMutation.productBulkUpdate as BulkUpdateResult;

  if (result.userErrors.length > 0) {
    return { result, job: null };
  }

  if (!result.job?.id) {
    throw new Error('No job ID returned');
  }

  const jobResult = await waitForJobCompletion(api, result.job.id);
  return { result, job: jobResult };
}

// ============================================
// Tests
// ============================================

test.describe('Product Bulk Edit API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ============================================
  // BASIC JOB CREATION
  // ============================================

  test.describe('Job Creation', () => {
    test('should create bulk edit job with single product', async ({ api }) => {
      const { productId } = await createProduct(api, 'Bulk Edit Single Product');

      const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
        variables: {
          input: {
            products: [
              {
                productId,
                operations: {
                  title: 'Bulk Updated Title',
                },
              },
            ],
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any).catalogMutation.productBulkUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.job).toBeTruthy();
      expect(result.job?.id).toBeTruthy();
      // Job may complete very quickly, so status could be QUEUED, RUNNING or COMPLETED
      expect(['QUEUED', 'RUNNING', 'COMPLETED']).toContain(result.job?.status);
      expect(result.job?.progress.total).toBeGreaterThan(0);
    });

    test('should create bulk edit job with multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Bulk Product 1');
      const product2 = await createProduct(api, 'Bulk Product 2');
      const product3 = await createProduct(api, 'Bulk Product 3');

      const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
        variables: {
          input: {
            products: [
              { productId: product1.productId, operations: { title: 'Updated 1' } },
              { productId: product2.productId, operations: { title: 'Updated 2' } },
              { productId: product3.productId, operations: { title: 'Updated 3' } },
            ],
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any).catalogMutation.productBulkUpdate;

      expect(result.userErrors).toHaveLength(0);
      expect(result.job).toBeTruthy();
      expect(result.job?.progress.total).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================
  // VALIDATION ERRORS
  // ============================================

  test.describe('Input Validation', () => {
    test('should reject empty products array', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
        variables: {
          input: {
            products: [],
          },
        },
        throwOnError: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any).catalogMutation.productBulkUpdate;
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.job).toBeNull();
    });

    test('should reject more than 100 products in batch', async ({ api }) => {
      const { productId } = await createProduct(api, 'Bulk Edit Limit Product');
      const products = Array.from({ length: 101 }, () => ({
        productId,
        operations: {
          title: 'Bulk Update',
        },
      }));

      const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
        variables: {
          input: {
            products,
          },
        },
        throwOnError: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any).catalogMutation.productBulkUpdate;
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.job).toBeNull();
    });
  });

  // ============================================
  // SUCCESSFUL BULK UPDATES - PRODUCT FIELDS
  // ============================================

  test.describe('Bulk Product Field Updates', () => {
    test('should update titles for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Original Title 1');
      const product2 = await createProduct(api, 'Original Title 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { title: 'Bulk Updated Title 1' } },
        { productId: product2.productId, operations: { title: 'Bulk Updated Title 2' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(2);
      expect(job?.progress.failed).toBe(0);

      // Verify actual updates
      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct2 = await fetchProduct(api, product2.productId);

      expect(updatedProduct1.title).toBe('Bulk Updated Title 1');
      expect(updatedProduct2.title).toBe('Bulk Updated Title 2');
    });

    test('should update handles for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Handle Update Product 1');
      const product2 = await createProduct(api, 'Handle Update Product 2');

      const newHandle1 = `bulk-handle-1-${Date.now()}`;
      const newHandle2 = `bulk-handle-2-${Date.now()}`;

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { handle: newHandle1 } },
        { productId: product2.productId, operations: { handle: newHandle2 } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);

      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct2 = await fetchProduct(api, product2.productId);

      expect(updatedProduct1.handle).toBe(newHandle1);
      expect(updatedProduct2.handle).toBe(newHandle2);
    });

    test('should update product status (publish/unpublish) in bulk', async ({ api }) => {
      const product1 = await createProduct(api, 'Publish Bulk Product 1');
      const product2 = await createProduct(api, 'Publish Bulk Product 2');

      // Publish both products
      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { status: 'PUBLISHED' } },
        { productId: product2.productId, operations: { status: 'PUBLISHED' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);

      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct2 = await fetchProduct(api, product2.productId);

      expect(updatedProduct1.isPublished).toBe(true);
      expect(updatedProduct2.isPublished).toBe(true);
    });

    test('should update SEO fields for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'SEO Bulk Product 1');
      const product2 = await createProduct(api, 'SEO Bulk Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            seo: {
              seoTitle: 'Bulk SEO Title 1',
              seoDescription: 'Bulk SEO Description 1',
            },
          },
        },
        {
          productId: product2.productId,
          operations: {
            seo: {
              seoTitle: 'Bulk SEO Title 2',
              seoDescription: 'Bulk SEO Description 2',
            },
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should update multiple fields on each product', async ({ api }) => {
      const product1 = await createProduct(api, 'Multi-Field Bulk Product 1');
      const product2 = await createProduct(api, 'Multi-Field Bulk Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            title: 'Updated Multi 1',
            content: { excerpt: 'Excerpt 1' },
            seo: { seoTitle: 'SEO 1' },
          },
        },
        {
          productId: product2.productId,
          operations: {
            title: 'Updated Multi 2',
            content: { excerpt: 'Excerpt 2' },
            seo: { seoTitle: 'SEO 2' },
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);

      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct2 = await fetchProduct(api, product2.productId);

      expect(updatedProduct1.title).toBe('Updated Multi 1');
      expect(updatedProduct2.title).toBe('Updated Multi 2');
    });
  });

  // ============================================
  // SUCCESSFUL BULK UPDATES - VARIANT FIELDS
  // ============================================

  test.describe('Bulk Variant Field Updates', () => {
    test('should update variant pricing for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Pricing Bulk Product 1');
      const product2 = await createProduct(api, 'Pricing Bulk Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                pricing: { currency: 'UAH', amountMinor: '10000' },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                pricing: { currency: 'UAH', amountMinor: '20000' },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should update variant inventory for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Inventory Bulk Product 1');
      const product2 = await createProduct(api, 'Inventory Bulk Product 2');

      const warehouseCode = `WH-BULK-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Bulk Test Warehouse');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                inventory: {
                  warehouseId: warehouse.id,
                  onHand: 100,
                  sku: 'BULK-SKU-001',
                },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                inventory: {
                  warehouseId: warehouse.id,
                  onHand: 200,
                  sku: 'BULK-SKU-002',
                },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should update variant dimensions for multiple products', async ({ api }) => {
      const product1 = await createProduct(api, 'Dimensions Bulk Product 1');
      const product2 = await createProduct(api, 'Dimensions Bulk Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                dimensions: { width: 100, height: 50, length: 200 },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                dimensions: { width: 150, height: 75, length: 300 },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should update multiple variants per product in bulk', async ({ api }) => {
      const product1 = await createProductWithOptions(api, 'Multi-Variant Bulk Product 1');
      const product2 = await createProductWithOptions(api, 'Multi-Variant Bulk Product 2');

      const warehouseCode = `WH-MULTI-BULK-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Multi-Variant Bulk Warehouse');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: product1.variants.slice(0, 2).map((v: { id: string }, idx: number) => ({
              variantId: v.id,
              pricing: { currency: 'UAH', amountMinor: String((idx + 1) * 10000) },
              inventory: { warehouseId: warehouse.id, onHand: (idx + 1) * 50 },
            })),
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: product2.variants.slice(0, 2).map((v: { id: string }, idx: number) => ({
              variantId: v.id,
              pricing: { currency: 'UAH', amountMinor: String((idx + 1) * 15000) },
              inventory: { warehouseId: warehouse.id, onHand: (idx + 1) * 75 },
            })),
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should update product and variant fields together in bulk', async ({ api }) => {
      const product1 = await createProduct(api, 'Combined Bulk Product 1');
      const product2 = await createProduct(api, 'Combined Bulk Product 2');

      const warehouseCode = `WH-COMBINED-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Combined Bulk Warehouse');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            title: 'Combined Updated 1',
            status: 'PUBLISHED',
            variants: [
              {
                variantId: product1.variantId,
                pricing: { currency: 'UAH', amountMinor: '25000' },
                inventory: { warehouseId: warehouse.id, onHand: 100, sku: 'COMBINED-001' },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            title: 'Combined Updated 2',
            status: 'PUBLISHED',
            variants: [
              {
                variantId: product2.variantId,
                pricing: { currency: 'UAH', amountMinor: '35000' },
                inventory: { warehouseId: warehouse.id, onHand: 200, sku: 'COMBINED-002' },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);

      // Verify product updates
      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct2 = await fetchProduct(api, product2.productId);

      expect(updatedProduct1.title).toBe('Combined Updated 1');
      expect(updatedProduct1.isPublished).toBe(true);
      expect(updatedProduct2.title).toBe('Combined Updated 2');
      expect(updatedProduct2.isPublished).toBe(true);
    });
  });

  // ============================================
  // ERROR HANDLING AND PARTIAL FAILURES
  // ============================================

  test.describe('Error Handling and Partial Failures', () => {
    test('should handle non-existent product in batch (partial failure)', async ({ api }) => {
      const validProduct = await createProduct(api, 'Valid Bulk Product');
      const fakeProductId = '00000000-0000-0000-0000-000000000000';

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: validProduct.productId, operations: { title: 'Updated Valid Product' } },
        { productId: fakeProductId, operations: { title: 'Should Fail' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(1);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);

      // Verify valid product was still updated
      const updatedProduct = await fetchProduct(api, validProduct.productId);
      expect(updatedProduct.title).toBe('Updated Valid Product');

      // Verify failed item has error info
      const failedItem = job?.items.find((item) => item.productId === fakeProductId);
      expect(failedItem).toBeTruthy();
      expect(failedItem?.status).toBe('FAILED');
      expect(failedItem?.errors.length).toBeGreaterThan(0);
    });

    test('should handle revision conflict for some products', async ({ api }) => {
      const product1 = await createProduct(api, 'Revision Product 1');
      const product2 = await createProduct(api, 'Revision Product 2');

      // Update product2 to change its revision
      await api.admin.mutation('inventory-api/ProductUpdate', {
        variables: {
          productId: product2.productId,
          expectedRevision: product2.revision,
          operations: { title: 'Sneaky Update' },
        },
      });

      // Now try bulk update with old revision for product2
      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          expectedRevision: product1.revision,
          operations: { title: 'Bulk Update 1' },
        },
        {
          productId: product2.productId,
          expectedRevision: product2.revision, // Old revision - should fail
          operations: { title: 'Bulk Update 2' },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(1);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);

      // Verify product1 was updated
      const updatedProduct1 = await fetchProduct(api, product1.productId);
      expect(updatedProduct1.title).toBe('Bulk Update 1');

      // Verify product2 was not updated (still has sneaky update title)
      const updatedProduct2 = await fetchProduct(api, product2.productId);
      expect(updatedProduct2.title).toBe('Sneaky Update');

      // Verify error details
      const failedItem = job?.items.find(
        (item) => item.productId === product2.productId && item.status === 'FAILED',
      );
      expect(failedItem).toBeTruthy();
      expect(failedItem?.errors.some((e) => e.code === 'REVISION_CONFLICT')).toBe(true);
    });

    test('should handle invalid variant ID in bulk update', async ({ api }) => {
      const product1 = await createProduct(api, 'Valid Variant Product');
      const product2 = await createProduct(api, 'Invalid Variant Product');
      const fakeVariantId = '00000000-0000-0000-0000-000000000000';

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                pricing: { currency: 'UAH', amountMinor: '10000' },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: fakeVariantId, // Invalid variant
                pricing: { currency: 'UAH', amountMinor: '20000' },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');

      // At least one operation should succeed and at least one should fail
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(1);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);
    });

    test('should handle invalid warehouse ID in bulk update', async ({ api }) => {
      const product1 = await createProduct(api, 'Valid Warehouse Product');
      const product2 = await createProduct(api, 'Invalid Warehouse Product');

      const warehouseCode = `WH-VALID-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Valid Warehouse');
      const fakeWarehouseId = '00000000-0000-0000-0000-000000000000';

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                inventory: { warehouseId: warehouse.id, onHand: 100 },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                inventory: { warehouseId: fakeWarehouseId, onHand: 200 },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);
    });

    test('should handle duplicate handle in bulk update', async ({ api }) => {
      const existingHandle = `existing-handle-${Date.now()}`;
      await createProduct(api, 'Existing Product', existingHandle);

      const product1 = await createProduct(api, 'New Product 1');
      const product2 = await createProduct(api, 'New Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: { handle: `unique-handle-${Date.now()}` }, // Should succeed
        },
        {
          productId: product2.productId,
          operations: { handle: existingHandle }, // Should fail - duplicate
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(1);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);
    });

    test('should track errors correctly in job items', async ({ api }) => {
      const validProduct = await createProduct(api, 'Valid Error Track Product');
      const fakeProductId1 = '00000000-0000-0000-0000-000000000001';
      const fakeProductId2 = '00000000-0000-0000-0000-000000000002';

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: validProduct.productId, operations: { title: 'Valid Update' } },
        { productId: fakeProductId1, operations: { title: 'Fake 1' } },
        { productId: fakeProductId2, operations: { title: 'Fake 2' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBeGreaterThanOrEqual(2);

      // Check that each failed item has its productId in the error
      const failedItems = job?.items.filter((item) => item.status === 'FAILED') ?? [];
      expect(failedItems.length).toBeGreaterThanOrEqual(2);

      for (const item of failedItems) {
        expect(item.errors.length).toBeGreaterThan(0);
        expect([fakeProductId1, fakeProductId2]).toContain(item.productId);
      }
    });
  });

  // ============================================
  // OPTIMISTIC LOCKING
  // ============================================

  test.describe('Optimistic Locking in Bulk', () => {
    test('should succeed with correct expectedRevision for all products', async ({ api }) => {
      const product1 = await createProduct(api, 'Revision OK Product 1');
      const product2 = await createProduct(api, 'Revision OK Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          expectedRevision: product1.revision,
          operations: { title: 'Revision OK Update 1' },
        },
        {
          productId: product2.productId,
          expectedRevision: product2.revision,
          operations: { title: 'Revision OK Update 2' },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(2);
    });

    test('should succeed without expectedRevision (no locking)', async ({ api }) => {
      const product1 = await createProduct(api, 'No Lock Product 1');
      const product2 = await createProduct(api, 'No Lock Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { title: 'No Lock Update 1' } },
        { productId: product2.productId, operations: { title: 'No Lock Update 2' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should fail only products with wrong revision', async ({ api }) => {
      const product1 = await createProduct(api, 'Mixed Revision Product 1');
      const product2 = await createProduct(api, 'Mixed Revision Product 2');
      const product3 = await createProduct(api, 'Mixed Revision Product 3');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          expectedRevision: product1.revision,
          operations: { title: 'Should Succeed 1' },
        },
        {
          productId: product2.productId,
          expectedRevision: 999, // Wrong revision
          operations: { title: 'Should Fail' },
        },
        {
          productId: product3.productId,
          expectedRevision: product3.revision,
          operations: { title: 'Should Succeed 3' },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(2);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(1);

      // Verify successful updates
      const updatedProduct1 = await fetchProduct(api, product1.productId);
      const updatedProduct3 = await fetchProduct(api, product3.productId);
      expect(updatedProduct1.title).toBe('Should Succeed 1');
      expect(updatedProduct3.title).toBe('Should Succeed 3');

      // Verify failed product wasn't updated
      const updatedProduct2 = await fetchProduct(api, product2.productId);
      expect(updatedProduct2.title).toBe('Mixed Revision Product 2');
    });
  });

  // ============================================
  // JOB PROGRESS TRACKING
  // ============================================

  test.describe('Job Progress Tracking', () => {
    test('should track progress correctly for successful batch', async ({ api }) => {
      const batchId = Date.now();
      const products = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createProduct(api, `Progress Product ${i + 1}`, `progress-${batchId}-${i}`),
        ),
      );

      const { job } = await submitBulkUpdateAndWait(
        api,
        products.map((p, idx) => ({
          productId: p.productId,
          operations: { title: `Progress Updated ${idx + 1}` },
        })),
      );

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.total).toBeGreaterThanOrEqual(5);
      expect(job?.progress.done).toBe(job?.progress.total);
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(5);
      expect(job?.progress.failed).toBe(0);
      expect(job?.progress.pending).toBe(0);
      expect(job?.progress.running).toBe(0);
    });

    test('should track progress correctly for mixed success/failure batch', async ({ api }) => {
      const batchId = Date.now();
      const validProducts = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          createProduct(api, `Mixed Progress Valid ${i + 1}`, `mixed-progress-${batchId}-${i}`),
        ),
      );

      const fakeProductIds = [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ];

      const updateRequests = [
        ...validProducts.map((p, idx) => ({
          productId: p.productId,
          operations: { title: `Mixed Progress Updated ${idx + 1}` },
        })),
        ...fakeProductIds.map((id) => ({
          productId: id,
          operations: { title: 'Should Fail' },
        })),
      ];

      const { job } = await submitBulkUpdateAndWait(api, updateRequests);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.done).toBe(job?.progress.total);
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(3);
      expect(job?.progress.failed).toBeGreaterThanOrEqual(2);
    });

    test('should return all items with correct status', async ({ api }) => {
      const product1 = await createProduct(api, 'Items Status Product 1');
      const product2 = await createProduct(api, 'Items Status Product 2');
      const fakeProductId = '00000000-0000-0000-0000-000000000000';

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { title: 'Items Update 1' } },
        { productId: product2.productId, operations: { title: 'Items Update 2' } },
        { productId: fakeProductId, operations: { title: 'Items Fail' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.items.length).toBeGreaterThanOrEqual(3);

      // Check that items have correct status
      const succeededItems = job?.items.filter((item) => item.status === 'SUCCEEDED') ?? [];
      const failedItems = job?.items.filter((item) => item.status === 'FAILED') ?? [];

      expect(succeededItems.length).toBeGreaterThanOrEqual(2);
      expect(failedItems.length).toBeGreaterThanOrEqual(1);

      // Verify failed item has the fake product ID
      const failedItem = failedItems.find((item) => item.productId === fakeProductId);
      expect(failedItem).toBeTruthy();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  test.describe('Edge Cases', () => {
    test('should handle same product appearing multiple times in batch', async ({ api }) => {
      const product = await createProduct(api, 'Duplicate Product');

      // This should process both updates, likely in sequence
      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product.productId, operations: { title: 'First Update' } },
        { productId: product.productId, operations: { title: 'Second Update' } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');

      // The final title should be the second update
      const updatedProduct = await fetchProduct(api, product.productId);
      // Depending on implementation, could be either title or have conflicts
      expect(['First Update', 'Second Update']).toContain(updatedProduct.title);
    });

    test('should handle empty operations for some products', async ({ api }) => {
      const product1 = await createProduct(api, 'Empty Ops Product 1');
      const product2 = await createProduct(api, 'Empty Ops Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { title: 'Updated Title' } },
        { productId: product2.productId, operations: {} }, // Empty operations
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');

      // Product1 should be updated
      const updatedProduct1 = await fetchProduct(api, product1.productId);
      expect(updatedProduct1.title).toBe('Updated Title');

      // Product2 should remain unchanged
      const updatedProduct2 = await fetchProduct(api, product2.productId);
      expect(updatedProduct2.title).toBe('Empty Ops Product 2');
    });

    test('should handle very long titles in bulk', async ({ api }) => {
      const product1 = await createProduct(api, 'Long Title Product 1');
      const product2 = await createProduct(api, 'Long Title Product 2');

      const longTitle1 = 'A'.repeat(200);
      const longTitle2 = 'B'.repeat(200);

      const { job } = await submitBulkUpdateAndWait(api, [
        { productId: product1.productId, operations: { title: longTitle1 } },
        { productId: product2.productId, operations: { title: longTitle2 } },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
    });

    test('should handle zero pricing in bulk', async ({ api }) => {
      const product1 = await createProduct(api, 'Zero Price Product 1');
      const product2 = await createProduct(api, 'Zero Price Product 2');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                pricing: { currency: 'UAH', amountMinor: '0' },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                pricing: { currency: 'UAH', amountMinor: '0' },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should handle zero stock quantity in bulk', async ({ api }) => {
      const product1 = await createProduct(api, 'Zero Stock Product 1');
      const product2 = await createProduct(api, 'Zero Stock Product 2');

      const warehouseCode = `WH-ZERO-BULK-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Zero Stock Bulk Warehouse');

      const { job } = await submitBulkUpdateAndWait(api, [
        {
          productId: product1.productId,
          operations: {
            variants: [
              {
                variantId: product1.variantId,
                inventory: { warehouseId: warehouse.id, onHand: 0 },
              },
            ],
          },
        },
        {
          productId: product2.productId,
          operations: {
            variants: [
              {
                variantId: product2.variantId,
                inventory: { warehouseId: warehouse.id, onHand: 0 },
              },
            ],
          },
        },
      ]);

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });
  });

  // ============================================
  // LARGER BATCH TESTS
  // ============================================

  test.describe('Larger Batch Operations', () => {
    test('should handle batch of 10 products', async ({ api }) => {
      const batchId = Date.now();
      const products = [];
      for (let i = 0; i < 10; i++) {
        products.push(
          await createProduct(api, `Batch 10 Product ${i + 1}`, `batch10-${batchId}-${i}`),
        );
      }

      const { job } = await submitBulkUpdateAndWait(
        api,
        products.map((p, idx) => ({
          productId: p.productId,
          operations: { title: `Batch 10 Updated ${idx + 1}` },
        })),
      );

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(10);
      expect(job?.progress.failed).toBe(0);

      // Verify all products were updated
      for (let i = 0; i < products.length; i++) {
        const updatedProduct = await fetchProduct(api, products[i].productId);
        expect(updatedProduct.title).toBe(`Batch 10 Updated ${i + 1}`);
      }
    });

    test('should handle batch of 25 products with variant updates', async ({ api }) => {
      const batchId = Date.now();
      const products = await Promise.all(
        Array.from({ length: 25 }, (_, i) =>
          createProduct(api, `Batch 25 Product ${i + 1}`, `batch25-${batchId}-${i}`),
        ),
      );

      const warehouseCode = `WH-BATCH25-${Date.now()}`;
      const warehouse = await createWarehouse(api, warehouseCode, 'Batch 25 Warehouse');

      const { job } = await submitBulkUpdateAndWait(
        api,
        products.map((p, idx) => ({
          productId: p.productId,
          operations: {
            title: `Batch 25 Updated ${idx + 1}`,
            variants: [
              {
                variantId: p.variantId,
                pricing: { currency: 'UAH', amountMinor: String((idx + 1) * 1000) },
                inventory: { warehouseId: warehouse.id, onHand: (idx + 1) * 10 },
              },
            ],
          },
        })),
      );

      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.failed).toBe(0);
    });

    test('should handle batch at limit (100 products)', async ({ api }) => {
      // Create 100 products - this is the maximum allowed
      const batchId = Date.now();
      const products = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          createProduct(api, `Batch 100 Product ${i + 1}`, `batch100-${batchId}-${i}`),
        ),
      );

      const { result, job } = await submitBulkUpdateAndWait(
        api,
        products.map((p, idx) => ({
          productId: p.productId,
          operations: { title: `Batch 100 Updated ${idx + 1}` },
        })),
      );

      expect(result.userErrors).toHaveLength(0);
      expect(job).toBeTruthy();
      expect(job?.status).toBe('COMPLETED');
      expect(job?.progress.succeeded).toBeGreaterThanOrEqual(100);
    });
  });
});
