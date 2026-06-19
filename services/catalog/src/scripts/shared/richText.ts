export interface RichTextInput {
  readonly text: string;
  readonly html: string;
  readonly json: Record<string, unknown>;
}

export type RichTextStorage = {
  text: string | null;
  html: string | null;
  json: Record<string, unknown> | null;
};

export function serializeRichTextJson(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  return value ?? null;
}

export function serializeRichTextJsonText(
  value: Record<string, unknown> | null | undefined
): string | null {
  return value ? JSON.stringify(value) : null;
}

export function toRichTextStorage(
  value: RichTextInput | null | undefined
): RichTextStorage {
  if (!value) {
    return {
      text: null,
      html: null,
      json: null,
    };
  }

  return {
    text: value.text,
    html: value.html,
    json: serializeRichTextJson(value.json),
  };
}

export function stableRichTextValue(value: {
  text?: string | null;
  html?: string | null;
  json?: unknown | null;
}): string {
  return JSON.stringify({
    text: value.text ?? null,
    html: value.html ?? null,
    json: normalizeJson(value.json),
  });
}

function normalizeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
