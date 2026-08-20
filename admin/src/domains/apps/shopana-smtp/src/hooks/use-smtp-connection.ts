"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import { SMTP_CONNECTION_QUERY } from "../graphql";
import type { SmtpConnection, SmtpProviderPreset } from "../graphql/operation-types";

export function useSmtpConnection(sdk: AdminAppSdk, connectionId: string) {
  const [connection, setConnection] = useState<SmtpConnection | null>(null);
  const [presets, setPresets] = useState<SmtpProviderPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sdk.graphql.query(SMTP_CONNECTION_QUERY, {
        id: connectionId,
      });
      setConnection(data.smtpAppQuery.smtpConnection);
      setPresets(data.smtpAppQuery.smtpProviderPresets);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to load SMTP connection."));
    } finally {
      setLoading(false);
    }
  }, [connectionId, sdk]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { connection, presets, loading, error, refetch };
}
