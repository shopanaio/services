import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { ServiceContext } from "../../../../context/index.js";
import { CustomerResolver } from "../../../../resolvers/admin/CustomerResolver.js";
import {
  EmailVerifyScript,
  PasswordChangeScript,
  PasswordResetRequestScript,
  PasswordResetScript,
  ProfileUpdateScript,
  SignInScript,
  SignOutScript,
  SignUpScript,
  TokenRefreshScript,
} from "../../../../scripts/auth/index.js";
import { noKernelError, requireContext } from "../utils.js";

// Input types
interface SignUpInput {
  email: string;
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
}

interface SignOutInput {
  allSessions?: boolean | null;
}

interface TokenRefreshInput {
  refreshToken: string;
}

interface PasswordResetRequestInput {
  email: string;
}

interface PasswordResetInput {
  email: string;
  code: string;
  newPassword: string;
}

interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

interface ProfileUpdateInput {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  locale?: string | null;
  avatar?: string | null;
}

interface EmailVerifyRequestInput {
  email?: string | null;
}

interface EmailVerifyInput {
  email: string;
  code: string;
}

export const authMutationResolvers = {
  Mutation: {
    // Customer sign up
    signUp: async (
      _parent: unknown,
      { input }: { input: SignUpInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ customer: null, token: null });
      }

      const result = await ctx.kernel.runScript(SignUpScript, {
        email: input.email,
        password: input.password,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        token: result.token ?? null,
        userErrors: result.userErrors,
      };
    },

    // Customer sign in
    signIn: async (
      _parent: unknown,
      { input }: { input: SignInInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ customer: null, token: null });
      }

      const result = await ctx.kernel.runScript(SignInScript, {
        email: input.email,
        password: input.password,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        token: result.token ?? null,
        userErrors: result.userErrors,
      };
    },

    // Customer sign out
    signOut: async (
      _parent: unknown,
      { input }: { input: SignOutInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ success: false });
      }

      const result = await ctx.kernel.runScript(SignOutScript, {
        allSessions: input.allSessions ?? undefined,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    // Token refresh
    tokenRefresh: async (
      _parent: unknown,
      { input }: { input: TokenRefreshInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ token: null });
      }

      const result = await ctx.kernel.runScript(TokenRefreshScript, {
        refreshToken: input.refreshToken,
      });

      return {
        token: result.token ?? null,
        userErrors: result.userErrors,
      };
    },

    // Password reset request (sends email)
    passwordResetRequest: async (
      _parent: unknown,
      { input }: { input: PasswordResetRequestInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        // For security, always return success
        return { success: true, userErrors: [] };
      }

      const result = await ctx.kernel.runScript(PasswordResetRequestScript, {
        email: input.email,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    // Password reset (using code)
    passwordReset: async (
      _parent: unknown,
      { input }: { input: PasswordResetInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ success: false });
      }

      const result = await ctx.kernel.runScript(PasswordResetScript, {
        email: input.email,
        code: input.code,
        newPassword: input.newPassword,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    // Password change (authenticated)
    passwordChange: async (
      _parent: unknown,
      { input }: { input: PasswordChangeInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ success: false });
      }

      // Get current customer ID from context
      const customerId = ctx.user?.id;
      if (!customerId) {
        return {
          success: false,
          userErrors: [
            { message: "Not authenticated", code: "UNAUTHENTICATED" },
          ],
        };
      }

      const result = await ctx.kernel.runScript(PasswordChangeScript, {
        customerId,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });

      return {
        success: result.success,
        userErrors: result.userErrors,
      };
    },

    // Profile update (authenticated)
    profileUpdate: async (
      _parent: unknown,
      { input }: { input: ProfileUpdateInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ customer: null });
      }

      // Get current customer ID from context
      const customerId = ctx.user?.id;
      if (!customerId) {
        return {
          customer: null,
          userErrors: [
            { message: "Not authenticated", code: "UNAUTHENTICATED" },
          ],
        };
      }

      const result = await ctx.kernel.runScript(ProfileUpdateScript, {
        customerId,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        phone: input.phone ?? undefined,
        language: input.locale ?? undefined,
        avatar: input.avatar ?? undefined,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },

    // Email verification request (sends email)
    emailVerifyRequest: async (
      _parent: unknown,
      { input }: { input: EmailVerifyRequestInput },
      ctx: ServiceContext
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ success: false });
      }

      // Get email from input or from current customer
      const customerId = ctx.user?.id;
      const email = input.email;

      if (!email && !customerId) {
        return {
          success: false,
          userErrors: [{ message: "Email is required", code: "EMAIL_REQUIRED" }],
        };
      }

      // For now, just return success - would need to implement email sending
      return {
        success: true,
        userErrors: [],
      };
    },

    // Email verification (using code)
    emailVerify: async (
      _parent: unknown,
      { input }: { input: EmailVerifyInput },
      ctx: ServiceContext,
      info: unknown
    ) => {
      if (!ctx.kernel) {
        return noKernelError({ success: false, customer: null });
      }

      const result = await ctx.kernel.runScript(EmailVerifyScript, {
        email: input.email,
        code: input.code,
      });

      const customerFieldInfo = parseGraphqlInfo(info, "customer");

      return {
        success: result.success,
        customer: result.customerId
          ? await CustomerResolver.load(
              result.customerId,
              customerFieldInfo,
              requireContext(ctx)
            )
          : null,
        userErrors: result.userErrors,
      };
    },
  },
};
