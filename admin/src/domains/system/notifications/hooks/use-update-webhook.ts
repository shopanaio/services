"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiNotificationWebhookUpdateInput } from "@/graphql/types";
import { NOTIFICATION_WEBHOOKS_QUERY, NOTIFICATION_WEBHOOK_UPDATE_MUTATION } from "../graphql";
import type {
  NotificationWebhooksQueryData,
  NotificationWebhookUpdateMutationData,
  NotificationWebhookUpdateMutationVariables,
} from "../graphql/operation-types";

export function useUpdateWebhook() {
  const [mutate, mutation] = useMutation<
    NotificationWebhookUpdateMutationData,
    NotificationWebhookUpdateMutationVariables
  >(NOTIFICATION_WEBHOOK_UPDATE_MUTATION);

  return {
    updateWebhook: async (input: ApiNotificationWebhookUpdateInput) => {
      const result = await mutate({
        variables: { input },
        update: (cache, { data }) => {
          const payload = data?.notificationsMutation.updateWebhook;
          if (!payload?.webhook || payload.userErrors.length > 0) return;
          const updatedWebhook = payload.webhook;
          const current = cache.readQuery<NotificationWebhooksQueryData>({
            query: NOTIFICATION_WEBHOOKS_QUERY,
          });
          if (!current) return;

          cache.writeQuery<NotificationWebhooksQueryData>({
            query: NOTIFICATION_WEBHOOKS_QUERY,
            data: {
              notificationsQuery: {
                ...current.notificationsQuery,
                webhookSubscriptions: current.notificationsQuery.webhookSubscriptions.map(
                  (webhook) => (webhook.id === updatedWebhook.id ? updatedWebhook : webhook),
                ),
              },
            },
          });
        },
      });
      const payload = result.data?.notificationsMutation.updateWebhook;

      return {
        data: payload?.webhook ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    loading: mutation.loading,
    error: mutation.error ?? null,
    reset: mutation.reset,
  };
}
