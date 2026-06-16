import React, { type ComponentType } from "react";
import { notFound } from "next/navigation";
import { moduleRegistry, type ModulePageProps } from "./registry";
import type { IModalStackDefinition } from "@/layouts/modals/types";

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
 * Factory function to initialize modules and get layout data.
 * Returns sidebarItems and getModalStackItems for use with ClientLayoutResolver.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { createLayout, ClientLayoutResolver } from "@/registry";
 * import { getModalStackDefinitions } from "@/domains/modals";
 *
 * const { sidebarItems, getModalStackItems } = createLayout({
 *   modulesContext: require.context("../domains", true, /(register|domain)\.tsx?$/),
 *   getModalStackItems: getModalStackDefinitions,
 * });
 *
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <ClientLayoutResolver
 *           sidebarItems={sidebarItems}
 *           getModalStackItems={getModalStackItems}
 *         >
 *           {children}
 *         </ClientLayoutResolver>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function createLayout(options: CreateLayoutOptions) {
  const { modulesContext, getModalStackItems } = options;

  modulesContext.keys().forEach((key) => modulesContext(key));

  const sidebarItems = moduleRegistry.getSidebarItems();

  return { sidebarItems, getModalStackItems };
}
