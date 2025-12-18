import { expect, Locator, Page } from '@playwright/test';
import path from 'path';

export class CategoriesPage {
  private page: Page;
  private url = '/categories';
  private pageLocator: Locator;
  private defaultTimeout = 1000;
  public title: string;
  public slug: string;
  public products: { title: string; price: number; sizes?: string[] }[];
  public nameOfProduct: string;
  public countOfProducts: number;
  public categories: string[];

  constructor(page: Page) {
    this.title = 'Category title';
    this.categories = ['Clothes', 'Accessories', 'Interior', 'Gadgets', 'Sale'];
    this.slug = '';
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
    this.nameOfProduct = '';
    this.countOfProducts = 0;
    this.products = [
      {
        title: 'Hat',
        price: 15,
      },
      {
        title: 'Jeans',
        price: 50,
      },
      {
        title: 'Shirt',
        price: 30,
        sizes: ['S', 'M', 'L'],
      },
    ];
  }

  async openCategories() {
    await this.page.getByTestId('sidebar-menu-item-categories').click();
  }

  async openCreate() {
    await this.page.getByTestId('create-button').click();
  }

  async openEditCategory(string: string) {
    await this.page.getByText(string).click();
  }

  async changeStatus(status: 'Published' | 'Draft' | 'Archived') {
    await this.page.getByTestId('status-select').click();
    await this.page.getByTitle(status).click();
  }

  async fillCategoriesTitle(text: string) {
    await this.page.getByTestId('title-input').fill(text);
  }

  async saveTitleInConstructor() {
    const titleInput = this.page.getByTestId('title-input');
    const titleValue = await titleInput.inputValue();

    this.title = titleValue;
  }

  async clickSlugLockButton() {
    await this.page.getByTestId('slug-lock-button').click();
  }

  async checkSlugAccordingEditedSlug() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    expect(value).toBe(this.slug);
  }

  async checkSlugAccordingTitle() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();
    const title = this.title;

    const expectedSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    expect(value).toBe(expectedSlug);
  }

  async saveSlugInConstructor() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    this.slug = value;
  }

  async changeSlug(value: string) {
    const slugInput = this.page.getByTestId('slug-input');

    await slugInput.fill(value);
  }

  async checkValidationMessage() {
    await expect(this.page.getByTestId('validation-alert')).toBeVisible();
  }

  async clickDescription() {
    await this.page.getByRole('tab', { name: 'Description' }).click();
  }

  async fillDescription(string: string) {
    await this.page.locator('[data-testid="rich-text-editor"]').click();
    await this.page.locator('[data-testid="rich-text-editor"] [role="textbox"]').fill(string);
  }

  async clickSaveDescription() {
    await this.page.getByTestId('save-richtext-button').click();
  }

  async clickExcerpt() {
    await this.page.getByRole('tab', { name: 'Excerpt' }).click();
  }
  async fillExcerpt(string: string) {
    await this.page.getByTestId('excerpt-editor').fill(string);
  }

  async checkExcerpt() {
    const excerpt = this.page;
    await this.page.getByTestId('excerpt-editor').innerText();

    expect(excerpt).not.toBe('');
  }

  async clickUploadCover() {
    await this.page.getByTestId('cover-image-button').click();
  }

  async uploadCover(url: string) {
    await this.page.getByTestId('upload-from-url-button').click();

    await this.page.getByPlaceholder('https://').fill(url);
    await this.page.getByTestId('upload-modal-submit-button').click();
  }

  async clickUploadGallery() {
    await this.page.getByTestId('gallery-image-button').click();
  }

  async uploadGalleryImg(url: string) {
    const filePath = path.resolve(url);

    const fileInput = this.page
      .getByRole('dialog', { name: 'Browse files' })
      .getByTestId('upload-input');

    await fileInput.setInputFiles(filePath);
    await this.page.waitForTimeout(500);
  }

  async uploadFromFiles(fileName: string) {
    await this.page.getByText(fileName).click();
  }

  async removeImg() {
    await this.page.getByTestId('cover-clear-button').click();
  }

  async clickSelectCategoryType() {
    await this.page.getByTestId('entry-type-select').click();
  }

  async fillCategoryType(categoryType: string) {
    await this.page
      .getByTestId('entry-type-select')
      .locator('input')
      .type(categoryType, { delay: 100 });

    await this.page.waitForTimeout(500);
    await this.page.getByTestId('create-entry-type-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSelectParent() {
    await this.page.getByTestId('category-parent-select').click();
  }

  async selectParentInModal() {
    await this.page
      .getByTestId('browse-categories-table-row-1')
      .getByTestId('table-row-checkbox')
      .click();
  }

  async clickSelectChildren() {
    await this.page.getByTestId('category-children-select').click();
    await this.page.waitForTimeout(500);
  }

  async checkParent(text: string) {
    const tagItem = this.page.getByTestId('tag-item').filter({ hasText: text });
    await expect(tagItem).toHaveCount(1);
  }

  async checkChildren(text: string) {
    const tagItem = this.page.getByTestId('tag-item').filter({ hasText: text });
    await expect(tagItem).toHaveCount(1);
  }

  async selectChildrenInModalAndClickOk() {
    await this.page
      .getByRole('row', {
        name: 'Children category Draft',
        exact: true,
      })
      .getByTestId('table-row-checkbox')
      .click();
    await this.page.getByRole('button', { name: 'OK' }).click();
  }

  /* async checkSmartCollectionDisabled() {
    await expect(this.page.getByTestId('listing-type-auto').locator('input[type="radio"]')).toBeDisabled();
  } */

  async selectOrder(
    oldOrder:
      | 'Newest'
      | 'Oldest'
      | 'Product title: A-Z'
      | 'Product title: Z-A'
      | 'Lowest price'
      | 'Highest price'
      | 'Custom',
    order:
      | 'Newest'
      | 'Oldest'
      | 'Product title: A-Z'
      | 'Product title: Z-A'
      | 'Lowest price'
      | 'Highest price'
      | 'Custom',
  ) {
    await this.page.getByTitle(oldOrder).click();
    await this.page.getByTitle(order).click();
  }

  async changeAvailable() {
    await this.page.getByTestId('availability-sort-switch').click();
  }

  async checkTitle() {
    const title = await this.page.getByTestId('title-input').inputValue();
    expect(title).toBe(this.title);
  }

  async checkDescription() {
    const description = await this.page
      .locator('[data-testid="rich-text-editor"] [role="textbox"]')
      .innerText();

    expect(description).not.toBe('');
  }

  async checkContentDrawer(num: number) {
    await expect(this.page.getByTestId('category-drawer').locator('tr[data-testid]')).toHaveCount(
      num,
    );
  }

  async clickAddProduct() {
    await this.page.getByTestId('add-listing-product-button').click();
  }

  async manageContentAddProd(num: number) {
    for (let i = 1; i <= num; i++) {
      await this.page.waitForTimeout(1000);
      await this.page.locator('tr[data-row-key] td:nth-of-type(1)').nth(i).click();
    }
  }

  async closeCategory() {
    await this.page.waitForTimeout(200);

    await this.page.getByTestId('close-category-drawer-button').click();
  }
  async checkListingContentNumber(num: number) {
    const attribute = await this.page.getByTestId('listing-count-badge').getAttribute('data-count');

    expect(attribute).toBe(String(num));
  }

  async checkByNewest() {
    const productElements = await this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const uniqueProductTexts = Array.from(new Set(productTexts.map((text) => text.trim())));

    const expectedProductTitles = this.products.map((product) => product.title).reverse();

    for (let i = 0; i < uniqueProductTexts.length; i++) {
      const currentText = uniqueProductTexts[i];
      const expectedText = expectedProductTitles[i].trim();

      expect(currentText).toBe(expectedText);
    }
  }
  async checkByOldest() {
    const productElements = this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const uniqueProductTexts = Array.from(new Set(productTexts.map((text) => text.trim())));

    const expectedProductTitles = this.products.map((product) => product.title);

    for (let i = 0; i < uniqueProductTexts.length; i++) {
      const currentText = uniqueProductTexts[i];
      const expectedText = expectedProductTitles[i].trim();

      expect(currentText).toBe(expectedText);
    }
  }
  async checkAlphabeticalOrder() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const sortedProductTexts = [...productTexts].sort();

    for (let i = 0; i < productTexts.length; i++) {
      const currentText = productTexts[i].trim();
      const expectedText = sortedProductTexts[i];

      expect(currentText).toBe(expectedText);
    }
  }

  async checkReverseAlphabeticalOrder() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const reverseSortedProductTexts = [...productTexts].sort().reverse();

    for (let i = 0; i < productTexts.length; i++) {
      const currentText = productTexts[i].trim();
      const expectedText = reverseSortedProductTexts[i];

      expect(currentText).toBe(expectedText);
    }
  }
  async checkLowestPrice() {
    const productElements = this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const uniqueProductTexts = Array.from(new Set(productTexts.map((text) => text.trim())));

    const sortedByPrice = [...this.products].sort((a, b) => a.price - b.price);

    const sortedTitles = sortedByPrice.map((product) => product.title);

    for (let i = 0; i < uniqueProductTexts.length; i++) {
      const currentText = uniqueProductTexts[i];
      const expectedText = sortedTitles[i];

      expect(currentText).toBe(expectedText);
    }
  }

  async checkHighestPrice() {
    const productElements = await this.page.locator(
      '[data-testid="listing-drawer"] [data-testid="title-column"]',
    );
    const productTexts = await productElements.allTextContents();
    const uniqueProductTexts = Array.from(new Set(productTexts.map((text) => text.trim())));

    const sortedByPriceDescending = [...this.products].sort((a, b) => b.price - a.price);

    const sortedTitlesDescending = sortedByPriceDescending.map((product) => product.title);

    for (let i = 0; i < uniqueProductTexts.length; i++) {
      const currentText = uniqueProductTexts[i];
      const expectedText = sortedTitlesDescending[i];

      expect(currentText).toBe(expectedText);
    }
  }

  async scrollToProduct() {
    await this.page.getByTestId('listing-header').scrollIntoViewIfNeeded();
  }

  async dragProduct(from: number, to: number) {
    const sourceLocator = this.page.locator(`[data-testid="product-${from}"]`);
    const targetLocator = this.page.locator(`[data-testid="product-${to}"]`);

    await sourceLocator.waitFor({ state: 'visible' });
    await targetLocator.waitFor({ state: 'visible' });

    const source = await sourceLocator.boundingBox();
    const target = await targetLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 20,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async checkFirstProductIsLast() {
    const lastProductText = await this.page.locator('tr[data-testid="product-2"]').textContent();

    if (!lastProductText) {
      throw new Error('error');
    }

    expect(lastProductText).toBe(this.products[0].title);
  }

  async checkFirstProductIsFirst() {
    const firstProductText = await this.page.locator('tr[data-testid="product-0"]').textContent();

    if (!firstProductText) {
      throw new Error('error');
    }

    expect(firstProductText).toBe(this.products[0].title);
  }

  async takeCountOfProducts() {
    this.countOfProducts = await this.page.locator('tr[data-testid]').count();
  }

  async deleteProduct(num: number, quantity: number) {
    await this.page
      .locator(`tr[data-testid="product-${num}"] button[data-testid="remove-listing-item-button"]`)
      .click();

    const textLocator = this.page.locator(
      `text=You are about to remove ${quantity} product(s) from the list.`,
    );
    await expect(textLocator).toBeVisible();
    await this.page.getByTestId('confirm-remove-listing-items').click();

    this.countOfProducts -= quantity;

    await this.page.waitForTimeout(500);
  }

  async openProductInManageContent(num: number) {
    await this.page.waitForTimeout(100);

    await this.page.getByTestId(`product-${num}`).click();
  }

  async deleteCategoryFromProduct() {
    await this.page
      .locator(`tr[data-testid="category-row-0"] button[data-testid="delete--button"]`)
      .click();

    this.countOfProducts -= 1;
  }

  async uncheckInListing(num: number) {
    await this.page.getByTestId(`in-listing-switch-${num}`).click();

    this.countOfProducts -= 1;
  }

  async clickOkInModalBrowseProducts() {
    await this.page.getByTestId('browse-products-modal-submit-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickOkInModalBrowseFiles() {
    await this.page.getByTestId('browse-files-modal-submit-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickOkInModal() {
    await this.page.getByTestId('browse-modal-ok-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickOkInModalBrowseCategories() {
    await this.page.getByTestId('browse-categories-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseTags() {
    await this.page.getByTestId('browse-tags-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseFeatures() {
    await this.page.getByTestId('browse-features-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSmartCollection() {
    await this.page.getByTestId('listing-type-auto').click();
  }

  async clickAddFilter() {
    await this.page.getByTestId('listing-count-badge').scrollIntoViewIfNeeded();
    await this.page.getByText('Add filter').click();
    await this.page.waitForTimeout(200);
  }

  async selectFilterAvailability(num: number, status: string) {
    await this.page.getByTestId(`filter-select-${num}`).click();

    await this.page.getByTitle('Availability').click();

    await this.page.getByTestId('stock-status-select').click();
    await this.page.getByTestId(`stock-status-option-${status}`).click();
  }

  async selectFilterCategory(num: number) {
    await this.page.getByTestId(`filter-select-${num}`).click();

    await this.page.getByTitle('Category', { exact: true }).click();

    await this.page.getByTestId('category-select').click();
    await this.page
      .getByTestId('browse-categories-table-row-0')
      .getByTestId('table-row-checkbox')
      .click();
  }

  async selectFilterPrice(num: number, priceTo: number) {
    await this.page.getByTestId(`filter-select-${num}`).click();

    await this.page.getByTitle('Price').click();

    await this.page.getByTestId('price-to-input').fill(`${priceTo}`);
  }

  async selectFilterTag(num: number) {
    await this.page.getByTestId(`filter-select-${num}`).click();

    await this.page.getByTitle('Product tag', { exact: true }).click();

    await this.page.getByTestId('tag-select').nth(0).click();

    await this.page.getByTestId('tags-table-row-0').getByTestId('table-row-checkbox').click();
  }

  async selectFilterFeatures(num: number) {
    await this.page.getByTestId(`filter-select-${num}`).click();

    await this.page.getByTitle('Feature').click();

    await this.page.getByTestId(`operator-select-${num}`).click();
    await this.page.getByTitle('is one of').click();

    await this.page.getByTestId('feature-select').click();

    await this.page.getByTestId('feature-oversize').click();
    await this.page.getByTestId('feature-cotton').click();
    await this.page.getByTestId('feature-red').click();
  }

  async deleteSelectedFilterItem(itemsName: string) {
    await this.page.getByTitle(itemsName).locator('span').nth(1).click();
  }

  async checkFilteredProducts(productsArr: string[]) {
    await this.page.waitForTimeout(1000);
    await this.page.getByTestId('listing-count-badge').scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(1000);

    const titleElements = await this.page
      .locator('[data-testid="category-drawer"] [data-row-key]')
      .all();

    const titles = await Promise.all(titleElements.map((el) => el.textContent()));

    expect(titles).toEqual(productsArr);
  }

  async saveAndExitCategory() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-and-exit-category-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickSaveCategories() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-category-form-button').click();
    await this.page.waitForTimeout(200);
  }

  async timeout(time: number) {
    await this.page.waitForTimeout(time);
  }

  async reloadPage() {
    await this.page.reload();
  }
}
