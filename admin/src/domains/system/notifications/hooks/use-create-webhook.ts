"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiNotificationWebhookCreateInput } from "@/graphql/types";
import { NOTIFICATION_WEBHOOK_CREATE_MUTATION, NOTIFICATION_WEBHOOKS_QUERY } from "../graphql";
import type {
  NotificationWebhookCreateMutationData,
  NotificationWebhookCreateMutationVariables,
  NotificationWebhooksQueryData,
} from "../graphql/operation-types";

export function useCreateWebhook() {
  const [mutate, mutation] = useMutation<
    NotificationWebhookCreateMutationData,
    NotificationWebhookCreateMutationVariables
  >(NOTIFICATION_WEBHOOK_CREATE_MUTATION);

  return {
    createWebhook: async (input: ApiNotificationWebhookCreateInput) => {
      const result = await mutate({
        variables: { input },
        update: (cache, { data }) => {
          const payload = data?.notificationsMutation.createWebhook;
          if (!payload?.webhook || payload.userErrors.length > 0) return;
          const current = cache.readQuery<NotificationWebhooksQueryData>({
            query: NOTIFICATION_WEBHOOKS_QUERY,
          });
          if (!current) return;

          cache.writeQuery<NotificationWebhooksQueryData>({
            query: NOTIFICATION_WEBHOOKS_QUERY,
            data: {
              notificationsQuery: {
                ...current.notificationsQuery,
                webhookSubscriptions: [
                  payload.webhook,
                  ...current.notificationsQuery.webhookSubscriptions,
                ],
              },
            },
          });
        },
      });
      const payload = result.data?.notificationsMutation.createWebhook;

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
