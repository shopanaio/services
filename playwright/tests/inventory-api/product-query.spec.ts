import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Product Query API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  test('should find product by id', async ({ api }) => {
    // Create a product first
    const { data: createData } = await api.admin.mutation('inventory/ProductCreate', {});
    const createdProduct = createData.inventoryMutation.productCreate.product;
    expect(createdProduct).toBeTruthy();

    // Query the product by ID
    const { data } = await api.admin.query('inventory/ProductFindOne', {
      variables: {
        id: createdProduct.id,
      },
    });

    const product = data.inventoryQuery.product;
    expect(product).toBeTruthy();
    expect(product.id).toBe(createdProduct.id);
    expect(product.isPublished).toBe(false);
    expect(product.createdAt).toBeTruthy();
    expect(product.updatedAt).toBeTruthy();
    expect(product.deletedAt).toBeNull();
  });

  test('should return null for non-existent product', async ({ api }) => {
    const { data } = await api.admin.query('inventory/ProductFindOne', {
      variables: {
        id: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(data.inventoryQuery.product).toBeNull();
  });

  test('should list products with pagination', async ({ api }) => {
    // Create multiple products
    const { data: createData1 } = await api.admin.mutation('inventory/ProductCreate', {});
    const { data: createData2 } = await api.admin.mutation('inventory/ProductCreate', {});
    const { data: createData3 } = await api.admin.mutation('inventory/ProductCreate', {});

    expect(createData1.inventoryMutation.productCreate.product).toBeTruthy();
    expect(createData2.inventoryMutation.productCreate.product).toBeTruthy();
    expect(createData3.inventoryMutation.productCreate.product).toBeTruthy();

    // Query products with pagination
    const { data } = await api.admin.query('inventory/ProductFindMany', {
      variables: {
        first: 10,
      },
    });

    const products = data.inventoryQuery.products;
    expect(products.edges.length).toBeGreaterThanOrEqual(3);
    expect(products.pageInfo).toBeTruthy();
    expect(products.totalCount).toBeGreaterThanOrEqual(3);

    // Verify each product has required fields
    for (const edge of products.edges) {
      expect(edge.node.id).toBeTruthy();
      expect(edge.node.createdAt).toBeTruthy();
      expect(edge.cursor).toBeTruthy();
    }
  });

  test('should include variants in product query', async ({ api }) => {
    // Create a product (which creates a default variant)
    const { data: createData } = await api.admin.mutation('inventory/ProductCreate', {});
    const createdProduct = createData.inventoryMutation.productCreate.product;

    // Query the product with variants
    const { data } = await api.admin.query('inventory/ProductFindOne', {
      variables: {
        id: createdProduct.id,
      },
    });

    const product = data.inventoryQuery.product;
    expect(product).toBeTruthy();
    expect(product.variants).toBeTruthy();
    expect(product.variants.edges.length).toBeGreaterThanOrEqual(1);
    expect(product.variantsCount).toBeGreaterThanOrEqual(1);

    // Verify default variant
    const defaultVariant = product.variants.edges.find((e: any) => e.node.isDefault);
    expect(defaultVariant).toBeTruthy();
  });
});
