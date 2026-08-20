"use client";

import { useCallback, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import type {
  ApiGenericUserError,
  ApiSmtpConnectionCreateInput,
  ApiSmtpConnectionUpdateInput,
} from "@/graphql/types";
import {
  SMTP_CONNECTION_ACTIVATE_MUTATION,
  SMTP_CONNECTION_CREATE_MUTATION,
  SMTP_CONNECTION_DISCONNECT_MUTATION,
  SMTP_CONNECTION_UPDATE_MUTATION,
} from "../graphql";

function assertSuccess(userErrors: ApiGenericUserError[]) {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(({ message }) => message).join("\n"));
  }
}

export function useSmtpConnectionActions(sdk: AdminAppSdk) {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async <T>(operation: () => Promise<T>) => {
    setLoading(true);
    try {
      return await operation();
    } finally {
      setLoading(false);
    }
  }, []);

  const createConnection = useCallback(
    (input: ApiSmtpConnectionCreateInput) =>
      run(async () => {
        const data = await sdk.graphql.mutate(SMTP_CONNECTION_CREATE_MUTATION, { input });
        const payload = data.smtpAppMutation.smtpConnectionCreate;
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const updateConnection = useCallback(
    (input: ApiSmtpConnectionUpdateInput) =>
      run(async () => {
        const data = await sdk.graphql.mutate(SMTP_CONNECTION_UPDATE_MUTATION, { input });
        const payload = data.smtpAppMutation.smtpConnectionUpdate;
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const activateConnection = useCallback(
    (connectionId: string) =>
      run(async () => {
        const data = await sdk.graphql.mutate(SMTP_CONNECTION_ACTIVATE_MUTATION, {
          input: { connectionId },
        });
        const payload = data.smtpAppMutation.smtpConnectionActivate;
        if (!payload) throw new Error("SMTP connection was not activated.");
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const disconnectConnection = useCallback(
    (connectionId: string) =>
      run(async () => {
        const data = await sdk.graphql.mutate(SMTP_CONNECTION_DISCONNECT_MUTATION, {
          input: { connectionId },
        });
        const payload = data.smtpAppMutation.smtpConnectionDisconnect;
        if (!payload) throw new Error("SMTP connection was not disconnected.");
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  return {
    loading,
    createConnection,
    updateConnection,
    activateConnection,
    disconnectConnection,
  };
}
