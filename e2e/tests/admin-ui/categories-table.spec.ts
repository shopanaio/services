import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

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

async function createProduct(api: Api, title: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: { input: { title, handle } },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product?.id).toBeTruthy();

  return result.product!;
}

async function addProductToCategory(api: Api, categoryId: string, productId: string) {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: { categoryId, productId },
  });

  expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
}

async function openCategoriesPage(page: Page, api: Api, organizationName: string) {
  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);
  await page.goto(`/${organizationName}/${api.session.projectSlug}/categories`);
  await expect(page.getByTestId('page-title')).toHaveText('Categories');
}

function visibleCategoryRows(page: Page) {
  return page.getByTestId('categories-table').locator('.ag-center-cols-container .ag-row');
}

async function getVisibleCategoryNames(page: Page) {
  const rows = visibleCategoryRows(page);
  const rowCount = await rows.count();
  const visibleRows = await Promise.all(
    Array.from({ length: rowCount }, async (_, index) => {
      const row = rows.nth(index);
      const rowIndex = Number(await row.getAttribute('row-index'));
      const name =
        (await row.locator('[data-testid^="categories-table-name-cell-"]').textContent()) ?? '';

      return { rowIndex, name: name.trim() };
    }),
  );

  return visibleRows
    .sort((left, right) => left.rowIndex - right.rowIndex)
    .map((row) => row.name);
}

async function expectVisibleCategoryNames(page: Page, expectedNames: string[]) {
  await expect(visibleCategoryRows(page)).toHaveCount(expectedNames.length);
  await expect.poll(() => getVisibleCategoryNames(page)).toEqual(expectedNames);
}

async function expectVisibleCategoryNamesUnordered(page: Page, expectedNames: string[]) {
  await expect(visibleCategoryRows(page)).toHaveCount(expectedNames.length);
  await expect
    .poll(async () => (await getVisibleCategoryNames(page)).sort())
    .toEqual([...expectedNames].sort());
}

function filterMenuButton(page: Page) {
  return page.locator('button').filter({ hasText: /^Filter$/ }).first();
}

function categoryFilterBadge(page: Page, label: string) {
  return page.locator('[data-node-type="ui-filter-close-badge"]').filter({ hasText: label });
}

async function addCategoryFilter(page: Page, label: string) {
  await filterMenuButton(page).click();
  await page.getByRole('button', { name: label }).click();
  await expect(categoryFilterBadge(page, label).last()).toBeVisible();
}

async function removeCategoryFilter(page: Page, label: string) {
  const filter = categoryFilterBadge(page, label).last();

  await filter.locator('[data-remove-tag]').click();
  await expect(categoryFilterBadge(page, label)).toHaveCount(0);
}

async function fillCategoryFilterValue(page: Page, label: string, value: string | number) {
  const control = categoryFilterBadge(page, label).last().locator('[data-value-node]');
  const input = control.locator('input').first();

  await input.fill(String(value));
}

test.describe('Admin categories table UI', () => {
  test('paginates, sorts, searches, and filters categories', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const sortableCategories = [
      { key: 'gamma', name: `Gamma Category ${unique}`, handle: `gamma-category-${unique}`, products: 4 },
      { key: 'alpha', name: `Alpha Category ${unique}`, handle: `alpha-category-${unique}`, products: 1 },
      { key: 'echo', name: `Echo Category ${unique}`, handle: `echo-category-${unique}`, products: 3 },
      { key: 'bravo', name: `Bravo Category ${unique}`, handle: `bravo-category-${unique}`, products: 2 },
      { key: 'delta', name: `Delta Category ${unique}`, handle: `delta-category-${unique}`, products: 0 },
    ];
    const extraCategories = Array.from({ length: 14 }, (_, index) => {
      const ordinal = String(index + 1).padStart(2, '0');
      return {
        key: `extra-${ordinal}`,
        name: `Extra Category ${unique} ${ordinal}`,
        handle: `extra-category-${unique}-${ordinal}`,
        products: 0,
      };
    });
    const parentCategoryInput = {
      key: 'parent',
      name: `Parent Category ${unique}`,
      handle: `parent-category-${unique}`,
      products: 0,
    };
    const categories = [...sortableCategories, ...extraCategories, parentCategoryInput];

    for (const categoryInput of categories) {
      const category = await api.admin.category.create({
        name: categoryInput.name,
        handle: categoryInput.handle,
      });
      Object.assign(categoryInput, { id: category.id, depth: category.depth });
    }

    const childCategory = await api.admin.category.create({
      name: `Child Category ${unique}`,
      handle: `child-category-${unique}`,
      parentId: (parentCategoryInput as typeof parentCategoryInput & { id: string }).id,
    });
    categories.push({
      key: 'child',
      name: childCategory.name,
      handle: childCategory.handle,
      products: 0,
    });

    for (const categoryInput of sortableCategories) {
      for (let index = 0; index < categoryInput.products; index += 1) {
        const product = await createProduct(
          api,
          `Category Count Product ${unique} ${categoryInput.key} ${index + 1}`,
          `category-count-product-${unique}-${categoryInput.key}-${index + 1}`,
        );
        await addProductToCategory(
          api,
          (categoryInput as typeof categoryInput & { id: string }).id,
          product.id,
        );
      }
    }

    await openCategoriesPage(page, api, organization.name);

    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');
    await expect(visibleCategoryRows(page)).toHaveCount(20);

    await page.getByTestId('categories-pagination-next-button').click();
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('21–21 of 21');
    await expect(visibleCategoryRows(page)).toHaveCount(1);

    await page.getByTestId('categories-pagination-prev-button').click();
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');
    await expect(visibleCategoryRows(page)).toHaveCount(20);

    const allNames = categories.map((category) => category.name);

    await page.getByTestId('search-input').fill(`Alpha Category ${unique}`);
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–1 of 1');
    await expectVisibleCategoryNames(page, [`Alpha Category ${unique}`]);
    await page.getByTestId('search-input').fill('');
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');

    await addCategoryFilter(page, 'Handle');
    await fillCategoryFilterValue(page, 'Handle', `bravo-category-${unique}`);
    await expectVisibleCategoryNames(page, [`Bravo Category ${unique}`]);
    await removeCategoryFilter(page, 'Handle');
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');

    await addCategoryFilter(page, 'Products');
    await fillCategoryFilterValue(page, 'Products', 3);
    await expectVisibleCategoryNames(page, [`Echo Category ${unique}`]);
    await removeCategoryFilter(page, 'Products');
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');

    await addCategoryFilter(page, 'Depth');
    await fillCategoryFilterValue(page, 'Depth', 1);
    await expectVisibleCategoryNames(page, [`Child Category ${unique}`]);
    await removeCategoryFilter(page, 'Depth');
    await expect(page.getByTestId('categories-pagination-range')).toHaveText('1–20 of 21');

    const table = page.getByTestId('categories-table');

    await table.getByRole('columnheader', { name: 'Category' }).click();
    await expectVisibleCategoryNames(page, [...allNames].sort().slice(0, 20));

    await table.getByRole('columnheader', { name: 'Handle' }).click();
    await expectVisibleCategoryNames(
      page,
      [...categories]
        .sort((left, right) => left.handle.localeCompare(right.handle))
        .slice(0, 20)
        .map((category) => category.name),
    );

    await table.getByRole('columnheader', { name: 'Products' }).click();
    await expectVisibleCategoryNamesUnordered(
      page,
      categories
        .filter((category) => category.products < 4)
        .map((category) => category.name),
    );
  });
});
