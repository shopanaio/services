import type { ComponentType, ReactNode } from "react";
import { match, type MatchFunction, type ParamData } from "path-to-regexp";

export type { ParamData };

/**
 * Props contract for module page components.
 */
export interface ModulePageProps {
  params: { slug?: string[] };
  searchParams?: Record<string, string | string[] | undefined>;
  pathParams: ParamData;
}

/**
 * Sidebar configuration.
 */
export interface SidebarConfig {
  label: string;
  icon?: ReactNode;
  order?: number;
}

/**
 * Sidebar item for rendering (with children).
 */
export interface SidebarItem {
  key: string;
  label: string;
  path?: string;
  icon?: ReactNode;
  order?: number;
  type?: "group";
  children?: SidebarItem[];
}

/**
 * Configuration for registering a domain (group of modules).
 */
export interface DomainConfig {
  key: string;
  label: string;
  icon?: ReactNode;
  order?: number;
}

/**
 * Configuration for a module item (page).
 */
export interface ModuleItemConfig {
  key: string;
  path: string;
  component: ComponentType<ModulePageProps>;
  sidebar?: SidebarConfig;
}

/**
 * Configuration for registering a module.
 */
export interface ModuleConfig {
  key: string;
  domain: string;
  sidebar: SidebarConfig;
  items: ModuleItemConfig[];
}

/**
 * Record held inside the registry for path matching.
 */
export interface RegisteredPageRecord {
  moduleKey: string;
  itemKey: string;
  domain: string;
  path: string;
  component: ComponentType<ModulePageProps>;
  matcher: MatchFunction<ParamData>;
}

/**
 * Result of a successful module match.
 */
export interface ModuleMatchResult {
  record: RegisteredPageRecord;
  params: ParamData;
}

/**
 * Module Registry for dynamic page module resolution.
 */
export class ModuleRegistry {
  private readonly domains: Map<string, DomainConfig> = new Map();
  private readonly modules: Map<string, ModuleConfig> = new Map();
  private readonly pages: RegisteredPageRecord[] = [];

  registerDomain(config: DomainConfig): void {
    this.domains.set(config.key, config);
  }

  register(config: ModuleConfig): void {
    this.modules.set(config.key, config);

    if (!config.items || !Array.isArray(config.items)) {
      console.warn(`Module "${config.key}" has no items`);
      return;
    }

    for (const item of config.items) {
      const matcher = match(item.path, { decode: decodeURIComponent });
      this.pages.push({
        moduleKey: config.key,
        itemKey: item.key,
        domain: config.domain,
        path: item.path,
        component: item.component,
        matcher,
      });
    }
  }

  matchPath(pathname: string): ModuleMatchResult | undefined {
    for (const record of this.pages) {
      const result = record.matcher(pathname);
      if (result) {
        return {
          record,
          params: result.params,
        };
      }
    }
    return undefined;
  }

  list(): string[] {
    return this.pages.map((r) => r.path);
  }

  getSidebarItems(): SidebarItem[] {
    const result: SidebarItem[] = [];

    // Group modules by domain
    const modulesByDomain = new Map<string, ModuleConfig[]>();
    for (const mod of this.modules.values()) {
      const existing = modulesByDomain.get(mod.domain) ?? [];
      existing.push(mod);
      modulesByDomain.set(mod.domain, existing);
    }

    // Build sidebar items from domains
    const sortedDomains = Array.from(this.domains.values())
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const domain of sortedDomains) {
      const modules = modulesByDomain.get(domain.key) ?? [];
      const children = modules
        .sort((a, b) => (a.sidebar.order ?? 0) - (b.sidebar.order ?? 0))
        .map((mod): SidebarItem => {
          const moduleChildren = mod.items
            .filter((item) => item.sidebar)
            .sort((a, b) => (a.sidebar!.order ?? 0) - (b.sidebar!.order ?? 0))
            .map((item): SidebarItem => ({
              key: item.key,
              label: item.sidebar!.label,
              icon: item.sidebar!.icon,
              path: item.path,
            }));

          return {
            key: mod.key,
            label: mod.sidebar.label,
            icon: mod.sidebar.icon,
            children: moduleChildren.length > 0 ? moduleChildren : undefined,
          };
        });

      result.push({
        key: domain.key,
        label: domain.label,
        icon: domain.icon,
        type: "group",
        children: children.length > 0 ? children : undefined,
      });
    }

    return result;
  }
}

/**
 * Global singleton registry instance.
 */
export const moduleRegistry = new ModuleRegistry();

/**
 * Helper to register a domain.
 */
export function registerDomain(config: DomainConfig): void {
  moduleRegistry.registerDomain(config);
}

/**
 * Helper to register modules.
 */
export function registerModule(config: ModuleConfig): void {
  moduleRegistry.register(config);
}
