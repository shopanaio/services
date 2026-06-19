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

test.describe('Admin products table UI', () => {
  test('shows products created through the admin API in the products table', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const products = Array.from({ length: 5 }, (_, index) => {
      const ordinal = index + 1;
      return {
        title: `Admin Table Product ${unique} ${ordinal}`,
        handle: `admin-table-product-${unique}-${ordinal}`,
      };
    });

    for (const product of products) {
      const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
        variables: { input: product },
      });

      const result = data.catalogMutation.productCreate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.product?.handle).toBe(product.handle);
    }

    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(productsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Products');
    await expect(page.getByTestId('products-pagination-range')).toHaveText('1–5 of 5');

    const rows = page.getByTestId('products-table').locator('.ag-center-cols-container .ag-row');
    await expect(rows).toHaveCount(5);

    for (const product of products) {
      await expect(page.getByTestId(`products-table-title-cell-${product.handle}`)).toHaveText(
        product.title,
      );
      await expect(page.getByTestId(`products-table-status-cell-${product.handle}`)).toHaveText(
        'Draft',
      );
      await expect(page.getByTestId(`products-table-inventory-cell-${product.handle}`)).toHaveText(
        '0 in stock',
      );
    }
  });
});
