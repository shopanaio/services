import type { FieldPath } from "react-hook-form";
import type {
  ApiCustomerSegment,
  CustomerSegmentCreateInput,
  CustomerSegmentUpdateInput,
  CustomerSegmentUserError,
} from "../graphql/operation-types";
import type { SegmentFormValues } from "../modals/segment-modal/schema";

export function buildCustomerSegmentCreateInput(
  values: SegmentFormValues,
): CustomerSegmentCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color,
  };
}

export function buildCustomerSegmentUpdateInput(
  values: SegmentFormValues,
  segment: ApiCustomerSegment,
): CustomerSegmentUpdateInput {
  return {
    id: segment.id,
    expectedVersion: segment.version,
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color,
  };
}

const fieldMap: Record<string, FieldPath<SegmentFormValues>> = {
  name: "name",
  description: "description",
  color: "color",
};

export function mapCustomerSegmentUserErrors(errors: CustomerSegmentUserError[]) {
  return errors.map((error) => ({
    field: error.field ? fieldMap[error.field] ?? null : null,
    message: error.message,
  }));
}
