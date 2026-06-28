import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';
import path from 'node:path';

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

async function fillEditor(page: Page, editorWrapper: Locator, text: string) {
  const editor = editorWrapper.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(text);
  await expect(editor).toContainText(text);
  await page.waitForTimeout(1000);
  await editor.blur();
}

async function openCategoryDetails(page: Page, categoriesUrl: string, handle: string) {
  await page.goto(categoriesUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Categories');
  await page.getByTestId(`categories-table-name-cell-${handle}`).click();
  await expect(page.getByTestId('category-modal')).toBeVisible();
  await expect(page.getByTestId('category-details-card')).toBeVisible();
}

async function uploadVaseImage(page: Page) {
  await expect(page.getByTestId('upload-media-modal')).toBeVisible();
  await page
    .getByTestId('upload-media-file-dragger')
    .locator('input[type="file"]')
    .last()
    .setInputFiles(path.resolve('archive/fixtures/images/vase.jpg'));
  await expect(page.getByText('Uploaded 1 file(s)')).toBeVisible();
  await expect(page.getByTestId('upload-media-modal')).toBeHidden();
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

async function selectVisibleProductInPicker(page: Page, title: string) {
  const productPicker = page.getByTestId('product-picker-modal');
  const row = productPicker.locator('.ag-center-cols-container .ag-row').filter({
    hasText: title,
  });

  await expect(row).toBeVisible();
  await row.click();
}

async function expectProductHiddenInPicker(page: Page, title: string) {
  const productPicker = page.getByTestId('product-picker-modal');
  await productPicker.getByTestId('search-input').fill(title);
  await expect(productPicker.getByText(title)).toBeHidden();
}

async function expectProductVisibleInPicker(page: Page, title: string) {
  const productPicker = page.getByTestId('product-picker-modal');
  await productPicker.getByTestId('search-input').fill(title);
  await expect(productPicker.getByText(title)).toBeVisible();
}

test.describe('Admin category details update UI', () => {
  test('updates category details fields in one details session', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const parentName = `Admin Parent Category ${unique}`;
    const parentHandle = `admin-parent-category-${unique}`;
    const originalName = `Admin Details Category ${unique}`;
    const originalHandle = `admin-details-category-${unique}`;
    const updatedName = `Updated Details Category ${unique}`;
    const updatedHandle = `updated-details-category-${unique}`;
    const description = `Updated category description ${unique}`;
    const excerpt = `Updated category excerpt ${unique}`;
    const seoTitle = `Category SEO title ${unique}`;
    const seoDescription = `Category SEO description ${unique}`;
    const ogTitle = `Category OG title ${unique}`;
    const ogDescription = `Category OG description ${unique}`;

    await api.admin.category.create({
      name: parentName,
      handle: parentHandle,
    });
    const category = await api.admin.category.create({
      name: originalName,
      handle: originalHandle,
    });

    const categoriesUrl = `/${organization.name}/${api.session.projectSlug}/categories`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openCategoryDetails(page, categoriesUrl, originalHandle);

    const detailsCard = page.getByTestId('category-details-card');

    await page.getByTestId('category-header-actions-button').click();
    await page.getByTestId('category-header-edit-identity-menu-item').click();
    const identityModal = page.getByTestId('edit-category-identity-modal');
    await expect(identityModal).toBeVisible();
    await identityModal.getByTestId('edit-category-identity-name-input').fill(updatedName);
    await identityModal.getByTestId('edit-category-identity-handle-input').fill(updatedHandle);
    await page.getByTestId('submit-edit-category-identity-form-button').click();
    await expect(identityModal).toBeHidden();
    await expect(detailsCard.getByTestId('category-detail-title')).toHaveText(updatedName);
    await expect(detailsCard.getByTestId('category-detail-path')).toContainText(updatedHandle);

    await page.getByTestId('category-header-actions-button').click();
    await page.getByTestId('category-header-status-menu-item').click();
    await expect(detailsCard.getByTestId('category-detail-status')).toHaveText('Published');

    await page.getByTestId('category-content-actions-button').click();
    await page.getByTestId('category-content-edit-menu-item').click();
    const contentModal = page.getByTestId('edit-category-content-modal');
    await expect(contentModal).toBeVisible();
    await fillEditor(
      page,
      contentModal.getByTestId('edit-category-content-description-editor'),
      description,
    );
    await contentModal.getByRole('tab', { name: 'Excerpt' }).click();
    await fillEditor(
      page,
      contentModal.getByTestId('edit-category-content-excerpt-editor'),
      excerpt,
    );
    await page.getByTestId('submit-edit-category-content-form-button').click();
    await expect(contentModal).toBeHidden();
    await expect(detailsCard.getByTestId('category-detail-description-summary')).toContainText(
      description,
    );
    await expect(detailsCard.getByTestId('category-content-description')).toContainText(
      description,
    );
    await detailsCard.getByRole('tab', { name: 'Excerpt' }).click();
    await expect(detailsCard.getByTestId('category-content-excerpt')).toContainText(excerpt);

    await page.getByTestId('category-seo-actions-button').click();
    await page.getByTestId('category-seo-actions-button-menu-item').click();
    const seoModal = page.getByTestId('edit-category-seo-modal');
    await expect(seoModal).toBeVisible();
    await seoModal.getByTestId('edit-category-seo-title-input').fill(seoTitle);
    await seoModal.getByTestId('edit-category-seo-description-input').fill(seoDescription);
    await seoModal.getByTestId('edit-category-seo-og-title-input').fill(ogTitle);
    await seoModal.getByTestId('edit-category-seo-og-description-input').fill(ogDescription);
    await seoModal.getByTestId('edit-seo-og-image-upload-area').click();
    await uploadVaseImage(page);
    await expect(seoModal.getByTestId('edit-seo-og-image-preview')).toBeVisible();
    await page.getByTestId('submit-edit-category-seo-form-button').click();
    await expect(seoModal).toBeHidden();
    await expect(detailsCard.getByTestId('seo-preview-google-title')).toHaveText(seoTitle);
    await expect(detailsCard.getByTestId('seo-preview-google-description')).toContainText(
      seoDescription,
    );
    await expect(detailsCard.getByTestId('category-seo-og-image-link')).toBeVisible();

    await page.getByTestId('category-media-actions-button').click();
    await page.getByTestId('category-media-actions-button-menu-item').click();
    const mediaModal = page.getByTestId('edit-category-media-modal');
    await expect(mediaModal).toBeVisible();
    await mediaModal.getByTestId('entity-media-empty-upload-area').click();
    await uploadVaseImage(page);
    await expect(mediaModal.getByAltText('vase.jpg')).toBeVisible();
    await page.getByTestId('submit-edit-category-media-form-button').click();
    await expect(mediaModal).toBeHidden();
    await expect(
      detailsCard.getByTestId('category-media-section').getByAltText('vase.jpg'),
    ).toBeVisible();

    await page.getByTestId('category-hierarchy-actions-button').click();
    await page.getByTestId('category-hierarchy-edit-parent-menu-item').click();
    const categoryPicker = page.getByTestId('category-picker-modal');
    await expect(categoryPicker).toBeVisible();
    await expect(categoryPicker.getByText(parentName)).toBeVisible();
    await categoryPicker.getByText(parentName).click();
    await page.getByTestId('submit-category-picker-form-button').click();
    await expect(categoryPicker).toBeHidden();
    await expect(detailsCard.getByTestId('category-hierarchy-parent')).toContainText(parentName);
    await expect(detailsCard.getByTestId('category-hierarchy-breadcrumb')).toContainText(
      parentName,
    );
    await expect(detailsCard.getByTestId('category-detail-path')).toContainText(
      `${parentHandle}/${updatedHandle}`,
    );
    await expect(detailsCard.getByTestId('seo-preview-google-url')).toContainText(
      `shopana.store › categories › ${parentHandle}/${updatedHandle}`,
    );

    await page.getByTestId('category-header-actions-button').click();
    await page.getByTestId('category-header-edit-sort-menu-item').click();
    const sortModal = page.getByTestId('edit-category-sort-modal');
    await expect(sortModal).toBeVisible();
    await sortModal.getByTestId('edit-category-sort-default-sort-select').click();
    await page
      .locator('.ant-select-item-option-content')
      .getByText('Name', { exact: true })
      .click();
    await sortModal.locator('.ant-segmented-item').filter({ hasText: 'Descending' }).click();
    await page.getByTestId('submit-edit-category-sort-form-button').click();
    await expect(sortModal).toBeHidden();
    await expect(detailsCard.getByTestId('category-products-default-sort')).toHaveText(
      'Default sort: Name / Descending',
    );

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('category-api/CategoryFindOne', {
          variables: { id: category.id },
        });
        const updatedCategory = data.catalogQuery.category;
        return updatedCategory
          ? [
              updatedCategory.name,
              updatedCategory.handle,
              updatedCategory.isPublished ? 'published' : 'draft',
              updatedCategory.description?.text,
              updatedCategory.excerpt?.text,
              updatedCategory.seo?.seoTitle,
              updatedCategory.seo?.seoDescription,
              updatedCategory.parent?.handle,
              updatedCategory.defaultSort,
              updatedCategory.defaultSortDirection,
              updatedCategory.media[0]?.file.originalName,
            ].join('|')
          : null;
      })
      .toBe(
        [
          updatedName,
          updatedHandle,
          'published',
          description,
          excerpt,
          seoTitle,
          seoDescription,
          parentHandle,
          'NAME',
          'desc',
          'vase.jpg',
        ].join('|'),
      );
  });

  test('assigns and removes category products from the details card', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const categoryName = `Admin Product Category ${unique}`;
    const categoryHandle = `admin-product-category-${unique}`;
    const firstProduct = {
      title: `Assignable Product One ${unique}`,
      handle: `assignable-product-one-${unique}`,
    };
    const secondProduct = {
      title: `Assignable Product Two ${unique}`,
      handle: `assignable-product-two-${unique}`,
    };
    const thirdProduct = {
      title: `Assignable Product Three ${unique}`,
      handle: `assignable-product-three-${unique}`,
    };

    const category = await api.admin.category.create({
      name: categoryName,
      handle: categoryHandle,
    });

    const products = [
      await createSimpleProduct(api, firstProduct.title, firstProduct.handle),
      await createSimpleProduct(api, secondProduct.title, secondProduct.handle),
      await createSimpleProduct(api, thirdProduct.title, thirdProduct.handle),
    ];

    const categoriesUrl = `/${organization.name}/${api.session.projectSlug}/categories`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openCategoryDetails(page, categoriesUrl, categoryHandle);

    const detailsCard = page.getByTestId('category-details-card');
    await expect(detailsCard.getByTestId('category-products-section')).toContainText(
      'Products (0)',
    );

    await detailsCard.getByTestId('category-products-assign-button').click();
    const productPicker = page.getByTestId('product-picker-modal');
    await expect(productPicker).toBeVisible();
    await selectVisibleProductInPicker(page, products[0].title);
    await selectVisibleProductInPicker(page, products[1].title);
    await page.getByTestId('submit-product-picker-form-button').click();
    await expect(productPicker).toBeHidden();

    await expect(detailsCard.getByTestId('category-products-section')).toContainText(
      'Products (2)',
    );
    await expect(
      detailsCard.getByTestId(`category-products-title-cell-${products[0].handle}`),
    ).toHaveText(products[0].title);
    await expect(
      detailsCard.getByTestId(`category-products-title-cell-${products[1].handle}`),
    ).toHaveText(products[1].title);
    await expect(
      detailsCard.getByTestId(`category-products-status-cell-${products[0].handle}`),
    ).toHaveText('Draft');

    await detailsCard.getByTestId('category-products-assign-button').click();
    await expect(productPicker).toBeVisible();
    await expectProductHiddenInPicker(page, products[0].title);
    await expectProductHiddenInPicker(page, products[1].title);
    await expectProductVisibleInPicker(page, products[2].title);
    await page.keyboard.press('Escape');
    await expect(productPicker).toBeHidden();

    await detailsCard.getByTestId(`category-products-actions-button-${products[0].handle}`).click();
    await page.getByTestId(`category-products-unassign-menu-item-${products[0].handle}`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Unassign' }).click();
    await expect(detailsCard.getByTestId('category-products-section')).toContainText(
      'Products (1)',
    );
    await expect(
      detailsCard.getByTestId(`category-products-title-cell-${products[0].handle}`),
    ).toBeHidden();
    await expect(
      detailsCard.getByTestId(`category-products-title-cell-${products[1].handle}`),
    ).toHaveText(products[1].title);

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('category-api/CategoryWithProducts', {
          variables: {
            id: category.id,
            first: 10,
          },
        });
        const updatedCategory = data.catalogQuery.category;
        return updatedCategory
          ? [
              updatedCategory.productsCount,
              updatedCategory.listing.totalCount,
              updatedCategory.listing.edges.map((edge) => edge.node.id).join(','),
            ].join('|')
          : null;
      })
      .toBe(`1|1|${products[1].id}`);
  });
});
