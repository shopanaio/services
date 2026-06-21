import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiWarehouseCreateInput,
  ApiWarehouseUpdateInput,
} from "@/graphql/types";

export interface CreateWarehouseInput {
  name: string;
  code: string;
  isDefault: boolean;
}

export interface UpdateWarehouseIdentityInput {
  id: string;
  name: string;
  code: string;
}

export function normalizeWarehouseCode(value: string): string {
  return slugify(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function mapCreateWarehouseFormToInput(
  values: CreateWarehouseInput,
): ApiWarehouseCreateInput {
  return {
    name: values.name.trim(),
    code: normalizeWarehouseCode(values.code),
    isDefault: values.isDefault,
  };
}

export function mapUpdateWarehouseIdentityFormToInput(
  values: UpdateWarehouseIdentityInput,
): ApiWarehouseUpdateInput {
  return {
    id: values.id,
    name: values.name.trim(),
    code: normalizeWarehouseCode(values.code),
  };
}
