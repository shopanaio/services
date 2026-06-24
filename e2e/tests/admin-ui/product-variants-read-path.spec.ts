import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface SeededVariant {
  id: string;
  handle: string;
  inventoryItemId: string;
  color: string;
  size: string;
  sku: string;
  price: number;
  compareAtPrice: number;
  costPrice: number;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

interface ExpectedVariantPage {
  variants: SeededVariant[];
  endCursor: string | null | undefined;
}

const UAH = 'UAH';
const VARIANT_COUNT = 12;
const COLORS = [
  { name: 'Black', slug: 'black' },
  { name: 'White', slug: 'white' },
  { name: 'Red', slug: 'red' },
] as const;
const SIZES = [
  { name: 'Small', slug: 's' },
  { name: 'Medium', slug: 'm' },
  { name: 'Large', slug: 'l' },
  { name: 'XL', slug: 'xl' },
] as const;

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

function formatUah(amountMinor: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: UAH,
    currencyDisplay: 'narrowSymbol',
  })
    .format(amountMinor / 100)
    .replace(/\s+/g, '\u00A0');
}

function variantConfigs() {
  return COLORS.flatMap((color) =>
    SIZES.map((size) => ({
      handle: `${color.slug}-${size.slug}`,
      color: color.name,
      size: size.name,
    })),
  );
}

async function createDefaultWarehouse(api: Api, unique: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `VAR-READ-${unique}`.toUpperCase(),
        name: `Variants Read ${unique}`,
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
  const title = `Variants Read Product ${unique}`;
  const handle = `variants-read-product-${unique}`;
  const variants = variantConfigs();

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
            values: COLORS.map((value) => ({ name: value.name, slug: value.slug })),
          },
          {
            name: 'Size',
            slug: 'size',
            values: SIZES.map((value) => ({ name: value.name, slug: value.slug })),
          },
        ],
        variants: variants.map((variant) => ({ handle: variant.handle })),
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const product = result.product;
  if (!product?.id) {
    throw new Error('Created product was not returned');
  }

  return {
    id: product.id as string,
    title,
    handle,
  };
}

async function fetchProductVariants(api: Api, productId: string) {
  const { data } = await api.admin.query('catalog-api/VariantFindMany', {
    variables: {
      first: VARIANT_COUNT,
      where: {
        productId: { _in: [productId] },
      },
    },
  });

  const edges = data.catalogQuery.variants.edges;
  expect(edges).toHaveLength(VARIANT_COUNT);

  return edges
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
}

async function seedVariantData(
  api: Api,
  warehouseId: string,
  unique: string,
  variants: Array<{ id: string; handle: string; inventoryItemId: string }>,
): Promise<SeededVariant[]> {
  const seeded: SeededVariant[] = [];
  const variantsByHandle = new Map(
    variantConfigs().map((variant) => [variant.handle, variant] as const),
  );

  for (const [index, variant] of variants.entries()) {
    const config = variantsByHandle.get(variant.handle);
    if (!config) {
      throw new Error(`Variant option config was not found for ${variant.handle}`);
    }

    const sku = `VAR-${unique}-${String(index + 1).padStart(2, '0')}`.toUpperCase();
    const price = 10000 + index * 1000;
    const compareAtPrice = price + 2500;
    const costPrice = 4500 + index * 300;
    const onHand = 20 + index;
    const unavailable = index % 4;
    const weight = 400 + index * 10;
    const length = 100 + index;
    const width = 50 + index;
    const height = 25 + index;

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
        input: {
          id: variant.inventoryItemId,
          weight: {
            weightGrams: weight,
          },
        },
      },
    });
    expect(weightData.data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

    const dimensionsData = await api.admin.mutation('inventory-api/VariantSetDimensions', {
      variables: {
        input: {
          id: variant.inventoryItemId,
          dimensions: {
            lengthMm: length,
            widthMm: width,
            heightMm: height,
          },
        },
      },
    });
    expect(dimensionsData.data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

    seeded.push({
      ...variant,
      color: config.color,
      size: config.size,
      sku,
      price,
      compareAtPrice,
      costPrice,
      onHand,
      unavailable,
      reserved: 0,
      available: onHand - unavailable,
      weight,
      length,
      width,
      height,
    });
  }

  return seeded;
}

async function fetchExpectedVariantPage(
  api: Api,
  productId: string,
  variantsById: Map<string, SeededVariant>,
  first: number,
  after?: string | null,
): Promise<ExpectedVariantPage> {
  const { data } = await api.admin.query('inventory-api/ProductVariants', {
    variables: {
      id: productId,
      first,
      after,
    },
  });

  const connection = data.catalogQuery.product?.variants;
  if (!connection) {
    throw new Error('Product variants connection was not returned');
  }

  return {
    variants: connection.edges.map((edge) => {
      const variant = variantsById.get(edge.node.id);
      if (!variant) {
        throw new Error(`Unexpected variant returned: ${edge.node.id}`);
      }

      return variant;
    }),
    endCursor: connection.pageInfo.endCursor,
  };
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
  await page.getByRole('menuitem', { name: 'Edit variants' }).click();
  await expect(page.getByTestId('edit-variants-modal')).toBeVisible();
  await expect(page.getByTestId('variants-editor-grid')).toBeVisible();
}

async function showEditorColumns(page: Page, labels: string[]) {
  await page.getByRole('button', { name: 'Columns' }).click();

  for (const label of labels) {
    const checkbox = page.getByLabel(label, { exact: true });
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  await page.getByRole('button', { name: 'Columns' }).click();
}

function editorCell(page: Page, variantId: string, field: string) {
  return page.getByTestId(`variants-editor-cell-${field}-${variantId}`);
}

function optionEditorCell(page: Page, variantId: string, optionName: string) {
  return page.getByTestId(`variants-editor-cell-option-${optionName}-${variantId}`);
}

async function expectVariantTablePage(page: Page, variants: SeededVariant[]) {
  const rows = page.getByTestId('product-variants-table').locator('tbody tr');
  await expect(rows).toHaveCount(variants.length);

  for (const [index, variant] of variants.entries()) {
    const row = rows.nth(index);
    await expect(row).toContainText(variant.handle);
    await expect(row).toContainText(formatUah(variant.price));
    await expect(row).toContainText(variant.sku);
  }
}

async function expectEditorVariantData(page: Page, variant: SeededVariant) {
  const grid = page.getByTestId('variants-editor-grid');

  await expect(grid.getByText(variant.handle, { exact: true })).toBeVisible();
  await expect(optionEditorCell(page, variant.id, 'Color')).toHaveText(variant.color);
  await expect(optionEditorCell(page, variant.id, 'Size')).toHaveText(variant.size);
  await expect(editorCell(page, variant.id, 'price')).toHaveText(formatUah(variant.price));
  await expect(editorCell(page, variant.id, 'compareAtPrice')).toHaveText(
    formatUah(variant.compareAtPrice),
  );
  await expect(editorCell(page, variant.id, 'costPrice')).toHaveText(formatUah(variant.costPrice));
  await expect(editorCell(page, variant.id, 'sku')).toHaveText(variant.sku);
  await expect(editorCell(page, variant.id, 'onHand')).toHaveText(String(variant.onHand));
  await expect(editorCell(page, variant.id, 'unavailable')).toHaveText(
    String(variant.unavailable),
  );
  await expect(editorCell(page, variant.id, 'reserved')).toHaveText(String(variant.reserved));
  await expect(editorCell(page, variant.id, 'available')).toHaveText(String(variant.available));
  await expect(editorCell(page, variant.id, 'weight')).toHaveText(String(variant.weight));
  await expect(editorCell(page, variant.id, 'length')).toHaveText(String(variant.length));
  await expect(editorCell(page, variant.id, 'width')).toHaveText(String(variant.width));
  await expect(editorCell(page, variant.id, 'height')).toHaveText(String(variant.height));
}

test.describe('Admin product variants read path UI', () => {
  test('shows paginated product variants table and opens editor with all variant data', async ({
    api,
    page,
  }) => {
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
    const variants = await seedVariantData(
      api,
      warehouse.id,
      unique,
      await fetchProductVariants(api, product.id),
    );
    const variantsById = new Map(variants.map((variant) => [variant.id, variant] as const));
    const expectedFirstPage = await fetchExpectedVariantPage(api, product.id, variantsById, 10);
    const expectedSecondPage = await fetchExpectedVariantPage(
      api,
      product.id,
      variantsById,
      10,
      expectedFirstPage.endCursor,
    );
    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, product.handle, product.title);

    await expect(page.getByTestId('product-variants-pagination-range')).toContainText(
      '12 variants',
    );
    await expect(page.getByTestId('product-variants-pagination-prev-button')).toBeDisabled();
    await expect(page.getByTestId('product-variants-pagination-next-button')).toBeEnabled();
    expect(expectedFirstPage.variants).toHaveLength(10);
    await expectVariantTablePage(page, expectedFirstPage.variants);

    await page.getByTestId('product-variants-pagination-next-button').click();
    await expect(page.getByTestId('product-variants-pagination-prev-button')).toBeEnabled();
    await expect(page.getByTestId('product-variants-pagination-next-button')).toBeDisabled();
    expect(expectedSecondPage.variants).toHaveLength(2);
    await expectVariantTablePage(page, expectedSecondPage.variants);

    await openEditVariantsModal(page);
    await showEditorColumns(page, [
      'Compare at',
      'Cost',
      'Weight',
      'Length',
      'Width',
      'Height',
    ]);

    await expect(
      page.getByTestId('variants-editor-grid').locator('.ag-center-cols-container .ag-row'),
    ).toHaveCount(VARIANT_COUNT);

    await expectEditorVariantData(page, variants[0]);
    await expectEditorVariantData(page, variants[9]);
    await expectEditorVariantData(page, variants[10]);
    await expectEditorVariantData(page, variants[11]);
  });
});
