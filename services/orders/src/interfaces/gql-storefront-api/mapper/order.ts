import type { ApiOrder } from "@src/interfaces/gql-storefront-api/types";
import type { OrderReadView } from "@src/application/read/orderReadRepository";

export function mapOrderReadToApi(read: OrderReadView): ApiOrder {
  return {
    id: read.id,
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
  };
}
