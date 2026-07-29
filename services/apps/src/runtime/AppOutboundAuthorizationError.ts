export class AppOutboundAuthorizationError extends Error {
  readonly code = "APP_OUTBOUND_AUTHORIZATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "AppOutboundAuthorizationError";
  }
}
