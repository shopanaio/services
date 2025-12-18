import { expect } from '@playwright/test';
import { ApiCreateProjectInput, ApiProject, ApiProjectQueryFindOneArgs } from '@codegen/admin-gql';
import { projectSchema } from 'schema/schema';
import { TenantApiFixture } from '@fixtures/admin/api';

export class Projects {
  constructor(private api: TenantApiFixture) {}

  async get(slug: string) {
    const { data } = await this.api.query<ApiProjectQueryFindOneArgs>('admin/ProjectFindOne', {
      variables: { slug: slug },
    });

    return data.projectQuery.findOne as ApiProject;
  }

  async assertProjects(projects: ApiProject[]) {
    expect(projects.length).toBeGreaterThan(0);
    await Promise.all(projects.map(this.assertProject));
  }

  async assertProject(project: ApiProject) {
    await expect(() => projectSchema.validateSync(project)).not.toThrow();
  }

  async createProject(input: ApiCreateProjectInput): Promise<ApiProject> {
    const { data } = await this.api.mutation('admin/ProjectCreate', {
      variables: { input },
    });

    return data.projectMutation.create;
  }
}
