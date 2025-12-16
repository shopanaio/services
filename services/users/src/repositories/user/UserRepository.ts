import type { Role as CasdoorRole, User } from "@shopana/casdoor-node-sdk";
import type { CasdoorService } from "@shopana/shared-casdoor";
import type {
  LocaleCode,
  Role,
} from "../../resolvers/admin/interfaces/index.js";

/**
 * User data structure returned by repository
 */
export interface UserData {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phone: string | null;
  locale: LocaleCode | null;
  isAdmin: boolean;
  isForbidden: boolean;
  isDeleted: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

/**
 * User create input
 */
export interface UserCreateInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  locale?: LocaleCode;
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
  locale?: LocaleCode;
  isAdmin?: boolean;
  isForbidden?: boolean;
  roles?: string[];
}

/**
 * Repository for admin users (CMS/backoffice)
 */
export class UserRepository {
  constructor(
    private readonly casdoor: CasdoorService,
    private readonly organization: string,
    private readonly application: string
  ) {}

  /**
   * Convert Casdoor user to UserData
   */
  private toUserData(user: User): UserData {
    return {
      id: user.id || user.name,
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      avatar: user.avatar || null,
      phone: user.phone || null,
      locale: (user.language as LocaleCode) || null,
      isAdmin: user.isAdmin ?? false,
      isForbidden: user.isForbidden ?? false,
      isDeleted: user.isDeleted ?? false,
      roles: this.mapRoles(user.roles),
      createdAt: user.createdTime,
      updatedAt: user.updatedTime,
    };
  }

  /**
   * Map Casdoor roles to our Role interface
   */
  private mapRoles(roles?: CasdoorRole[]): Role[] {
    if (!roles) return [];
    return roles.map((r) => ({
      owner: r.owner,
      name: r.name,
      displayName: r.displayName || null,
      description: r.description || null,
      isEnabled: r.isEnabled ?? true,
    }));
  }

  /**
   * Get username from email (Casdoor convention)
   */
  private getUserName(email: string): string {
    return email.replace(/@/g, "_");
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserData | null> {
    const user = await this.casdoor.getOwnUserByUserId(this.organization, id);
    if (!user) return null;
    // Only return admin users (not customers)
    if (user.type !== "admin-user" && user.type !== "normal-user") return null;
    return this.toUserData(user);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserData | null> {
    const user = await this.casdoor.getOwnUserByEmail(this.organization, email);
    if (!user) return null;
    return this.toUserData(user);
  }

  /**
   * Get paginated list of admin users
   */
  async findMany(options: {
    page: number;
    pageSize: number;
    field?: string;
    value?: string;
  }): Promise<{ users: UserData[]; total: number }> {
    const result = await this.casdoor.getOwnPaginationUsers({
      owner: this.organization,
      page: options.page,
      pageSize: options.pageSize,
      field: options.field,
      value: options.value,
    });

    return {
      users: result.users.map((u) => this.toUserData(u)),
      total: result.total,
    };
  }

  /**
   * Create a new admin user
   */
  async create(input: UserCreateInput): Promise<UserData> {
    const userName = this.getUserName(input.email);

    const userData: Partial<User> = {
      owner: this.organization,
      name: userName,
      email: input.email,
      password: input.password,
      firstName: input.firstName || "",
      lastName: input.lastName || "",
      phone: input.phone || "",
      language: input.locale || "uk",
      isAdmin: input.isAdmin ?? false,
      type: "normal-user",
      signupApplication: this.application,
    };

    const success = await this.casdoor.addUser(userData);
    if (!success) {
      throw new Error("Failed to create user");
    }

    // Fetch the created user
    const user = await this.findByEmail(input.email);
    if (!user) {
      throw new Error("User created but not found");
    }

    return user;
  }

  /**
   * Update an existing user
   */
  async update(id: string, input: UserUpdateInput): Promise<UserData> {
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
      ...(input.locale !== undefined && { language: input.locale }),
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
