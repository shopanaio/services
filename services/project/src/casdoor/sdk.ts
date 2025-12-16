import {
  GetPaginationUsers,
  GetUser,
  GetUserByEmail,
  GetUserByPhone,
  GetUserByUserId,
  AddUser,
  UpdateUser,
  DeleteUser,
  SetPassword,
  SendEmail,
  type User,
} from "@shopana/casdoor-node-sdk";
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

    // Note: SDK's GetPaginationUsers uses client's OrganizationName as owner
    // For custom owner, we need to override
    const result = await GetPaginationUsers(
      this.casdoorClient.sdkClient,
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
    // SDK's GetUser uses id format: org/name
    return GetUser(this.casdoorClient.sdkClient, name);
  }

  /**
   * Get user by email
   */
  async getOwnUserByEmail(owner: string, email: string): Promise<User | null> {
    return GetUserByEmail(this.casdoorClient.sdkClient, email);
  }

  /**
   * Get user by phone
   */
  async getOwnUserByPhone(owner: string, phone: string): Promise<User | null> {
    return GetUserByPhone(this.casdoorClient.sdkClient, phone);
  }

  /**
   * Get user by user ID
   */
  async getOwnUserByUserId(
    owner: string,
    userId: string
  ): Promise<User | null> {
    return GetUserByUserId(this.casdoorClient.sdkClient, userId);
  }

  /**
   * Request password recovery (send reset email)
   */
  async requestPasswordRecovery(
    org: string,
    email: string,
    app: string
  ): Promise<void> {
    const response = await this.casdoorClient.sdkClient.DoPost(
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
    const response = await this.casdoorClient.sdkClient.DoPost(
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
    const response = await this.casdoorClient.sdkClient.DoPost(
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
    return AddUser(this.casdoorClient.sdkClient, user);
  }

  /**
   * Update user
   */
  async updateUser(user: Partial<User>): Promise<boolean> {
    return UpdateUser(this.casdoorClient.sdkClient, user);
  }

  /**
   * Delete user
   */
  async deleteUser(user: Partial<User>): Promise<boolean> {
    return DeleteUser(this.casdoorClient.sdkClient, user);
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
    return SetPassword(
      this.casdoorClient.sdkClient,
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
  ): Promise<boolean> {
    return SendEmail(
      this.casdoorClient.sdkClient,
      title,
      content,
      sender,
      receivers
    );
  }
}
