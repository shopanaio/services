export const WEBHOOK_API_VERSIONS = [
  {
    version: "unstable",
    stability: "UNSTABLE",
    isDefault: true,
  },
] as const;

export function isSupportedWebhookApiVersion(value: string): boolean {
  return WEBHOOK_API_VERSIONS.some((entry) => entry.version === value);
}
