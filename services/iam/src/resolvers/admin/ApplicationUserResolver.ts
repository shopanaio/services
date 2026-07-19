import { PreloadNotFoundError } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ApplicationUser } from "../../repositories/models/application-auth.js";
import type {
  ApplicationUserLinkedAccountView,
  ApplicationUserSecurityView,
} from "../../repositories/application-user/ApplicationUserRepository.js";
import { IAMType } from "./IAMType.js";

export interface ApplicationUserResolverInput {
  organizationId: string;
  applicationId: string;
  userId: string;
  applicationUsersReadAuthorized?: boolean;
}

/** Application-scoped user resolver. */
export class ApplicationUserResolver extends IAMType<
  ApplicationUserResolverInput,
  ApplicationUser
> {
  async $preload() {
    const user = await this.$ctx.loaders.applicationUser.load(this.$props);
    if (!user) {
      throw new PreloadNotFoundError("Application user not found");
    }
    if (!this.$props.applicationUsersReadAuthorized) {
      const authorized = await this.authProvider.authorize({
        organizationId: this.$props.organizationId,
        domain: "org",
        resource: "org.application-users",
        action: "read",
      });
      if (!authorized) {
        throw new PreloadNotFoundError("Application user not found");
      }
    }
    return user;
  }

  id() {
    return encodeGlobalIdByType(
      this.$props.userId,
      GlobalIdEntity.ApplicationUser
    );
  }

  applicationId() {
    return encodeGlobalIdByType(
      this.$props.applicationId,
      GlobalIdEntity.Application
    );
  }

  async name() {
    return this.$get("name");
  }

  async firstName() {
    return this.$get("firstName");
  }

  async lastName() {
    return this.$get("lastName");
  }

  async email() {
    return this.$get("email");
  }

  async emailVerified() {
    return this.$get("emailVerified");
  }

  async imageUrl() {
    return this.$get("image");
  }

  async status() {
    return (await this.$get("status")).toUpperCase();
  }

  async security() {
    await this.$get("id");
    const security = await this.$ctx.loaders.applicationUserSecurity.load(
      this.$props
    );
    return new ApplicationUserSecurityMetadataResolver(security, this.$ctx);
  }

  async linkedAccounts() {
    await this.$get("id");
    const security = await this.$ctx.loaders.applicationUserSecurity.load(
      this.$props
    );
    return security.linkedAccounts.map(
      (account) => new ApplicationUserLinkedAccountResolver(account, this.$ctx)
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}

/** Safe application user security metadata resolver. */
export class ApplicationUserSecurityMetadataResolver extends IAMType<ApplicationUserSecurityView> {
  activeSessionCount() {
    return this.$props.activeSessionCount;
  }

  linkedAccountCount() {
    return this.$props.linkedAccountCount;
  }

  hasPasswordLogin() {
    return this.$props.hasPasswordLogin;
  }
}

/** Application user linked account resolver. */
export class ApplicationUserLinkedAccountResolver extends IAMType<ApplicationUserLinkedAccountView> {
  id() {
    return encodeGlobalIdByType(
      this.$props.id,
      GlobalIdEntity.ApplicationUserLinkedAccount
    );
  }

  provider() {
    return this.$props.provider;
  }

  isOnlyLoginMethod() {
    return this.$props.isOnlyLoginMethod;
  }

  createdAt() {
    return this.$props.createdAt;
  }

  updatedAt() {
    return this.$props.updatedAt;
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
