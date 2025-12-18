import { test } from '@fixtures/base.extend';
import { generateUser } from '@utils/user';

const VALID_EMAIL = 'testuser@example.com';
const INVALID_EMAIL = 'invalid-email';
const VALID_PASSWORD = 'Password123!';
const SHORT_PASSWORD = '123';
const NO_SPECIAL_CHAR_PASSWORD = 'Password123';
const EXISTING_EMAIL = 'existing@example.com';

test.describe('SignUp UI', () => {
  test('Test 1: Successful sign up', async ({ signInPage, signUpPage, storesPage }) => {
    const user = generateUser();

    await signInPage.goto();
    await signInPage.gotoSignUp();
    await signUpPage.signUp(user);
    await storesPage.waitFor();
  });

  test('Test 2: Error on invalid email format', async ({ signUpPage, signInPage }) => {
    await signInPage.goto();
    await signInPage.gotoSignUp();
    await signUpPage.signUp({
      email: INVALID_EMAIL,
      password: VALID_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
    });
    await signUpPage.assertErrorMessage('Please enter a valid email address');
  });

  test('Test 3: Error on too short password', async ({ signUpPage, signInPage }) => {
    await signInPage.goto();
    await signInPage.gotoSignUp();
    await signUpPage.signUp({
      email: VALID_EMAIL,
      password: SHORT_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
    });
    // await signUpPage.assertErrorMessage(
    //   'Password must be at least 6 characters long',
    // ); TODO
  });

  test('Test 4: Error on password without special characters', async ({ signUpPage, signInPage }) => {
    await signInPage.goto();
    await signInPage.gotoSignUp();
    await signUpPage.signUp({
      email: VALID_EMAIL,
      password: NO_SPECIAL_CHAR_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
    });
    // await signUpPage.assertErrorMessage( TODO
    //   'Password must contain at least one digit and one special character',
    // );
  });

  test('Test 5: Error on already registered email', async ({ signUpPage, signInPage }) => {
    await signInPage.goto();
    await signInPage.gotoSignUp();
    await signUpPage.signUp({
      email: EXISTING_EMAIL,
      password: VALID_PASSWORD,
      firstName: 'Test',
      lastName: 'User',
    });
    // await signUpPage.assertErrorMessage('Email is already in use'); TODO
  });
});
