import { SDK } from "casdoor-nodejs-sdk";
import type { AxiosRequestConfig } from "axios";
import { CasdoorHttpClient } from "./http/httpClient.js";
import type { CasdoorNodeClientConfig } from "./types/config.js";
import { AuthModule } from "./modules/auth.js";
import { VerificationModule } from "./modules/verification.js";
import { WebAuthnModule } from "./modules/webauthn.js";
import { FaceIdModule } from "./modules/faceid.js";
import { InvitationModule } from "./modules/invitation.js";

export class CasdoorNodeClient {
  public readonly sdk: SDK;
  public readonly http: CasdoorHttpClient;

  public readonly auth: AuthModule;
  public readonly verification: VerificationModule;
  public readonly webauthn: WebAuthnModule;
  public readonly faceid: FaceIdModule;
  public readonly invitation: InvitationModule;

  constructor(config: CasdoorNodeClientConfig, axiosConfig?: AxiosRequestConfig) {
    this.sdk = new SDK(config.sdkConfig, axiosConfig);
    this.http = new CasdoorHttpClient({
      casdoorBaseUrl: config.casdoorBaseUrl,
      defaultHeaders: config.defaultHeaders,
      cookie: config.cookie,
      axios: config.axios ?? axiosConfig,
      throwOnApiError: config.throwOnApiError,
    });

    this.auth = new AuthModule(this.http);
    this.verification = new VerificationModule(this.http);
    this.webauthn = new WebAuthnModule(this.http);
    this.faceid = new FaceIdModule(this.http);
    this.invitation = new InvitationModule(this.http);
  }
}

