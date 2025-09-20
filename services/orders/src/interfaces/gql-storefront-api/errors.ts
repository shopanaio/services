import type { ValidationError } from 'class-validator';

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
  const message = typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err);
  return badUserInput('Domain validation failed', { reason: message });
}
