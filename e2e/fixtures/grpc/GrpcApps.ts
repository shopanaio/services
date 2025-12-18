import { BaseGrpcClient } from './grpcClient';
import type { GqlRequestSession } from '@fixtures/api/gqlRequest';
import { expect } from '@playwright/test';
import * as grpc from '@grpc/grpc-js';

/**
 * Type definitions for gRPC Context response
 */
export interface GrpcContext {
  project?: GrpcProject;
  tenant?: GrpcUser;
  customer?: GrpcCustomer;
}

export interface GrpcProject {
  id: string;
  name: string;
  locale: string;
  currency: string;
  timezone: string;
  email: string;
  phoneNumber: string;
  country: string;
  locales: GrpcLocale[];
  currencies: GrpcCurrency[];
  stockStatuses: GrpcStockStatus[];
}

export interface GrpcUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  isReady: boolean;
  isVerified: boolean;
  language: string;
  phoneNumber?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrpcCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isBlocked: boolean;
  isVerified: boolean;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrpcLocale {
  code: string;
  isActive: boolean;
}

export interface GrpcCurrency {
  code: string;
  isActive: boolean;
  exchangeRate: number;
}

export interface GrpcStockStatus {
  code: string;
}

/**
 * Fixture for testing gRPC Apps API
 */
export class GrpcApps extends BaseGrpcClient {
  constructor(session: GqlRequestSession) {
    super(session, 'ContextService');
  }

  /**
   * Fetch context via gRPC GetContext method
   */
  async getContext(): Promise<GrpcContext | null> {
    const { response, error } = await this.call<{}, { context: GrpcContext }>('GetContext', {});

    if (error) {
      // Return null for UNAUTHENTICATED errors (expected in some tests)
      if (error.code === grpc.status.UNAUTHENTICATED) {
        return null;
      }
      this.handleError(error);
    }

    return response?.context || null;
  }

  /**
   * Assert that context is valid and contains required fields
   */
  async assertContext(context: GrpcContext | null): Promise<void> {
    expect(context).not.toBeNull();
    expect(context?.project).toBeDefined();
    expect(context?.project?.id).toBeTruthy();
    expect(context?.project?.name).toBeTruthy();
  }

  /**
   * Assert project structure
   */
  async assertProject(project: GrpcProject): Promise<void> {
    // Required fields
    expect(project.id).toBeTruthy();
    expect(project.name).toBeTruthy();
    expect(project.locale).toBeTruthy();
    expect(project.currency).toBeTruthy();
    expect(project.country).toBeTruthy();

    // Arrays
    expect(Array.isArray(project.locales)).toBe(true);
    expect(Array.isArray(project.currencies)).toBe(true);
    expect(Array.isArray(project.stockStatuses)).toBe(true);

    // At least one locale
    expect(project.locales.length).toBeGreaterThan(0);
    project.locales.forEach((locale) => {
      expect(locale.code).toBeTruthy();
      expect(typeof locale.isActive).toBe('boolean');
    });

    // At least one currency
    expect(project.currencies.length).toBeGreaterThan(0);
    project.currencies.forEach((currency) => {
      expect(currency.code).toBeTruthy();
      expect(typeof currency.isActive).toBe('boolean');
      expect(typeof currency.exchangeRate).toBe('number');
    });
  }

  /**
   * Assert user/tenant structure
   */
  async assertUser(user: GrpcUser): Promise<void> {
    expect(user.id).toBeTruthy();
    expect(user.tenantId).toBeTruthy();
    expect(user.email).toContain('@');
    expect(user.firstName).toBeTruthy();
    expect(user.lastName).toBeTruthy();
    expect(typeof user.isReady).toBe('boolean');
    expect(typeof user.isVerified).toBe('boolean');
    expect(user.language).toBeTruthy();
    expect(user.timezone).toBeTruthy();

    // Timestamps
    expect(user.createdAt).toBeTruthy();
    expect(user.updatedAt).toBeTruthy();
    expect(new Date(user.createdAt).getTime()).toBeGreaterThan(0);
    expect(new Date(user.updatedAt).getTime()).toBeGreaterThan(0);
  }

  /**
   * Assert customer structure
   */
  async assertCustomer(customer: GrpcCustomer): Promise<void> {
    expect(customer.id).toBeTruthy();
    expect(customer.email).toContain('@');
    // expect(customer.firstName).toBeTruthy();
    // expect(customer.lastName).toBeTruthy();
    expect(typeof customer.isBlocked).toBe('boolean');
    expect(typeof customer.isVerified).toBe('boolean');

    // Timestamps
    expect(customer.createdAt).toBeTruthy();
    expect(customer.updatedAt).toBeTruthy();
    expect(new Date(customer.createdAt).getTime()).toBeGreaterThan(0);
    expect(new Date(customer.updatedAt).getTime()).toBeGreaterThan(0);
  }

  /**
   * Get the gRPC host for debugging
   */
  getGrpcHost(): string {
    return this.grpcHost;
  }
}
