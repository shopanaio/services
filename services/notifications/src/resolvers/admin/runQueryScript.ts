import { GraphQLError } from "graphql";
import { KernelError } from "@shopana/shared-kernel";
import type { BaseScript } from "../../kernel/BaseScript.js";
import type { NotificationKernelServices } from "../../kernel/types.js";
import type { ServiceContext } from "../../context/types.js";

export async function runQueryScript<TParams, TResult>(
  context: ServiceContext,
  ScriptClass: new (
    services: NotificationKernelServices
  ) => BaseScript<TParams, TResult>,
  params: TParams
): Promise<TResult> {
  try {
    return await context.kernel.runScript(ScriptClass, params);
  } catch (error) {
    if (error instanceof KernelError) {
      throw new GraphQLError(error.message, {
        extensions: {
          code: error.code,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    }
    throw new GraphQLError("Notification administration operation failed", {
      extensions: { code: "INTERNAL_ERROR" },
    });
  }
}
