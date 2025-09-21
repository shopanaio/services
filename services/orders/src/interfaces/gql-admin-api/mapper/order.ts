import type { OrderReadView } from "@src/application/read/orderReadRepository";
import type { ApiOrder } from "@src/interfaces/gql-admin-api/types";

/**
 * Temporary admin mapper returning minimal shape until admin schema is wired.
 */
export function mapOrderReadToApi(read: OrderReadView): ApiOrder {
  return {
    id: read.id,
    createdAt: read.createdAt.toISOString(),
    updatedAt: read.updatedAt.toISOString(),
  } as unknown as ApiOrder;
}
