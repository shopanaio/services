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
import { createAdminAppPath } from "./app-route";
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

function descriptorSignature(descriptor: AdminAppUiDescriptor): string {
  return JSON.stringify(descriptor);
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
      const orgName = path.getParam("orgName") ?? "";
      const storeName = path.getParam("storeName") ?? "";
      const previousByAppCode = new Map(
        activeRef.current.map((app) => [app.descriptor.appCode, app]),
      );

      const active = descriptors
        .filter((descriptor) => supportsCurrentSdk(descriptor.sdkVersionRange))
        .map((descriptor): ActiveAdminApp => {
          const previous = previousByAppCode.get(descriptor.appCode);
          const canReuse =
            previous &&
            previous.sdk.context.orgName === orgName &&
            previous.sdk.context.storeName === storeName &&
            descriptorSignature(previous.descriptor) ===
              descriptorSignature(descriptor);

          if (canReuse) {
            previousByAppCode.delete(descriptor.appCode);
            return previous;
          }

          if (previous) {
            unregisterAdminAppModals(previous.scope.owner);
            previous.scope.dispose();
            previousByAppCode.delete(descriptor.appCode);
          }

          const owner = ownerFor(descriptor);
          const scope = new AppRuntimeScope(owner);
          const modalApi = createAdminAppModalApi(descriptor, owner);
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
                router.push(createAdminAppPath({
                  orgName,
                  storeName,
                  appCode: descriptor.appCode,
                  appPath,
                })),
              replaceAppPath: (appPath) =>
                router.replace(createAdminAppPath({
                  orgName,
                  storeName,
                  appCode: descriptor.appCode,
                  appPath,
                })),
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

      previousByAppCode.forEach(({ scope }) => {
        unregisterAdminAppModals(scope.owner);
        scope.dispose();
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
      const navigationItems: SidebarItem[] = active
        .map(({ descriptor }) => ({
          key: `admin-app-${descriptor.appCode}`,
          label: descriptor.displayName,
          path: `/:orgName/:storeName/apps/${encodeURIComponent(
            descriptor.appCode,
          )}`,
          activePaths: [
            `/:orgName/:storeName/apps/${encodeURIComponent(
              descriptor.appCode,
            )}{/*appPath}`,
          ],
        }))
        .sort((left, right) => left.label.localeCompare(right.label))
        .map((item, index) => ({
          ...item,
          order: index,
        }));
      setSidebarChildren("admin-apps", navigationItems);
    },
    [
      client,
      notification,
      path,
      router,
      setSidebarChildren,
    ],
  );

  useEffect(
    () => () => {
      disposeActiveApps();
      clearSidebarChildren("admin-apps");
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
