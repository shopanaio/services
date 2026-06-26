import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface ProductFixture {
  id: string;
  title: string;
  handle: string;
}

interface ProductOptionValueFixture {
  id: string;
  name: string;
}

interface ProductOptionFixture {
  id: string;
  name: string;
  values: ProductOptionValueFixture[];
}

interface VariantFixture {
  id: string;
  handle: string;
}

interface VariantState {
  color: string;
  size: string;
  price: number;
  compareAtPrice: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

const UAH = 'UAH';

const BASE_COMBINATIONS = [
  { color: 'Black', size: 'Small' },
  { color: 'Black', size: 'Large' },
  { color: 'White', size: 'Small' },
  { color: 'White', size: 'Large' },
] as const;

const EXPANDED_COMBINATIONS = [
  ...BASE_COMBINATIONS,
  { color: 'Black', size: 'Medium' },
  { color: 'White', size: 'Medium' },
  { color: 'Red', size: 'Small' },
  { color: 'Red', size: 'Large' },
  { color: 'Red', size: 'Medium' },
] as const;
const EDITOR_COLUMNS = ['Color', 'Size', 'Compare at', 'Weight', 'Length', 'Width', 'Height'];

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

function slug(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-');
}

function comboHandle(input: { color: string; size: string }) {
  return `${slug(input.color)}-${slug(input.size)}`;
}

function variantState(index: number, combo: { color: string; size: string }): VariantState {
  return {
    color: combo.color,
    size: combo.size,
    price: 12000 + index * 1000,
    compareAtPrice: 15000 + index * 1000,
    weight: 300 + index * 25,
    length: 100 + index * 3,
    width: 50 + index * 2,
    height: 25 + index,
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

async function createProduct(
  api: Api,
  unique: string,
  input?: {
    withOptionsAndVariants?: boolean;
  },
): Promise<ProductFixture> {
  const title = `Options Variants Product ${unique}`;
  const handle = `options-variants-product-${unique}`;

  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
        inventoryItem: { tracked: true },
        ...(input?.withOptionsAndVariants
          ? {
              options: [
                {
                  name: 'Color',
                  slug: 'color',
                  values: [
                    { name: 'Black', slug: 'black' },
                    { name: 'White', slug: 'white' },
                  ],
                },
                {
                  name: 'Size',
                  slug: 'size',
                  values: [
                    { name: 'Small', slug: 'small' },
                    { name: 'Large', slug: 'large' },
                  ],
                },
              ],
              variants: BASE_COMBINATIONS.map((combo) => ({ handle: comboHandle(combo) })),
            }
          : {}),
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

async function setupAdmin(
  api: Api,
  page: Page,
) {
  api.session.user.data.password = 'StrongPassword123!';
  await api.session.setupUser();
  const organization = await api.session.setupOrganization();
  await api.session.setupProject({
    currencies: [UAH],
    defaultCurrency: UAH,
  });

  const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;
  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);

  return { productsUrl };
}

async function openProductDetails(
  page: Page,
  productsUrl: string,
  product: ProductFixture,
) {
  await page.setViewportSize({ width: 1920, height: 1400 });
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${product.handle}`).click();
  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(product.title);
}

async function reloadAndOpenProductDetails(
  page: Page,
  productsUrl: string,
  product: ProductFixture,
) {
  await page.reload();
  await openProductDetails(page, productsUrl, product);
}

async function readProduct(api: Api, productId: string) {
  const { data } = await api.admin.query('inventory-api/ProductFindOne', {
    variables: { id: productId },
  });

  const product = data.catalogQuery.product;
  if (!product) {
    throw new Error(`Product ${productId} was not found`);
  }

  return product;
}

async function readProductOptions(api: Api, productId: string): Promise<ProductOptionFixture[]> {
  const product = await readProduct(api, productId);
  return product.options.map((option) => ({
    id: option.id,
    name: option.name,
    values: option.values.map((value) => ({
      id: value.id,
      name: value.name,
    })),
  }));
}

async function readProductVariants(api: Api, productId: string): Promise<VariantFixture[]> {
  const product = await readProduct(api, productId);
  return product.variants.edges.map((edge) => ({
    id: edge.node.id,
    handle: edge.node.handle,
  }));
}

function optionByName(options: ProductOptionFixture[], name: string) {
  const option = options.find((candidate) => candidate.name === name);
  if (!option) {
    throw new Error(`Option ${name} was not found`);
  }
  return option;
}

async function openOptionsModal(page: Page) {
  await page.getByTestId('product-options-actions-button').click();
  await page.getByTestId('product-options-actions-button-menu-item').click();

  const modal = page.getByTestId('edit-options-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function optionCard(modal: Locator, text: string) {
  const cards = modal.getByTestId('edit-options-option-card');

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const count = await cards.count();

    for (let i = 0; i < count; i += 1) {
      const value = await cards
        .nth(i)
        .getByTestId('edit-options-option-name-input')
        .inputValue()
        .catch(() => null);

      if (value === text) {
        return cards.nth(i);
      }
    }

    await modal.page().waitForTimeout(100);
  }

  throw new Error(`Option card "${text}" was not found`);
}

async function saveOptions(page: Page) {
  await page.getByTestId('submit-edit-options-form-button').click();
  await expect(page.getByTestId('edit-options-modal')).toBeHidden();
}

async function createBaseOptionsInDetails(page: Page) {
  const modal = await openOptionsModal(page);
  await modal.getByTestId('edit-options-add-button').click();

  const colorCard = await optionCard(modal, 'New Option');
  await colorCard.getByTestId('edit-options-option-name-input').fill('Color');
  await colorCard.getByTestId('edit-options-value-name-input').nth(0).fill('Black');
  await colorCard.getByTestId('edit-options-add-value-button').click();
  await colorCard.getByTestId('edit-options-value-name-input').nth(1).fill('White');

  await modal.getByTestId('edit-options-add-button').click();
  const sizeCard = await optionCard(modal, 'New Option');
  await sizeCard.getByTestId('edit-options-option-name-input').fill('Size');
  await sizeCard.getByTestId('edit-options-value-name-input').nth(0).fill('Small');
  await sizeCard.getByTestId('edit-options-add-value-button').click();
  await sizeCard.getByTestId('edit-options-value-name-input').nth(1).fill('Large');

  await saveOptions(page);
}

async function addExpandedOptionValuesInDetails(page: Page) {
  const modal = await openOptionsModal(page);

  const colorCard = await optionCard(modal, 'Color');
  await colorCard.getByTestId('edit-options-add-value-button').click();
  await colorCard.getByTestId('edit-options-value-name-input').last().fill('Red');

  const sizeCard = await optionCard(modal, 'Size');
  await sizeCard.getByTestId('edit-options-add-value-button').click();
  await sizeCard.getByTestId('edit-options-value-name-input').last().fill('Medium');

  await saveOptions(page);
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

function optionEditorCell(page: Page, optionId: string, variantId: string) {
  return page.getByTestId(`variants-editor-cell-option-${optionId}-${variantId}`);
}

async function editNumericCell(
  page: Page,
  variantId: string,
  field: 'price' | 'compareAtPrice' | 'weight' | 'length' | 'width' | 'height',
  value: number,
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

async function selectOptionValue(
  page: Page,
  option: ProductOptionFixture,
  variantId: string,
  valueName: string,
  input?: {
    assertCellText?: boolean;
  },
) {
  const cell = optionEditorCell(page, option.id, variantId);
  await cell.scrollIntoViewIfNeeded();
  await cell.dblclick();
  await page.getByRole('menuitem').filter({ hasText: valueName }).last().click();
  if (input?.assertCellText ?? true) {
    await expect(cell).toHaveText(valueName);
  }
}

async function fillVariantRow(
  page: Page,
  options: ProductOptionFixture[],
  variantId: string,
  expected: VariantState,
) {
  await selectOptionValue(page, optionByName(options, 'Color'), variantId, expected.color);
  await selectOptionValue(page, optionByName(options, 'Size'), variantId, expected.size);
  await editNumericCell(page, variantId, 'price', expected.price);
  await editNumericCell(page, variantId, 'compareAtPrice', expected.compareAtPrice);
  await editNumericCell(page, variantId, 'weight', expected.weight);
  await editNumericCell(page, variantId, 'length', expected.length);
  await editNumericCell(page, variantId, 'width', expected.width);
  await editNumericCell(page, variantId, 'height', expected.height);
}

async function getGridRowIds(page: Page) {
  return page.getByTestId('variants-editor-grid').locator('.ag-row').evaluateAll((rows) =>
    rows
      .map((row) => row.getAttribute('row-id'))
      .filter((value): value is string => Boolean(value)),
  );
}

async function createDraftVariantRowFromBlank(
  page: Page,
  options: ProductOptionFixture[],
  expected: VariantState,
) {
  const previousIds = new Set(await getGridRowIds(page));
  const blankId = [...previousIds].find((id) => id.startsWith('blank:'));

  if (!blankId) {
    throw new Error('Blank variant row was not found');
  }

  await selectOptionValue(page, optionByName(options, 'Color'), blankId, expected.color, {
    assertCellText: false,
  });

  const draftId = await expect
    .poll(
      async () => {
        const currentIds = await getGridRowIds(page);
        return currentIds.find((id) => id.startsWith('draft:') && !previousIds.has(id)) ?? null;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull()
    .then(async () => {
      const currentIds = await getGridRowIds(page);
      const createdId = currentIds.find((id) => id.startsWith('draft:') && !previousIds.has(id));
      if (!createdId) {
        throw new Error('Draft variant row was not created');
      }
      return createdId;
    });

  await fillVariantRow(page, options, draftId, expected);
  return draftId;
}

async function saveVariants(page: Page) {
  await expect(page.getByTestId('submit-edit-variants-form-button')).toBeEnabled();
  await page.getByTestId('submit-edit-variants-form-button').click();
  await expect(page.getByTestId('edit-variants-modal')).toBeHidden();
}

async function deleteVariantRow(page: Page, variantId: string) {
  const deleteButton = page.getByTestId(`variants-editor-delete-row-${variantId}`);
  await deleteButton.scrollIntoViewIfNeeded();
  await deleteButton.click();
  await expect(deleteButton).toBeHidden();
}

async function readVariantRowSummary(
  page: Page,
  options: ProductOptionFixture[],
  variantId: string,
) {
  const color = await optionEditorCell(page, optionByName(options, 'Color').id, variantId).innerText();
  const size = await optionEditorCell(page, optionByName(options, 'Size').id, variantId).innerText();
  const price = await variantEditorCell(page, variantId, 'price').innerText();
  const compareAtPrice = await variantEditorCell(page, variantId, 'compareAtPrice').innerText();
  const weight = await variantEditorCell(page, variantId, 'weight').innerText();
  const length = await variantEditorCell(page, variantId, 'length').innerText();
  const width = await variantEditorCell(page, variantId, 'width').innerText();
  const height = await variantEditorCell(page, variantId, 'height').innerText();

  return [
    color,
    size,
    price,
    compareAtPrice,
    weight,
    length,
    width,
    height,
  ].join('|');
}

function expectedVariantRowSummary(expected: VariantState) {
  return [
    expected.color,
    expected.size,
    formatUah(expected.price),
    formatUah(expected.compareAtPrice),
    String(expected.weight),
    String(expected.length),
    String(expected.width),
    String(expected.height),
  ].join('|');
}

async function expectVariantsAfterReload(
  api: Api,
  page: Page,
  productsUrl: string,
  product: ProductFixture,
  expectedStates: VariantState[],
) {
  await reloadAndOpenProductDetails(page, productsUrl, product);
  await openEditVariantsModal(page);
  await showEditorColumns(page, EDITOR_COLUMNS);

  const options = await readProductOptions(api, product.id);
  const variants = await readProductVariants(api, product.id);
  expect(variants).toHaveLength(expectedStates.length);

  const actualSummaries = [];
  for (const variant of variants) {
    actualSummaries.push(await readVariantRowSummary(page, options, variant.id));
  }

  expect(actualSummaries.sort()).toEqual(
    expectedStates.map(expectedVariantRowSummary).sort(),
  );
}

function expectedStates(combinations: readonly { color: string; size: string }[]) {
  return combinations.map((combo, index) => variantState(index, combo));
}

test.describe('Admin product options and variants lifecycle UI', () => {
  test.setTimeout(120_000);

  test('creates options and variants for a regular product and keeps all values after reload', async ({
    api,
    page,
  }) => {
    const { productsUrl } = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createProduct(api, unique);

    await openProductDetails(page, productsUrl, product);
    await createBaseOptionsInDetails(page);

    const options = await readProductOptions(api, product.id);
    const variants = await readProductVariants(api, product.id);
    expect(variants).toHaveLength(1);

    await openEditVariantsModal(page);
    await showEditorColumns(page, EDITOR_COLUMNS);

    const firstVariant = variants[0];
    await fillVariantRow(page, options, firstVariant.id, variantState(0, BASE_COMBINATIONS[0]));

    for (const [index, combo] of BASE_COMBINATIONS.slice(1).entries()) {
      await createDraftVariantRowFromBlank(
        page,
        options,
        variantState(index + 1, combo),
      );
    }

    await saveVariants(page);

    await expectVariantsAfterReload(
      api,
      page,
      productsUrl,
      product,
      expectedStates(BASE_COMBINATIONS),
    );
  });

  test('swaps option combinations for a variative product and keeps all values after reload', async ({
    api,
    page,
  }) => {
    const { productsUrl } = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createProduct(api, unique, { withOptionsAndVariants: true });

    await openProductDetails(page, productsUrl, product);
    await openEditVariantsModal(page);
    await showEditorColumns(page, EDITOR_COLUMNS);

    const options = await readProductOptions(api, product.id);
    const variants = await readProductVariants(api, product.id);
    const variantsByHandle = new Map(variants.map((variant) => [variant.handle, variant] as const));

    const swapped = [
      { fromHandle: 'black-small', combo: BASE_COMBINATIONS[3] },
      { fromHandle: 'black-large', combo: BASE_COMBINATIONS[2] },
      { fromHandle: 'white-small', combo: BASE_COMBINATIONS[1] },
      { fromHandle: 'white-large', combo: BASE_COMBINATIONS[0] },
    ] as const;

    for (const [index, item] of swapped.entries()) {
      const variant = variantsByHandle.get(item.fromHandle);
      if (!variant) {
        throw new Error(`Variant ${item.fromHandle} was not created`);
      }

      await fillVariantRow(page, options, variant.id, variantState(index, item.combo));
    }

    await saveVariants(page);

    await expectVariantsAfterReload(
      api,
      page,
      productsUrl,
      product,
      expectedStates(swapped.map((item) => item.combo)),
    );
  });

  test('creates remaining variants after adding new option values to a variative product', async ({
    api,
    page,
  }) => {
    const { productsUrl } = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createProduct(api, unique, { withOptionsAndVariants: true });

    await openProductDetails(page, productsUrl, product);
    await addExpandedOptionValuesInDetails(page);

    const options = await readProductOptions(api, product.id);
    const variants = await readProductVariants(api, product.id);
    const variantsByHandle = new Map(variants.map((variant) => [variant.handle, variant] as const));

    await openEditVariantsModal(page);
    await showEditorColumns(page, EDITOR_COLUMNS);

    for (const [index, combo] of EXPANDED_COMBINATIONS.entries()) {
      const existingVariant = variantsByHandle.get(comboHandle(combo));

      if (existingVariant) {
        await fillVariantRow(page, options, existingVariant.id, variantState(index, combo));
      } else {
        await createDraftVariantRowFromBlank(page, options, variantState(index, combo));
      }
    }

    await saveVariants(page);

    await expectVariantsAfterReload(
      api,
      page,
      productsUrl,
      product,
      expectedStates(EXPANDED_COMBINATIONS),
    );
  });

  test('creates variants and swaps expanded options so new variants keep previous combinations', async ({
    api,
    page,
  }) => {
    const { productsUrl } = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createProduct(api, unique, { withOptionsAndVariants: true });

    await openProductDetails(page, productsUrl, product);
    await addExpandedOptionValuesInDetails(page);

    const options = await readProductOptions(api, product.id);
    const variants = await readProductVariants(api, product.id);
    const variantsByHandle = new Map(variants.map((variant) => [variant.handle, variant] as const));
    const existingVariantSwaps = [
      { fromHandle: 'black-small', combo: { color: 'Red', size: 'Medium' } },
      { fromHandle: 'black-large', combo: { color: 'Red', size: 'Small' } },
      { fromHandle: 'white-small', combo: { color: 'Red', size: 'Large' } },
      { fromHandle: 'white-large', combo: { color: 'Black', size: 'Medium' } },
    ] as const;
    const expected = [
      ...existingVariantSwaps.map((item) => item.combo),
      ...BASE_COMBINATIONS,
    ];

    await openEditVariantsModal(page);
    await showEditorColumns(page, EDITOR_COLUMNS);

    for (const [index, item] of existingVariantSwaps.entries()) {
      const variant = variantsByHandle.get(item.fromHandle);
      if (!variant) {
        throw new Error(`Variant ${item.fromHandle} was not created`);
      }

      await fillVariantRow(page, options, variant.id, variantState(index, item.combo));
    }

    for (const [index, combo] of BASE_COMBINATIONS.entries()) {
      await createDraftVariantRowFromBlank(
        page,
        options,
        variantState(existingVariantSwaps.length + index, combo),
      );
    }

    await saveVariants(page);

    await expectVariantsAfterReload(
      api,
      page,
      productsUrl,
      product,
      expectedStates(expected),
    );
  });

  test('deletes a variant from the variants table and keeps it deleted after reload', async ({
    api,
    page,
  }) => {
    const { productsUrl } = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createProduct(api, unique, { withOptionsAndVariants: true });

    await openProductDetails(page, productsUrl, product);

    const variants = await readProductVariants(api, product.id);
    const targetVariant = variants.find((variant) => variant.handle === 'black-large');
    if (!targetVariant) {
      throw new Error('Variant black-large was not created');
    }

    await expect(page.getByTestId(`product-variants-row-${targetVariant.id}`)).toBeVisible();
    await openEditVariantsModal(page);
    await deleteVariantRow(page, targetVariant.id);
    await saveVariants(page);

    await expect
      .poll(async () => (await readProductVariants(api, product.id)).map((variant) => variant.id))
      .not.toContain(targetVariant.id);

    await reloadAndOpenProductDetails(page, productsUrl, product);
    const remainingVariants = await readProductVariants(api, product.id);
    expect(remainingVariants).toHaveLength(3);
    expect(remainingVariants.map((variant) => variant.handle).sort()).toEqual([
      'black-small',
      'white-large',
      'white-small',
    ]);

    await expect(page.getByTestId(`product-variants-row-${targetVariant.id}`)).toBeHidden();
    await expect(page.getByTestId('product-variants-table').locator('tbody tr')).toHaveCount(3);
  });
});
