import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Inventory Widget API - out of stock', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  async function createProductWithVariant(api: any, title = 'Widget Inventory Product') {
    const handle = `${title.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  async function createWarehouse(
    api: any,
    codePrefix: string,
    name: string,
    isDefault = false,
  ) {
    const code = `${codePrefix}-${randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: { input: { code, name, isDefault } },
    });

    return data.inventoryMutation.warehouseCreate.warehouse;
  }

  test('should return full inventory widget payload for out of stock', async ({ api }) => {
    const { product, variantId } = await createProductWithVariant(api);

    if (!product?.id || !variantId) {
      test.skip();
      return;
    }

    const warehouse = await createWarehouse(
      api,
      'WH-WIDGET-OOS',
      'Widget Out of Stock Warehouse',
    );

    if (!warehouse?.id) {
      test.skip();
      return;
    }

    await api.admin.mutation('inventory-api/VariantSetStock', {
      variables: {
        input: {
          variantId,
          warehouseId: warehouse.id,
          quantity: 0,
        },
      },
    });

    const { data } = await api.admin.query('inventory-api/WidgetInventory', {
      variables: { productId: product.id },
    });

    const widget = data.widgetQuery.inventory;
    expect(widget).toBeTruthy();
    expect(widget.quantities).toEqual({
      availableForSale: 0,
      onHand: 0,
      reserved: 0,
      unavailable: 0,
    });
    expect(widget.availableChange7d).toBe(0);
    expect(widget.skuStatus.total).toBe(1);
    expect(widget.skuStatus.lowStock.count).toBe(0);
    expect(widget.skuStatus.lowStock.averageDays).toBeNull();
    expect(widget.skuStatus.outOfStock.count).toBe(1);
    expect(widget.skuStatus.outOfStock.averageDays).not.toBeNull();
    expect(widget.skuStatus.outOfStock.averageDays).toBeGreaterThanOrEqual(0);
    expect(widget.skuStatus.backorder.count).toBe(0);
    expect(widget.skuStatus.backorder.averageDays).toBeNull();
    expect(widget.backorder.quantity).toBe(0);
    expect(widget.backorder.etaAvgDays).toBeNull();
    expect(widget.alertThreshold.method).toBe('SAFETY_STOCK');
    expect(widget.alertThreshold.minimumStock).toBe(10);
  });
});
