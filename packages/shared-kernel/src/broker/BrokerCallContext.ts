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
  readonly operationId?: string;
  readonly actor?: {
    readonly type: "USER" | "SERVICE" | "SYSTEM";
    readonly id?: string;
  };
  readonly correlationId?: string;
}

export interface BrokerCallContext {
  readonly caller: BrokerCaller;
  readonly app?: Readonly<BrokerAppContext>;
}
