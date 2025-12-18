import { Page, Locator, expect } from '@playwright/test';

export class MenusPage {
  private page: Page;
  private url = '/orders';
  private pageLocator: Locator;
  public menus = ['CMYK', 'RGB', 'HEX']

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
  }

  async openMenus() {
    await this.page.getByTestId('sidebar-menu-item-online-store').click();
    await this.page.getByTestId('sidebar-menu-item-menus').click();
  }

  async clickCreate() {
    await this.page.getByTestId('create-button').click();
  }

  async openEdit(string: string) {
    await this.page.getByTestId('title-column').getByText(string).click();
  }

  async fillTitle(title: string) {
    await this.page.getByTestId('title-input').fill(title);
  }

  async fillSlug(value: string) {
    const slugInput = this.page.getByTestId('slug-input');

    await slugInput.fill(value);
  }

  async clickSlugLockButton() {
    await this.page.getByTestId('slug-lock-button').click();
  }

  async clickAddLink() {
    await this.page.getByTestId('add-link-button').click();
  }

  async fillLinkTitle(title: string) {
    await this.page.getByTestId('link-title-input').fill(title);
  }

  async clickSelectSource() {
    await this.page.getByTestId('link-type-select').click();
  }

  async selectSource(source: string) {
    if (source === 'Product') {
      await this.page.getByTestId('link-type-PRODUCT-item').click();
    }
    if (source === 'Category') {
      await this.page.getByTestId('link-type-CATEGORY-item').click();
    }
    if (source === 'Page') {
      await this.page.getByTestId('link-type-PAGE-item').click();
    }
    if (source === 'Url') {
      await this.page.getByTestId('link-type-LINK-item').click();
    }
  }

  async clickSelectProduct() {
    await this.page.getByTestId('product-select').click();
  }

  async clickSelectCategory() {
    await this.page.getByTestId('category-select').click();
  }

  async clickSelectPage() {
    await this.page.getByTestId('product-select').click();
  }

  async browseProduct(row: number) {
    await this.page
      .getByTestId(`browse-variants-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async browseCategory(row: number) {
    await this.page
      .getByTestId(`browse-categories-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async browsePage(row: number) {
    await this.page
      .getByTestId(`browse-pages-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  //FIXME data-testid
  async clickOkSelect() {
    await this.page /* .getByTestId('browse-variants-modal-submit-button') */
      .getByRole('button', { name: 'OK' })
      .click();
  }

  async clickSaveLink() {
    await this.page.getByTestId('link-modal-submit-button').click();
  }

  async clickCancelLink() {
    await this.page.getByTestId('link-modal-cancel-button').click();
  }

  async checkCountLinks(expectedCount: number) {
    await this.page.waitForTimeout(1000)
    const countOfLinks = await this.page.getByTestId('menu-drawer').getByTestId('tree-item-title').count();

    expect(countOfLinks).toBe(expectedCount);
  }

  async checkLinkRowTitle(row: number, expectedTitle: string) {
    await this.page.waitForTimeout(1000)
    const title = await this.page
      .getByTestId('tree-item-title')
      .nth(row - 1)
      .innerText();

    expect(title).toBe(expectedTitle);
  }

  async clickLinkRowEdit(row: number) {
    await this.page
      .getByTestId('tree-item-edit-button')
      .nth(row - 1)
      .click();
  }

  async clickSortByTitle() {
    await this.page
      .locator('span')
      .getByText('Title', { exact: true })
      .click();
  }

  async checkMenuRowTitle(row: number, expectedTitle: string) {
    await this.page.waitForTimeout(500)
    const title = await this.page
      .getByTestId('title-column')
      .nth(row - 1)
      .innerText();

    expect(title).toBe(expectedTitle);
  }

  async fillFilter(search: string) {
    await this.page.getByPlaceholder('Type to search...').fill(search);

  }

  async checkLinkSlug(slug: string) {
    const linkSlug = await this.page.getByTestId('link-slug').innerText();
    const expectedLinkSlug = `https://.../ ${slug}`;

    expect(linkSlug).toBe(expectedLinkSlug);
  }

  async saveAndExit() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-and-exit-menu-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSave() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-menu-form-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickClose() {
    await this.page.waitForTimeout(200);

    await this.page.getByTestId('close-menu-drawer-button').click();
  }
}
