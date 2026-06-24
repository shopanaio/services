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

async function createTag(api: Api, name: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/TagCreate', {
    variables: { input: { name, handle } },
  });

  const result = data.catalogMutation.tagCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.tag?.id).toBeTruthy();

  return result.tag!;
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

async function addTagToProduct(api: Api, product: { id: string; revision: number }, tagId: string) {
  const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
    variables: {
      productId: product.id,
      expectedRevision: product.revision,
      operations: {
        tags: [{ tagId, action: 'ADD' }],
      },
    },
  });

  const result = data.catalogMutation.productUpdate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product.tags.map((tag: { id: string }) => tag.id)).toContain(tagId);

  return result.product;
}

async function openTagsPage(page: Page, api: Api, organizationName: string) {
  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);
  await page.goto(`/${organizationName}/${api.session.projectSlug}/tags`);
  await expect(page.getByTestId('page-title')).toHaveText('Tags');
}

function visibleTagRows(page: Page) {
  return page.getByTestId('tags-table').locator('.ag-center-cols-container .ag-row');
}

async function getVisibleTagNames(page: Page) {
  const rows = visibleTagRows(page);
  const rowCount = await rows.count();
  const visibleRows = await Promise.all(
    Array.from({ length: rowCount }, async (_, index) => {
      const row = rows.nth(index);
      const rowIndex = Number(await row.getAttribute('row-index'));
      const name =
        (await row.locator('[data-testid^="tags-table-tag-cell-"]').textContent()) ?? '';

      return {
        rowIndex,
        name: name.replace(/#.*$/, '').trim(),
      };
    }),
  );

  return visibleRows
    .sort((left, right) => left.rowIndex - right.rowIndex)
    .map((row) => row.name);
}

async function expectVisibleTagNames(page: Page, expectedNames: string[]) {
  await expect(visibleTagRows(page)).toHaveCount(expectedNames.length);
  await expect.poll(() => getVisibleTagNames(page)).toEqual(expectedNames);
}

async function expectVisibleTagNamesUnordered(page: Page, expectedNames: string[]) {
  await expect(visibleTagRows(page)).toHaveCount(expectedNames.length);
  await expect
    .poll(async () => (await getVisibleTagNames(page)).sort())
    .toEqual([...expectedNames].sort());
}

function filterMenuButton(page: Page) {
  return page.locator('button').filter({ hasText: /^Filter$/ }).first();
}

function tagFilterBadge(page: Page, label: string) {
  return page.locator('[data-node-type="ui-filter-close-badge"]').filter({ hasText: label });
}

async function addTagFilter(page: Page, label: string) {
  await filterMenuButton(page).click();
  await page.getByRole('button', { name: label }).click();
  await expect(tagFilterBadge(page, label).last()).toBeVisible();
}

async function removeTagFilter(page: Page, label: string) {
  const filter = tagFilterBadge(page, label).last();

  await filter.locator('[data-remove-tag]').click();
  await expect(tagFilterBadge(page, label)).toHaveCount(0);
}

async function fillTagFilterValue(page: Page, label: string, value: string | number) {
  const control = tagFilterBadge(page, label).last().locator('[data-value-node]');
  const input = control.locator('input').first();

  await input.fill(String(value));
}

test.describe('Admin tags UI', () => {
  test('creates a tag and renders the tags table and modals', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const name = `Admin UI Tag ${unique}`;
    const generatedHandle = `admin-ui-tag-${unique}`;
    const handle = `custom-admin-ui-tag-${unique}`;
    const updatedName = `Updated Admin UI Tag ${unique}`;
    const updatedHandle = `updated-admin-ui-tag-${unique}`;
    const tagsUrl = `/${organization.name}/${api.session.projectSlug}/tags`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(tagsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Tags');
    await expect(page.getByTestId('tags-table')).toBeVisible();
    await expect(page.getByTestId('tags-create-button')).toBeVisible();

    await page.getByTestId('tags-create-button').click();
    const createModal = page.getByTestId('create-tag-modal');
    await expect(createModal).toBeVisible();
    await createModal.getByTestId('create-tag-name-input').fill(name);
    await expect(createModal.getByTestId('create-tag-handle-input')).toHaveValue(
      generatedHandle,
    );
    await createModal.getByTestId('create-tag-handle-input').fill(handle);
    await expect(createModal.getByTestId('create-tag-handle-input')).toHaveValue(handle);
    await page.getByTestId('submit-create-tag-form-button').click();
    await expect(createModal).toBeHidden();

    const tagCell = page.getByTestId(`tags-table-tag-cell-${handle}`);
    await expect(tagCell).toBeVisible();
    await expect(tagCell).toContainText(name);
    await expect(tagCell).toContainText(`#${handle}`);
    await expect(page.getByTestId(`tags-table-products-cell-${handle}`)).toHaveText(
      '0 products',
    );

    await tagCell.click();
    const tagModal = page.getByTestId('tag-modal');
    const detailsCard = page.getByTestId('tag-details-card');
    await expect(tagModal).toBeVisible();
    await expect(detailsCard).toBeVisible();
    await expect(detailsCard.getByTestId('tag-detail-title')).toHaveText(name);
    await expect(detailsCard.getByTestId('tag-detail-handle')).toContainText(handle);
    await expect(detailsCard.getByTestId('tag-detail-status')).toHaveText('Tag');
    await expect(detailsCard.getByTestId('tag-detail-products-count')).toContainText('0');
    await expect(detailsCard.getByTestId('tag-detail-created-at')).toBeVisible();

    await page.getByTestId('tag-header-actions-button').click();
    await page.getByRole('menuitem', { name: 'Edit identity' }).click();
    const identityModal = page.getByTestId('edit-tag-identity-modal');
    await expect(identityModal).toBeVisible();
    await identityModal.getByTestId('edit-tag-identity-name-input').fill(updatedName);
    await identityModal.getByTestId('edit-tag-identity-handle-input').fill(updatedHandle);
    await page.getByTestId('submit-edit-tag-identity-form-button').click();
    await expect(identityModal).toBeHidden();
    await expect(detailsCard.getByTestId('tag-detail-title')).toHaveText(updatedName);
    await expect(detailsCard.getByTestId('tag-detail-handle')).toContainText(updatedHandle);
  });

  test('paginates, sorts, searches, and filters tags', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const sortableTags = [
      { key: 'gamma', name: `Gamma Tag ${unique}`, handle: `gamma-tag-${unique}`, products: 4 },
      { key: 'alpha', name: `Alpha Tag ${unique}`, handle: `alpha-tag-${unique}`, products: 1 },
      { key: 'echo', name: `Echo Tag ${unique}`, handle: `echo-tag-${unique}`, products: 3 },
      { key: 'bravo', name: `Bravo Tag ${unique}`, handle: `bravo-tag-${unique}`, products: 2 },
      { key: 'delta', name: `Delta Tag ${unique}`, handle: `delta-tag-${unique}`, products: 0 },
    ];
    const extraTags = Array.from({ length: 16 }, (_, index) => {
      const ordinal = String(index + 1).padStart(2, '0');
      return {
        key: `extra-${ordinal}`,
        name: `Extra Tag ${unique} ${ordinal}`,
        handle: `extra-tag-${unique}-${ordinal}`,
        products: 0,
      };
    });
    const tags = [...sortableTags, ...extraTags];

    for (const tagInput of tags) {
      const tag = await createTag(api, tagInput.name, tagInput.handle);
      Object.assign(tagInput, { id: tag.id });
    }

    for (const tagInput of sortableTags) {
      let currentProduct: { id: string; revision: number } | null = null;

      for (let index = 0; index < tagInput.products; index += 1) {
        const product = await createProduct(
          api,
          `Tag Count Product ${unique} ${tagInput.key} ${index + 1}`,
          `tag-count-product-${unique}-${tagInput.key}-${index + 1}`,
        );
        currentProduct = await addTagToProduct(
          api,
          { id: product.id, revision: product.revision },
          (tagInput as typeof tagInput & { id: string }).id,
        );
      }

      expect(currentProduct?.id ?? tagInput.products === 0).toBeTruthy();
    }

    await openTagsPage(page, api, organization.name);

    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–20 of 21');
    await expect(visibleTagRows(page)).toHaveCount(20);

    await page.getByTestId('tags-pagination-next-button').click();
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('21–21 of 21');
    await expect(visibleTagRows(page)).toHaveCount(1);

    await page.getByTestId('tags-pagination-prev-button').click();
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–20 of 21');
    await expect(visibleTagRows(page)).toHaveCount(20);

    const allNames = tags.map((tag) => tag.name);

    await page.getByTestId('search-input').fill(`Alpha Tag ${unique}`);
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–1 of 1');
    await expectVisibleTagNames(page, [`Alpha Tag ${unique}`]);
    await page.getByTestId('search-input').fill('');
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–20 of 21');

    await addTagFilter(page, 'Handle');
    await fillTagFilterValue(page, 'Handle', `bravo-tag-${unique}`);
    await expectVisibleTagNames(page, [`Bravo Tag ${unique}`]);
    await removeTagFilter(page, 'Handle');
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–20 of 21');

    await addTagFilter(page, 'Products');
    await fillTagFilterValue(page, 'Products', 3);
    await expectVisibleTagNames(page, [`Echo Tag ${unique}`]);
    await removeTagFilter(page, 'Products');
    await expect(page.getByTestId('tags-pagination-range')).toHaveText('1–20 of 21');

    const table = page.getByTestId('tags-table');

    await table.getByRole('columnheader', { name: 'Tag' }).click();
    await expectVisibleTagNames(page, [...allNames].sort().slice(0, 20));

    await table.getByRole('columnheader', { name: 'Handle' }).click();
    await expectVisibleTagNames(
      page,
      [...tags]
        .sort((left, right) => left.handle.localeCompare(right.handle))
        .slice(0, 20)
        .map((tag) => tag.name),
    );

    await table.getByRole('columnheader', { name: 'Products' }).click();
    await expectVisibleTagNamesUnordered(
      page,
      tags
        .filter((tag) => tag.products < 4)
        .map((tag) => tag.name),
    );
  });
});
