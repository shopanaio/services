import type { FieldPath } from "react-hook-form";
import type { OrderUserError } from "../graphql/operation-types";
import type { OrderFormValues } from "../modals/order-modal/schema";
const paths: Record<string, FieldPath<OrderFormValues>> = {
  "customer.email": "email",
  "customer.phone": "phone",
  currencyCode: "currencyCode",
  adminNote: "adminNote",
  items: "items",
  "items.quantity": "items.0.quantity",
};
export function mapOrderUserErrors(errors: OrderUserError[]) {
  return errors.map((error) => ({
    ...error,
    field: error.field ? (paths[error.field] ?? null) : null,
  }));
}
