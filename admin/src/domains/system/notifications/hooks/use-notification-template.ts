"use client";

import { useQuery } from "@apollo/client/react";
import type { NotificationChannel } from "@/graphql/types";
import { NOTIFICATION_TEMPLATE_QUERY } from "../graphql";
import type {
  NotificationTemplateQueryData,
  NotificationTemplateQueryVariables,
} from "../graphql/operation-types";

export function useNotificationTemplate(
  key: string,
  channel: NotificationChannel,
  locale: string,
  skip = false,
) {
  const query = useQuery<NotificationTemplateQueryData, NotificationTemplateQueryVariables>(
    NOTIFICATION_TEMPLATE_QUERY,
    {
      variables: { key, channel, locale },
      fetchPolicy: "cache-and-network",
      skip,
    },
  );

  return {
    template: query.data?.notificationsQuery.template ?? null,
    loading: query.loading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}
