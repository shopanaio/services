/**
 * Auth domain hooks.
 * Provides React hooks for all authentication operations.
 */

// Main auth hook (context consumer)
export { useAuth } from "./use-auth";

// Authentication operation hooks
export { useSignIn } from "./use-sign-in";

export { useSignUp } from "./use-sign-up";

export { useSignOut } from "./use-sign-out";

export { useTokenRefresh } from "./use-token-refresh";

// Session/user hooks
export { useCurrentUser } from "./use-current-user";

export { useSession } from "./use-session";
