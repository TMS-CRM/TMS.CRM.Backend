import { knexClient } from '../lib/utils/knexClient.js';
import { logger } from '../lib/utils/logger.js';
import type { PaginatedResponse } from '../models/api/responses/pagination.js';
import { SortOrder } from '../models/api/validations.js';
import { Customer, type CustomerDatabase } from '../models/entities/customer.js';

export const customerTableName = 'customer';

/** Insert the customer */
export async function insertCustomer(customer: Partial<CustomerDatabase>): Promise<number> {
  const query = knexClient(customerTableName).insert(customer).returning('id');
  const records = (await query) as CustomerDatabase[];

  logger.info(`Successfully inserted Customer. Id: ${records[0].id}`);
  return records[0].id;
}

/** Get the customer by id */
export async function selectCustomerById(id: number): Promise<Customer | null> {
  const query = knexClient(customerTableName).select('*').where('id', id).whereNull('deleted_on');
  const records = (await query) as CustomerDatabase[];

  return records.length > 0 ? new Customer(records[0]) : null;
}

/** Get the Customer by external_uuid */
export async function selectCustomerByExternalUuid(externalUuid: string): Promise<Customer | null> {
  const query = knexClient(customerTableName).select('*').where('external_uuid', externalUuid).whereNull('deleted_on');
  const records = (await query) as CustomerDatabase[];

  return records.length > 0 ? new Customer(records[0]) : null;
}

export async function selectCustomers(limit: number, offset: number, tenantId: number | null): Promise<PaginatedResponse<Customer>> {
  // Base query without deleted customers
  const baseQuery = knexClient(customerTableName).where(`${customerTableName}.tenant_id`, tenantId).whereNull(`${customerTableName}.deleted_on`);

  // Get the customers
  const customers = (await baseQuery
    .clone()
    .orderBy(`${customerTableName}.created_on`, SortOrder.desc)
    .limit(limit)
    .offset(offset)
    .select('*')) as CustomerDatabase[];

  // Get the total number of customers
  const total = (await baseQuery.clone().count('*'))[0]['count'];

  return {
    items: customers.map((customer) => new Customer(customer)),
    total: Number(total),
  };
}

/** Update the Customer */
export async function updateCustomer(customerId: number, customer: Partial<CustomerDatabase>): Promise<void> {
  await knexClient(customerTableName).update(customer).where('id', customerId);

  logger.info(`Successfully updated Customer. Id: ${customerId}`);
}

/** Delete the Customer */
export async function softDeleteCustomerById(customerId: number): Promise<void> {
  const query = knexClient(customerTableName).update({ deleted_on: new Date().toISOString() }).where('id', customerId).returning('id');
  const records = (await query) as CustomerDatabase[];

  logger.info(`Successfully soft deleted Customer. Id: ${records[0].id}`);
}
