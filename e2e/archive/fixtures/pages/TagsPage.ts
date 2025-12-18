import { Page, Locator, expect } from '@playwright/test';

export class TagsPage {
  private page: Page;
  private url = '/settings/tags';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('stores-button');
  }

  async openSettings() {
    await this.page.getByTestId('sidebar-menu-item-settings').click();
    await this.page.waitForLoadState('networkidle');
  }
  async openTagsInSettings() {
    await this.page.getByTestId('filters-nav-item-3').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCreateTag() {
    await this.page.getByTestId('submit-tags=form-button').click();
  }

  async fillTagName(tagName: string) {
    await this.page.getByTestId('feature-title-input').fill(tagName);
  }

  async clickSaveTag() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('modal-submit-button').click();
    await this.page.waitForTimeout(200);
  }

  async checkTag(row: number, waitingTitle: string) {
    const title = this.page.locator(`[data-testid="tags-table-row-${row}"] td:nth-of-type(2)`);

    await expect(title).toHaveText(waitingTitle);
  }
}
