// eslint-disable-next-line import/order
import * as dotenv from 'dotenv';

// Load the env variables from root/.env
dotenv.config();

// This import must come after dotenv.config to have access to the ENV params
import * as secretManager from '../lib/aws/secretsManager.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';

// These *must* be set, but can be dummy values
process.env.AWS_ACCESS_KEY_ID = 'dummy-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'dummy-secret-access-key';
process.env.AWS_SESSION_TOKEN = 'dummy-session-token';

/** Runs **before** all tests */
export async function setup(): Promise<void> {
  logger.info('Setting up local database');
  await setupLocalDatabase();
}

/** Create database schema based on the migration files */
async function setupLocalDatabase(): Promise<void> {
  await createSecret();

  // Rollback the attempted migration
  await knexClient.migrate.rollback();

  // Apply the migrations
  await applyMigrations();
}

// Create new secret to manage the local RDS config
async function createSecret(): Promise<void> {
  logger.info('Creating secret');
  const secret = {
    Name: process.env.DATABASE_SECRET_ARN,
    SecretString: process.env.DATABASE_SECRET_VALUES,
  };

  await secretManager.createSecret(secret, true);
}

/** Create database schema based on the current migration files */
async function applyMigrations(): Promise<void> {
  try {
    await knexClient.migrate.latest();
    logger.info('All migrations have been applied successfully');
  } catch (error) {
    logger.error('Error applying migrations: ', error);
    process.exit(1);
  } finally {
    await knexClient.destroy();
  }
}

/** Runs **after** all tests */
export async function teardown(): Promise<void> {
  logger.info('Cleaning up database connections');
  await knexClient.destroy();
}
