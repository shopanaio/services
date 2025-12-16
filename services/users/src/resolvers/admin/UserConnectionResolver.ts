import type { UserRelayInput } from "../../repositories/user/UserRepository.js";
import { UsersType } from "./UsersType.js";
import { UserResolver } from "./UserResolver.js";

export type UserConnectionInput = UserRelayInput;

/**
 * User connection resolver - handles Relay-style pagination
 */
export class UserConnectionResolver extends UsersType<
  UserConnectionInput,
  {
    edges: Array<{ cursor: string; nodeId: string }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
    totalCount: number;
  }
> {
  static fields = {
    edges: () => UserEdgeResolver,
  };

  async loadData() {
    const services = this.ctx.kernel.getServices();
    return services.repository.user.getConnection(this.value);
  }

  async edges() {
    const data = await this.getData();
    return data.edges;
  }

  async pageInfo() {
    const data = await this.getData();
    return data.pageInfo;
  }

  async totalCount() {
    const data = await this.getData();
    return data.totalCount;
  }
}

/**
 * User edge resolver
 */
export class UserEdgeResolver extends UsersType<
  { cursor: string; nodeId: string },
  { cursor: string; nodeId: string }
> {
  static fields = {
    node: () => UserResolver,
  };

  async loadData() {
    return this.value;
  }

  async cursor() {
    return this.value.cursor;
  }

  async node() {
    return this.value.nodeId;
  }
}
