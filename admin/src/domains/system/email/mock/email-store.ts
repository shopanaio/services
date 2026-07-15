import type {
  CreateEmailTemplateInput,
  DeleteEmailTemplateInput,
  EmailSnapshot,
  SendTestEmailInput,
  UpdateEmailSettingsInput,
  UpdateEmailTemplateInput,
  UpdateSmtpProfileInput,
} from "../types";

const MOCK_REQUEST_DELAY = 250;
const now = "2026-07-15T09:00:00.000Z";
let templateSequence = 2;

let snapshot: EmailSnapshot = {
  settings: {
    from: "Demo store <noreply@example.com>",
    replyTo: "support@example.com",
    createdAt: now,
    updatedAt: now,
  },
  profile: {
    host: "smtp.example.com",
    port: 587,
    username: "mailer@example.com",
    createdAt: now,
    updatedAt: now,
  },
  templates: [
    {
      id: "email-template-1",
      type: "CustomerOrderCreated",
      subject: "Your order {{number}} has been created",
      body: "<h1>Thanks for your order</h1>\n<p>Order {{number}} is being prepared.</p>",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "email-template-2",
      type: "CustomerInvitation",
      subject: "You have been invited",
      body: "<h1>Welcome, {{firstName}}</h1>\n<p>Use {{token}} to continue.</p>",
      createdAt: now,
      updatedAt: now,
    },
  ],
};

const listeners = new Set<() => void>();

const publish = (nextSnapshot: EmailSnapshot) => {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
};

const mockRequest = async <TData>(data: TData): Promise<TData> => {
  await new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY));
  return data;
};

export const subscribeToEmail = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getEmailSnapshot = () => snapshot;

export const updateMockEmailSettings = async (
  input: UpdateEmailSettingsInput,
) => {
  const settings = {
    ...snapshot.settings,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  publish({ ...snapshot, settings });
  return mockRequest(settings);
};

export const updateMockSmtpProfile = async (input: UpdateSmtpProfileInput) => {
  const visibleInput = {
    ...(input.host !== undefined && { host: input.host }),
    ...(input.port !== undefined && { port: input.port }),
    ...(input.username !== undefined && { username: input.username }),
  };
  const profile = {
    ...snapshot.profile,
    ...visibleInput,
    updatedAt: new Date().toISOString(),
  };
  publish({ ...snapshot, profile });
  return mockRequest(profile);
};

export const createMockEmailTemplate = async (
  input: CreateEmailTemplateInput,
) => {
  templateSequence += 1;
  const template = {
    ...input,
    id: `email-template-${templateSequence}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  publish({ ...snapshot, templates: [...snapshot.templates, template] });
  return mockRequest(template);
};

export const updateMockEmailTemplate = async (
  input: UpdateEmailTemplateInput,
) => {
  const current = snapshot.templates.find((template) => template.id === input.id);
  if (!current) throw new Error("Email template not found");

  const template = {
    ...current,
    ...(input.subject !== undefined && { subject: input.subject }),
    ...(input.body !== undefined && { body: input.body }),
    updatedAt: new Date().toISOString(),
  };
  publish({
    ...snapshot,
    templates: snapshot.templates.map((item) =>
      item.id === template.id ? template : item,
    ),
  });
  return mockRequest(template);
};

export const deleteMockEmailTemplate = async ({
  id,
}: DeleteEmailTemplateInput) => {
  publish({
    ...snapshot,
    templates: snapshot.templates.filter((template) => template.id !== id),
  });
  return mockRequest(id);
};

export const sendMockTestEmail = async (input: SendTestEmailInput) => {
  void input;
  return mockRequest(true);
};
