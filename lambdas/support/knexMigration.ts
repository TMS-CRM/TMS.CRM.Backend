import { knexClient } from '../../lib/utils/knexClient.js';
import { logger } from '../../lib/utils/logger.js';
import { BadRequestError } from '../../models/api/responses/errors.js';
import type { KnexMigrationRequest } from '../../models/support/knexMigration.js';

const validDirections = new Set(['up', 'down']);

export async function handler(request: KnexMigrationRequest): Promise<void> {
  try {
    logger.info('Request received: ', request);

    const direction = validateRequest(request);

    await performMigration(direction);
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

/** Parse the received event */
function validateRequest(request: KnexMigrationRequest): string {
  const { direction } = request;

  if (!direction) {
    throw new BadRequestError('Missing or invalid payload string parameter: direction');
  }

  if (!validDirections.has(direction)) {
    throw new BadRequestError(`Payload string parameter 'direction' must be 'up' or 'down'`);
  }

  return direction;
}

/** Perform Knex DB migration. Will apply all pending migration files or perform rollback depending on 'direction' param */
async function performMigration(direction: string): Promise<void> {
  if (direction === 'up') {
    logger.info('Performing migration: latest');
    await knexClient.migrate.latest();
    return;
  }

  logger.info('Performing migration: rollback');
  await knexClient.migrate.rollback();
}
