import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiTagCreateInput,
  ApiTagUpdateInput,
} from "@/graphql/types";

export interface TagIdentityInput {
  name: string;
  handle: string;
}

export function mapTagIdentityToCreateInput(
  values: TagIdentityInput,
): ApiTagCreateInput {
  return {
    name: values.name.trim(),
    handle: slugify(values.handle),
  };
}

export function mapTagIdentityToUpdateInput(
  id: string,
  values: TagIdentityInput,
): ApiTagUpdateInput {
  return {
    id,
    name: values.name.trim(),
    handle: slugify(values.handle),
  };
}
