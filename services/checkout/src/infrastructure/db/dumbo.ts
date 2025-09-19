import { dumbo } from '@event-driven-io/dumbo';
import { config } from '@src/config';

export const dumboPool = dumbo({ connectionString: config.databaseUrl });
