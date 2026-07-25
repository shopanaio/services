"use client";

import { Alert, Spin } from "antd";
import {
  Suspense,
  use,
  useSyncExternalStore,
} from "react";
import type { ModulePageProps } from "@/registry";
import type { AdminAppPageComponent } from "../sdk";
import { AppRuntimeBoundary } from "./app-runtime-boundary";
import { loadAdminAppRemoteModule } from "./federation/load-remote-module";
import { adminAppRegistry } from "./registry/app-registry";
import type { ActiveAdminApp } from "./registry/app-registry";

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
  useSyncExternalStore(
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

  if (!active) {
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

  return (
    <AppRuntimeBoundary appCode={active.descriptor.appCode}>
      <Suspense fallback={<Spin fullscreen tip="Loading App…" />}>
        <RemotePageMount
          active={active}
          appPath={appPath}
          searchParams={searchParams}
        />
      </Suspense>
    </AppRuntimeBoundary>
  );
}
