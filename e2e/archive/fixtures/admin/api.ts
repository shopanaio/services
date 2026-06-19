import { Category } from './Category';
import { Product } from './Product';
import { Projects } from './Projects';
import { Customer } from './Customer';
import { Page } from './Page';
import { Tag } from './Tag';
import { ApiKey } from './ApiKey';
import { Review } from './Review';
import type { GqlRequestSession } from '@fixtures/api/gqlRequest';
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import type { ApiMutation, ApiQuery } from '@codegen/admin-gql';
import type { APIRequestContext } from '@playwright/test';
import { FileFixture } from '@fixtures/api/file';
import { Search } from './Search';
import { Label } from './Label';
import { Order } from './Order';

class AdminGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class TenantApiFixture extends AdminGqlRequest {
  customer: Customer;
  product: Product;
  category: Category;
  projects: Projects;
  page: Page;
  tag: Tag;
  label: Label;
  apiKey: ApiKey;
  file: FileFixture;
  search: Search;
  review: Review;
  order: Order;

  constructor({ request, session }: { session: GqlRequestSession; request: APIRequestContext }) {
    super(request, session);

    this.product = new Product(this);
    this.category = new Category(this);
    this.page = new Page(this);
    this.tag = new Tag(this);
    this.label = new Label(this);
    this.customer = new Customer(this);
    this.projects = new Projects(this);
    this.apiKey = new ApiKey(this);
    this.file = new FileFixture(request, session, this);
    this.search = new Search(this);
    this.review = new Review(this);
    this.order = new Order(this);
  }
}
