import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerAddressDeleteParams {
  id: string;
}

export interface CustomerAddressDeleteResult {
  deletedAddressId?: string;
  customerId?: string;
  userErrors: UserError[];
}

export class CustomerAddressDeleteScript extends BaseScript<
  CustomerAddressDeleteParams,
  CustomerAddressDeleteResult
> {
  @Transactional()
  protected async execute(
    params: CustomerAddressDeleteParams
  ): Promise<CustomerAddressDeleteResult> {
    const address = await this.repository.address.findById(params.id);
    if (!address) {
      return notFound();
    }

    const deleted = await this.repository.address.softDelete(params.id);
    if (!deleted) {
      return notFound();
    }

    this.logger.info(
      { addressId: params.id, customerId: address.customerId },
      "Customer address deleted"
    );
    return {
      deletedAddressId: params.id,
      customerId: address.customerId,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CustomerAddressDeleteResult {
    return {
      deletedAddressId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function notFound(): CustomerAddressDeleteResult {
  return {
    deletedAddressId: undefined,
    userErrors: [
      { message: "Customer address not found", field: ["id"], code: "NOT_FOUND" },
    ],
  };
}
