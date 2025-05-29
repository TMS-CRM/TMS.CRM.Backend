import { logger } from './logger.js';
import { InternalError } from '../../models/api/responses/errors.js';

/**
 * The database contains the full Date information (without the timezone), but not quite in the proper ISO 8601 format
 * (e.g. it will store `2024-02-11 14:09:16` instead of `2024-02-12T14:09:16`), so we need to do some minor modifications
 */
export function toIsoFromPgTimestampType(input: string | null): string | null {
  if (input === null) {
    return null;
  }
  try {
    return input.replace(' ', 'T').substring(0, 19); // in case the time has milliseconds (.000000)
  } catch (error) {
    logger.error(error);
    throw new InternalError('Could not read the date from the database.');
  }
}

/**
 * The database contains the full Date information with UTC timezone, in the proper ISO 8601 format
 * (e.g. it will store `2024-02-11 14:09:16` instead of `2024-02-12T14:09:16.000Z`), so we need to do some minor modifications
 */
export function toIsoWithTZFromPgTimestampType(input: string | null): string | null {
  if (input === null) {
    return null;
  }
  try {
    return `${toIsoFromPgTimestampType(input)}.000Z`; // in case the time has milliseconds (.000000)
  } catch (error) {
    logger.error(error);
    throw new InternalError('Could not read the date from the database.');
  }
}
