"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import type { ApiNotificationDefinition } from "@/graphql/types";
import {
  NOTIFICATION_DEFINITION_SET_ENABLED_MUTATION,
  NOTIFICATION_SETTINGS_QUERY,
} from "../graphql";
import type {
  NotificationDefinitionSetEnabledMutationData,
  NotificationDefinitionSetEnabledMutationVariables,
  NotificationSettingsQueryData,
} from "../graphql/operation-types";

type ToggleableNotificationDefinition = Pick<
  ApiNotificationDefinition,
  "key" | "enabled" | "version"
>;

export function useNotificationSettings() {
  const [updatingKeys, setUpdatingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const query = useQuery<NotificationSettingsQueryData>(
    NOTIFICATION_SETTINGS_QUERY,
    {
      fetchPolicy: "cache-and-network",
    },
  );
  const [mutate, mutation] = useMutation<
    NotificationDefinitionSetEnabledMutationData,
    NotificationDefinitionSetEnabledMutationVariables
  >(NOTIFICATION_DEFINITION_SET_ENABLED_MUTATION);

  const setDefinitionEnabled = useCallback(
    async (
      definition: ToggleableNotificationDefinition,
      enabled: boolean,
    ) => {
      setUpdatingKeys((current) => new Set(current).add(definition.key));

      try {
        const result = await mutate({
          variables: {
            input: {
              key: definition.key,
              enabled,
              expectedVersion: definition.version,
            },
          },
          optimisticResponse: {
            notificationsMutation: {
              setDefinitionEnabled: {
                setting: {
                  definitionKey: definition.key,
                  enabled,
                  version: definition.version + 1,
                  updatedAt: new Date().toISOString(),
                },
                userErrors: [],
              },
            },
          },
          update: (cache, { data }) => {
            const payload =
              data?.notificationsMutation.setDefinitionEnabled;
            if (!payload?.setting || payload.userErrors.length > 0) return;
            const setting = payload.setting;

            const current =
              cache.readQuery<NotificationSettingsQueryData>({
                query: NOTIFICATION_SETTINGS_QUERY,
              });
            if (!current) return;

            cache.writeQuery<NotificationSettingsQueryData>({
              query: NOTIFICATION_SETTINGS_QUERY,
              data: {
                notificationsQuery: {
                  ...current.notificationsQuery,
                  definitions:
                    current.notificationsQuery.definitions.map((item) =>
                      item.key === setting.definitionKey
                        ? {
                            ...item,
                            enabled: setting.enabled,
                            version: setting.version,
                          }
                        : item,
                    ),
                },
              },
            });
          },
        });

        return {
          setting:
            result.data?.notificationsMutation.setDefinitionEnabled.setting ??
            null,
          userErrors:
            result.data?.notificationsMutation.setDefinitionEnabled
              .userErrors ?? [],
        };
      } finally {
        setUpdatingKeys((current) => {
          const next = new Set(current);
          next.delete(definition.key);
          return next;
        });
      }
    },
    [mutate],
  );

  return {
    definitions: query.data?.notificationsQuery.definitions ?? [],
    staffRecipients: query.data?.notificationsQuery.staffRecipients ?? [],
    loading: query.loading,
    error: query.error ?? mutation.error ?? null,
    updatingKeys,
    setDefinitionEnabled,
    refetch: query.refetch,
  };
}
