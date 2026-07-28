"use client";

import { useMutation } from "@apollo/client/react";
import type { ApiNotificationPreviewInput } from "@/graphql/types";
import { NOTIFICATION_TEMPLATE_PREVIEW_MUTATION } from "../graphql";
import type {
  NotificationTemplatePreviewMutationData,
  NotificationTemplatePreviewMutationVariables,
} from "../graphql/operation-types";

export function useNotificationTemplatePreview() {
  const [mutate, mutation] = useMutation<
    NotificationTemplatePreviewMutationData,
    NotificationTemplatePreviewMutationVariables
  >(NOTIFICATION_TEMPLATE_PREVIEW_MUTATION);

  return {
    previewTemplate: async (input: ApiNotificationPreviewInput) => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.notificationsMutation.preview;

      return {
        data: payload?.preview ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    loading: mutation.loading,
    error: mutation.error ?? null,
    reset: mutation.reset,
  };
}
