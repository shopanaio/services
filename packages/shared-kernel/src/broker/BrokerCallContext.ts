export interface BrokerCaller {
  readonly kind: "action" | "event";
  readonly service: string;
}

export interface BrokerCallContext {
  readonly caller: BrokerCaller;
}
