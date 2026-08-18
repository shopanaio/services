/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { latestEmailVerificationLink } from '@utils/mailpit';
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  type Json,
} from '../customers-admin-api/helpers';
import {
  CustomersStorefrontTestKit,
  type CustomerUserError,
  type GraphQLResponse,
} from '../customers-storefront-api/customers-storefront-test-kit';

export class CustomersE2ETestKit extends CustomersStorefrontTestKit {
  async enrollAdminCustomer(customer: Json, email = customer.email): Promise<void> {
    const previousVerificationLink = await latestEmailVerificationLink(
      email.trim().toLowerCase(),
    );
    const signup = await this.signUpWithPassword(email);
    expect(signup.ok(), await signup.text()).toBe(true);
    await this.verifyEmail(email, previousVerificationLink);
    this.accessToken = await this.issueCustomerAccessToken(email.trim().toLowerCase());
    await expect
      .poll(async () => {
        const [row] = await this.sql<
          { id: string; iamPrincipalId: string; revision: number; email: string }[]
        >`
          select id, iam_principal_id as "iamPrincipalId", revision, email
          from customers.customer
          where store_id = ${this.realm.storeId} and id = ${this.headless.rawId(customer.id)}
        `;
        if (!row?.iamPrincipalId) return null;
        this.customer = {
          id: customer.id,
          rawId: row.id,
          iamPrincipalId: row.iamPrincipalId,
          email: row.email,
          revision: row.revision,
        };
        return row.iamPrincipalId;
      })
      .not.toBeNull();
  }

  async adminAccountSettings(): Promise<Json> {
    let settings: Json | null = null;
    await expect
      .poll(async () => {
        const { data } = await this.api.admin.query<Json>(
          'customers-admin-api/CustomerAccountsSettings',
          { throwOnError: false, variables: {} },
        );
        settings = data?.customersQuery?.customerAccountsSettings ?? null;
        return settings;
      })
      .not.toBeNull();
    return settings!;
  }

  async adminAccountSettingsUpdate(
    enabledMethods: string[],
    expectedRevision?: number,
  ): Promise<Json> {
    const revision = expectedRevision ?? (await this.adminAccountSettings()).revision;
    const { data, errors } = await this.api.admin.mutation<Json>(
      'customers-admin-api/CustomerAccountsSettingsUpdate',
      { throwOnError: false, variables: { input: { enabledMethods, expectedRevision: revision } } },
    );
    expect(errors ?? []).toHaveLength(0);
    return data.customersMutation.customerAccountsSettingsUpdate;
  }

  async adminCustomer(id = this.customer.id): Promise<Json> {
    const customer = await getCustomer(this.api, id);
    expect(customer).not.toBeNull();
    return customer;
  }

  async adminCreate(input: Json = {}): Promise<Json> {
    return createCustomer(this.api, input);
  }

  async adminUpdate(
    operations: Json,
    customer: Json | undefined = undefined,
    expectedRevision?: number,
  ): Promise<Json> {
    const target = customer ?? (await this.adminCustomer());
    return updateCustomer(this.api, target, operations, expectedRevision ?? target.revision);
  }

  async storefrontUpdate(
    input: Json,
  ): Promise<
    GraphQLResponse<{ payload: { customer: Json | null; userErrors: CustomerUserError[] } }>
  > {
    return this.mutation(
      'customerUpdate',
      'CustomerUpdateInput',
      input,
      'customer { id revision prefix firstName middleName lastName suffix preferredLocale dateOfBirth gender companyName jobTitle emailAddress { emailAddress verified } phoneNumber { phoneNumber verified } } userErrors { field message code retryable }',
    );
  }

  async lifecycle(
    status: 'ACTIVE' | 'BLOCKED' | 'DISABLED',
    blockedReason?: string,
  ): Promise<Json> {
    const customer = await this.adminCustomer();
    const payload = await this.adminUpdate(
      { status: { status, ...(blockedReason ? { blockedReason } : {}) } },
      customer,
    );
    expect(payload.userErrors).toEqual([]);
    return payload.customer;
  }

  async storefrontCustomerOrNull(
    options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {},
  ) {
    const response = await this.graphql<{ customer: { id: string; revision: number } | null }>(
      'query CurrentCustomer { customer { id revision } }',
      undefined,
      options,
    );
    if (response.errors?.length) {
      expect(response.data ?? null).toBeNull();
      expect(response.errors).toEqual([
        expect.objectContaining({
          extensions: expect.objectContaining({ code: 'STOREFRONT_CUSTOMER_INVALID' }),
        }),
      ]);
      return null;
    }
    return response.data?.customer ?? null;
  }
}

export function onlyUserError(payload: { userErrors: CustomerUserError[] }, code: string): void {
  expect(payload.userErrors).toEqual([
    expect.objectContaining({ code, message: expect.any(String) }),
  ]);
}
