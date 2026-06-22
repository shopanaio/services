import type { OutputData } from "@editorjs/editorjs";
import type {
  ApiCategoryUpdateInput,
  ApiRichTextInput,
} from "@/graphql/types";
import { renderContent } from "@/ui-kit/editor";

export interface CategoryContentFormValues {
  description: OutputData | null;
  excerpt: OutputData | null;
}

export function toCategoryRichTextInput(
  value: OutputData | null,
): ApiRichTextInput | null {
  if (!value?.blocks?.length) {
    return null;
  }

  const rendered = renderContent(value);

  return {
    text: rendered.plain,
    html: rendered.html,
    json: rendered.json as unknown as Record<string, unknown>,
  };
}

export function mapCategoryContentToUpdateInput(
  values: CategoryContentFormValues,
): ApiCategoryUpdateInput {
  return {
    content: {
      description: toCategoryRichTextInput(values.description),
      excerpt: toCategoryRichTextInput(values.excerpt),
    },
  };
}
