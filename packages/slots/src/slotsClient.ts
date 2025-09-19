import { got, type Got } from "got";
import type { ResolvedSlot, Slot, SlotAssignment } from "./types";

/**
 * Configuration for SlotsClient.
 */
export interface SlotsClientConfig {
  /** Base URL of the applications service. */
  baseUrl: string;
}

/**
 * Context passed for each request.
 */
export interface RequestContext {
  /** Headers for correlation. */
}

/**
 * HTTP client for interacting with the slots API.
 */
export class SlotsClient {
  private readonly httpClient: Got;

  /**
   * @param config - Client configuration.
   */
  constructor(config: SlotsClientConfig) {
    this.httpClient = got.extend({
      prefixUrl: config.baseUrl.replace(/\/+$/, ""),
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      responseType: "json",
      timeout: { request: 10000 },
      retry: { limit: 2, methods: ["GET"] },
    });
  }

  private createRequestHeaders(
    context: RequestContext
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    if (context.correlation) {
      if (context.correlation.traceId)
        headers["x-trace-id"] = context.correlation.traceId;
      if (context.correlation.spanId)
        headers["x-span-id"] = context.correlation.spanId;
      if (context.correlation.correlationId)
        headers["x-correlation-id"] = context.correlation.correlationId;
      if (context.correlation.causationId)
        headers["x-causation-id"] = context.correlation.causationId;
    }
    return headers;
  }

  // =================================================================
  // Slot (Catalog) Methods
  // =================================================================

  async createSlot(
    params: {
      projectId: string;
      domain: string;
      provider: string;
      capabilities?: string[];
      data?: Record<string, unknown>;
      status?: "active" | "inactive" | "maintenance" | "deprecated";
    },
    context: RequestContext
  ): Promise<Slot> {
    const response = await this.httpClient.post("api/slots", {
      json: params,
      headers: this.createRequestHeaders(context),
    });
    return response.body as unknown as Slot;
  }

  async listSlots(
    params: { projectId: string; domain?: string },
    context: RequestContext
  ): Promise<Slot[]> {
    const response = await this.httpClient.get("api/slots", {
      searchParams: params,
      headers: this.createRequestHeaders(context),
    });
    return response.body as unknown as Slot[];
  }

  async getSlot(
    params: { projectId: string; slotId: string },
    context: RequestContext
  ): Promise<Slot> {
    const response = await this.httpClient.get(`api/slots/${params.slotId}`, {
      searchParams: { projectId: params.projectId },
      headers: this.createRequestHeaders(context),
    });
    return response.body as unknown as Slot;
  }

  async updateSlot(
    params: {
      projectId: string;
      slotId: string;
      capabilities?: string[];
      data?: Record<string, unknown>;
      status?: "active" | "inactive" | "maintenance" | "deprecated";
    },
    context: RequestContext
  ): Promise<Slot> {
    const { slotId, projectId, ...updateData } = params;
    const response = await this.httpClient.put(`api/slots/${slotId}`, {
      json: { projectId, ...updateData },
      headers: this.createRequestHeaders(context),
    });
    return response.body as unknown as Slot;
  }

  async deleteSlot(
    params: { projectId: string; slotId: string },
    context: RequestContext
  ): Promise<void> {
    await this.httpClient.delete(`api/slots/${params.slotId}`, {
      searchParams: { projectId: params.projectId },
      headers: this.createRequestHeaders(context),
    });
  }

  // =================================================================
  // Slot Assignment Methods
  // =================================================================

  async createAssignment(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      slotId: string;
      domain: string;
      precedence?: number;
    },
    context: RequestContext
  ): Promise<SlotAssignment> {
    const { aggregate, aggregateId, ...body } = params;
    const response = await this.httpClient.post(
      `api/aggregates/${aggregate}/${aggregateId}/assignments`,
      {
        json: body,
        headers: this.createRequestHeaders(context),
      }
    );
    return response.body as unknown as SlotAssignment;
  }

  async listAssignments(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      domain: string;
      includeDisabled?: boolean;
    },
    context: RequestContext
  ): Promise<Array<{ slot: Slot; assignment: SlotAssignment }>> {
    const { aggregate, aggregateId, projectId, ...searchParams } = params;
    const response = await this.httpClient.get(
      `api/aggregates/${aggregate}/${aggregateId}/assignments`,
      {
        searchParams: {
          projectId,
          domain: searchParams.domain,
          ...(searchParams.includeDisabled && {
            includeDisabled: String(searchParams.includeDisabled),
          }),
        },
        headers: this.createRequestHeaders(context),
      }
    );
    return response.body as unknown as Array<{
      slot: Slot;
      assignment: SlotAssignment;
    }>;
  }

  async getAssignment(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      assignmentId: string;
    },
    context: RequestContext
  ): Promise<SlotAssignment> {
    const { aggregate, aggregateId, assignmentId, projectId } = params;
    const response = await this.httpClient.get(
      `api/aggregates/${aggregate}/${aggregateId}/assignments/${assignmentId}`,
      {
        searchParams: { projectId },
        headers: this.createRequestHeaders(context),
      }
    );
    return response.body as unknown as SlotAssignment;
  }

  async updateAssignment(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      assignmentId: string;
      precedence?: number;
      status?: "active" | "disabled";
    },
    context: RequestContext
  ): Promise<SlotAssignment> {
    const { aggregate, aggregateId, assignmentId, ...body } = params;
    const response = await this.httpClient.put(
      `api/aggregates/${aggregate}/${aggregateId}/assignments/${assignmentId}`,
      {
        json: body,
        headers: this.createRequestHeaders(context),
      }
    );
    return response.body as unknown as SlotAssignment;
  }

  async deleteAssignment(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      assignmentId: string;
    },
    context: RequestContext
  ): Promise<void> {
    const { aggregate, aggregateId, assignmentId, projectId } = params;
    await this.httpClient.delete(
      `api/aggregates/${aggregate}/${aggregateId}/assignments/${assignmentId}`,
      {
        searchParams: { projectId },
        headers: this.createRequestHeaders(context),
      }
    );
  }

  // =================================================================
  // Slot Resolution Methods
  // =================================================================

  async resolveSlot(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      domain: string;
    },
    context: RequestContext
  ): Promise<ResolvedSlot | null> {
    const { aggregate, aggregateId, domain, projectId } = params;
    try {
      const response = await this.httpClient.get(
        `api/aggregates/${aggregate}/${aggregateId}/slots:resolve`,
        {
          searchParams: { domain, projectId },
          headers: this.createRequestHeaders(context),
        }
      );
      return response.body as unknown as ResolvedSlot;
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async resolveAllSlots(
    params: {
      projectId: string;
      aggregate: string;
      aggregateId: string;
      domain: string;
    },
    context: RequestContext
  ): Promise<ResolvedSlot[]> {
    const { aggregate, aggregateId, domain, projectId } = params;
    const response = await this.httpClient.get(
      `api/aggregates/${aggregate}/${aggregateId}/slots:resolve-all`,
      {
        searchParams: { domain, projectId },
        headers: this.createRequestHeaders(context),
      }
    );
    return response.body as unknown as ResolvedSlot[];
  }
}
