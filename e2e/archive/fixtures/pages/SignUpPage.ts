import type { Page, Locator } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { PlaywrightUser } from '@utils/user';

export class SignUpPage {
  private url = '/auth';

  private emailField: Locator;
  private passwordField: Locator;
  private firstNameField: Locator;
  private lastNameField: Locator;
  private signUpButton: Locator;
  private linkRegBtn: Locator;
  // private errorMsg: Locator;
  private signInButton: Locator;

  constructor(private page: Page) {
    this.emailField = this.page.getByTestId('email-field');
    this.passwordField = this.page.getByTestId('password-field');
    this.firstNameField = this.page.getByTestId('first-name-field');
    this.lastNameField = this.page.getByTestId('last-name-field');
    this.signUpButton = this.page.getByTestId('submit-button');
    this.linkRegBtn = this.page.getByTestId('sign-up-button');
    this.signInButton = this.page.getByTestId('sign-in-button');
  }

  async goto() {
    await this.page.goto(this.url);
    await this.linkRegBtn.click();
  }

  async gotoSignIn() {
    await this.signInButton.click();
  }

  async signUp(user: Pick<PlaywrightUser, 'email' | 'password' | 'firstName' | 'lastName'>) {
    await test.step('Register', async () => {
      await this.emailField.fill(user.email);
      await this.passwordField.fill(user.password);
      await this.signUpButton.click();
      await this.firstNameField.fill(user.firstName);
      await this.lastNameField.fill(user.lastName);
      await this.signUpButton.click();
    });
  }

  async assertErrorMessage(message: string) {
    await expect(await this.page.getByText(message)).toBeVisible();
  }
}
