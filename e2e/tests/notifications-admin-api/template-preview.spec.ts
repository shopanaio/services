import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Notifications Admin API - template preview', [
  ['NTF-PREV-001', 'preview renders the effective template with valid definition data'],
  ['NTF-PREV-002', 'preview can render supplied draft sources without persisting a revision'],
  ['NTF-PREV-003', 'preview without draft sources uses the current effective template'],
  ['NTF-PREV-004', 'preview resolves the requested locale and returns the effective locale used'],
  ['NTF-PREV-005', 'email preview returns subject, escaped HTML, and plain text'],
  ['NTF-PREV-006', 'SMS preview returns text plus encoding, character length, and segment count'],
  ['NTF-PREV-007', 'GSM-compatible SMS reports the expected encoding and segment boundaries'],
  ['NTF-PREV-008', 'Unicode SMS reports the expected encoding and segment boundaries'],
  ['NTF-PREV-009', 'missing required data returns userErrors instead of partially rendered output'],
  ['NTF-PREV-010', 'unknown variables and malformed draft syntax map to source fields'],
  ['NTF-PREV-011', 'user-controlled values are escaped in HTML and cannot inject executable markup'],
  ['NTF-PREV-012', 'preview warnings are deterministic and do not include hidden template or recipient secrets'],
  ['NTF-PREV-013', 'preview creates no delivery, workflow, template revision, or audit mutation record'],
  ['NTF-PREV-014', 'preview in Store A cannot read Store B template override'],
] as const);
