import type {
  HeadlessStorefrontConnectionModel,
  StorefrontCredentialModel,
} from "./models/index.js";

export interface HeadlessStorefrontScope {
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
}

export type HeadlessStorefrontConnectionRecord =
  Readonly<HeadlessStorefrontConnectionModel>;

export interface StorefrontAccessPolicyRecord {
  readonly connectionId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly revision: number;
  readonly permissions: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type StorefrontCredentialRecord =
  Readonly<StorefrontCredentialModel>;

export interface StorefrontCredentialResolutionRecord
  extends StorefrontCredentialRecord {
  readonly installationId: string;
  readonly connectionStatus:
    HeadlessStorefrontConnectionModel["status"];
}
