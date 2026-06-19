import type { RichText } from "../interfaces/index.js";

export type RichTextLike = {
  text?: string | null;
  html?: string | null;
  json?: unknown | null;
};

export function toRichText(
  value: RichTextLike | null | undefined
): RichText | null {
  if (!value) {
    return null;
  }

  const hasNoContent =
    (value.text === null || value.text === undefined) &&
    (value.html === null || value.html === undefined) &&
    (value.json === null || value.json === undefined);

  if (hasNoContent) {
    return null;
  }

  return {
    text: value.text ?? "",
    html: value.html ?? "",
    json: parseRichTextJson(value.json),
  };
}

function parseRichTextJson(value: unknown): unknown {
  if (value === null || value === undefined) {
    return {};
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
