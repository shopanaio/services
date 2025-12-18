import type { Page, Locator } from '@playwright/test';
import { test } from '@playwright/test';

export class SignInPage {
  private url = '/auth';

  private emailField: Locator;
  private passwordField: Locator;
  private submitButton: Locator;
  private signUpButton: Locator;
  //private rememberBtn: Locator;
  //private errorMsg: Locator;

  constructor(private page: Page) {
    this.emailField = this.page.getByTestId('email-field');
    this.passwordField = this.page.getByTestId('password-field');
    this.submitButton = this.page.getByTestId('submit-button');
    this.signUpButton = this.page.getByTestId('sign-up-button');

    //this.rememberBtn = this.page.getByTestId('remember-field');
    //this.errorMsg = this.page.getByTestId('error-alert');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async signIn(email: string, password: string) {
    await test.step('Sign In', async () => {
      await this.page.goto(this.url);

      await this.emailField.fill(email);
      await this.page.waitForTimeout(500)

      await this.passwordField.fill(password);
      await this.page.waitForTimeout(500)

      await this.submitButton.click();
    });
  }

  async fillEmail(email: string) {
    await this.emailField.fill(email);
    await this.page.waitForTimeout(500)
  }

  async fillPassword(password: string) {
    await this.passwordField.fill(password);
    await this.page.waitForTimeout(500)
  }

  async clickSubmit() {
    await this.submitButton.click();
    await this.page.waitForURL('/stores');
    await this.page.waitForTimeout(500)
  }

  async gotoSignUp() {
    await this.signUpButton.click();
  }

  async expectErrorMessage(/* message: string */) {
    //await expect(this.errorMsg).toHaveText(message);
  }

  async isSignInDisabled() {
    //await expect(this.submitButton).toBeDisabled();
  }
}
