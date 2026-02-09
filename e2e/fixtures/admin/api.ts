import { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { ApiMutation, ApiQuery } from '@codegen/admin-gql';
import { APIRequestContext } from '@playwright/test';
import { CategoryFixture } from './category';
import { CollectionFixture } from './collection';
import { FileFixture } from './file';
import { ProjectFixture } from './project';
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
  public readonly project: ProjectFixture;
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
    this.project = new ProjectFixture(this);
    this.user = new UserFixture(this);
  }
}
