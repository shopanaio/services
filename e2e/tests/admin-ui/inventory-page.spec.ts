import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];
type SortDirection = 'asc' | 'desc';
type InventoryItemOrderField = 'productName' | 'id';

interface InventoryItemOrder {
  field: InventoryItemOrderField;
  direction: SortDirection;
}

interface SeededProduct {
  id: string;
  title: string;
  handle: string;
  variants: SeededVariant[];
}

interface SeededVariant {
  id: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  handle: string;
  isDefault: boolean;
  inventoryItemId: string;
  sku: string;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
}

interface InventoryFixture {
  warehouseId: string;
  warehouseName: string;
  products: SeededProduct[];
  variants: SeededVariant[];
}

interface ExpectedInventoryValues {
  onHand: number;
  unavailable: number;
  available: number;
}

const BASE_VARIANT_NAMES = ['alpha', 'bravo', 'charlie', 'delta'];

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

async function addTagSelectValue(page: Page, testId: string, value: string) {
  const select = page.getByTestId(testId);
  await select.click();
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

async function setupAdminUserAndStore(api: Api, page: Page) {
  api.session.user.data.password = 'StrongPassword123!';
  await api.session.setupUser();
  const organization = await api.session.setupOrganization();
  await api.session.setupProject();

  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);

  return organization;
}

async function createWarehouseThroughUi(
  api: Api,
  page: Page,
  organizationName: string,
  unique: string,
) {
  const name = `Admin UI Office ${unique}`;
  const code = `ADMIN-UI-OFFICE-${unique}`.toUpperCase();

  await page.goto(`/${organizationName}/${api.session.projectSlug}/warehouses`);
  await expect(page.getByTestId('page-title')).toHaveText('Warehouse');
  await page.getByTestId('warehouse-create-button').click();
  await page.getByTestId('create-warehouse-name-input').fill(name);
  await page.getByTestId('create-warehouse-code-input').fill(code);
  await page.getByTestId('submit-create-warehouse-form-button').click();
  await expect(page.getByTestId('create-warehouse-modal')).toBeHidden({
    timeout: 30_000,
  });

  let warehouse: { id: string; code: string; name: string } | null = null;

  await expect
    .poll(async () => {
      const { data } = await api.admin.query('inventory-api/WarehouseFindMany', {
        variables: {
          first: 20,
          where: { code: { _eq: code } },
        },
      });

      warehouse = data.inventoryQuery.warehouses.edges.map((edge) => edge.node)[0] ?? null;

      return warehouse?.id ?? null;
    })
    .not.toBeNull();

  if (!warehouse) {
    throw new Error(`Created warehouse ${code} was not found through the admin API`);
  }

  return warehouse;
}

async function findProductByHandle(api: Api, handle: string) {
  const { data } = await api.admin.query('inventory-api/ProductFindMany', {
    variables: {
      first: 20,
      where: { handle: { _eq: handle } },
    },
  });

  return data.catalogQuery.products.edges.map((edge) => edge.node)[0] ?? null;
}

async function createProductWithVariantsThroughUi(
  api: Api,
  page: Page,
  organizationName: string,
  unique: string,
) {
  const title = `Admin UI Inventory Product ${unique}`;
  const handle = `admin-ui-inventory-product-${unique}`;

  await page.goto(`/${organizationName}/${api.session.projectSlug}/products`);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId('products-create-button').click();
  await page.getByTestId('create-product-title-input').fill(title);
  await page.getByTestId('create-product-handle-input').fill(handle);
  await page.getByTestId('create-product-has-variants-switch').click();
  await page.getByTestId('create-product-option-0-name-input').fill('Color');
  await addTagSelectValue(page, 'create-product-option-0-values-select', 'Black');
  await addTagSelectValue(page, 'create-product-option-0-values-select', 'White');

  const variantRows = page
    .getByTestId('create-product-variants-grid')
    .locator('.ag-center-cols-container .ag-row');
  await expect(variantRows).toHaveCount(2);

  await page.getByTestId('submit-create-product-form-button').click();
  await expect(page.getByTestId('create-product-modal')).toBeHidden({
    timeout: 30_000,
  });

  let product: Awaited<ReturnType<typeof findProductByHandle>> = null;

  await expect
    .poll(async () => {
      product = await findProductByHandle(api, handle);
      return product?.id ?? null;
    })
    .not.toBeNull();

  if (!product) {
    throw new Error(`Created product ${handle} was not found through the admin API`);
  }

  const variants = product.variants.edges.map((edge) => edge.node);
  expect(variants).toHaveLength(2);

  return {
    product,
    title,
    handle,
    variants,
  };
}

async function createDefaultWarehouse(api: Api, unique: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `INV-PAGE-${unique}`.toUpperCase(),
        name: `Inventory Page ${unique}`,
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

async function createTrackedProduct(
  api: Api,
  unique: string,
  productIndex: number,
  variantsPerProduct: number,
): Promise<SeededProduct> {
  const ordinal = productIndex + 1;
  const title = `Inventory Page ${unique} Product ${ordinal}`;
  const handle = `inventory-page-${unique}-${ordinal}`;
  const variantHandles = BASE_VARIANT_NAMES.slice(0, variantsPerProduct).map(
    (name) => `p${ordinal}-${name}`,
  );

  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
        inventoryItem: { tracked: true },
        options: [
          {
            name: 'Variant',
            slug: 'variant',
            values: variantHandles.map((variantHandle) => ({
              name: variantHandle,
              slug: variantHandle,
            })),
          },
        ],
        variants: variantHandles.map((variantHandle) => ({ handle: variantHandle })),
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const product = result.product;
  if (!product?.id) {
    throw new Error('Created product was not returned');
  }

  const variants = (product.variants?.edges ?? []).map((edge) => {
    const inventoryItemId = edge.node.inventoryItem?.id;
    if (!inventoryItemId) {
      throw new Error(`Inventory item was not returned for variant ${edge.node.handle}`);
    }

    return {
      id: edge.node.id,
      productId: product.id as string,
      productTitle: title,
      productHandle: handle,
      handle: edge.node.handle,
      isDefault: edge.node.isDefault,
      inventoryItemId,
      sku: '',
      onHand: 0,
      unavailable: 0,
      reserved: 0,
      available: 0,
    };
  });

  expect(variants).toHaveLength(variantsPerProduct);

  return {
    id: product.id as string,
    title,
    handle,
    variants,
  };
}

async function seedStock(api: Api, warehouseId: string, unique: string, variants: SeededVariant[]) {
  for (const [index, variant] of variants.entries()) {
    const onHand = 30 + index * 3;
    const unavailable = index % 3;
    const sku = `INV-${unique}-${index + 1}`.toUpperCase();

    const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
      variables: {
        input: {
          id: variant.inventoryItemId,
          sku,
          trackInventory: true,
          stock: {
            warehouseId,
            onHand,
            unavailable,
          },
        },
      },
    });

    expect(data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

    variant.sku = sku;
    variant.onHand = onHand;
    variant.unavailable = unavailable;
    variant.reserved = 0;
    variant.available = onHand - unavailable;
  }
}

async function seedInventoryFixture(
  api: Api,
  productCount: number,
  variantsPerProduct: number,
): Promise<InventoryFixture> {
  const unique = crypto.randomUUID().slice(0, 8);
  const warehouse = await createDefaultWarehouse(api, unique);
  const products: SeededProduct[] = [];

  for (let productIndex = 0; productIndex < productCount; productIndex += 1) {
    products.push(await createTrackedProduct(api, unique, productIndex, variantsPerProduct));
  }

  const variants = products.flatMap((product) => product.variants);
  await seedStock(api, warehouse.id, unique, variants);

  return {
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    products,
    variants,
  };
}

function inventoryUrl(organizationName: string, projectSlug: string, warehouseId?: string) {
  const baseUrl = `/${organizationName}/${projectSlug}/inventory`;

  return warehouseId ? `${baseUrl}/${warehouseId}` : baseUrl;
}

async function openInventoryPage(page: Page, url: string, expectedTitle: string) {
  await page.setViewportSize({ width: 1920, height: 1600 });
  await page.goto(url);
  await expect(page.getByTestId('page-title')).toHaveText(expectedTitle);
  await expect(page.getByTestId('inventory-table')).toBeVisible();
}

function variantKey(variant: SeededVariant) {
  return `${variant.productHandle}-${variant.handle}`;
}

function keyByVariantId(variants: SeededVariant[]) {
  return new Map(variants.map((variant) => [variant.id, variantKey(variant)] as const));
}

async function fetchExpectedVariantKeys(
  api: Api,
  fixture: InventoryFixture,
  orderBy: InventoryItemOrder[],
) {
  const keysById = keyByVariantId(fixture.variants);
  const { data } = await api.admin.query('inventory-api/InventoryItems', {
    variables: {
      first: fixture.variants.length,
      where: {
        productId: { _in: fixture.products.map((product) => product.id) },
      },
      orderBy,
    },
  });

  return data.inventoryQuery.inventoryItems.edges.map((edge) => {
    const key = keysById.get(edge.node.variant.id);
    if (!key) {
      throw new Error(`Unexpected variant returned: ${edge.node.variant.id}`);
    }

    return key;
  });
}

async function visibleInventoryVariantKeys(page: Page) {
  return page.locator('[data-testid^="inventory-table-product-cell-"]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const testId = node.getAttribute('data-testid');
      if (!testId) {
        throw new Error('Inventory product cell is missing data-testid');
      }

      return testId.replace('inventory-table-product-cell-', '');
    }),
  );
}

async function expectVisibleVariantOrder(
  page: Page,
  expectedKeys: string[],
  minVisibleRows: number,
) {
  await expect
    .poll(async () => {
      const keys = await visibleInventoryVariantKeys(page);
      if (keys.length < minVisibleRows) {
        return null;
      }

      return keys.slice(0, minVisibleRows);
    })
    .toEqual(expectedKeys.slice(0, minVisibleRows));
}

function inventoryCell(page: Page, variant: SeededVariant, field: string) {
  return page.getByTestId(`inventory-table-${field}-cell-${variantKey(variant)}`);
}

async function editInventoryNumberCell(
  page: Page,
  variant: SeededVariant,
  field: 'on-hand' | 'unavailable',
  value: number,
) {
  await inventoryCell(page, variant, field).scrollIntoViewIfNeeded();
  await inventoryCell(page, variant, field).dblclick();

  const input = page
    .getByTestId('inventory-table')
    .locator('input[type="number"], input.ag-cell-edit-input:not([type="checkbox"])')
    .last();

  await expect(input).toBeVisible();
  await input.fill(String(value));
  await input.press('Enter');
}

async function expectVariantInventoryApiState(
  api: Api,
  warehouseId: string,
  variant: SeededVariant,
  expected: ExpectedInventoryValues,
) {
  await expect
    .poll(
      async () => {
        const { data } = await api.admin.query('inventory-api/InventoryItemByVariant', {
          variables: { variantId: variant.id },
        });
        const item = data.inventoryQuery.inventoryItemByVariant;
        const stock = item?.stock.find((candidate) => candidate.warehouseId === warehouseId);

        return {
          onHand: stock?.quantityOnHand ?? null,
          unavailable: stock?.unavailableQuantity ?? null,
          available: stock?.availableForSale ?? null,
        };
      },
      { timeout: 30_000 },
    )
    .toEqual(expected);
}

async function expectVariantStockInWarehouse(api: Api, warehouseId: string, variantId: string) {
  await expect
    .poll(
      async () => {
        const { data } = await api.admin.query('inventory-api/InventoryItemByVariant', {
          variables: { variantId },
        });
        const item = data.inventoryQuery.inventoryItemByVariant;
        const stock = item?.stock.find((candidate) => candidate.warehouseId === warehouseId);

        return {
          exists: Boolean(stock),
          onHand: stock?.quantityOnHand ?? null,
          unavailable: stock?.unavailableQuantity ?? null,
          available: stock?.availableForSale ?? null,
        };
      },
      { timeout: 30_000 },
    )
    .toEqual({
      exists: true,
      onHand: 0,
      unavailable: 0,
      available: 0,
    });
}

async function addVisiblePickerRowsForProduct(page: Page, productTitle: string, count: number) {
  await expect(page.getByTestId('variant-picker-modal')).toBeVisible();
  const rows = page
    .getByTestId('variant-picker-grid')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ hasText: productTitle });

  await expect(rows).toHaveCount(count);

  for (let index = 0; index < count; index += 1) {
    await rows.nth(index).click();
  }

  await expect(page.getByTestId('submit-variant-picker-form-button')).toBeEnabled();
  await page.getByTestId('submit-variant-picker-form-button').click();
  await expect(page.getByTestId('variant-picker-modal')).toBeHidden();
}

test.describe('Admin inventory page UI', () => {
  test('shows variants in product-first API order and paginates through variants', async ({
    api,
    page,
  }) => {
    const organization = await setupAdminUserAndStore(api, page);
    const fixture = await seedInventoryFixture(api, 7, 4);
    const expectedKeys = await fetchExpectedVariantKeys(api, fixture, [
      { field: 'productName', direction: 'asc' },
    ]);

    await openInventoryPage(
      page,
      inventoryUrl(organization.name, api.session.projectSlug),
      'All Inventory',
    );

    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–20 of 28');
    await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled();
    await expectVisibleVariantOrder(page, expectedKeys, 12);

    const firstVariant = fixture.variants.find(
      (variant) => variantKey(variant) === expectedKeys[0],
    );
    if (!firstVariant) {
      throw new Error('Expected first variant was not found in fixture');
    }

    await expect(inventoryCell(page, firstVariant, 'product-title')).toHaveText(
      firstVariant.productTitle,
    );
    await expect(inventoryCell(page, firstVariant, 'variant-title')).toHaveText(
      firstVariant.handle,
    );
    await expect(inventoryCell(page, firstVariant, 'on-hand')).toHaveText(
      String(firstVariant.onHand),
    );
    await expect(inventoryCell(page, firstVariant, 'unavailable')).toHaveText(
      String(firstVariant.unavailable),
    );
    await expect(inventoryCell(page, firstVariant, 'available')).toHaveText(
      String(firstVariant.available),
    );

    await page.getByTestId('inventory-pagination-next-button').click();
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('21–28 of 28');
    await expectVisibleVariantOrder(page, expectedKeys.slice(20), 8);

    await page.getByTestId('inventory-pagination-prev-button').click();
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–20 of 28');
    await expectVisibleVariantOrder(page, expectedKeys, 12);
  });

  test('edits on-hand and unavailable quantities and persists them through bulk update', async ({
    api,
    page,
  }) => {
    const organization = await setupAdminUserAndStore(api, page);
    const fixture = await seedInventoryFixture(api, 2, 2);
    const expectedByVariantId = new Map<string, ExpectedInventoryValues>();
    const url = inventoryUrl(organization.name, api.session.projectSlug, fixture.warehouseId);

    await openInventoryPage(page, url, fixture.warehouseName);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');

    for (const [index, variant] of fixture.variants.entries()) {
      const updatedOnHand = variant.onHand + 11 + index * 7;
      const updatedUnavailable = variant.unavailable + index + 1;
      const expected = {
        onHand: updatedOnHand,
        unavailable: updatedUnavailable,
        available: updatedOnHand - updatedUnavailable - variant.reserved,
      };

      expectedByVariantId.set(variant.id, expected);

      await editInventoryNumberCell(page, variant, 'on-hand', expected.onHand);
      await editInventoryNumberCell(page, variant, 'unavailable', expected.unavailable);

      await expect(inventoryCell(page, variant, 'on-hand')).toContainText(String(expected.onHand));
      await expect(inventoryCell(page, variant, 'unavailable')).toContainText(
        String(expected.unavailable),
      );
      await expect(inventoryCell(page, variant, 'available')).toContainText(
        String(expected.available),
      );
    }

    await expect(page.getByTestId('editing-panel-changes-label')).toHaveText('Unsaved changes (8)');
    await expect(page.getByTestId('inventory-pagination-next-button')).toBeDisabled();

    await page.getByTestId('editing-panel-save-button').click();
    await expect(page.getByTestId('editing-panel-save-button')).toBeHidden({ timeout: 30_000 });

    for (const variant of fixture.variants) {
      const expected = expectedByVariantId.get(variant.id);
      if (!expected) {
        throw new Error(`Missing expected values for variant ${variant.id}`);
      }

      await expectVariantInventoryApiState(api, fixture.warehouseId, variant, expected);
    }

    await page.goto(url);
    await expect(page.getByTestId('page-title')).toHaveText(fixture.warehouseName);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');

    for (const variant of fixture.variants) {
      const expected = expectedByVariantId.get(variant.id);
      if (!expected) {
        throw new Error(`Missing expected values for variant ${variant.id}`);
      }

      await expect(inventoryCell(page, variant, 'on-hand')).toHaveText(String(expected.onHand));
      await expect(inventoryCell(page, variant, 'unavailable')).toHaveText(
        String(expected.unavailable),
      );
      await expect(inventoryCell(page, variant, 'available')).toHaveText(
        String(expected.available),
      );
    }
  });

  test('creates a warehouse and product, then adds product variants to warehouse inventory', async ({
    api,
    page,
  }) => {
    const organization = await setupAdminUserAndStore(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const warehouse = await createWarehouseThroughUi(api, page, organization.name, unique);
    const product = await createProductWithVariantsThroughUi(api, page, organization.name, unique);
    const warehouseInventoryUrl = inventoryUrl(
      organization.name,
      api.session.projectSlug,
      warehouse.id,
    );

    await openInventoryPage(page, warehouseInventoryUrl, warehouse.name);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('0–0 of 0');

    await page.getByRole('button', { name: 'Create' }).click();
    await addVisiblePickerRowsForProduct(page, product.title, product.variants.length);

    for (const variant of product.variants) {
      await expectVariantStockInWarehouse(api, warehouse.id, variant.id);
    }

    await page.goto(warehouseInventoryUrl);
    await expect(page.getByTestId('page-title')).toHaveText(warehouse.name);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–2 of 2');

    for (const variant of product.variants) {
      const row: SeededVariant = {
        id: variant.id,
        productId: product.product.id,
        productTitle: product.title,
        productHandle: product.handle,
        handle: variant.handle,
        isDefault: variant.isDefault,
        inventoryItemId: '',
        sku: '',
        onHand: 0,
        unavailable: 0,
        reserved: 0,
        available: 0,
      };

      await expect(
        page.getByTestId(`inventory-table-product-cell-${variantKey(row)}`),
      ).toBeVisible();
      await expect(inventoryCell(page, row, 'on-hand')).toHaveText('0');
      await expect(inventoryCell(page, row, 'unavailable')).toHaveText('0');
      await expect(inventoryCell(page, row, 'available')).toHaveText('0');
    }
  });
});
