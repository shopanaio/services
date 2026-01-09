import type { OutputData } from "@editorjs/editorjs";
import editorjsHTML from "editorjs-html";
import { convert } from "html-to-text";

const edjsParser = editorjsHTML();

/**
 * Convert EditorJS output to HTML using official editorjs-html
 */
export function renderToHtml(data: OutputData | null): string {
  if (!data?.blocks?.length) return "";
  return edjsParser.parse(data);
}

/**
 * Convert EditorJS output to plain text using html-to-text
 */
export function renderToPlainText(data: OutputData | null): string {
  if (!data?.blocks?.length) return "";
  const html = renderToHtml(data);
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });
}

/**
 * Rendered content in all formats
 */
export interface RenderedContent {
  plain: string;
  html: string;
  json: OutputData | null;
}

/**
 * Render EditorJS output to all formats
 */
export function renderContent(data: OutputData | null): RenderedContent {
  return {
    plain: renderToPlainText(data),
    html: renderToHtml(data),
    json: data,
  };
}
