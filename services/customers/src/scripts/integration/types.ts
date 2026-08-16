import type {
  CustomerExternalReferenceConflictPolicy,
  CustomerExternalReferenceUpsertOutcome,
} from "@shopana/broker-types";
import type { UserError } from "../../kernel/BaseScript.js";
import type { CustomerExternalReference } from "../../repositories/models/index.js";

export interface CustomerExternalReferenceUpsertParams {
  customerId: string;
  externalSystem: string;
  externalType?: string;
  externalId: string;
  metadata?: Record<string, unknown>;
  conflictPolicy?: CustomerExternalReferenceConflictPolicy;
}

export interface CustomerExternalReferenceUpsertResult {
  externalReference?: CustomerExternalReference;
  outcome?: CustomerExternalReferenceUpsertOutcome;
  previousCustomerId?: string;
  userErrors: UserError[];
}

export interface CustomerExternalReferenceDeleteParams {
  referenceId?: string;
  externalSystem?: string;
  externalType?: string;
  externalId?: string;
  ignoreMissing?: boolean;
}

export interface CustomerExternalReferenceDeleteResult {
  deletedExternalReference?: CustomerExternalReference;
  userErrors: UserError[];
}
