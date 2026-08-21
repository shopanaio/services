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
  const [updatingKeys, setUpdatingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [definitionOverrides, setDefinitionOverrides] = useState<
    ReadonlyMap<string, Pick<ApiNotificationDefinition, "enabled" | "version">>
  >(() => new Map());
  const query = useQuery<NotificationSettingsQueryData>(NOTIFICATION_SETTINGS_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const [mutate, mutation] = useMutation<
    NotificationDefinitionSetEnabledMutationData,
    NotificationDefinitionSetEnabledMutationVariables
  >(NOTIFICATION_DEFINITION_SET_ENABLED_MUTATION);

  const setDefinitionEnabled = useCallback(
    async (definition: ToggleableNotificationDefinition, enabled: boolean) => {
      setUpdatingKeys((current) => new Set(current).add(definition.key));
      setDefinitionOverrides((current) => {
        const next = new Map(current);
        next.set(definition.key, {
          enabled,
          version: definition.version + 1,
        });
        return next;
      });

      try {
        const result = await mutate({
          variables: {
            input: {
              key: definition.key,
              enabled,
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
            const payload = data?.notificationsMutation.setDefinitionEnabled;
            if (!payload?.setting || payload.userErrors.length > 0) return;
            const setting = payload.setting;

            const current = cache.readQuery<NotificationSettingsQueryData>({
              query: NOTIFICATION_SETTINGS_QUERY,
            });
            if (!current) return;

            cache.writeQuery<NotificationSettingsQueryData>({
              query: NOTIFICATION_SETTINGS_QUERY,
              data: {
                notificationsQuery: {
                  ...current.notificationsQuery,
                  definitions: current.notificationsQuery.definitions.map((item) =>
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
        const payload = result.data?.notificationsMutation.setDefinitionEnabled;

        if (!payload?.setting || payload.userErrors.length > 0) {
          setDefinitionOverrides((current) => {
            const next = new Map(current);
            next.set(definition.key, definition);
            return next;
          });
        } else {
          setDefinitionOverrides((current) => {
            const next = new Map(current);
            next.set(definition.key, {
              enabled: payload.setting.enabled,
              version: payload.setting.version,
            });
            return next;
          });
        }

        return {
          setting: payload?.setting ?? null,
          userErrors: payload?.userErrors ?? [],
        };
      } catch (error) {
        setDefinitionOverrides((current) => {
          const next = new Map(current);
          next.set(definition.key, definition);
          return next;
        });
        throw error;
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
    definitions: (query.data?.notificationsQuery.definitions ?? []).map((definition) => {
      const override = definitionOverrides.get(definition.key);
      return override ? { ...definition, ...override } : definition;
    }),
    staffRecipients: query.data?.notificationsQuery.staffRecipients ?? [],
    loading: query.loading,
    error: query.error ?? mutation.error ?? null,
    updatingKeys,
    setDefinitionEnabled,
    refetch: query.refetch,
  };
}
