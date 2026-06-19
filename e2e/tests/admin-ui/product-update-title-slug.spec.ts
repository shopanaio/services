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

test.describe('Admin product update UI', () => {
  test('updates a product title and slug from the product details modal', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const originalTitle = `Admin Update Product ${unique}`;
    const originalHandle = `admin-update-product-${unique}`;
    const updatedTitle = `Renamed Admin Product ${unique}`;
    const updatedHandle = `renamed-admin-product-${unique}`;

    const { data: createData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: originalTitle,
          handle: originalHandle,
        },
      },
    });

    const createResult = createData.catalogMutation.productCreate;
    expect(createResult.userErrors).toHaveLength(0);
    expect(createResult.product?.handle).toBe(originalHandle);

    const productId = createResult.product?.id;
    if (!productId) {
      throw new Error('Created product id was not returned');
    }

    const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(productsUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Products');
    await page.getByTestId(`products-table-title-cell-${originalHandle}`).click();

    await expect(page.getByTestId('product-modal')).toBeVisible();
    await expect(page.getByTestId('product-detail-title')).toHaveText(originalTitle);
    await expect(page.getByTestId('product-detail-handle')).toContainText(originalHandle);

    await page.getByTestId('product-title-actions-button').click();
    await page.getByRole('menuitem', { name: 'Edit title' }).click();

    await expect(page.getByTestId('edit-title-modal')).toBeVisible();
    await page.getByTestId('edit-title-title-input').fill(updatedTitle);
    await expect(page.getByTestId('edit-title-handle-input')).toHaveValue(
      updatedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    );
    await page.getByTestId('edit-title-handle-input').fill(updatedHandle);
    await page.getByTestId('submit-edit-title-form-button').click();

    await expect(page.getByTestId('edit-title-modal')).toBeHidden();
    await expect(page.getByTestId('product-detail-title')).toHaveText(updatedTitle);
    await expect(page.getByTestId('product-detail-handle')).toContainText(updatedHandle);

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('inventory-api/ProductFindOne', {
          variables: { id: productId },
        });

        const product = data.catalogQuery.product;
        return product ? `${product.title}|${product.handle}` : null;
      })
      .toBe(`${updatedTitle}|${updatedHandle}`);

    await page.goto(productsUrl);
    await expect(page.getByTestId(`products-table-title-cell-${updatedHandle}`)).toHaveText(
      updatedTitle,
    );
  });
});
