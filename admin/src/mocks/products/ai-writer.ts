import type { OutputData } from "@editorjs/editorjs";
import type { AITone } from "@/domains/inventory/products/modals";
import type { IGeneratedContent, IGenerateParams } from "@/domains/inventory/products/modals/ai-writer-modal/types";

export const mockGenerateContent = async (
  params: IGenerateParams
): Promise<IGeneratedContent> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { productContext, target, tone } = params;

  const toneStyles: Record<AITone, string> = {
    professional:
      "Experience premium quality and exceptional craftsmanship with",
    casual: "Check out the awesome",
    luxury: "Indulge in the exquisite elegance of",
    friendly: "You're going to love",
  };

  const descriptionText = `${toneStyles[tone]} the ${productContext.title}. ${
    productContext.category
      ? `Perfect for ${productContext.category.toLowerCase()} enthusiasts, `
      : ""
  }this product delivers outstanding performance and style.

Key Features:
- Premium quality materials for lasting durability
- Thoughtfully designed for optimal user experience
- Versatile enough for any occasion
${productContext.attributes.length > 0 ? `- Available with: ${productContext.attributes.join(", ")}` : ""}

Whether you're looking for reliability, style, or both, the ${productContext.title} exceeds expectations at every turn.`;

  const excerptText = `${toneStyles[tone]} the ${productContext.title}. Premium quality meets exceptional design for an unmatched experience.`;

  const createEditorData = (text: string): OutputData => ({
    time: Date.now(),
    version: "2.28.2",
    blocks: text.split("\n\n").map((paragraph, index) => {
      if (paragraph.startsWith("Key Features:")) {
        return {
          id: `block-${index}`,
          type: "header",
          data: { text: "Key Features", level: 3 },
        };
      }
      if (paragraph.startsWith("- ")) {
        return {
          id: `block-${index}`,
          type: "list",
          data: {
            style: "unordered",
            items: paragraph.split("\n").map((item) => item.replace(/^- /, "")),
          },
        };
      }
      return {
        id: `block-${index}`,
        type: "paragraph",
        data: { text: paragraph },
      };
    }),
  });

  return {
    description:
      target === "excerpt" ? null : createEditorData(descriptionText),
    excerpt: target === "description" ? null : createEditorData(excerptText),
  };
};
