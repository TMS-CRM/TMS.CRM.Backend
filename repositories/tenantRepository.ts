import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import { Tenant, type TenantDatabase } from '../models/entities/tenant.js';

export const tenantTableName = 'tenant';

/** Insert the tenant */
export async function insertTenant(tenant: Partial<TenantDatabase>): Promise<number> {
  const query = knexClient(tenantTableName).insert(tenant).returning('id');
  const record = (await query) as TenantDatabase[];

  logger.info(`Successfully inserted Tenant. Id: ${record[0].id}`);
  return record[0].id;
}

/** Get the User by Id */
export async function selectTenantById(id: number): Promise<Tenant | null> {
  if (id === undefined || id === null) {
    return null;
  }
  const query = knexClient(tenantTableName).select('*').where('id', id);
  const records = (await query) as TenantDatabase[];

  return records.length > 0 ? new Tenant(records[0]) : null;
}

/** Get the Tenant by external_uuid */
export async function selectTenantByExternalUuid(externalUuid: string): Promise<Tenant | null> {
  const query = knexClient(tenantTableName).select('*').where('external_uuid', externalUuid);
  const records = (await query) as TenantDatabase[];

  return records.length > 0 ? new Tenant(records[0]) : null;
}

/** Update the Tenant */
export async function updateTenant(tenantId: number, user: Partial<TenantDatabase>): Promise<void> {
  await knexClient(tenantTableName).update(user).where('id', tenantId);

  logger.info(`Successfully updated User. Id: ${tenantId}`);
}

export async function softDeleteTenantById(tenantId: number): Promise<void> {
  const query = knexClient(tenantTableName).update({ deleted_on: new Date().toISOString() }).where('id', tenantId).returning('id');
  const record = (await query) as TenantDatabase[];

  logger.info(`Successfully soft deleted Tenant. Id: ${record[0].id}`);
}
