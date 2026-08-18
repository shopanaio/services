import {
  PreloadNotFoundError,
  TypeAuthorizationError,
  TypePolicy,
} from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import {
  APPLICATION_AUTH_UI_LOCALES,
} from "../../auth/applicationAuthConfiguration.js";
import {
  APPLICATION_AUTH_PROVIDER_NAMES,
  parseApplicationAuthProviderName,
  type ApplicationAuthProviderName,
} from "../../auth/applicationSocialProviders.js";
import type { ApplicationAuthAdminView } from "../../repositories/ApplicationAuthAdminQueryRepository.js";
import type {
  ApplicationAuthBranding,
  ApplicationAuthDeliveryProfile,
  ApplicationAuthOrigin,
} from "../../repositories/models/application-auth.js";
import { IAMType } from "./IAMType.js";
import {
  ApplicationAuthProviderResolver,
  type ApplicationAuthProviderResolverInput,
} from "./ApplicationProviderResolver.js";

export interface ApplicationAuthConfigurationResolverInput {
  organizationId: string;
  applicationId: string;
}

type ApplicationAuthMethodId = "password" | "email_otp" | "phone_otp";
type ApplicationAuthMethodCapability =
  | "SIGN_IN"
  | "SIGN_UP"
  | "PASSWORD_RESET";

export interface ApplicationAuthMethodView {
  id: ApplicationAuthMethodId;
  availableCapabilities: readonly ApplicationAuthMethodCapability[];
  enabledCapabilities: readonly ApplicationAuthMethodCapability[];
  configured: boolean;
  revision: number;
  updatedAt: Date | null;
  updatedBy: string | null;
}

interface ApplicationAuthProviderCallbackUrl {
  provider: ApplicationAuthProviderName;
  url: string;
}

interface ApplicationAuthProtocolUrls {
  issuer: string;
  oidcDiscoveryUrl: string;
  oauthAuthorizationServerMetadataUrl: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  revocationUrl: string;
  endSessionUrl: string;
  providerCallbackUrls: readonly ApplicationAuthProviderCallbackUrl[];
}

interface ApplicationAuthEmailDeliveryView {
  configured: boolean;
  transportProfile: string | null;
  senderIdentity: string | null;
  emailVerificationTemplateId: string | null;
  passwordResetTemplateId: string | null;
  emailOtpSignInTemplateId: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/** Application authentication configuration resolver. */
@TypePolicy<ApplicationAuthConfigurationResolver>({
  organizationId: (resolver) => resolver.$props.organizationId,
  domain: "org",
  resource: "org.application-auth",
  action: "read",
})
export class ApplicationAuthConfigurationResolver extends IAMType<
  ApplicationAuthConfigurationResolverInput,
  ApplicationAuthAdminView
> {
  private providerReadAuthorization?: Promise<void>;

  async $preload() {
    const view = await this.$ctx.loaders.applicationAuthAdmin.load({
      id: this.$props.applicationId,
      organizationId: this.$props.organizationId,
    });
    if (!view) {
      throw new PreloadNotFoundError("Application auth configuration not found");
    }
    return view;
  }

  applicationId() {
    return encodeGlobalIdByType(
      this.$props.applicationId,
      GlobalIdEntity.Application
    );
  }

  async realmEnabled() {
    return (await this.$get("configuration")).realmEnabled;
  }

  async registrationMode() {
    return (await this.$get("configuration")).registrationMode.toUpperCase();
  }

  async emailVerificationRequired() {
    return (await this.$get("configuration")).emailVerificationRequired;
  }

  async consentMode() {
    return (await this.$get("configuration")).consentMode.toUpperCase();
  }

  async accessTokenTtlSeconds() {
    return (await this.$get("configuration")).accessTokenTtlSeconds;
  }

  async idTokenTtlSeconds() {
    return (await this.$get("configuration")).idTokenTtlSeconds;
  }

  async refreshTokenTtlSeconds() {
    return (await this.$get("configuration")).refreshTokenTtlSeconds;
  }

  async sessionTtlSeconds() {
    return (await this.$get("configuration")).sessionTtlSeconds;
  }

  async branding() {
    return new ApplicationAuthBrandingResolver(
      (await this.$get("configuration")).brandingJson,
      this.$ctx
    );
  }

  async defaultLocale() {
    return (await this.$get("configuration")).defaultLocale;
  }

  supportedLocales() {
    return APPLICATION_AUTH_UI_LOCALES;
  }

  async trustedOrigins() {
    return (await this.$get("origins")).map(
      (origin) => new ApplicationAuthTrustedOriginResolver(origin, this.$ctx)
    );
  }

  protocolUrls() {
    return new ApplicationAuthProtocolUrlsResolver(
      createProtocolUrls(
        this.$ctx.kernel.applicationAuthPublicBaseUrl,
        this.$props.applicationId
      ),
      this.$ctx
    );
  }

  async emailDelivery() {
    return new ApplicationAuthEmailDeliveryConfigurationResolver(
      createEmailDeliveryView(await this.$get("deliveryProfile")),
      this.$ctx
    );
  }

  async authMethod(args: { id: string }) {
    const method = (await this.authMethodViews()).find(
      ({ id }) => id === args.id
    );
    if (!method) {
      throw new Error("Application auth method is unsupported");
    }
    return new ApplicationAuthMethodResolver(method, this.$ctx);
  }

  async authMethods() {
    return (await this.authMethodViews()).map(
      (method) => new ApplicationAuthMethodResolver(method, this.$ctx)
    );
  }

  async provider(args: { name: string }) {
    await this.assertProviderReadAuthorized();
    const provider = parseApplicationAuthProviderName(args.name.toLowerCase());
    return new ApplicationAuthProviderResolver(
      await this.providerView(provider),
      this.$ctx
    );
  }

  async providers() {
    await this.assertProviderReadAuthorized();
    return Promise.all(
      APPLICATION_AUTH_PROVIDER_NAMES.map(async (provider) =>
        new ApplicationAuthProviderResolver(
          await this.providerView(provider),
          this.$ctx
        )
      )
    );
  }

  async revision() {
    return (await this.$get("configuration")).revision;
  }

  async createdAt() {
    return (await this.$get("configuration")).createdAt;
  }

  async updatedAt() {
    return (await this.$get("configuration")).updatedAt;
  }

  private async authMethodViews(): Promise<ApplicationAuthMethodView[]> {
    const [configuration, deliveryProfile, phoneOtpConfigured] =
      await Promise.all([
        this.$get("configuration"),
        this.$get("deliveryProfile"),
        this.$ctx.kernel.applicationAuthAdminManagement.isPhoneOtpConfigured(
          this.$props.applicationId
        ),
      ]);
    const passwordCapabilities: ApplicationAuthMethodCapability[] = [];
    if (configuration.passwordSignInEnabled) {
      passwordCapabilities.push("SIGN_IN");
    }
    if (configuration.passwordSignUpEnabled) {
      passwordCapabilities.push("SIGN_UP");
    }
    if (configuration.passwordResetEnabled) {
      passwordCapabilities.push("PASSWORD_RESET");
    }
    const emailOtpCapabilities: ApplicationAuthMethodCapability[] = [];
    if (configuration.emailOtpSignInEnabled) {
      emailOtpCapabilities.push("SIGN_IN");
    }
    if (configuration.emailOtpSignUpEnabled) {
      emailOtpCapabilities.push("SIGN_UP");
    }
    const phoneOtpCapabilities: ApplicationAuthMethodCapability[] = [];
    if (configuration.phoneOtpSignInEnabled) {
      phoneOtpCapabilities.push("SIGN_IN");
    }
    if (configuration.phoneOtpSignUpEnabled) {
      phoneOtpCapabilities.push("SIGN_UP");
    }
    const passwordNeedsDelivery =
      configuration.passwordResetEnabled ||
      (configuration.passwordSignUpEnabled &&
        configuration.emailVerificationRequired);

    return [
      {
        id: "password",
        availableCapabilities: ["SIGN_IN", "SIGN_UP", "PASSWORD_RESET"],
        enabledCapabilities: passwordCapabilities,
        configured: !passwordNeedsDelivery || deliveryProfile !== null,
        revision: configuration.revision,
        updatedAt: configuration.updatedAt,
        updatedBy: null,
      },
      {
        id: "email_otp",
        availableCapabilities: ["SIGN_IN", "SIGN_UP"],
        enabledCapabilities: emailOtpCapabilities,
        configured: deliveryProfile !== null,
        revision: configuration.revision,
        updatedAt: configuration.updatedAt,
        updatedBy: null,
      },
      {
        id: "phone_otp",
        availableCapabilities: ["SIGN_IN", "SIGN_UP"],
        enabledCapabilities: phoneOtpCapabilities,
        configured: phoneOtpConfigured,
        revision: configuration.revision,
        updatedAt: configuration.updatedAt,
        updatedBy: null,
      },
    ];
  }

  private async providerView(
    provider: ApplicationAuthProviderName
  ): Promise<ApplicationAuthProviderResolverInput> {
    const [providers, configuration] = await Promise.all([
      this.$get("providers"),
      this.$get("configuration"),
    ]);
    const configured = providers.find((entry) => entry.provider === provider);
    const callbackUrl = createProviderCallbackUrl(
      this.$ctx.kernel.applicationAuthPublicBaseUrl,
      this.$props.applicationId,
      provider
    );
    return configured
      ? {
          ...configured,
          supported: true,
          callbackUrl,
        }
      : {
          applicationId: this.$props.applicationId,
          provider,
          supported: true,
          configured: false,
          enabled: false,
          maskedClientId: null,
          scopes: [],
          callbackUrl,
          revision: configuration.revision,
          updatedAt: null,
          updatedBy: null,
        };
  }

  private assertProviderReadAuthorized(): Promise<void> {
    this.providerReadAuthorization ??= this.authProvider
      .authorize({
        organizationId: this.$props.organizationId,
        domain: "org",
        resource: "org.application-auth-providers",
        action: "read",
      })
      .then((authorized) => {
        if (!authorized) {
          throw new TypeAuthorizationError(
            "org.application-auth-providers",
            "read"
          );
        }
      });
    return this.providerReadAuthorization;
  }
}

/** Catalog-owned authentication method resolver. */
export class ApplicationAuthMethodResolver extends IAMType<ApplicationAuthMethodView> {
  id() {
    return this.$props.id;
  }

  availableCapabilities() {
    return this.$props.availableCapabilities;
  }

  enabledCapabilities() {
    return this.$props.enabledCapabilities;
  }

  configured() {
    return this.$props.configured;
  }

  revision() {
    return this.$props.revision;
  }

  updatedAt() {
    return this.$props.updatedAt;
  }

  updatedBy() {
    return this.$props.updatedBy
      ? encodeGlobalIdByType(this.$props.updatedBy, GlobalIdEntity.User)
      : null;
  }
}

/** Hosted authentication UI branding resolver. */
export class ApplicationAuthBrandingResolver extends IAMType<ApplicationAuthBranding> {
  displayName() {
    return this.$props.displayName ?? null;
  }

  headline() {
    return this.$props.headline ?? null;
  }

  logoUrl() {
    return this.$props.logoUrl ?? null;
  }

  primaryColor() {
    return this.$props.primaryColor?.toUpperCase() ?? null;
  }

  backgroundColor() {
    return this.$props.backgroundColor?.toUpperCase() ?? null;
  }
}

/** Trusted origin resolver. */
export class ApplicationAuthTrustedOriginResolver extends IAMType<ApplicationAuthOrigin> {
  origin() {
    return this.$props.origin;
  }

  createdAt() {
    return this.$props.createdAt;
  }
}

/** Social provider callback URL resolver. */
export class ApplicationAuthProviderCallbackUrlResolver extends IAMType<ApplicationAuthProviderCallbackUrl> {
  provider() {
    return this.$props.provider.toUpperCase();
  }

  url() {
    return this.$props.url;
  }
}

/** OAuth and OpenID Connect protocol URL resolver. */
export class ApplicationAuthProtocolUrlsResolver extends IAMType<ApplicationAuthProtocolUrls> {
  issuer() {
    return this.$props.issuer;
  }

  oidcDiscoveryUrl() {
    return this.$props.oidcDiscoveryUrl;
  }

  oauthAuthorizationServerMetadataUrl() {
    return this.$props.oauthAuthorizationServerMetadataUrl;
  }

  authorizationUrl() {
    return this.$props.authorizationUrl;
  }

  tokenUrl() {
    return this.$props.tokenUrl;
  }

  jwksUrl() {
    return this.$props.jwksUrl;
  }

  revocationUrl() {
    return this.$props.revocationUrl;
  }

  endSessionUrl() {
    return this.$props.endSessionUrl;
  }

  providerCallbackUrls() {
    return this.$props.providerCallbackUrls.map(
      (callback) =>
        new ApplicationAuthProviderCallbackUrlResolver(callback, this.$ctx)
    );
  }
}

/** Non-secret application email delivery configuration resolver. */
export class ApplicationAuthEmailDeliveryConfigurationResolver extends IAMType<ApplicationAuthEmailDeliveryView> {
  configured() {
    return this.$props.configured;
  }

  transportProfile() {
    return this.$props.transportProfile;
  }

  senderIdentity() {
    return this.$props.senderIdentity;
  }

  emailVerificationTemplateId() {
    return this.$props.emailVerificationTemplateId;
  }

  passwordResetTemplateId() {
    return this.$props.passwordResetTemplateId;
  }

  emailOtpSignInTemplateId() {
    return this.$props.emailOtpSignInTemplateId;
  }

  updatedAt() {
    return this.$props.updatedAt;
  }

  updatedBy() {
    return this.$props.updatedBy
      ? encodeGlobalIdByType(this.$props.updatedBy, GlobalIdEntity.User)
      : null;
  }
}

function createProtocolUrls(
  publicBaseUrl: string,
  applicationId: string
): ApplicationAuthProtocolUrls {
  const baseUrl = publicBaseUrl.replace(/\/$/u, "");
  const issuer = `${baseUrl}/auth/applications/${applicationId}`;
  return {
    issuer,
    oidcDiscoveryUrl: `${issuer}/.well-known/openid-configuration`,
    oauthAuthorizationServerMetadataUrl:
      `${baseUrl}/.well-known/oauth-authorization-server` +
      `/auth/applications/${applicationId}`,
    authorizationUrl: `${issuer}/oauth2/authorize`,
    tokenUrl: `${issuer}/oauth2/token`,
    jwksUrl: `${issuer}/jwks`,
    revocationUrl: `${issuer}/oauth2/revoke`,
    endSessionUrl: `${issuer}/oauth2/end-session`,
    providerCallbackUrls: APPLICATION_AUTH_PROVIDER_NAMES.map((provider) => ({
      provider,
      url: `${issuer}/callback/${provider}`,
    })),
  };
}

function createProviderCallbackUrl(
  publicBaseUrl: string,
  applicationId: string,
  provider: ApplicationAuthProviderName
): string {
  const baseUrl = publicBaseUrl.replace(/\/$/u, "");
  return `${baseUrl}/auth/applications/${applicationId}/callback/${provider}`;
}

function createEmailDeliveryView(
  profile: ApplicationAuthDeliveryProfile | null
): ApplicationAuthEmailDeliveryView {
  if (!profile) {
    return {
      configured: false,
      transportProfile: null,
      senderIdentity: null,
      emailVerificationTemplateId: null,
      passwordResetTemplateId: null,
      emailOtpSignInTemplateId: null,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    configured: true,
    transportProfile: profile.transportProfile,
    senderIdentity: profile.senderIdentity,
    emailVerificationTemplateId: profile.emailVerificationTemplateId,
    passwordResetTemplateId: profile.passwordResetTemplateId,
    emailOtpSignInTemplateId: profile.emailOtpSignInTemplateId,
    updatedAt: profile.updatedAt,
    updatedBy: profile.updatedBy,
  };
}

/** Application auth update payload resolver. */
interface ApplicationAuthUpdatePayloadValue {
  configuration: ApplicationAuthConfigurationResolver | null;
  userErrors: readonly unknown[];
}

export class ApplicationAuthUpdatePayloadResolver extends IAMType<ApplicationAuthUpdatePayloadValue> {
  configuration() {
    return this.$props.configuration;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application auth method payload resolver. */
interface ApplicationAuthMethodPayloadValue {
  authMethod: ApplicationAuthMethodResolver | null;
  userErrors: readonly unknown[];
}

export class ApplicationAuthMethodPayloadResolver extends IAMType<ApplicationAuthMethodPayloadValue> {
  authMethod() {
    return this.$props.authMethod;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}
