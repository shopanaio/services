export type AuthAdapterScope =
  | { kind: "platform" }
  | { kind: "application"; applicationId: string };

export function assertApplicationId(applicationId: string): void {
  if (typeof applicationId !== "string" || !applicationId.trim()) {
    throw new Error("Application ID is required for application scope");
  }
}
