export function isBroadcastStoreRoute(capability: string, operation: string): boolean {
  return (
    capability === "commerce.function" ||
    (capability === "notifications" && (operation === "deliver" || operation === "getCapabilities"))
  );
}
