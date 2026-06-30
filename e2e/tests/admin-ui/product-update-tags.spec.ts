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

async function createSimpleProduct(api: Api, title: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
      },
    },
  });
  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  if (!result.product?.id) {
    throw new Error(`Created product id was not returned for ${title}`);
  }

  return {
    id: result.product.id,
    title,
    handle,
  };
}

async function createTag(api: Api, name: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/TagCreate', {
    variables: {
      input: {
        name,
        handle,
      },
    },
  });
  const result = data.catalogMutation.tagCreate;
  expect(result.userErrors).toHaveLength(0);

  if (!result.tag?.id) {
    throw new Error(`Created tag id was not returned for ${name}`);
  }

  return result.tag;
}

async function openProductDetails(page: Page, productsUrl: string, handle: string, title: string) {
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();
  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(title);
}

async function selectVisibleTagInPicker(page: Page, name: string) {
  const tagPicker = page.getByTestId('tag-picker-modal');
  const row = tagPicker.locator('.ag-center-cols-container .ag-row:not(.ag-opacity-zero)').filter({
    hasText: name,
  });

  await expect(row).toBeVisible();
  await row.click();
}

async function expectTagHiddenInPicker(page: Page, name: string) {
  const tagPicker = page.getByTestId('tag-picker-modal');
  await tagPicker.getByTestId('search-input').fill(name);
  await expect(
    tagPicker.locator('.ag-center-cols-container .ag-row:not(.ag-opacity-zero)').filter({
      hasText: name,
    }),
  ).toHaveCount(0);
}

async function expectTagVisibleInPicker(page: Page, name: string) {
  const tagPicker = page.getByTestId('tag-picker-modal');
  await tagPicker.getByTestId('search-input').fill(name);
  await expect(
    tagPicker.locator('.ag-center-cols-container .ag-row:not(.ag-opacity-zero)').filter({
      hasText: name,
    }),
  ).toBeVisible();
}

test.describe('Admin product tags update UI', () => {
  test('assigns and removes product tags from the details card', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const product = await createSimpleProduct(
      api,
      `Taggable Product ${unique}`,
      `taggable-product-${unique}`,
    );
    const tags = [
      await createTag(api, `Product Tag One ${unique}`, `product-tag-one-${unique}`),
      await createTag(api, `Product Tag Two ${unique}`, `product-tag-two-${unique}`),
      await createTag(api, `Product Tag Three ${unique}`, `product-tag-three-${unique}`),
    ];
    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openProductDetails(page, productsUrl, product.handle, product.title);

    const tagsSection = page.getByTestId('product-tags-section');

    await tagsSection.getByTestId('product-tags-add-button').click();
    const tagPicker = page.getByTestId('tag-picker-modal');
    await expect(tagPicker).toBeVisible();
    await selectVisibleTagInPicker(page, tags[0].name);
    await selectVisibleTagInPicker(page, tags[1].name);
    await page.getByTestId('submit-tag-picker-form-button').click();
    await expect(tagPicker).toBeHidden();

    await expect(tagsSection.getByTestId(`product-tags-item-${tags[0].handle}`)).toContainText(
      tags[0].name,
    );
    await expect(tagsSection.getByTestId(`product-tags-item-${tags[1].handle}`)).toContainText(
      tags[1].name,
    );

    await tagsSection.getByTestId('product-tags-add-button').click();
    await expect(tagPicker).toBeVisible();
    await expectTagHiddenInPicker(page, tags[0].name);
    await expectTagHiddenInPicker(page, tags[1].name);
    await expectTagVisibleInPicker(page, tags[2].name);
    await page.keyboard.press('Escape');
    await expect(tagPicker).toBeHidden();

    await tagsSection.getByTestId(`product-tags-item-${tags[0].handle}`).click();
    await page.getByTestId(`product-tags-delete-menu-item-${tags[0].handle}`).click();
    await expect(tagsSection.getByTestId(`product-tags-item-${tags[0].handle}`)).toBeHidden();
    await expect(tagsSection.getByTestId(`product-tags-item-${tags[1].handle}`)).toContainText(
      tags[1].name,
    );

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('inventory-api/ProductFindOne', {
          variables: { id: product.id },
        });
        return data.catalogQuery.product?.tags.map((tag) => tag.id).join(',') ?? null;
      })
      .toBe(tags[1].id);
  });
});
