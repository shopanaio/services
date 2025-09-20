import { App } from "@src/ioc/container";
import type {
  ApiOrderQueryOrdersArgs,
  ApiOrderQuery,
} from "@src/interfaces/gql-admin-api/types";
import { mapOrderReadToApi } from "@src/interfaces/gql-admin-api/mapper/order";

/**
 * orders(input: OrdersInput): OrdersOutput!
 */
export const orders = async (
  _parent: ApiOrderQuery,
  args: ApiOrderQueryOrdersArgs
) => {
  // TODO: Implement proper pagination and filtering
  const orderReadRepository = App.getInstance().orderReadRepository;

  const input = args.input || {};
  const page = (input as any).page || 1;
  const pageSize = (input as any).pageSize || 20;
  const where = (input as any).where || {};
  const order = (input as any).order || undefined;

  // For now, return empty result - implementation should be added when repository methods are available
  const data: any[] = [];
  const total = 0;
  const pageCount = Math.ceil(total / pageSize);

  return {
    data: data.map(mapOrderReadToApi),
    meta: {
      page,
      pageSize,
      count: data.length,
      total,
      pageCount,
    },
  };
};
