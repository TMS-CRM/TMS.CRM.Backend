import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import { UserTenant, type UserTenantDatabase } from '../models/entities/userTenant.js';

export const userTenantTableName = 'user_tenant';

/** Insert the UserTenant */
export async function insertUserTenant(userTenant: Partial<UserTenantDatabase>): Promise<number> {
  const data = {
    ...userTenant,
    created_on: userTenant.created_on ?? new Date().toISOString(),
  };
  const query = knexClient(userTenantTableName).insert(data).returning('id');
  const records = (await query) as UserTenantDatabase[];

  logger.info(`Successfully inserted UserTenant. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the UserTenant by UserId */
export async function selectUserTenantsByUserId(userId: number): Promise<UserTenant[]> {
  const query = knexClient(userTenantTableName).select('*').where('user_id', userId);
  const records = (await query) as UserTenantDatabase[];

  return records ? records.map((record) => new UserTenant(record)) : [];
}
