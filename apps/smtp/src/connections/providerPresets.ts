import type { SmtpConnectionProvider } from "./models/index.js";

export interface SmtpProviderPreset {
  readonly provider: SmtpConnectionProvider;
  readonly label: string;
  readonly host: string | null;
  readonly port: number;
  readonly security: "NONE" | "STARTTLS" | "TLS";
  readonly username: string | null;
}

export const SMTP_PROVIDER_PRESETS: readonly SmtpProviderPreset[] = Object.freeze([
  {
    provider: "SENDGRID",
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    security: "STARTTLS",
    username: "apikey",
  },
  {
    provider: "MAILCHIMP_TRANSACTIONAL",
    label: "Mailchimp Transactional",
    host: "smtp.mandrillapp.com",
    port: 587,
    security: "STARTTLS",
    username: null,
  },
  {
    provider: "GOOGLE_WORKSPACE",
    label: "Google Workspace",
    host: "smtp.gmail.com",
    port: 587,
    security: "STARTTLS",
    username: null,
  },
  {
    provider: "CUSTOM",
    label: "Custom SMTP",
    host: null,
    port: 587,
    security: "STARTTLS",
    username: null,
  },
]);
