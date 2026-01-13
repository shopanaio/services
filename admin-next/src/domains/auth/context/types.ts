import type {
  ApiUser,
  ApiGenericUserError,
  ApiAuthTokenPayload,
} from "@/graphql/types";

/**
 * Auth error object returned from operations.
 */
export interface AuthError {
  code: string;
  message: string;
  field?: string[];
}

/**
 * Sign-in operation input.
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Sign-in operation result.
 */
export interface SignInResult {
  success: boolean;
  user: ApiUser | null;
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

/**
 * Sign-up operation input.
 */
export interface SignUpInput {
  email: string;
  password: string;
}

/**
 * Sign-up operation result.
 */
export interface SignUpResult {
  success: boolean;
  user: ApiUser | null;
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

/**
 * Sign-out operation options.
 */
export interface SignOutOptions {
  /** Sign out from all sessions/devices */
  allSessions?: boolean;
}

/**
 * Sign-out operation result.
 */
export interface SignOutResult {
  success: boolean;
  userErrors: ApiGenericUserError[];
}

/**
 * Token refresh operation result.
 */
export interface TokenRefreshResult {
  success: boolean;
  token: ApiAuthTokenPayload | null;
  userErrors: ApiGenericUserError[];
}

/**
 * Main auth context value interface.
 * Provides auth state and operations to consumers.
 */
export interface AuthContextValue {
  // State
  /** Current authenticated user or null if not authenticated */
  user: ApiUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded/verified */
  isLoading: boolean;
  /** Current auth error if any */
  error: AuthError | null;

  // Actions
  /** Sign in with email/password */
  signIn: (input: SignInInput) => Promise<SignInResult>;
  /** Sign up with email/password */
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  /** Sign out current user */
  signOut: (options?: SignOutOptions) => Promise<SignOutResult>;
  /** Refresh current session */
  refreshSession: () => Promise<void>;
  /** Clear current error */
  clearError: () => void;
}
