import type { GqlRequestSession } from '@fixtures/api/gqlRequest';
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import type { ApiMutation, ApiQuery } from '@codegen/admin-gql';
import type { APIRequestContext } from '@playwright/test';
import { CategoryFixture } from './category';
import { CollectionFixture } from './collection';
import { FileFixture } from './file';
import { ProductFixture } from './product';
import { ProjectFixture } from './project';
import { TagFixture } from './tag';
import { UserFixture } from './user';

class AdminGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class AdminApiFixture extends AdminGqlRequest {
  public readonly category: CategoryFixture;
  public readonly collection: CollectionFixture;
  public readonly file: FileFixture;
  public readonly product: ProductFixture;
  public readonly project: ProjectFixture;
  public readonly tag: TagFixture;
  public readonly user: UserFixture;

  constructor({
    request,
    session,
  }: {
    session: GqlRequestSession;
    request: APIRequestContext;
  }) {
    super(request, session);
    this.category = new CategoryFixture(this);
    this.collection = new CollectionFixture(this);
    this.file = new FileFixture(request, session, this);
    this.product = new ProductFixture(this);
    this.project = new ProjectFixture(this);
    this.tag = new TagFixture(this);
    this.user = new UserFixture(this);
  }
}
