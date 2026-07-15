export const EMAIL_TEMPLATE_TYPES = [
  "CustomerInvitation",
  "CustomerSignUp",
  "CustomerResetPassword",
  "CustomerOrderCreated",
  "CustomerOrderShipped",
  "CustomerOrderDelivered",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export interface EmailSettings {
  from: string;
  replyTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmtpProfile {
  host: string;
  port: number;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSnapshot {
  settings: EmailSettings;
  profile: SmtpProfile;
  templates: EmailTemplate[];
}

export interface UpdateEmailSettingsInput {
  from?: string;
  replyTo?: string;
}

export interface UpdateSmtpProfileInput {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface CreateEmailTemplateInput {
  subject: string;
  body: string;
  type: EmailTemplateType;
}

export interface UpdateEmailTemplateInput {
  id: string;
  subject?: string;
  body?: string;
}

export interface DeleteEmailTemplateInput {
  id: string;
}

export interface SendTestEmailInput {
  to: string;
  type: EmailTemplateType;
}

export interface EmailMutationResult<TData> {
  data: TData | null;
  userErrors: Array<{
    code?: string | null;
    field?: string[] | null;
    message: string;
  }>;
}
