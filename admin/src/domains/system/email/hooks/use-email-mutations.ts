"use client";

import { useCallback, useState } from "react";
import {
  createMockEmailTemplate,
  deleteMockEmailTemplate,
  sendMockTestEmail,
  updateMockEmailSettings,
  updateMockEmailTemplate,
  updateMockSmtpProfile,
} from "../mock/email-store";
import type {
  CreateEmailTemplateInput,
  DeleteEmailTemplateInput,
  EmailMutationResult,
  EmailSettings,
  EmailTemplate,
  SendTestEmailInput,
  SmtpProfile,
  UpdateEmailSettingsInput,
  UpdateEmailTemplateInput,
  UpdateSmtpProfileInput,
} from "../types";

const useMockEmailMutation = <TInput, TData>(mutation: (input: TInput) => Promise<TData>) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<EmailMutationResult<TData>> => {
      setLoading(true);
      setError(null);
      try {
        return { data: await mutation(input), userErrors: [] };
      } catch (caughtError) {
        const nextError =
          caughtError instanceof Error ? caughtError : new Error("Unexpected email settings error");
        setError(nextError);
        return { data: null, userErrors: [] };
      } finally {
        setLoading(false);
      }
    },
    [mutation],
  );

  return {
    mutate,
    loading,
    error,
    reset: useCallback(() => setError(null), []),
  };
};

export const useUpdateEmailSettings = () => {
  const mutation = useMockEmailMutation<UpdateEmailSettingsInput, EmailSettings>(
    updateMockEmailSettings,
  );
  return { ...mutation, updateEmailSettings: mutation.mutate };
};

export const useUpdateSmtpProfile = () => {
  const mutation = useMockEmailMutation<UpdateSmtpProfileInput, SmtpProfile>(updateMockSmtpProfile);
  return { ...mutation, updateSmtpProfile: mutation.mutate };
};

export const useCreateEmailTemplate = () => {
  const mutation = useMockEmailMutation<CreateEmailTemplateInput, EmailTemplate>(
    createMockEmailTemplate,
  );
  return { ...mutation, createEmailTemplate: mutation.mutate };
};

export const useUpdateEmailTemplate = () => {
  const mutation = useMockEmailMutation<UpdateEmailTemplateInput, EmailTemplate>(
    updateMockEmailTemplate,
  );
  return { ...mutation, updateEmailTemplate: mutation.mutate };
};

export const useDeleteEmailTemplate = () => {
  const mutation = useMockEmailMutation<DeleteEmailTemplateInput, string>(deleteMockEmailTemplate);
  return { ...mutation, deleteEmailTemplate: mutation.mutate };
};

export const useSendTestEmail = () => {
  const mutation = useMockEmailMutation<SendTestEmailInput, boolean>(sendMockTestEmail);
  return { ...mutation, sendTestEmail: mutation.mutate };
};
