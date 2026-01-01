import {
  ApiApiKey,
  ApiOrderEvent,
  ApiUser,
  OrderEventTypeEnum,
} from '@src/graphql';
import { syntheticId } from '@src/utils/synthetic-id';

export interface IOrderEvent {
  id: string;
  createdAt: Date;
  createdBy: ApiUser | ApiApiKey;
  eventData: any | null;
  eventType: OrderEventTypeEnum;
}

export class OrderEvent {
  static parseEventData(meta: any): any {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }
  static create(data: ApiOrderEvent): IOrderEvent {
    return {
      id: data.id || syntheticId(),
      createdAt: new Date(data.createdAt),
      eventData: OrderEvent.parseEventData(data.eventData) || null,
      eventType: data.eventType,
      createdBy: data.createdBy,
    };
  }
}
