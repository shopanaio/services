import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type {
  CustomerExternalReferenceUpsertParams,
  CustomerExternalReferenceUpsertResult,
} from "./types.js";

export class CustomerExternalReferenceUpsertScript extends BaseScript<
  CustomerExternalReferenceUpsertParams,
  CustomerExternalReferenceUpsertResult
> {
  @Transactional()
  protected async execute(
    params: CustomerExternalReferenceUpsertParams,
  ): Promise<CustomerExternalReferenceUpsertResult> {
    const externalSystem = params.externalSystem.trim();
    const externalType = params.externalType?.trim() || "customer";
    const externalId = params.externalId.trim();
    const metadata = params.metadata ?? {};

    if (!externalSystem) {
      return invalid("External system cannot be empty", "externalSystem");
    }
    if (!externalType) {
      return invalid("External type cannot be empty", "externalType");
    }
    if (!externalId) {
      return invalid("External ID cannot be empty", "externalId");
    }
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
      return invalid("Metadata must be an object", "metadata");
    }
    if (!(await this.repository.customer.findById(params.customerId))) {
      return {
        userErrors: [
          {
            message: "Customer was not found",
            code: "CUSTOMER_NOT_FOUND",
            field: ["customerId"],
          },
        ],
      };
    }

    const currentByExternalKey = await this.repository.externalReference.findByExternalKey({
      externalSystem,
      externalType,
      externalId,
    });
    const currentForCustomer = await this.repository.externalReference.findByCustomerAndSystem({
      customerId: params.customerId,
      externalSystem,
      externalType,
    });

    if (
      currentByExternalKey &&
      currentByExternalKey.customerId !== params.customerId &&
      (params.conflictPolicy ?? "REJECT") !== "REASSIGN"
    ) {
      return {
        userErrors: [
          {
            message: "External reference is already assigned to another customer",
            code: "EXTERNAL_REFERENCE_CONFLICT",
            field: ["externalId"],
          },
        ],
      };
    }

    if (currentForCustomer && currentForCustomer.id !== currentByExternalKey?.id) {
      return {
        userErrors: [
          {
            message: "Customer already has another reference for this external system and type",
            code: "CUSTOMER_EXTERNAL_REFERENCE_CONFLICT",
            field: ["customerId"],
          },
        ],
      };
    }

    try {
      const externalReference = await this.repository.externalReference.upsert(
        {
          customerId: params.customerId,
          externalSystem,
          externalType,
          externalId,
          metadata,
        },
        {
          existingReferenceId: currentByExternalKey?.id,
        },
      );
      if (!externalReference) {
        return {
          userErrors: [
            {
              message: "External reference was not found during synchronization",
              code: "EXTERNAL_REFERENCE_NOT_FOUND",
              field: ["externalId"],
            },
          ],
        };
      }
      const previousCustomerId =
        currentByExternalKey?.customerId !== params.customerId
          ? currentByExternalKey?.customerId
          : undefined;
      const outcome = !currentByExternalKey
        ? "CREATED"
        : previousCustomerId
          ? "REASSIGNED"
          : "UPDATED";

      this.logger.info(
        {
          externalReferenceId: externalReference.id,
          customerId: params.customerId,
          previousCustomerId,
          outcome,
        },
        "Customer external reference upserted",
      );

      return {
        externalReference,
        outcome,
        previousCustomerId,
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_external_reference_lookup_unique")) {
        return {
          userErrors: [
            {
              message: "External reference was concurrently assigned to another customer",
              code: "EXTERNAL_REFERENCE_CONFLICT",
              field: ["externalId"],
            },
          ],
        };
      }
      if (isUniqueViolation(error, "customer_external_reference_customer_unique")) {
        return {
          userErrors: [
            {
              message: "Customer already has another reference for this external system and type",
              code: "CUSTOMER_EXTERNAL_REFERENCE_CONFLICT",
              field: ["customerId"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): CustomerExternalReferenceUpsertResult {
    return {
      userErrors: [
        {
          message: "Customer external reference could not be saved",
          code: "INTERNAL_ERROR",
        },
      ],
    };
  }
}

function invalid(message: string, field: string): CustomerExternalReferenceUpsertResult {
  return {
    userErrors: [
      {
        message,
        code: "INVALID_EXTERNAL_REFERENCE",
        field: [field],
      },
    ],
  };
}
