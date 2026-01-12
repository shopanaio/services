import { createLayout } from "@/registry";
import { AppLayout } from "@/layouts/app/components/layout/layout";
import { getModalStackDefinitions } from "@/domains/modals";
import { AuthGuard } from "@/domains/auth";

const { Layout: ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getModalStackItems: getModalStackDefinitions,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout>
      <AuthGuard>
        <AppLayout>{children}</AppLayout>
      </AuthGuard>
    </ModuleLayout>
  );
}
