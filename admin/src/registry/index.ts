// Shared types and registry
export {
  type ParamData,
  type ModulePageProps,
  type SidebarConfig,
  type SidebarItem,
  type DomainConfig,
  type ModuleItemConfig,
  type ModuleConfig,
  type RegisteredPageRecord,
  type ModuleMatchResult,
  ModuleRegistry,
  moduleRegistry,
  registerDomain,
  registerModule,
} from "./registry";

// Server-side factories
export {
  type CreatePageOptions,
  type CreateLayoutOptions,
  createPage,
  createLayout,
} from "./server";

// Client-side context and hooks
export { SidebarItemsProvider, useSidebarItems } from "./client";
