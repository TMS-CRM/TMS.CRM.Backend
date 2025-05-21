import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import { UserTenant, type UserTenantDatabase } from '../models/entities/userTenant.js';

export const userTenantTableName = 'user_tenant';

/** Insert the UserTenant */
export async function insertUserTenant(userTenant: Partial<UserTenantDatabase>): Promise<number> {
  const query = knexClient(userTenantTableName).insert(userTenant).returning('id');
  const records = (await query) as UserTenantDatabase[];

  logger.info(`Successfully inserted UserTenant. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the UserTenant records by UserId */
export async function selectUserTenantsByUserId(userId: number): Promise<UserTenant[] | null> {
  const query = knexClient(userTenantTableName).select('*').where('user_id', userId);
  const records = (await query) as UserTenantDatabase[];

  return records.length > 0 ? records.map((record) => new UserTenant(record)) : null;
}
