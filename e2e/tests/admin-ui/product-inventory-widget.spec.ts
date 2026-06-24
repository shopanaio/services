import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface VariantFixture {
  id: string;
  handle: string;
  inventoryItemId: string;
}

interface ExpectedInventory {
  sku: string;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
}

interface InventorySnapshotRow {
  handle: string;
  sku: string | null;
  onHand: number | null;
  unavailable: number | null;
  reserved: number | null;
  available: number | null;
}

const INITIAL_ON_HAND = 30;

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email-input').fill(email);
  await page.getByTestId('sign-in-password-input').fill(password);
  await page.getByTestId('sign-in-submit-button').click();

  await page.waitForFunction(() => localStorage.getItem('auth_access_token') !== null);
}

async function completeProfileIfNeeded(page: Page) {
  const firstNameInput = page.getByTestId('complete-profile-first-name-input');
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function createProductWithFourTrackedVariants(api: Api, unique: string) {
  const title = `Admin Inventory Product ${unique}`;
  const handle = `admin-inventory-product-${unique}`;

  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
        inventoryItem: { tracked: true },
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

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const product = result.product;
  if (!product) {
    throw new Error('Created product was not returned');
  }

  const variants = (product.variants?.edges ?? []).map((edge) => {
    const inventoryItemId = edge.node.inventoryItem?.id;
    if (!inventoryItemId) {
      throw new Error(`Inventory item was not returned for variant ${edge.node.handle}`);
    }

    return {
      id: edge.node.id,
      handle: edge.node.handle,
      inventoryItemId,
    };
  });

  expect(variants).toHaveLength(4);

  return {
    productId: product.id as string,
    title,
    handle,
    variants,
  };
}

async function createDefaultWarehouse(api: Api, unique: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `INV-UI-${unique}`.toUpperCase(),
        name: `Inventory UI Warehouse ${unique}`,
        isDefault: true,
      },
    },
  });

  const result = data.inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);

  const warehouse = result.warehouse;
  if (!warehouse?.id) {
    throw new Error('Default warehouse was not returned');
  }

  return warehouse;
}

async function seedInitialStock(api: Api, warehouseId: string, variants: VariantFixture[]) {
  for (const variant of variants) {
    const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
      variables: {
        input: {
          id: variant.inventoryItemId,
          stock: {
            warehouseId,
            onHand: INITIAL_ON_HAND,
            unavailable: 0,
          },
        },
      },
    });

    expect(data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
  }
}

function inventoryWidget(page: Page) {
  return page.getByTestId('inventory-widget');
}

function inventoryKpi(page: Page, key: string) {
  return page.getByTestId(`inventory-widget-kpi-${key}`);
}

async function openProductDetails(page: Page, productsUrl: string, handle: string, title: string) {
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();

  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(title);
  await expect(inventoryWidget(page)).toBeVisible();
}

async function openEditInventoryModal(page: Page) {
  await page.getByTestId('inventory-widget-actions-button').click();
  await page.getByTestId('inventory-widget-edit-inventory-menu-item').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeVisible();
  await expect(page.getByTestId('variants-editor-grid')).toBeVisible();
}

function variantEditorCell(page: Page, variantId: string, field: string) {
  return page.getByTestId(`variants-editor-cell-${field}-${variantId}`);
}

async function editVariantInventoryCell(
  page: Page,
  variantId: string,
  field: 'sku' | 'onHand' | 'unavailable',
  value: string | number,
) {
  const grid = page.getByTestId('variants-editor-grid');
  const cell = variantEditorCell(page, variantId, field);

  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();

  const input = grid.locator('input.ag-input-field-input, input.ag-cell-edit-input').last();
  await input.fill(String(value));
  await input.press('Enter');
}

async function saveEditInventoryModal(page: Page) {
  await page.getByTestId('submit-edit-variants-form-button').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeHidden();
}

function expectedInventoryByHandle(unique: string): Record<string, ExpectedInventory> {
  return {
    'red-s': {
      sku: `INV-${unique}-RS`,
      onHand: 20,
      unavailable: 3,
      reserved: 0,
      available: 17,
    },
    'red-l': {
      sku: `INV-${unique}-RL`,
      onHand: 7,
      unavailable: 2,
      reserved: 0,
      available: 5,
    },
    'blue-s': {
      sku: `INV-${unique}-BS`,
      onHand: 4,
      unavailable: 4,
      reserved: 0,
      available: 0,
    },
    'blue-l': {
      sku: `INV-${unique}-BL`,
      onHand: 0,
      unavailable: 0,
      reserved: 0,
      available: 0,
    },
  };
}

async function editInventoryForAllVariants(
  page: Page,
  variants: VariantFixture[],
  expectedByHandle: Record<string, ExpectedInventory>,
) {
  for (const variant of variants) {
    const expected = expectedByHandle[variant.handle];
    if (!expected) {
      throw new Error(`Missing expected inventory values for ${variant.handle}`);
    }

    await editVariantInventoryCell(page, variant.id, 'sku', expected.sku);
    await editVariantInventoryCell(page, variant.id, 'onHand', expected.onHand);

    if (expected.unavailable !== 0) {
      await editVariantInventoryCell(page, variant.id, 'unavailable', expected.unavailable);
    }
  }
}

async function expectInventoryModalCells(
  page: Page,
  variants: VariantFixture[],
  expectedByHandle: Record<string, ExpectedInventory>,
) {
  for (const variant of variants) {
    const expected = expectedByHandle[variant.handle];

    await expect(variantEditorCell(page, variant.id, 'sku')).toHaveText(expected.sku);
    await expect(variantEditorCell(page, variant.id, 'onHand')).toHaveText(
      String(expected.onHand),
    );
    await expect(variantEditorCell(page, variant.id, 'unavailable')).toHaveText(
      String(expected.unavailable),
    );
    await expect(variantEditorCell(page, variant.id, 'reserved')).toHaveText(
      String(expected.reserved),
    );
    await expect(variantEditorCell(page, variant.id, 'available')).toHaveText(
      String(expected.available),
    );
  }
}

async function expectInventoryApiState(
  api: Api,
  warehouseId: string,
  variants: VariantFixture[],
  expectedByHandle: Record<string, ExpectedInventory>,
) {
  await expect
    .poll(async () => {
      const rows: InventorySnapshotRow[] = [];

      for (const variant of variants) {
        const { data } = await api.admin.query('inventory-api/InventoryItemByVariant', {
          variables: { variantId: variant.id },
        });
        const item = data.inventoryQuery.inventoryItemByVariant;
        const stock = item?.stock.find((candidate) => candidate.warehouseId === warehouseId);

        rows.push({
          handle: variant.handle,
          sku: item?.sku ?? null,
          onHand: stock?.quantityOnHand ?? null,
          unavailable: stock?.unavailableQuantity ?? null,
          reserved: stock?.reservedQuantity ?? null,
          available: stock?.availableForSale ?? null,
        });
      }

      return rows.sort((a, b) => a.handle.localeCompare(b.handle));
    })
    .toEqual(
      variants
        .map((variant) => ({
          handle: variant.handle,
          sku: expectedByHandle[variant.handle].sku,
          onHand: expectedByHandle[variant.handle].onHand,
          unavailable: expectedByHandle[variant.handle].unavailable,
          reserved: expectedByHandle[variant.handle].reserved,
          available: expectedByHandle[variant.handle].available,
        }))
        .sort((a, b) => a.handle.localeCompare(b.handle)),
    );
}

async function expectInventoryWidgetApiState(api: Api, productId: string) {
  await expect
    .poll(async () => {
      const { data } = await api.admin.query('inventory-api/WidgetInventory', {
        variables: { productId },
      });

      const widget = data.widgetQuery.inventory;
      if (!widget) {
        return null;
      }

      return {
        quantities: widget.quantities,
        availableChange7d: widget.availableChange7d,
        total: widget.skuStatus.total,
        lowStockCount: widget.skuStatus.lowStock.count,
        lowStockAverageDays: widget.skuStatus.lowStock.averageDays,
        outOfStockCount: widget.skuStatus.outOfStock.count,
        outOfStockAverageDaysReady: widget.skuStatus.outOfStock.averageDays !== null,
        backorderCount: widget.skuStatus.backorder.count,
        backorderAverageDays: widget.skuStatus.backorder.averageDays,
        backorderQuantity: widget.backorder.quantity,
        backorderEtaAvgDays: widget.backorder.etaAvgDays,
        thresholdMethod: widget.alertThreshold.method,
        thresholdMinimumStock: widget.alertThreshold.minimumStock,
      };
    })
    .toEqual({
      quantities: {
        availableForSale: 22,
        onHand: 31,
        reserved: 0,
        unavailable: 9,
      },
      availableChange7d: 22,
      total: 4,
      lowStockCount: 1,
      lowStockAverageDays: null,
      outOfStockCount: 2,
      outOfStockAverageDaysReady: true,
      backorderCount: 0,
      backorderAverageDays: null,
      backorderQuantity: 0,
      backorderEtaAvgDays: null,
      thresholdMethod: 'SAFETY_STOCK',
      thresholdMinimumStock: 10,
    });
}

async function expectInventoryWidgetKpis(page: Page) {
  await expect(inventoryKpi(page, 'available')).toContainText('Available');
  await expect(inventoryKpi(page, 'available')).toContainText('22');
  await expect(inventoryKpi(page, 'available')).toContainText('+22 vs 7d');

  await expect(inventoryKpi(page, 'on-hand')).toContainText('On Hand');
  await expect(inventoryKpi(page, 'on-hand')).toContainText('31');

  await expect(inventoryKpi(page, 'reserved')).toContainText('Reserved');
  await expect(inventoryKpi(page, 'reserved')).toContainText('0');

  await expect(inventoryKpi(page, 'low-stock')).toContainText('Low Stock');
  await expect(inventoryKpi(page, 'low-stock')).toContainText('1 SKUs');
  await expect(inventoryKpi(page, 'low-stock')).toContainText('25% of catalog');

  await expect(inventoryKpi(page, 'out-of-stock')).toContainText('Out of Stock');
  await expect(inventoryKpi(page, 'out-of-stock')).toContainText('2 SKUs');
  await expect(inventoryKpi(page, 'out-of-stock')).toContainText(/for ~\d+(?:\.\d+)?d/);

  await expect(inventoryKpi(page, 'backorder')).toHaveCount(0);
}

test.describe('Admin product inventory widget UI', () => {
  test('updates variant inventory through product details and reflects inventory KPI tiles', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const { productId, title, handle, variants } =
      await createProductWithFourTrackedVariants(api, unique);
    const warehouse = await createDefaultWarehouse(api, unique);
    await seedInitialStock(api, warehouse.id, variants);

    const expectedByHandle = expectedInventoryByHandle(unique);
    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, handle, title);

    await openEditInventoryModal(page);
    await editInventoryForAllVariants(page, variants, expectedByHandle);
    await saveEditInventoryModal(page);

    await expectInventoryApiState(api, warehouse.id, variants, expectedByHandle);
    await expectInventoryWidgetApiState(api, productId);
    await expectInventoryWidgetKpis(page);

    await openEditInventoryModal(page);
    await expectInventoryModalCells(page, variants, expectedByHandle);
  });
});
