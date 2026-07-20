import { AsyncLocalStorage } from "node:async_hooks";

export interface BrokerCaller {
  readonly kind: "action" | "event";
  readonly service: string;
}

export interface BrokerCallContext {
  readonly caller: BrokerCaller;
}

const brokerCallContextStorage = new AsyncLocalStorage<BrokerCallContext>();

export function getBrokerCallContext(): BrokerCallContext | undefined {
  return brokerCallContextStorage.getStore();
}

export function runWithBrokerCallContext<TResult>(
  context: BrokerCallContext,
  callback: () => Promise<TResult> | TResult
): Promise<TResult> | TResult {
  return brokerCallContextStorage.run(context, callback);
}
