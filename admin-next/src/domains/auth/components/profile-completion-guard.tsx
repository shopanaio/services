"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

/** Paths that are accessible without completing profile */
const ALLOWED_PATHS = ["/onboarding", "/sign-out"];

/**
 * Profile completion guard component.
 *
 * Ensures users complete their profile (firstName, lastName) before accessing the app.
 * Redirects users with incomplete profiles to the onboarding flow.
 *
 * Features:
 * - Checks isProfileComplete flag from user data
 * - Allows access to onboarding and sign-out routes
 * - Blocks access to all other protected routes until profile is complete
 */
export function ProfileCompletionGuard({
  children,
}: ProfileCompletionGuardProps) {
  const { styles } = useStyles();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useSession();

  const isAllowedPath = ALLOWED_PATHS.some(
    (path) => pathname === path || pathname?.startsWith(`${path}/`)
  );

  const needsOnboarding = user && !user.isProfileComplete;

  useEffect(() => {
    if (isLoading || !user) return;

    // Redirect to onboarding if profile is incomplete and not on allowed path
    if (needsOnboarding && !isAllowedPath) {
      router.replace("/onboarding/complete-profile");
    }
  }, [user, isLoading, needsOnboarding, isAllowedPath, pathname, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <Flex justify="center" align="center" className={styles.loading}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Don't render content if profile needs completion and not on allowed path
  if (needsOnboarding && !isAllowedPath) {
    return null;
  }

  return <>{children}</>;
}
