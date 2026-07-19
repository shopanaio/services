import type { Repository } from "../repositories/Repository.js";
import { MemberLoader } from "./MemberLoader.js";
import { RoleLoader } from "./RoleLoader.js";
import { ApplicationLoader } from "./ApplicationLoader.js";
import { ApplicationAuthAdminLoader } from "./ApplicationAuthAdminLoader.js";
import { ApplicationUserLoader } from "./ApplicationUserLoader.js";

/**
 * Loader - aggregates all data loaders for IAM service
 * Create new instance per request for proper batching
 */
export class Loader {
  public readonly member: MemberLoader["member"];
  public readonly role: RoleLoader["role"];
  public readonly rolePermissions: RoleLoader["rolePermissions"];
  public readonly rolesByDomain: RoleLoader["rolesByDomain"];
  public readonly application: ApplicationLoader["application"];
  public readonly applicationAuthAdmin: ApplicationAuthAdminLoader["applicationAuthAdmin"];
  public readonly applicationUser: ApplicationUserLoader["applicationUser"];
  public readonly applicationUserSecurity: ApplicationUserLoader["applicationUserSecurity"];

  constructor(repository: Repository) {
    const memberLoader = new MemberLoader(repository);
    const roleLoader = new RoleLoader(repository, repository.casbin);
    const applicationLoader = new ApplicationLoader(repository);
    const applicationAuthAdminLoader = new ApplicationAuthAdminLoader(repository);
    const applicationUserLoader = new ApplicationUserLoader(repository);

    this.member = memberLoader.member;
    this.role = roleLoader.role;
    this.rolePermissions = roleLoader.rolePermissions;
    this.rolesByDomain = roleLoader.rolesByDomain;
    this.application = applicationLoader.application;
    this.applicationAuthAdmin =
      applicationAuthAdminLoader.applicationAuthAdmin;
    this.applicationUser = applicationUserLoader.applicationUser;
    this.applicationUserSecurity =
      applicationUserLoader.applicationUserSecurity;
  }
}
