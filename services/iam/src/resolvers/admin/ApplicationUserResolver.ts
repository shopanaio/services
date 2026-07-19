import { IAMType } from "./IAMType.js";

/** Application-scoped user resolver. */
export class ApplicationUserResolver extends IAMType<unknown> {
  id() {
    // TODO: Resolve the application user global ID.
  }

  applicationId() {
    // TODO: Resolve the owning application ID.
  }

  name() {
    // TODO: Resolve the application user name.
  }

  firstName() {
    // TODO: Resolve the application user first name.
  }

  lastName() {
    // TODO: Resolve the application user last name.
  }

  email() {
    // TODO: Resolve the application user email.
  }

  emailVerified() {
    // TODO: Resolve the application user email verification state.
  }

  imageUrl() {
    // TODO: Resolve the application user image URL.
  }

  status() {
    // TODO: Resolve the application user status.
  }

  security() {
    // TODO: Resolve safe application user security metadata.
  }

  linkedAccounts() {
    // TODO: Resolve safe linked account metadata.
  }

  createdAt() {
    // TODO: Resolve the application user creation timestamp.
  }

  updatedAt() {
    // TODO: Resolve the application user update timestamp.
  }
}

/** Safe application user security metadata resolver. */
export class ApplicationUserSecurityMetadataResolver extends IAMType<unknown> {
  activeSessionCount() {
    // TODO: Resolve the active session count.
  }

  linkedAccountCount() {
    // TODO: Resolve the linked account count.
  }

  hasPasswordLogin() {
    // TODO: Resolve whether password login is available.
  }
}

/** Application user linked account resolver. */
export class ApplicationUserLinkedAccountResolver extends IAMType<unknown> {
  id() {
    // TODO: Resolve the linked account global ID.
  }

  provider() {
    // TODO: Resolve the linked account provider.
  }

  isOnlyLoginMethod() {
    // TODO: Resolve whether this is the only login method.
  }

  createdAt() {
    // TODO: Resolve the linked account creation timestamp.
  }

  updatedAt() {
    // TODO: Resolve the linked account update timestamp.
  }
}

/** Application user mutation payload resolver. */
export class ApplicationUserPayloadResolver extends IAMType<unknown> {
  user() {
    // TODO: Resolve the changed application user.
  }

  userErrors() {
    // TODO: Resolve application user mutation errors.
  }
}

/** Application user session revocation payload resolver. */
export class ApplicationUserSessionsRevokeAllPayloadResolver extends IAMType<unknown> {
  user() {
    // TODO: Resolve the application user.
  }

  revokedCount() {
    // TODO: Resolve the number of revoked sessions.
  }

  userErrors() {
    // TODO: Resolve session revocation user errors.
  }
}

/** Application user account unlink payload resolver. */
export class ApplicationUserAccountUnlinkPayloadResolver extends IAMType<unknown> {
  user() {
    // TODO: Resolve the application user.
  }

  unlinkedAccountId() {
    // TODO: Resolve the unlinked account global ID.
  }

  userErrors() {
    // TODO: Resolve account unlink user errors.
  }
}
