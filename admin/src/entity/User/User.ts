import { ApiUser } from '@src/graphql';
import { ID } from '@src/types';

export interface IUser {
  createdAt: string;
  email: string;
  firstName: string;
  id: ID;
  isReady: boolean;
  isVerified: boolean;
  lastName: string;
  phoneNumber?: string | null;
  updatedAt: string;
  language: string;
  timezone: string;
}

export class User {
  static create(user: ApiUser): IUser {
    return {
      createdAt: user.createdAt,
      email: user.email,
      firstName: user.firstName,
      id: user.id,
      isReady: !!user.isReady,
      isVerified: user.isVerified,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      updatedAt: user.updatedAt,
      language: user.language,
      timezone: user.timezone,
    };
  }
}
