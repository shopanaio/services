import type { ApiOrder, ApiCreateOrderInput, ApiCreateOrderItemInput, ApiUpdateOrderCustomerInput, ApiUpdateOrderStatusInput, ApiUpdatePaymentStatusInput, ApiUpdateFulfillmentStatusInput, ApiUpdateAdminNoteInput, ApiAddCommentInput, ApiUpdateOrderTagsInput, ApiUpdateOrderItemInput, ApiSplitFulfillmentInput } from '@codegen/admin-gql';
import type { TenantApiFixture } from '@fixtures/admin/api';
import _ from 'lodash';
import type { DeepPartial } from 'types';

export class Order {
  constructor(private api: TenantApiFixture) {}

  /**
   * Create a new order and return the full object.
   * @param input Partial input to override defaults
   */
  async create(input?: DeepPartial<ApiCreateOrderInput>): Promise<ApiOrder> {
    const { data } = await this.api.mutation('admin/OrderCreate', {
      variables: {
        input: _.merge(
          {
            clientInfo: {
              language: 'ru-RU',
              userAgent: '',
            },
          },
          input,
        ),
      },
    });

    // OrderCreate returns only the id, request the full order object next
    return this.findOne(data.orderMutation.create as string);
  }

  /**
   * Find order by id
   */
  async findOne(id: string): Promise<ApiOrder> {
    const { data } = await this.api.query('admin/OrderFindOne', {
      variables: { findOneId: id },
    });

    return data.orderQuery.findOne as ApiOrder;
  }

  /**
   * Add product item to order
   */
  async addItem({ orderId, productId, quantity = 1 }: ApiCreateOrderItemInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderItemCreate', {
      variables: { input: { orderId, productId, quantity } },
    });

    return data.orderMutation.createOrderItem as boolean;
  }

  /**
   * Assign customer to order
   */
  async updateCustomer(input: ApiUpdateOrderCustomerInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderCustomerUpdate', {
      variables: { input },
    });
    return data.orderMutation.updateCustomer as boolean;
  }

  /**
   * Update order status (e.g. ACTIVE, CANCELLED)
   */
  async updateStatus(input: ApiUpdateOrderStatusInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUpdateStatus', {
      variables: { input },
    });
    return data.orderMutation.updateStatus as boolean;
  }

  /**
   * Update fulfillment status (e.g. CANCELLED, SHIPPED)
   */
  async updateFulfillmentStatus(input: ApiUpdateFulfillmentStatusInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUpdateFulfillmentStatus', {
      variables: { input },
    });
    return data.orderMutation.updateFulfillmentStatus as boolean;
  }

  /**
   * Update payment status (e.g. PAID, CANCELLED)
   */
  async updatePaymentStatus(input: ApiUpdatePaymentStatusInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUpdatePaymentStatus', {
      variables: { input },
    });
    return data.orderMutation.updatePaymentStatus as boolean;
  }

  /**
   * Split fulfillment into multiple fulfillments
   */
  async splitFulfillment(input: ApiSplitFulfillmentInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderSplitFulfillment', {
      variables: { input },
    });
    return data.orderMutation.splitFulfillment as boolean;
  }

  /**
   * Undo split fulfillment by fulfillment id
   */
  async undoSplitFulfillment(id: string): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUndoSplitFulfillment', {
      variables: { undoSplitFulfillmentId: id },
    });
    return data.orderMutation.undoSplitFulfillment as boolean;
  }

  /** Update quick note (admin note) */
  async updateAdminNote(input: ApiUpdateAdminNoteInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUpdateAdminNote', {
      variables: { input },
    });
    return data.orderMutation.updateAdminNote as boolean;
  }

  /** Add a comment to order timeline */
  async addComment(input: ApiAddCommentInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderAddComment', {
      variables: { input },
    });
    return data.orderMutation.addComment as boolean;
  }

  /** Update order tags (and optionally labels) */
  async updateTags(input: ApiUpdateOrderTagsInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderUpdateTags', {
      variables: { input },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.orderMutation as any).updateTags as boolean;
  }

  /** Update single order item (price, quantity, cost, weight, etc.) */
  async updateItem(input: ApiUpdateOrderItemInput): Promise<boolean> {
    const { data } = await this.api.mutation('admin/OrderItemUpdate', {
      variables: { input },
    });
    return data.orderMutation.updateOrderItem as boolean;
  }
}
