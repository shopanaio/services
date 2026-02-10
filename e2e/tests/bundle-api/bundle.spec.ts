import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';

// Helper to create a product for bundle tests
async function createProduct(api: ApiFixtures['api'], title?: string): Promise<{ id: string; variantId: string }> {
  const uniqueId = crypto.randomUUID().slice(0, 8);
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title: title || `Bundle Test Product ${uniqueId}`,
        handle: `bundle-test-product-${uniqueId}`,
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  if (result.userErrors.length > 0 || !result.product) {
    throw new Error(`Failed to create product: ${JSON.stringify(result.userErrors)}`);
  }

  const variantId = result.product.variants?.edges[0]?.node?.id;
  if (!variantId) {
    throw new Error('Product created without variant');
  }

  return { id: result.product.id, variantId };
}

test.describe('Bundle Group API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // BUNDLE GROUP - HAPPY PATH
  // ===============================================

  test('should create a bundle group for a product', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Choose Your Processor',
        },
      },
    });

    const result = data.catalogMutation.bundleGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleGroup).toBeTruthy();
    expect(result.bundleGroup.id).toBeTruthy();
    expect(result.bundleGroup.productId).toBe(product.id);
    expect(result.bundleGroup.title).toBe('Choose Your Processor');
    expect(result.bundleGroup.sortIndex).toBe(0);
    expect(result.bundleGroup.minSelection).toBeNull();
    expect(result.bundleGroup.maxSelection).toBeNull();
    expect(result.bundleGroup.items).toHaveLength(0);
  });

  test('should create bundle group with all optional fields', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Select Accessories',
          sortIndex: 5,
          minSelection: 1,
          maxSelection: 3,
        },
      },
    });

    const result = data.catalogMutation.bundleGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleGroup.title).toBe('Select Accessories');
    expect(result.bundleGroup.sortIndex).toBe(5);
    expect(result.bundleGroup.minSelection).toBe(1);
    expect(result.bundleGroup.maxSelection).toBe(3);
  });

  test('should create multiple groups with auto-incrementing sortIndex', async ({ api }) => {
    const product = await createProduct(api);

    // Create first group without sortIndex
    const { data: data1 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group 1',
        },
      },
    });

    // Create second group without sortIndex
    const { data: data2 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group 2',
        },
      },
    });

    // Create third group without sortIndex
    const { data: data3 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group 3',
        },
      },
    });

    expect(data1.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(0);
    expect(data2.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(1);
    expect(data3.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(2);
  });

  test('should update bundle group title', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Original Title',
        },
      },
    });

    const groupId = createData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleGroupUpdate', {
      variables: {
        input: {
          id: groupId,
          title: 'Updated Title',
        },
      },
    });

    const result = data.catalogMutation.bundleGroupUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleGroup.title).toBe('Updated Title');
  });

  test('should update bundle group min/max selection constraints', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = createData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleGroupUpdate', {
      variables: {
        input: {
          id: groupId,
          minSelection: 2,
          maxSelection: 5,
        },
      },
    });

    const result = data.catalogMutation.bundleGroupUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleGroup.minSelection).toBe(2);
    expect(result.bundleGroup.maxSelection).toBe(5);
  });

  test('should delete bundle group', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group to Delete',
        },
      },
    });

    const groupId = createData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleGroupDelete', {
      variables: {
        input: { id: groupId },
      },
    });

    const result = data.catalogMutation.bundleGroupDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedId).toBe(groupId);

    // Verify group is deleted
    const { data: queryData } = await api.admin.query('bundle-api/BundleGroup', {
      variables: { id: groupId },
    });

    expect(queryData.catalogQuery.bundleGroup).toBeNull();
  });

  test('should delete bundle group and cascade delete items', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group
    const { data: createGroupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group with Items',
        },
      },
    });

    const groupId = createGroupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    // Add item to group
    const { data: createItemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const itemId = createItemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Delete group
    const { data } = await api.admin.mutation('bundle-api/BundleGroupDelete', {
      variables: {
        input: { id: groupId },
      },
    });

    expect(data.catalogMutation.bundleGroupDelete.userErrors).toHaveLength(0);

    // Verify item is also deleted
    const { data: itemQueryData } = await api.admin.query('bundle-api/BundleItem', {
      variables: { id: itemId },
    });

    expect(itemQueryData.catalogQuery.bundleItem).toBeNull();
  });

  // ===============================================
  // BUNDLE GROUP - VALIDATION
  // ===============================================

  test('should reject creating group for non-existent product', async ({ api }) => {
    const { data } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      throwOnError: false,
      variables: {
        input: {
          productId: 'gid://catalog/Product/00000000-0000-0000-0000-000000000000',
          title: 'Invalid Group',
        },
      },
    });

    const result = data.catalogMutation.bundleGroupCreate;

    expect(result.bundleGroup).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject empty title', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      throwOnError: false,
      variables: {
        input: {
          productId: product.id,
          title: '',
        },
      },
    });

    const result = data.catalogMutation.bundleGroupCreate;

    expect(result.bundleGroup).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Bundle Item API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // BUNDLE ITEM - HAPPY PATH
  // ===============================================

  test('should create PRODUCT type item', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem).toBeTruthy();
    expect(result.bundleItem.id).toBeTruthy();
    expect(result.bundleItem.groupId).toBe(groupId);
    expect(result.bundleItem.itemType).toBe('PRODUCT');
    expect(result.bundleItem.refProductId).toBe(refProduct.id);
    expect(result.bundleItem.refVariantId).toBeNull();
    expect(result.bundleItem.minQty).toBe(1);
    expect(result.bundleItem.defaultQty).toBe(1);
    expect(result.bundleItem.visible).toBe(true);
    expect(result.bundleItem.selected).toBe(false);
  });

  test('should create VARIANT type item', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'VARIANT',
          refVariantId: refProduct.variantId,
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.itemType).toBe('VARIANT');
    expect(result.bundleItem.refVariantId).toBe(refProduct.variantId);
    expect(result.bundleItem.refProductId).toBeNull();
  });

  test('should create item with all optional fields', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          title: 'Custom Title',
          minQty: 1,
          maxQty: 10,
          defaultQty: 2,
          priceType: 'FIXED',
          priceValue: 1999,
          visible: true,
          selected: true,
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.title).toBe('Custom Title');
    expect(result.bundleItem.minQty).toBe(1);
    expect(result.bundleItem.maxQty).toBe(10);
    expect(result.bundleItem.defaultQty).toBe(2);
    expect(result.bundleItem.priceType).toBe('FIXED');
    expect(result.bundleItem.priceValue).toBe(1999);
    expect(result.bundleItem.visible).toBe(true);
    expect(result.bundleItem.selected).toBe(true);
  });

  test('should update item properties', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: createData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const itemId = createData.catalogMutation.bundleItemCreate.bundleItem.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemUpdate', {
      variables: {
        input: {
          id: itemId,
          title: 'Updated Title',
          minQty: 2,
          maxQty: 8,
          priceType: 'PERCENT_OFF',
          priceValue: 15,
        },
      },
    });

    const result = data.catalogMutation.bundleItemUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.title).toBe('Updated Title');
    expect(result.bundleItem.minQty).toBe(2);
    expect(result.bundleItem.maxQty).toBe(8);
    expect(result.bundleItem.priceType).toBe('PERCENT_OFF');
    expect(result.bundleItem.priceValue).toBe(15);
  });

  test('should set pricing via pricingTemplateId', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create pricing template
    const { data: templateData } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: '20% Off Template',
          priceType: 'PERCENT_OFF',
          priceValue: 20,
        },
      },
    });

    const templateId = templateData.catalogMutation.bundlePricingTemplateCreate.bundlePricingTemplate.id;

    // Create group
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    // Create item with pricing template
    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          pricingTemplateId: templateId,
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.pricingTemplateId).toBe(templateId);
    expect(result.bundleItem.pricingTemplate).toBeTruthy();
    expect(result.bundleItem.pricingTemplate.name).toBe('20% Off Template');
    expect(result.bundleItem.pricingTemplate.priceType).toBe('PERCENT_OFF');
  });

  test('should delete item', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: createData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const itemId = createData.catalogMutation.bundleItemCreate.bundleItem.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemDelete', {
      variables: {
        input: { id: itemId },
      },
    });

    const result = data.catalogMutation.bundleItemDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedId).toBe(itemId);

    // Verify item is deleted
    const { data: queryData } = await api.admin.query('bundle-api/BundleItem', {
      variables: { id: itemId },
    });

    expect(queryData.catalogQuery.bundleItem).toBeNull();
  });

  // ===============================================
  // BUNDLE ITEM - VALIDATION
  // ===============================================

  test('should reject PRODUCT type without refProductId', async ({ api }) => {
    const product = await createProduct(api);

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      throwOnError: false,
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          // Missing refProductId
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject VARIANT type without refVariantId', async ({ api }) => {
    const product = await createProduct(api);

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      throwOnError: false,
      variables: {
        input: {
          groupId,
          itemType: 'VARIANT',
          // Missing refVariantId
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject setting both priceType AND pricingTemplateId', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create pricing template
    const { data: templateData } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Test Template',
          priceType: 'FREE',
        },
      },
    });

    const templateId = templateData.catalogMutation.bundlePricingTemplateCreate.bundlePricingTemplate.id;

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      throwOnError: false,
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          priceType: 'FIXED',
          priceValue: 1000,
          pricingTemplateId: templateId, // Both set - should fail
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;

    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Bundle Pricing Template API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // PRICING TEMPLATE - HAPPY PATH
  // ===============================================

  test('should create FIXED price template', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Fixed Price Template',
          priceType: 'FIXED',
          priceValue: 2999,
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundlePricingTemplate).toBeTruthy();
    expect(result.bundlePricingTemplate.id).toBeTruthy();
    expect(result.bundlePricingTemplate.productId).toBe(product.id);
    expect(result.bundlePricingTemplate.name).toBe('Fixed Price Template');
    expect(result.bundlePricingTemplate.priceType).toBe('FIXED');
    expect(result.bundlePricingTemplate.priceValue).toBe(2999);
  });

  test('should create PERCENT_OFF template', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: '25% Discount',
          priceType: 'PERCENT_OFF',
          priceValue: 25,
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundlePricingTemplate.priceType).toBe('PERCENT_OFF');
    expect(result.bundlePricingTemplate.priceValue).toBe(25);
  });

  test('should create FREE template', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Free Item',
          priceType: 'FREE',
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundlePricingTemplate.priceType).toBe('FREE');
    expect(result.bundlePricingTemplate.priceValue).toBeNull();
  });

  test('should create AMOUNT_OFF template', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: '$5 Off',
          priceType: 'AMOUNT_OFF',
          priceValue: 500,
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundlePricingTemplate.priceType).toBe('AMOUNT_OFF');
    expect(result.bundlePricingTemplate.priceValue).toBe(500);
  });

  test('should update template', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Original Name',
          priceType: 'FIXED',
          priceValue: 1000,
        },
      },
    });

    const templateId = createData.catalogMutation.bundlePricingTemplateCreate.bundlePricingTemplate.id;

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateUpdate', {
      variables: {
        input: {
          id: templateId,
          name: 'Updated Name',
          priceType: 'PERCENT_OFF',
          priceValue: 30,
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.bundlePricingTemplate.name).toBe('Updated Name');
    expect(result.bundlePricingTemplate.priceType).toBe('PERCENT_OFF');
    expect(result.bundlePricingTemplate.priceValue).toBe(30);
  });

  test('should delete template', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Template to Delete',
          priceType: 'FREE',
        },
      },
    });

    const templateId = createData.catalogMutation.bundlePricingTemplateCreate.bundlePricingTemplate.id;

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateDelete', {
      variables: {
        input: { id: templateId },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedId).toBe(templateId);

    // Verify template is deleted
    const { data: queryData } = await api.admin.query('bundle-api/BundlePricingTemplate', {
      variables: { id: templateId },
    });

    expect(queryData.catalogQuery.bundlePricingTemplate).toBeNull();
  });

  test('should set item pricingTemplateId to null when template is deleted', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create template
    const { data: templateData } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Template to Delete',
          priceType: 'PERCENT_OFF',
          priceValue: 15,
        },
      },
    });

    const templateId = templateData.catalogMutation.bundlePricingTemplateCreate.bundlePricingTemplate.id;

    // Create group and item using template
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          pricingTemplateId: templateId,
        },
      },
    });

    const itemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Delete template
    await api.admin.mutation('bundle-api/BundlePricingTemplateDelete', {
      variables: {
        input: { id: templateId },
      },
    });

    // Verify item's pricingTemplateId is now null
    const { data: queryData } = await api.admin.query('bundle-api/BundleItem', {
      variables: { id: itemId },
    });

    expect(queryData.catalogQuery.bundleItem).toBeTruthy();
    expect(queryData.catalogQuery.bundleItem.pricingTemplateId).toBeNull();
    expect(queryData.catalogQuery.bundleItem.pricingTemplate).toBeNull();
  });

  // ===============================================
  // PRICING TEMPLATE - VALIDATION
  // ===============================================

  test('should reject empty name', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      throwOnError: false,
      variables: {
        input: {
          productId: product.id,
          name: '',
          priceType: 'FREE',
        },
      },
    });

    const result = data.catalogMutation.bundlePricingTemplateCreate;

    expect(result.bundlePricingTemplate).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Dependency Rule API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // DEPENDENCY RULE - HAPPY PATH
  // ===============================================

  test('should create dependency rule with minimal input', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Show accessory when main selected',
        },
      },
    });

    const result = data.catalogMutation.dependencyRuleCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyRule).toBeTruthy();
    expect(result.dependencyRule.id).toBeTruthy();
    expect(result.dependencyRule.productId).toBe(product.id);
    expect(result.dependencyRule.name).toBe('Show accessory when main selected');
    expect(result.dependencyRule.enabled).toBe(true);
    expect(result.dependencyRule.priority).toBe(0);
    expect(result.dependencyRule.logicOperator).toBe('AND');
    expect(result.dependencyRule.conditionGroups).toHaveLength(0);
    expect(result.dependencyRule.actions).toHaveLength(0);
  });

  test('should create dependency rule with all optional fields', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Complex Rule',
          enabled: false,
          priority: 10,
          logicOperator: 'OR',
        },
      },
    });

    const result = data.catalogMutation.dependencyRuleCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyRule.enabled).toBe(false);
    expect(result.dependencyRule.priority).toBe(10);
    expect(result.dependencyRule.logicOperator).toBe('OR');
  });

  test('should update dependency rule', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Original Rule',
        },
      },
    });

    const ruleId = createData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data } = await api.admin.mutation('bundle-api/DependencyRuleUpdate', {
      variables: {
        input: {
          id: ruleId,
          name: 'Updated Rule',
          enabled: false,
          priority: 5,
          logicOperator: 'OR',
        },
      },
    });

    const result = data.catalogMutation.dependencyRuleUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyRule.name).toBe('Updated Rule');
    expect(result.dependencyRule.enabled).toBe(false);
    expect(result.dependencyRule.priority).toBe(5);
    expect(result.dependencyRule.logicOperator).toBe('OR');
  });

  test('should delete dependency rule', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Rule to Delete',
        },
      },
    });

    const ruleId = createData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data } = await api.admin.mutation('bundle-api/DependencyRuleDelete', {
      variables: {
        input: { id: ruleId },
      },
    });

    const result = data.catalogMutation.dependencyRuleDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedId).toBe(ruleId);

    // Verify rule is deleted
    const { data: queryData } = await api.admin.query('bundle-api/DependencyRule', {
      variables: { id: ruleId },
    });

    expect(queryData.catalogQuery.dependencyRule).toBeNull();
  });

  // ===============================================
  // CONDITION GROUPS & CONDITIONS
  // ===============================================

  test('should create condition group for rule', async ({ api }) => {
    const product = await createProduct(api);

    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Test Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const result = data.catalogMutation.conditionGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.conditionGroup).toBeTruthy();
    expect(result.conditionGroup.ruleId).toBe(ruleId);
    expect(result.conditionGroup.logicOperator).toBe('AND');
    expect(result.conditionGroup.conditions).toHaveLength(0);
  });

  test('should create condition for condition group', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule and condition group
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Test Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data: conditionGroupData } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const conditionGroupId = conditionGroupData.catalogMutation.conditionGroupCreate.conditionGroup.id;

    // Create condition
    const { data } = await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: conditionGroupId,
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    const result = data.catalogMutation.conditionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.condition).toBeTruthy();
    expect(result.condition.groupId).toBe(conditionGroupId);
    expect(result.condition.category).toBe('STATE_CHECK');
    expect(result.condition.subject).toBe('ITEM_SELECTED');
    expect(result.condition.operator).toBe('IS_SELECTED');
    expect(result.condition.targetType).toBe('ITEM');
    expect(result.condition.targetId).toBe(bundleItemId);
  });

  test('should create numeric condition with value', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule and condition group
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Quantity Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data: conditionGroupData } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const conditionGroupId = conditionGroupData.catalogMutation.conditionGroupCreate.conditionGroup.id;

    // Create numeric condition
    const { data } = await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: conditionGroupId,
          category: 'NUMERIC',
          subject: 'ITEM_QTY',
          operator: 'GTE',
          targetType: 'ITEM',
          targetId: bundleItemId,
          value: 3,
        },
      },
    });

    const result = data.catalogMutation.conditionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.condition.category).toBe('NUMERIC');
    expect(result.condition.subject).toBe('ITEM_QTY');
    expect(result.condition.operator).toBe('GTE');
    expect(result.condition.value).toBe(3);
  });

  // ===============================================
  // DEPENDENCY ACTIONS
  // ===============================================

  test('should create SHOW action', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Show Action Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Create action
    const { data } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SHOW',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    const result = data.catalogMutation.dependencyActionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyAction).toBeTruthy();
    expect(result.dependencyAction.ruleId).toBe(ruleId);
    expect(result.dependencyAction.actionType).toBe('SHOW');
    expect(result.dependencyAction.targetType).toBe('ITEM');
    expect(result.dependencyAction.targetId).toBe(bundleItemId);
  });

  test('should create SET_REQUIRED action', async ({ api }) => {
    const product = await createProduct(api);

    // Create group
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    // Create rule
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Required Action Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Create action targeting group
    const { data } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SET_REQUIRED',
          targetType: 'GROUP',
          targetId: bundleGroupId,
          requiredValue: true,
        },
      },
    });

    const result = data.catalogMutation.dependencyActionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyAction.actionType).toBe('SET_REQUIRED');
    expect(result.dependencyAction.targetType).toBe('GROUP');
    expect(result.dependencyAction.requiredValue).toBe(true);
  });

  test('should create ADJUST_PRICE action', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item first
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Price Action Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Create price adjustment action
    const { data } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'ADJUST_PRICE',
          targetType: 'ITEM',
          targetId: bundleItemId,
          priceType: 'PERCENT_OFF',
          priceValue: 20,
          stackable: true,
        },
      },
    });

    const result = data.catalogMutation.dependencyActionCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyAction.actionType).toBe('ADJUST_PRICE');
    expect(result.dependencyAction.priceType).toBe('PERCENT_OFF');
    expect(result.dependencyAction.priceValue).toBe(20);
    expect(result.dependencyAction.stackable).toBe(true);
  });

  test('should delete dependency rule and cascade delete conditions and actions', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule with condition group and action
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Rule with Dependencies',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Add condition group
    const { data: condGroupData } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const conditionGroupId = condGroupData.catalogMutation.conditionGroupCreate.conditionGroup.id;

    // Add condition
    await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: conditionGroupId,
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    // Add action
    await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SHOW',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    // Delete rule
    const { data } = await api.admin.mutation('bundle-api/DependencyRuleDelete', {
      variables: {
        input: { id: ruleId },
      },
    });

    expect(data.catalogMutation.dependencyRuleDelete.userErrors).toHaveLength(0);

    // Verify rule and nested data are deleted
    const { data: queryData } = await api.admin.query('bundle-api/DependencyRule', {
      variables: { id: ruleId },
    });

    expect(queryData.catalogQuery.dependencyRule).toBeNull();
  });
});

test.describe('Bundle Queries', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // QUERY TESTS
  // ===============================================

  test('should query bundle groups with nested items', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct1 = await createProduct(api, 'Reference Product 1');
    const refProduct2 = await createProduct(api, 'Reference Product 2');

    // Create group
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Processor Options',
          minSelection: 1,
          maxSelection: 1,
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    // Add items
    await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct1.id,
          title: 'Option 1',
        },
      },
    });

    await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct2.id,
          title: 'Option 2',
        },
      },
    });

    // Query bundle groups
    const { data } = await api.admin.query('bundle-api/BundleGroups', {
      variables: { productId: product.id },
    });

    expect(data.catalogQuery.bundleGroups).toHaveLength(1);
    expect(data.catalogQuery.bundleGroups[0].title).toBe('Processor Options');
    expect(data.catalogQuery.bundleGroups[0].minSelection).toBe(1);
    expect(data.catalogQuery.bundleGroups[0].maxSelection).toBe(1);
    expect(data.catalogQuery.bundleGroups[0].items).toHaveLength(2);
    expect(data.catalogQuery.bundleGroups[0].items.map((i: { title: string }) => i.title)).toContain('Option 1');
    expect(data.catalogQuery.bundleGroups[0].items.map((i: { title: string }) => i.title)).toContain('Option 2');
  });

  test('should return empty array for product with no bundle groups', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.query('bundle-api/BundleGroups', {
      variables: { productId: product.id },
    });

    expect(data.catalogQuery.bundleGroups).toHaveLength(0);
  });

  test('should query pricing templates for product', async ({ api }) => {
    const product = await createProduct(api);

    // Create templates
    await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Free Template',
          priceType: 'FREE',
        },
      },
    });

    await api.admin.mutation('bundle-api/BundlePricingTemplateCreate', {
      variables: {
        input: {
          productId: product.id,
          name: '10% Off',
          priceType: 'PERCENT_OFF',
          priceValue: 10,
        },
      },
    });

    const { data } = await api.admin.query('bundle-api/BundlePricingTemplates', {
      variables: { productId: product.id },
    });

    expect(data.catalogQuery.bundlePricingTemplates).toHaveLength(2);
    expect(data.catalogQuery.bundlePricingTemplates.map((t: { name: string }) => t.name)).toContain('Free Template');
    expect(data.catalogQuery.bundlePricingTemplates.map((t: { name: string }) => t.name)).toContain('10% Off');
  });

  test('should query dependency rules with nested conditions and actions', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    // Create group and item
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Complex Rule',
          logicOperator: 'AND',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Add condition group with condition
    const { data: condGroupData } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'OR',
        },
      },
    });

    const conditionGroupId = condGroupData.catalogMutation.conditionGroupCreate.conditionGroup.id;

    await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: conditionGroupId,
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    // Add action
    await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SHOW',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    // Query dependency rules
    const { data } = await api.admin.query('bundle-api/DependencyRules', {
      variables: { productId: product.id },
    });

    expect(data.catalogQuery.dependencyRules).toHaveLength(1);

    const rule = data.catalogQuery.dependencyRules[0];
    expect(rule.name).toBe('Complex Rule');
    expect(rule.logicOperator).toBe('AND');
    expect(rule.conditionGroups).toHaveLength(1);
    expect(rule.conditionGroups[0].logicOperator).toBe('OR');
    expect(rule.conditionGroups[0].conditions).toHaveLength(1);
    expect(rule.conditionGroups[0].conditions[0].category).toBe('STATE_CHECK');
    expect(rule.actions).toHaveLength(1);
    expect(rule.actions[0].actionType).toBe('SHOW');
  });

  test('should return empty array for product with no dependency rules', async ({ api }) => {
    const product = await createProduct(api);

    const { data } = await api.admin.query('bundle-api/DependencyRules', {
      variables: { productId: product.id },
    });

    expect(data.catalogQuery.dependencyRules).toHaveLength(0);
  });

  test('should query single bundle group by id', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Single Group Query',
        },
      },
    });

    const groupId = createData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.query('bundle-api/BundleGroup', {
      variables: { id: groupId },
    });

    expect(data.catalogQuery.bundleGroup).toBeTruthy();
    expect(data.catalogQuery.bundleGroup.id).toBe(groupId);
    expect(data.catalogQuery.bundleGroup.title).toBe('Single Group Query');
  });

  test('should return null for non-existent bundle group', async ({ api }) => {
    const { data } = await api.admin.query('bundle-api/BundleGroup', {
      variables: { id: 'gid://catalog/BundleGroup/00000000-0000-0000-0000-000000000000' },
    });

    expect(data.catalogQuery.bundleGroup).toBeNull();
  });
});

// ===============================================
// ADDITIONAL TEST SCENARIOS
// ===============================================

test.describe('Bundle - Multiple Products in Group', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create bundle group with multiple product items', async ({ api }) => {
    const mainProduct = await createProduct(api, 'Bundle Main Product');
    const refProduct1 = await createProduct(api, 'Accessory 1');
    const refProduct2 = await createProduct(api, 'Accessory 2');
    const refProduct3 = await createProduct(api, 'Accessory 3');

    // Create group
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: mainProduct.id,
          title: 'Select Accessories',
          minSelection: 1,
          maxSelection: 2,
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    // Add multiple items
    const { data: item1Data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct1.id,
          title: 'First Accessory',
          priceType: 'PERCENT_OFF',
          priceValue: 10,
        },
      },
    });

    const { data: item2Data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct2.id,
          title: 'Second Accessory',
          priceType: 'FREE',
        },
      },
    });

    const { data: item3Data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct3.id,
          title: 'Third Accessory',
          priceType: 'FIXED',
          priceValue: 500,
        },
      },
    });

    expect(item1Data.catalogMutation.bundleItemCreate.userErrors).toHaveLength(0);
    expect(item2Data.catalogMutation.bundleItemCreate.userErrors).toHaveLength(0);
    expect(item3Data.catalogMutation.bundleItemCreate.userErrors).toHaveLength(0);

    // Query to verify all items are in group
    const { data: queryData } = await api.admin.query('bundle-api/BundleGroup', {
      variables: { id: groupId },
    });

    expect(queryData.catalogQuery.bundleGroup.items).toHaveLength(3);
    expect(queryData.catalogQuery.bundleGroup.items.map((i: { title: string }) => i.title)).toContain('First Accessory');
    expect(queryData.catalogQuery.bundleGroup.items.map((i: { title: string }) => i.title)).toContain('Second Accessory');
    expect(queryData.catalogQuery.bundleGroup.items.map((i: { title: string }) => i.title)).toContain('Third Accessory');
  });
});

test.describe('Bundle Item - Update Reference', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should update item sortIndex', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: createData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const itemId = createData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Update sortIndex
    const { data } = await api.admin.mutation('bundle-api/BundleItemUpdate', {
      variables: {
        input: {
          id: itemId,
          sortIndex: 99,
        },
      },
    });

    expect(data.catalogMutation.bundleItemUpdate.userErrors).toHaveLength(0);
    expect(data.catalogMutation.bundleItemUpdate.bundleItem.sortIndex).toBe(99);
  });

  test('should update item visibility', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: createData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          visible: true,
        },
      },
    });

    const itemId = createData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Update to hidden
    const { data } = await api.admin.mutation('bundle-api/BundleItemUpdate', {
      variables: {
        input: {
          id: itemId,
          visible: false,
        },
      },
    });

    expect(data.catalogMutation.bundleItemUpdate.userErrors).toHaveLength(0);
    expect(data.catalogMutation.bundleItemUpdate.bundleItem.visible).toBe(false);
  });

  test('should update item selected state', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: createData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          selected: false,
        },
      },
    });

    const itemId = createData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Update to selected
    const { data } = await api.admin.mutation('bundle-api/BundleItemUpdate', {
      variables: {
        input: {
          id: itemId,
          selected: true,
        },
      },
    });

    expect(data.catalogMutation.bundleItemUpdate.userErrors).toHaveLength(0);
    expect(data.catalogMutation.bundleItemUpdate.bundleItem.selected).toBe(true);
  });
});

test.describe('Bundle Validation - Edge Cases', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should reject minQty greater than maxQty', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      throwOnError: false,
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          minQty: 5,
          maxQty: 2, // minQty > maxQty - should fail
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;
    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should accept equal minQty and maxQty', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          minQty: 3,
          maxQty: 3, // Equal values - should work
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.minQty).toBe(3);
    expect(result.bundleItem.maxQty).toBe(3);
  });

  test('should allow maxQty null (unlimited)', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
          minQty: 1,
          // maxQty not set (null = unlimited)
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.bundleItem.minQty).toBe(1);
    expect(result.bundleItem.maxQty).toBeNull();
  });

  test('should reject creating item for non-existent group', async ({ api }) => {
    const refProduct = await createProduct(api, 'Reference Product');

    const { data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      throwOnError: false,
      variables: {
        input: {
          groupId: 'gid://catalog/BundleGroup/00000000-0000-0000-0000-000000000000',
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const result = data.catalogMutation.bundleItemCreate;
    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject updating non-existent item', async ({ api }) => {
    const { data } = await api.admin.mutation('bundle-api/BundleItemUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'gid://catalog/BundleItem/00000000-0000-0000-0000-000000000000',
          title: 'Updated Title',
        },
      },
    });

    const result = data.catalogMutation.bundleItemUpdate;
    expect(result.bundleItem).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject deleting non-existent item', async ({ api }) => {
    const { data } = await api.admin.mutation('bundle-api/BundleItemDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: 'gid://catalog/BundleItem/00000000-0000-0000-0000-000000000000',
        },
      },
    });

    const result = data.catalogMutation.bundleItemDelete;
    expect(result.deletedId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Dependency Rules - Complex Scenarios', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create rule with multiple condition groups (OR logic)', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct1 = await createProduct(api, 'Reference Product 1');
    const refProduct2 = await createProduct(api, 'Reference Product 2');

    // Create bundle group with two items
    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const groupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: item1Data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct1.id,
        },
      },
    });

    const item1Id = item1Data.catalogMutation.bundleItemCreate.bundleItem.id;

    const { data: item2Data } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId,
          itemType: 'PRODUCT',
          refProductId: refProduct2.id,
        },
      },
    });

    const item2Id = item2Data.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule with OR logic between condition groups
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Show if either item selected',
          logicOperator: 'OR',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Create first condition group
    const { data: condGroup1Data } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const condGroup1Id = condGroup1Data.catalogMutation.conditionGroupCreate.conditionGroup.id;

    // Add condition to first group
    await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: condGroup1Id,
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: item1Id,
        },
      },
    });

    // Create second condition group
    const { data: condGroup2Data } = await api.admin.mutation('bundle-api/ConditionGroupCreate', {
      variables: {
        input: {
          ruleId,
          logicOperator: 'AND',
        },
      },
    });

    const condGroup2Id = condGroup2Data.catalogMutation.conditionGroupCreate.conditionGroup.id;

    // Add condition to second group
    await api.admin.mutation('bundle-api/ConditionCreate', {
      variables: {
        input: {
          groupId: condGroup2Id,
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: item2Id,
        },
      },
    });

    // Query the rule to verify structure
    const { data: queryData } = await api.admin.query('bundle-api/DependencyRule', {
      variables: { id: ruleId },
    });

    const rule = queryData.catalogQuery.dependencyRule;
    expect(rule.logicOperator).toBe('OR');
    expect(rule.conditionGroups).toHaveLength(2);
    expect(rule.conditionGroups[0].conditions).toHaveLength(1);
    expect(rule.conditionGroups[1].conditions).toHaveLength(1);
  });

  test('should create HIDE action', async ({ api }) => {
    const product = await createProduct(api);
    const refProduct = await createProduct(api, 'Reference Product');

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: itemData } = await api.admin.mutation('bundle-api/BundleItemCreate', {
      variables: {
        input: {
          groupId: bundleGroupId,
          itemType: 'PRODUCT',
          refProductId: refProduct.id,
        },
      },
    });

    const bundleItemId = itemData.catalogMutation.bundleItemCreate.bundleItem.id;

    // Create rule
    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Hide Action Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    // Create HIDE action
    const { data } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'HIDE',
          targetType: 'ITEM',
          targetId: bundleItemId,
        },
      },
    });

    const result = data.catalogMutation.dependencyActionCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyAction.actionType).toBe('HIDE');
  });

  test('should update action properties', async ({ api }) => {
    const product = await createProduct(api);

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Test Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data: createData } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SET_REQUIRED',
          targetType: 'GROUP',
          targetId: bundleGroupId,
          requiredValue: true,
        },
      },
    });

    const actionId = createData.catalogMutation.dependencyActionCreate.dependencyAction.id;

    // Update the action
    const { data } = await api.admin.mutation('bundle-api/DependencyActionUpdate', {
      variables: {
        input: {
          id: actionId,
          requiredValue: false,
        },
      },
    });

    const result = data.catalogMutation.dependencyActionUpdate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.dependencyAction.requiredValue).toBe(false);
  });

  test('should delete action', async ({ api }) => {
    const product = await createProduct(api);

    const { data: groupData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
        },
      },
    });

    const bundleGroupId = groupData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data: ruleData } = await api.admin.mutation('bundle-api/DependencyRuleCreate', {
      variables: {
        input: {
          productId: product.id,
          name: 'Test Rule',
        },
      },
    });

    const ruleId = ruleData.catalogMutation.dependencyRuleCreate.dependencyRule.id;

    const { data: createData } = await api.admin.mutation('bundle-api/DependencyActionCreate', {
      variables: {
        input: {
          ruleId,
          actionType: 'SET_REQUIRED',
          targetType: 'GROUP',
          targetId: bundleGroupId,
        },
      },
    });

    const actionId = createData.catalogMutation.dependencyActionCreate.dependencyAction.id;

    // Delete the action
    const { data } = await api.admin.mutation('bundle-api/DependencyActionDelete', {
      variables: {
        input: { id: actionId },
      },
    });

    const result = data.catalogMutation.dependencyActionDelete;
    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedId).toBe(actionId);
  });
});

test.describe('Bundle Group - Sorting', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should respect explicit sortIndex when provided', async ({ api }) => {
    const product = await createProduct(api);

    // Create groups with explicit sort indices
    const { data: data1 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group A',
          sortIndex: 10,
        },
      },
    });

    const { data: data2 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group B',
          sortIndex: 5,
        },
      },
    });

    const { data: data3 } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Group C',
          sortIndex: 15,
        },
      },
    });

    expect(data1.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(10);
    expect(data2.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(5);
    expect(data3.catalogMutation.bundleGroupCreate.bundleGroup.sortIndex).toBe(15);
  });

  test('should update group sortIndex', async ({ api }) => {
    const product = await createProduct(api);

    const { data: createData } = await api.admin.mutation('bundle-api/BundleGroupCreate', {
      variables: {
        input: {
          productId: product.id,
          title: 'Test Group',
          sortIndex: 0,
        },
      },
    });

    const groupId = createData.catalogMutation.bundleGroupCreate.bundleGroup.id;

    const { data } = await api.admin.mutation('bundle-api/BundleGroupUpdate', {
      variables: {
        input: {
          id: groupId,
          sortIndex: 100,
        },
      },
    });

    expect(data.catalogMutation.bundleGroupUpdate.userErrors).toHaveLength(0);
    expect(data.catalogMutation.bundleGroupUpdate.bundleGroup.sortIndex).toBe(100);
  });
});
