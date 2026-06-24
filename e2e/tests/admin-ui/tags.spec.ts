import { test } from '@fixtures/base.extend';
import { expect, type Page } from '@playwright/test';

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
});
