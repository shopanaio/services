import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';
import path from 'node:path';

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
    .locator('input[type="file"]')
    .last()
    .setInputFiles(path.resolve('archive/fixtures/images/vase.jpg'));
  await expect(page.getByText('Uploaded 1 file(s)')).toBeVisible();
  await expect(page.getByTestId('upload-media-modal')).toBeHidden();
}

test.describe('Admin category details update UI', () => {
  test('updates category details fields in one details session', async ({
    api,
    page,
  }) => {
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
    await page.getByRole('menuitem', { name: 'Edit identity' }).click();
    const identityModal = page.getByTestId('edit-category-identity-modal');
    await expect(identityModal).toBeVisible();
    await identityModal.getByTestId('edit-category-identity-name-input').fill(updatedName);
    await identityModal.getByTestId('edit-category-identity-handle-input').fill(updatedHandle);
    await page.getByTestId('submit-edit-category-identity-form-button').click();
    await expect(identityModal).toBeHidden();
    await expect(detailsCard.getByTestId('category-detail-title')).toHaveText(updatedName);
    await expect(detailsCard.getByTestId('category-detail-path')).toContainText(updatedHandle);

    await page.getByTestId('category-header-actions-button').click();
    await page.getByRole('menuitem', { name: 'Change status' }).click();
    const statusModal = page.getByTestId('edit-category-status-modal');
    await expect(statusModal).toBeVisible();
    await statusModal.locator('.ant-segmented-item').filter({ hasText: 'Published' }).click();
    await page.getByTestId('submit-edit-category-status-form-button').click();
    await expect(statusModal).toBeHidden();
    await expect(detailsCard.getByTestId('category-detail-status')).toHaveText('Published');

    await page.getByTestId('category-content-actions-button').click();
    await page.getByRole('menuitem', { name: 'Edit content' }).click();
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
    await expect(detailsCard.getByTestId('category-content-description')).toContainText(description);
    await detailsCard.getByRole('tab', { name: 'Excerpt' }).click();
    await expect(detailsCard.getByTestId('category-content-excerpt')).toContainText(excerpt);

    await page.getByTestId('category-seo-actions-button').click();
    await page.getByRole('menuitem', { name: 'Edit SEO' }).click();
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
    await page.getByRole('menuitem', { name: 'Edit media' }).click();
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
    await page.getByRole('menuitem', { name: 'Edit parent' }).click();
    const categoryPicker = page.getByTestId('category-picker-modal');
    await expect(categoryPicker).toBeVisible();
    await expect(categoryPicker.getByText(parentName)).toBeVisible();
    await categoryPicker.getByText(parentName).click();
    await categoryPicker.getByRole('button', { name: 'Confirm (1)' }).click();
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
    await page.getByRole('menuitem', { name: 'Edit product sort' }).click();
    const sortModal = page.getByTestId('edit-category-sort-modal');
    await expect(sortModal).toBeVisible();
    await sortModal.getByTestId('edit-category-sort-default-sort-select').click();
    await page.locator('.ant-select-item-option-content').getByText('Name', { exact: true }).click();
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

  test('assigns category products and reflects updated products data in the details card', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const categoryName = `Admin Product Category ${unique}`;
    const categoryHandle = `admin-product-category-${unique}`;
    const productTitle = `Assignable Product ${unique}`;
    const productHandle = `assignable-product-${unique}`;

    const category = await api.admin.category.create({
      name: categoryName,
      handle: categoryHandle,
    });

    const { data: productData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: productTitle,
          handle: productHandle,
        },
      },
    });
    const productResult = productData.catalogMutation.productCreate;
    expect(productResult.userErrors).toHaveLength(0);
    const productId = productResult.product?.id;
    if (!productId) {
      throw new Error('Created product id was not returned');
    }

    const categoriesUrl = `/${organization.name}/${api.session.projectSlug}/categories`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await openCategoryDetails(page, categoriesUrl, categoryHandle);

    const detailsCard = page.getByTestId('category-details-card');
    await expect(detailsCard.getByTestId('category-products-section')).toContainText(
      'Products (0)',
    );

    await detailsCard.getByTestId('category-products-assign-button').click();
    const assignModal = page.getByTestId('assign-category-products-modal');
    await expect(assignModal).toBeVisible();
    await assignModal.getByTestId('assign-category-products-add-button').click();

    const productPicker = page.getByTestId('product-picker-modal');
    await expect(productPicker).toBeVisible();
    await productPicker.getByTestId('search-input').fill(productTitle);
    await expect(productPicker.getByText(productTitle)).toBeVisible();
    await productPicker.getByText(productTitle).click();
    await page.getByTestId('submit-product-picker-form-button').click();
    await expect(productPicker).toBeHidden();

    await expect(
      assignModal.getByTestId(`assign-category-products-selected-row-${productId}`),
    ).toContainText(productTitle);
    await page.getByTestId('submit-assign-category-products-form-button').click();
    await expect(assignModal).toBeHidden();

    await expect(detailsCard.getByTestId('category-products-section')).toContainText(
      'Products (1)',
    );
    await expect(
      detailsCard.getByTestId(`category-products-title-cell-${productHandle}`),
    ).toHaveText(productTitle);
    await expect(
      detailsCard.getByTestId(`category-products-handle-cell-${productHandle}`),
    ).toHaveText(productHandle);
    await expect(
      detailsCard.getByTestId(`category-products-status-cell-${productHandle}`),
    ).toHaveText('Draft');

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
              updatedCategory.products.totalCount,
              updatedCategory.products.edges[0]?.node.id,
            ].join('|')
          : null;
      })
      .toBe(`1|1|${productId}`);
  });
});
