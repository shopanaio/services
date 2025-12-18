import { readFileSync } from 'fs';
import { GraphQLError } from 'graphql';
import path from 'path';
import { Session } from '@fixtures/Session';
import { GraphQLFileName } from '@queries/filenames';

export const readQuery = (filename: string) => {
  const query = path.join(process.cwd(), 'queries', `${filename}.gql`);
  return readFileSync(query, 'utf8');
};

export const withFragment = (gql: string, fragments?: string) => {
  return gql + '\n\n' + fragments;
};

export type GQLQuery = <TQuery, TArgs extends object>(
  query: GraphQLFileName,
  props: {
    variables?: TArgs;
    session?: Session;
    accessToken?: string;
    apiKey?: string;
    throwOnError?: boolean;
  },
) => Promise<{ data: TQuery; errors: GraphQLError[] }>;

export type GQLMutation = <TMutation, TArgs extends object>(
  mutation: GraphQLFileName,
  props: {
    variables?: TArgs;
    session?: Session;
    accessToken?: string;
    apiKey?: string;
    throwOnError?: boolean;
  },
) => Promise<{ data: TMutation; errors: GraphQLError[] }>;
