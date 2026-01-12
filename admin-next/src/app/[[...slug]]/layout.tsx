import { createLayout } from "@/registry";
import { getModalStackDefinitions } from "@/domains/modals";

const { Layout: ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getModalStackItems: getModalStackDefinitions,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleLayout>{children}</ModuleLayout>;
}
