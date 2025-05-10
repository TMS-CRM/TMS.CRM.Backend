import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { TenantEntry } from '../models/database/tenantEntry.js';

export const tenantTableName = 'Tenant';

/** Insert the Tenant */
export async function insertTenant(tenant: Partial<TenantEntry>): Promise<number> {
  const query = knexClient(tenantTableName).insert(tenant).returning('Id');
  const record = (await query) as TenantEntry[];

  logger.info(`Successfully inserted Tenant. Id: ${record[0].Id}`);
  return record[0].Id;
}

/** Get the User by Id */
export async function selectTenantById(id: number): Promise<TenantEntry | null> {
  const query = knexClient(tenantTableName).select('*').where('Id', id);
  const records = (await query) as TenantEntry[];

  return records.length > 0 ? records[0] : null;
}

/** Get the Tenant by Uuid */
export async function selectTenantByUuid(uuid: string): Promise<TenantEntry | null> {
  const query = knexClient(tenantTableName).select('*').where('ExternalUuid', uuid);
  const records = (await query) as TenantEntry[];

  return records.length > 0 ? records[0] : null;
}
