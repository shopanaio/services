import type { CdnAdapterContext } from "../CdnAdapterRegistry.js";

export function bunnyTransformAdapter(context: CdnAdapterContext): string {
  const { transform } = context;
  const url = new URL(context.url);

  if (transform.width) url.searchParams.set("width", String(transform.width));
  if (transform.height) url.searchParams.set("height", String(transform.height));
  if (transform.quality) {
    url.searchParams.set("quality", String(transform.quality));
  }

  const fit = transform.fit?.toUpperCase();
  const crop = fit === "COVER" || fit === "FILL";
  if (crop) {
    url.searchParams.set("crop", "true");
    if (transform.gravity) {
      url.searchParams.set("crop_gravity", transform.gravity.toLowerCase());
    }
  }

  return url.toString();
}
