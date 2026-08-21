"use client";

import { useCallback, useState } from "react";
import type { AdminAppSdk } from "@shopana/admin-app-sdk";
import type { ApiGenericUserError } from "@/graphql/types";
import {
  HEADLESS_STOREFRONT_CREATE_MUTATION,
  HEADLESS_STOREFRONT_DISCONNECT_MUTATION,
  HEADLESS_STOREFRONT_RESUME_MUTATION,
  HEADLESS_STOREFRONT_SUSPEND_MUTATION,
  HEADLESS_STOREFRONT_UPDATE_MUTATION,
  STOREFRONT_ACCESS_POLICY_UPDATE_MUTATION,
  STOREFRONT_PRIVATE_CREDENTIAL_CREATE_MUTATION,
} from "../graphql";

const mutationId = () => crypto.randomUUID();

function assertSuccess(userErrors: ApiGenericUserError[]) {
  if (userErrors.length > 0) {
    throw new Error(userErrors.map(({ message }) => message).join("\n"));
  }
}

export function useHeadlessStorefrontActions(sdk: AdminAppSdk) {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async <T>(operation: () => Promise<T>) => {
    setLoading(true);
    try {
      return await operation();
    } finally {
      setLoading(false);
    }
  }, []);

  const createStorefront = useCallback(
    (displayName: string, permissions: string[]) =>
      run(async () => {
        const data = await sdk.graphql.mutate(HEADLESS_STOREFRONT_CREATE_MUTATION, {
          input: {
            displayName,
            permissions,
            clientMutationId: mutationId(),
          },
        });
        const payload = data.headlessAppMutation.headlessStorefrontCreate;
        assertSuccess(payload.userErrors);
        return payload;
      }),
    [run, sdk],
  );

  const renameStorefront = useCallback(
    (connectionId: string, displayName: string) =>
      run(async () => {
        const data = await sdk.graphql.mutate(HEADLESS_STOREFRONT_UPDATE_MUTATION, {
          input: {
            connectionId,
            displayName,
            clientMutationId: mutationId(),
          },
        });
        const payload = data.headlessAppMutation.headlessStorefrontUpdate;
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const setSuspended = useCallback(
    (connectionId: string, suspended: boolean) =>
      run(async () => {
        const document = suspended
          ? HEADLESS_STOREFRONT_SUSPEND_MUTATION
          : HEADLESS_STOREFRONT_RESUME_MUTATION;
        const data = await sdk.graphql.mutate(document, {
          input: { connectionId, clientMutationId: mutationId() },
        });
        const payload = suspended
          ? data.headlessAppMutation.headlessStorefrontSuspend
          : data.headlessAppMutation.headlessStorefrontResume;
        if (!payload) throw new Error("The storefront action did not complete.");
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const disconnectStorefront = useCallback(
    (connectionId: string) =>
      run(async () => {
        const data = await sdk.graphql.mutate(HEADLESS_STOREFRONT_DISCONNECT_MUTATION, {
          input: { connectionId, clientMutationId: mutationId() },
        });
        const payload = data.headlessAppMutation.headlessStorefrontDisconnect;
        if (!payload) throw new Error("The storefront was not disconnected.");
        assertSuccess(payload.userErrors);
        return payload.connection;
      }),
    [run, sdk],
  );

  const updatePolicy = useCallback(
    (connectionId: string, permissions: string[]) =>
      run(async () => {
        const data = await sdk.graphql.mutate(STOREFRONT_ACCESS_POLICY_UPDATE_MUTATION, {
          input: {
            connectionId,
            permissions,

            clientMutationId: mutationId(),
          },
        });
        const payload = data.headlessAppMutation.storefrontAccessPolicyUpdate;
        assertSuccess(payload.userErrors);
        return payload.policy;
      }),
    [run, sdk],
  );

  const createPrivateCredential = useCallback(
    (connectionId: string, label: string) =>
      run(async () => {
        const data = await sdk.graphql.mutate(STOREFRONT_PRIVATE_CREDENTIAL_CREATE_MUTATION, {
          input: {
            connectionId,
            label,
            clientMutationId: mutationId(),
          },
        });
        const payload = data.headlessAppMutation.storefrontPrivateCredentialCreate;
        assertSuccess(payload.userErrors);
        return payload;
      }),
    [run, sdk],
  );

  return {
    loading,
    createStorefront,
    renameStorefront,
    setSuspended,
    disconnectStorefront,
    updatePolicy,
    createPrivateCredential,
  };
}
