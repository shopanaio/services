import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export class CustomersPage {
  private page: Page;
  private url = '/customers';
  private pageLocator: Locator;
  public customers = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-456',
      language: 'English',
    },
    {
      firstName: 'Anna',
      lastName: 'Müller',
      email: 'anna.mueller@example.com',
      phone: '555-987-654',
      language: 'Dutch',
    },
    {
      firstName: 'Pierre',
      lastName: 'Dubois',
      email: 'pierre.dubois@example.com',
      phone: '555-567-890',
      language: 'Czech',
    },
  ];

  constructor(page: Page) {
    this.page = page;
    this.pageLocator = this.page.getByTestId('create-button');
  }

  async openCustomers() {
    await this.page.getByTestId('sidebar-menu-item-customers').click();
  }

  async clickCrateCustomer() {
    await this.page.getByTestId('create-button').click();
  }

  async fillCustomersName(name: string) {
    await this.page.getByTestId('first-name-input').fill(name);
  }

  async fillCustomersLastName(lastName: string) {
    await this.page.getByTestId('last-name-input').fill(lastName);
  }

  async fillCustomerLanguage(language: string) {
    await this.page.getByTestId('language-field').click();
    await this.page.getByText(language, { exact: true }).click();
  }

  async fillCustomersEmail(email: string) {
    await this.page.getByTestId('email-input').fill(email);
  }

  async fillCustomersPhone(phoneNum: string) {
    await this.page.getByTestId('phone-number-input').fill(phoneNum);
  }

  async clickVerified() {
    await this.page.getByTestId('verify-email-switch').click();
  }

  async checkData(row: number, customer: Customer) {
    await this.page.waitForTimeout(500);
    const rowData = this.page.getByTestId(`customers-table-row-${row}`);

    const name = await rowData.locator('td').nth(1).textContent();
    const lastName = await rowData.locator('td').nth(2).textContent();
    const email = await rowData.locator('td').nth(3).textContent();
    const phone = await rowData.locator('td').nth(4).textContent();

    expect(name).toBe(customer.firstName);
    expect(lastName).toBe(customer.lastName);
    expect(email).toBe(customer.email);
    expect(phone?.replace(/\D/g, '')).toBe(customer.phone.replace(/\D/g, ''));
  }

  async clickSortByName() {
    await this.page.getByText('First name').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickSortByLastName() {
    await this.page.getByText('Last name').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickSortByEmail() {
    await this.page.getByText('Email').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickSortByPhone() {
    await this.page.getByText('Phone').click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickCloseCreate() {
    await this.page.getByTestId('close-drawer-button').click();
  }

  async checkSortingByNameAscending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersName = await rowData.locator('td').nth(1).textContent();
      arr.push(customersName?.trim());
    }

    const sortedArr = [...arr].sort();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByNameDescending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersName = await rowData.locator('td').nth(1).textContent();
      arr.push(customersName?.trim());
    }

    const sortedArr = [...arr].sort().reverse();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByLastNameAscending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersLastName = await rowData.locator('td').nth(2).textContent();
      arr.push(customersLastName?.trim());
    }

    const sortedArr = [...arr].sort();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByLastNameDescending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersLastName = await rowData.locator('td').nth(2).textContent();
      arr.push(customersLastName?.trim());
    }

    const sortedArr = [...arr].sort().reverse();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByEmailAscending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersEmail = await rowData.locator('td').nth(3).textContent();
      arr.push(customersEmail?.trim());
    }

    const sortedArr = [...arr].sort();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByEmailDescending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const customersEmail = await rowData.locator('td').nth(3).textContent();
      arr.push(customersEmail?.trim());
    }

    const sortedArr = [...arr].sort().reverse();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByPhoneAscending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const phoneNumber = await rowData.locator('td').nth(4).textContent();
      arr.push(phoneNumber?.trim());
    }

    const sortedArr = [...arr].sort();

    expect(arr).toEqual(sortedArr);
  }

  async checkSortingByPhoneDescending() {
    const arr = [];

    for (let i = 0; i < 3; i++) {
      const rowData = this.page.getByTestId(`customers-table-row-${i}`);
      const phoneNumber = await rowData.locator('td').nth(4).textContent();
      arr.push(phoneNumber?.trim());
    }

    const sortedArr = [...arr].sort().reverse();

    expect(arr).toEqual(sortedArr);
  }

  async fillSearch(search: string) {
    await this.page.getByPlaceholder('Type to search...').fill(search);
    await this.page.waitForLoadState('networkidle');
  }

  async checkExpectedResult(expectedName: string, expectedLastName: string) {
    const rowData = this.page.getByTestId('customers-table-row-0');
    const customersName = await rowData.locator('td').nth(1).textContent();
    const customersLastName = await rowData.locator('td').nth(2).textContent();

    expect(customersName).toBe(expectedName);
    expect(customersLastName).toBe(expectedLastName);

    await this.page.waitForTimeout(200);
  }

  async clickSaveAndExit() {
    await this.page.waitForTimeout(500);
    await this.page.getByTestId('submit-and-exit-button').click();
    await this.page.waitForTimeout(500);
  }

  async clickSave() {
    await this.page.waitForTimeout(200);
    await this.page.getByTestId('submit-form-button').click();
    await this.page.waitForTimeout(200);
  }
}
