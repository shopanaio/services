import { DeliveryShipmentTransitions, type Delivery } from "@shopana/broker-types";
import type { DeliveryShipmentTransitionPolicyPort } from "../contracts/ports.js";

export class DeliveryShipmentTransitionPolicy implements DeliveryShipmentTransitionPolicyPort {
  evaluate(input: Parameters<DeliveryShipmentTransitionPolicyPort["evaluate"]>[0]): ReturnType<DeliveryShipmentTransitionPolicyPort["evaluate"]> {
    const last = input.current.lastProviderShipmentSequence;
    if (last !== null && input.providerShipmentSequence !== null && BigInt(input.providerShipmentSequence) <= BigInt(last)) {
      return { status: "IGNORE_STALE", currentState: input.current.state };
    }
    if (input.providerShipmentSequence === null && input.current.lastTrackingEvent && Date.parse(input.occurredAt) <= Date.parse(input.current.lastTrackingEvent.occurredAt)) {
      return { status: "IGNORE_STALE", currentState: input.current.state };
    }
    if (input.current.state === input.observedState) {
      return { status: "APPLY", nextState: input.current.state };
    }
    if (!isReachable(input.current.state, input.observedState)) {
      return { status: "REJECT_INVALID", currentState: input.current.state, code: "DELIVERY_SHIPMENT_TRANSITION_INVALID" };
    }
    return { status: "APPLY", nextState: input.observedState };
  }
}

function isReachable(from: Delivery.DeliveryShipmentState, target: Delivery.DeliveryShipmentState): boolean {
  const pending: Delivery.DeliveryShipmentState[] = [from];
  const visited = new Set<Delivery.DeliveryShipmentState>();
  while (pending.length > 0) {
    const state = pending.shift()!;
    if (state === target) return true;
    if (visited.has(state)) continue;
    visited.add(state);
    pending.push(...DeliveryShipmentTransitions[state]);
  }
  return false;
}
