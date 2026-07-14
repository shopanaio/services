import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';

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

async function expectWeight(input: Locator, expected: number) {
  await expect.poll(async () => Number(await input.inputValue())).toBe(expected);
}

test.describe('Admin search settings UI', () => {
  test.describe.configure({ timeout: 45_000 });

  test('persists updated settings and shows them after page reload', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const settingsUrl = `/${organization.name}/${api.session.projectSlug}/search/settings`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(settingsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Discovery settings');
    await expect(page.getByTestId('search-settings-section')).toBeVisible();

    const productTitleSwitch = page.getByTestId('search-field-product-title-switch');
    const variantTitleSwitch = page.getByTestId('search-field-variant-title-switch');
    const vendorNameSwitch = page.getByTestId('search-field-vendor-name-switch');
    const categoryNameSwitch = page.getByTestId('search-field-category-name-switch');
    const productTitleWeight = page.getByRole('spinbutton', {
      name: 'Product title weight',
    });
    const variantTitleWeight = page.getByRole('spinbutton', {
      name: 'Variant title weight',
    });
    const typoTolerance = page.getByTestId('search-typo-tolerance-switch');
    const placeLastPolicy = page.getByRole('radio', {
      name: 'Show after available products',
    });

    await expect(productTitleSwitch).toBeChecked({ timeout: 30_000 });
    await expect(variantTitleSwitch).toBeChecked();
    await expect(vendorNameSwitch).toBeChecked();
    await expect(categoryNameSwitch).toBeChecked();
    await expectWeight(productTitleWeight, 8);
    await expect(typoTolerance).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'Show in relevance order' })).toBeChecked();

    await productTitleWeight.fill('9.5');
    await variantTitleWeight.fill('4.25');
    await vendorNameSwitch.click();
    await categoryNameSwitch.click();
    await typoTolerance.click();
    await placeLastPolicy.click();

    const saveButton = page.getByTestId('discovery-settings-save-button');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText('Search settings saved.', { exact: true })).toBeVisible();
    await expect(saveButton).toBeDisabled();

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Discovery settings');
    await expect(page.getByTestId('search-settings-section')).toBeVisible();

    await expect(productTitleSwitch).toBeChecked();
    await expectWeight(productTitleWeight, 9.5);
    await expect(variantTitleSwitch).toBeChecked();
    await expectWeight(variantTitleWeight, 4.25);
    await expect(vendorNameSwitch).not.toBeChecked();
    await expect(categoryNameSwitch).not.toBeChecked();
    await expect(typoTolerance).toBeChecked();
    await expect(placeLastPolicy).toBeChecked();
    await expect(saveButton).toBeDisabled();
  });
});
