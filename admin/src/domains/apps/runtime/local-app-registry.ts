import type { ComponentType } from "react";
import type { AdminAppPageProps } from "../sdk";
import { registerLocalAdminAppModule } from "./federation/load-remote-module";

export interface LocalAdminAppRegistration {
  appCode: string;
  remoteName: string;
  pageModule: string;
  defaultPath?: string;
}

const registrations = new Map<string, LocalAdminAppRegistration>();

export function registerLocalAdminApp(
  registration: LocalAdminAppRegistration,
  loadPage: () => Promise<{ default: ComponentType<AdminAppPageProps> }>,
): void {
  registrations.set(registration.appCode, registration);
  registerLocalAdminAppModule(
    registration.remoteName,
    registration.pageModule,
    loadPage,
  );
}

export function getLocalAdminApp(
  appCode: string,
): LocalAdminAppRegistration | undefined {
  return registrations.get(appCode);
}
