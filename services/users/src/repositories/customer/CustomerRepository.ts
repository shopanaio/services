import type { User } from "@shopana/casdoor-node-sdk";
import type { CasdoorService } from "@shopana/shared-casdoor";

/**
 * Customer create input
 */
export interface CustomerCreateInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
}

/**
 * Customer update input
 */
export interface CustomerUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  avatar?: string;
  isForbidden?: boolean;
}

// Re-export User type from SDK as Customer alias
export type { User as Customer };

/**
 * Repository for storefront customers
 * Returns User type from @shopana/casdoor-node-sdk
 */
export class CustomerRepository {
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
   * Find customer by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.casdoor.getOwnUserByUserId(this.organization, id);
  }

  /**
   * Find customer by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.casdoor.getOwnUserByEmail(this.organization, email);
  }

  /**
   * Find customer by name
   */
  async findByName(name: string): Promise<User | null> {
    return this.casdoor.getOwnUser(this.organization, name);
  }

  /**
   * Get paginated list of customers
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
   * Create a new customer
   */
  async create(input: CustomerCreateInput): Promise<User> {
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
      type: "normal-user",
      signupApplication: this.application,
    };

    const success = await this.casdoor.addUser(userData);
    if (!success) {
      throw new Error("Failed to create customer");
    }

    const customer = await this.findByEmail(input.email);
    if (!customer) {
      throw new Error("Customer created but not found");
    }

    return customer;
  }

  /**
   * Update an existing customer
   */
  async update(id: string, input: CustomerUpdateInput): Promise<User> {
    const existingUser = await this.casdoor.getOwnUserByUserId(
      this.organization,
      id
    );
    if (!existingUser) {
      throw new Error("Customer not found");
    }

    const userData: Partial<User> = {
      owner: this.organization,
      name: existingUser.name,
      ...(input.email !== undefined && { email: input.email }),
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.language !== undefined && { language: input.language }),
      ...(input.avatar !== undefined && { avatar: input.avatar }),
      ...(input.isForbidden !== undefined && {
        isForbidden: input.isForbidden,
      }),
    };

    const success = await this.casdoor.updateUser(userData);
    if (!success) {
      throw new Error("Failed to update customer");
    }

    const updatedCustomer = await this.findById(id);
    if (!updatedCustomer) {
      throw new Error("Customer updated but not found");
    }

    return updatedCustomer;
  }

  /**
   * Delete a customer (soft delete by default)
   */
  async delete(id: string, permanent: boolean = false): Promise<boolean> {
    const existingUser = await this.casdoor.getOwnUserByUserId(
      this.organization,
      id
    );
    if (!existingUser) {
      throw new Error("Customer not found");
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
   * Sign in customer with email and password
   * Returns access token
   */
  async signIn(email: string, password: string): Promise<string> {
    return this.casdoor.signIn({
      organization: this.organization,
      application: this.application,
      email,
      password,
    });
  }

  /**
   * Set customer password
   */
  async setPassword(
    id: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.casdoor.getOwnUserByUserId(this.organization, id);
    if (!user) {
      throw new Error("Customer not found");
    }

    return this.casdoor.setPassword(
      this.organization,
      user.name,
      oldPassword,
      newPassword
    );
  }

  /**
   * Request password recovery (send reset email)
   */
  async requestPasswordRecovery(email: string): Promise<void> {
    await this.casdoor.requestPasswordRecovery(
      this.organization,
      email,
      this.application
    );
  }

  /**
   * Reset password using code
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    await this.casdoor.resetPassword(
      this.organization,
      email,
      this.application,
      newPassword,
      code
    );
  }

  /**
   * Verify email using code
   */
  async verifyEmail(email: string, code: string): Promise<void> {
    await this.casdoor.verifyEmail(
      this.organization,
      email,
      this.application,
      code
    );
  }
}
