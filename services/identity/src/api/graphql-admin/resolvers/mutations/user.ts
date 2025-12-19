import type { ServiceContext } from "../../../../context/index.js";
import { UserSignInScript } from "../../../../scripts/user/UserSignInScript.js";
import { UserSignUpScript } from "../../../../scripts/user/UserSignUpScript.js";

export const userMutations = {
  userSignIn: async (
    _parent: any,
    args: { input: { email: string; password: string } },
    ctx: ServiceContext
  ) => {
    const result = await ctx.kernel.runScript(UserSignInScript, {
      email: args.input.email,
      password: args.input.password,
    });
    return result;
  },

  userSignUp: async (
    _parent: any,
    args: { input: { email: string; password: string } },
    ctx: ServiceContext
  ) => {
    const result = await ctx.kernel.runScript(UserSignUpScript, {
      email: args.input.email,
      password: args.input.password,
    });
    return result;
  },
};
