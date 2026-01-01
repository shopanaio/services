import { createLayout } from "@/registry";
import { AppLayout } from "@/layouts/app/components/Layout/Layout";
import { getDrawerDefinitions } from "@/domains/drawers";

const { Layout: ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getDrawers: getDrawerDefinitions,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout>
      <AppLayout>{children}</AppLayout>
    </ModuleLayout>
  );
}
