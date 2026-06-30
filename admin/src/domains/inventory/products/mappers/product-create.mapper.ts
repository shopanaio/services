import type { OutputData } from "@editorjs/editorjs";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import type { ApiFile, ApiProductCreateInput } from "@/graphql/types";
import { renderContent } from "@/ui-kit/editor";
import type {
  IGeneratedVariant,
  IOptionInput,
} from "../modals/create-product-modal/utils/generate-variants";

export type { IGeneratedVariant, IOptionInput };

export interface CreateProductInput {
  title: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
  hasVariants: boolean;
  options: IOptionInput[];
  variants: IGeneratedVariant[];
}

export function prepareDescription(
  description: OutputData | null,
): ApiProductCreateInput["description"] {
  if (!description || !description.blocks?.length) {
    return undefined;
  }

  const rendered = renderContent(description);

  return {
    text: rendered.plain,
    html: rendered.html,
    json: rendered.json as unknown as Record<string, unknown>,
  };
}

export function prepareMediaFileIds(media: ApiFile[]): string[] | undefined {
  if (!media || media.length === 0) {
    return undefined;
  }

  return media.map((item) => item.id);
}

export function prepareOptions(
  hasVariants: boolean,
  options: IOptionInput[],
): ApiProductCreateInput["options"] {
  if (!hasVariants || !options || options.length === 0) {
    return undefined;
  }

  const validOptions = options.filter(
    (option) => option.name.trim() && option.values.length > 0,
  );

  if (validOptions.length === 0) {
    return undefined;
  }

  return validOptions.map((option) => ({
    name: option.name,
    slug: slugify(option.name),
    values: option.values.map((value) => ({
      name: value.value,
      slug: value.slug,
    })),
  }));
}

export function prepareVariants(
  hasVariants: boolean,
  variants: IGeneratedVariant[],
): ApiProductCreateInput["variants"] {
  if (!hasVariants || !variants || variants.length === 0) {
    return undefined;
  }

  const enabledVariants = variants.filter((variant) => variant.enabled);

  if (enabledVariants.length === 0) {
    return undefined;
  }

  return enabledVariants.map((variant) => ({
    handle: variant.id,
  }));
}

export function prepareProductPayload(
  input: CreateProductInput,
): ApiProductCreateInput {
  return {
    title: input.title,
    handle: input.handle,
    description: prepareDescription(input.description),
    mediaFileIds: prepareMediaFileIds(input.media),
    options: prepareOptions(input.hasVariants, input.options),
    variants: prepareVariants(input.hasVariants, input.variants),
  };
}
