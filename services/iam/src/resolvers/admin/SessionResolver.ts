import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Session } from "../../repositories/models/auth.js";
import { IAMType } from "./IAMType.js";

export interface SessionInput {
  session: Session;
  currentSessionId?: string | null;
}

/**
 * Session resolver - resolves user session information
 */
export class SessionResolver extends IAMType<SessionInput, Session> {
  async $preload() {
    return this.$props.session;
  }

  id() {
    return encodeGlobalIdByType(this.$props.session.id, GlobalIdEntity.Session);
  }

  ipAddress() {
    return this.$get("ipAddress");
  }

  userAgent() {
    return this.$get("userAgent");
  }

  expiresAt() {
    return this.$get("expiresAt");
  }

  /**
   * Check if this session is the current one making the request.
   * Compares session ID with the session ID from the JWT.
   */
  isCurrent() {
    const { session, currentSessionId } = this.$props;
    if (!currentSessionId) {
      return false;
    }
    return session.id === currentSessionId;
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
