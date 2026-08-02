import { canonicalJson } from "../pipeline/canonicalJson.js";
import type {
  CheckoutPipelineChange,
  CheckoutRecalculationResult,
} from "../pipeline/contracts/index.js";
import type { CheckoutPipeline } from "../pipeline/CheckoutPipeline.js";
import {
  CheckoutPipelineBoundaryError,
  parseCheckoutRecalculationResult,
} from "../pipeline/boundaries.js";
import { CheckoutRecalculationRequestFactory } from "./CheckoutRecalculationRequestFactory.js";
import {
  CheckoutMutationError,
  assertCompletePipelineResult,
  type CheckoutCommittedSnapshot,
  type CheckoutCreateIdempotencyPort,
  type CheckoutCreateIdempotencyRequest,
  type CheckoutCreateIdempotencyReservation,
  type CheckoutMutationDraft,
  type CheckoutMutationExecutionContext,
  type CheckoutMutationSnapshotPort,
  type CheckoutRecalculationCommitPort,
} from "./contracts.js";

export interface CheckoutMutationCommit<T> {
  checkout: CheckoutCommittedSnapshot;
  value: T;
}

export class CheckoutMutationCoordinator {
  constructor(
    private readonly dependencies: {
      snapshots: CheckoutMutationSnapshotPort;
      commits: CheckoutRecalculationCommitPort;
      requests: CheckoutRecalculationRequestFactory;
      pipeline: CheckoutPipeline;
      idempotency: CheckoutCreateIdempotencyPort;
    },
  ) {}

  async create<T>(input: {
    reservation: CheckoutCreateIdempotencyRequest;
    context: CheckoutMutationExecutionContext;
    createDraft(reservation: CheckoutCreateIdempotencyReservation): CheckoutMutationDraft;
    value: T;
  }): Promise<CheckoutMutationCommit<T>> {
    const reserved = await this.dependencies.idempotency.reserve(input.reservation);
    if (reserved.status === "COMMITTED") {
      return { checkout: reserved.checkout, value: input.value };
    }
    if (reserved.status === "KEY_REUSED") {
      throw new CheckoutMutationError(
        "CHECKOUT_IDEMPOTENCY_KEY_REUSED",
        "The checkout idempotency key was already used for different input.",
        false,
      );
    }
    if (reserved.status === "IN_PROGRESS") {
      throw new CheckoutMutationError(
        "CHECKOUT_CREATE_IN_PROGRESS",
        "Checkout creation is already in progress.",
        true,
      );
    }
    if (reserved.status === "FINAL_FAILED") {
      throw new CheckoutMutationError(
        reserved.failure.code,
        reserved.failure.message,
        reserved.failure.retryable,
      );
    }
    const reservation = reserved.reservation;
    try {
      const draft = input.createDraft(reservation);
      this.assertDraft(draft, 0, {
        checkoutId: reservation.checkoutId,
        storeId: reservation.identity.storeId,
      });
      const result = await this.recalculate(draft, "CREATE", input.context);
      const committed = await this.commitSafely(() =>
        this.dependencies.commits.create({
          reservation,
          draft: { ...draft, version: 1 },
          result,
        }),
      );
      if (committed.status === "VERSION_CONFLICT") {
        throw new CheckoutMutationError(
          "CHECKOUT_COMMIT_FAILED",
          "Checkout could not be created.",
          true,
        );
      }
      return { checkout: committed.checkout, value: input.value };
    } catch (cause) {
      const publicError = cause instanceof CheckoutMutationError
        ? cause
        : cause instanceof CheckoutPipelineBoundaryError
          ? new CheckoutMutationError(
              "CHECKOUT_DRAFT_INVALID",
              "Checkout input could not produce a valid recalculation request.",
              false,
              { cause },
            )
        : new CheckoutMutationError(
            "CHECKOUT_PIPELINE_FAILED",
            "Checkout could not be recalculated.",
            true,
            { cause },
          );
      const failure = {
        code: publicError.code,
        message: publicError.message,
        retryable: publicError.retryable,
      };
      try {
        await this.dependencies.idempotency.markFailed({
          reservation,
          failure,
          final: !failure.retryable,
        });
      } catch (markFailureCause) {
        throw new CheckoutMutationError(
          "CHECKOUT_COMMIT_FAILED",
          "Checkout create failure state could not be committed.",
          true,
          { cause: markFailureCause },
        );
      }
      throw publicError;
    }
  }

  async execute<T>(input: {
    checkoutId: string;
    storeId: string;
    change: CheckoutPipelineChange;
    context: CheckoutMutationExecutionContext;
    apply(draft: CheckoutMutationDraft, current: CheckoutCommittedSnapshot): T;
  }): Promise<CheckoutMutationCommit<T>> {
    const current = await this.load(input.checkoutId, input.storeId);
    const draft = structuredClone(current.draft);
    const value = input.apply(draft, current);
    this.assertDraft(draft, current.version, input);
    if (canonicalJson(draft) === canonicalJson(current.draft)) {
      return { checkout: current, value };
    }
    const result = await this.recalculate(draft, input.change, input.context);
    const committed = await this.commitSafely(() =>
      this.dependencies.commits.commit({
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        expectedVersion: current.version,
        nextVersion: current.version + 1,
        createdAt: current.createdAt,
        draft: { ...draft, version: current.version + 1 },
        result,
      }),
    );
    if (committed.status === "VERSION_CONFLICT") {
      throw new CheckoutMutationError(
        "CHECKOUT_VERSION_CONFLICT",
        "Checkout changed while it was being recalculated. Retry the mutation.",
        true,
      );
    }
    return { checkout: committed.checkout, value };
  }

  async executeWithoutRecalculation<T>(input: {
    checkoutId: string;
    storeId: string;
    context: CheckoutMutationExecutionContext;
    apply(draft: CheckoutMutationDraft, current: CheckoutCommittedSnapshot): T;
  }): Promise<CheckoutMutationCommit<T>> {
    const current = await this.load(input.checkoutId, input.storeId);
    const draft = structuredClone(current.draft);
    const value = input.apply(draft, current);
    this.assertDraft(draft, current.version, input);
    if (canonicalJson(draft) === canonicalJson(current.draft)) {
      return { checkout: current, value };
    }
    const committed = await this.commitSafely(() =>
      this.dependencies.commits.commitWithoutRecalculation({
        storeId: input.storeId,
        checkoutId: input.checkoutId,
        expectedVersion: current.version,
        nextVersion: current.version + 1,
        createdAt: current.createdAt,
        draft: { ...draft, version: current.version + 1 },
        previousResult: current.result,
      }),
    );
    if (committed.status === "VERSION_CONFLICT") {
      throw new CheckoutMutationError(
        "CHECKOUT_VERSION_CONFLICT",
        "Checkout changed while the mutation was being committed. Retry the mutation.",
        true,
      );
    }
    return { checkout: committed.checkout, value };
  }

  private async load(
    checkoutId: string,
    storeId: string,
  ): Promise<CheckoutCommittedSnapshot> {
    const current = await this.dependencies.snapshots.load({ checkoutId, storeId });
    if (!current) {
      throw new CheckoutMutationError(
        "CHECKOUT_NOT_FOUND",
        "Checkout was not found.",
        false,
      );
    }
    return current;
  }

  private async recalculate(
    draft: CheckoutMutationDraft,
    change: CheckoutPipelineChange,
    context: CheckoutMutationExecutionContext,
  ): Promise<CheckoutRecalculationResult> {
    try {
      const request = await this.dependencies.requests.create({
        draft,
        change,
        context,
      });
      const result = parseCheckoutRecalculationResult(
        request,
        await this.dependencies.pipeline.recalculate(request),
      );
      assertCompletePipelineResult(result);
      return result;
    } catch (cause) {
      if (cause instanceof CheckoutMutationError) throw cause;
      if (cause instanceof CheckoutPipelineBoundaryError) {
        throw new CheckoutMutationError(
          "CHECKOUT_PIPELINE_BOUNDARY_VIOLATION",
          "Checkout recalculation produced an invalid boundary payload.",
          false,
          { cause },
        );
      }
      throw new CheckoutMutationError(
        "CHECKOUT_PIPELINE_FAILED",
        "Checkout could not be recalculated.",
        true,
        { cause },
      );
    }
  }

  private async commitSafely<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (cause) {
      if (cause instanceof CheckoutMutationError) throw cause;
      throw new CheckoutMutationError(
        "CHECKOUT_COMMIT_FAILED",
        "Checkout could not be committed.",
        true,
        { cause },
      );
    }
  }

  private assertDraft(
    draft: CheckoutMutationDraft,
    version: number,
    input: { checkoutId: string; storeId: string },
  ): void {
    if (
      draft.checkoutId !== input.checkoutId ||
      draft.storeId !== input.storeId ||
      draft.version !== version ||
      !draft.currencyCode.trim() ||
      !draft.channelCode.trim()
    ) {
      throw new CheckoutMutationError(
        "CHECKOUT_DRAFT_INVALID",
        "Checkout mutation produced an invalid draft.",
        false,
      );
    }
  }
}

export function checkoutValidationValid(result: CheckoutRecalculationResult): boolean {
  return result.validation.status === "SUCCESS" && result.validation.data.valid;
}
