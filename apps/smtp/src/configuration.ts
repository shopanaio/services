import { z } from "zod";

export const SMTP_PASSWORD_SECRET = "smtpPassword";

const smtpConfigurationSchema = z
  .object({
    host: z.string().trim().min(1).max(253),
    port: z.number().int().min(1).max(65_535),
    security: z.enum(["STARTTLS", "TLS"]),
    username: z.string().trim().min(1).max(320).optional(),
  })
  .strict();

export type SmtpConfiguration = z.infer<typeof smtpConfigurationSchema>;

export function parseSmtpConfiguration(
  input: Readonly<Record<string, unknown>>,
): SmtpConfiguration {
  const result = smtpConfigurationSchema.safeParse(input);
  if (result.success) {
    return Object.freeze(result.data);
  }

  const fields = result.error.issues
    .map((issue) => issue.path.join(".") || "configuration")
    .filter((field, index, values) => values.indexOf(field) === index)
    .join(", ");
  throw smtpConfigurationError(
    "SMTP_CONFIGURATION_INVALID",
    `SMTP configuration is invalid: ${fields}`,
  );
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
