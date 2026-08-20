export const APPLICATION_AUTH_LIVE_STATE_INVALIDATION_PORT = Symbol.for(
  "shopana.iam.application-auth-live-state-invalidation-port",
);

export type ApplicationAuthLiveStateInvalidationKind =
  "application" | "client" | "user" | "session" | "token_family";

export interface ApplicationAuthLiveStateInvalidationEvent {
  schemaVersion: 1;
  kind: ApplicationAuthLiveStateInvalidationKind;
  applicationId: string;
  clientId?: string;
  userId?: string;
  sessionId?: string;
  tokenFamilyId?: string;
  occurredAt: string;
}

export type ApplicationAuthLiveStateInvalidationHandler = (
  event: ApplicationAuthLiveStateInvalidationEvent,
) => void | Promise<void>;

/** Distributed implementations must deliver events to every IAM replica. */
export interface ApplicationAuthLiveStateInvalidationPort {
  publish(event: ApplicationAuthLiveStateInvalidationEvent): Promise<void>;
  subscribe(
    handler: ApplicationAuthLiveStateInvalidationHandler,
  ): Promise<() => void | Promise<void>>;
}

/**
 * Local fan-out plus an optional distributed transport.
 *
 * Lost transport events are safe: validation cache entries have a hard
 * 30-second ceiling and are then rebuilt from the database.
 */
export class ApplicationAuthLiveStateInvalidationBus {
  private readonly handlers = new Set<ApplicationAuthLiveStateInvalidationHandler>();
  private unsubscribeExternal: (() => void | Promise<void>) | null = null;

  constructor(
    private readonly port?: ApplicationAuthLiveStateInvalidationPort,
    private readonly onTransportError: (error: unknown) => void = () => undefined,
  ) {}

  async start(): Promise<void> {
    if (!this.port || this.unsubscribeExternal) return;
    try {
      this.unsubscribeExternal = await this.port.subscribe((event) => this.dispatch(event));
    } catch (error) {
      this.onTransportError(error);
    }
  }

  subscribe(handler: ApplicationAuthLiveStateInvalidationHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async publish(event: ApplicationAuthLiveStateInvalidationEvent): Promise<void> {
    await this.dispatch(event);
    try {
      await this.port?.publish(event);
    } catch (error) {
      this.onTransportError(error);
    }
  }

  /**
   * Security-sensitive publish that does not downgrade distributed transport
   * failures to best effort. Callers await this acknowledgement before
   * reporting an administrative mutation as successful.
   */
  async publishRequired(event: ApplicationAuthLiveStateInvalidationEvent): Promise<void> {
    await this.dispatch(event);
    if (!this.port) return;
    try {
      await this.port.publish(event);
    } catch (error) {
      this.onTransportError(error);
      throw error;
    }
  }

  async close(): Promise<void> {
    const unsubscribe = this.unsubscribeExternal;
    this.unsubscribeExternal = null;
    this.handlers.clear();
    await unsubscribe?.();
  }

  private async dispatch(event: ApplicationAuthLiveStateInvalidationEvent): Promise<void> {
    if (event.schemaVersion !== 1) return;
    await Promise.all([...this.handlers].map((handler) => handler(event)));
  }
}

export function createApplicationAuthLiveStateInvalidationEvent(
  input: Omit<ApplicationAuthLiveStateInvalidationEvent, "schemaVersion" | "occurredAt">,
  now: () => Date = () => new Date(),
): ApplicationAuthLiveStateInvalidationEvent {
  return Object.freeze({
    schemaVersion: 1,
    ...input,
    occurredAt: now().toISOString(),
  });
}
