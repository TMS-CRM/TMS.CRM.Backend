import type { Knex } from 'knex';
import knexFactory from 'knex';
import { default as pg } from 'pg';
import { toIsoFromPgTimestampType } from './dates.js';
import { getSecret } from '../aws/secretsManager.js';

/** `tms.crm.backend-stack.ts` will overwrite the `MIGRATIONS_DIR` env variable for the deploy, otherwise use the local path */
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? './knex/migrations';

export type KnexTransaction = Knex.Transaction;
export type KnexQueryBuilder = Knex.QueryBuilder;

export interface KnexRawResponse {
  data: Record<string, any>;
  rowsAffected: number | undefined;
}

export const knexClient: Knex = connectionPool();

/** Generate knex connection */
function connectionPool(): Knex<any, unknown[]> {
  return knexFactory({
    client: 'postgresql',
    connection: loadConfigSecret,
    migrations: {
      directory: MIGRATIONS_DIR,
      tableName: 'knex_migrations',
      loadExtensions: ['.mjs'],
    },
  });
}

/** Load connection config from the secret at `process.env.DATABASE_SECRET_ARN`. */
async function loadConfigSecret(): Promise<object> {
  const secret = await getSecret(process.env.DATABASE_SECRET_ARN!);

  if (!secret) {
    throw Error('Could not load database secret');
  }

  const config = JSON.parse(secret) as {
    engine: string;
    username: string;
    password: string;
    host: string;
    dbname: string;
  };

  const connectionString = `${config.engine}://${config.username}:${config.password}@${config.host}/${config.dbname}`;

  return {
    connectionString,
  };
}

// Make sure Postgres returns numbers as numbers
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) => {
  return value !== null ? parseInt(value) : null;
});

pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value: string) => {
  return value !== null ? parseFloat(value) : null;
});

// Make sure Postgres returns correctly-formatted dates
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => {
  // By default, `pg` will try and parse the String as a JavaScript `Date`, causing it to add time and timezone information,
  // while the database itself stores the date properly as a ISO 8601 date-only string (yyyy-mm-dd)
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return value !== null ? value : null;
});

pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value: string) => {
  // The database already contains the full Date information (without the timezone), but not quite in the proper ISO 8601 format
  // (e.g. it will store `2024-02-11 14:09:16` instead of `2024-02-12T14:09:16`). Parsing to a JavaScript date will add
  // timezone information back, so we want to treat it as a String
  return value !== null ? toIsoFromPgTimestampType(value) : null;
});

pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value: string) => {
  // The database already contains the full Date information (timezone included), but not quite in the proper ISO 8601 format
  // (e.g. it will store `2024-02-11 14:09:16.545000 +00:00` instead of `2024-02-12T14:09:16.545Z`). We will return a parsed
  // JavaScript date, which can subsequently be converted to an ISO String
  return value !== null ? new Date(Date.parse(value)) : null;
});
