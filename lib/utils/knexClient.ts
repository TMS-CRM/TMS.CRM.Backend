import type { Knex } from 'knex';
import knexFactory from 'knex';
import { getSecret } from '../aws/secretsManager.js';

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
      directory: './knex/migrations',
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
