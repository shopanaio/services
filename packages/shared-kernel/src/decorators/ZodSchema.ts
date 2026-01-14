import type { ZodSchema as ZodSchemaType, ZodError } from "zod";

/**
 * User error interface for validation results
 * Uses `| null` instead of `?` to match GraphQL's Maybe type
 */
export interface UserError {
  message: string;
  field: string[] | null;
  code: string | null;
}

/**
 * Validation error thrown when zod schema validation fails
 */
export class ValidationError extends Error {
  constructor(
    public readonly errors: UserError[],
    public readonly zodError?: ZodError
  ) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

/**
 * Convert ZodError to UserError array
 */
function zodErrorToUserErrors(error: ZodError): UserError[] {
  return error.errors.map((err) => ({
    code: "INVALID_INPUT",
    message: err.message,
    field: err.path.map(String),
  }));
}

/**
 * Method decorator that validates input parameters using a Zod schema.
 * Must be used on the `execute` method of a BaseScript subclass.
 *
 * @param schema - Zod schema to validate params
 *
 * @example
 * @ZodSchema(organizationCreateInputSchema)
 * protected async execute(params: OrganizationCreateParams): Promise<OrganizationCreateResult> { ... }
 */
export function ZodSchema<TSchema extends ZodSchemaType>(schema: TSchema) {
  return function <T>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value as unknown as (
      params: unknown
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: unknown,
      params: unknown
    ): Promise<unknown> {
      const result = schema.safeParse(params);

      if (!result.success) {
        throw new ValidationError(
          zodErrorToUserErrors(result.error),
          result.error
        );
      }

      return originalMethod.call(this, result.data);
    } as unknown as T;

    return descriptor;
  };
}
