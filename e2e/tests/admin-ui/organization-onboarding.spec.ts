import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { generateUser } from '@utils/user';

test.describe('Admin organization onboarding UI', () => {
  test('registers, creates an organization, and opens it', async ({ page }) => {
    const user = generateUser();
    const password = 'StrongPassword123!';
    const organizationName = `admin-ui-org-${user.uuid.slice(0, 8)}`;
    const organizationDisplayName = `Admin UI Organization ${user.uuid.slice(0, 8)}`;

    await page.goto('/sign-up');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    await page.getByPlaceholder('email@example.com').fill(user.email);
    await page.getByPlaceholder('Create a password').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/onboarding\/complete-profile$/);
    await page.getByTestId('complete-profile-first-name-input').fill(user.firstName);
    await page.getByTestId('complete-profile-last-name-input').fill(user.lastName);
    await page.getByTestId('complete-profile-submit-button').click();

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByTestId('organizations-layout')).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    const createOrganizationModal = page.getByTestId('create-organization-modal');
    await expect(createOrganizationModal).toBeVisible();
    await createOrganizationModal
      .getByPlaceholder('e.g. My Company')
      .fill(organizationDisplayName);
    await createOrganizationModal.getByPlaceholder('my-company').fill(organizationName);
    await page.getByTestId('submit-create-organization-form-button').click();

    await expect(page).toHaveURL(
      new RegExp(`/workspace/${organizationName}$`),
    );
    await expect(page.getByTestId('organization-layout')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: organizationDisplayName }),
    ).toBeVisible();
    await expect(page.getByText(organizationName, { exact: true })).toBeVisible();
  });
});
