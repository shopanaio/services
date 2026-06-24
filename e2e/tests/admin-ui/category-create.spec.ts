import { test } from '@fixtures/base.extend';
import { expect, type Page } from '@playwright/test';
import path from 'node:path';

const DESCRIPTION_TEXT = 'A complete admin-created category with description and media.';

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

test.describe('Admin category create UI', () => {
  test('creates a category and shows it in the categories table', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const name = `Admin UI Category ${unique}`;
    const generatedHandle = `admin-ui-category-${unique}`;
    const handle = `custom-admin-ui-category-${unique}`;
    const mediaName = 'vase.jpg';
    const categoriesUrl = `/${organization.name}/${api.session.projectSlug}/categories`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(categoriesUrl);

    await expect(page.getByTestId('page-title')).toHaveText('Categories');
    await page.getByTestId('categories-create-button').click();

    await expect(page.getByTestId('create-category-modal')).toBeVisible();
    await page.getByTestId('create-category-name-input').fill(name);
    await expect(page.getByTestId('create-category-handle-input')).toHaveValue(generatedHandle);
    await page.getByTestId('create-category-handle-input').fill(handle);
    await expect(page.getByTestId('create-category-handle-input')).toHaveValue(handle);

    const editor = page
      .getByTestId('create-category-description-editor')
      .locator('[contenteditable="true"]')
      .first();
    await editor.click();
    await page.keyboard.type(DESCRIPTION_TEXT);
    await expect(editor).toContainText(DESCRIPTION_TEXT);
    await page.waitForTimeout(1000);
    await editor.blur();

    await page.getByTestId('entity-media-empty-upload-area').click();
    await page
      .getByTestId('upload-media-file-dragger')
      .locator('input[type="file"]')
      .last()
      .setInputFiles(path.resolve('archive/fixtures/images/vase.jpg'));
    await expect(page.getByText('Uploaded 1 file(s)')).toBeVisible();
    await expect(page.getByAltText(mediaName)).toBeVisible();
    await page.waitForTimeout(500);

    await page.getByTestId('submit-create-category-form-button').click();

    await expect(page.getByTestId('create-category-modal')).toBeHidden();

    let createdCategory:
      | {
          id: string;
          name: string;
          handle: string;
          description: { text: string } | null;
          media: Array<{
            file: {
              id: string;
              originalName: string | null;
            };
            sortIndex: number;
          }>;
        }
      | null = null;

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('category-api/CategoryFindMany', {
          variables: { first: 50 },
        });

        const category = data.catalogQuery.categories.edges
          .map((edge) => edge.node)
          .find((node) => node.handle === handle);

        createdCategory = category ?? null;
        return createdCategory?.id ?? null;
      })
      .not.toBeNull();

    if (!createdCategory) {
      throw new Error(`Created category ${handle} was not found through the admin API`);
    }

    expect(createdCategory.name).toBe(name);
    expect(createdCategory.handle).toBe(handle);

    const { data: categoryDetailsData } = await api.admin.query('category-api/CategoryFindOne', {
      variables: { id: createdCategory.id },
    });

    const categoryDetails = categoryDetailsData.catalogQuery.category;
    expect(categoryDetails?.name).toBe(name);
    expect(categoryDetails?.handle).toBe(handle);
    expect(categoryDetails?.description?.text).toBe(DESCRIPTION_TEXT);
    expect(categoryDetails?.media).toHaveLength(1);
    expect(categoryDetails?.media[0].file.originalName).toBe(mediaName);
    expect(categoryDetails?.media[0].sortIndex).toBe(0);

    await page.goto(categoriesUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Categories');
    await expect(page.getByTestId(`categories-table-name-cell-${handle}`)).toHaveText(name);
    await expect(page.getByTestId(`categories-table-handle-cell-${handle}`)).toHaveText(handle);
    await expect(page.getByTestId(`categories-table-status-cell-${handle}`)).toHaveText('Draft');
    await expect(page.getByTestId(`categories-table-products-cell-${handle}`)).toHaveText(
      '0 products',
    );
    await expect(
      page.getByTestId(`categories-table-category-cell-${handle}`).getByRole('img', {
        name: mediaName,
      }),
    ).toBeVisible();
  });
});
