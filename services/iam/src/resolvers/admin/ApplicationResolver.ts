import { IAMType } from "./IAMType.js";

/** Application realm type resolver. */
export class ApplicationResolver extends IAMType<string> {
  $preload() {
    // TODO: Load the application realm.
  }

  id() {
    // TODO: Resolve the application global ID.
  }

  organizationId() {
    // TODO: Resolve the owning organization ID.
  }

  organization() {
    // TODO: Resolve the owning organization.
  }

  name() {
    // TODO: Resolve the application name.
  }

  displayName() {
    // TODO: Resolve the application display name.
  }

  description() {
    // TODO: Resolve the application description.
  }

  status() {
    // TODO: Resolve the application lifecycle status.
  }

  resource() {
    // TODO: Resolve the immutable application resource.
  }

  revision() {
    // TODO: Resolve the application revision.
  }

  auth() {
    // TODO: Resolve the application auth configuration.
  }

  oauthClient(_args: { clientId: string }) {
    // TODO: Resolve an OAuth client within the application.
  }

  oauthClients(_args: unknown) {
    // TODO: Resolve the application OAuth client connection.
  }

  user(_args: { id: string }) {
    // TODO: Resolve a user within the application.
  }

  users(_args: unknown) {
    // TODO: Resolve the application user connection.
  }

  createdAt() {
    // TODO: Resolve the application creation timestamp.
  }

  updatedAt() {
    // TODO: Resolve the application update timestamp.
  }

  archivedAt() {
    // TODO: Resolve the application archival timestamp.
  }
}

/** Application create payload resolver. */
export class ApplicationCreatePayloadResolver extends IAMType<unknown> {
  application() {
    // TODO: Resolve the created application.
  }

  userErrors() {
    // TODO: Resolve application creation user errors.
  }
}

/** Application update payload resolver. */
export class ApplicationUpdatePayloadResolver extends IAMType<unknown> {
  application() {
    // TODO: Resolve the updated application.
  }

  userErrors() {
    // TODO: Resolve application update user errors.
  }
}

/** Application archive payload resolver. */
export class ApplicationArchivePayloadResolver extends IAMType<unknown> {
  application() {
    // TODO: Resolve the archived application.
  }

  userErrors() {
    // TODO: Resolve application archival user errors.
  }
}
