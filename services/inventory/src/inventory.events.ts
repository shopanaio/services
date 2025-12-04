import { Inject, Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { SERVICE_BROKER, ServiceBroker } from '@shopana/shared-kernel';

export interface ProductUpdatedEvent {
  productId: string;
  shopId: string;
  updatedAt: string;
  changes: string[];
}

export interface StockChangedEvent {
  variantId: string;
  shopId: string;
  warehouseId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: 'sale' | 'restock' | 'adjustment' | 'return';
}

@Injectable()
export class InventoryEventsHandler {
  private readonly logger = new Logger(InventoryEventsHandler.name);

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  /**
   * Handle product.updated events from other services or self-published events.
   * Queue is durable with DLX for failed message handling.
   */
  @RabbitSubscribe({
    exchange: 'shopana.events',
    routingKey: 'product.updated',
    queue: 'shopana.events.inventory.product.updated',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'shopana.dlx',
      deadLetterRoutingKey: 'events.product.updated',
    },
  })
  async handleProductUpdated(payload: ProductUpdatedEvent): Promise<void> {
    this.logger.log(
      `Received product.updated event: productId=${payload.productId}, changes=${payload.changes.join(', ')}`,
    );

    // Example: trigger cache invalidation or search index update
    // await this.broker.call('search.reindexProduct', { productId: payload.productId });
  }

  /**
   * Handle stock.changed events - useful for analytics, notifications, etc.
   */
  @RabbitSubscribe({
    exchange: 'shopana.events',
    routingKey: 'stock.changed',
    queue: 'shopana.events.inventory.stock.changed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'shopana.dlx',
      deadLetterRoutingKey: 'events.stock.changed',
    },
  })
  async handleStockChanged(payload: StockChangedEvent): Promise<void> {
    this.logger.log(
      `Stock changed: variantId=${payload.variantId}, ${payload.previousQuantity} -> ${payload.newQuantity} (${payload.reason})`,
    );

    // Check for low stock alerts
    if (payload.newQuantity <= 5 && payload.previousQuantity > 5) {
      this.logger.warn(`Low stock alert: variantId=${payload.variantId}, quantity=${payload.newQuantity}`);

      // Could emit notification event
      // await this.broker.emit('inventory.low_stock_alert', {
      //   variantId: payload.variantId,
      //   currentQuantity: payload.newQuantity,
      // });
    }
  }

  /**
   * Broadcast handler example - receives messages sent to all instances.
   * Uses exclusive auto-delete queue so each instance gets its own copy.
   */
  @RabbitSubscribe({
    exchange: 'shopana.broadcast',
    routingKey: 'cache.invalidate',
    queue: '', // Empty string = auto-generated exclusive queue
    queueOptions: {
      exclusive: true,
      autoDelete: true,
    },
  })
  async handleCacheInvalidate(payload: { pattern: string }): Promise<void> {
    this.logger.log(`Broadcast received: invalidate cache pattern=${payload.pattern}`);
    // Clear local caches matching pattern
  }
}
