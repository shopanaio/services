import { ApiProject, ApiProjectInfo, ProjectStatus } from '@src/graphql';

export interface IProject {
  color?: string;
  slug: string;
  id: string;
  name: string;
  status: ProjectStatus;
}

export interface IProjectInfo {
  slug: string;
  color?: string;
  country: string;
  currency: string;
  locale: string;
  name: string;
  timezone: string;
  phoneNumber: string;
  email: string;
}

export class Project {
  static create(data: ApiProject & { color?: string }): IProject {
    return {
      color: data.color,
      name: data.name,
      slug: data.slug,
      id: data.id,
      status: data.status,
    };
  }
}

export class ProjectInfo {
  static create(
    data: ApiProjectInfo & { color?: string; slug: string },
  ): IProjectInfo {
    return {
      slug: data.slug,
      color: data.color,
      country: data.country,
      name: data.name,
      timezone: data.timezone,
      currency: data.currency,
      phoneNumber: data.phoneNumber || '',
      email: data.email || '',
      locale: data.locale,
    };
  }
}
