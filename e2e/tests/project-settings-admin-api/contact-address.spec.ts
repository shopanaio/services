import { definePendingContractSuite } from './contract-case';

definePendingContractSuite('Project Settings Admin API - contact details and address', [
  ['PRJ-CONTACT-001', 'contact update changes display name, slug, email, and ordered phone numbers atomically'],
  ['PRJ-CONTACT-002', 'contact display name is trimmed and constrained to the supported length'],
  ['PRJ-CONTACT-003', 'contact slug follows the same canonical URL-safe validation as store create'],
  ['PRJ-CONTACT-004', 'slug collision returns DUPLICATE_VALUE without changing contact fields'],
  ['PRJ-CONTACT-005', 'nullable email clears the stored contact email'],
  ['PRJ-CONTACT-006', 'invalid email maps to operations.contactDetails.email'],
  ['PRJ-CONTACT-007', 'phone numbers require unique E.164 values'],
  ['PRJ-CONTACT-008', 'phone list rejects duplicates and more than the supported maximum'],
  ['PRJ-CONTACT-009', 'phone replacement preserves submitted order and removes omitted numbers'],
  ['PRJ-CONTACT-010', 'failed contact update preserves both store profile and previous phone rows'],
  ['PRJ-ADDR-001', 'address update creates the first current-store address row'],
  ['PRJ-ADDR-002', 'subsequent address update replaces every address field deterministically'],
  ['PRJ-ADDR-003', 'countryCode requires an uppercase two-letter ISO-shaped code'],
  ['PRJ-ADDR-004', 'nullable optional address fields can be cleared explicitly'],
  ['PRJ-ADDR-005', 'blank non-null optional address strings are rejected after trimming'],
  ['PRJ-ADDR-006', 'address field length violations map to the exact nested input path'],
  ['PRJ-ADDR-007', 'address update never modifies contact, brand, order, default, or currency settings'],
  ['PRJ-ADDR-008', 'contact and address settings are isolated between stores sharing one organization'],
] as const);
