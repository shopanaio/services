"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import { SMTP_CONNECTIONS_QUERY } from "../graphql";
import type { SmtpConnection, SmtpProviderPreset } from "../graphql/operation-types";

export function useSmtpConnections(sdk: AdminAppSdk) {
  const [connections, setConnections] = useState<SmtpConnection[]>([]);
  const [presets, setPresets] = useState<SmtpProviderPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sdk.graphql.query(SMTP_CONNECTIONS_QUERY, {});
      setConnections(data.smtpAppQuery.smtpConnections);
      setPresets(data.smtpAppQuery.smtpProviderPresets);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to load SMTP connections."));
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { connections, presets, loading, error, refetch };
}
