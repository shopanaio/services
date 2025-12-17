import type { ServiceContext } from "../../../../context/index.js";

interface UserUpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
}

interface UserUpdateEmailInput {
  newEmail: string;
  currentPassword: string;
}

interface UserUpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const userMutationResolvers = {
  Mutation: {
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
  },
};
