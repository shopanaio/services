"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiNotificationTemplateUpdateInput } from "@/graphql/types";
import {
  NOTIFICATION_TEMPLATE_QUERY,
  NOTIFICATION_TEMPLATE_UPDATE_MUTATION,
} from "../graphql";
import type {
  NotificationTemplateUpdateMutationData,
  NotificationTemplateUpdateMutationVariables,
} from "../graphql/operation-types";

export function useUpdateNotificationTemplate() {
  const [mutate, mutation] = useMutation<
    NotificationTemplateUpdateMutationData,
    NotificationTemplateUpdateMutationVariables
  >(NOTIFICATION_TEMPLATE_UPDATE_MUTATION);

  return {
    updateTemplate: async (input: ApiNotificationTemplateUpdateInput) => {
      const result = await mutate({
        variables: { input },
        awaitRefetchQueries: true,
        refetchQueries: [
          {
            query: NOTIFICATION_TEMPLATE_QUERY,
            variables: {
              key: input.key,
              channel: input.channel,
              locale: input.locale,
            },
          },
        ],
      });
      const payload = result.data?.notificationsMutation.updateTemplate;

      return {
        data: payload?.template ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    loading: mutation.loading,
    error: mutation.error ?? null,
    reset: mutation.reset,
  };
}
