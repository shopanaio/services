"use client";

import { App } from "antd";
import { useApolloClient } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathParams } from "@/registry/path-params-context";
import type { SidebarItem } from "@/registry/registry";
import { useDynamicSidebarStore } from "@/layouts/app/components/sidebar/dynamic-sidebar-store";
import { AdminDataGrid, AdminAppPage, AdminAppModalLayout } from "../sdk/ui";
import { createAdminAppSdk } from "../sdk/create-app-sdk";
import {
  createAdminAppModalApi,
  registerAdminAppModals,
  unregisterAdminAppModals,
} from "../sdk/modal-api";
import type { AdminAppSdk, AdminAppUiApi } from "../sdk";
import { AppRuntimeScope } from "./app-runtime-scope";
import type { AdminAppUiDescriptor } from "./descriptor-schema";
import { InstalledAppsRuntimeSync } from "./installed-apps-runtime-sync";
import { adminAppRegistry, type ActiveAdminApp } from "./registry/app-registry";
import { adminAppExtensionRegistry } from "./registry/extension-registry";
import { adminAppNavigationRegistry } from "./registry/navigation-registry";

const ui: AdminAppUiApi = {
  AppPage: AdminAppPage,
  ModalLayout: AdminAppModalLayout,
  DataGrid: AdminDataGrid,
};

const NO_FALLBACK_DESCRIPTORS: readonly AdminAppUiDescriptor[] = [];

function supportsCurrentSdk(range: string): boolean {
  return range === "1.0.0" || range.startsWith("^1.");
}

function ownerFor(descriptor: AdminAppUiDescriptor): string {
  return `app:${descriptor.appCode}@${descriptor.version}:${descriptor.installationId}`;
}

export function AdminAppsHostProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const client = useApolloClient();
  const { notification } = App.useApp();
  const path = usePathParams();
  const setSidebarChildren = useDynamicSidebarStore(
    (state) => state.setChildren,
  );
  const clearSidebarChildren = useDynamicSidebarStore(
    (state) => state.clearChildren,
  );
  const activeRef = useRef<ActiveAdminApp[]>([]);
  const disposeActiveApps = useCallback(() => {
    activeRef.current.forEach(({ scope }) => {
      unregisterAdminAppModals(scope.owner);
      scope.dispose();
    });
    activeRef.current = [];
    adminAppRegistry.replace([]);
    adminAppExtensionRegistry.replace([]);
    adminAppNavigationRegistry.replace([]);
  }, []);

  const activateDescriptors = useCallback(
    (descriptors: AdminAppUiDescriptor[]) => {
      disposeActiveApps();
      const orgName = path.getParam("orgName") ?? "";
      const storeName = path.getParam("storeName") ?? "";

      const active = descriptors
        .filter((descriptor) => supportsCurrentSdk(descriptor.sdkVersionRange))
        .map((descriptor): ActiveAdminApp => {
          const owner = ownerFor(descriptor);
          const scope = new AppRuntimeScope(owner);
          const modalApi = createAdminAppModalApi(descriptor, owner);
          const appPrefix = `/${encodeURIComponent(orgName)}/${encodeURIComponent(
            storeName,
          )}/apps/${encodeURIComponent(descriptor.appCode)}`;
          const storePrefix = `/${encodeURIComponent(orgName)}/${encodeURIComponent(
            storeName,
          )}`;

          const sdk: AdminAppSdk = createAdminAppSdk({
            identity: {
              code: descriptor.appCode,
              version: descriptor.version,
              installationId: descriptor.installationId,
            },
            context: {
              organizationId: orgName,
              storeId: storeName,
              orgName,
              storeName,
              grantedScopes: descriptor.grantedScopes,
            },
            scope,
            modals: modalApi,
            navigation: {
              openAppPath: (appPath) =>
                router.push(
                  `${appPrefix}/${appPath.replace(/^\/+/, "")}`.replace(/\/$/, ""),
                ),
              replaceAppPath: (appPath) =>
                router.replace(
                  `${appPrefix}/${appPath.replace(/^\/+/, "")}`.replace(/\/$/, ""),
                ),
              openCorePath: (corePath) => {
                if (
                  !corePath.startsWith("/") ||
                  corePath.startsWith("//") ||
                  /^[a-z]+:/i.test(corePath)
                ) {
                  throw new Error(`Core Admin path "${corePath}" is not allowed`);
                }
                router.push(`${storePrefix}${corePath}`);
              },
            },
            graphql: {
              query: async (document, variables) => {
                const result = await client.query({
                  query: document,
                  variables: variables as Record<string, unknown>,
                  fetchPolicy: "network-only",
                });
                return result.data;
              },
              mutate: async (document, variables) => {
                const result = await client.mutate({
                  mutation: document,
                  variables: variables as Record<string, unknown>,
                });
                if (!result.data) {
                  throw new Error("Admin App GraphQL mutation returned no data");
                }
                return result.data;
              },
            },
            notifications: {
              success: (message, description) =>
                notification.success({ message, description }),
              error: (message, description) =>
                notification.error({ message, description }),
              info: (message, description) =>
                notification.info({ message, description }),
              warning: (message, description) =>
                notification.warning({ message, description }),
            },
            ui,
          });

          registerAdminAppModals(descriptor, owner, () => sdk);
          return { descriptor, scope, sdk };
        });

      activeRef.current = active;
      adminAppRegistry.replace(active);
      adminAppExtensionRegistry.replace(
        active.flatMap(({ descriptor, scope }) =>
          descriptor.extensions.map((extension) => ({
            owner: scope.owner,
            appCode: descriptor.appCode,
            descriptor: extension,
          })),
        ),
      );
      adminAppNavigationRegistry.replace(
        active.flatMap(({ descriptor, scope }) =>
          descriptor.navigation.map((item) => ({
            owner: scope.owner,
            appCode: descriptor.appCode,
            displayName: descriptor.displayName,
            item,
          })),
        ),
      );
      const navigationItems: SidebarItem[] = active.flatMap(
        ({ descriptor }) =>
          descriptor.navigation.map((item) => {
            const suffix = item.path.replace(/^\/+/, "");
            const pathPattern = `/:orgName/:storeName/apps/${encodeURIComponent(
              descriptor.appCode,
            )}${suffix ? `/${suffix}` : ""}`;
            return {
              key: `admin-app-${descriptor.appCode}-${item.id}`,
              label: item.label,
              order: 1000 + item.order,
              path: pathPattern,
              activePaths: [
                `/:orgName/:storeName/apps/${encodeURIComponent(
                  descriptor.appCode,
                )}{/*appPath}`,
              ],
            };
          }),
      );
      setSidebarChildren("system-settings", navigationItems);
    },
    [
      client,
      disposeActiveApps,
      notification,
      path,
      router,
      setSidebarChildren,
    ],
  );

  useEffect(
    () => () => {
      disposeActiveApps();
      clearSidebarChildren("system-settings");
    },
    [clearSidebarChildren, disposeActiveApps],
  );

  return (
    <>
      <InstalledAppsRuntimeSync
        fallbackDescriptors={NO_FALLBACK_DESCRIPTORS}
        onDescriptors={activateDescriptors}
      />
      {children}
    </>
  );
}
