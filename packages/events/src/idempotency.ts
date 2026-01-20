import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

const sha256 = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

export function canonicalJson(value: unknown): string {
  const result = canonicalize(value);
  if (result === undefined) {
    throw new Error("Cannot canonicalize value: contains unsupported types");
  }
  return result;
}

export function makeDispatchWorkflowId(params: {
  parentWorkflowId: string;
  eventType: string;
  emitKey: string;
}): string {
  const emitKeyHash = sha256(`emitKey:v1:${params.emitKey}`).slice(0, 32);
  return `${params.parentWorkflowId}:dispatch:v1:${params.eventType}:${emitKeyHash}`;
}

export function makeEventId(params: {
  tenantId: string;
  dispatchWorkflowId: string;
}): string {
  return sha256(`eventId:v1:${params.tenantId}:${params.dispatchWorkflowId}`).slice(0, 32);
}

export function makeDeterministicCorrelationId(parentWorkflowId: string): string {
  const hash = sha256(`correlationId:v1:${parentWorkflowId}`);
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
