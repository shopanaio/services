import { BaseScript } from "../../kernel/BaseScript.js";
import type { CustomerSegmentsUpdateOperation } from "../../workflows/dto/index.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type CustomerSectionResult,
} from "./types.js";

export interface CustomerSegmentsUpdateParams {
  customerId: string;
  operations: CustomerSegmentsUpdateOperation["params"];
}

export class CustomerSegmentsUpdateScript extends BaseScript<
  CustomerSegmentsUpdateParams,
  CustomerSectionResult
> {
  protected async execute(params: CustomerSegmentsUpdateParams): Promise<CustomerSectionResult> {
    const segments = await this.repository.segment.getByIds(params.operations.segmentIds);
    const byId = new Map(segments.map((segment) => [segment.id, segment]));
    const seen = new Set<string>();
    const errors: Array<{ message: string; code: string; field: string[] }> = [];

    for (const [index, segmentId] of params.operations.segmentIds.entries()) {
      const segment = byId.get(segmentId);
      if (!segment) {
        errors.push({
          message: "Customer segment not found",
          code: "NOT_FOUND",
          field: ["segmentIds", String(index)],
        });
      } else if (segment.type !== "MANUAL") {
        errors.push({
          message: "Only manual segments can be assigned explicitly",
          code: "SEGMENT_NOT_MANUAL",
          field: ["segmentIds", String(index)],
        });
      }
      if (seen.has(segmentId)) {
        errors.push({
          message: "Customer segment cannot appear more than once",
          code: "DUPLICATE_ID",
          field: ["segmentIds", String(index)],
        });
      }
      seen.add(segmentId);
    }
    if (errors.length > 0) return sectionErrors(errors);

    await this.repository.segment.replaceManualMembershipsForCustomer(
      params.customerId,
      params.operations.segmentIds,
    );
    return sectionSuccess();
  }

  protected handleError(_error: unknown): CustomerSectionResult {
    return internalSectionError();
  }
}
