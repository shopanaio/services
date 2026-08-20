import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  CustomerExternalReferenceDeleteParams,
  CustomerExternalReferenceDeleteResult,
} from "./types.js";

export class CustomerExternalReferenceDeleteScript extends BaseScript<
  CustomerExternalReferenceDeleteParams,
  CustomerExternalReferenceDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerExternalReferenceDeleteParams,
  ): Promise<CustomerExternalReferenceDeleteResult> {
    const byId = params.referenceId?.trim();
    const externalSystem = params.externalSystem?.trim();
    const externalType = params.externalType?.trim() || "customer";
    const externalId = params.externalId?.trim();

    if (!byId && (!externalSystem || !externalId)) {
      return {
        userErrors: [
          {
            message: "Reference ID or complete external key is required",
            code: "INVALID_EXTERNAL_REFERENCE",
            field: ["externalId"],
          },
        ],
      };
    }

    const reference = byId
      ? await this.repository.externalReference.findById(byId)
      : await this.repository.externalReference.findByExternalKey({
          externalSystem: externalSystem!,
          externalType,
          externalId: externalId!,
        });

    if (!reference) {
      return params.ignoreMissing
        ? { userErrors: [] }
        : {
            userErrors: [
              {
                message: "Customer external reference was not found",
                code: "CUSTOMER_EXTERNAL_REFERENCE_NOT_FOUND",
                field: byId ? ["referenceId"] : ["externalId"],
              },
            ],
          };
    }

    if (!(await this.repository.externalReference.softDelete(reference.id))) {
      return params.ignoreMissing
        ? { userErrors: [] }
        : {
            userErrors: [
              {
                message: "Customer external reference was not found",
                code: "CUSTOMER_EXTERNAL_REFERENCE_NOT_FOUND",
              },
            ],
          };
    }

    this.logger.info(
      {
        externalReferenceId: reference.id,
        customerId: reference.customerId,
      },
      "Customer external reference deleted",
    );
    return { deletedExternalReference: reference, userErrors: [] };
  }

  protected handleError(): CustomerExternalReferenceDeleteResult {
    return {
      userErrors: [
        {
          message: "Customer external reference could not be deleted",
          code: "INTERNAL_ERROR",
        },
      ],
    };
  }
}
