import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { CustomerSegment } from "../../repositories/models/index.js";
import {
  SegmentStoreContextNotReadyError,
  resolveSegmentStoreContext,
  validateCustomerSegmentQuery,
} from "../../segments/service.js";

export interface CustomerSegmentCreateParams {
  name: string;
  description?: string | null;
  color?: string | null;
  type: CustomerSegment["type"];
  status?: CustomerSegment["status"] | null;
  query?: string | null;
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
      let query: string | null = null;
      let definition: Record<string, unknown> = {};
      if (params.type === "DYNAMIC") {
        const storeContext = await resolveSegmentStoreContext(
          this.repository,
          this.context.store,
        );
        const validation = await validateCustomerSegmentQuery(
          this.repository,
          params.query!.trim(),
          storeContext,
          new Date().toISOString(),
        );
        if (!validation.valid || !validation.definition || !validation.canonicalQuery) {
          return {
            segment: undefined,
            userErrors: validation.diagnostics
              .filter((diagnostic) => diagnostic.severity === "ERROR")
              .map((diagnostic) => ({
                message: diagnostic.message,
                code: diagnostic.code,
                field: ["query"],
                diagnostic,
              })),
          };
        }
        query = validation.canonicalQuery;
        definition = validation.definition as unknown as Record<string, unknown>;
      }
      const segment = await this.repository.segment.create({
        ...params,
        name: params.name.trim(),
        status: params.status ?? undefined,
        query,
        definition,
      });
      await this.repository.segmentMaterialization.schedule(
        segment,
        new Date().toISOString(),
      );
      this.logger.info({ segmentId: segment.id }, "Customer segment created");
      return {
        segment: { id: segment.id, revision: segment.revision },
        userErrors: [],
      };
    } catch (error) {
      if (error instanceof SegmentStoreContextNotReadyError) {
        return {
          segment: undefined,
          userErrors: [{
            message: error.message,
            code: error.code,
            field: ["query"],
            diagnostic: null,
          }],
        };
      }
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
  if (params.type === "DYNAMIC" && !hasQuery) {
    errors.push({
      message: "A dynamic segment requires a non-empty query",
      code: "SEGMENT_QUERY_REQUIRED",
      field: ["query"],
    });
  }
  if (params.type === "MANUAL" && params.query != null) {
    errors.push({
      message: "A manual segment cannot have a query",
      code: "SEGMENT_QUERY_NOT_ALLOWED",
      field: ["query"],
    });
  }
  return errors;
}
