import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class FulfillmentPage {
  private page: Page;
  private url = '/fulfillment';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('stores-button');
  }

  async openFulfillment() {
    await this.page.getByTestId('sidebar-menu-item-orders-board').click();
    await this.page.waitForLoadState('networkidle');
  }

  async checkCreateButton() {
    await this.page.getByTestId('create-button').click();
  }

  async clickCreateColumn() {
    await this.page.getByRole('button').filter({ hasText: /^$/ }).nth(3).click();
  }

  async fillColumnTitle(title: string) {
    await this.page.getByTestId('board-column-name-field').fill(title);
  }

  async clickSubmitCreateColumn() {
    await this.page.getByTestId('board-column-modal-submit-button').click();
  }

  async checkOrdersQntInColumn(column: number, qnt: number) {
    await this.page.waitForTimeout(1000 * 1)
    const columnN = this.page.getByTestId('board-column').nth(column);

    const orders = await columnN.getByTestId('board-sortable-item').count()

    expect(orders).toBe(qnt)
  }

  async checkColumnsCount(expectedCount: number) {
    await this.page.waitForTimeout(1000 * 1)

    const columns = this.page.getByTestId('board-column');
    const actualCount = await columns.count();

    expect(actualCount).toBe(expectedCount);
  }

  async checkColumnTitles(expectedTitles: string[]) {
    const titles = this.page.getByTestId('board-column-title');
    const count = await titles.count();
    const actualTitles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await titles
        .nth(i)
        .innerText();

      const cleanedTitle = title.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
      actualTitles.push(cleanedTitle);
    }

    expect(actualTitles).toEqual(expectedTitles);
  }

  async checkColumnTitle(columnIndex: number, expectedTitle: string) {
    const title = await this.page.getByTestId('board-column-title').nth(columnIndex).innerText();

    expect(title.trim()).toBe(expectedTitle);
  }


  async checkOrderNumbersInColumn(column: number, expectedOrderNumbers: string[]) {
    const columnN = this.page.getByTestId('board-column').nth(column);
    const items = columnN.getByTestId('board-sortable-item');
    const count = await items.count();

    const actualOrderNumbers: string[] = [];

    await this.page.waitForTimeout(1000 * 1)

    for (let i = 0; i < count; i++) {
      const orderNumberEl = items
        .nth(i)
        .getByTestId('board-ticket-item')
        .getByTestId('order-number');

      const orderNumber = await orderNumberEl.innerText();
      actualOrderNumbers.push(orderNumber.trim());
    }

    expect(actualOrderNumbers).toEqual(expectedOrderNumbers);
  }

  async dragColumn(from: number, to: number) {
    const source = await this.page
      .getByTestId('board-column-drag-handle')
      .nth(from)
      .boundingBox();
    const target = await this.page
      .getByTestId('board-column-drag-handle')
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

  async dragOrderInColumn(from: number, to: number) {
    const source = await this.page
      .getByTestId('board-sortable-item')
      .nth(from)
      .boundingBox();
    const target = await this.page
      .getByTestId('board-sortable-item')
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

  async dragOrderToAnotherColumn(from: number, to: number) {
    const source = await this.page
      .getByTestId('board-sortable-item')
      .nth(from)
      .boundingBox();
    const target = await this.page
      .getByTestId('board-column-drag-handle')
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

  async reloadPage() {
    await this.page.waitForTimeout(100);
    await this.page.reload();
    await this.page.waitForTimeout(100);
  }

}
