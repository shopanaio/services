import { test } from '@fixtures/base.extend';
import { expect, type Page } from '@playwright/test';
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

async function uploadMediaFile(page: Page, filePath: string) {
  await page
    .getByTestId('upload-media-file-dragger')
    .locator('input[type="file"]')
    .last()
    .setInputFiles(filePath);
  await expect(page.getByText('Uploaded 1 file(s)').last()).toBeVisible();
  await expect(page.getByTestId('upload-media-modal')).toBeHidden();
}

async function browseUploadAndSelectMedia(
  page: Page,
  modal: ReturnType<Page['getByTestId']>,
  filePath: string,
) {
  const fileName = path.basename(filePath);

  await modal.getByRole('button', { name: 'Browse' }).click();
  const mediaPicker = page.getByTestId('media-picker-modal');
  await expect(mediaPicker).toBeVisible();

  await mediaPicker.getByRole('button', { name: /Upload images/ }).click();
  await expect(page.getByTestId('upload-media-modal')).toBeVisible();
  await uploadMediaFile(page, filePath);

  const row = mediaPicker
    .locator('.ag-center-cols-container .ag-row')
    .filter({ hasText: fileName });
  await expect(row).toBeVisible();
  await row.click();

  await page.getByTestId('submit-media-picker-form-button').click();
  await expect(mediaPicker).toBeHidden();
}

async function readProductMedia(
  api: Parameters<Parameters<typeof test>[1]>[0]['api'],
  productId: string,
) {
  const { data } = await api.admin.query('inventory-api/ProductFindOne', {
    variables: { id: productId },
  });

  return data.catalogQuery.product?.media ?? [];
}

test.describe('Admin product details media update UI', () => {
  test.setTimeout(90_000);

  test('adds, reorders, and removes product media from product details', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const title = `Admin Media Product ${unique}`;
    const handle = `admin-media-product-${unique}`;
    const vasePath = path.resolve('archive/fixtures/images/vase.jpg');
    const lampPath = path.resolve('archive/fixtures/images/lamp.jpg');

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

    await page.getByTestId('product-media-actions-button').click();
    await page.getByTestId('product-media-actions-button-menu-item').click();

    const editMediaModal = page.getByTestId('edit-media-modal');
    await expect(editMediaModal).toBeVisible();

    await editMediaModal.getByTestId('entity-media-empty-upload-area').click();
    await expect(page.getByTestId('upload-media-modal')).toBeVisible();
    await uploadMediaFile(page, vasePath);

    await browseUploadAndSelectMedia(page, editMediaModal, vasePath);
    await browseUploadAndSelectMedia(page, editMediaModal, lampPath);

    await expect(editMediaModal.getByAltText('vase.jpg')).toHaveCount(2);
    await expect(editMediaModal.getByAltText('lamp.jpg')).toBeVisible();

    await page.getByTestId('submit-edit-media-form-button').click();
    await expect(page.getByTestId('edit-media-modal')).toBeHidden();

    let addedFileIds: string[] = [];
    await expect
      .poll(async () => {
        const media = await readProductMedia(api, productId);
        addedFileIds = media.map((item) => item.file.id);
        return media
          .map((item) => `${item.file.originalName}:${item.sortIndex}`)
          .join('|');
      })
      .toBe('vase.jpg:0|vase.jpg:1|lamp.jpg:2');

    expect(addedFileIds).toHaveLength(3);
    await expect(page.getByTestId(`product-media-item-${addedFileIds[0]}`)).toBeVisible();
    await expect(page.getByTestId(`product-media-item-${addedFileIds[1]}`)).toBeVisible();
    await expect(page.getByTestId(`product-media-item-${addedFileIds[2]}`)).toBeVisible();

    await page.getByTestId('product-media-actions-button').click();
    await page.getByTestId('product-media-actions-button-menu-item').click();
    const reorderModal = page.getByTestId('edit-media-modal');
    await expect(reorderModal).toBeVisible();

    const lastFileId = addedFileIds[2];
    await reorderModal.getByTestId(`entity-media-set-featured-button-${lastFileId}`).click();
    await page.getByTestId('submit-edit-media-form-button').click();
    await expect(page.getByTestId('edit-media-modal')).toBeHidden();

    const reorderedIds = [lastFileId, addedFileIds[0], addedFileIds[1]];
    await expect
      .poll(async () => {
        const media = await readProductMedia(api, productId);
        return media.map((item) => item.file.id).join('|');
      })
      .toBe(reorderedIds.join('|'));

    await page.goto(productsUrl);
    await expect(page.getByTestId(`products-table-title-cell-${handle}`)).toHaveText(title);
    await expect(
      page.getByTestId(`products-table-title-cell-${handle}`).getByRole('img', {
        name: 'lamp.jpg',
      }),
    ).toBeVisible();

    await page.getByTestId(`products-table-title-cell-${handle}`).click();
    await expect(page.getByTestId('product-modal')).toBeVisible();
    await page.getByTestId('product-media-actions-button').click();
    await page.getByTestId('product-media-actions-button-menu-item').click();

    const removeOneModal = page.getByTestId('edit-media-modal');
    await expect(removeOneModal).toBeVisible();
    await removeOneModal.getByTestId(`entity-media-delete-button-${addedFileIds[0]}`).click();
    await page.getByTestId('submit-edit-media-form-button').click();
    await expect(page.getByTestId('edit-media-modal')).toBeHidden();

    const remainingIds = [lastFileId, addedFileIds[1]];
    await expect
      .poll(async () => {
        const media = await readProductMedia(api, productId);
        return media.map((item) => item.file.id).join('|');
      })
      .toBe(remainingIds.join('|'));

    await page.getByTestId('product-media-actions-button').click();
    await page.getByTestId('product-media-actions-button-menu-item').click();

    const removeAllModal = page.getByTestId('edit-media-modal');
    await expect(removeAllModal).toBeVisible();

    for (const fileId of remainingIds) {
      await removeAllModal.getByTestId(`entity-media-delete-button-${fileId}`).click();
    }

    await page.getByTestId('submit-edit-media-form-button').click();
    await expect(page.getByTestId('edit-media-modal')).toBeHidden();

    await expect
      .poll(async () => {
        const media = await readProductMedia(api, productId);
        return media.length;
      })
      .toBe(0);

    await expect(
      page.getByTestId('product-media-section').locator('[data-testid^="product-media-item-"]'),
    ).toHaveCount(0);
    await expect(page.getByTestId('product-media-section')).toContainText('No media added');
  });
});
