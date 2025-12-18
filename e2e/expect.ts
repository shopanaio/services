import { expect as baseExpect } from '@playwright/test';
import { AnySchema, ValidateOptions } from 'yup';

baseExpect.extend({
  toMatchSchema<TContext>(
    received: unknown,
    schema: AnySchema<TContext>,
    options?: ValidateOptions<TContext>,
  ) {
    try {
      schema.validateSync(received, options);
      return {
        pass: true,
        message: () => 'toMatchSchema() assertion passed.',
      };
    } catch (error: unknown) {
      return {
        pass: false,
        message: () =>
          'toMatchSchema() assertion failed.\n' +
          (error instanceof Error ? error.message : String(error)) +
          '\n' +
          'Received: ' +
          JSON.stringify(received, null, 4),
      };
    }
  },
});
