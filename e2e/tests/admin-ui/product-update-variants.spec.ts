import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface VariantFixture {
  id: string;
  handle: string;
  inventoryItemId: string;
}

interface ExpectedVariantState {
  price: number;
  compareAtPrice: number;
  sku: string;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  costPrice: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

const UAH = 'UAH';

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

async function createDefaultWarehouse(api: Api, unique: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `VAR-EDIT-${unique}`.toUpperCase(),
        name: `Variants Edit ${unique}`,
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

async function createProductWithVariants(api: Api, unique: string) {
  const title = `Variants Modal Product ${unique}`;
  const handle = `variants-modal-product-${unique}`;

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
              { name: 'Black', slug: 'black' },
              { name: 'White', slug: 'white' },
            ],
          },
        ],
        variants: [{ handle: 'black' }, { handle: 'white' }],
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const product = result.product;
  if (!product?.id) {
    throw new Error('Created product was not returned');
  }

  const variants = (product.variants?.edges ?? [])
    .map((edge) => {
      const inventoryItemId = edge.node.inventoryItem?.id;
      if (!inventoryItemId) {
        throw new Error(`Inventory item was not returned for ${edge.node.handle}`);
      }

      return {
        id: edge.node.id,
        handle: edge.node.handle,
        inventoryItemId,
      };
    })
    .sort((left, right) => left.handle.localeCompare(right.handle));

  expect(variants).toHaveLength(2);

  return {
    id: product.id as string,
    title,
    handle,
    variants,
  };
}

async function seedVariantBaseline(
  api: Api,
  productId: string,
  warehouseId: string,
  unique: string,
  variants: VariantFixture[],
) {
  for (const [index, variant] of variants.entries()) {
    const sku = `VAR-${unique}-${variant.handle}`.toUpperCase();
    const price = 10000 + index * 1000;
    const compareAtPrice = price + 2500;
    const costPrice = 4000 + index * 500;
    const onHand = 15 + index;
    const unavailable = 1 + index;
    const weight = 300 + index * 20;
    const length = 100 + index * 10;
    const width = 50 + index * 5;
    const height = 25 + index * 2;

    const stockData = await api.admin.mutation('inventory-api/VariantSetStock', {
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
    expect(stockData.data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

    const pricingData = await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId: variant.id,
          currency: UAH,
          amountMinor: String(price),
          compareAtMinor: String(compareAtPrice),
        },
      },
    });
    expect(pricingData.data.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);

    const costData = await api.admin.mutation('inventory-api/VariantSetCost', {
      variables: {
        input: {
          id: variant.inventoryItemId,
          unitCost: {
            currency: UAH,
            amountMinor: String(costPrice),
          },
        },
      },
    });
    expect(costData.data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

    const weightData = await api.admin.mutation('inventory-api/VariantSetWeight', {
      variables: {
        productId,
        variantId: variant.id,
        weight,
      },
    });
    expect(weightData.data.catalogMutation.productUpdate.userErrors).toHaveLength(0);

    const dimensionsData = await api.admin.mutation('inventory-api/VariantSetDimensions', {
      variables: {
        productId,
        variantId: variant.id,
        length,
        width,
        height,
      },
    });
    expect(dimensionsData.data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
  }
}

function formatUah(amountMinor: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: UAH,
    currencyDisplay: 'narrowSymbol',
  })
    .format(amountMinor / 100)
    .replace(/\s+/g, '\u00A0');
}

async function openProductDetails(page: Page, productsUrl: string, handle: string, title: string) {
  await page.setViewportSize({ width: 1920, height: 1400 });
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();

  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(title);
  await expect(page.getByTestId('product-variants-section')).toBeVisible();
}

async function openEditVariantsModal(page: Page) {
  await page.getByTestId('product-variants-edit-action-button').click();
  await page.getByTestId('product-variants-edit-action-button-menu-item').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeVisible();
  await expect(page.getByTestId('variants-editor-grid')).toBeVisible();
}

async function showEditorColumns(page: Page, labels: string[]) {
  await page.getByTestId('variants-columns-button').click();

  for (const label of labels) {
    const checkbox = page.getByLabel(label, { exact: true });
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  await page.getByTestId('variants-columns-button').click();
}

function variantEditorCell(page: Page, variantId: string, field: string) {
  return page.getByTestId(`variants-editor-cell-${field}-${variantId}`);
}

async function editVariantCell(
  page: Page,
  variantId: string,
  field:
    | 'price'
    | 'compareAtPrice'
    | 'costPrice'
    | 'sku'
    | 'onHand'
    | 'unavailable'
    | 'weight'
    | 'length'
    | 'width'
    | 'height',
  value: string | number,
) {
  const grid = page.getByTestId('variants-editor-grid');
  const cell = variantEditorCell(page, variantId, field);

  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();

  const input = grid.locator('input.ag-input-field-input, input.ag-cell-edit-input').last();
  await expect(input).toBeVisible();
  await input.fill(String(value));
  await input.press('Enter');
}

async function saveEditVariantsModal(page: Page) {
  await page.getByTestId('submit-edit-variants-form-button').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeHidden();
}

async function editAllVariantFields(
  page: Page,
  variantId: string,
  expected: ExpectedVariantState,
) {
  await editVariantCell(page, variantId, 'price', expected.price);
  await editVariantCell(page, variantId, 'compareAtPrice', expected.compareAtPrice);
  await editVariantCell(page, variantId, 'costPrice', expected.costPrice);
  await editVariantCell(page, variantId, 'sku', expected.sku);
  await editVariantCell(page, variantId, 'onHand', expected.onHand);
  await editVariantCell(page, variantId, 'unavailable', expected.unavailable);
  await editVariantCell(page, variantId, 'weight', expected.weight);
  await editVariantCell(page, variantId, 'length', expected.length);
  await editVariantCell(page, variantId, 'width', expected.width);
  await editVariantCell(page, variantId, 'height', expected.height);
}

async function expectVariantApiState(
  api: Api,
  warehouseId: string,
  variantId: string,
  expected: ExpectedVariantState,
) {
  await expect
    .poll(
      async () => {
        const pricingData = await api.admin.query('inventory-api/WidgetPricing', {
          variables: {
            input: {
              variantId,
              currency: UAH,
              first: 10,
            },
          },
        });
        const inventoryData = await api.admin.query('inventory-api/InventoryItemByVariant', {
          variables: { variantId },
        });
        const pricing = pricingData.data.widgetQuery.pricing.currentPrice;
        const item = inventoryData.data.inventoryQuery.inventoryItemByVariant;
        const stock = item?.stock.find((candidate) => candidate.warehouseId === warehouseId);

        return {
          price: pricing?.amountMinor ?? null,
          compareAtPrice: pricing?.compareAtMinor ?? null,
          sku: item?.sku ?? null,
          onHand: stock?.quantityOnHand ?? null,
          unavailable: stock?.unavailableQuantity ?? null,
          reserved: stock?.reservedQuantity ?? null,
          available: stock?.availableForSale ?? null,
          costPrice: item?.unitCost?.amountMinor ?? null,
          weight: item?.variant?.weight?.value ?? null,
          length: item?.variant?.dimensions?.length ?? null,
          width: item?.variant?.dimensions?.width ?? null,
          height: item?.variant?.dimensions?.height ?? null,
        };
      },
      { timeout: 20_000 },
    )
    .toEqual(expected);
}

async function expectVariantEditorCells(
  page: Page,
  variantId: string,
  expected: ExpectedVariantState,
) {
  await expect(variantEditorCell(page, variantId, 'price')).toHaveText(formatUah(expected.price));
  await expect(variantEditorCell(page, variantId, 'compareAtPrice')).toHaveText(
    formatUah(expected.compareAtPrice),
  );
  await expect(variantEditorCell(page, variantId, 'costPrice')).toHaveText(
    formatUah(expected.costPrice),
  );
  await expect(variantEditorCell(page, variantId, 'sku')).toHaveText(expected.sku);
  await expect(variantEditorCell(page, variantId, 'onHand')).toHaveText(String(expected.onHand));
  await expect(variantEditorCell(page, variantId, 'unavailable')).toHaveText(
    String(expected.unavailable),
  );
  await expect(variantEditorCell(page, variantId, 'reserved')).toHaveText(
    String(expected.reserved),
  );
  await expect(variantEditorCell(page, variantId, 'available')).toHaveText(
    String(expected.available),
  );
  await expect(variantEditorCell(page, variantId, 'weight')).toHaveText(String(expected.weight));
  await expect(variantEditorCell(page, variantId, 'length')).toHaveText(String(expected.length));
  await expect(variantEditorCell(page, variantId, 'width')).toHaveText(String(expected.width));
  await expect(variantEditorCell(page, variantId, 'height')).toHaveText(String(expected.height));
}

test.describe('Admin product details variants update UI', () => {
  test.setTimeout(90_000);

  test('edits and saves every editable field in the variants modal', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({
      currencies: [UAH],
      defaultCurrency: UAH,
    });

    const unique = crypto.randomUUID().slice(0, 8);
    const warehouse = await createDefaultWarehouse(api, unique);
    const product = await createProductWithVariants(api, unique);
    await seedVariantBaseline(api, product.id, warehouse.id, unique, product.variants);

    const targetVariant = product.variants.find((variant) => variant.handle === 'black');
    if (!targetVariant) {
      throw new Error('Target variant was not created');
    }

    const expected: ExpectedVariantState = {
      price: 24900,
      compareAtPrice: 27900,
      sku: `VAR-${unique}-UPDATED`.toUpperCase(),
      onHand: 42,
      unavailable: 5,
      reserved: 0,
      available: 37,
      costPrice: 12345,
      weight: 765,
      length: 321,
      width: 123,
      height: 87,
    };
    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, product.handle, product.title);

    await openEditVariantsModal(page);
    await showEditorColumns(page, ['Compare at', 'Cost', 'Weight', 'Length', 'Width', 'Height']);
    await editAllVariantFields(page, targetVariant.id, expected);
    await expect(page.getByTestId('submit-edit-variants-form-button')).toBeEnabled();
    await saveEditVariantsModal(page);

    await expectVariantApiState(api, warehouse.id, targetVariant.id, expected);

    await openEditVariantsModal(page);
    await showEditorColumns(page, ['Compare at', 'Cost', 'Weight', 'Length', 'Width', 'Height']);
    await expectVariantEditorCells(page, targetVariant.id, expected);
  });
});
