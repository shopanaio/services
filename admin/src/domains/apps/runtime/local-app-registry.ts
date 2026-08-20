import type { ComponentType } from "react";
import type { AdminAppPageProps } from "../sdk";
import { registerLocalAdminAppModule } from "./federation/load-remote-module";

export interface LocalAdminAppModalRegistration {
  id: string;
  module: string;
  confirmOnDirtyClose?: boolean;
  closeConfirmMessage?: string;
  requiredScopes?: string[];
  load: () => Promise<{
    default: ComponentType<never>;
  }>;
}

export interface LocalAdminAppRegistration {
  appCode: string;
  remoteName: string;
  pageModule: string;
  defaultPath?: string;
  modals?: LocalAdminAppModalRegistration[];
}

const registrations = new Map<string, LocalAdminAppRegistration>();

export function registerLocalAdminApp(
  registration: LocalAdminAppRegistration,
  loadPage: () => Promise<{ default: ComponentType<AdminAppPageProps> }>,
): void {
  registrations.set(registration.appCode, registration);
  registerLocalAdminAppModule(registration.remoteName, registration.pageModule, loadPage);
  registration.modals?.forEach((modal) => {
    registerLocalAdminAppModule(registration.remoteName, modal.module, modal.load);
  });
}

export function getLocalAdminApp(appCode: string): LocalAdminAppRegistration | undefined {
  return registrations.get(appCode);
}
