import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface VariantFixture {
  id: string;
  handle: string;
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

async function createProductWithFourVariants(api: Api, unique: string) {
  const title = `Admin Pricing Product ${unique}`;
  const handle = `admin-pricing-product-${unique}`;

  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
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

  const variants = (product.variants?.edges ?? []).map((edge) => ({
    id: edge.node.id,
    handle: edge.node.handle,
  }));

  expect(variants).toHaveLength(4);

  return {
    productId: product.id as string,
    title,
    handle,
    variants,
  };
}

function formatUah(amountMinor: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: UAH,
  })
    .format(amountMinor / 100)
    .replace('₴', 'грн.')
    .replace(/\s+/g, '\u00A0');
}

function formatEditorPrice(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pricingBlock(page: Page) {
  return page.getByTestId('pricing-widget');
}

async function openProductDetails(page: Page, productsUrl: string, handle: string, title: string) {
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();

  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(title);
}

async function openEditPricesModal(page: Page) {
  await page.getByTestId('pricing-widget-actions-button').click();
  await page.getByTestId('pricing-widget-edit-prices-menu-item').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeVisible();
}

async function openPriceHistoryModal(page: Page) {
  await page.getByTestId('pricing-widget-actions-button').click();
  await page.getByTestId('pricing-widget-view-history-menu-item').click();
  await expect(page.getByTestId('price-history-modal')).toBeVisible();
}

function editVariantsGrid(page: Page) {
  return page.getByTestId('variants-editor-grid');
}

function variantEditorCell(page: Page, variantId: string, field: string) {
  return page.getByTestId(`variants-editor-cell-${field}-${variantId}`);
}

async function editVariantPriceCell(page: Page, variantId: string, value: number | null) {
  const grid = editVariantsGrid(page);
  const cell = variantEditorCell(page, variantId, 'price');
  await cell.dblclick();
  const input = grid.locator('input.ag-input-field-input, input.ag-cell-edit-input').last();
  await input.fill(value === null ? '' : String(value));
  await input.press('Enter');
}

async function saveEditPricesModal(page: Page) {
  await page.getByTestId('submit-edit-variants-form-button').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeHidden();
}

async function expectWidgetCurrentPrice(page: Page, variant: VariantFixture, amountMinor: number) {
  const block = pricingBlock(page);

  await page.getByTestId('pricing-widget-variant-select-button').click();
  await page.getByTestId(`pricing-widget-variant-option-${variant.id}`).click();

  await expect(block.getByTestId('pricing-widget-current-price')).toHaveText(
    formatUah(amountMinor),
  );
}

async function expectHistoryModalVariantPriceHistory(
  page: Page,
  variant: VariantFixture,
  expectedAmountsMinorNewestFirst: number[],
) {
  await page.getByTestId('price-history-variant-select-button').click();
  await page.getByTestId(`price-history-variant-option-${variant.id}`).click();

  await expect(page.getByTestId('price-history-current-price')).toHaveText(
    formatUah(expectedAmountsMinorNewestFirst[0]),
  );
  await expect(page.getByTestId('price-history-changes-count')).toContainText(
    String(expectedAmountsMinorNewestFirst.length),
  );

  for (const [index, amountMinor] of expectedAmountsMinorNewestFirst.entries()) {
    await expect(page.getByTestId(`price-history-timeline-item-${index}`)).toContainText(
      formatUah(amountMinor),
    );
  }
}

async function assertWidgetApiPrice(api: Api, variantId: string, amountMinor: number) {
  await expect
    .poll(async () => {
      const { data } = await api.admin.query('inventory-api/WidgetPricing', {
        variables: {
          input: {
            variantId,
            currency: UAH,
            first: 10,
          },
        },
      });

      return data.widgetQuery.pricing.currentPrice?.amountMinor ?? null;
    })
    .toBe(amountMinor);
}

async function setVariantPrices(api: Api, variants: VariantFixture[], amountsMinor: number[]) {
  for (const [index, variant] of variants.entries()) {
    const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId: variant.id,
          currency: UAH,
          amountMinor: String(amountsMinor[index]),
        },
      },
    });

    expect(data.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);
  }
}

test.describe('Admin product pricing widget UI', () => {
  test('updates four variant prices through UI and reflects repeated API price changes', async ({
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
    const { title, handle, variants } = await createProductWithFourVariants(api, unique);
    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;
    const initialApiAmounts = [10100, 10200, 10300, 10400];
    await setVariantPrices(api, variants, initialApiAmounts);

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, handle, title);

    await openEditPricesModal(page);

    const grid = editVariantsGrid(page);
    await expect(grid).toBeVisible();

    const uiAmounts = [12500, 13600, 14700, 15800];
    for (const [index, variant] of variants.entries()) {
      await expect(variantEditorCell(page, variant.id, 'price')).toBeVisible();
      await editVariantPriceCell(page, variant.id, uiAmounts[index]);
    }

    await saveEditPricesModal(page);

    for (const [index, variant] of variants.entries()) {
      await assertWidgetApiPrice(api, variant.id, uiAmounts[index]);
      await expectWidgetCurrentPrice(page, variant, uiAmounts[index]);
    }

    const apiAmounts = [21100, 22200, 23300, 24400];
    const intermediateApiAmounts = [18100, 19200, 20300, 21400];
    await setVariantPrices(api, variants, intermediateApiAmounts);
    await setVariantPrices(api, variants, apiAmounts);

    await page.reload();
    await openProductDetails(page, productsUrl, handle, title);

    await openPriceHistoryModal(page);

    for (const [index, variant] of variants.entries()) {
      await expectHistoryModalVariantPriceHistory(page, variant, [
        apiAmounts[index],
        intermediateApiAmounts[index],
        uiAmounts[index],
        initialApiAmounts[index],
      ]);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('price-history-modal')).toBeHidden();

    await openEditPricesModal(page);

    const reopenedGrid = editVariantsGrid(page);
    await expect(reopenedGrid).toBeVisible();

    for (const [index, variant] of variants.entries()) {
      await expect(variantEditorCell(page, variant.id, 'price')).toHaveText(
        formatEditorPrice(apiAmounts[index]),
      );
    }
  });
});
