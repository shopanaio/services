import { UseCase } from "@src/application/usecases/useCase";
import { OrderReadRepository } from "@src/application/read/orderReadRepository";
import type { OrderContext } from "@src/context/index.js";

export interface GetUserOrdersInput {
  userId: string;
  limit?: number;
  offset?: number;
  status?: string[];
}

export interface GetUserOrdersUseCaseInput extends OrderContext {
  userId: string;
  limit?: number;
  offset?: number;
  status?: string[];
}

export interface GetUserOrdersUseCaseDependencies {
  orderReadRepository: OrderReadRepository;
}

/**
 * Use case for retrieving orders for a specific user
 * Used primarily in storefront API for customer order history
 */
export class GetUserOrdersUseCase extends UseCase<GetUserOrdersUseCaseInput, any[]> {
  constructor(
    deps: GetUserOrdersUseCaseDependencies,
    baseDeps?: any
  ) {
    super(baseDeps);
    this.orderReadRepository = deps.orderReadRepository;
  }

  private readonly orderReadRepository: OrderReadRepository;

  async execute(input: GetUserOrdersUseCaseInput): Promise<any[]> {
    const { apiKey, project, customer, user, userId, limit = 20, offset = 0, status } = input;
    const context = { apiKey, project, customer, user };

    try {
      // TODO: Implement proper authorization check
      // Ensure requesting user can access orders for the specified userId
      // For customer context: userId must match context.customer.id or context.user.id
      // For admin context: can access any user's orders within the project

      // Basic validation - in customer context, can only access own orders
      if (context.customer && context.customer.id !== userId) {
        throw new Error("Forbidden: Cannot access orders for other users");
      }

      if (context.user && !context.customer && context.user.id !== userId) {
        // If not in customer context but user context, check if user can access this userId
        // This would depend on your user permission system
        this.logger.warn({
          requestingUserId: context.user.id,
          targetUserId: userId,
          projectId: context.project.id
        }, "User attempting to access orders for different user");
      }

      // Validate pagination limits
      const safeLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
      const safeOffset = Math.max(offset, 0);

      this.logger.info({
        userId,
        projectId: context.project.id,
        limit: safeLimit,
        offset: safeOffset,
        statusFilter: status
      }, "Fetching user orders");

      // TODO: Implement repository method for user order retrieval
      // For now, return empty result

      // Placeholder implementation - should be replaced with actual repository call
      // Example: const orders = await this.orderReadRepository.findByUserId(userId, {
      //   projectId: context.project.id,
      //   limit: safeLimit,
      //   offset: safeOffset,
      //   status: status ? { in: status } : undefined,
      //   orderBy: { createdAt: 'desc' }
      // });

      const orders: any[] = [];

      this.logger.debug({
        userId,
        projectId: context.project.id,
        foundOrdersCount: orders.length
      }, "Retrieved user orders");

      return orders;

    } catch (error) {
      this.logger.error({
        error,
        userId,
        projectId: context.project.id
      }, "Failed to fetch user orders");

      // Re-throw known errors as-is
      if (error instanceof Error && error.message === "Forbidden: Cannot access orders for other users") {
        throw error;
      }

      throw new Error(
        `Failed to fetch user orders: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
