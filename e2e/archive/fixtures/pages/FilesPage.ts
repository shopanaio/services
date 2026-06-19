import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import path from 'path';

export class FilesPage {
  private page: Page;
  private url = '/media';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
  }

  async openFiles() {
    await this.page.getByTestId('sidebar-menu-item-online-store').click();
    await this.page.getByTestId('sidebar-menu-item-media').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreate() {
    await this.page.getByTestId('create-button').click();
  }

  async dropPhotoToDropzone(url: string) {
    const filePath = path.resolve(url);

    const fileInput = this.page.locator('[data-testid="upload-input"]');

    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  async checkUploadedImg(row: number) {
    const tableRow = this.page.locator(`[data-testid="media-files-table-row-${row}"]`);
    const tableImageName = tableRow.locator(':nth-of-type(2)');
    const tableImageSize = tableRow.locator(':nth-of-type(3)');

    expect(tableImageName).not.toBe('');
    expect(tableImageSize).not.toBe('');

    await this.page.waitForTimeout(500);
  }

  async fillSearch(search: string) {
    await this.page.getByPlaceholder('Type to search...').fill(search);
    await this.page.waitForLoadState('networkidle');

    await this.page.waitForTimeout(500);
  }

  async clickSortByName() {
    await this.page.getByText('Name').click();
    await this.page.waitForLoadState('networkidle');

    await this.page.waitForTimeout(500);
  }

  async checkSortingByNameAscending() {
    const arr = [];

    for (let i = 0; i < 2; i++) {
      const rowData = this.page.getByTestId(`media-files-table-row-${i}`);
      const fileName = await rowData.locator('td').nth(2).textContent();
      arr.push(fileName?.trim());
    }

    const sortedArr = [...arr].sort();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByNameDescending() {
    const arr = [];

    for (let i = 0; i < 2; i++) {
      const rowData = this.page.getByTestId(`media-files-table-row-${i}`);
      const fileName = await rowData.locator('td').nth(2).textContent();
      arr.push(fileName?.trim());
    }

    const sortedArr = [...arr].sort().reverse();

    expect(arr).toEqual(sortedArr);
  }

  async clickFilter() {
    await this.page.getByText('Filter').click();

    await this.page.waitForTimeout(500);
  }

  async clickFilterSelect(string: string) {
    await this.page.getByTestId(`${string}-select`).click();

    await this.page.waitForTimeout(200);
  }

  async browseFilterCategory(row: number) {
    await this.page
      .getByTestId(`browse-categories-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async browseFilterProduct(row: number) {
    await this.page
      .locator('.ant-modal-content')
      .getByTestId(`browse-variants-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async selectRowInFilter(string: string) {
    await this.page.getByText(string).click();

    await this.page.waitForTimeout(200);
  }

  async checkSearchResult(expectedName: string) {
    const rowData = this.page.getByTestId('media-files-table-row-0');
    const fileName = await rowData.locator('td').nth(2).textContent();

    expect(fileName).toBe(expectedName);

    await this.page.waitForTimeout(200);
  }

  async clickOkInModal() {
    await this.page.getByTestId('browse-modal-ok-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseCategories() {
    await this.page.getByTestId('browse-categories-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseProducts() {
    await this.page.getByTestId('browse-variants-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async reloadPage() {
    await this.page.waitForTimeout(100);
    await this.page.reload();
    await this.page.waitForTimeout(100);
  }
}
