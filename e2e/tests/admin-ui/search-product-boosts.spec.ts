import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface ProductFixture {
  id: string;
  title: string;
}

interface BoostFixture {
  name: string;
  locale: 'en' | 'uk';
  enabled: boolean;
  phrases: string[];
  product: ProductFixture;
}

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

async function createProduct(api: Api, title: string, handle: string): Promise<ProductFixture> {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: { input: { title, handle } },
  });
  const result = data.catalogMutation.productCreate;

  expect(result.userErrors).toHaveLength(0);
  expect(result.product?.id).toBeTruthy();

  return { id: result.product!.id, title };
}

async function configureSearch(api: Api) {
  const { data } = await api.admin.mutation('listing-api/ListingSearchSettingsUpdate', {
    variables: {
      expectedVersion: 0,
      operations: {
        settings: {
          fields: [{ field: 'PRODUCT_TITLE', weight: 10 }],
          typoToleranceEnabled: true,
          outOfStockPolicy: 'PLACE_LAST',
        },
      },
    },
  });

  expect(data.listingMutation.search.settingsUpdate.userErrors).toHaveLength(0);
}

function boostRows(page: Page) {
  return page.getByTestId('product-boosts-table').locator('.ag-center-cols-container .ag-row');
}

function boostRow(page: Page, name: string) {
  return boostRows(page).filter({ hasText: name });
}

async function visibleBoostNames(page: Page) {
  const rows = boostRows(page);
  const count = await rows.count();
  const names = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const row = rows.nth(index);
      return {
        rowIndex: Number(await row.getAttribute('row-index')),
        name: ((await row.locator('[col-id="name"]').textContent()) ?? '').trim(),
      };
    }),
  );

  return names.sort((left, right) => left.rowIndex - right.rowIndex).map(({ name }) => name);
}

async function expectVisibleBoostNames(page: Page, expected: string[]) {
  await expect(boostRows(page)).toHaveCount(expected.length);
  await expect.poll(() => visibleBoostNames(page)).toEqual(expected);
}

async function expectVisibleBoostNamesUnordered(page: Page, expected: string[]) {
  await expect(boostRows(page)).toHaveCount(expected.length);
  await expect
    .poll(async () => (await visibleBoostNames(page)).sort())
    .toEqual([...expected].sort());
}

async function selectLocale(page: Page, modal: Locator, locale: 'en' | 'uk') {
  const label = locale === 'en' ? 'English (en)' : 'Ukrainian (uk)';

  await modal.locator('#product-boost-locale').click();
  await page
    .locator('.ant-select-dropdown:visible')
    .locator('.ant-select-item-option')
    .filter({ hasText: label })
    .click();
}

async function selectProductInPicker(
  page: Page,
  modalTestId: 'product-picker-modal' | 'entity-picker-modal',
  submitTestId: 'submit-product-picker-form-button' | 'submit-entity-picker-form-button',
  productTitle: string,
) {
  const picker = page.getByTestId(modalTestId);
  await expect(picker).toBeVisible();
  await picker.getByTestId('search-input').fill(productTitle);

  const row = picker
    .getByTestId('product-picker-grid')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ hasText: productTitle });

  await expect(row).toHaveCount(1);
  const submit = page.getByTestId(submitTestId);
  if (!(await submit.isEnabled())) {
    await row.click();
  }
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(picker).toBeHidden();
}

async function createBoostThroughUi(page: Page, boost: BoostFixture) {
  await page.getByRole('button', { name: 'Create product boost' }).click();
  const modal = page.getByTestId('product-boost-modal');

  await expect(modal).toBeVisible();
  await modal.locator('#product-boost-name').fill(boost.name);
  await selectLocale(page, modal, boost.locale);

  if (!boost.enabled) {
    await modal.getByRole('switch', { name: 'Enabled' }).click();
  }

  await modal.getByRole('textbox', { name: 'Trigger phrase 1' }).fill(boost.phrases[0]);
  for (const [index, phrase] of boost.phrases.slice(1).entries()) {
    await modal.getByRole('button', { name: 'Add phrase' }).click();
    await modal.getByRole('textbox', { name: `Trigger phrase ${index + 2}` }).fill(phrase);
  }

  await modal.getByRole('button', { name: 'Select products' }).click();
  await selectProductInPicker(
    page,
    'product-picker-modal',
    'submit-product-picker-form-button',
    boost.product.title,
  );

  await expect(page.getByTestId('submit-product-boost-form-button')).toBeEnabled();
  await page.getByTestId('submit-product-boost-form-button').click();
  await expect(modal).toBeHidden();
  await expect(boostRow(page, boost.name)).toHaveCount(1);
}

async function expectBoostRowValues(page: Page, boost: BoostFixture) {
  const row = boostRow(page, boost.name);

  await expect(row).toHaveCount(1);
  await expect(row.locator('[col-id="name"]')).toHaveText(boost.name);
  await expect(row.locator('[col-id="phrasesCount"]')).toContainText(String(boost.phrases.length));
  for (const phrase of boost.phrases) {
    await expect(row.locator('[col-id="phrasesCount"]')).toContainText(phrase);
  }
  await expect(row.locator('[col-id="locale"]')).toHaveText(boost.locale.toUpperCase());
  await expect(row.locator('[col-id="enabled"]')).toHaveText(
    boost.enabled ? 'Enabled' : 'Disabled',
  );
  await expect(row.locator('[col-id="productsCount"]')).toHaveText('1 product');
}

async function addProductFilter(page: Page, productTitle: string) {
  await page.getByTestId('filter-button').click();
  await page.getByTestId('filter-option-productIds').click();
  await page.getByTestId('filter-badge-value-productIds').last().locator('button').click();
  await selectProductInPicker(
    page,
    'product-picker-modal',
    'submit-product-picker-form-button',
    productTitle,
  );
}

test.describe('Admin search product boosts UI', () => {
  test.describe.configure({ timeout: 60_000 });

  test('creates, searches, filters, sorts, updates, and deletes product boosts', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({ locales: ['en', 'uk'] });
    await configureSearch(api);

    const unique = crypto.randomUUID().slice(0, 8);
    const products = {
      alpha: await createProduct(
        api,
        `Boost Product Alpha ${unique}`,
        `boost-product-alpha-${unique}`,
      ),
      bravo: await createProduct(
        api,
        `Boost Product Bravo ${unique}`,
        `boost-product-bravo-${unique}`,
      ),
      gamma: await createProduct(
        api,
        `Boost Product Gamma ${unique}`,
        `boost-product-gamma-${unique}`,
      ),
    };
    const boosts: BoostFixture[] = [
      {
        name: `Gamma Boost ${unique}`,
        locale: 'en',
        enabled: true,
        phrases: [`gamma phrase ${unique}`],
        product: products.gamma,
      },
      {
        name: `Alpha Boost ${unique}`,
        locale: 'en',
        enabled: true,
        phrases: [`alpha phrase ${unique}`],
        product: products.alpha,
      },
      {
        name: `Bravo Boost ${unique}`,
        locale: 'uk',
        enabled: false,
        phrases: [`bravo phrase ${unique}`, `second bravo phrase ${unique}`],
        product: products.bravo,
      },
    ];
    const boostsUrl = `/${organization.name}/${api.session.projectSlug}/search/product-boosts`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(boostsUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Product boosts');

    for (const boost of boosts) {
      await createBoostThroughUi(page, boost);
    }

    await expectVisibleBoostNamesUnordered(
      page,
      boosts.map(({ name }) => name),
    );
    for (const boost of boosts) {
      await expectBoostRowValues(page, boost);
    }

    await page.getByTestId('search-input').fill(`Alpha Boost ${unique}`);
    await expectVisibleBoostNames(page, [boosts[1].name]);
    await page.getByTestId('search-input').fill('');
    await expectVisibleBoostNamesUnordered(
      page,
      boosts.map(({ name }) => name),
    );

    await addProductFilter(page, products.bravo.title);
    await expectVisibleBoostNames(page, [boosts[2].name]);
    await page.getByTestId('filter-badge-remove-productIds').last().click();
    await expectVisibleBoostNamesUnordered(
      page,
      boosts.map(({ name }) => name),
    );

    const table = page.getByTestId('product-boosts-table');
    const ascendingNames = boosts.map(({ name }) => name).sort();
    await table.getByRole('columnheader', { name: 'Boost' }).click();
    await expectVisibleBoostNames(page, ascendingNames);
    await table.getByRole('columnheader', { name: 'Boost' }).click();
    await expectVisibleBoostNames(page, [...ascendingNames].reverse());

    const updatedBoost: BoostFixture = {
      name: `Updated Alpha Boost ${unique}`,
      locale: 'uk',
      enabled: false,
      phrases: [`updated alpha phrase ${unique}`, `extra alpha phrase ${unique}`],
      product: products.gamma,
    };
    await boostRow(page, boosts[1].name).click();
    const editModal = page.getByTestId('product-boost-modal');
    await expect(editModal).toBeVisible();
    await editModal.locator('#product-boost-name').fill(updatedBoost.name);
    await selectLocale(page, editModal, updatedBoost.locale);
    await editModal.getByRole('switch', { name: 'Enabled' }).click();
    await editModal
      .getByRole('textbox', { name: 'Trigger phrase 1' })
      .fill(updatedBoost.phrases[0]);
    await editModal.getByRole('button', { name: 'Add phrase' }).click();
    await editModal
      .getByRole('textbox', { name: 'Trigger phrase 2' })
      .fill(updatedBoost.phrases[1]);
    await editModal.getByRole('button', { name: `Remove ${boosts[1].product.title}` }).click();
    await editModal.getByRole('button', { name: 'Select products' }).click();
    await selectProductInPicker(
      page,
      'product-picker-modal',
      'submit-product-picker-form-button',
      updatedBoost.product.title,
    );
    await page.getByTestId('submit-product-boost-form-button').click();
    await expect(editModal).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Product boosts');
    await expectBoostRowValues(page, updatedBoost);
    await boostRow(page, updatedBoost.name).click();
    await expect(editModal).toBeVisible();
    await expect(editModal.locator('#product-boost-name')).toHaveValue(updatedBoost.name);
    await expect(editModal.getByText('Ukrainian (uk)', { exact: true })).toBeVisible();
    await expect(editModal.getByRole('switch', { name: 'Enabled' })).not.toBeChecked();
    await expect(editModal.getByRole('textbox', { name: 'Trigger phrase 1' })).toHaveValue(
      updatedBoost.phrases[0],
    );
    await expect(editModal.getByRole('textbox', { name: 'Trigger phrase 2' })).toHaveValue(
      updatedBoost.phrases[1],
    );
    await expect(editModal.getByTestId('product-boost-selected-products-grid')).toContainText(
      updatedBoost.product.title,
    );
    await page.keyboard.press('Escape');
    await expect(editModal).toBeHidden();

    const lastBoost = boosts.at(-1)!;
    await boostRow(page, lastBoost.name).click();
    await expect(editModal).toBeVisible();
    await page.getByTestId('product-boost-delete-button').click();
    const deleteConfirmation = page.locator('.ant-modal-confirm');
    await expect(deleteConfirmation).toContainText(lastBoost.name);
    await deleteConfirmation.getByRole('button', { name: 'Delete' }).click();
    await expect(editModal).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Product boosts');
    await expect(boostRow(page, lastBoost.name)).toHaveCount(0);
    await expectVisibleBoostNamesUnordered(page, [boosts[0].name, updatedBoost.name]);
  });
});
