export interface ResolvedStorefrontAccessContext {
  readonly store: {
    readonly id: string;
    readonly name: string;
    readonly displayName: string;
    readonly organizationId: string;
    readonly timezone: string;
    readonly email: string | null;
    readonly defaultLocale: string;
    readonly locales: readonly string[];
    readonly currencyCode: string;
  };
  readonly access: {
    readonly connectionId: string;
    readonly installationId: string;
    readonly credentialId: string;
    readonly mode: "PUBLIC" | "PRIVATE";
    readonly permissions: readonly string[];
    readonly policyRevision: number;
  };
}
