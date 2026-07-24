import { BaseScript } from "../../kernel/BaseScript.js";

export type PrivacyCleanupParams = {
  operation: "purgeCustomer";
  customerId: string;
};

export class PrivacyCleanupScript extends BaseScript<
  PrivacyCleanupParams,
  { occurrencesPurged: number }
> {
  protected async execute(
    params: PrivacyCleanupParams
  ): Promise<{ occurrencesPurged: number }> {
    return {
      occurrencesPurged: await this.repository.privacy.purgeCustomer(
        params.customerId
      ),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}
