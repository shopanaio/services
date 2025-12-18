import { Page, Locator, expect } from '@playwright/test';

export class FeaturesPage {
  private page: Page;
  private url = '/features';
  private pageLocator: Locator;
  public Color: string[] = ['Red', 'Green', 'Blue', 'Yellow', 'Black'];
  public Size: string[] = ['M', 'L'];
  public Material: string[] = ['Cotton', 'Wool'];

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async waitFor() {
    await expect(this.pageLocator).toBeVisible();
  }

  async openFeatures() {
    await this.page.getByTestId('sidebar-menu-item-features').click();
  }

  async openCreate() {
    await this.page.getByTestId('create-button').click();
  }


  async fillFeatureName(text: string) {
    await this.page.getByTestId('title-input').fill(text);
  }

  async clickAddValue() {
    await this.page.getByTestId('add-value-button').click();
  }

  async fillFeatureValue(valueName: string) {
    await this.page.getByTestId('value-field-0').fill(valueName);
  }

  async fillValueName(text: string, num: number, without: boolean) {
    const valueField = this.page.getByTestId(`value-field-${num}`);

    if (!(await valueField.isVisible())) {
      await this.page.getByTestId('add-value-button').click();
    }

    const value = without ? text : `${text} ${num + 1}`;
    await valueField.fill(value);

    await this.page.waitForTimeout(200);
  }

  async checkValidationMessage() {
    await expect(this.page.getByTestId('validation-alert')).toBeVisible();
  }

  async dragValue(from: number, to: number) {
    const source = await this.page
      .getByTestId('drawer')
      .locator('tr td:nth-child(2)')
      .nth(from)
      .boundingBox();
    const target = await this.page
      .getByTestId('drawer')
      .locator('tr td:nth-child(2)')
      .nth(to)
      .boundingBox();

    if (source && target) {
      await this.page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
      await this.page.mouse.down();

      await this.page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
        steps: 50,
      });

      await this.page.waitForTimeout(200);
      await this.page.mouse.up();
    }

    await this.page.waitForTimeout(1000);
  }

  async removeFeature(num: number) {
    await this.page.getByTestId('drawer').locator('tr td button').nth(num).click();
    await this.page.waitForTimeout(500);
  }

  async openEditFeature() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('title-column').click();
    await this.page.waitForTimeout(500);
  }

  async clickSaveFeature() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-form-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSaveAndExit() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-and-exit-button').click();
    await this.page.waitForTimeout(1000);
  }

  async clickCloseFeature() {
    await this.page.getByTestId('close-drawer-button').click();
  }

  async reloadPage() {
    await this.page.reload();
  }
}
