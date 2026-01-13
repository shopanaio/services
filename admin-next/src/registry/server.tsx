import React, { Fragment, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { moduleRegistry, type ModulePageProps, type DomainLayoutComponent } from "./registry";
import { ModuleProvider } from "./client";
import { PathParamsProvider } from "./path-params-context";
import type { IModalStackDefinition } from "@/layouts/modals/types";
import type { ParamData } from "path-to-regexp";

// ============================================================================
// Page Factory
// ============================================================================

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function renderComponent(
  Component: ComponentType<ModulePageProps>,
  props: ModulePageProps
): React.ReactElement {
  // PathParamsProvider is handled by layout.tsx, not here
  return <Component {...props} />;
}

export interface CreatePageOptions {
  modulesContext?: ReturnType<typeof require.context>;
}

/**
 * Factory function to create page exports.
 * The page only renders the component - layout wrapping is handled by layout.tsx
 */
export function createPage(options: CreatePageOptions = {}) {
  const { modulesContext } = options;

  if (modulesContext) {
    modulesContext.keys().forEach((key) => modulesContext(key));
  }

  async function Page(props: PageProps) {
    const params = await props.params;
    const segments = params.slug ?? [];
    const pathname = "/" + segments.join("/");

    const matchResult = moduleRegistry.matchPath(pathname);

    if (!matchResult) {
      notFound();
    }

    const rawSearchParams = await props.searchParams;
    const searchParams = rawSearchParams ? { ...rawSearchParams } : {};

    const Component = matchResult.record.component;
    const pathParams = matchResult.params ? { ...matchResult.params } : {};

    return renderComponent(Component, {
      params: { slug: segments },
      searchParams,
      pathParams,
    });
  }

  return { Page };
}

// ============================================================================
// Layout Factory
// ============================================================================

export interface CreateLayoutOptions {
  modulesContext: ReturnType<typeof require.context>;
  /** Function that returns modal stack item definitions for client-side registration */
  getModalStackItems?: () => IModalStackDefinition[];
}

/**
 * Resolves the domain layout component based on the pathname.
 */
export function resolveDomainLayout(pathname: string): {
  Layout: DomainLayoutComponent | typeof Fragment;
  pathParams: ParamData;
} {
  const matchResult = moduleRegistry.matchPath(pathname);

  if (!matchResult) {
    return { Layout: Fragment, pathParams: {} };
  }

  const Layout = matchResult.domainConfig?.layout ?? Fragment;
  const pathParams = matchResult.params ? { ...matchResult.params } : {};

  return { Layout, pathParams };
}

/**
 * Factory function to create layout exports with sidebar items from modules.
 * The layout now handles domain layout wrapping using pathname from middleware headers.
 *
 * @example
 * ```tsx
 * // app/[[...slug]]/layout.tsx
 * import { headers } from "next/headers";
 * import { createLayout, resolveDomainLayout } from "@/registry";
 * import { getModalStackDefinitions } from "@/domains/modals";
 *
 * const { ModuleLayout } = createLayout({
 *   modulesContext: require.context("../../domains", true, /(register|domain)\.tsx?$/),
 *   getModalStackItems: getModalStackDefinitions,
 * });
 *
 * export default async function Layout({ children }: { children: React.ReactNode }) {
 *   const headersList = await headers();
 *   const pathname = headersList.get("x-pathname") || "/";
 *   const { Layout: DomainLayout, pathParams } = resolveDomainLayout(pathname);
 *
 *   return (
 *     <ModuleLayout pathParams={pathParams}>
 *       <DomainLayout>{children}</DomainLayout>
 *     </ModuleLayout>
 *   );
 * }
 * ```
 */
export function createLayout(options: CreateLayoutOptions) {
  const { modulesContext, getModalStackItems } = options;

  modulesContext.keys().forEach((key) => modulesContext(key));

  const sidebarItems = moduleRegistry.getSidebarItems();

  function ModuleLayout({
    children,
    pathParams,
  }: {
    children: React.ReactNode;
    pathParams: ParamData;
  }) {
    return (
      <ModuleProvider sidebarItems={sidebarItems} getModalStackItems={getModalStackItems}>
        <PathParamsProvider pathParams={pathParams}>{children}</PathParamsProvider>
      </ModuleProvider>
    );
  }

  return { ModuleLayout, sidebarItems };
}
