export interface ApplicationUserProvisioningRequiredInput {
  readonly applicationId: string;
  readonly organizationId: string;
  readonly applicationUserId: string;
}

/**
 * Post-commit bridge from Better Auth lifecycle hooks to the durable IAM
 * workflow that publishes application-user domain events.
 */
export interface ApplicationUserLifecyclePort {
  provisioningRequired(
    input: ApplicationUserProvisioningRequiredInput,
  ): Promise<void>;
}
