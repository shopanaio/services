export const APPLICATION_AUTH_SMS_PROVIDER_AVAILABILITY_PORT = Symbol.for(
  "shopana.iam.application-auth-sms-provider-availability-port"
);

export interface ApplicationAuthSmsProviderAvailabilityPort {
  isConfiguredForApplication(applicationId: string): Promise<boolean>;
}

