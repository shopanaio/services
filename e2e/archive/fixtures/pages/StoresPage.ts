import { Page, Locator, expect } from '@playwright/test';

export class StoresPage {
  private page: Page;
  private url = '/stores';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-project-button');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitFor() {
    await expect(this.pageLocator).toBeVisible();
  }

  async openCreate() {
    await this.page.getByTestId('create-project-button').click();
  }

  async openProject() {
    await this.page.getByTestId('project-item').click();
  }

  async fillStoreName() {
    await this.page.fill('#store-name-field', 'New Store');
    //await this.page.getByTestId('next-button').click();
  }

  async fillLocalization() {
    await this.page.getByLabel('Country/Region').click();
    await this.page.getByText('Ukraine').click();
    /* 
    await this.page.getByLabel('Currency').click();
    await this.page.getByTitle('Ukrainian hryvnias (UAH)').click();
    
    await this.page.getByLabel('Languages').click();
    await this.page.getByTitle('English').click();
    
    await this.page.getByTestId('next-button').click();
    */
  }

  async fillCurrency() {
    await this.page.getByLabel('Currency').click();
    await this.page.getByTitle('Ukrainian hryvnias (UAH)').click();
  }

  async fillLanguages() {
    await this.page.getByLabel('Languages').click();
    await this.page.getByTitle('English').click();
  }

  async clickNextBtn() {
    await this.page.getByTestId('next-button').click();
  }

  async waitForLoadProducts() {
    await this.page.waitForLoadState('networkidle');
  }

  async checkCreateButton() {
    await this.page.getByTestId('create-button').click();
    await this.page.getByTestId('close-product-drawer-button').click();
  }
}
