"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import type { ApiHeadlessStorefrontPermissionDefinition } from "@/graphql/types";
import { HEADLESS_STOREFRONT_QUERY } from "../graphql";
import type { HeadlessStorefront } from "../graphql/operation-types";

export function useHeadlessStorefront(
  sdk: AdminAppSdk,
  storefrontId: string,
) {
  const [storefront, setStorefront] = useState<HeadlessStorefront | null>(null);
  const [permissionCatalog, setPermissionCatalog] = useState<
    ApiHeadlessStorefrontPermissionDefinition[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);

    try {
      const data = await sdk.graphql.query(HEADLESS_STOREFRONT_QUERY, {
        id: storefrontId,
      });
      setStorefront(data.headlessAppQuery.headlessStorefrontConnection);
      setPermissionCatalog(
        data.headlessAppQuery.headlessStorefrontPermissionCatalog,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Unable to load the storefront."),
      );
    } finally {
      setLoading(false);
    }
  }, [sdk, storefrontId]);

  useEffect(() => {
    let active = true;

    void sdk.graphql
      .query(HEADLESS_STOREFRONT_QUERY, { id: storefrontId })
      .then((data) => {
        if (!active) return;
        setStorefront(data.headlessAppQuery.headlessStorefrontConnection);
        setPermissionCatalog(
          data.headlessAppQuery.headlessStorefrontPermissionCatalog,
        );
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause
            : new Error("Unable to load the storefront."),
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sdk, storefrontId]);

  return { storefront, permissionCatalog, loading, error, refetch };
}
