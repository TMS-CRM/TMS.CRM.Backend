import { userTenantTableName } from './userTenantRepository.js';
import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { User, type UserDatabase } from '../models/entities/user.js';

export const userTableName = 'user';

/** Insert the User */
export async function insertUser(user: Partial<UserDatabase>): Promise<number> {
  const query = knexClient(userTableName).insert(user).returning('id');
  const records = (await query) as UserDatabase[];

  logger.info(`Successfully inserted User. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the User by id */
export async function selectUserById(id: number): Promise<User | null> {
  const query = knexClient(userTableName).select('*').where('id', id);
  const records = (await query) as UserDatabase[];

  return records.length > 0 ? new User(records[0]) : null;
}

/** Get the User by cognito_uuid */
export async function selectUserByCognitoUuid(cognitoUuid: string): Promise<User | null> {
  const query = knexClient(userTableName).select('*').where('cognito_uuid', cognitoUuid);
  const records = (await query) as UserDatabase[];

  return records.length > 0 ? new User(records[0]) : null;
}

/** Get the User by external_uuid */
export async function selectUserByExternalUuid(externalUuid: string): Promise<User | null> {
  const query = knexClient(userTableName).select('*').where('external_uuid', externalUuid).whereNull(`${userTableName}.deleted_on`);
  const records = (await query) as UserDatabase[];

  return records.length > 0 ? new User(records[0]) : null;
}

/** Get the User by email */
export async function selectUserByEmail(email: string): Promise<User | null> {
  const query = knexClient(userTableName).select('*').where('email', email).whereNull(`${userTableName}.deleted_on`);
  const records = (await query) as UserDatabase[];

  return records.length > 0 ? new User(records[0]) : null;
}

export async function selectUsers(limit: number, offset: number, tenantId: number | null): Promise<PaginatedResponse<User>> {
  // Base query without deleted users
  const baseQuery = knexClient(userTableName).whereNull(`${userTableName}.deleted_on`);

  // If tenant_id is provided, join the userTenant table and filter by tenantId
  if (tenantId) {
    baseQuery
      .innerJoin(userTenantTableName, `${userTableName}.id`, `${userTenantTableName}.user_id`)
      .where(`${userTenantTableName}.tenant_id`, tenantId);
  }

  // Get the users
  const users = (await baseQuery.clone().limit(limit).offset(offset).select('*')) as UserDatabase[];

  // Get the total number of users
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: users.map((user) => new User(user)),
    total: Number(total),
  };
}

/** Update the User */
export async function updateUser(userId: number, user: Partial<UserDatabase>): Promise<void> {
  await knexClient(userTableName).update(user).where('id', userId);

  logger.info(`Successfully updated User. Id: ${userId}`);
}

export async function softDeleteUserById(userId: number): Promise<void> {
  const query = knexClient(userTableName).update({ deleted_on: new Date().toISOString() }).where('id', userId).returning('id');
  const record = (await query) as UserDatabase[];

  logger.info(`Successfully soft deleted User. Id: ${record[0].id}`);
}
