"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@apollo/client/react";
import { NOTIFICATION_WEBHOOK_SECRET_REVEAL_MUTATION } from "../graphql";
import type { NotificationWebhookSecretRevealMutationData } from "../graphql/operation-types";

export function useWebhookSecret() {
  const requested = useRef(false);
  const [reveal, result] =
    useMutation<NotificationWebhookSecretRevealMutationData>(
      NOTIFICATION_WEBHOOK_SECRET_REVEAL_MUTATION,
    );

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void reveal().catch(() => undefined);
  }, [reveal]);

  const payload =
    result.data?.notificationsMutation.revealWebhookSecret ?? null;

  return {
    secret: payload?.secret ?? null,
    userErrors: payload?.userErrors ?? [],
    loading: result.loading,
    error: result.error ?? null,
    revealSecret: reveal,
  };
}
