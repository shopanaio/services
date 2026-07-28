import type { SmtpConnectionModel } from "./models/index.js";

export interface SmtpConnectionScope {
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
}

export type SmtpConnectionRecord = Readonly<
  Omit<SmtpConnectionModel, "passwordEnvelope"> & {
    readonly hasPassword: boolean;
  }
>;

export type SmtpConnectionSecretRecord = Readonly<SmtpConnectionModel>;
