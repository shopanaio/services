import type { ApiPasswordSignInInput, ApiPasswordSignUpInput, ApiUpdateUserProfileInput, ApiVerifyEmailInput } from '@codegen/client-gql';
import type { ClientApiFixture } from '@fixtures/client/api';

export class Auth {
  constructor(private api: ClientApiFixture) {}

  async getSession() {
    return this.api.query('client/Session', {
      variables: {},
    });
  }

  async passwordSignUp(input: ApiPasswordSignUpInput) {
    return this.api.mutation('client/PasswordSignUp', {
      variables: { input },
    });
  }

  async passwordSignIn(input: ApiPasswordSignInInput) {
    return this.api.mutation('client/PasswordSignIn', {
      variables: { input },
      throwOnError: false,
    });
  }

  async signOut() {
    return this.api.mutation('client/SignOut', {
      variables: {},
    });
  }

  async updateUserProfile(input: ApiUpdateUserProfileInput) {
    return this.api.mutation('client/UpdateUserProfile', {
      variables: { input },
    });
  }

  async verifyEmail(input: ApiVerifyEmailInput) {
    return this.api.mutation('client/VerifyEmail', {
      variables: { input },
    });
  }
}
