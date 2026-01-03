import { createLayout } from "@/registry";
import { AppLayout } from "@/layouts/app/components/Layout/Layout";
import { getDrawerDefinitions } from "@/domains/drawers";
import { getModalStackDefinitions } from "@/domains/modals";

const { Layout: ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getDrawers: getDrawerDefinitions,
  getModalStackItems: getModalStackDefinitions,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleLayout>
      <AppLayout>{children}</AppLayout>
    </ModuleLayout>
  );
}
