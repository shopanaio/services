import { AuthGuard } from "@/domains/auth";
import { AppLayout } from "./layout";

/**
 * Standard app domain layout with AuthGuard and AppLayout (sidebar).
 * Use this for authenticated domains that need the main app shell.
 */
export function AppDomainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
