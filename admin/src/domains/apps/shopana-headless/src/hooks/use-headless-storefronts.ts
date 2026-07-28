"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import { HEADLESS_STOREFRONTS_QUERY } from "../graphql";
import type { HeadlessStorefront } from "../graphql/operation-types";

export function useHeadlessStorefronts(sdk: AdminAppSdk) {
  const [storefronts, setStorefronts] = useState<HeadlessStorefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);

    try {
      const data = await sdk.graphql.query(HEADLESS_STOREFRONTS_QUERY, {});
      setStorefronts(data.headlessAppQuery.headlessStorefrontConnections);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Unable to load storefronts."),
      );
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    let active = true;

    void sdk.graphql
      .query(HEADLESS_STOREFRONTS_QUERY, {})
      .then((data) => {
        if (!active) return;
        setStorefronts(data.headlessAppQuery.headlessStorefrontConnections);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause
            : new Error("Unable to load storefronts."),
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sdk]);

  return { storefronts, loading, error, refetch };
}
