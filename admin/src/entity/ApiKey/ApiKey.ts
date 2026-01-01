import { ApiApiKey, ApiUser } from '@src/graphql';

export interface IApiKey {
  id: string;
  createdAt: Date;
  createdBy: ApiUser;
  dueDate: Date | null;
  isBanned: boolean;
  lastUsedAt: Date | null;
  title: string;
}

export class ApiKey {
  static create(data: ApiApiKey): IApiKey {
    return {
      id: data.id,
      createdAt: new Date(data.createdAt),
      createdBy: data.createdBy,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      isBanned: !!data.isBanned,
      lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : null,
      title: data.name,
    };
  }
}
