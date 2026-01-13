import { headers } from "next/headers";
import { createLayout, resolveDomainLayout } from "@/registry";
import { getModalStackDefinitions } from "@/domains/modals";

const { ModuleLayout } = createLayout({
  modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
  getModalStackItems: getModalStackDefinitions,
});

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const { Layout: DomainLayout, pathParams } = resolveDomainLayout(pathname);

  return (
    <ModuleLayout pathParams={pathParams}>
      <DomainLayout>{children}</DomainLayout>
    </ModuleLayout>
  );
}
