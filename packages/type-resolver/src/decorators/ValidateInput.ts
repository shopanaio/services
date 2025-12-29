import type { ZodType, ZodTypeDef, ZodIssue, TypeOf } from "zod";

/**
 * User error format for GraphQL responses
 */
export interface UserError {
  code: string;
  message: string;
  field: string[] | null;
}

/**
 * Convert Zod issues to UserError format
 */
function formatZodIssues(issues: ZodIssue[]): UserError[] {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    field: issue.path.length > 0 ? issue.path.map(String) : null,
  }));
}

/**
 * Method decorator that validates the `input` argument of a GraphQL resolver.
 *
 * Based on: https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/tree/main/example/zod
 *
 * @param schemaOrFn - Zod schema or function returning schema to validate input
 *
 * @example
 * ```typescript
 * import { ZodResolver } from "@shopana/type-resolver";
 * import { UserSignUpInputSchema } from "./generated/schemas.js";
 *
 * class AuthMutationResolver {
 *   @ZodResolver(UserSignUpInputSchema())
 *   async signUp(args: { input: UserSignUpInput }) {
 *     const { input } = args;
 *     // input is validated
 *   }
 * }
 * ```
 */
export function ZodResolver<T extends ZodType<unknown, ZodTypeDef, unknown>>(
  schemaOrFn: T | (() => T)
) {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = function (args: { input: TypeOf<T> }) {
      const schema = typeof schemaOrFn === "function" ? schemaOrFn() : schemaOrFn;
      const result = schema.safeParse(args.input);

      if (result.success) {
        return originalMethod.call(this, { ...args, input: result.data });
      }

      return { userErrors: formatZodIssues(result.error.issues) };
    };

    return descriptor;
  };
}
