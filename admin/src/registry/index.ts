// Shared types and registry
export {
  ModuleRegistry,
  moduleRegistry,
  registerDomain,
  registerModule,
} from "./registry";
export type { ModulePageProps, SidebarItem } from "./registry";

// Server-side factories
export {
  createPage,
  createLayout,
} from "./server";

// Client-side context and hooks
export { useSidebarItems, ModuleProvider, ClientLayoutResolver } from "./client";

// Path params context and hooks
export {
  PathParamsProvider,
  usePathParams,
  usePathParamsOptional,
} from "./path-params-context";
