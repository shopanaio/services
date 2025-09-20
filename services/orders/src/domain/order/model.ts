import type { OrderState } from "@src/domain/order/decider";

export class Order {
  private readonly state: OrderState;
  private readonly id: string;

  private constructor(id: string, state: OrderState) {
    this.id = id;
    this.state = state;
  }

  static fromAggregate(id: string, state: OrderState): Order {
    return new Order(id, state);
  }

  getId(): string {
    return this.id;
  }

  getprojectId(): string {
    return this.state.projectId;
  }

  getCurrencyCode(): string {
    return this.state.currencyCode;
  }
}
