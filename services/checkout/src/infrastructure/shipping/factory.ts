import type { ShippingPort } from "@src/application/ports/shippingPort";
import { HttpShippingClient } from "@src/infrastructure/shipping/httpShippingClient";

export function getShippingClient(): ShippingPort {
  const base = process.env.SHIPPING_API_URL;
  if (!base) {
    throw new Error("Missing SHIPPING_API_URL env var");
  }
  return new HttpShippingClient(base);
}
