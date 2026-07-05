import type { RichText } from "../interfaces/index.js";
import {
  toRichTextValue,
  type RichTextLike,
} from "../../shared/richText.js";

export type { RichTextLike };

export function toRichText(
  value: RichTextLike | null | undefined
): RichText | null {
  return toRichTextValue(value);
}
