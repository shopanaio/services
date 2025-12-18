import { Page, Locator, expect } from '@playwright/test';

export class ProductsPage {
  private page: Page;
  private url = '/products';
  private pageLocator: Locator;
  public slug = '';
  public title = 'Product';
  public editedTitle = 'Edited title';
  public price = 100;
  public products: {
    title: string;
    stockStatus: string;
    price: number;
    sizes?: string[];
    color?: string[];
    material?: string[];
  }[];

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
    this.products = [
      {
        title: 'Sunglasses',
        stockStatus: 'in-stock',
        price: 35,
      },
      {
        title: 'Hat',
        stockStatus: 'in-stock',
        price: 45,
      },
      {
        title: 'Pants',
        stockStatus: 'in-stock',
        price: 38,
      },
      {
        title: 'Gloves',
        stockStatus: 'out-of-stock',
        price: 25,
      },
      {
        title: 'Hoodie',
        stockStatus: 'in-stock',
        price: 30,
        sizes: ['oversize'],
        material: ['cotton'],
        color: ['red', 'green', 'blue'],
      },
    ];
  }

  async openProducts() {
    await this.page.getByTestId('sidebar-menu-item-products').click();

    await this.page.waitForLoadState('networkidle');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitFor() {
    await expect(this.pageLocator).toBeVisible();
  }

  async openCreate() {
    await this.page.getByTestId('create-button').click();
    this.slug = await this.page.getByTestId('slug-input').inputValue();
  }

  async getTitleDataCount() {
    const count = await this.page.getByTestId('page-title-wrapper').getAttribute('data-count');
    return `${count}`;
  }

  async openEditProduct(string: string) {
    await this.page.waitForTimeout(500);
    await this.page.getByTitle(string).first().click();

    await this.page.waitForTimeout(500);
  }

  async fillProductName(name: string) {
    await this.page.getByTestId('title-input').fill(name);

    await this.page.waitForTimeout(100);

    this.slug = await this.page.getByTestId('slug-input').inputValue();
  }

  async checkSlugChanged() {
    const slugInput = this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    expect(value).toBe(this.slug);
  }
  async syncSlug() {
    await this.page.getByTestId('slug-lock-button').click();

    const slugInput = await this.page.getByTestId('slug-input');
    const value = await slugInput.inputValue();

    expect(value).not.toBe(this.slug);
  }
  async checkSlug() {
    const slugInputValue = await this.page.getByTestId('slug-input').inputValue();

    expect(slugInputValue).toBe(this.slug);
  }

  async fillSlug(slug: string) {
    await this.page.getByTestId('slug-input').fill(slug);
  }

  async checkTitle() {
    const productTitle = await this.page.getByTestId('title-input').inputValue();

    expect(productTitle).toBe(this.editedTitle);
  }
  async checkPrice() {
    const productPrice = await this.page.getByTestId('price-input').inputValue();

    expect(Number(productPrice)).toBe(this.price);
  }
  //async checkDescription() {}
  async checkExcerpt() {
    await this.page.getByText('Excerpt').click();
    const productExcerpt = await this.page.getByTestId('excerpt-editor').inputValue();

    expect(productExcerpt).not.toBe('');
  }
  async checkWeight() {
    const productWeight = await this.page.getByTestId('weight-input').inputValue();

    expect(productWeight).not.toBe('');
  }
  async checkCategory() {
    const categoryRowCount = this.page.locator('[data-testid="category-row-0"]').count();

    expect(categoryRowCount).not.toBe(0);
  }

  async fillProductPrice(price: number) {
    await this.page.getByTestId('price-input').fill(`${price}`);
  }

  async fillProductCostPrice(price: number) {
    await this.page.getByTestId('cost-price-input').fill(`${price}`);
  }

  async fillVariantPrice(num: number, price: number) {
    await this.page.getByTestId(`price-input-${num}`).fill(`${price}`);
  }

  async fillDescription(string: string) {
    await this.page.locator('[data-testid="rich-text-editor"]').click();
    await this.page.locator('[data-testid="rich-text-editor"] [role="textbox"]').fill(string);

    await this.page.getByTestId('save-richtext-button').click();
  }

  async fillExcerpt(string: string) {
    await this.page.getByText('Excerpt').click();
    await this.page.getByTestId('excerpt-editor').fill(string);
  }

  async fillSku(string: string) {
    await this.page.getByTestId('sku-input').fill(string);
  }

  async switchShipping() {
    await this.page.getByTestId('requires-shipping-switch').click();
  }

  async fillWeight(weight: number) {
    await this.page.getByTestId('weight-input').fill(`${weight}`);
  }

  async clickUploadCover() {
    await this.page.getByTestId('cover-image-button').click();
  }

  async uploadCover(url: string) {
    await this.page.getByTestId('upload-from-url-button').click();

    await this.page.getByPlaceholder('https://').fill(url);
    await this.page.getByTestId('upload-modal-submit-button').click();
  }

  async uploadFromFiles(fileName: string) {
    await this.page.getByText(fileName).click();
  }

  async removeCover() {
    await this.page.getByTestId('cover-clear-button').click();
  }

  async clickSelectType() {
    await this.page.getByTestId('entry-type-select').click();
  }

  async fillType(type: string) {
    await this.page.getByTestId('entry-type-select').locator('input').type(type, { delay: 100 });

    await this.page.waitForTimeout(500);
    await this.page.getByTestId('create-entry-type-button').click();
    await this.page.waitForTimeout(500);
  }

  async uploadGalleryImg(url: string) {
    await this.page.getByTestId('gallery-image-button').click();
    await this.page.getByTestId('upload-from-url-button').nth(1).click();

    await this.page.getByPlaceholder('https://').fill(url);
    await this.page.getByTestId('upload-modal-submit-button').click();
  }

  async dragImg(from: number, to: number) {
    const sourceLocator = this.page.locator(`[data-testid="gallery-${from}-image-preview"]`);

    const sourceButtonLocator = sourceLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .locator('[role="button"]')
      .nth(from);

    const targetLocator = this.page.locator(`[data-testid="gallery-${to}-image-preview"]`);

    const targetButtonLocator = targetLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .locator('[role="button"]')
      .nth(to);

    await sourceButtonLocator.waitFor({ state: 'visible' });
    await targetButtonLocator.waitFor({ state: 'visible' });

    const source = await sourceButtonLocator.boundingBox();
    const target = await targetButtonLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickAddCategory() {
    await this.page.getByTestId('browse-categories-button').click();
  }

  async selectCategory(category: string) {
    await this.page.getByText(category).click();
  }

  async clickOkInModalBrowseCategories() {
    await this.page.getByTestId('browse-categories-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickAddFeature() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('add-attributes-button').click();

    await this.page.waitForTimeout(500);
  }

  async clickAddOptions() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('add-options-button').click();

    await this.page.waitForTimeout(500);
  }

  async fillFeaturesTitle(title: string, delay: boolean) {
    if (delay) {
      await this.page.waitForTimeout(1500);
    }
    await this.page
      .getByTestId('feature-group-autocomplete')
      .locator('input')
      .type(title, { delay: 100 });

    await this.page.waitForTimeout(500);
    await this.page.getByTestId('create-feature-group-button').click();
    await this.page.waitForTimeout(500);
  }

  async addFeature(feature: string) {
    await this.page.getByTestId('groups-header').scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await this.page
      .getByTestId(`feature-autocomplete`)
      .locator('input')
      .type(feature, { delay: 100 });

    await this.page.waitForTimeout(1000);
    await this.page.getByTestId('create-feature-button').click();
    await this.page.waitForTimeout(1000);
  }

  async editFeature(num: number) {
    await this.page
      .locator(`[data-testid="attributes-row-${num}"] [data-testid="edit-attributes-button"]`)
      .click();

    await this.page.waitForTimeout(500);
  }

  async removeFeature(num: number) {
    await this.page
      .locator(`[data-testid="attributes-row-${num}"] [data-testid="delete-attributes-button"]`)
      .click();

    await this.page.waitForTimeout(500);
  }

  async checkRemove() {
    const firstElLocator = this.page.locator('[data-testid="attributes-row-0"] span[title]');

    const firstElText = await firstElLocator.textContent();

    expect(firstElText?.trim()).not.toBe('color');
  }

  async clickDoneFeatures() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-attributes-button').click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async clickDoneOptions() {
    await this.page.getByTestId('submit-options-button').click({ force: true });

    await this.page.waitForTimeout(500);
  }

  async checkValidationMassage(alertMessage: string) {
    const textLocator = await this.page
      .getByTestId('validation-alert-error')
      .locator('span')
      .textContent();

    expect(textLocator).toBe(alertMessage);
  }

  async clickBrowseFeature() {
    await this.page.getByTestId('browse-features-button').first().click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async selectExistingFeature(featuresName: string) {
    await this.page.getByText(featuresName).click();
  }

  async clickOkInModalBrowseFiles() {
    await this.page.getByTestId('browse-files-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseFeatures() {
    await this.page.getByTestId('browse-features-modal-submit-button').click();
    await this.page.waitForTimeout(1000);
  }

  /*  async clickOkInModal() {
    await this.page.getByTestId('browse-modal-ok-button').click();
    await this.page.waitForTimeout(500);
   } */

  async clickOkInModalBrowseTags() {
    await this.page.getByTestId('browse-tags-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickOkInModalBrowseVariants() {
    await this.page.getByTestId('browse-variants-modal-submit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSelectFeature() {
    await this.page.getByTestId('attributes-header').scrollIntoViewIfNeeded();

    await this.page.waitForTimeout(1000);
    await this.page.getByTestId('feature-autocomplete').click({ force: true });
    await this.page.waitForTimeout(1000);
  }

  async clickOnFeatureByTitle(title: string, scroll: boolean) {
    if (scroll) {
      await this.page.getByTestId('groups-header').scrollIntoViewIfNeeded();
    }

    await this.page.getByTitle(title, { exact: true }).click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async expandRows(name: string, count: number) {
    await this.page.waitForTimeout(100);
    await this.page
      .getByRole('row', { name: `${name} ${count} Variants` })
      .getByTestId('table-row-expand-button')
      .click();

    await this.page.waitForTimeout(1000);
  }

  async countNestedRows(num: number) {
    const nestedRows = this.page.locator('.ant-table-row-level-1');
    const nestedCount = await nestedRows.count();

    expect(nestedCount).toBe(num);
  }

  async dragFeatures(from: number, to: number) {
    const sourceLocator = this.page.getByTestId(`attributes-row-${from}`);
    const targetLocator = this.page.getByTestId(`attributes-row-${to}`);

    await targetLocator.scrollIntoViewIfNeeded();

    await sourceLocator.waitFor({ state: 'visible' });
    await targetLocator.waitFor({ state: 'visible' });

    const source = await sourceLocator.boundingBox();
    const target = await targetLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async dragFeaturesValues(from: number, to: number) {
    const sourceLocator = this.page.getByTestId(`feature-value-input-${from}`);
    const targetLocator = this.page.getByTestId(`feature-value-input-${to}`);

    const sourceButtonLocator = sourceLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .locator('[role="button"]')
      .nth(from);

    const targetButtonLocator = targetLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .locator('[role="button"]')
      .nth(to);

    await sourceButtonLocator.waitFor({ state: 'visible' });
    await targetButtonLocator.waitFor({ state: 'visible' });

    const source = await sourceButtonLocator.boundingBox();
    const target = await targetButtonLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async dragOption(from: number, to: number) {
    const sourceLocator = this.page.getByTestId(`options-row-${from}`);
    const targetLocator = this.page.getByTestId(`options-row-${to}`);

    await sourceLocator.waitFor({ state: 'visible' });
    await targetLocator.waitFor({ state: 'visible' });

    const source = await sourceLocator.boundingBox();
    const target = await targetLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async checkVariantOrder(order: string[]) {
    await this.page.waitForTimeout(1000);
    const elements = await this.page.locator('[data-testid="root-title-undefined"]').all();

    const texts = await Promise.all(elements.map((el) => el.textContent()));

    expect(texts).toEqual(order);
  }

  async checkInnerVariantOrder() {
    const titles: string[] = [];

    for (let i = 0; i < 6; i++) {
      const element = this.page.locator(`[data-testid="variant-title-${i}"]`);
      const title = await element.textContent();
      titles.push(title?.trim() ?? '');
    }

    const pattern = /^[M|L] ▸ (Red|Green|Blue)$/;
    titles.forEach((title) => expect(title).toMatch(pattern));

    const expectedOrder = ['M ▸ Green', 'M ▸ Red', 'M ▸ Blue', 'L ▸ Green', 'L ▸ Red', 'L ▸ Blue'];

    expect(titles).toEqual(expectedOrder);
  }

  async dragOptionValue(from: number, to: number) {
    const sourceLocator = this.page.getByTestId('sortable-feature').nth(from);
    const targetLocator = this.page.getByTestId('sortable-feature').nth(to);

    await sourceLocator.waitFor({ state: 'visible' });
    await targetLocator.waitFor({ state: 'visible' });

    const source = await sourceLocator.boundingBox();
    const target = await targetLocator.boundingBox();

    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async checkFeaturesOrder() {
    const firstElLocator = this.page.locator('[data-testid="attributes-row-0"] span[title]');
    const secondElLocator = this.page.locator('[data-testid="attributes-row-1"] span[title]');

    const firstElText = await firstElLocator.textContent();
    const secondElText = await secondElLocator.textContent();

    expect(firstElText?.trim()).not.toBe('color');
    expect(secondElText?.trim()).not.toBe('size');
  }

  async checkAttributesValue(num: number, expectedValues: string) {
    const value = await this.page.getByTestId(`variant-title-${num}`).textContent();

    expect(value).toBe(expectedValues);
  }

  async editOption(num: number) {
    await this.page
      .locator(`[data-testid="options-row-${num}"] [data-testid="edit-options-button"]`)
      .click();

    await this.page.waitForTimeout(700);
  }

  async removeOption(num: number) {
    await this.page
      .locator(`[data-testid="options-row-${num}"] [data-testid="delete-options-button"]`)
      .click();

    await this.page.waitForTimeout(200);
  }

  async removeValueInOption(value: string) {
    const element = this.page.locator(`[value="${value}"]`);
    const parent = element.locator('xpath=..');
    const button = parent.locator('button');

    await button.click();

    await this.page.waitForTimeout(200);
  }

  async retitleInOption(oldTitle: string, newTitle: string) {
    await this.page.locator(`[data-testid="title-input"][value=${oldTitle}]`).fill(newTitle);
  }

  async openOption(num: number) {
    await this.page
      .locator(`[data-testid="options-row-${num}"] [data-testid="title-column"]`)
      .click({ force: true });
  }

  async changeStatus(status: string) {
    await this.page.getByTestId('stock-status-select').click();
    await this.page.getByTestId(`stock-status-option-${status}`).click();
  }

  /*  async changeVariantStatus(num: number, status: string) {
    const inputLocator = this.page.getByTestId(`price-input-${num}`);

    const statusLocator = inputLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .getByTestId('stock-status-select');

    await statusLocator.click();

    await this.page
      .getByTestId(`stock-status-option-${status}`)
      .nth(num)
      .click();
  } */

  async clickVariantStatus(num: number) {
    const inputLocator = this.page.getByTestId(`price-input-${num}`);

    const statusLocator = inputLocator
      .locator('..')
      .locator('..')
      .locator('..')
      .getByTestId('stock-status-select');

    await statusLocator.click();
  }

  async changeVariantStatus(num: number, status: string) {
    await this.page.getByTestId(`stock-status-option-${status}`).nth(num).click();
  }

  async openVariantForm(num: number) {
    await this.page.waitForTimeout(400);

    await this.page.getByTestId(`variant-title-${num}`).click({ force: true });

    await this.page.waitForTimeout(200);
  }

  async retitleVariant() {
    const pageTitleWrapper = await this.page
      .getByTestId('variant-drawer')
      .getByTestId('page-title-wrapper')
      .textContent();

    const inputText = await this.page
      .getByTestId('variant-drawer')
      .getByTestId('title-input')
      .inputValue();

    await this.page
      .getByTestId('variant-drawer')
      .getByTestId('title-input')
      .fill(`${inputText} ${pageTitleWrapper}`);
  }

  async saveVariantForm() {
    await this.page.getByTestId('submit-variant-form-button').click();

    await this.page.waitForTimeout(200);
  }

  async variantsSettings(switches: number) {
    await this.page.getByTestId('variants-settings-button').click();
    await this.page.getByTestId('variants-settings-item-listing').click();
    await this.page.getByTestId('variants-settings-submit-button').click();

    for (let i = 1; i < switches; i++) {
      await this.page.getByTestId(`in-listing-switch-${i}`).click();
    }
  }

  async variantsSetPriceAvailable() {
    await this.page.getByTestId('variants-settings-button').click();

    await this.page.getByTestId('variants-settings-item-title').click();
    await this.page.getByTestId('variants-settings-item-price').click();
    await this.page.getByTestId('variants-settings-item-shipping').click();
    await this.page.getByTestId('variants-settings-item-availability').click();
    await this.page.getByTestId('variants-settings-item-inventory').click();

    await this.page.getByTestId('variants-settings-submit-button').click();
  }

  async clickAddComponent() {
    await this.page.getByTestId('add-group-products-button').click({ force: true });
  }

  async fillGroupTitle(newGroupTitle: string) {
    await this.page.getByTestId('product-group-title-input').type(newGroupTitle, { delay: 100 });
  }

  async dragGroup(/* from: string, to: string */ from: number, to: number) {
    await this.page.waitForTimeout(1000);
    const sourceLocator = this.page.locator(
      `[data-testid="-row-${from}"] span[data-testid="title-column"]`,
    );
    const targetLocator = this.page.locator(
      `[data-testid="-row-${to}"] span[data-testid="title-column"]`,
    );

    await sourceLocator.scrollIntoViewIfNeeded();

    await sourceLocator.waitFor({ state: 'visible' });
    await targetLocator.waitFor({ state: 'visible' });

    const source = await sourceLocator.boundingBox();
    const target = await targetLocator.boundingBox();

    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('load');

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 30,
      });
      await this.page.mouse.up();

      await this.page.waitForTimeout(1000);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async deleteGroup(num: number) {
    await this.page.locator(`[data-testid="-row-${num}"] [data-testid="delete--button"]`).click();

    await this.page.waitForTimeout(200);
  }

  async editGroup(num: number) {
    await this.page.locator(`[data-testid="-row-${num}"] [data-testid="edit--button"]`).click();

    await this.page.waitForTimeout(500);
  }

  async clickSelectProducts() {
    await this.page.getByTestId('browse-product-variants-button').click({ force: true });
    await this.page.waitForTimeout(500);
  }

  async clickOnComponent(num: number) {
    await this.page
      .getByTestId(`browse-variants-table-row-${num}`)
      .getByTestId('title-column')
      .click();
  }

  async toggleMultipleSelection() {
    const toggle = this.page.getByTestId('multiple-selection-toggle');
    await toggle.click({ force: true });

    await this.page.waitForTimeout(500);
  }

  async toggleRequired() {
    await this.page.getByTestId('required-toggle').click({ force: true });

    await this.page.waitForTimeout(500);
  }

  async clickDoneGroup() {
    await this.page.getByTestId('submit-group-button').click({ force: true });

    await this.page.waitForTimeout(500);
  }

  async checkGroup(rowNum: number, title: string) {
    const rowTitle = this.page.locator(
      `[data-testid="-row-${rowNum}"] span[data-testid="title-column"]`,
    );

    await expect(rowTitle).toHaveText(title);
  }

  async clickSelectTag() {
    const selectTagLocator = this.page.getByTestId('tag-select');
    await selectTagLocator.scrollIntoViewIfNeeded();
    await selectTagLocator.click();
  }

  async selectTag(tagName: string) {
    await this.page.getByText(tagName).click();
  }

  async deleteTagFromProduct(tagName: string) {
    const tagLocator = this.page.getByTestId('tag-item').filter({ hasText: tagName });
    await tagLocator.locator('span').click();

    await this.page.waitForTimeout(200);
  }

  async checkTagInProduct(tag: string) {
    const tagsArr = await this.page.getByTestId('tag-item').allTextContents();

    expect(tagsArr).toContain(tag);
  }

  async checkTagIsAbsent(tag: string) {
    const tagsArr = await this.page.getByTestId('tag-item').allTextContents();

    expect(tagsArr).not.toContain(tag);
  }

  async clickSortBy(columnName: string) {
    await this.page.locator(`th[aria-label=${columnName}] div`).click();
  }

  async checkAlphabeticalOrder() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.getByTestId('title-column');

    const productTexts = await productElements.allTextContents();
    const sortedProductTexts = productTexts.toSorted();

    expect(productTexts).toEqual(sortedProductTexts);
  }

  async checkReverseAlphabeticalOrder() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.getByTestId('title-column');

    const productTexts = await productElements.allTextContents();
    const reverseSortedProductTexts = productTexts.toSorted().toReversed();

    expect(productTexts).toEqual(reverseSortedProductTexts);
  }

  async checkLowestPrice() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.getByTestId('title-column');
    const productTexts = await productElements.allTextContents();

    const sortedByPrice = this.products.toSorted((a, b) => a.price - b.price);

    const sortedTitles = sortedByPrice.map((product) => product.title);

    expect(productTexts).toEqual(sortedTitles);
  }

  async checkHighestPrice() {
    await this.page.waitForTimeout(1000);
    const productElements = this.page.getByTestId('title-column');
    const productTexts = await productElements.allTextContents();

    const sortedByPriceDescending = this.products.toSorted((a, b) => b.price - a.price);

    const sortedTitles = sortedByPriceDescending.map((product) => product.title);

    expect(productTexts).toEqual(sortedTitles);
  }

  async saveProduct() {
    await this.page.getByTestId('submit-product-form-button').click();

    await this.page.waitForTimeout(1500);
  }

  async saveAndExitProduct() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-and-exit-product-button').click();
    await this.page.waitForTimeout(200);
  }

  async closeProductCreate() {
    await this.page.waitForTimeout(100);
    await this.page.getByTestId('close-product-drawer-button').click();
  }

  async timeout(time: number) {
    await this.page.waitForTimeout(time * 1000);
  }

  async reloadPage() {
    await this.page.waitForTimeout(100);
    await this.page.reload();
    await this.page.waitForTimeout(100);
  }
}
