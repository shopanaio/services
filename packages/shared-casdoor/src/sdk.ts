import { type User } from "@shopana/casdoor-node-sdk";
import { CasdoorClient } from "./client.js";

/**
 * Get pagination users input
 */
export interface GetPaginationUsersInput {
  owner: string;
  page: number;
  pageSize: number;
  field?: string;
  value?: string;
  sortField?: string;
  sortOrder?: string;
}

/**
 * Casdoor SDK methods for user management
 * Wrapper over @shopana/casdoor-node-sdk
 */
export class CasdoorSdk {
  constructor(private readonly casdoorClient: CasdoorClient) {}

  /**
   * Get paginated users list
   */
  async getOwnPaginationUsers(
    input: GetPaginationUsersInput
  ): Promise<{ users: User[]; total: number }> {
    if (!input.owner) {
      throw new Error("owner is required");
    }
    if (input.page < 1) {
      throw new Error("page must be >= 1");
    }
    if (input.pageSize < 1 || input.pageSize > 100) {
      throw new Error("pageSize must be between 1 and 100");
    }

    const queryMap: Record<string, string> = {};

    if (input.field && input.value) {
      queryMap.field = input.field;
      queryMap.value = input.value;
    }

    if (input.sortField && input.sortOrder) {
      queryMap.sortField = input.sortField;
      queryMap.sortOrder = input.sortOrder;
    }

    // Note: SDK's getPaginationUsers uses client's organizationName as owner
    // For custom owner, we need to override
    const result = await this.casdoorClient.sdkClient.getPaginationUsers(
      input.page,
      input.pageSize,
      queryMap
    );

    return { users: result.users, total: result.total };
  }

  /**
   * Get user by owner and name
   */
  async getOwnUser(owner: string, name: string): Promise<User | null> {
    // SDK's getUser uses id format: org/name
    return this.casdoorClient.sdkClient.getUser(name);
  }

  /**
   * Get user by email
   */
  async getOwnUserByEmail(owner: string, email: string): Promise<User | null> {
    return this.casdoorClient.sdkClient.getUserByEmail(email);
  }

  /**
   * Get user by phone
   */
  async getOwnUserByPhone(owner: string, phone: string): Promise<User | null> {
    return this.casdoorClient.sdkClient.getUserByPhone(phone);
  }

  /**
   * Get user by user ID
   */
  async getOwnUserByUserId(
    owner: string,
    userId: string
  ): Promise<User | null> {
    return this.casdoorClient.sdkClient.getUserByUserId(userId);
  }

  /**
   * Request password recovery (send reset email)
   */
  async requestPasswordRecovery(
    org: string,
    email: string,
    app: string
  ): Promise<void> {
    const response = await this.casdoorClient.sdkClient.doPost(
      "send-reset-email",
      null,
      {
        userOwner: org,
        userName: email,
        application: app,
      }
    );

    if (response.status !== "ok") {
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
    const response = await this.casdoorClient.sdkClient.doPost(
      "reset-password",
      null,
      {
        userOwner: org,
        userName: email,
        application: app,
        password: newPassword,
        code,
      }
    );

    if (response.status !== "ok") {
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
    const response = await this.casdoorClient.sdkClient.doPost(
      "verify-email",
      null,
      {
        userOwner: org,
        userName: email,
        application: app,
        code,
      }
    );

    if (response.status !== "ok") {
      throw new Error(response.msg || "Failed to verify email");
    }
  }

  /**
   * Add a new user
   */
  async addUser(user: Partial<User>): Promise<boolean> {
    return this.casdoorClient.sdkClient.addUser(user);
  }

  /**
   * Update user
   */
  async updateUser(user: Partial<User>): Promise<boolean> {
    return this.casdoorClient.sdkClient.updateUser(user);
  }

  /**
   * Delete user
   */
  async deleteUser(user: Partial<User>): Promise<boolean> {
    return this.casdoorClient.sdkClient.deleteUser(user);
  }

  /**
   * Set user password
   */
  async setPassword(
    owner: string,
    name: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    return this.casdoorClient.sdkClient.setPassword(
      owner,
      name,
      oldPassword,
      newPassword
    );
  }

  /**
   * Send email
   */
  async sendEmail(
    title: string,
    content: string,
    sender: string,
    receivers: string[]
  ): Promise<void> {
    await this.casdoorClient.sdkClient.sendEmail(
      title,
      content,
      sender,
      ...receivers
    );
  }
}
