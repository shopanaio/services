"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getEmailSnapshot, subscribeToEmail } from "../mock/email-store";

export const useEmailSettings = () => {
  const snapshot = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getEmailSnapshot);
  const refetch = useCallback(async () => getEmailSnapshot(), []);

  return {
    settings: snapshot.settings,
    profile: snapshot.profile,
    loading: false,
    error: null as Error | null,
    refetch,
  };
};

export const useEmailTemplates = () => {
  const snapshot = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getEmailSnapshot);
  const refetch = useCallback(async () => getEmailSnapshot(), []);

  return {
    templates: snapshot.templates,
    loading: false,
    error: null as Error | null,
    refetch,
  };
};
