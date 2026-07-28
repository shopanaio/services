import type { SmtpProviderPreset } from "../graphql/operation-types";

export const CREATE_SMTP_CONNECTION_MODAL_ID = "smtp.connection.create";
export const SMTP_DISCONNECT_MODAL_ID = "smtp.disconnect";

export interface CreateSmtpConnectionModalPayload {
  presets: SmtpProviderPreset[];
}

export interface CreateSmtpConnectionModalResult {
  connectionId: string;
}

export interface SmtpDisconnectModalPayload {
  connectionId: string;
  displayName: string;
}

export interface SmtpDisconnectModalResult {
  connectionId: string;
}
