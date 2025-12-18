import { Page, expect } from '@playwright/test';

export class SettingsPage {
  private page: Page;
  private url = '/settings/tags';

  constructor(page: Page) {
    this.page = page;
  }

  async openSettings() {
    await this.page.getByTestId('sidebar-menu-item-settings').click();
    await this.page.waitForLoadState('networkidle');
  }

  async checkDefaultLanguage(string: string) {
    const languageItem = this.page.getByTestId(`language-item-default-${string}`);

    await expect(languageItem).toHaveCount(1);
  }

  async checkLanguageExisting(string: string) {
    const languageItem = this.page.getByTestId(`language-item-${string}`);

    await expect(languageItem).toHaveCount(1);
  }

  async clickOnLanguage(string: string) {
    await this.page.getByTestId(`language-item-${string}`).click();
  }

  async clickSetAsDefault(string: string) {
    await this.page.getByTestId(`set-default-language-item-${string}`).click();
  }

  async clickConfirmSetAsDefault() {
    await this.page.getByTestId('set-default-language-modal-submit-button').click();
  }

  async clickDeleteLanguage(string: string) {
    await this.page.getByTestId(`delete-language-item-${string}`).click();
  }

  async clickConfirmDeleteLanguage() {
    await this.page.getByTestId('delete-language-modal-submit-button').click();
  }

  async clickAddLanguage() {
    await this.page.getByTestId('add-language-button').click();
  }

  async clickSelectLanguage() {
    await this.page.getByTestId('language-select').click();
  }

  async selectLanguageByTitle(language: string) {
    await this.page.getByTestId(`language-select-item-${language}`).click();
  }

  async clickConfirmInModalAddLanguage() {
    await this.page.getByTestId('add-language-modal-submit-button').click();
  }
}
