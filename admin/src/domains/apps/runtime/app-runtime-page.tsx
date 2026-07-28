"use client";

import { Alert, Skeleton } from "antd";
import { useRouter } from "next/navigation";
import {
  Suspense,
  use,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { ModulePageProps } from "@/registry";
import type { AdminAppPageComponent } from "../sdk";
import {
  AdminAppLoadingContent,
  AdminAppPage,
} from "../sdk/ui";
import { createAdminAppPath } from "./app-route";
import { AppRuntimeBoundary } from "./app-runtime-boundary";
import { loadAdminAppRemoteModule } from "./federation/load-remote-module";
import { adminAppRegistry } from "./registry/app-registry";
import type { ActiveAdminApp } from "./registry/app-registry";

function AppPageLoader({ active }: { active?: ActiveAdminApp }) {
  if (active) {
    return (
      <active.sdk.ui.AppPage>
        <AdminAppLoadingContent />
      </active.sdk.ui.AppPage>
    );
  }

  return (
    <AdminAppPage
      description={
        <Skeleton.Input active size="small" style={{ width: 280 }} />
      }
      title={<Skeleton.Input active size="small" style={{ width: 160 }} />}
    >
      <AdminAppLoadingContent />
    </AdminAppPage>
  );
}

function RemotePageMount({
  active,
  appPath,
  searchParams,
}: {
  active: ActiveAdminApp;
  appPath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pageDeclaration = active.descriptor.page;
  if (!pageDeclaration) return null;
  const loadedRemote = use(
    loadAdminAppRemoteModule(active.descriptor, pageDeclaration.module),
  );
  const Component = loadedRemote.default as AdminAppPageComponent;

  return (
    <Component
      sdk={active.sdk}
      route={{
        appPath,
        searchParams: Object.fromEntries(
          Object.entries(searchParams).filter(
            (entry): entry is [string, string | string[]] =>
              entry[1] !== undefined,
          ),
        ),
      }}
    />
  );
}

export default function AppRuntimePage({
  pathParams,
  searchParams = {},
}: ModulePageProps) {
  const router = useRouter();
  const registryRevision = useSyncExternalStore(
    adminAppRegistry.subscribe.bind(adminAppRegistry),
    adminAppRegistry.getSnapshot,
    adminAppRegistry.getSnapshot,
  );
  const appCode =
    typeof pathParams.appCode === "string" ? pathParams.appCode : "";
  const active = adminAppRegistry.get(appCode);
  const appPath = Array.isArray(pathParams.appPath)
    ? pathParams.appPath.join("/")
    : typeof pathParams.appPath === "string"
      ? pathParams.appPath
      : "";
  const defaultPath = active?.descriptor.page?.defaultPath
    ?.split("/")
    .filter(Boolean)
    .join("/");
  const shouldOpenDefaultPath = Boolean(
    active && !appPath && defaultPath,
  );

  useEffect(() => {
    if (!active || !shouldOpenDefaultPath || !defaultPath) return;
    const orgName =
      typeof pathParams.orgName === "string" ? pathParams.orgName : "";
    const storeName =
      typeof pathParams.storeName === "string" ? pathParams.storeName : "";
    router.replace(
      createAdminAppPath({
        orgName,
        storeName,
        appCode: active.descriptor.appCode,
        appPath: defaultPath,
      }),
    );
  }, [
    active,
    defaultPath,
    pathParams.orgName,
    pathParams.storeName,
    router,
    shouldOpenDefaultPath,
  ]);

  if (!active) {
    if (registryRevision === 0) {
      return <AppPageLoader />;
    }

    return (
      <Alert
        type="warning"
        showIcon
        message="App is not active"
        description={`No active Admin UI descriptor is available for "${appCode}".`}
      />
    );
  }

  if (!active.descriptor.page) {
    return (
      <Alert
        type="info"
        showIcon
        message={`${active.descriptor.displayName} has no Admin page`}
      />
    );
  }

  if (shouldOpenDefaultPath) {
    return <AppPageLoader active={active} />;
  }

  return (
    <AppRuntimeBoundary appCode={active.descriptor.appCode}>
      <Suspense fallback={<AppPageLoader active={active} />}>
        <RemotePageMount
          active={active}
          appPath={appPath}
          searchParams={searchParams}
        />
      </Suspense>
    </AppRuntimeBoundary>
  );
}
