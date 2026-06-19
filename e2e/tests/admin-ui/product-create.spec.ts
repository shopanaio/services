import { test } from '@fixtures/base.extend';
import { expect, type Page } from '@playwright/test';
import path from 'node:path';

const DESCRIPTION_TEXT = 'A complete admin-created product with two option groups.';

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

async function addTagSelectValue(page: Page, testId: string, value: string) {
  const select = page.getByTestId(testId);
  await select.click();
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

test.describe('Admin product create UI', () => {
  test('creates a product with all create-form data and four variants from two options', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const title = `Admin UI Product ${unique}`;
    const handle = `admin-ui-product-${unique}`;
    const productUrl = `/${organization.name}/${api.session.projectSlug}/products`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(productUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Products');

    await page.getByTestId('products-create-button').click();
    await page.getByTestId('create-product-title-input').fill(title);
    await page.getByTestId('create-product-handle-input').fill(handle);

    await page.getByTestId('entity-media-empty-upload-area').click();
    await page
      .locator('input[type="file"]')
      .last()
      .setInputFiles(path.resolve('archive/fixtures/images/vase.jpg'));
    await expect(page.getByText('Uploaded 1 file(s)')).toBeVisible();
    await expect(page.getByAltText('vase.jpg')).toBeVisible();

    const editor = page
      .getByTestId('create-product-description-editor')
      .locator('[contenteditable="true"]')
      .first();
    await editor.click();
    await page.keyboard.type(DESCRIPTION_TEXT);

    await page.getByTestId('create-product-has-variants-switch').click();

    await page.getByTestId('create-product-option-0-name-input').fill('Color');
    await addTagSelectValue(page, 'create-product-option-0-values-select', 'Black');
    await addTagSelectValue(page, 'create-product-option-0-values-select', 'White');

    await page.getByTestId('create-product-add-option-button').click();
    await page.getByTestId('create-product-option-1-name-input').fill('Size');
    await addTagSelectValue(page, 'create-product-option-1-values-select', 'Small');
    await addTagSelectValue(page, 'create-product-option-1-values-select', 'Large');

    const variantRows = page
      .getByTestId('create-product-variants-grid')
      .locator('.ag-center-cols-container .ag-row');
    await expect(variantRows).toHaveCount(4);

    await page.getByTestId('submit-create-product-form-button').click();

    let createdProduct:
      | {
          id: string;
          title: string;
          handle: string;
          description: { text: string };
          media: Array<{ file: { id: string; originalName: string | null }; sortIndex: number }>;
          variantsCount: number;
          variants: {
            edges: Array<{ node: { handle: string; isDefault: boolean } }>;
          };
          options: Array<{
            name: string;
            slug: string;
            values: Array<{ name: string; slug: string }>;
          }>;
        }
      | null = null;

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('inventory-api/ProductFindMany', {
          variables: { first: 50 },
        });

        const product = data.catalogQuery.products.edges
          .map((edge) => edge.node)
          .find((node) => node.handle === handle);

        createdProduct = (product as typeof createdProduct) ?? null;
        return createdProduct?.id ?? null;
      })
      .not.toBeNull();

    if (!createdProduct) {
      throw new Error(`Created product ${handle} was not found through the admin API`);
    }

    expect(createdProduct.title).toBe(title);
    expect(createdProduct.handle).toBe(handle);
    expect(createdProduct.description.text).toBe(DESCRIPTION_TEXT);
    expect(createdProduct.media).toHaveLength(1);
    expect(createdProduct.media[0].file.originalName).toBe('vase.jpg');
    expect(createdProduct.options.map((option) => option.name)).toEqual(['Color', 'Size']);
    expect(createdProduct.options.map((option) => option.values.map((value) => value.name))).toEqual([
      ['Black', 'White'],
      ['Small', 'Large'],
    ]);

    const variants = createdProduct.variants.edges.map((edge) => edge.node);
    expect(createdProduct.variantsCount).toBe(4);
    expect(variants.map((variant) => variant.handle).sort()).toEqual([
      'black-large',
      'black-small',
      'white-large',
      'white-small',
    ]);
    expect(variants.filter((variant) => variant.isDefault)).toHaveLength(1);

    await page.goto(productUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Products');

    const productTitleCell = page.getByTestId(
      `products-table-title-cell-${handle}`,
    );
    await expect(productTitleCell).toHaveText(title);
    await expect(
      productTitleCell.getByRole('img', { name: 'vase.jpg' }),
    ).toBeVisible();
  });
});
