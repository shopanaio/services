import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

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
  return createWarehouse(api, unique, true);
}

async function createWarehouse(api: Api, unique: string, isDefault = false) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `INV-PAGE-${unique}`.toUpperCase(),
        name: `Inventory Page ${unique}`,
        isDefault,
      },
    },
  });

  const result = data.inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);

  const warehouse = result.warehouse;
  if (!warehouse?.id) {
    throw new Error('Warehouse was not returned');
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

async function seedStock(
  api: Api,
  warehouseId: string,
  unique: string,
  variants: SeededVariant[],
  options: { quantityOffset?: number; updateFixture?: boolean } = {},
) {
  for (const [index, variant] of variants.entries()) {
    const onHand = 30 + index * 3 + (options.quantityOffset ?? 0);
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

    if (options.updateFixture !== false) {
      variant.sku = sku;
      variant.onHand = onHand;
      variant.unavailable = unavailable;
      variant.reserved = 0;
      variant.available = onHand - unavailable;
    }
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

  return warehouseId ? `${baseUrl}/${encodeURIComponent(warehouseId)}` : baseUrl;
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

function inventoryCell(page: Page, variant: SeededVariant, field: string) {
  return page.getByTestId(`inventory-table-${field}-cell-${variantKey(variant)}`);
}

function expectedInventoryValues(variant: SeededVariant, onHand: number, unavailable: number) {
  return {
    onHand,
    unavailable,
    available: onHand - unavailable - variant.reserved,
  };
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

async function expectInventoryPageValues(
  page: Page,
  variants: SeededVariant[],
  expectedByVariantId: Map<string, ExpectedInventoryValues>,
) {
  for (const variant of variants) {
    const expected = expectedByVariantId.get(variant.id);
    if (!expected) {
      throw new Error(`Missing expected values for variant ${variant.id}`);
    }

    await expect(inventoryCell(page, variant, 'on-hand')).toHaveText(String(expected.onHand));
    await expect(inventoryCell(page, variant, 'unavailable')).toHaveText(
      String(expected.unavailable),
    );
    await expect(inventoryCell(page, variant, 'available')).toHaveText(String(expected.available));
  }
}

test.describe('Admin inventory page UI', () => {
  test('edits warehouse-scoped quantities and persists them through bulk update', async ({
    api,
    page,
  }) => {
    test.slow();

    const organization = await setupAdminUserAndStore(api, page);
    const fixture = await seedInventoryFixture(api, 2, 2);
    const unique = crypto.randomUUID().slice(0, 8);
    const secondWarehouseQuantityOffset = 70;
    const secondWarehouse = await createWarehouse(api, `${unique}-second`);
    await seedStock(api, secondWarehouse.id, `${unique}-second`, fixture.variants, {
      quantityOffset: secondWarehouseQuantityOffset,
      updateFixture: false,
    });

    const expectedByWarehouse = new Map<string, Map<string, ExpectedInventoryValues>>([
      [
        fixture.warehouseId,
        new Map(
          fixture.variants.map((variant) => [
            variant.id,
            expectedInventoryValues(variant, variant.onHand, variant.unavailable),
          ] as const),
        ),
      ],
      [
        secondWarehouse.id,
        new Map(
          fixture.variants.map((variant, index) => {
            const onHand = 30 + index * 3 + secondWarehouseQuantityOffset;
            const unavailable = index % 3;

            return [variant.id, expectedInventoryValues(variant, onHand, unavailable)] as const;
          }),
        ),
      ],
    ]);

    const warehouseEdits = [
      {
        id: fixture.warehouseId,
        name: fixture.warehouseName,
        variantIndexes: [0, 1],
        onHandBase: 111,
        unavailableBase: 4,
      },
      {
        id: secondWarehouse.id,
        name: secondWarehouse.name,
        variantIndexes: [2, 3],
        onHandBase: 211,
        unavailableBase: 7,
      },
    ];

    for (const warehouseEdit of warehouseEdits) {
      const url = inventoryUrl(organization.name, api.session.projectSlug, warehouseEdit.id);
      const expectedForWarehouse = expectedByWarehouse.get(warehouseEdit.id);
      if (!expectedForWarehouse) {
        throw new Error(`Missing expected values for warehouse ${warehouseEdit.id}`);
      }

      await openInventoryPage(page, url, warehouseEdit.name);
      await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');

      for (const [editIndex, variantIndex] of warehouseEdit.variantIndexes.entries()) {
        const variant = fixture.variants[variantIndex];
        if (!variant) {
          throw new Error(`Missing fixture variant at index ${variantIndex}`);
        }

        const expected = expectedInventoryValues(
          variant,
          warehouseEdit.onHandBase + editIndex * 13,
          warehouseEdit.unavailableBase + editIndex,
        );

        expectedForWarehouse.set(variant.id, expected);

        await editInventoryNumberCell(page, variant, 'on-hand', expected.onHand);
        await editInventoryNumberCell(page, variant, 'unavailable', expected.unavailable);

        await expect(inventoryCell(page, variant, 'on-hand')).toContainText(
          String(expected.onHand),
        );
        await expect(inventoryCell(page, variant, 'unavailable')).toContainText(
          String(expected.unavailable),
        );
        await expect(inventoryCell(page, variant, 'available')).toContainText(
          String(expected.available),
        );
      }

      await expect(page.getByTestId('editing-panel-changes-label')).toHaveText(
        'Unsaved changes (4)',
      );
      await expect(page.getByTestId('inventory-pagination-next-button')).toBeDisabled();

      await page.getByTestId('editing-panel-save-button').click();
      await expect(page.getByTestId('editing-panel-save-button')).toBeHidden({ timeout: 30_000 });

      for (const [warehouseId, expectedByVariantId] of expectedByWarehouse) {
        for (const variant of fixture.variants) {
          const expected = expectedByVariantId.get(variant.id);
          if (!expected) {
            throw new Error(`Missing expected values for variant ${variant.id}`);
          }

          await expectVariantInventoryApiState(api, warehouseId, variant, expected);
        }
      }

      await page.goto(url);
      await expect(page.getByTestId('page-title')).toHaveText(warehouseEdit.name);
      await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');
      await expectInventoryPageValues(page, fixture.variants, expectedForWarehouse);
    }

    for (const warehouseEdit of warehouseEdits) {
      const expectedForWarehouse = expectedByWarehouse.get(warehouseEdit.id);
      if (!expectedForWarehouse) {
        throw new Error(`Missing expected values for warehouse ${warehouseEdit.id}`);
      }

      await openInventoryPage(
        page,
        inventoryUrl(organization.name, api.session.projectSlug, warehouseEdit.id),
        warehouseEdit.name,
      );
      await expect(page.getByTestId('inventory-pagination-range')).toHaveText('1–4 of 4');
      await expectInventoryPageValues(page, fixture.variants, expectedForWarehouse);
    }
  });
});
