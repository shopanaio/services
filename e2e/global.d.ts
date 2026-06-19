import type { AnySchema, ValidateOptions } from 'yup';

export {};

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toMatchSchema<TContext, TSchema extends AnySchema<TContext>>(
        schema: TSchema,
        options?: ValidateOptions<TContext>,
      ): R;
    }
  }
}
