import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { CustomerEntry, type ICustomerEntry } from '../models/entities/customerEntry.js';

export const customerTableName = 'Customer';

/** Insert the Customer */
export async function insertCustomer(customer: Partial<ICustomerEntry>): Promise<number> {
  const query = knexClient(customerTableName).insert(customer).returning('Id');
  const records = (await query) as ICustomerEntry[];

  logger.info(`Successfully inserted Customer. Id: ${records[0].Id}`);
  return records[0].Id;
}

/** Get the Customer by Id */
export async function selectCustomerById(id: number): Promise<CustomerEntry | null> {
  const query = knexClient(customerTableName).select('*').where('Id', id).whereNull('DeletedOn');
  const records = (await query) as ICustomerEntry[];

  return records.length > 0 ? new CustomerEntry(records[0]) : null;
}

/** Get the Customer by ExternalUuid */
export async function selectCustomerByExternalUuid(externalUuid: string): Promise<CustomerEntry | null> {
  const query = knexClient(customerTableName).select('*').where('ExternalUuid', externalUuid).whereNull('DeletedOn');
  const records = (await query) as ICustomerEntry[];

  return records.length > 0 ? new CustomerEntry(records[0]) : null;
}

export async function selectCustomers(limit: number, offset: number, tenantId: number | null): Promise<PaginatedResponse<CustomerEntry>> {
  // Base query without deleted customers
  const baseQuery = knexClient(customerTableName).whereNull(`${customerTableName}.DeletedOn`);

  if (tenantId) {
    baseQuery.where(`${customerTableName}.TenantId`, tenantId);
  }

  // Get the customers
  const customers = (await baseQuery.clone().limit(limit).offset(offset).select('*')) as ICustomerEntry[];

  // Get the total number of customers
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: customers.map((customer) => new CustomerEntry(customer)),
    total: Number(total),
  };
}

/** Update the Customer */
export async function updateCustomer(customerId: number, customer: Partial<ICustomerEntry>): Promise<void> {
  await knexClient(customerTableName).update(customer).where('Id', customerId);

  logger.info(`Successfully updated Customer. Id: ${customerId}`);
}

/** Delete the Customer */
export async function softDeleteCustomerById(customerId: number): Promise<void> {
  const query = knexClient(customerTableName).update({ DeletedOn: new Date().toISOString() }).where('Id', customerId).returning('Id');
  const records = (await query) as ICustomerEntry[];

  logger.info(`Successfully soft deleted Customer. Id: ${records[0].Id}`);
}
