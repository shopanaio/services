/**
 * Auth domain hooks.
 * Provides React hooks for all authentication operations.
 */

// Main auth hook (context consumer)
export { useAuth } from "./use-auth";

// Authentication operation hooks
export { useSignIn } from "./use-sign-in";
export type { UseSignInReturn } from "./use-sign-in";

export { useSignUp } from "./use-sign-up";
export type { UseSignUpReturn } from "./use-sign-up";

export { useSignOut } from "./use-sign-out";
export type { UseSignOutReturn } from "./use-sign-out";

export { useTokenRefresh } from "./use-token-refresh";
export type { UseTokenRefreshReturn } from "./use-token-refresh";

// Session/user hooks
export { useCurrentUser } from "./use-current-user";
export type { UseCurrentUserReturn } from "./use-current-user";

export { useSession } from "./use-session";
export type { UseSessionReturn } from "./use-session";
