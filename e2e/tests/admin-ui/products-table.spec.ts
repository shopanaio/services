import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

const UAH = 'UAH';
type Api = ApiFixtures['api'];

function formatUah(amountMinor: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: UAH,
    currencyDisplay: 'narrowSymbol',
  })
    .format(amountMinor / 100)
    .replace(/\s+/g, '\u00A0');
}

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

async function createCategory(api: Api, name: string, handle: string) {
  const { data } = await api.admin.mutation('category-api/CategoryCreate', {
    variables: { input: { name, handle } },
  });

  const result = data.catalogMutation.categoryCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.category?.id).toBeTruthy();

  return result.category!;
}

async function createVendor(api: Api, name: string) {
  const { data } = await api.admin.mutation('inventory-api/VendorCreate', {
    variables: { input: { name } },
  });

  const result = data.catalogMutation.vendorCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.vendor?.id).toBeTruthy();

  return result.vendor!;
}

async function addProductToCategory(api: Api, categoryId: string, productId: string) {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: {
      input: {
        categoryId,
        productId,
      },
    },
  });

  expect(data.catalogMutation.categoryAddProduct.userErrors).toHaveLength(0);
}

async function openProductsPage(page: Page, api: Api, organizationName: string) {
  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);
  await page.goto(`/${organizationName}/${api.session.projectSlug}/products`);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
}

async function expectVisibleProductTitles(page: Page, expectedTitles: string[]) {
  const rows = page.getByTestId('products-table').locator('.ag-center-cols-container .ag-row');

  await expect(rows).toHaveCount(expectedTitles.length);
  await expect
    .poll(async () => {
      const rowCount = await rows.count();
      const visibleRows = await Promise.all(
        Array.from({ length: rowCount }, async (_, index) => {
          const row = rows.nth(index);
          const rowIndex = Number(await row.getAttribute('row-index'));
          const title =
            (await row.locator('[data-testid^="products-table-title-cell-"]').textContent()) ?? '';

          return { rowIndex, title };
        }),
      );

      return visibleRows
        .sort((left, right) => left.rowIndex - right.rowIndex)
        .map((row) => row.title);
    })
    .toEqual(expectedTitles);
}

test.describe('Admin products table UI', () => {
  test('shows product list view fields in the products table', async ({
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
    const categoryName = `Admin Table Category ${unique}`;
    const brandName = `Admin Table Brand ${unique}`;

    const { data: warehouseData } = await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: {
        input: {
          code: `WH-${unique}`.toUpperCase(),
          name: `Admin Table Warehouse ${unique}`,
          isDefault: true,
        },
      },
    });

    const warehouseResult = warehouseData.inventoryMutation.warehouseCreate;
    expect(warehouseResult.userErrors).toHaveLength(0);
    expect(warehouseResult.warehouse?.id).toBeTruthy();

    const category = await createCategory(api, categoryName, `admin-table-category-${unique}`);
    const vendor = await createVendor(api, brandName);
    expect(category.name).toBe(categoryName);

    const products = Array.from({ length: 5 }, (_, index) => {
      const ordinal = index + 1;
      return {
        title: `Admin Table Product ${unique} ${ordinal}`,
        handle: `admin-table-product-${unique}-${ordinal}`,
        minPriceMinor: ordinal * 10000,
        maxPriceMinor: ordinal * 10000 + 4500,
        smallStock: ordinal * 3,
        largeStock: ordinal * 3 + 2,
      };
    });

    for (const product of products) {
      const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: product.title,
            handle: product.handle,
            options: [
              {
                name: 'Size',
                slug: 'size',
                values: [
                  { name: 'Small', slug: 'small' },
                  { name: 'Large', slug: 'large' },
                ],
              },
            ],
            variants: [{ handle: 'small' }, { handle: 'large' }],
            inventoryItem: { tracked: true },
            vendorId: vendor.id,
          },
        },
      });

      const result = data.catalogMutation.productCreate;
      expect(result.userErrors).toHaveLength(0);
      const createdProduct = result.product;
      expect(createdProduct?.handle).toBe(product.handle);
      expect(createdProduct?.id).toBeTruthy();

      await addProductToCategory(api, category.id, createdProduct!.id);

      const variants = createdProduct?.variants.edges.map((edge) => edge.node) ?? [];
      expect(variants).toHaveLength(2);

      for (const variant of variants) {
        const amountMinor =
          variant.handle === 'small' ? product.minPriceMinor : product.maxPriceMinor;

        const { data: pricingData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
          variables: {
            input: {
              variantId: variant.id,
              currency: UAH,
              amountMinor: String(amountMinor),
            },
          },
        });

        expect(pricingData.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);

        const onHand = variant.handle === 'small' ? product.smallStock : product.largeStock;

        const { data: stockData } = await api.admin.mutation('inventory-api/VariantSetStock', {
          variables: {
            input: {
              id: variant.inventoryItem!.id,
              trackInventory: true,
              stock: {
                warehouseId: warehouseResult.warehouse!.id,
                onHand,
              },
            },
          },
        });

        expect(stockData.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
      }
    }

    await openProductsPage(page, api, organization.name);
    await expect(page.getByTestId('products-pagination-range')).toHaveText('1–5 of 5');

    const table = page.getByTestId('products-table');
    await expect(table.getByRole('columnheader', { name: 'Product' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Min price' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Max price' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Stock' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Brand' })).toBeVisible();

    const rows = page.getByTestId('products-table').locator('.ag-center-cols-container .ag-row');
    await expect(rows).toHaveCount(5);

    for (const product of products) {
      await expect(page.getByTestId(`products-table-title-cell-${product.handle}`)).toHaveText(
        product.title,
      );
      await expect(page.getByTestId(`products-table-min-price-cell-${product.handle}`)).toHaveText(
        formatUah(product.minPriceMinor),
      );
      await expect(page.getByTestId(`products-table-max-price-cell-${product.handle}`)).toHaveText(
        formatUah(product.maxPriceMinor),
      );
      await expect(page.getByTestId(`products-table-inventory-cell-${product.handle}`)).toHaveText(
        `${product.smallStock + product.largeStock} in stock`,
      );
      await expect(page.getByTestId(`products-table-category-cell-${product.handle}`)).toHaveText(
        categoryName,
      );
      await expect(page.getByTestId(`products-table-brand-cell-${product.handle}`)).toHaveText(
        brandName,
      );
    }
  });

  test('paginates products', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);

    for (let index = 0; index < 21; index += 1) {
      const ordinal = String(index + 1).padStart(2, '0');
      const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: `Pagination Product ${unique} ${ordinal}`,
            handle: `pagination-product-${unique}-${ordinal}`,
          },
        },
      });

      expect(data.catalogMutation.productCreate.userErrors).toHaveLength(0);
    }

    await openProductsPage(page, api, organization.name);

    const rows = page.getByTestId('products-table').locator('.ag-center-cols-container .ag-row');
    await expect(page.getByTestId('products-pagination-range')).toHaveText('1–20 of 21');
    await expect(rows).toHaveCount(20);

    await page.getByTestId('products-pagination-next-button').click();
    await expect(page.getByTestId('products-pagination-range')).toHaveText('21–21 of 21');
    await expect(rows).toHaveCount(1);

    await page.getByTestId('products-pagination-prev-button').click();
    await expect(page.getByTestId('products-pagination-range')).toHaveText('1–20 of 21');
    await expect(rows).toHaveCount(20);
  });

  test('sorts product table columns', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({
      currencies: [UAH],
      defaultCurrency: UAH,
    });

    const unique = crypto.randomUUID().slice(0, 8);
    const products = [
      { title: 'Gamma', category: 'Category C', brand: 'Brand B', min: 30000, max: 90000 },
      { title: 'Alpha', category: 'Category A', brand: 'Brand D', min: 10000, max: 80000 },
      { title: 'Echo', category: 'Category E', brand: 'Brand A', min: 50000, max: 70000 },
      { title: 'Bravo', category: 'Category B', brand: 'Brand E', min: 20000, max: 60000 },
      { title: 'Delta', category: 'Category D', brand: 'Brand C', min: 40000, max: 100000 },
    ].map((product) => ({
      ...product,
      title: `${product.title} ${unique}`,
      category: `${product.category} ${unique}`,
      brand: `${product.brand} ${unique}`,
      handle: `sort-${product.title.toLowerCase()}-${unique}`,
    }));

    for (const product of products) {
      const category = await createCategory(
        api,
        product.category,
        `sort-category-${product.title.toLowerCase().replace(/\s+/g, '-')}`,
      );
      const vendor = await createVendor(api, product.brand);

      const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: {
          input: {
            title: product.title,
            handle: product.handle,
            options: [
              {
                name: 'Size',
                slug: 'size',
                values: [
                  { name: 'Small', slug: 'small' },
                  { name: 'Large', slug: 'large' },
                ],
              },
            ],
            variants: [{ handle: 'small' }, { handle: 'large' }],
            vendorId: vendor.id,
          },
        },
      });

      const result = data.catalogMutation.productCreate;
      expect(result.userErrors).toHaveLength(0);
      const createdProduct = result.product!;

      await addProductToCategory(api, category.id, createdProduct.id);

      const variants = createdProduct.variants.edges.map((edge) => edge.node);
      expect(variants).toHaveLength(2);

      for (const variant of variants) {
        const amountMinor = variant.handle === 'small' ? product.min : product.max;
        const { data: pricingData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
          variables: {
            input: {
              variantId: variant.id,
              currency: UAH,
              amountMinor: String(amountMinor),
            },
          },
        });

        expect(pricingData.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);
      }
    }

    await openProductsPage(page, api, organization.name);
    await expect(page.getByTestId('products-pagination-range')).toHaveText('1–5 of 5');

    const sortByHeader = async (headerName: string, expectedTitles: string[]) => {
      await page.getByTestId('products-table').getByRole('columnheader', { name: headerName }).click();
      await expectVisibleProductTitles(page, expectedTitles);
    };

    await sortByHeader('Product', products.map((product) => product.title).sort());
    await sortByHeader(
      'Category',
      [...products].sort((left, right) => left.category.localeCompare(right.category)).map((p) => p.title),
    );
    await sortByHeader(
      'Min price',
      [...products].sort((left, right) => left.min - right.min).map((p) => p.title),
    );
    await sortByHeader(
      'Max price',
      [...products].sort((left, right) => left.max - right.max).map((p) => p.title),
    );
    await sortByHeader(
      'Brand',
      [...products].sort((left, right) => left.brand.localeCompare(right.brand)).map((p) => p.title),
    );
  });
});
