import { Page, Locator, expect } from '@playwright/test';

export class TranslationsPage {
  private page: Page;
  private url = '/translations';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('stores-button');
  }

  async openTranslations() {
    await this.page.getByTestId('sidebar-menu-item-online-store').click();
    await this.page.getByTestId('sidebar-menu-item-translations').click();
    await this.page.waitForLoadState('networkidle');
  }

  async openRow(name: string) {
    await this.page.getByTestId('translations-layout').getByText(name).click();
  }

  async openProductForTranslate(productTitle: string) {
    await this.page.getByTitle(productTitle).getByTestId('title-column').click();
  }

  async openCategoryForTranslate(categoryTitle: string) {
    await this.page.locator(`span[data-testid="title-column"]:has-text(${categoryTitle})`).click();
  }

  async changeLanguage(row: number, language: string) {
    await this.page.waitForTimeout(400);

    await this.page
      .getByTestId('translation-drawer')
      .locator(`[data-testid="locales-item-${row}"]`)
      .getByText(language)
      .click();

    await this.page.waitForLoadState('networkidle');
  }

  async refillTitle(newTitle: string) {
    await this.page.getByTestId('title-input').fill(newTitle);
  }

  async checkTitle(string: string) {
    const title = await this.page.locator('[data-testid="title-input"]').inputValue();

    expect(title).toBe(string);
  }

  async clickDescription() {
    await this.page.getByRole('tab', { name: 'Description' }).click();
  }

  async refillDescription(string: string) {
    await this.page.getByTestId('rich-text-editor').click();
    await this.page.locator('[data-testid="rich-text-editor"] [role="textbox"]').fill(string);

    await this.page.getByTestId('save-richtext-button').click();
  }

  async checkDescription(string: string) {
    const description = await this.page
      .locator('[data-testid="rich-text-editor"] [role="textbox"]')
      .innerText();

    expect(description).toBe(string);
  }

  async clickExcerpt() {
    await this.page.getByText('Excerpt').click();
  }

  async refillExcerpt(string: string) {
    await this.page.getByTestId('excerpt-editor').fill(string);
  }

  async checkExcerpt(string: string) {
    const excerpt = await this.page.getByTestId('excerpt-editor').inputValue();

    expect(excerpt).toBe(string);
  }

  async refillFeatureValue(row: number, value: string) {
    await this.page.getByTestId(`value-${row - 1}-input`).fill(value);
  }

  async checkFeatureValue(row: number, string: string) {
    const value = await this.page.getByTestId(`value-${row - 1}-input`).inputValue();

    expect(value).toBe(string);
  }

  async saveTranslation() {
    await this.page.waitForTimeout(400);
    await this.page.getByTestId('submit-translation-form-button').click();
    await this.page.waitForTimeout(400);
  }

  async closeTranslationModal() {
    await this.page.waitForTimeout(400);
    await this.page.getByTestId('close-translation-drawer-button').click();
    await this.page.waitForTimeout(400);
  }

  async checkLanguage(itemNum: number, language: string) {
    const item = this.page.locator(`[data-testid="locales-item-${itemNum}"]`);

    await expect(item).toHaveText(language);
  }

  async reloadPage() {
    await this.page.waitForTimeout(100);
    await this.page.reload();
    await this.page.waitForTimeout(100);
  }
}
