"use client";

import { useQuery } from "@apollo/client/react";
import { NOTIFICATION_WEBHOOKS_QUERY } from "../graphql";
import type { NotificationWebhooksQueryData } from "../graphql/operation-types";

export function useWebhooks() {
  const query = useQuery<NotificationWebhooksQueryData>(NOTIFICATION_WEBHOOKS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  return {
    capabilities: query.data?.notificationsQuery.webhookCapabilities ?? null,
    webhooks: query.data?.notificationsQuery.webhookSubscriptions ?? [],
    loading: query.loading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
