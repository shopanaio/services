import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { EmailSettings, EmailTemplate, EmailTemplateType, SmtpProfile } from "./types";

export const EDIT_EMAIL_SETTINGS_MODAL_TYPE = "system-edit-email-settings";
export const EDIT_SMTP_PROFILE_MODAL_TYPE = "system-edit-smtp-profile";
export const EMAIL_TEMPLATE_MODAL_TYPE = "system-email-template";
export const SEND_TEST_EMAIL_MODAL_TYPE = "system-send-test-email";
export const DELETE_EMAIL_TEMPLATE_MODAL_TYPE = "system-delete-email-template";

interface EmailModalPayload extends IModalStackPayload {
  onSaved?: () => Promise<unknown> | unknown;
}

export interface EditEmailSettingsModalPayload extends EmailModalPayload {
  settings: EmailSettings;
}

export interface EditSmtpProfileModalPayload extends EmailModalPayload {
  profile: SmtpProfile;
}

export interface EmailTemplateModalPayload extends EmailModalPayload {
  template: EmailTemplate | null;
  type: EmailTemplateType;
}

export interface SendTestEmailModalPayload extends EmailModalPayload {
  type: EmailTemplateType;
}

export interface DeleteEmailTemplateModalPayload extends EmailModalPayload {
  templateId: string;
  templateLabel: string;
}

export const useEditEmailSettingsModal = createModalStackHook(EDIT_EMAIL_SETTINGS_MODAL_TYPE);
export const useEditSmtpProfileModal = createModalStackHook(EDIT_SMTP_PROFILE_MODAL_TYPE);
export const useEmailTemplateModal = createModalStackHook(EMAIL_TEMPLATE_MODAL_TYPE);
export const useSendTestEmailModal = createModalStackHook(SEND_TEST_EMAIL_MODAL_TYPE);
export const useDeleteEmailTemplateModal = createModalStackHook(DELETE_EMAIL_TEMPLATE_MODAL_TYPE);

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [EDIT_EMAIL_SETTINGS_MODAL_TYPE]: EditEmailSettingsModalPayload;
    [EDIT_SMTP_PROFILE_MODAL_TYPE]: EditSmtpProfileModalPayload;
    [EMAIL_TEMPLATE_MODAL_TYPE]: EmailTemplateModalPayload;
    [SEND_TEST_EMAIL_MODAL_TYPE]: SendTestEmailModalPayload;
    [DELETE_EMAIL_TEMPLATE_MODAL_TYPE]: DeleteEmailTemplateModalPayload;
  }
}
