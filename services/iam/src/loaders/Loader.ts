import type { Repository } from "../repositories/Repository.js";
import { MemberLoader } from "./MemberLoader.js";
import { RoleLoader } from "./RoleLoader.js";

/**
 * Loader - aggregates all data loaders for IAM service
 * Create new instance per request for proper batching
 */
export class Loader {
  public readonly member: MemberLoader["member"];
  public readonly role: RoleLoader["role"];
  public readonly rolePolicies: RoleLoader["rolePolicies"];
  public readonly rolesByDomain: RoleLoader["rolesByDomain"];

  constructor(repository: Repository) {
    const memberLoader = new MemberLoader(repository);
    const roleLoader = new RoleLoader(repository, repository.casbin);

    this.member = memberLoader.member;
    this.role = roleLoader.role;
    this.rolePolicies = roleLoader.rolePolicies;
    this.rolesByDomain = roleLoader.rolesByDomain;
  }
}
