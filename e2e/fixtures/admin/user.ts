import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import { generateUser, UserData } from '@utils/user';

export interface UserSession {
  data: UserData;
  accessToken: string;
  userId: string;
}

export class UserFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input?: Partial<{ email: string; password: string }>): Promise<UserSession> => {
    const userData = generateUser();

    const { data } = await this.gql.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: input?.email ?? userData.email,
          password: input?.password ?? userData.password,
        },
      },
    });

    const result = (
      data as {
        userMutation: {
          signUp: {
            user: { id: string; email: string } | null;
            token: { accessToken: string; refreshToken: string } | null;
            userErrors: { code: string; message: string; field: string }[];
          };
        };
      }
    ).userMutation.signUp;

    if (result.userErrors.length > 0 || !result.user || !result.token) {
      throw new Error('Failed to create user: ' + JSON.stringify(result.userErrors));
    }

    return {
      data: {
        ...userData,
        email: input?.email ?? userData.email,
        password: input?.password ?? userData.password,
      },
      accessToken: result.token.accessToken,
      userId: result.user.id,
    };
  };
}
