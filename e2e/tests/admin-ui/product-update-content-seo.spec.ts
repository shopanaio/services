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

test.describe('Admin product details SEO update UI', () => {
  test('updates product SEO metadata from the product details modal', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const title = `Admin SEO Product ${unique}`;
    const handle = `admin-seo-product-${unique}`;
    const seoTitle = `SEO title ${unique}`;
    const seoDescription = `SEO description for product ${unique}`;
    const ogTitle = `OG title ${unique}`;
    const ogDescription = `OG description for product ${unique}`;
    const description = `Updated product description ${unique}`;
    const excerpt = `Updated product excerpt ${unique}`;
    const ogImageName = 'vase.jpg';

    const { data: createData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle,
        },
      },
    });

    const createResult = createData.catalogMutation.productCreate;
    expect(createResult.userErrors).toHaveLength(0);

    const productId = createResult.product?.id;
    if (!productId) {
      throw new Error('Created product id was not returned');
    }

    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(productsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Products');
    await page.getByTestId(`products-table-title-cell-${handle}`).click();

    await expect(page.getByTestId('product-modal')).toBeVisible();
    await expect(page.getByTestId('product-detail-title')).toHaveText(title);

    await page.getByTestId('product-content-actions-button').click();
    await page.getByTestId('product-content-edit-menu-item').click();

    const contentModal = page.getByTestId('edit-description-modal');
    await expect(contentModal).toBeVisible();
    await fillEditor(
      page,
      contentModal.getByTestId('edit-description-description-editor'),
      description,
    );
    await contentModal.getByRole('tab', { name: 'Excerpt' }).click();
    await fillEditor(page, contentModal.getByTestId('edit-description-excerpt-editor'), excerpt);
    await page.getByTestId('submit-edit-description-form-button').click();
    await expect(contentModal).toBeHidden();
    await expect(page.getByTestId('product-content-description')).toContainText(description);
    await page.getByRole('tab', { name: 'Excerpt' }).click();
    await expect(page.getByTestId('product-content-excerpt')).toContainText(excerpt);

    await page.getByTestId('product-seo-actions-button').click();
    await page.getByTestId('product-seo-actions-button-menu-item').click();

    const seoModal = page.getByTestId('edit-seo-modal');
    await expect(seoModal).toBeVisible();
    await seoModal.getByTestId('edit-seo-meta-title-input').fill(seoTitle);
    await seoModal.getByTestId('edit-seo-meta-description-input').fill(seoDescription);
    await seoModal.getByTestId('edit-seo-og-title-input').fill(ogTitle);
    await seoModal.getByTestId('edit-seo-og-description-input').fill(ogDescription);
    await seoModal.getByTestId('edit-seo-og-image-upload-area').click();

    await expect(page.getByTestId('upload-media-modal')).toBeVisible();
    await page
      .getByTestId('upload-media-file-dragger')
      .locator('input[type="file"]')
      .last()
      .setInputFiles(path.resolve('archive/fixtures/images/vase.jpg'));
    await expect(page.getByText('Uploaded 1 file(s)')).toBeVisible();
    await expect(page.getByTestId('upload-media-modal')).toBeHidden();
    await expect(seoModal.getByTestId('edit-seo-og-image-preview')).toBeVisible();

    await expect(seoModal.getByTestId('seo-preview-google-title')).toHaveText(seoTitle);
    await expect(seoModal.getByTestId('seo-preview-google-description')).toHaveText(
      seoDescription,
    );

    await seoModal.getByRole('tab', { name: 'Facebook' }).click();
    await expect(seoModal.getByTestId('seo-preview-facebook-title')).toHaveText(ogTitle);
    await expect(seoModal.getByTestId('seo-preview-facebook-description')).toHaveText(
      ogDescription,
    );

    await page.getByTestId('submit-edit-seo-form-button').click();

    await expect(page.getByTestId('edit-seo-modal')).toBeHidden();

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('inventory-api/ProductFindOne', {
          variables: { id: productId },
        });

        const product = data.catalogQuery.product;
        return product?.seo
          ? [
              product.seo.seoTitle,
              product.seo.seoDescription,
              product.seo.ogTitle,
              product.seo.ogDescription,
              product.seo.ogImage?.originalName,
              product.description?.text,
              product.excerpt?.text,
            ].join('|')
          : null;
      })
      .toBe(
        [
          seoTitle,
          seoDescription,
          ogTitle,
          ogDescription,
          ogImageName,
          description,
          excerpt,
        ].join('|'),
      );

    await page.getByTestId('product-seo-actions-button').click();
    await page.getByTestId('product-seo-actions-button-menu-item').click();

    const reopenedSeoModal = page.getByTestId('edit-seo-modal');
    await expect(reopenedSeoModal.getByTestId('edit-seo-meta-title-input')).toHaveValue(seoTitle);
    await expect(reopenedSeoModal.getByTestId('edit-seo-meta-description-input')).toHaveValue(
      seoDescription,
    );
    await expect(reopenedSeoModal.getByTestId('edit-seo-og-title-input')).toHaveValue(ogTitle);
    await expect(reopenedSeoModal.getByTestId('edit-seo-og-description-input')).toHaveValue(
      ogDescription,
    );
    await expect(reopenedSeoModal.getByTestId('edit-seo-og-image-preview')).toBeVisible();
  });
});
