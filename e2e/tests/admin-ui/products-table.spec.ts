import { test } from '@fixtures/base.extend';
import { expect, type Page } from '@playwright/test';

const UAH = 'UAH';

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

    const { data: categoryData } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          name: categoryName,
          handle: `admin-table-category-${unique}`,
        },
      },
    });

    const categoryResult = categoryData.catalogMutation.categoryCreate;
    expect(categoryResult.userErrors).toHaveLength(0);
    expect(categoryResult.category?.name).toBe(categoryName);

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
          },
        },
      });

      const result = data.catalogMutation.productCreate;
      expect(result.userErrors).toHaveLength(0);
      const createdProduct = result.product;
      expect(createdProduct?.handle).toBe(product.handle);
      expect(createdProduct?.id).toBeTruthy();

      const { data: addProductData } = await api.admin.mutation('category-api/CategoryAddProduct', {
        variables: {
          input: {
            categoryId: categoryResult.category!.id,
            productId: createdProduct!.id,
          },
        },
      });

      expect(addProductData.catalogMutation.categoryAddProduct.userErrors).toHaveLength(0);

      const { data: featuresData } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
        variables: {
          input: {
            productId: createdProduct!.id,
            features: [
              {
                index: [0],
                isGroup: false,
                name: 'Brand',
                slug: 'brand',
                values: [{ index: 0, name: brandName, slug: `brand-${unique}` }],
              },
            ],
          },
        },
      });

      expect(featuresData.catalogMutation.productFeaturesSync.userErrors).toHaveLength(0);

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

    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(productsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Products');
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
});
