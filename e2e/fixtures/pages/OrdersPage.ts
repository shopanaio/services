import { Page, Locator, expect } from '@playwright/test';

export class OrdersPage {
  private page: Page;
  private url = '/orders';
  private pageLocator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
  }

  async openOrders() {
    await this.page.getByTestId('sidebar-menu-item-orders').click();
  }

  async clickCreate() {
    await this.page.getByTestId('create-button').click();
  }

  async openEdit(row: number) {
    await this.page.locator(`[data-testid="needs-fix-table-row-${row}"] td:nth-of-type(2)`).click();

    await this.page.waitForTimeout(500);
  }

  async clickAddProducts() {
    await this.page.getByTestId('browse-product-variants-button').click();
  }

  async selectProducts(row: number) {
    await this.page
      .getByTestId(`browse-variants-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async clickSelectCustomer() {
    await this.page.getByTestId('browse-customers-button').click();
  }

  async selectCustomer(row: number) {
    await this.page.waitForTimeout(500);
    await this.page
      .getByTestId(`browse-customers-table-row-${row}`)
      .getByTestId('table-row-checkbox')
      .click();
  }

  async checkCustomerName(expectedName: string) {
    const name = await this.page.getByTestId('contact-info-name').textContent();

    expect(name?.trim()).toBe(expectedName);
  }

  async checkCustomerEmail(expectedEmail: string) {
    const name = await this.page.getByTestId('contact-info-email').textContent();

    expect(name?.trim()).toBe(expectedEmail);
  }

  async checkCustomerPhone(expectedPhone: string) {
    const actualPhone = await this.page.getByTestId('contact-info-phone').textContent();
    const cleanedActual = actualPhone?.replace(/\D/g, '');
    const cleanedExpected = expectedPhone.replace(/\D/g, '');

    expect(cleanedActual).toBe(cleanedExpected);
  }

  async clickChangeCostPrice(num: number) {
    await this.page.getByTestId('order-item-edit-cost-price-button').nth(num).click();
  }

  async clickChangeQuantity(num: number) {
    await this.page.getByTestId('order-item-edit-qty-button').nth(num).click();
  }

  async clickIncrementQuantity(num: number) {
    await this.page.getByTestId('order-item-increment-button').nth(num).click();
  }

  async fillCostPrice(costPrice: number) {
    await this.page
      .getByRole('tooltip', { name: 'Cost price $ Cancel Save' })
      .getByTestId('order-item-cost-price-field')
      .fill(costPrice.toString());
  }

  async clickSaveInOrderItem() {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
    await this.page.waitForTimeout(500);
  }

  async checkTotalPrice(totalPrice: string) {
    await this.page.waitForTimeout(500);

    const elementText = await this.page
      .getByTestId('drawer')
      .getByRole('strong')
      .filter({ hasText: totalPrice });

    expect(elementText).toBeVisible();
  }

  async clickShipProducts() {
    await this.page.getByRole('button', { name: 'Ship products' }).click();
  }

  async clickProductsHeaderBtn() {
    await this.page.getByTestId('fulfillment-actions-menu').click();
  }

  async clickMarkAsShipped() {
    await this.page.getByTestId('mark-as-shipped-item').click();
  }

  async clickMarkAsDelivered() {
    await this.page.getByTestId('mark-as-delivered-item').click();
  }

  async clickMarkAsFulfilled() {
    await this.page.getByTestId('fulfill-item').click();
  }

  async clickMenuShipProduct(num: number) {
    await this.page.getByTestId('fulfillment-actions-menu').nth(num).click();
  }

  async clickCancelFulfillment() {
    await this.page.getByTestId('cancel-fulfillment-item').click();
  }

  async clickConfirmCancelFulfillment() {
    await this.page.getByTestId('change-fulfillment-status-ok').click();
  }

  async clickSplitFulfillmentInMenu() {
    await this.page.getByTestId('split-fulfillment-item').click();
  }

  async selectSplitProducts(num: number) {
    await this.page.getByTestId('drawer').getByTestId('table-row-checkbox').nth(num).click();
  }

  async decrementQntSplitProduct(num: number) {
    await this.page.getByTestId('drawer').getByTestId('order-item-split-decrement-button').nth(num).click();
  }

  async clickConfirmSplit() {
    await this.page.getByRole('button').getByText('Split fulfillment').click();
  }

  async checkOrderItemsHeaderCount(qnt: number) {
    await this.page.waitForTimeout(2000);
    const count = await this.page.getByTestId('order-items-header').count();

    expect(count).toBe(qnt);
  }

  async checkFirstTableRows(firstTable: number) {
    await this.page.waitForTimeout(2000);

    const firstTableRows = await this.page
      .getByTestId('drawer')
      .locator('table tbody')
      .nth(0)
      .getByTestId('title-column')
      .count();

    expect(firstTableRows).toBe(firstTable);
  }

  async checkSecondTableRows(secondTable: number) {
    await this.page.waitForTimeout(900);

    const secondTableRows = await this.page
      .getByTestId('drawer')
      .locator('table tbody')
      .nth(1)
      .getByTestId('title-column')
      .count();

    expect(secondTableRows).toBe(secondTable);
  }

  async checkFirstTableFirstProductQnt(firstProduct: string) {
    const firstTableProduct = await this.page
      .getByTestId('drawer')
      .locator('table tbody')
      .nth(0)
      .locator('td')
      .nth(2)
      .innerText();

    expect(firstTableProduct).toBe(firstProduct);
  }

  async checkSecondTableFirstProductQnt(secondProduct: string) {
    const secondTableProduct = await this.page
      .getByTestId('drawer')
      .locator('table tbody')
      .nth(1)
      .locator('td')
      .nth(2)
      .innerText();

    expect(secondTableProduct).toBe(secondProduct);
  }

  async clickUndoSplitting() {
    await this.page.getByTestId('undo-splitting-item').click();
  }

  async clickMarkAsPaid() {
    await this.page.getByTestId('mark-as-paid-button').click();
  }

  async clickChangePaymentStatus() {
    await this.page.getByTestId('change-payment-status-ok').click();
  }

  async clickPaymentMenu() {
    await this.page.getByTestId('payment-actions-menu').click();
  }

  async clickCancelPayment() {
    await this.page.getByTestId('cancel-payment-item').click();
  }

  async checkPaymentStatus(status: string) {
    await this.page.waitForTimeout(1000);

    const paymentStatus = await this.page.getByTestId('payment-status').innerText();

    expect(paymentStatus).toBe(status);
  }

  async fillTrackingCode(trackCode: number) {
    await this.page.getByTestId('tracking-code-field').fill(trackCode.toString());
  }

  async clickChangeWeight(row: number) {
    await this.page.getByTestId('weight-popover-trigger').nth(row).click();
  }

  async clickSaveChangeWeight(num: number) {
    await this.page.getByTestId('weight-popover-save-button').nth(num).click();
  }

  async fillWeight(weight: number, num: number) {
    await this.page.getByTestId('weight-input').nth(num).fill(weight.toString());
  }

  async clickSelectShippingMethod() {
    await this.page.getByText('Select method').locator('xpath=ancestor::div[1]').click();
  }

  async selectShippingMethod(method: string) {
    await this.page.getByTitle(method).click();
  }

  async clickSaveInShippingModal() {
    await this.page.getByTestId('shipping-modal-submit-button').click();

    await this.page.waitForTimeout(1000);
  }

  async checkFulfillmentStatus(status: string) {
    await this.page.waitForTimeout(2000);

    const orderStatus = await this.page.getByTestId('fulfillment-status').innerText();

    expect(orderStatus).toBe(status);
  }

  async checkOrderStatus(status: string) {
    await this.page.waitForTimeout(2000);

    const orderStatus = await this.page.getByTestId('order-status').innerText();

    expect(orderStatus).toBe(status);
  }

  async checkTimeline(event: string) {
    await this.page.waitForTimeout(2000);
    const eventTitle = await this.page.getByTestId('event-title').first().innerText();

    expect(eventTitle).toBe(event);
  }

  async clickClose() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('close-drawer-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickOkInModal() {
    await this.page.getByRole('button', { name: 'OK' }).click();
    await this.page.waitForTimeout(1000);
  }

  async clickConfirmOrder() {
    await this.page.getByTestId('confirm-order-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickOrderMenu() {
    await this.page.getByTestId('order-actions-menu').click();
    await this.page.waitForTimeout(200);
  }

  async clickCancelOrderInOrderMenu() {
    await this.page.getByTestId('cancel-order-item').click();
    await this.page.waitForTimeout(200);
  }

  async clickCancelOrder() {
    await this.page.getByTestId('cancel-order-button').click();
  }

  async fillCommentToChangeOrder(comment: string) {
    await this.page.getByTestId('order-status-modal-comment-field').fill(comment);
  }

  async checkCommentInTimeline(comment: string) {
    await this.page.waitForTimeout(800);
    const eventComment = await this.page.getByTestId('event-comment').first().innerText();

    expect(eventComment).toBe(comment);
  }

  async clickConfirmChangeOrder() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('change-order-status-ok').click();
    await this.page.waitForTimeout(200);
  }

  async clickQuickNoteBtn() {
    await this.page.getByTestId('quick-note-header').locator('button').click();
    await this.page.waitForTimeout(200);
  }

  async fillQuickNote(note: string) {
    await this.page.getByTestId('quick-note-field').fill(note);
  }

  async clickSaveQuickNote() {
    await this.page.getByTestId('quick-note-submit-button').click();
    await this.page.waitForTimeout(200);
  }

  async fillComment(note: string) {
    await this.page.getByTestId('add-comment-field').fill(note);
  }

  async clickSubmitComment() {
    await this.page.getByTestId('add-comment-submit-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickSelectTag() {
    await this.page.getByTestId('tag-select').click();
    await this.page.waitForTimeout(200);
  }

  async selectTag(row: number) {
    await this.page.getByTestId(`tags-table-row-${row}`).getByTestId('table-row-checkbox').click();
    await this.page.waitForTimeout(200);
  }

  async clickConfirmSelectTag() {
    await this.page /* .getByTestId('browse-tags-modal-cancel-button') */
      .getByRole('button', { name: 'OK' })
      .click();
    await this.page.waitForTimeout(200);
  }

  /*  async checkTag() {
     
   } */

  async clickCompleteOrder() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('complete-order-button').click();
    await this.page.waitForTimeout(200);
  }

  async clickSave() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-form-button').click();
    await this.page.waitForTimeout(200);
  }
}
