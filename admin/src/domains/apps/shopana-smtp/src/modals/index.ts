import type {
  SmtpConnection,
  SmtpProviderPreset,
} from "../graphql/operation-types";
import type {
  SmtpConnectionProvider,
  SmtpConnectionSecurity,
} from "@/graphql/types";

export const SMTP_SETTINGS_MODAL_ID = "smtp.settings";
export const SMTP_DISCONNECT_MODAL_ID = "smtp.disconnect";

export interface SmtpSettings {
  displayName: string;
  provider: SmtpConnectionProvider;
  host: string;
  port: number;
  security: SmtpConnectionSecurity;
  username?: string;
  password?: string;
}

export interface SmtpSettingsModalPayload {
  connection: SmtpConnection | null;
  presets: SmtpProviderPreset[];
}

export interface SmtpSettingsModalResult {
  settings: SmtpSettings;
}

export interface SmtpDisconnectModalPayload {
  connectionId: string;
  displayName: string;
}

export interface SmtpDisconnectModalResult {
  connectionId: string;
}
