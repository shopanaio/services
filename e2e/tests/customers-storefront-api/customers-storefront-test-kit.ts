/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createHash } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import postgres from 'postgres';
import { HeadlessTestKit, type UserError } from '../headless-admin-api/headless-test-kit';
import {
  defaultPassword,
  endpoint,
  formHeaders,
  jsonHeaders,
} from '../application-auth-password/application-auth-test-kit';

export type Api = ApiFixtures['api'];
export type Sql = ReturnType<typeof postgres>;

export interface GraphQLErrorShape {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string; [key: string]: unknown };
}

export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorShape[];
}

export interface StorefrontRealm {
  applicationId: string;
  clientId: string;
  organizationId: string;
  resource: string;
  storeId: string;
  storeGlobalId: string;
  storeName: string;
  redirectUri: string;
  origin: string;
}

export interface StorefrontCustomer {
  id: string;
  rawId: string;
  iamPrincipalId: string;
  email: string;
  revision: number;
}

export interface CustomerUserError extends UserError {
  retryable: boolean;
}

export const USER_ERROR_FIELDS = 'field message code retryable';
export const PAGE_INFO_FIELDS = 'hasNextPage hasPreviousPage startCursor endCursor';
export const CUSTOMER_SUMMARY_FIELDS = `
  id revision accountStatus prefix firstName middleName lastName suffix displayName
  preferredLocale dateOfBirth gender companyName jobTitle
  emailAddress { emailAddress verified }
  phoneNumber { phoneNumber verified }
  createdAt updatedAt
`;
export const ADDRESS_FIELDS = `
  id label prefix firstName middleName lastName suffix name company address1 address2
  city province provinceCode country countryCode zip phone isDefaultShipping isDefaultBilling
  validationStatus validatedAt formatted formattedArea createdAt updatedAt
`;
export const CONSENT_FIELDS = 'channel state optInLevel consentedAt withdrawnAt updatedAt';
export const TAX_IDENTIFIER_FIELDS = `
  id identifierType countryCode value status isPrimary verifiedAt validFrom validTo createdAt updatedAt
`;
export const DATA_REQUEST_FIELDS = `
  id type status correctionDetails resultFile { id } rejectionReason requestedAt dueAt startedAt finishedAt updatedAt
`;
export const WISHLIST_FIELDS = `
  id name isDefault createdAt updatedAt
`;
export const WISHLIST_ITEM_FIELDS = `
  id addedAt product { id }
`;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';
const CLIENT_GRAPHQL_URL = process.env.CLIENT_GRAPHQL_URL ?? 'http://127.0.0.1:14000/graphql';
const ACTION_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

export class CustomersStorefrontTestKit {
  readonly sql = postgres(DATABASE_URL, { max: 1 });
  readonly headless: HeadlessTestKit;

  realm!: StorefrontRealm;
  customer!: StorefrontCustomer;
  accessToken = '';
  channelToken = '';

  constructor(
    readonly api: Api,
    readonly request: APIRequestContext,
  ) {
    this.headless = new HeadlessTestKit(api, request);
  }

  async setup(options: { customer?: boolean; channel?: boolean } = {}): Promise<void> {
    const withCustomer = options.customer ?? true;
    const withChannel = options.channel ?? true;
    await this.api.session.setupUserAndStore({
      email: `storefront-${crypto.randomUUID()}@playwright.dev`,
    });
    this.realm = await this.waitForRealm();

    if (withChannel) {
      await this.headless.install();
      const created = await this.headless.create('Customers storefront e2e', crypto.randomUUID(), [
        'storefront.customer.read',
        'storefront.customer.write',
        'storefront.catalog.read',
      ]);
      expect(created.userErrors).toEqual([]);
      expect(created.initialStorefrontCredentials).not.toBeNull();
      this.channelToken = created.initialStorefrontCredentials!.publicAccessToken;
    }

    if (withCustomer) {
      await this.enablePasswordAuthentication();
      const email = `customer-${crypto.randomUUID()}@playwright.dev`;
      const signup = await this.request.post(endpoint(this.realm, '/sign-up/email'), {
        headers: jsonHeaders(this.realm.origin),
        data: {
          name: 'Storefront Customer',
          email,
          password: defaultPassword,
        },
      });
      expect(signup.ok(), await signup.text()).toBe(true);
      this.accessToken = await this.issueAccessToken(email);
      this.customer = await this.waitForCustomer(email);
    }
  }

  async close(): Promise<void> {
    await Promise.all([this.sql.end(), this.headless.close()]);
  }

  async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
    options: {
      accessToken?: string | null;
      channelToken?: string | null;
      headers?: Record<string, string>;
    } = {},
  ): Promise<GraphQLResponse<T>> {
    const accessToken = options.accessToken === undefined ? this.accessToken : options.accessToken;
    const channelToken =
      options.channelToken === undefined ? this.channelToken : options.channelToken;
    const response = await this.request.post(CLIENT_GRAPHQL_URL, {
      headers: {
        'content-type': 'application/json',
        ...(channelToken ? { 'x-shopana-storefront-access-token': channelToken } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      data: { query, variables },
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json() as Promise<GraphQLResponse<T>>;
  }

  async withActionFault<T>(action: string, run: () => Promise<T>): Promise<T> {
    const payload = { action, storeId: this.realm.storeId };
    const enable = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/fault`, {
      data: payload,
    });
    expect(enable.ok(), await enable.text()).toBe(true);
    try {
      return await run();
    } finally {
      const restore = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/restore`, {
        data: payload,
      });
      expect(restore.ok(), await restore.text()).toBe(true);
    }
  }

  async issueCustomerAccessToken(email = this.customer.email): Promise<string> {
    return this.issueAccessToken(email);
  }

  async expireAccessTokenSession(accessToken: string): Promise<void> {
    const encodedClaims = accessToken.split('.')[1];
    expect(encodedClaims).toBeTruthy();
    const claims = JSON.parse(Buffer.from(encodedClaims!, 'base64url').toString('utf8')) as {
      sid?: string;
    };
    expect(claims.sid).toEqual(expect.any(String));
    const rows = await this.sql`
      update iam.application_session
      set expires_at = now() - interval '1 second'
      where application_id = ${this.realm.applicationId}
        and id = ${claims.sid!}
      returning id
    `;
    expect(rows).toHaveLength(1);
  }

  async revokeAccessToken(accessToken: string): Promise<void> {
    const response = await this.request.post(endpoint(this.realm, '/oauth2/revoke'), {
      headers: formHeaders(this.realm.origin),
      form: {
        client_id: this.realm.clientId,
        token: accessToken,
        token_type_hint: 'access_token',
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
  }

  async createForeignStore(): Promise<Api['session']['project']> {
    const current = this.api.session.project;
    try {
      await this.api.session.setupProject();
      return this.api.session.project;
    } finally {
      this.api.session.project = current;
    }
  }

  async inProject<T>(project: Api['session']['project'], run: () => Promise<T>): Promise<T> {
    const current = this.api.session.project;
    this.api.session.project = project;
    try {
      return await run();
    } finally {
      this.api.session.project = current;
    }
  }

  customerQuery<T>(
    selection: string,
    variables?: Record<string, unknown>,
    variableDefinitions = '',
    options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {},
  ): Promise<GraphQLResponse<{ customer: T | null }>> {
    return this.graphql<{ customer: T | null }>(
      `query Customer${variableDefinitions ? `(${variableDefinitions})` : ''} {
        customer { ${selection} }
      }`,
      variables,
      options,
    );
  }

  mutation<T>(
    field: string,
    inputType: string,
    input: Record<string, unknown>,
    selection: string,
    options: Parameters<CustomersStorefrontTestKit['graphql']>[2] = {},
  ): Promise<GraphQLResponse<{ payload: T }>> {
    return this.graphql<{ payload: T }>(
      `mutation StorefrontMutation($input: ${inputType}!) {
        payload: ${field}(input: $input) { ${selection} }
      }`,
      { input },
      options,
    );
  }

  async currentCustomer<T>(selection: string): Promise<T> {
    const response = await this.customerQuery<T>(selection);
    expect(response.errors).toBeUndefined();
    expect(response.data?.customer).not.toBeNull();
    return response.data!.customer!;
  }

  async revision(): Promise<number> {
    return (await this.currentCustomer<{ revision: number }>('revision')).revision;
  }

  id(type: string, rawId = crypto.randomUUID()): string {
    return composeGlobalId(type, rawId);
  }

  async updateCustomerRow(
    values: Record<string, string | number | boolean | Date | null>,
    customerId = this.customer.rawId,
  ): Promise<void> {
    const entries = Object.entries(values);
    if (entries.length === 0) return;
    const columns = entries.map(([name]) => `"${toSnakeCase(name)}"`);
    const parameters = entries.map(([, value]) => value);
    const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
    await this.sql.unsafe(
      `update customers.customer set ${assignments.join(', ')} where id = $${entries.length + 1}`,
      [...parameters, customerId],
    );
  }

  async rowCount(table: string, customerId = this.customer.rawId): Promise<number> {
    const [row] = await this.sql.unsafe<{ count: number }[]>(
      `select count(*)::int as count from customers.${table} where customer_id = $1`,
      [customerId],
    );
    return row!.count;
  }

  async customerRow(): Promise<Record<string, unknown>> {
    const [row] = await this.sql`
      select * from customers.customer where id = ${this.customer.rawId}
    `;
    return row!;
  }

  async seedAddress(
    values: Partial<{
      customerId: string;
      storeId: string;
      address1: string;
      city: string;
      countryCode: string;
      firstName: string;
      lastName: string;
      defaultShipping: boolean;
      defaultBilling: boolean;
      createdAt: Date;
    }> = {},
  ): Promise<{ id: string; globalId: string }> {
    const id = crypto.randomUUID();
    const customerId = values.customerId ?? this.customer.rawId;
    const storeId = values.storeId ?? this.realm.storeId;
    const city = values.city ?? 'Kyiv';
    await this.sql`
      insert into customers.customer_address (
        id, store_id, customer_id, first_name, last_name, address1, city,
        city_key, country_code, is_default_shipping, is_default_billing, created_at
      ) values (
        ${id}, ${storeId}, ${customerId}, ${values.firstName ?? 'Ada'},
        ${values.lastName ?? 'Lovelace'}, ${values.address1 ?? '1 Test Street'},
        ${city}, ${city.trim().toLocaleLowerCase('en-US')},
        ${values.countryCode ?? 'UA'}, ${values.defaultShipping ?? false},
        ${values.defaultBilling ?? false}, ${values.createdAt ?? new Date()}
      )
    `;
    return { id, globalId: this.id('CustomerAddress', id) };
  }

  async seedTaxIdentifier(
    values: Partial<{
      customerId: string;
      storeId: string;
      identifierType: string;
      countryCode: string | null;
      value: string;
      status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
      isPrimary: boolean;
      createdAt: Date;
    }> = {},
  ): Promise<{ id: string; globalId: string }> {
    const id = crypto.randomUUID();
    const value = values.value ?? `VAT-${crypto.randomUUID()}`;
    await this.sql`
      insert into customers.customer_tax_identifier (
        id, store_id, customer_id, identifier_type, country_code, value,
        normalized_value, status, is_primary, verified_at, created_at
      ) values (
        ${id}, ${values.storeId ?? this.realm.storeId},
        ${values.customerId ?? this.customer.rawId}, ${values.identifierType ?? 'VAT'},
        ${values.countryCode === undefined ? 'UA' : values.countryCode}, ${value},
        ${value.trim().toLocaleLowerCase('en-US')}, ${values.status ?? 'UNVERIFIED'},
        ${values.isPrimary ?? false},
        ${values.status === 'VERIFIED' ? new Date() : null},
        ${values.createdAt ?? new Date()}
      )
    `;
    return { id, globalId: this.id('CustomerTaxIdentifier', id) };
  }

  async seedDataRequest(
    values: Partial<{
      customerId: string;
      storeId: string;
      type: 'ACCESS' | 'EXPORT' | 'CORRECTION' | 'ERASURE';
      status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
      requestedAt: Date;
      resultFileId: string | null;
    }> = {},
  ): Promise<{ id: string; globalId: string; updatedAt: string }> {
    const id = crypto.randomUUID();
    const status = values.status ?? 'PENDING';
    const requestedAt = values.requestedAt ?? new Date();
    const finishedAt = ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)
      ? new Date(Math.max(Date.now(), requestedAt.getTime()))
      : null;
    const [row] = await this.sql<{ updatedAt: string }[]>`
      insert into customers.customer_data_request (
        id, store_id, customer_id, type, status, requested_by_type,
        requested_by_id, idempotency_key, request_metadata, result_file_id,
        rejection_reason, requested_at, started_at, finished_at
      ) values (
        ${id}, ${values.storeId ?? this.realm.storeId},
        ${values.customerId ?? this.customer.rawId}, ${values.type ?? 'ACCESS'},
        ${status}, 'customer', ${values.customerId ?? this.customer.rawId},
        ${crypto.randomUUID()}, '{}'::jsonb, ${values.resultFileId ?? null},
        ${status === 'REJECTED' ? 'Rejected by test fixture' : null},
        ${requestedAt}, ${status === 'PROCESSING' ? requestedAt : null}, ${finishedAt}
      ) returning updated_at as "updatedAt"
    `;
    return { id, globalId: this.id('CustomerDataRequest', id), updatedAt: row!.updatedAt };
  }

  async seedWishlist(
    values: Partial<{
      customerId: string;
      storeId: string;
      name: string;
      isDefault: boolean;
      createdAt: Date;
    }> = {},
  ): Promise<{ id: string; globalId: string; updatedAt: string }> {
    const id = crypto.randomUUID();
    const name = values.name ?? `Wishlist ${crypto.randomUUID().slice(0, 8)}`;
    const [row] = await this.sql<{ updatedAt: string }[]>`
      insert into customers.customer_wishlist (
        id, store_id, customer_id, name, normalized_name, is_default, created_at
      ) values (
        ${id}, ${values.storeId ?? this.realm.storeId},
        ${values.customerId ?? this.customer.rawId}, ${name},
        ${name.normalize('NFKC').toLocaleLowerCase('en-US')},
        ${values.isDefault ?? false}, ${values.createdAt ?? new Date()}
      ) returning updated_at as "updatedAt"
    `;
    return { id, globalId: this.id('CustomerWishlist', id), updatedAt: row!.updatedAt };
  }

  async createGuestCustomer(
    values: Partial<{ storeId: string; email: string; lifecycleStatus: string }> = {},
  ): Promise<{ id: string; globalId: string }> {
    const id = crypto.randomUUID();
    const email = values.email ?? `guest-${crypto.randomUUID()}@playwright.dev`;
    await this.sql`
      insert into customers.customer (
        id, store_id, lifecycle_status, account_status, email, normalized_email,
        email_domain_normalized, email_verified, source, revision
      ) values (
        ${id}, ${values.storeId ?? this.realm.storeId},
        ${values.lifecycleStatus ?? 'ACTIVE'}, 'GUEST', ${email},
        ${email.toLocaleLowerCase('en-US')}, 'playwright.dev', false, 'e2e', 1
      )
    `;
    return { id, globalId: this.id('Customer', id) };
  }

  expectNoTransportErrors(response: GraphQLResponse<unknown>): void {
    expect(response.errors).toBeUndefined();
    expect(response.data).toBeDefined();
  }

  expectBadUserInput(response: GraphQLResponse<unknown>): void {
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
  }

  expectUserError(
    errors: CustomerUserError[],
    code: string | RegExp,
    options: Partial<{ field: string[]; retryable: boolean }> = {},
  ): CustomerUserError {
    expect(errors).not.toHaveLength(0);
    const error = errors[0]!;
    if (typeof code === 'string') expect(error.code).toBe(code);
    else expect(error.code).toMatch(code);
    expect(error.message).toEqual(expect.any(String));
    if (options.field) expect(error.field).toEqual(options.field);
    if (options.retryable !== undefined) {
      expect(error.retryable).toBe(options.retryable);
    }
    expect(JSON.stringify(error)).not.toMatch(/stack|node_modules|postgres|select\s/iu);
    return error;
  }

  private async waitForRealm(): Promise<StorefrontRealm> {
    const storeId = decodeGlobalId(this.api.session.project.id).id;
    let realm: StorefrontRealm | null = null;
    await expect
      .poll(
        async () => {
          const [row] = await this.sql<StorefrontRealm[]>`
            select storefront.application_id as "applicationId",
                   client.client_id as "clientId",
                   storefront.organization_id as "organizationId",
                   configuration.resource,
                   storefront.store_id as "storeId",
                   client.redirect_uris[1] as "redirectUri",
                   origin.origin
            from customers.storefront_auth_configuration storefront
            join iam.application_auth_configuration configuration
              on configuration.application_id = storefront.application_id
            join iam.application_auth_origin origin
              on origin.application_id = storefront.application_id
            join iam.application_oauth_client client
              on client.application_id = storefront.application_id
             and client.disabled = false and client.deleted_at is null
            where storefront.store_id = ${storeId}
            limit 1
          `;
          realm = row
            ? {
                ...row,
                storeGlobalId: this.api.session.project.id,
                storeName: this.api.session.project.name,
              }
            : null;
          return realm;
        },
        { timeout: 20_000, message: 'storefront IAM application was not provisioned' },
      )
      .not.toBeNull();
    return realm!;
  }

  private async enablePasswordAuthentication(): Promise<void> {
    await this.sql`
      update iam.application_auth_configuration
      set realm_enabled = true,
          registration_mode = 'open',
          password_sign_up_enabled = true,
          password_sign_in_enabled = true,
          email_verification_required = false,
          revision = revision + 1,
          updated_at = now()
      where application_id = ${this.realm.applicationId}
    `;
  }

  private async issueAccessToken(email: string): Promise<string> {
    const verifier = crypto.randomUUID().replaceAll('-', '').repeat(2);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const authorize = new URL(endpoint(this.realm, '/oauth2/authorize'));
    authorize.search = new URLSearchParams({
      client_id: this.realm.clientId,
      response_type: 'code',
      redirect_uri: this.realm.redirectUri,
      scope: 'openid profile email offline_access',
      state: crypto.randomUUID(),
      nonce: crypto.randomUUID(),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: this.realm.resource,
    }).toString();

    const capture = await this.request.get(authorize.toString(), { maxRedirects: 0 });
    expect(capture.status()).toBe(302);
    const captureLocation = requiredLocation(capture);
    const loginRedirect = await this.request.get(
      new URL(captureLocation, endpoint(this.realm, '')).toString(),
      { maxRedirects: 0 },
    );
    expect(loginRedirect.status()).toBe(303);
    const loginPage = await this.request.get(
      new URL(requiredLocation(loginRedirect), endpoint(this.realm, '')).toString(),
    );
    expect(loginPage.ok(), await loginPage.text()).toBe(true);
    const csrf = hiddenValue(await loginPage.text(), 'csrf');
    const login = await this.request.post(endpoint(this.realm, '/login/password'), {
      headers: {
        origin: this.realm.origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      form: { csrf, email, password: defaultPassword },
      maxRedirects: 0,
    });
    expect([302, 303], await login.text()).toContain(login.status());
    const callback = new URL(requiredLocation(login), this.realm.origin);
    const code = callback.searchParams.get('code');
    expect(code).toBeTruthy();

    const token = await this.request.post(endpoint(this.realm, '/oauth2/token'), {
      headers: formHeaders(this.realm.origin),
      form: {
        grant_type: 'authorization_code',
        code: code!,
        client_id: this.realm.clientId,
        redirect_uri: this.realm.redirectUri,
        code_verifier: verifier,
        resource: this.realm.resource,
      },
    });
    expect(token.ok(), await token.text()).toBe(true);
    const body = (await token.json()) as { access_token?: string };
    expect(body.access_token).toEqual(expect.any(String));
    return body.access_token!;
  }

  private async waitForCustomer(email: string): Promise<StorefrontCustomer> {
    let customer: StorefrontCustomer | null = null;
    await expect
      .poll(
        async () => {
          const [row] = await this.sql<
            {
              rawId: string;
              iamPrincipalId: string;
              email: string;
              revision: number;
            }[]
          >`
            select id as "rawId", iam_principal_id as "iamPrincipalId", email, revision
            from customers.customer
            where store_id = ${this.realm.storeId}
              and normalized_email = ${email.toLocaleLowerCase('en-US')}
              and deleted_at is null
          `;
          customer = row ? { ...row, id: composeGlobalId('Customer', row.rawId) } : null;
          return customer;
        },
        { timeout: 20_000, message: 'customer projection was not created' },
      )
      .not.toBeNull();
    return customer!;
  }
}

export function uniqueKey(prefix = 'e2e'): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function expectCanonicalEmptyConnection(connection: {
  edges: unknown[];
  nodes: unknown[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}): void {
  expect(connection).toEqual({
    edges: [],
    nodes: [],
    totalCount: 0,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  });
}

export function expectConnectionIntegrity<T extends { id: string }>(connection: {
  edges: { cursor: string; node: T }[];
  nodes: T[];
  totalCount: number;
}): void {
  expect(connection.nodes.map(({ id }) => id)).toEqual(connection.edges.map(({ node }) => node.id));
  expect(new Set(connection.edges.map(({ cursor }) => cursor)).size).toBe(connection.edges.length);
  expect(connection.totalCount).toBeGreaterThanOrEqual(connection.nodes.length);
}

function hiddenValue(html: string, name: string): string {
  const pattern = new RegExp(`<input[^>]+name=["']${name}["'][^>]+value=["']([^"']+)["']`, 'iu');
  const match = html.match(pattern);
  expect(match?.[1], `hidden input ${name} is missing`).toBeTruthy();
  return decodeHtml(match![1]!);
}

function requiredLocation(response: APIResponse): string {
  const location = response.headers().location;
  expect(location).toBeTruthy();
  return location!;
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/gu, (character) => `_${character.toLowerCase()}`);
}
