import knexFactory, { Knex } from 'knex';

// Knex is used only for SQL generation (no separate connection/pool is created for execution)
export const knex: Knex = knexFactory({ client: 'pg' });
