"use client";

import {
  Suspense,
  use,
  useSyncExternalStore,
} from "react";
import { Skeleton } from "antd";
import type {
  AdminAppExtensionComponent,
  AdminExtensionPointMap,
} from "../sdk";
import { AppRuntimeBoundary } from "./app-runtime-boundary";
import { loadAdminAppRemoteModule } from "./federation/load-remote-module";
import { adminAppRegistry } from "./registry/app-registry";
import { adminAppExtensionRegistry } from "./registry/extension-registry";

interface ContributionProps {
  appCode: string;
  module: string;
  context: AdminExtensionPointMap[keyof AdminExtensionPointMap];
}

function Contribution({ appCode, module, context }: ContributionProps) {
  const app = adminAppRegistry.get(appCode);
  if (!app) return null;
  const loadedRemote = use(loadAdminAppRemoteModule(app.descriptor, module));
  const Component = loadedRemote.default as AdminAppExtensionComponent;

  return (
    <AppRuntimeBoundary appCode={appCode}>
      <Suspense fallback={<Skeleton active paragraph={{ rows: 2 }} />}>
        <Component sdk={app.sdk} context={context} />
      </Suspense>
    </AppRuntimeBoundary>
  );
}

export function AdminAppExtensionPoint<
  TPoint extends keyof AdminExtensionPointMap,
>({
  point,
  context,
}: {
  point: TPoint;
  context: AdminExtensionPointMap[TPoint];
}) {
  useSyncExternalStore(
    adminAppExtensionRegistry.subscribe.bind(adminAppExtensionRegistry),
    adminAppExtensionRegistry.getSnapshot,
    adminAppExtensionRegistry.getSnapshot,
  );
  const contributions = adminAppExtensionRegistry.forPoint(point);

  return contributions.map((contribution) => (
    <Contribution
      key={`${contribution.owner}:${contribution.descriptor.id}`}
      appCode={contribution.appCode}
      module={contribution.descriptor.module}
      context={context}
    />
  ));
}
