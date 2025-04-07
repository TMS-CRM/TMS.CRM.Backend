import { userTenantTableName } from './userTenantRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { type IUserEntry, UserEntry } from '../models/database/userEntry.js';

export const userTableName = 'User';

/** Insert the User */
export async function insertUser(user: Partial<IUserEntry>): Promise<number> {
  const query = knexClient(userTableName).insert(user).returning('Id');
  const records = (await query) as IUserEntry[];

  logger.info(`Successfully inserted User. Id: ${records[0].Id}`);
  return records[0].Id;
}

/** Get the User by Id */
export async function selectUserById(id: number): Promise<UserEntry | null> {
  const query = knexClient(userTableName).select('*').where('Id', id);
  const records = (await query) as IUserEntry[];

  return records.length > 0 ? new UserEntry(records[0]) : null;
}

/** Get the User by ExternalUuid */
export async function selectUserByExternalUuid(externalUuid: string): Promise<UserEntry | null> {
  const query = knexClient(userTableName).select('*').where('ExternalUuid', externalUuid).whereNull(`${userTableName}.DeletedOn`);
  const records = (await query) as IUserEntry[];

  return records.length > 0 ? new UserEntry(records[0]) : null;
}

export async function selectUsers(limit: number, offset: number, tenantId: number | null): Promise<PaginatedResponse<UserEntry>> {
  // Base query without deleted users
  const baseQuery = knexClient(userTableName).whereNull(`${userTableName}.DeletedOn`);

  // If tenantId is provided, join the userTenant table and filter by tenantId
  if (tenantId) {
    baseQuery
      .innerJoin(userTenantTableName, `${userTableName}.Id`, `${userTenantTableName}.UserId`)
      .where(`${userTenantTableName}.TenantId`, tenantId);
  }

  // Get the users
  const users = (await baseQuery.clone().limit(limit).offset(offset).select('*')) as IUserEntry[];

  // Get the total number of users
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: users.map((user) => new UserEntry(user)),
    total: Number(total),
  };
}

/** Update the User */
export async function updateUser(userId: number, user: Partial<IUserEntry>): Promise<void> {
  await knexClient(userTableName).update(user).where('Id', userId);

  logger.info(`Successfully updated User. Id: ${userId}`);
}

export async function softDeleteUserById(userId: number): Promise<void> {
  const query = knexClient(userTableName).update({ DeletedOn: new Date().toISOString() }).where('Id', userId).returning('Id');
  const record = (await query) as IUserEntry[];

  logger.info(`Successfully soft deleted User. Id: ${record[0].Id}`);
}
