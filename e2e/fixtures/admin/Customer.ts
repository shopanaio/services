import { expect } from '@playwright/test';
import { ApiCreateCustomerInput, ApiCustomer, ApiCustomersOutput, Maybe } from '@codegen/admin-gql';
import * as yup from 'yup';
import { TenantApiFixture } from '@fixtures/admin/api';
import _ from 'lodash';
import { DeepPartial } from 'types';

export class Customer {
  private api: TenantApiFixture;

  constructor(api: TenantApiFixture) {
    this.api = api;
  }

  private metaSchema = yup.object({
    page: yup.number().required(),
    pageSize: yup.number().required(),
    count: yup.number().required(),
    total: yup.number().required(),
    pageCount: yup.number().required(),
  });

  private customerSchema = yup.object({
    id: yup.string().required(),
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    email: yup.string().email().required(),
    phone: yup.string(),
    language: yup.string(),
    isVerified: yup.boolean().required(),
    createdAt: yup.string().required(),
    updatedAt: yup.string().required(),
  });

  assertMeta = (responseData: ApiCustomersOutput) => {
    expect(() => this.metaSchema.validateSync(responseData.meta)).not.toThrow();
  };

  assertCustomer = (customer: Maybe<ApiCustomer>) => {
    expect(() => this.customerSchema.validateSync(customer)).not.toThrow();
  };

  assertCustomers = (customers: ApiCustomer[]) => {
    expect(Array.isArray(customers)).toBe(true);
    expect(customers.length).toBeGreaterThan(0);
    customers.forEach(this.assertCustomer);
  };

  async create(input?: DeepPartial<ApiCreateCustomerInput>) {
    const { data } = await this.api.mutation('admin/CustomerCreate', {
      variables: {
        input: _.merge(
          {
            firstName: 'Del',
            lastName: 'Me',
            language: 'en',
            email: `customer_${Date.now()}@ex.com`,
            isVerified: false,
            phone: '',
            password: '123456',
          },
          input,
        ),
      },
    });

    const customer = await this.findOne(data.customerMutation.create);
    return customer as ApiCustomer;
  }

  async findOne(id: string) {
    const { data } = await this.api.query('admin/CustomerFindOne', {
      variables: { findOneId: id },
    });

    return data.customerQuery.findOne as ApiCustomer;
  }
}
