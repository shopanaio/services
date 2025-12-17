import type { ServiceContext } from "../../../../context/index.js";

interface UserUpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  locale?: string | null;
}

interface UserUpdateEmailInput {
  newEmail: string;
}

interface UserUpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface UserSignInInput {
  email: string;
  password: string;
}

interface UserSignOutInput {
  allSessions?: boolean | null;
}

interface UserTokenRefreshInput {
  refreshToken: string;
}

export const userMutationResolvers = {
  Mutation: {
    userMutation: () => ({}),
  },

  UserMutation: {
    userUpdateProfile: async (
      _parent: unknown,
      { input: _input }: { input: UserUpdateProfileInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        user: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdateProfile is not implemented yet",
          },
        ],
      };
    },

    userUpdateEmail: async (
      _parent: unknown,
      { input: _input }: { input: UserUpdateEmailInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        user: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdateEmail is not implemented yet",
          },
        ],
      };
    },

    userUpdatePassword: async (
      _parent: unknown,
      { input: _input }: { input: UserUpdatePasswordInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "userUpdatePassword is not implemented yet",
          },
        ],
      };
    },

    signIn: async (
      _parent: unknown,
      { input: _input }: { input: UserSignInInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        user: null,
        token: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "signIn is not implemented yet",
          },
        ],
      };
    },

    signOut: async (
      _parent: unknown,
      { input: _input }: { input: UserSignOutInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        success: false,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "signOut is not implemented yet",
          },
        ],
      };
    },

    tokenRefresh: async (
      _parent: unknown,
      { input: _input }: { input: UserTokenRefreshInput },
      _ctx: ServiceContext
    ) => {
      // TODO: implement
      return {
        token: null,
        userErrors: [
          {
            code: "NOT_IMPLEMENTED",
            message: "tokenRefresh is not implemented yet",
          },
        ],
      };
    },
  },
};
