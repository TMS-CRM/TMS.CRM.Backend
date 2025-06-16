import type { Knex } from 'knex';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import { UserTenant, type UserTenantDatabase } from '../models/entities/userTenant.js';

export const userTenantTableName = 'user_tenant';

/** Insert the UserTenant */
export async function insertUserTenant(userTenant: Partial<UserTenantDatabase>, transaction?: Knex.Transaction): Promise<number> {
  const queryContext = transaction ? transaction(userTenantTableName) : knexClient(userTenantTableName);

  const records = (await queryContext.insert(userTenant).returning('id')) as UserTenantDatabase[];

  logger.info(`Successfully inserted UserTenant. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the UserTenant records by UserId */
export async function selectUserTenantsByUserId(userId: number): Promise<UserTenant[] | null> {
  const query = knexClient(userTenantTableName).select('*').where('user_id', userId);
  const records = (await query) as UserTenantDatabase[];

  return records.length > 0 ? records.map((record) => new UserTenant(record)) : null;
}

/** Get the most recent UserTenant record by UserId and TenantId */
export async function selectUserTenant(userId: number, tenantId: number): Promise<UserTenant | null> {
  const query = knexClient(userTenantTableName).select('*').where('user_id', userId).andWhere('tenant_id', tenantId).whereNull('deleted_on').first();
  const record = (await query) as UserTenantDatabase;

  return record ? new UserTenant(record) : null;
}

export async function selectUserMostRecentTenant(userId: number): Promise<UserTenant | null> {
  const query = knexClient(userTenantTableName).select('*').where('user_id', userId).orderBy('authentication_requested_on', 'desc').limit(1);
  const records = (await query) as UserTenantDatabase[];
  return records.length > 0 ? new UserTenant(records[0]) : null;
}

export async function updateUserTenant(userTenantId: number, userTenant: Partial<UserTenantDatabase>, transaction?: Knex.Transaction): Promise<void> {
  const queryContext = transaction ? transaction(userTenantTableName) : knexClient(userTenantTableName);
  await queryContext.update(userTenant).where('id', userTenantId);

  logger.info(`Successfully updated UserTenant. Id: ${userTenantId}`);
}
