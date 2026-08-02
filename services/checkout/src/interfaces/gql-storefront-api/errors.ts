import type { ValidationError } from 'class-validator';
import { CheckoutMutationError } from '@src/application/mutations/contracts.js';

/**
 * GraphQL error helpers for consistent error responses.
 * Returned errors include extensions.code and structured details where applicable.
 */
export async function badUserInput(message: string, details?: unknown) {
  const { GraphQLError } = await import('graphql');
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', details },
  } as any);
}

export async function fromValidationErrors(errors: ValidationError[]) {
  const flat = errors.map((e) => ({
    field: e.property,
    messages: Object.values(e.constraints ?? {}),
    children: e.children?.length ? e.children : undefined,
  }));
  return badUserInput('Invalid input', { validation: flat });
}

export async function fromDomainError(err: unknown) {
  const { GraphQLError } = await import('graphql');
  if (err instanceof CheckoutMutationError) {
    return new GraphQLError(err.message, {
      extensions: { code: err.code, retryable: err.retryable },
    });
  }
  return new GraphQLError('Checkout mutation failed.', {
    extensions: { code: 'INTERNAL_SERVER_ERROR', retryable: true },
  });
}
