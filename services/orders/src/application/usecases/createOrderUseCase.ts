import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateOrderInput } from "@src/application/order/types";
import type { CreateOrderCommand } from "@src/domain/order/commands";
import type { OrderCreated } from "@src/domain/order/events";
import { v7 as uuidv7 } from "uuid";
import { orderDecider } from "@src/domain/order/decider";

export interface CreateOrderUseCaseDependencies
  extends UseCaseDependencies {}

export class CreateOrderUseCase extends UseCase<
  CreateOrderInput,
  string
> {
  constructor(deps: CreateOrderUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CreateOrderInput): Promise<string> {
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const id = uuidv7();
    const streamId = this.streamNames.buildOrderStreamNameFromId(id);

    const command: CreateOrderCommand = {
      type: "order.create",
      data: {
        currencyCode: businessInput.currencyCode,
        idempotencyKey: businessInput.idempotencyKey,
      },
      metadata: this.createCommandMetadata(id, context),
    };

    const { state } = await this.loadOrderState(id);

    const events = orderDecider.decide(command, state);
    const eventsToAppend = (
      Array.isArray(events) ? events : [events]
    ) as OrderCreated[];

    await this.appendToStream(
      streamId,
      eventsToAppend,
      "STREAM_DOES_NOT_EXIST"
    );

    return id;
  }
}
