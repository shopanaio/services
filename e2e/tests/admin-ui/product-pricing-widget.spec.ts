import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface VariantFixture {
  id: string;
  handle: string;
}

interface ExpectedPricing {
  amountMinor: number;
  compareAtMinor: number;
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
    currencyDisplay: 'narrowSymbol',
  })
    .format(amountMinor / 100)
    .replace(/\s+/g, '\u00A0');
}

function formatEditorPrice(value: number) {
  return formatUah(value);
}

function formatDiscountPercent(price: ExpectedPricing) {
  return `-${Math.round(((price.compareAtMinor - price.amountMinor) / price.compareAtMinor) * 100)}%`;
}

function formatPriceChangePercent(current: ExpectedPricing, previous: ExpectedPricing) {
  const percentChange = (
    ((current.amountMinor - previous.amountMinor) / previous.amountMinor) *
    100
  ).toFixed(0);

  return `${current.amountMinor > previous.amountMinor ? '+' : ''}${percentChange}%`;
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

async function editVariantPricingCell(
  page: Page,
  variantId: string,
  field: 'price' | 'compareAtPrice',
  value: number | null,
) {
  const grid = editVariantsGrid(page);
  const cell = variantEditorCell(page, variantId, field);
  await cell.dblclick();
  const input = grid.locator('input.ag-input-field-input, input.ag-cell-edit-input').last();
  await input.fill(value === null ? '' : String(value));
  await input.press('Enter');
}

async function saveEditPricesModal(page: Page) {
  await page.getByTestId('submit-edit-variants-form-button').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeHidden();
}

async function expectWidgetCurrentPrice(
  page: Page,
  variant: VariantFixture,
  expected: ExpectedPricing,
) {
  const block = pricingBlock(page);

  await page.getByTestId('pricing-widget-variant-select-button').click();
  await page.getByTestId(`pricing-widget-variant-option-${variant.id}`).click();

  await expect(block.getByTestId('pricing-widget-current-price')).toHaveText(
    formatUah(expected.amountMinor),
  );
  await expect(block).toContainText(formatUah(expected.compareAtMinor));
}

async function expectHistoryModalVariantPriceHistory(
  page: Page,
  variant: VariantFixture,
  expectedPricesNewestFirst: ExpectedPricing[],
) {
  await page.getByTestId('price-history-variant-select-button').click();
  await page.getByTestId(`price-history-variant-option-${variant.id}`).click();

  await expect(page.getByTestId('price-history-current-price')).toHaveText(
    formatUah(expectedPricesNewestFirst[0].amountMinor),
  );
  await expect(page.getByTestId('price-history-modal')).toContainText(
    formatUah(expectedPricesNewestFirst[0].compareAtMinor),
  );
  await expect(page.getByTestId('price-history-changes-count')).toContainText(
    String(expectedPricesNewestFirst.length),
  );

  for (const [index, expected] of expectedPricesNewestFirst.entries()) {
    const item = page.getByTestId(`price-history-timeline-item-${index}`);

    await expect(item).toContainText(formatUah(expected.amountMinor));
    await expect(item).toContainText(formatUah(expected.compareAtMinor));
    await expect(item).toContainText(formatDiscountPercent(expected));

    const previous = expectedPricesNewestFirst[index + 1];
    if (previous) {
      await expect(item).toContainText(formatPriceChangePercent(expected, previous));
    }
  }
}

async function assertWidgetApiPrice(api: Api, variantId: string, expected: ExpectedPricing) {
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

      const currentPrice = data.widgetQuery.pricing.currentPrice;
      return currentPrice
        ? {
            amountMinor: currentPrice.amountMinor,
            compareAtMinor: currentPrice.compareAtMinor,
          }
        : null;
    })
    .toEqual(expected);
}

async function setVariantPrices(api: Api, variants: VariantFixture[], prices: ExpectedPricing[]) {
  for (const [index, variant] of variants.entries()) {
    const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: {
        input: {
          variantId: variant.id,
          currency: UAH,
          amountMinor: String(prices[index].amountMinor),
          compareAtMinor: String(prices[index].compareAtMinor),
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

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, handle, title);

    await openEditPricesModal(page);

    const grid = editVariantsGrid(page);
    await expect(grid).toBeVisible();

    const uiPrices = [
      { amountMinor: 12500, compareAtMinor: 14500 },
      { amountMinor: 13600, compareAtMinor: 15600 },
      { amountMinor: 14700, compareAtMinor: 16700 },
      { amountMinor: 15800, compareAtMinor: 17800 },
    ];
    for (const [index, variant] of variants.entries()) {
      await expect(variantEditorCell(page, variant.id, 'price')).toBeVisible();
      await expect(variantEditorCell(page, variant.id, 'compareAtPrice')).toBeVisible();
      await editVariantPricingCell(page, variant.id, 'price', uiPrices[index].amountMinor);
      await editVariantPricingCell(
        page,
        variant.id,
        'compareAtPrice',
        uiPrices[index].compareAtMinor,
      );
    }

    await saveEditPricesModal(page);

    for (const [index, variant] of variants.entries()) {
      await assertWidgetApiPrice(api, variant.id, uiPrices[index]);
      await expectWidgetCurrentPrice(page, variant, uiPrices[index]);
    }

    const apiPrices = [
      { amountMinor: 21100, compareAtMinor: 24100 },
      { amountMinor: 22200, compareAtMinor: 25200 },
      { amountMinor: 23300, compareAtMinor: 26300 },
      { amountMinor: 24400, compareAtMinor: 27400 },
    ];
    const intermediateApiPrices = [
      { amountMinor: 18100, compareAtMinor: 21100 },
      { amountMinor: 19200, compareAtMinor: 22200 },
      { amountMinor: 20300, compareAtMinor: 23300 },
      { amountMinor: 21400, compareAtMinor: 24400 },
    ];
    await setVariantPrices(api, variants, intermediateApiPrices);
    await setVariantPrices(api, variants, apiPrices);

    await page.reload();
    await openProductDetails(page, productsUrl, handle, title);

    await openPriceHistoryModal(page);

    for (const [index, variant] of variants.entries()) {
      await expectHistoryModalVariantPriceHistory(page, variant, [
        apiPrices[index],
        intermediateApiPrices[index],
        uiPrices[index],
      ]);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('price-history-modal')).toBeHidden();

    await openEditPricesModal(page);

    const reopenedGrid = editVariantsGrid(page);
    await expect(reopenedGrid).toBeVisible();

    for (const [index, variant] of variants.entries()) {
      await expect(variantEditorCell(page, variant.id, 'price')).toHaveText(
        formatEditorPrice(apiPrices[index].amountMinor),
      );
      await expect(variantEditorCell(page, variant.id, 'compareAtPrice')).toHaveText(
        formatEditorPrice(apiPrices[index].compareAtMinor),
      );
    }
  });
});
