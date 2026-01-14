"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Spin, Flex } from "antd";
import { createStyles } from "antd-style";
import { useSession } from "../hooks";

const useStyles = createStyles(({ token }) => ({
  loading: {
    height: "100vh",
    width: "100vw",
    background: token.colorBgLayout,
  },
}));

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Public paths that don't require authentication */
const PUBLIC_PATHS = ["/sign-in", "/sign-up"];

/**
 * Auth guard component for protecting routes.
 *
 * Features:
 * - Redirects unauthenticated users to sign-in with returnUrl
 * - Redirects authenticated users away from auth pages
 * - Shows loading spinner only during initial auth verification (not on refetch)
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { styles } = useStyles();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useSession();

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`)
  );

  // Only show loading on initial load (no cached user data yet)
  const isInitialLoading = isLoading && user === null;

  useEffect(() => {
    // Wait for initial load to complete before redirecting
    if (isInitialLoading) return;

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && isPublicPath) {
      const returnUrl = searchParams.get("returnUrl");
      router.replace(returnUrl || "/workspace");
      return;
    }

    // Redirect unauthenticated users to sign in with returnUrl
    if (!isAuthenticated && !isPublicPath) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`/sign-in?returnUrl=${returnUrl}`);
      return;
    }
  }, [
    isAuthenticated,
    isInitialLoading,
    isPublicPath,
    pathname,
    router,
    searchParams,
  ]);

  // Show loading state only during initial auth verification
  if (isInitialLoading) {
    return (
      <Flex justify="center" align="center" className={styles.loading}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  // Don't render auth pages if authenticated (redirect will happen)
  if (isAuthenticated && isPublicPath) {
    return null;
  }

  return <>{children}</>;
}
