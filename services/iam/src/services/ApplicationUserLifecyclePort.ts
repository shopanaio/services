export interface ApplicationUserProvisioningRequiredInput {
  readonly applicationId: string;
  readonly organizationId: string;
  readonly applicationUserId: string;
}

export interface ApplicationUserProjectionChangedInput
  extends ApplicationUserProvisioningRequiredInput {
  readonly changedFields: readonly (
    | "email"
    | "emailVerified"
    | "firstName"
    | "lastName"
    | "phoneNumber"
    | "phoneNumberVerified"
  )[];
  readonly updatedAt: string;
}

export interface ApplicationUserStatusChangedInput
  extends ApplicationUserProvisioningRequiredInput {
  readonly previousStatus: "active" | "blocked";
  readonly status: "active" | "blocked";
  readonly changedAt: string;
}

export interface ApplicationUserDeletedInput
  extends ApplicationUserProvisioningRequiredInput {
  readonly deletedAt: string;
}

/**
 * Post-commit bridge from Better Auth lifecycle hooks to the durable IAM
 * workflow that publishes application-user domain events.
 */
export interface ApplicationUserLifecyclePort {
  provisioningRequired(
    input: ApplicationUserProvisioningRequiredInput,
  ): Promise<void>;
  projectionChanged(input: ApplicationUserProjectionChangedInput): Promise<void>;
  statusChanged(input: ApplicationUserStatusChangedInput): Promise<void>;
  deleted(input: ApplicationUserDeletedInput): Promise<void>;
}
