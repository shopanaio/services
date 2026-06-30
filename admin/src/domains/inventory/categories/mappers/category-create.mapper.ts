import type { OutputData } from "@editorjs/editorjs";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiCategoryCreateInput,
  ApiFile,
  ApiRichTextInput,
} from "@/graphql/types";
import { renderContent } from "@/ui-kit/editor";

export interface CreateCategoryInput {
  name: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
  parentId?: string | null;
}

export function prepareRichText(
  value: OutputData | null,
): ApiRichTextInput | undefined {
  if (!value || !value.blocks?.length) {
    return undefined;
  }

  const rendered = renderContent(value);

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

  return media.map((file) => file.id);
}

export function prepareCategoryPayload(
  input: CreateCategoryInput,
): ApiCategoryCreateInput {
  const parentId = input.parentId?.trim();

  return {
    name: input.name.trim(),
    handle: slugify(input.handle),
    description: prepareRichText(input.description),
    mediaFileIds: prepareMediaFileIds(input.media),
    parentId: parentId || undefined,
  };
}
