/**
 * ResourceDefinition - resource definition for UI display
 */
export interface ResourceDefinition {
  /** Resource name */
  name: string;
  /** Human-readable display name */
  displayName: string | null;
  /** Available actions for this resource */
  actions: string[];
  /** Resource description */
  description: string | null;
}
