import type { ApiGenericUserError } from "@/graphql/types";

/**
 * Error mapping configuration.
 * Maps GraphQL error codes to user-friendly messages and form fields.
 */
interface ErrorMapping {
  [code: string]: {
    field?: string;
    message: string;
  };
}

/**
 * Maps GraphQL error codes from IAM service to user-friendly messages.
 *
 * Actual error codes from the API:
 * - INVALID_CREDENTIALS: Sign in failed (wrong email/password)
 * - EMAIL_ALREADY_EXISTS: Sign up failed (email taken) - includes field: ["email"]
 * - SIGNUP_FAILED: Sign up internal error
 * - INVALID_REFRESH_TOKEN: Token refresh failed
 * - UNAUTHORIZED: Invalid or expired session
 * - INTERNAL_ERROR: Unexpected server error
 * - NETWORK_ERROR: Client-side network failure (added by hooks)
 */
const AUTH_ERROR_MAP: ErrorMapping = {
  // Sign In Errors
  INVALID_CREDENTIALS: {
    field: "password",
    message: "Invalid email or password",
  },

  // Sign Up Errors
  EMAIL_ALREADY_EXISTS: {
    field: "email",
    message: "A user with this email already exists",
  },
  SIGNUP_FAILED: {
    message: "Failed to create account. Please try again.",
  },

  // Token/Session Errors
  INVALID_REFRESH_TOKEN: {
    message: "Your session has expired. Please sign in again.",
  },
  UNAUTHORIZED: {
    message: "Your session is invalid. Please sign in again.",
  },

  // General Errors
  INTERNAL_ERROR: {
    message: "An unexpected error occurred. Please try again.",
  },
  NETWORK_ERROR: {
    message: "Unable to connect. Please check your connection.",
  },
};

/**
 * Result from mapping GraphQL errors to form errors.
 */
export interface MapErrorsResult {
  /** Whether any field-level errors were set */
  hasFieldErrors: boolean;
  /** Errors that couldn't be mapped to specific fields */
  generalErrors: string[];
}

/**
 * Maps GraphQL userErrors to react-hook-form field errors.
 *
 * The IAM API returns errors in format:
 * { code: string, message: string, field?: string[] }
 *
 * Priority:
 * 1. Use field from error response if present (e.g., ["email"])
 * 2. Fall back to field mapping from AUTH_ERROR_MAP
 * 3. Treat as general error if no field association
 *
 * @param errors - Array of GraphQL user errors
 * @param setError - react-hook-form setError function
 * @returns Object with hasFieldErrors flag and generalErrors array
 */
export function mapGraphQLErrorsToForm<T extends Record<string, unknown>>(
  errors: ApiGenericUserError[],
  setError: (name: keyof T, error: { message: string }) => void
): MapErrorsResult {
  const generalErrors: string[] = [];
  let hasFieldErrors = false;

  for (const error of errors) {
    const mapping = error.code ? AUTH_ERROR_MAP[error.code] : null;
    const userMessage = mapping?.message || error.message;

    // Priority 1: Use field from API response (e.g., EMAIL_ALREADY_EXISTS returns field: ["email"])
    if (error.field && error.field.length > 0) {
      const fieldName = error.field[0]; // First element is the field name
      setError(fieldName as keyof T, { message: userMessage });
      hasFieldErrors = true;
    }
    // Priority 2: Use field from error mapping
    else if (mapping?.field) {
      setError(mapping.field as keyof T, { message: userMessage });
      hasFieldErrors = true;
    }
    // Priority 3: General error (no field association)
    else {
      generalErrors.push(userMessage);
    }
  }

  return { hasFieldErrors, generalErrors };
}

/**
 * Gets a user-friendly message for an error code.
 * Falls back to default message if code is not mapped.
 *
 * @param code - Error code from API
 * @param defaultMessage - Fallback message
 * @returns User-friendly error message
 */
export function getErrorMessage(
  code: string | null | undefined,
  defaultMessage: string = "An unexpected error occurred"
): string {
  if (!code) return defaultMessage;
  return AUTH_ERROR_MAP[code]?.message ?? defaultMessage;
}

/**
 * Creates a network error object for use when API calls fail.
 */
export function createNetworkError(): ApiGenericUserError {
  return {
    code: "NETWORK_ERROR",
    message: AUTH_ERROR_MAP.NETWORK_ERROR.message,
    field: null,
  };
}
