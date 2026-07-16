import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerSegment } from "../../repositories/models/index.js";

export interface CustomerSegmentCreateParams {
  name: string;
  description?: string | null;
  color?: string | null;
  type: CustomerSegment["type"];
  status?: CustomerSegment["status"] | null;
  query?: string | null;
  definition?: Record<string, unknown> | null;
  createdById?: string | null;
}

export interface CustomerSegmentCreateResult {
  segment?: { id: string; revision: number };
  userErrors: UserError[];
}

export class CustomerSegmentCreateScript extends BaseScript<
  CustomerSegmentCreateParams,
  CustomerSegmentCreateResult
> {
  @Transactional()
  protected async execute(
    params: CustomerSegmentCreateParams
  ): Promise<CustomerSegmentCreateResult> {
    const errors = validateSegment(params);
    if (errors.length > 0) {
      return { segment: undefined, userErrors: errors };
    }

    try {
      const segment = await this.repository.segment.create({
        ...params,
        name: params.name.trim(),
        status: params.status ?? undefined,
        query: params.query?.trim() || null,
        definition: params.definition ?? undefined,
      });
      this.logger.info({ segmentId: segment.id }, "Customer segment created");
      return {
        segment: { id: segment.id, revision: segment.revision },
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "customer_segment_store_name_unique")) {
        return {
          segment: undefined,
          userErrors: [
            {
              message: "A customer segment with this name already exists",
              code: "DUPLICATE_SEGMENT_NAME",
              field: ["name"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(_error: unknown): CustomerSegmentCreateResult {
    return {
      segment: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}

function validateSegment(params: CustomerSegmentCreateParams): UserError[] {
  const errors: UserError[] = [];
  if (params.name.trim().length === 0) {
    errors.push({
      message: "Segment name cannot be empty",
      code: "INVALID_NAME",
      field: ["name"],
    });
  }
  if (params.color != null && !/^#[0-9A-Fa-f]{6}$/.test(params.color)) {
    errors.push({
      message: "Segment color must use #RRGGBB format",
      code: "INVALID_COLOR",
      field: ["color"],
    });
  }
  const hasQuery = Boolean(params.query?.trim());
  const hasDefinition =
    params.definition != null && Object.keys(params.definition).length > 0;
  if (params.type === "DYNAMIC" && !hasQuery && !hasDefinition) {
    errors.push({
      message: "A dynamic segment requires a query or definition",
      code: "MISSING_SEGMENT_DEFINITION",
      field: ["definition"],
    });
  }
  return errors;
}
