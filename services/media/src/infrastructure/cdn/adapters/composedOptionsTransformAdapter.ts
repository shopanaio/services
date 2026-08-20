import type { CdnAdapterContext } from "../CdnAdapterRegistry.js";
import { mapValue } from "../CdnDeliveryService.js";

interface ComposeConfig {
  placement: "path" | "query";
  queryParamName?: string; // required when placement === "query"
  itemSeparator: string; // e.g. ","
  pairSeparator: string; // e.g. "_" (Cloudinary) or "=" (Cloudflare) or "-" (ImageKit)
  keyMap: Record<string, string>;
}

const NORMALIZED_FIELDS = [
  "width",
  "height",
  "fit",
  "gravity",
  "format",
  "quality",
  "scale",
] as const;

export function composedOptionsTransformAdapter(context: CdnAdapterContext): string {
  const transformConfig = context.configuration.transformConfig as Record<string, unknown>;
  const compose = transformConfig.compose as ComposeConfig;

  const pairs = NORMALIZED_FIELDS.map((field) => {
    const rawValue = context.transform[field as keyof typeof context.transform];
    if (rawValue === undefined || rawValue === null) return null;
    const key = compose.keyMap[field];
    if (!key) return null;
    const value = mapValue(transformConfig, field, String(rawValue));
    return `${key}${compose.pairSeparator}${value}`;
  }).filter((pair): pair is string => pair !== null);

  const optionsBlock = pairs.join(compose.itemSeparator);

  if (compose.placement === "query") {
    const url = new URL(context.url);
    url.searchParams.set(compose.queryParamName!, optionsBlock);
    return url.toString();
  }

  const base = new URL(context.configuration.baseUrl);
  const pathPrefix = context.configuration.pathPrefix.replace(/^\/+|\/+$/g, "");
  const encodedObjectPath = context.objectPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  return `${base.origin}/${[pathPrefix, optionsBlock, encodedObjectPath]
    .filter(Boolean)
    .join("/")}`;
}
