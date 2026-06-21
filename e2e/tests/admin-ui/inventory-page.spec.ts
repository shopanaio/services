import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];
type SortDirection = 'asc' | 'desc';
type VariantOrderField = 'productId' | 'id';

interface VariantOrder {
  field: VariantOrderField;
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
  products: SeededProduct[];
  variants: SeededVariant[];
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
  const firstNameInput = page.getByPlaceholder('First name');
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByPlaceholder('Last name').fill('User');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(firstNameInput).toBeHidden();
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
    products,
    variants,
  };
}

function inventoryUrl(organizationName: string, projectSlug: string) {
  return `/${organizationName}/${projectSlug}/inventory`;
}

async function openInventoryPage(page: Page, url: string) {
  await page.setViewportSize({ width: 1920, height: 1600 });
  await page.goto(url);
  await expect(page.getByTestId('page-title')).toHaveText('Inventory');
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
  orderBy: VariantOrder[],
) {
  const keysById = keyByVariantId(fixture.variants);
  const { data } = await api.admin.query('catalog-api/VariantFindMany', {
    variables: {
      first: fixture.variants.length,
      where: {
        productId: { _in: fixture.products.map((product) => product.id) },
      },
      orderBy,
    },
  });

  return data.catalogQuery.variants.edges.map((edge) => {
    const key = keysById.get(edge.node.id);
    if (!key) {
      throw new Error(`Unexpected variant returned: ${edge.node.id}`);
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
    .locator('input.ag-input-field-input, input.ag-cell-edit-input')
    .last();

  await expect(input).toBeVisible();
  await input.fill(String(value));
  await input.press('Enter');
}

async function expectVariantInventoryApiState(
  api: Api,
  warehouseId: string,
  variant: SeededVariant,
  expected: { onHand: number; unavailable: number; available: number },
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

test.describe('Admin inventory page UI', () => {
  test('shows variants in product-first API order and paginates through variants', async ({
    api,
    page,
  }) => {
    const organization = await setupAdminUserAndStore(api, page);
    const fixture = await seedInventoryFixture(api, 7, 4);
    const expectedKeys = await fetchExpectedVariantKeys(api, fixture, [
      { field: 'productId', direction: 'asc' },
      { field: 'id', direction: 'asc' },
    ]);

    await openInventoryPage(page, inventoryUrl(organization.name, api.session.projectSlug));

    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–20 of 28');
    await expectVisibleVariantOrder(page, expectedKeys, 12);

    const firstVariant = fixture.variants.find((variant) => variantKey(variant) === expectedKeys[0]);
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
    const targetVariant = fixture.variants[1];
    const updatedOnHand = targetVariant.onHand + 11;
    const updatedUnavailable = targetVariant.unavailable + 2;
    const updatedAvailable = updatedOnHand - updatedUnavailable - targetVariant.reserved;
    const url = inventoryUrl(organization.name, api.session.projectSlug);

    await openInventoryPage(page, url);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');

    await editInventoryNumberCell(page, targetVariant, 'on-hand', updatedOnHand);
    await editInventoryNumberCell(page, targetVariant, 'unavailable', updatedUnavailable);

    await expect(page.getByTestId('editing-panel-changes-label')).toHaveText(
      'Unsaved changes (2)',
    );
    await expect(inventoryCell(page, targetVariant, 'on-hand')).toContainText(
      String(updatedOnHand),
    );
    await expect(inventoryCell(page, targetVariant, 'unavailable')).toContainText(
      String(updatedUnavailable),
    );
    await expect(inventoryCell(page, targetVariant, 'available')).toContainText(
      String(updatedAvailable),
    );
    await expect(page.getByTestId('inventory-pagination-next-button')).toBeDisabled();

    await page.getByTestId('editing-panel-save-button').click();
    await expect(page.getByTestId('editing-panel-save-button')).toBeHidden({ timeout: 30_000 });

    await expectVariantInventoryApiState(api, fixture.warehouseId, targetVariant, {
      onHand: updatedOnHand,
      unavailable: updatedUnavailable,
      available: updatedAvailable,
    });

    await page.goto(url);
    await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');
    await expect(inventoryCell(page, targetVariant, 'on-hand')).toHaveText(String(updatedOnHand));
    await expect(inventoryCell(page, targetVariant, 'unavailable')).toHaveText(
      String(updatedUnavailable),
    );
    await expect(inventoryCell(page, targetVariant, 'available')).toHaveText(
      String(updatedAvailable),
    );
  });
});
