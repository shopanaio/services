import { z } from "zod";

export const SMTP_PASSWORD_SECRET = "smtpPassword";

const smtpDeploymentPolicySchema = z
  .object({
    allow_private_network: z.boolean().optional().default(false),
    allow_insecure_smtp: z.boolean().optional().default(false),
  })
  .passthrough();

export interface SmtpDeploymentPolicy {
  readonly allowPrivateNetwork: boolean;
  readonly allowInsecureSmtp: boolean;
}

export const DEFAULT_SMTP_DEPLOYMENT_POLICY: SmtpDeploymentPolicy =
  Object.freeze({
    allowPrivateNetwork: false,
    allowInsecureSmtp: false,
  });

const smtpConfigurationSchema = z
  .object({
    host: z.string().trim().min(1).max(253),
    port: z.number().int().min(1).max(65_535),
    security: z.enum(["NONE", "STARTTLS", "TLS"]),
    username: z.string().trim().min(1).max(320).optional(),
  })
  .strict();

export type SmtpConfiguration = z.infer<typeof smtpConfigurationSchema>;

export function parseSmtpConfiguration(
  input: Readonly<Record<string, unknown>>,
  policy: SmtpDeploymentPolicy = DEFAULT_SMTP_DEPLOYMENT_POLICY,
): SmtpConfiguration {
  const result = smtpConfigurationSchema.safeParse(input);
  if (
    result.success &&
    (result.data.security !== "NONE" || policy.allowInsecureSmtp)
  ) {
    return Object.freeze(result.data);
  }

  const fields = result.success
    ? "security"
    : result.error.issues
        .map((issue) => issue.path.join(".") || "configuration")
        .filter((field, index, values) => values.indexOf(field) === index)
        .join(", ");
  throw smtpConfigurationError(
    "SMTP_CONFIGURATION_INVALID",
    `SMTP configuration is invalid: ${fields}`,
  );
}

export function parseSmtpDeploymentPolicy(
  input: Readonly<Record<string, unknown>>,
): SmtpDeploymentPolicy {
  const result = smtpDeploymentPolicySchema.safeParse(input);
  if (!result.success) {
    throw smtpConfigurationError(
      "SMTP_DEPLOYMENT_CONFIGURATION_INVALID",
      "SMTP deployment configuration is invalid",
    );
  }
  return Object.freeze({
    allowPrivateNetwork: result.data.allow_private_network,
    allowInsecureSmtp: result.data.allow_insecure_smtp,
  });
}

export function smtpConfigurationError(
  code: string,
  message: string,
): Error {
  return Object.assign(new Error(message), {
    code,
    details: Object.freeze({
      kind: "CONFIGURATION",
      safeToRetry: false,
      acceptedByProvider: false,
    }),
  });
}

export function validateSmtpPassword(password: string): string {
  if (password.trim().length === 0 || password.length > 4_096) {
    throw smtpConfigurationError(
      "SMTP_PASSWORD_INVALID",
      "SMTP password must contain between 1 and 4096 characters",
    );
  }
  return password;
}
