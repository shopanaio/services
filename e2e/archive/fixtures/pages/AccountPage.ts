import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class AccountPage {
  public newName = 'MyNewName';
  public newLastName = 'MyNewLastName';
  private page: Page;
  private url = '/account';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('stores-button');
  }

  async goto() {
    await this.page.goto(this.url);
    //await this.waitFor();
  }

  async waitFor() {
    await expect(this.pageLocator).toBeVisible();
  }

  async changeFirstName(firstName: string) {
    await this.page.getByTestId('first-name-field').fill(firstName);
  }

  async changeLastName(lastName: string) {
    await this.page.getByTestId('last-name-field').fill(lastName);
  }

  async changeLocalization(language: string) {
    await this.page.getByTestId('language-field').click();
    //await this.page.keyboard.press('Enter');
    await this.page.getByText(language, { exact: true }).click();
  }

  async changePassword(newPassword: string) {
    await this.page.getByTestId('update-password-button').click();
    await this.page.getByTestId('password-field').fill(newPassword);
    await this.page.getByTestId('update-password-submit-button').click();
  }

  async saveAccountChanges() {
    await this.page.getByTestId('update-profile-button').click({ force: true });
    await this.page.waitForTimeout(1000)
  }

  async logOut() {
    await this.page.waitForTimeout(500)
    await this.page.getByTestId('logout-button').click();
    await this.page.waitForURL('/auth');
    await this.page.waitForTimeout(500)
  }

  async checkChanges() {
    await this.page.waitForTimeout(1000)
    await expect(this.page.getByTestId('first-name-field')).toHaveValue(this.newName);
    await expect(this.page.getByTestId('last-name-field')).toHaveValue(this.newLastName);
  }

  async deleteAccount() {
    await this.page.getByText('Delete my account').click();

    //confirm
    await this.page.getByText('Delete my account').click();
  }

  async checkAlert() {
    const alertText = await this.page.getByTestId('error-alert').textContent();

    expect(alertText).toBe('Incorrect email or password.');
  }
}
