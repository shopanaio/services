/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
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
  ): Promise<GraphQLResponse<{ payload: { customer: Json | null; userErrors: CustomerUserError[] } }>> {
    return this.mutation(
      'customerUpdate',
      'CustomerUpdateInput',
      input,
      'customer { id revision prefix firstName middleName lastName suffix preferredLocale dateOfBirth gender companyName jobTitle emailAddress { emailAddress verified } phoneNumber { phoneNumber verified } } userErrors { field message code retryable }',
    );
  }

  async lifecycle(status: 'ACTIVE' | 'BLOCKED' | 'DISABLED', blockedReason?: string): Promise<Json> {
    const customer = await this.adminCustomer();
    const payload = await this.adminUpdate(
      { status: { status, ...(blockedReason ? { blockedReason } : {}) } },
      customer,
    );
    expect(payload.userErrors).toEqual([]);
    return payload.customer;
  }

  async storefrontCustomerOrNull(options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {}) {
    const response = await this.graphql<{ customer: { id: string; revision: number } | null }>(
      'query CurrentCustomer { customer { id revision } }',
      undefined,
      options,
    );
    expect(response.errors).toBeUndefined();
    return response.data?.customer ?? null;
  }
}

export function onlyUserError(payload: { userErrors: CustomerUserError[] }, code: string): void {
  expect(payload.userErrors).toEqual([
    expect.objectContaining({ code, message: expect.any(String) }),
  ]);
}
