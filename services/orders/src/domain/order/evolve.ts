import { OrderEventTypes, type OrderEvent } from "./events";
export type OrderState = {
  id: string;
  exists: boolean;
  projectId: string;
  currencyCode: string;
  createdAt: Date;
  updatedAt: Date;
};

export const orderInitialState = (): OrderState => ({
  id: "",
  exists: false,
  projectId: "",
  currencyCode: "",
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

export const orderEvolve = (
  current: OrderState,
  event: OrderEvent
): OrderState => {
  switch (event.type) {
    case OrderEventTypes.OrderCreated: {
      const { data, metadata } = event;
      return {
        ...current,
        id: metadata.aggregateId,
        exists: true,
        projectId: metadata.projectId,
        currencyCode: data.currencyCode,
        createdAt: metadata.now,
        updatedAt: metadata.now,
      };
    }

    default:
      return current;
  }
};
