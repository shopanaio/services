import { CasdoorClient } from "./client.js";
import {
  CasdoorUser,
  CasdoorResponse,
  GetPaginationUsersInput,
  StatusOk,
} from "./types.js";

/**
 * Casdoor SDK methods for user management
 */
export class CasdoorSdk {
  constructor(private readonly client: CasdoorClient) {}

  /**
   * Get paginated users list
   */
  async getOwnPaginationUsers(
    input: GetPaginationUsersInput
  ): Promise<{ users: CasdoorUser[]; total: number }> {
    // Validate input
    if (!input.owner) {
      throw new Error("owner is required");
    }
    if (input.page < 1) {
      throw new Error("page must be >= 1");
    }
    if (input.pageSize < 1 || input.pageSize > 100) {
      throw new Error("pageSize must be between 1 and 100");
    }

    const queryMap: Record<string, string> = {
      owner: input.owner,
      p: String(input.page),
      pageSize: String(input.pageSize),
    };

    if (input.field && input.value) {
      queryMap.field = input.field;
      queryMap.value = input.value;
    }

    if (input.sortField && input.sortOrder) {
      queryMap.sortField = input.sortField;
      queryMap.sortOrder = input.sortOrder;
    }

    const url = this.client.getUrl("get-users", queryMap);
    const response = await this.client.doGetResponse<CasdoorUser[]>(url);

    if (!response.data) {
      throw new Error("Response data format is incorrect");
    }

    const total =
      typeof response.data2 === "number" ? response.data2 : response.data.length;

    return { users: response.data, total };
  }

  /**
   * Get user by owner and name
   */
  async getOwnUser(owner: string, name: string): Promise<CasdoorUser | null> {
    const url = this.client.getUrl("get-user", {
      id: `${owner}/${name}`,
    });

    const bytes = await this.client.doGetBytes(url);
    const user = JSON.parse(bytes.toString()) as CasdoorUser | null;
    return user;
  }

  /**
   * Get user by email
   */
  async getOwnUserByEmail(
    owner: string,
    email: string
  ): Promise<CasdoorUser | null> {
    const url = this.client.getUrl("get-user", {
      owner,
      email,
    });

    const bytes = await this.client.doGetBytes(url);
    const user = JSON.parse(bytes.toString()) as CasdoorUser | null;
    return user;
  }

  /**
   * Get user by phone
   */
  async getOwnUserByPhone(
    owner: string,
    phone: string
  ): Promise<CasdoorUser | null> {
    const url = this.client.getUrl("get-user", {
      owner,
      phone,
    });

    const bytes = await this.client.doGetBytes(url);
    const user = JSON.parse(bytes.toString()) as CasdoorUser | null;
    return user;
  }

  /**
   * Get user by user ID
   */
  async getOwnUserByUserId(
    owner: string,
    userId: string
  ): Promise<CasdoorUser | null> {
    const url = this.client.getUrl("get-user", {
      owner,
      userId,
    });

    const bytes = await this.client.doGetBytes(url);
    const user = JSON.parse(bytes.toString()) as CasdoorUser | null;
    return user;
  }

  /**
   * Request password recovery (send reset email)
   */
  async requestPasswordRecovery(
    org: string,
    email: string,
    app: string
  ): Promise<void> {
    const response = await this.client.doPost<unknown>(
      "send-reset-email",
      {},
      {
        userOwner: org,
        userName: email,
        application: app,
      }
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to send reset email");
    }
  }

  /**
   * Reset password by code
   */
  async resetPassword(
    org: string,
    email: string,
    app: string,
    newPassword: string,
    code: string
  ): Promise<void> {
    const response = await this.client.doPost<unknown>(
      "reset-password",
      {},
      {
        userOwner: org,
        userName: email,
        application: app,
        password: newPassword,
        code,
      }
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to reset password");
    }
  }

  /**
   * Verify email by code
   */
  async verifyEmail(
    org: string,
    email: string,
    app: string,
    code: string
  ): Promise<void> {
    const response = await this.client.doPost<unknown>(
      "verify-email",
      {},
      {
        userOwner: org,
        userName: email,
        application: app,
        code,
      }
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to verify email");
    }
  }

  /**
   * Add a new user
   */
  async addUser(user: Partial<CasdoorUser>): Promise<CasdoorUser> {
    const response = await this.client.doPost<CasdoorUser>(
      "add-user",
      {},
      user
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to add user");
    }

    if (!response.data) {
      throw new Error("No user data returned");
    }

    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(user: Partial<CasdoorUser>): Promise<CasdoorUser> {
    const response = await this.client.doPost<CasdoorUser>(
      "update-user",
      {
        id: `${user.owner}/${user.name}`,
      },
      user
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to update user");
    }

    if (!response.data) {
      throw new Error("No user data returned");
    }

    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(owner: string, name: string): Promise<void> {
    const response = await this.client.doPost<unknown>(
      "delete-user",
      {},
      {
        owner,
        name,
      }
    );

    if (response.status !== StatusOk) {
      throw new Error(response.msg || "Failed to delete user");
    }
  }
}
