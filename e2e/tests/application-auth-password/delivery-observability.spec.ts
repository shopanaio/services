import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Application password auth — delivery and observability', [
  ['PWD-OBS-001', 'signin events have correct realm and outcome without raw credentials'],
  ['PWD-OBS-002', 'reset and verification events contain no recipient, link, token, or payload'],
  ['PWD-OBS-003', 'protocol failure events record only a safe reason category'],
  ['PWD-OBS-004', 'cross-tenant rejection emits a safe security signal'],
  ['PWD-OBS-005', 'rate-limit telemetry contains no raw identity or secret labels'],
  ['PWD-OBS-006', 'error responses contain no stack, SQL, hash, secret, or tenant configuration'],
  ['PWD-OBS-007', 'logs, traces, and metrics contain no password, code, token, cookie, link, or client secret'],
  ['PWD-OBS-008', 'verification and reset use distinct server-controlled purposes and templates'],
  ['PWD-OBS-009', 'delivery idempotency prevents uncontrolled duplicates without PII keys'],
  ['PWD-OBS-010', 'observability sink failure follows contract without exposing secrets'],
] as const);
