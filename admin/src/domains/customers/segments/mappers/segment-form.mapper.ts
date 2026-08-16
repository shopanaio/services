import type { FieldPath } from "react-hook-form";
import type {
  ApiCustomerSegmentCreateInput,
  ApiCustomerSegmentUpdateInput,
} from "@/graphql/types";
import { CustomerSegmentStatus, CustomerSegmentType } from "@/graphql/types";
import type { SegmentFormValues } from "../modals/segment-modal/schema";

export function buildCustomerSegmentCreateInput(
  values: SegmentFormValues,
  type: CustomerSegmentType,
  status: CustomerSegmentStatus,
  query: string,
): ApiCustomerSegmentCreateInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color,
    type,
    status,
    ...(type === CustomerSegmentType.Dynamic ? { query: query.trim() } : {}),
  };
}

export function buildCustomerSegmentUpdateInput(values: SegmentFormValues): ApiCustomerSegmentUpdateInput {
  return {
    details: {
      name: values.name.trim(),
      description: values.description.trim() || null,
      color: values.color,
    },
  };
}

const fieldMap: Record<string, FieldPath<SegmentFormValues>> = {
  "details.name": "name",
  "details.description": "description",
  "details.color": "color",
};

export function mapCustomerSegmentUserErrors(errors: readonly {
  readonly field?: readonly string[] | null;
  readonly message: string;
}[]) {
  return errors.map((error) => {
    const path = error.field?.join(".") ?? null;
    return {
      field: path ? fieldMap[path] ?? null : null,
      message: error.message,
    };
  });
}
