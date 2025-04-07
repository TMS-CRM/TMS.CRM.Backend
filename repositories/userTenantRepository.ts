import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { UserTenantEntry } from '../models/database/userTenantEntry.js';

export const userTenantTableName = 'UserTenant';

/** Insert the UserTenant */
export async function insertUserTenant(userTenant: Partial<UserTenantEntry>): Promise<number> {
  const query = knexClient(userTenantTableName).insert(userTenant).returning('Id');
  const records = (await query) as UserTenantEntry[];

  logger.info(`Successfully inserted UserTenant. Id: ${records[0].Id}`);
  return records[0].Id;
}
