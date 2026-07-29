import type { BrokerAdminContext } from "./WorkflowAuthorization.js";

export interface BrokerCaller {
  readonly kind: "action" | "event";
  readonly service: string;
}

export interface BrokerAppContext {
  readonly appCode: string;
  readonly installationId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly appVersion: string;
  readonly grantedScopes: readonly string[];
  readonly executionKind?: "STANDARD" | "COMMERCE_FUNCTION";
  readonly operationId?: string;
  readonly actor?: {
    readonly type: "USER" | "APP" | "SERVICE" | "SYSTEM";
    readonly id?: string;
  };
  readonly correlationId?: string;
}

export interface BrokerCallContext {
  readonly caller: BrokerCaller;
  readonly app?: Readonly<BrokerAppContext>;
  readonly adminContext?: BrokerAdminContext;
}

export interface BrokerCallOptions {
  readonly meta?: Record<string, unknown>;
  readonly adminContext?: BrokerAdminContext;
}
