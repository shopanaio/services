import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';

const PASSWORD = 'StrongPassword123!';

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email-input').fill(email);
  await page.getByTestId('sign-in-password-input').fill(PASSWORD);
  await page.getByTestId('sign-in-submit-button').click();

  await page.waitForFunction(
    () => localStorage.getItem('auth_access_token') !== null,
  );
}

async function completeProfileIfNeeded(page: Page) {
  const firstNameInput = page.getByTestId('complete-profile-first-name-input');
  await firstNameInput
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function replaceCodeEditorValue(editor: Locator, value: string) {
  const input = editor.getByRole('textbox');
  await expect(input).toBeVisible();
  await input.fill(value);
}

async function enableAllSwitches(page: Page) {
  const switches = page.getByRole('switch', { name: /^Enable / });
  await expect(switches).toHaveCount(4);
  const count = await switches.count();

  for (let index = 0; index < count; index += 1) {
    const notificationSwitch = switches.nth(index);
    await expect(notificationSwitch).toBeEnabled();

    if (!(await notificationSwitch.isChecked())) {
      const mutationResponse = page.waitForResponse((response) => {
        const request = response.request();
        return (
          request.method() === 'POST' &&
          request.postData()?.includes('NotificationDefinitionSetEnabled') ===
            true
        );
      });
      await notificationSwitch.click();
      await expect((await mutationResponse).ok()).toBe(true);
      await expect(notificationSwitch).toBeChecked();
      await expect(notificationSwitch).toBeEnabled();
    }
  }
}

async function expectAllSwitchesEnabled(page: Page) {
  const switches = page.getByRole('switch', { name: /^Enable / });
  await expect(switches).toHaveCount(4);
  const count = await switches.count();

  for (let index = 0; index < count; index += 1) {
    await expect(switches.nth(index)).toBeChecked();
  }
}

async function updateFirstEmailTemplate({
  page,
  pageTitle,
  itemTitle,
  subject,
  body,
}: {
  page: Page;
  pageTitle: string;
  itemTitle: string;
  subject: string;
  body: string;
}) {
  await expect(page.getByTestId('page-title')).toHaveText(pageTitle);
  await expect(
    page.getByRole('switch', { name: /^Enable / }).first(),
  ).toBeEnabled();
  await page.getByRole('button', { name: `Open ${itemTitle}` }).click();

  const modal = page.getByTestId('notification-template-modal');
  await expect(modal).toBeVisible();
  await expect(modal.getByText(itemTitle, { exact: true })).toBeVisible();

  const subjectInput = modal.getByRole('textbox', { name: 'Email subject' });
  await expect(subjectInput).toBeVisible();
  await subjectInput.fill(subject);

  const editor = modal.getByTestId('notification-template-body-editor');
  await replaceCodeEditorValue(editor, body);

  const saveButton = modal.getByTestId(
    'submit-notification-template-form-button',
  );
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(modal).toBeHidden();

  await enableAllSwitches(page);
  await page.reload();

  await expect(page.getByTestId('page-title')).toHaveText(pageTitle);
  await expectAllSwitchesEnabled(page);
  await page.getByRole('button', { name: `Open ${itemTitle}` }).click();

  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole('textbox', { name: 'Email subject' }),
  ).toHaveText(subject);
  await expect(
    modal
      .getByTestId('notification-template-body-editor')
      .getByRole('textbox', { name: 'Email template body' }),
  ).toContainText(body);

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
}

test.describe('Admin notification templates UI', () => {
  test.describe.configure({ timeout: 90_000 });

  test('persists the first customer and staff email templates and all switches', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = PASSWORD;
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const baseUrl = `/${organization.name}/${api.session.projectSlug}/system/notifications`;

    await signIn(page, api.session.user.data.email);
    await completeProfileIfNeeded(page);

    await page.goto(`${baseUrl}/customer`);
    await updateFirstEmailTemplate({
      page,
      pageTitle: 'Customer notifications',
      itemTitle: 'Order confirmation',
      subject: `Customer order confirmation ${unique}`,
      body: `<p>Customer notification template ${unique}</p>`,
    });

    await page.goto(`${baseUrl}/staff`);
    await updateFirstEmailTemplate({
      page,
      pageTitle: 'Staff notifications',
      itemTitle: 'New order',
      subject: `Staff new order ${unique}`,
      body: `<p>Staff notification template ${unique}</p>`,
    });
  });
});
