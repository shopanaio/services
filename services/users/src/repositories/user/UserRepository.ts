import type { User } from "@shopana/casdoor-node-sdk";
import type { CasdoorService } from "@shopana/shared-casdoor";

/**
 * User create input
 */
export interface UserCreateInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  isAdmin?: boolean;
  roles?: string[];
}

/**
 * User update input
 */
export interface UserUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  isAdmin?: boolean;
  isForbidden?: boolean;
  roles?: string[];
}

// Re-export User type from SDK
export type { User };

/**
 * Repository for admin users (CMS/backoffice)
 * Returns User type from @shopana/casdoor-node-sdk
 */
export class UserRepository {
  constructor(
    private readonly casdoor: CasdoorService,
    private readonly organization: string,
    private readonly application: string
  ) {}

  /**
   * Get username from email (Casdoor convention)
   */
  private getUserName(email: string): string {
    return email.replace(/@/g, "_");
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.casdoor.getOwnUserByUserId(this.organization, id);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.casdoor.getOwnUserByEmail(this.organization, email);
  }

  /**
   * Find user by name
   */
  async findByName(name: string): Promise<User | null> {
    return this.casdoor.getOwnUser(this.organization, name);
  }

  /**
   * Get paginated list of users
   */
  async findMany(options: {
    page: number;
    pageSize: number;
    field?: string;
    value?: string;
  }): Promise<{ users: User[]; total: number }> {
    return this.casdoor.getOwnPaginationUsers({
      owner: this.organization,
      page: options.page,
      pageSize: options.pageSize,
      field: options.field,
      value: options.value,
    });
  }

  /**
   * Create a new user
   */
  async create(input: UserCreateInput): Promise<User> {
    const userName = this.getUserName(input.email);

    const userData: Partial<User> = {
      owner: this.organization,
      name: userName,
      email: input.email,
      password: input.password,
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      phone: input.phone || "",
      language: input.language || "uk",
      isAdmin: input.isAdmin ?? false,
      type: "normal-user",
      signupApplication: this.application,
    };

    const success = await this.casdoor.addUser(userData);
    if (!success) {
      throw new Error("Failed to create user");
    }

    const user = await this.findByEmail(input.email);
    if (!user) {
      throw new Error("User created but not found");
    }

    return user;
  }

  /**
   * Update an existing user
   */
  async update(id: string, input: UserUpdateInput): Promise<User> {
    const existingUser = await this.casdoor.getOwnUserByUserId(
      this.organization,
      id
    );
    if (!existingUser) {
      throw new Error("User not found");
    }

    const userData: Partial<User> = {
      owner: this.organization,
      name: existingUser.name,
      ...(input.email !== undefined && { email: input.email }),
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.language !== undefined && { language: input.language }),
      ...(input.isAdmin !== undefined && { isAdmin: input.isAdmin }),
      ...(input.isForbidden !== undefined && {
        isForbidden: input.isForbidden,
      }),
    };

    const success = await this.casdoor.updateUser(userData);
    if (!success) {
      throw new Error("Failed to update user");
    }

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error("User updated but not found");
    }

    return updatedUser;
  }

  /**
   * Delete a user (soft delete by default)
   */
  async delete(id: string, permanent: boolean = false): Promise<boolean> {
    const existingUser = await this.casdoor.getOwnUserByUserId(
      this.organization,
      id
    );
    if (!existingUser) {
      throw new Error("User not found");
    }

    if (permanent) {
      return this.casdoor.deleteUser({
        owner: this.organization,
        name: existingUser.name,
      });
    }

    // Soft delete - mark as deleted
    return this.casdoor.updateUser({
      owner: this.organization,
      name: existingUser.name,
      isDeleted: true,
    });
  }

  /**
   * Check user password
   */
  async checkPassword(email: string, password: string): Promise<boolean> {
    try {
      await this.casdoor.signIn({
        organization: this.organization,
        application: this.application,
        email,
        password,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set user password
   */
  async setPassword(
    id: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.casdoor.getOwnUserByUserId(this.organization, id);
    if (!user) {
      throw new Error("User not found");
    }

    return this.casdoor.setPassword(
      this.organization,
      user.name,
      oldPassword,
      newPassword
    );
  }
}
