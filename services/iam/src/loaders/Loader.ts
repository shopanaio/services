import type { Repository } from "../repositories/Repository.js";
import { MemberLoader } from "./MemberLoader.js";

/**
 * Loader - aggregates all data loaders for IAM service
 * Create new instance per request for proper batching
 */
export class Loader {
  public readonly member: MemberLoader["member"];

  constructor(repository: Repository) {
    const memberLoader = new MemberLoader(repository);
    this.member = memberLoader.member;
  }
}
